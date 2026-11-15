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
  /** charges fixes déjà prélevées ce mois-ci */
  paidFixed: Cents;
  /** dépenses saisies ce mois-ci, jusqu'à aujourd'hui */
  variable: Cents;
  /** ARGENT DISPONIBLE : ce qui reste une fois les charges à venir retirées (le grand chiffre de l'accueil) */
  free: Cents;
  daysLeft: number;
  /** disponible par jour d'ici la fin du mois (0 si le budget est dépassé) */
  perDay: Cents;
  /** budget dépassé : il n'y a plus rien de disponible */
  over: boolean;
  /** projection au dernier jour du mois, au rythme actuel (négatif = il manquera) */
  endOfMonth: Cents;
  /** moins de 7 jours de données : la projection s'appuie en partie sur le budget prévu */
  earlyProjection: boolean;
}

/** Nombre de jours en dessous duquel la projection mélange le rythme réel et le rythme prévu */
export const PROJECTION_WARMUP = 7;

/** Budget du mois de `date`, au jour de `date`. Tout est en centimes. */
export function buildMonth(p: Profile, expenses: Expense[], date: Date): MonthState {
  const year = date.getFullYear(), month = date.getMonth(), today = date.getDate(), length = daysInMonth(year, month);
  const income = p.income + p.extraIncome;
  const saving = Math.round(income * Math.min(0.4, Math.max(0, p.savePct)));
  const fixedMonthly = p.charges.reduce((a, c) => a + monthlyAmount(c), 0);
  const pool = Math.max(0, income - saving - fixedMonthly);

  const budgets: Record<PillarId, Cents> = { besoins: 0, envies: 0, culture: 0, imprevus: 0 };
  const spentBy: Record<PillarId, Cents> = { besoins: 0, envies: 0, culture: 0, imprevus: 0 };
  let upcoming = 0, paidFixed = 0;

  // charges fixes : budgétées dans leur pilier, payées si leur jour est passé
  for (const c of p.charges) {
    const pil = pillarOfCharge(c);
    for (const d of chargeDays(c, year, month)) {
      budgets[pil] += c.amount;
      if (d <= today) { spentBy[pil] += c.amount; paidFixed += c.amount; } else upcoming += c.amount;
    }
  }
  // catégories courantes : budgets de référence mis à l'échelle du reste à vivre
  let variableBudget = 0;
  for (const cat of CATEGORIES) { const b = Math.round((cat.reference * pool) / REFERENCE_TOTAL); budgets[cat.pillar] += b; variableBudget += b; }
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
  // Rythme de dépense. Les premiers jours, un seul gros achat fausserait tout :
  // on complète les jours manquants (jusqu'à 7) avec le rythme prévu par le budget.
  const planned = variableBudget / length;
  const warm = Math.max(0, PROJECTION_WARMUP - today);
  const pace = (variable + planned * warm) / (today + warm);
  const endOfMonth = Math.round(left - (pace * (length - today) + upcoming));
  const over = free < 0;
  return {
    year, month, today, length, income, saving, fixedMonthly, pillars, budget, spent, left, upcoming, paidFixed, variable, free, daysLeft,
    perDay: over ? 0 : Math.floor(free / daysLeft), over, endOfMonth, earlyProjection: warm > 0,
  };
}
