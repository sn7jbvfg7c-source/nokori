/**
 * Objectifs d'épargne et défis kakeibo.
 * Nokori ne déplace pas d'argent : un « versement » est noté par l'utilisateur après l'avoir fait dans sa banque.
 */
import { buildMonth, CATEGORIES } from './budget';
import type { Cents } from './money';
import { MONTH_NAMES } from './months';
import type { Expense, Profile } from './types';

export type GoalType = 'voyage' | 'voiture' | 'maison' | 'precaution' | 'etudes' | 'autre';
/** Un versement noté par l'utilisateur (après l'avoir fait dans sa banque) */
export interface Deposit { date: string; amount: Cents }
export interface Goal { id: string; name: string; type: GoalType; target: Cents; saved: Cents; monthly: Cents; /** versements notés, du plus récent au plus ancien (100 au plus) */ deposits?: Deposit[] }

/** Note un versement : ajoute au total et à l'historique */
export function addDeposit(g: Goal, amount: Cents, date: string): Goal {
  if (!(amount > 0)) return g;
  // un versement ancien (noté après coup) se range à sa date : l'historique reste du plus récent au plus ancien
  const deposits = [{ date, amount }, ...(g.deposits ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 100);
  return { ...g, saved: Math.min(g.saved + amount, 10_000_000_000), deposits };
}

/** Total versé pendant un mois (AAAA-MM) */
export const depositedIn = (g: Goal, month: string): Cents => (g.deposits ?? []).filter(d => d.date.startsWith(month)).reduce((a, d) => a + d.amount, 0);

/** Palier atteint : 25, 50, 75 ou 100 %, ou null */
export function milestone(g: Goal): 25 | 50 | 75 | 100 | null {
  const p = g.target > 0 ? g.saved / g.target : 0;
  return p >= 1 ? 100 : p >= 0.75 ? 75 : p >= 0.5 ? 50 : p >= 0.25 ? 25 : null;
}

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

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Premier jour suivi : la première dépense saisie. Avant, on ne sait rien : un défi ne se gagne pas sans données. */
export const firstTrackedDay = (expenses: Expense[]): string | null => expenses.reduce<string | null>((m, e) => (m === null || e.date < m ? e.date : m), null);

/**
 * Semaine en cours (lundi → dimanche) sans dépense d'envies.
 * null = jour pas encore arrivé, ou antérieur à la première dépense saisie (pas de données : ni réussi ni raté).
 */
export function weekWithoutWants(expenses: Expense[], today: Date): (boolean | null)[] {
  const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7));
  const wants = new Set(CATEGORIES.filter(c => c.pillar === 'envies').map(c => c.id));
  const first = firstTrackedDay(expenses);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const iso = isoDay(d);
    if (d > today || first === null || iso < first) return null;
    return !expenses.some(e => e.date === iso && wants.has(e.categoryId));
  });
}

/**
 * Jours d'affilée, jusqu'à aujourd'hui, où les dépenses courantes restent sous le budget du jour.
 * Le budget de chaque jour est celui connu le matin même (dépenses des jours d'avant seulement),
 * et seuls les jours depuis la première dépense comptent.
 */
export function streakUnderDailyBudget(p: Profile, expenses: Expense[], today: Date): { days: number; perDay: Cents } {
  const perDay = buildMonth(p, expenses.filter(e => e.date < isoDay(today)), today).perDay;
  const first = firstTrackedDay(expenses);
  let days = 0;
  if (first === null) return { days, perDay };
  for (let k = 0; k < 31; k++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - k);
    const iso = isoDay(d);
    if (d.getMonth() !== today.getMonth() || iso < first) break;
    const morning = buildMonth(p, expenses.filter(e => e.date < iso), d).perDay;
    const spent = expenses.filter(e => e.date === iso && CATEGORIES.some(c => c.id === e.categoryId)).reduce((a, e) => a + e.amount, 0);
    if (morning <= 0 || spent > morning) break;
    days++;
  }
  return { days, perDay };
}

/**
 * Date saisie « JJ/MM/AAAA » (ou « J/M/AA ») : renvoie AAAA-MM-JJ, ou null si elle n'existe pas,
 * si elle est dans le futur ou avant 2000. Un versement se note après l'avoir fait.
 */
export function parseDayFr(s: string, today: Date): string | null {
  const m = /^\s*(\d{1,2})[/.\- ](\d{1,2})[/.\- ](\d{2}|\d{4})\s*$/.exec(s);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (y < 2000 || dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  if (dt > new Date(today.getFullYear(), today.getMonth(), today.getDate())) return null;
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
