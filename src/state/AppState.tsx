import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv } from '../data/kv';
import { decode, EMPTY, encode, STATE_KEY, type AppData } from '../data/persist';
import { upsertAccount, type Account } from '../domain/accounts';
import type { Goal } from '../domain/goals';
import { chargeFromSuggestion, labelKey, type Suggestion } from '../domain/recurring';
import type { Expense, Profile } from '../domain/types';

interface AppState extends AppData {
  ready: boolean;
  /** message à afficher si le stockage sécurisé est indisponible */
  error: string | null;
  saveProfile(p: Profile): Promise<void>;
  addExpense(e: Expense): Promise<void>;
  removeExpense(id: string): Promise<void>;
  /** dernière dépense ajoutée, pour la confirmation et « Annuler » */
  lastAdded: Expense | null;
  clearLastAdded(): void;
  dismissSuggestion(key: string): Promise<void>;
  saveAccount(a: Account): Promise<void>;
  saveGoal(g: Goal): Promise<void>;
  removeGoal(id: string): Promise<void>;
  removeAccount(id: string): Promise<void>;
  /** fait d'une dépense régulière une charge fixe ; la dépense de ce mois est remplacée par la charge */
  acceptSuggestion(s: Suggestion, today: Date): Promise<void>;
  wipeAll(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAdded, setLastAdded] = useState<Expense | null>(null);
  const latest = useRef<AppData>(EMPTY);

  useEffect(() => {
    let alive = true;
    kv.get(STATE_KEY)
      .then(raw => { if (alive) { latest.current = decode(raw); setData(latest.current); } })
      .catch(() => alive && setError('Le stockage sécurisé est indisponible sur cet appareil.'))
      .finally(() => alive && setReady(true));
    return () => { alive = false; };
  }, []);

  const commit = useCallback(async (next: AppData) => {
    latest.current = next;
    setData(next);
    try { await kv.set(STATE_KEY, encode(next)); setError(null); }
    catch { setError('Impossible d’enregistrer : le stockage sécurisé est indisponible.'); }
  }, []);

  const value = useMemo<AppState>(() => ({
    ...data, ready, error,
    saveProfile: p => commit({ ...latest.current, profile: p }),
    addExpense: async e => { await commit({ ...latest.current, expenses: [e, ...latest.current.expenses] }); setLastAdded(e); },
    removeExpense: async id => { await commit({ ...latest.current, expenses: latest.current.expenses.filter(x => x.id !== id) }); setLastAdded(l => (l?.id === id ? null : l)); },
    lastAdded, clearLastAdded: () => setLastAdded(null),
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
      await commit({ ...cur, profile: { ...cur.profile, charges: [...cur.profile.charges, charge] }, expenses: cur.expenses.filter(e => !(e.date.startsWith(prefix) && labelKey(e.label) === s.key)) });
    },
    wipeAll: async () => { await kv.wipe(); latest.current = EMPTY; setData(EMPTY); setLastAdded(null); },
  }), [data, ready, error, commit, lastAdded]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState hors de AppStateProvider');
  return v;
}
