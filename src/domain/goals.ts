/**
 * Objectifs d'épargne et défis kakeibo.
 * Nokori ne déplace pas d'argent : un « versement » est noté par l'utilisateur après l'avoir fait dans sa banque.
 */
import { buildMonth, CATEGORIES } from './budget';
import type { Cents } from './money';
import { MONTH_NAMES } from './months';
import type { Expense, Profile } from './types';

export type GoalType = 'voyage' | 'voiture' | 'maison' | 'precaution' | 'etudes' | 'autre';
export interface Goal { id: string; name: string; type: GoalType; target: Cents; saved: Cents; monthly: Cents }

export const GOAL_TYPES: { id: GoalType; name: string; icon: string; color: string }[] = [
  { id: 'voyage', name: 'Voyage', icon: 'globe', color: '#B84E27' },
  { id: 'voiture', name: 'Voiture', icon: 'truck', color: '#467A6B' },
  { id: 'maison', name: 'Maison', icon: 'home', color: '#5B4287' },
  { id: 'precaution', name: 'Précaution', icon: 'shield', color: '#A27A26' },
  { id: 'etudes', name: 'Études', icon: 'book-open', color: '#334F8C' },
  { id: 'autre', name: 'Autre', icon: 'star', color: '#26231F' },
];

export interface Eta { reached: boolean; months: number | null; label: string | null }

/** Date d'arrivée au rythme de `perMonth` par mois, à partir du mois de `today` */
export function eta(target: Cents, saved: Cents, perMonth: Cents, today: Date): Eta {
  if (saved >= target) return { reached: true, months: 0, label: null };
  if (perMonth <= 0) return { reached: false, months: null, label: null };
  const months = Math.ceil((target - saved) / perMonth);
  if (months > 600) return { reached: false, months, label: null };
  const idx = today.getFullYear() * 12 + today.getMonth() + months;
  return { reached: false, months, label: `${MONTH_NAMES[idx % 12]} ${Math.floor(idx / 12)}` };
}

/** Ce qui restera à la fin du mois au rythme actuel (jamais négatif ici) : recalculé à chaque dépense */
export function monthSurplus(p: Profile, expenses: Expense[], today: Date): Cents {
  return Math.max(0, buildMonth(p, expenses, today).endOfMonth);
}

export const progress = (g: Goal) => (g.target > 0 ? Math.min(1, g.saved / g.target) : 0);

/** Semaine en cours (lundi → dimanche) sans dépense d'envies ; null = jour pas encore arrivé */
export function weekWithoutWants(expenses: Expense[], today: Date): (boolean | null)[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const wants = new Set(CATEGORIES.filter(c => c.pillar === 'envies').map(c => c.id));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    if (d > today) return null;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return !expenses.some(e => e.date === iso && wants.has(e.categoryId));
  });
}

/** Jours d'affilée, jusqu'à aujourd'hui, où les dépenses courantes restent sous le budget du jour */
export function streakUnderDailyBudget(p: Profile, expenses: Expense[], today: Date): { days: number; perDay: Cents } {
  const perDay = buildMonth(p, expenses, today).perDay;
  let days = 0;
  for (let k = 0; k < 31; k++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
    if (d.getMonth() !== today.getMonth()) break;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const spent = expenses.filter(e => e.date === iso).reduce((a, e) => a + e.amount, 0);
    if (perDay <= 0 || spent > perDay) break;
    days++;
  }
  return { days, perDay };
}
