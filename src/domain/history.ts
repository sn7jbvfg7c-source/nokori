/**
 * Historique du profil : quand on change son revenu ou ses charges, les mois déjà passés
 * gardent le profil qui était en vigueur à l'époque. Sans cela, un bilan d'octobre changerait
 * dès qu'on modifie son loyer en novembre.
 */
import type { Profile } from './types';

export interface ProfileEra { until: string; profile: Profile }

export const monthKeyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;
const prevMonthKey = (today: Date) => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return monthKeyOf(d.getFullYear(), d.getMonth()); };

/** Profil en vigueur pendant le mois (y, m) */
export function profileAt(current: Profile, history: ProfileEra[], y: number, m: number): Profile {
  const k = monthKeyOf(y, m);
  for (const e of history) if (k <= e.until) return e.profile;
  return current;
}

/**
 * Nouvel historique quand le profil change pendant le mois de `today`.
 * L'ancien profil est gardé pour tous les mois jusqu'au mois dernier inclus,
 * sauf s'il a déjà été remplacé ce mois-ci (deux modifications le même mois).
 */
export function recordChange(history: ProfileEra[], previous: Profile | null, today: Date): ProfileEra[] {
  if (!previous) return history;
  const until = prevMonthKey(today);
  const last = history[history.length - 1];
  if (last && last.until >= until) return history;
  return [...history, { until, profile: previous }].slice(-120);
}
