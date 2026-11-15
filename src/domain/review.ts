/**
 * Bilan kakeibo d'un mois : les quatre questions, la répartition, le pilier qui a le plus pesé.
 * Limite connue : un mois passé est recalculé avec le profil actuel (revenu, charges fixes).
 */
import { buildMonth, CATEGORIES, type PillarState } from './budget';
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
export const cleanNote = (s: string) => Array.from(s.replace(/[\u0000-\u0008\u000b-\u001f\u007f<>]/g, '')).slice(0, 280).join('');

export interface CategorySpend { id: string; name: string; pillar: Review['pillars'][number]['id']; spent: Cents; count: number }

/** Dépenses saisies d'un mois, par catégorie (de la plus grosse à la plus petite). Rien d'inventé : seulement les vraies saisies. */
export function byCategory(expenses: Expense[], year: number, month: number, upTo?: Date): CategorySpend[] {
  const prefix = monthKey(year, month) + '-';
  const lastDay = upTo && upTo.getFullYear() === year && upTo.getMonth() === month ? upTo.getDate() : 31;
  const map = new Map<string, CategorySpend>();
  for (const e of expenses) {
    if (!e.date.startsWith(prefix) || Number(e.date.slice(8, 10)) > lastDay) continue;
    const cat = CATEGORIES.find(c => c.id === e.categoryId);
    if (!cat) continue;
    const cur = map.get(cat.id) ?? { id: cat.id, name: cat.name, pillar: cat.pillar, spent: 0, count: 0 };
    cur.spent += e.amount; cur.count += 1;
    map.set(cat.id, cur);
  }
  return [...map.values()].sort((a, b) => b.spent - a.spent);
}

export interface Comparison {
  /** dépenses courantes (hors charges fixes) de ce mois et du mois précédent, au même jour si le mois est en cours */
  now: Cents; before: Cents; diff: Cents;
  /** variation en part (0,12 = +12 %) ; null si le mois précédent n'a aucune dépense */
  pct: number | null;
  /** au même jour du mois : comparaison équitable d'un mois en cours */
  sameDay: boolean;
}

/** Compare les dépenses courantes avec le mois précédent ; pour un mois en cours, à la même date */
export function compareWithPrevious(expenses: Expense[], year: number, month: number, today: Date): Comparison {
  const closed = year * 12 + month < today.getFullYear() * 12 + today.getMonth();
  const prev = new Date(year, month - 1, 1);
  const day = closed ? 31 : today.getDate();
  const sum = (y: number, m: number, upTo: number) => expenses.filter(e => e.date.startsWith(monthKey(y, m) + '-') && Number(e.date.slice(8, 10)) <= upTo && CATEGORIES.some(c => c.id === e.categoryId)).reduce((a, e) => a + e.amount, 0);
  const now = sum(year, month, day), before = sum(prev.getFullYear(), prev.getMonth(), day);
  return { now, before, diff: now - before, pct: before > 0 ? (now - before) / before : null, sameDay: !closed };
}
