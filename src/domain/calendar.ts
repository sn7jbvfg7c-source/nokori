/** Calendrier d'un mois : charges fixes reportées, dépenses saisies, paie. Tout en centimes. */
import { chargeDays, daysInMonth } from './charges';
import type { Cents } from './money';
import type { Expense, Profile } from './types';

export type MonthStatus = 'clos' | 'en cours' | 'prévu';
export interface CalendarDay { d: number; charges: { id: string; name: string; amount: Cents }[]; expenses: Expense[]; income: Cents; spent: Cents; future: boolean }
export interface CalendarMonth {
  year: number; month: number; status: MonthStatus; length: number;
  /** décalage du 1er du mois, lundi = 0 */
  firstDow: number;
  days: CalendarDay[];
  income: Cents; saving: Cents; fixed: Cents; variable: Cents;
  /** mois prévu : ce qui restera pour les dépenses courantes */
  free: Cents;
}

export function calendarMonth(p: Profile, expenses: Expense[], year: number, month: number, today: Date): CalendarMonth {
  const length = daysInMonth(year, month);
  const key = year * 12 + month, now = today.getFullYear() * 12 + today.getMonth();
  const status: MonthStatus = key < now ? 'clos' : key > now ? 'prévu' : 'en cours';
  const isFuture = (d: number) => status === 'prévu' || (status === 'en cours' && d > today.getDate());
  const days: CalendarDay[] = Array.from({ length }, (_, i) => ({ d: i + 1, charges: [], expenses: [], income: 0, spent: 0, future: isFuture(i + 1) }));

  for (const c of p.charges) for (const d of chargeDays(c, year, month)) days[d - 1].charges.push({ id: c.id, name: c.name, amount: c.amount });
  const income = p.income + p.extraIncome;
  days[Math.min(p.payday, length) - 1].income = income;

  const prefix = `${year}-${String(month + 1).padStart(2, '0')}-`;
  let variable = 0;
  for (const e of expenses) {
    if (!e.date.startsWith(prefix)) continue;
    const d = Number(e.date.slice(8, 10));
    if (d < 1 || d > length || days[d - 1].future) continue;
    days[d - 1].expenses.push(e);
    days[d - 1].spent += e.amount;
    variable += e.amount;
  }

  const fixed = days.reduce((a, x) => a + x.charges.reduce((b, c) => b + c.amount, 0), 0);
  const saving = Math.round(income * Math.min(0.4, Math.max(0, p.savePct)));
  return { year, month, status, length, firstDow: (new Date(year, month, 1).getDay() + 6) % 7, days, income, saving, fixed, variable, free: income - saving - fixed };
}
