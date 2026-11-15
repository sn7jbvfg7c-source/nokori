/**
 * Repérage des dépenses qui reviennent chaque mois (un abonnement oublié, par exemple),
 * pour proposer d'en faire une charge fixe. Rien n'est ajouté sans l'accord de l'utilisateur.
 */
import { CATEGORIES } from './budget';
import type { Cents } from './money';
import type { ChargeGroup, Expense, FixedCharge } from './types';

export interface Suggestion { key: string; label: string; amount: Cents; day: number; months: number; categoryId: string }

/** « Disney+ 11/2026 » et « disney+ » donnent la même clé */
export const labelKey = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[0-9]/g, ' ').replace(/[^a-z+&]+/g, ' ').trim();

const monthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function detectRecurring(expenses: Expense[], charges: FixedCharge[], today: Date, dismissed: string[]): Suggestion[] {
  const now = today.getFullYear() * 12 + today.getMonth(), todayIso = isoOf(today);
  const chargeKeys = charges.map(c => labelKey(c.name));
  const groups = new Map<string, Expense[]>();
  for (const e of expenses) {
    if (e.date > todayIso || now - monthIndex(e.date) > 2) continue;
    const k = labelKey(e.label);
    if (k.length < 2) continue;
    groups.set(k, [...(groups.get(k) ?? []), e]);
  }
  const out: Suggestion[] = [];
  for (const [key, list] of groups) {
    if (dismissed.includes(key) || chargeKeys.some(c => c === key || (c.length >= 4 && (c.includes(key) || key.includes(c))))) continue;
    const months = new Set(list.map(e => monthIndex(e.date)));
    if (months.size < 2) continue;
    const last = [...list].sort((a, b) => b.date.localeCompare(a.date))[0];
    const close = list.every(e => Math.abs(e.amount - last.amount) <= Math.max(100, last.amount * 0.1));
    if (!close) continue;
    out.push({ key, label: last.label, amount: last.amount, day: Number(last.date.slice(8, 10)), months: months.size, categoryId: last.categoryId });
  }
  return out.sort((a, b) => b.months - a.months || b.amount - a.amount);
}

/** Groupe de charge fixe le plus proche de la catégorie de la dépense */
export function groupFor(categoryId: string): ChargeGroup {
  if (categoryId === 'sante') return 'sante';
  const cat = CATEGORIES.find(c => c.id === categoryId);
  return cat?.pillar === 'besoins' ? 'logement' : 'abos';
}

export function chargeFromSuggestion(s: Suggestion, id: string): FixedCharge {
  return { id, name: s.label, group: groupFor(s.categoryId), amount: s.amount, day: s.day, freq: 'mois' };
}
