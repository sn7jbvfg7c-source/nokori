/**
 * Bilan kakeibo d'un mois : les quatre questions, la répartition, le pilier qui a le plus pesé.
 * Limite connue : un mois passé est recalculé avec le profil actuel (revenu, charges fixes).
 */
import { buildMonth, type PillarState } from './budget';
import { daysInMonth } from './charges';
import type { Cents } from './money';
import type { Expense, Profile } from './types';

export interface Review {
  key: string; year: number; month: number; closed: boolean;
  income: Cents; saving: Cents; spent: Cents;
  /** non dépensé (négatif = dépassement) */
  left: Cents;
  /** épargne prévue + ce qui n'a pas été dépensé */
  savedTotal: Cents;
  savedPct: number;
  pillars: PillarState[];
  top: PillarState | null;
}

export const monthKey = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

export function review(p: Profile, expenses: Expense[], year: number, month: number, today: Date): Review {
  const closed = year * 12 + month < today.getFullYear() * 12 + today.getMonth();
  const at = closed ? new Date(year, month, daysInMonth(year, month)) : today;
  const s = buildMonth(p, expenses, at);
  const savedTotal = s.saving + Math.max(0, closed ? s.left : 0);
  const top = s.pillars.reduce<PillarState | null>((a, x) => (x.spent > (a?.spent ?? 0) ? x : a), null);
  return {
    key: monthKey(year, month), year, month, closed,
    income: s.income, saving: s.saving, spent: s.spent, left: s.left,
    savedTotal, savedPct: s.income > 0 ? savedTotal / s.income : 0,
    pillars: s.pillars, top,
  };
}

/** Note « comment faire mieux » : texte libre nettoyé, 280 caractères au plus */
export const cleanNote = (s: string) => s.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '').slice(0, 280);
