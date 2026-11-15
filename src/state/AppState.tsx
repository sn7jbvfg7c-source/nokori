import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { kv } from '../data/kv';
import { decode, EMPTY, encode, STATE_KEY, type AppData } from '../data/persist';
import type { Expense, Profile } from '../domain/types';

interface AppState extends AppData {
  ready: boolean;
  /** message à afficher si le stockage sécurisé est indisponible */
  error: string | null;
  saveProfile(p: Profile): Promise<void>;
  addExpense(e: Expense): Promise<void>;
  wipeAll(): Promise<void>;
}

const Ctx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    addExpense: e => commit({ ...latest.current, expenses: [e, ...latest.current.expenses] }),
    wipeAll: async () => { await kv.wipe(); latest.current = EMPTY; setData(EMPTY); },
  }), [data, ready, error, commit]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState hors de AppStateProvider');
  return v;
}
