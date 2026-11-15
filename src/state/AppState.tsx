import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv } from '../data/kv';
import { decodeState, EMPTY, encode, STATE_KEY, type AppData, type Prefs } from '../data/persist';
import { upsertAccount, type Account } from '../domain/accounts';
import type { Goal } from '../domain/goals';
import { profileAt, recordChange } from '../domain/history';
import { chargeFromSuggestion, labelKey, type Suggestion } from '../domain/recurring';
import type { Expense, Profile } from '../domain/types';

/** Copie du contenu illisible, gardée avant toute décision de l'utilisateur */
export const UNREADABLE_KEY = 'state.illisible';
export const EMPTY_DATA = EMPTY;

/**
 * - chargement : lecture en cours ;
 * - ok : données relues (ou premier lancement) ;
 * - erreur : le stockage chiffré n'a pas pu être ouvert. Rien n'est écrit : réessayer plus tard ;
 * - illisible : il y a des données, mais elles ne se relisent pas. Rien n'est écrit tant que l'utilisateur n'a pas choisi.
 */
export type LoadStatus = 'chargement' | 'ok' | 'erreur' | 'illisible';

interface AppState extends AppData {
  ready: boolean;
  status: LoadStatus;
  /** dernier problème d'enregistrement, à afficher */
  error: string | null;
  retryLoad(): void;
  /** données illisibles : repartir d'un état vide (une copie de l'ancien contenu reste gardée) */
  startFresh(): Promise<void>;
  /** remplace toutes les données (restauration d'une sauvegarde) */
  replaceAll(d: AppData): Promise<void>;
  /** profil en vigueur pendant un mois donné (les mois passés gardent leur profil d'époque) */
  profileFor(y: number, m: number): Profile | null;
  saveProfile(p: Profile, today?: Date): Promise<void>;
  addExpense(e: Expense): Promise<void>;
  updateExpense(e: Expense): Promise<void>;
  removeExpense(id: string): Promise<void>;
  /** dernière dépense ajoutée, pour la confirmation et « Annuler » */
  lastAdded: Expense | null;
  clearLastAdded(): void;
  /** dernière dépense supprimée, pour « Annuler » */
  lastRemoved: Expense | null;
  undoRemove(): Promise<void>;
  clearLastRemoved(): void;
  dismissSuggestion(key: string): Promise<void>;
  saveAccount(a: Account): Promise<void>;
  saveGoal(g: Goal): Promise<void>;
  saveNote(month: string, text: string): Promise<void>;
  savePrefs(p: Partial<Prefs>): Promise<void>;
  removeGoal(id: string): Promise<void>;
  removeAccount(id: string): Promise<void>;
  /** fait d'une dépense régulière une charge fixe ; la dépense de ce mois est remplacée par la charge */
  acceptSuggestion(s: Suggestion, today: Date): Promise<void>;
  wipeAll(): Promise<void>;
}

/**
 * Données restaurées : le verrouillage et les rappels dépendent du téléphone (Face ID configuré, notifications
 * autorisées). Ils sont désactivés pour ne pas bloquer l'app sur un appareil qui ne les a pas encore.
 */
export const forRestore = (d: AppData): AppData => ({ ...d, prefs: { ...d.prefs, lock: false, alerts: false } });

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [status, setStatus] = useState<LoadStatus>('chargement');
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<Expense | null>(null);
  const [lastRemoved, setLastRemoved] = useState<Expense | null>(null);
  const [attempt, setAttempt] = useState(0);
  const latest = useRef<AppData>(EMPTY);
  const writable = useRef(false);
  // les écritures passent l'une après l'autre, dans l'ordre
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let alive = true;
    writable.current = false;
    (async () => {
      let raw: string | null;
      try { raw = await kv.get(STATE_KEY); }
      catch { if (alive) setStatus('erreur'); return; }
      const d = decodeState(raw);
      if (!alive) return;
      if (d.status === 'illisible') {
        try { if (raw && (await kv.get(UNREADABLE_KEY)) !== raw) await kv.set(UNREADABLE_KEY, raw); } catch { /* la copie reste dans la base d'origine, non écrasée */ }
        if (alive) setStatus('illisible');
        return;
      }
      latest.current = d.data;
      setData(d.data);
      writable.current = true;
      setStatus('ok');
    })();
    return () => { alive = false; };
  }, [attempt]);

  const commit = useCallback((next: AppData): Promise<void> => {
    if (!writable.current) {
      setError('Rien n’a été enregistré : vos données ne sont pas chargées.');
      return Promise.resolve();
    }
    latest.current = next;
    setData(next);
    const run = queue.current.then(async () => {
      try { await kv.set(STATE_KEY, encode(next)); setError(null); }
      catch { setError('Impossible d’enregistrer : le stockage sécurisé est indisponible. Réessayez dans un instant.'); }
    });
    queue.current = run;
    return run;
  }, []);

  const value = useMemo<AppState>(() => ({
    ...data, ready: status !== 'chargement', status, error,
    retryLoad: () => { setStatus('chargement'); setAttempt(a => a + 1); },
    startFresh: async () => {
      if (status !== 'illisible') return;
      writable.current = true;
      setStatus('ok');
      await commit(EMPTY);
    },
    replaceAll: async d => {
      writable.current = true;
      setStatus('ok');
      setLastAdded(null); setLastRemoved(null);
      await commit(d);
    },
    profileFor: (y, m) => (data.profile ? profileAt(data.profile, data.history, y, m) : null),
    saveProfile: (p, today = new Date()) => {
      const cur = latest.current;
      return commit({ ...cur, profile: p, history: recordChange(cur.history, cur.profile, today) });
    },
    addExpense: async e => {
      if (latest.current.expenses.some(x => x.id === e.id)) return; // double appui : déjà enregistrée
      await commit({ ...latest.current, expenses: [e, ...latest.current.expenses] });
      setLastAdded(e);
    },
    updateExpense: e => commit({ ...latest.current, expenses: latest.current.expenses.map(x => (x.id === e.id ? e : x)) }),
    removeExpense: async id => {
      const gone = latest.current.expenses.find(x => x.id === id);
      if (!gone) return;
      await commit({ ...latest.current, expenses: latest.current.expenses.filter(x => x.id !== id) });
      setLastAdded(l => (l?.id === id ? null : l));
      setLastRemoved(gone);
    },
    lastAdded, clearLastAdded: () => setLastAdded(null),
    lastRemoved, clearLastRemoved: () => setLastRemoved(null),
    undoRemove: async () => {
      const e = lastRemoved;
      setLastRemoved(null);
      if (e && !latest.current.expenses.some(x => x.id === e.id)) await commit({ ...latest.current, expenses: [e, ...latest.current.expenses] });
    },
    savePrefs: patch => commit({ ...latest.current, prefs: { ...latest.current.prefs, ...patch } }),
    saveNote: (month, text) => { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return Promise.resolve(); const notes = { ...latest.current.notes }; if (text.trim()) notes[month] = text.slice(0, 280); else delete notes[month]; return commit({ ...latest.current, notes }); },
    saveGoal: g => { const l = latest.current.goals; const i = l.findIndex(x => x.id === g.id); return commit({ ...latest.current, goals: i >= 0 ? l.map(x => (x.id === g.id ? g : x)) : l.length >= 30 ? l : [...l, g] }); },
    removeGoal: id => commit({ ...latest.current, goals: latest.current.goals.filter(x => x.id !== id) }),
    saveAccount: a => commit({ ...latest.current, accounts: upsertAccount(latest.current.accounts, a) }),
    removeAccount: id => commit({ ...latest.current, accounts: latest.current.accounts.filter(x => x.id !== id) }),
    dismissSuggestion: key => commit({ ...latest.current, dismissed: [...new Set([...latest.current.dismissed, key])].slice(-200) }),
    acceptSuggestion: async (s, today) => {
      const cur = latest.current;
      if (!cur.profile) return;
      const prefix = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-`;
      const charge = chargeFromSuggestion(s, `rec-${Date.now()}`);
      await commit({
        ...cur,
        profile: { ...cur.profile, charges: [...cur.profile.charges, charge] },
        history: recordChange(cur.history, cur.profile, today),
        expenses: cur.expenses.filter(e => !(e.date.startsWith(prefix) && labelKey(e.label) === s.key)),
      });
    },
    wipeAll: async () => {
      await queue.current;
      await kv.wipe();
      latest.current = EMPTY; setData(EMPTY); setLastAdded(null); setLastRemoved(null);
      writable.current = true; setStatus('ok'); setError(null);
    },
  }), [data, status, error, commit, lastAdded, lastRemoved]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState hors de AppStateProvider');
  return v;
}
