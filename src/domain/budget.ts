import { chargeDays, daysInMonth, monthlyAmount, pillarOfCharge } from './charges';
import type { Cents } from './money';
import type { Category, Expense, PillarId, Profile } from './types';

export const PILLARS: { id: PillarId; name: string; hint: string }[] = [
  { id: 'besoins', name: 'Besoins', hint: 'ce qui fait vivre' },
  { id: 'envies', name: 'Envies', hint: 'ce qui fait plaisir' },
  { id: 'culture', name: 'Culture', hint: 'ce qui fait grandir' },
  { id: 'imprevus', name: 'Imprévus', hint: 'ce qui arrive' },
];

/** Catégories courantes, hors charges fixes (budgets de référence du prototype) */
export const CATEGORIES: Category[] = [
  { id: 'courses', name: 'Courses', pillar: 'besoins', reference: 38_000 },
  { id: 'sante', name: 'Santé', pillar: 'besoins', reference: 4_000 },
  { id: 'restos', name: 'Restos et sorties', pillar: 'envies', reference: 18_000 },
  { id: 'shopping', name: 'Shopping', pillar: 'envies', reference: 12_000 },
  { id: 'loisirs', name: 'Loisirs', pillar: 'envies', reference: 9_000 },
  { id: 'culture', name: 'Livres et sorties culturelles', pillar: 'culture', reference: 8_000 },
  { id: 'imprevus', name: 'Imprévus', pillar: 'imprevus', reference: 12_000 },
];
const REFERENCE_TOTAL = CATEGORIES.reduce((a, c) => a + c.reference, 0);

export interface PillarState { id: PillarId; name: string; hint: string; budget: Cents; spent: Cents; left: Cents }
export interface MonthState {
  year: number; month: number; today: number; length: number;
  income: Cents; saving: Cents; fixedMonthly: Cents;
  pillars: PillarState[];
  budget: Cents; spent: Cents; left: Cents;
  /** charges fixes encore à venir ce mois-ci */
  upcoming: Cents;
  /** ce qui reste une fois les charges à venir retirées */
  free: Cents;
  daysLeft: number;
  perDay: Cents;
  /** projection au dernier jour du mois, au rythme actuel (négatif = il manquera) */
  endOfMonth: Cents;
}

/** Budget du mois de `date`, au jour de `date`. Tout est en centimes. */
export function buildMonth(p: Profile, expenses: Expense[], date: Date): MonthState {
  const year = date.getFullYear(), month = date.getMonth(), today = date.getDate(), length = daysInMonth(year, month);
  const income = p.income + p.extraIncome;
  const saving = Math.round(income * Math.min(0.4, Math.max(0, p.savePct)));
  const fixedMonthly = p.charges.reduce((a, c) => a + monthlyAmount(c), 0);
  const pool = Math.max(0, income - saving - fixedMonthly);

  const budgets: Record<PillarId, Cents> = { besoins: 0, envies: 0, culture: 0, imprevus: 0 };
  const spentBy: Record<PillarId, Cents> = { besoins: 0, envies: 0, culture: 0, imprevus: 0 };
  let upcoming = 0;

  // charges fixes : budgétées dans leur pilier, payées si leur jour est passé
  for (const c of p.charges) {
    const pil = pillarOfCharge(c);
    for (const d of chargeDays(c, year, month)) {
      budgets[pil] += c.amount;
      if (d <= today) spentBy[pil] += c.amount; else upcoming += c.amount;
    }
  }
  // catégories courantes : budgets de référence mis à l'échelle du reste à vivre
  for (const cat of CATEGORIES) budgets[cat.pillar] += Math.round((cat.reference * pool) / REFERENCE_TOTAL);
  // dépenses saisies ce mois-ci
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  let variable = 0;
  for (const e of expenses) {
    if (!e.date.startsWith(prefix) || Number(e.date.slice(8, 10)) > today) continue;
    const cat = CATEGORIES.find(c => c.id === e.categoryId);
    if (!cat) continue;
    spentBy[cat.pillar] += e.amount;
    variable += e.amount;
  }

  const pillars = PILLARS.map(pl => ({ ...pl, budget: budgets[pl.id], spent: spentBy[pl.id], left: budgets[pl.id] - spentBy[pl.id] }));
  const budget = pillars.reduce((a, x) => a + x.budget, 0), spent = pillars.reduce((a, x) => a + x.spent, 0);
  const left = budget - spent, free = left - upcoming, daysLeft = length - today + 1;
  const pace = variable / today;
  const endOfMonth = Math.round(left - (pace * (length - today) + upcoming));
  return { year, month, today, length, income, saving, fixedMonthly, pillars, budget, spent, left, upcoming, free, daysLeft, perDay: Math.round(free / daysLeft), endOfMonth };
}
