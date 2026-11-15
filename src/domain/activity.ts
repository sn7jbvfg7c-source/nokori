/** Liste de l'Activité : dépenses saisies et charges fixes passées, du mois dernier à aujourd'hui */
import { CATEGORIES } from './budget';
import { chargeDays, GROUP_NAME, pillarOfCharge } from './charges';
import type { Cents } from './money';
import type { Expense, PillarId, Profile } from './types';

export interface ActivityItem { key: string; date: string; kind: 'depense' | 'charge'; id: string; label: string; sub: string; amount: Cents; pillar: PillarId }
export interface ActivityDay { date: string; title: string; total: Cents; items: ActivityItem[] }

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const DOW = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const MON = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function dayTitle(date: string, today: Date): string {
  const [y, m, d] = date.split('-').map(Number);
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()), x = Date.UTC(y, m - 1, d);
  const diff = Math.round((t - x) / 86_400_000);
  if (diff === 0) return 'Aujourd’hui';
  if (diff === 1) return 'Hier';
  return `${DOW[new Date(x).getUTCDay()]} ${d} ${MON[m - 1]}`;
}

export function activity(p: Profile, expenses: Expense[], today: Date, filter: PillarId | null = null): ActivityDay[] {
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const startIso = iso(start.getFullYear(), start.getMonth(), 1);
  const items: ActivityItem[] = [];
  for (const e of expenses) {
    if (e.date > todayIso || e.date < startIso) continue;
    const cat = CATEGORIES.find(c => c.id === e.categoryId);
    if (!cat) continue;
    items.push({ key: 'e' + e.id, date: e.date, kind: 'depense', id: e.id, label: e.label, sub: cat.name, amount: e.amount, pillar: cat.pillar });
  }
  for (const k of [-1, 0]) {
    const d0 = new Date(today.getFullYear(), today.getMonth() + k, 1), y = d0.getFullYear(), m = d0.getMonth();
    for (const c of p.charges) for (const d of chargeDays(c, y, m)) {
      const date = iso(y, m, d);
      if (date > todayIso) continue;
      items.push({ key: `c${c.id}${date}`, date, kind: 'charge', id: c.id, label: c.name, sub: `charge fixe, ${GROUP_NAME[c.group].toLowerCase()}`, amount: c.amount, pillar: pillarOfCharge(c) });
    }
  }
  const shown = filter ? items.filter(i => i.pillar === filter) : items;
  const byDate = new Map<string, ActivityItem[]>();
  for (const i of shown.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind))) byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
  return [...byDate].map(([date, list]) => ({ date, title: dayTitle(date, today), total: list.reduce((a, i) => a + i.amount, 0), items: list }));
}

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

export interface ActivityQuery {
  /** mois affiché (hors recherche) */
  year: number; month: number;
  filter?: PillarId | null;
  /** recherche : libellé ou catégorie, dans TOUT l'historique des dépenses */
  query?: string;
  /** profil en vigueur pour un mois (les charges passées gardent leur montant d'époque) */
  profileAt?: (y: number, m: number) => Profile;
}

export interface ActivityResult { days: ActivityDay[]; spent: Cents; fixed: Cents; count: number }

/** Activité d'un mois (dépenses et charges déjà passées), ou résultats d'une recherche sur tout l'historique */
export function activityFor(p: Profile, expenses: Expense[], today: Date, q: ActivityQuery): ActivityResult {
  const todayIso = iso(today.getFullYear(), today.getMonth(), today.getDate());
  const items: ActivityItem[] = [];
  const search = q.query ? norm(q.query) : '';
  const prefix = `${q.year}-${String(q.month + 1).padStart(2, '0')}-`;
  for (const e of expenses) {
    if (e.date > todayIso) continue;
    if (!search && !e.date.startsWith(prefix)) continue;
    const cat = CATEGORIES.find(c => c.id === e.categoryId);
    if (!cat) continue;
    if (search && !norm(e.label).includes(search) && !norm(cat.name).includes(search)) continue;
    items.push({ key: 'e' + e.id, date: e.date, kind: 'depense', id: e.id, label: e.label, sub: cat.name, amount: e.amount, pillar: cat.pillar });
  }
  if (!search) {
    const prof = q.profileAt ? q.profileAt(q.year, q.month) : p;
    for (const c of prof.charges) for (const d of chargeDays(c, q.year, q.month)) {
      const date = iso(q.year, q.month, d);
      if (date > todayIso) continue;
      items.push({ key: `c${c.id}${date}`, date, kind: 'charge', id: c.id, label: c.name, sub: `charge fixe, ${GROUP_NAME[c.group].toLowerCase()}`, amount: c.amount, pillar: pillarOfCharge(c) });
    }
  }
  const shown = q.filter ? items.filter(i => i.pillar === q.filter) : items;
  const byDate = new Map<string, ActivityItem[]>();
  for (const i of shown.sort((a, b) => b.date.localeCompare(a.date) || a.kind.localeCompare(b.kind))) byDate.set(i.date, [...(byDate.get(i.date) ?? []), i]);
  const days = [...byDate].map(([date, list]) => ({ date, title: dayTitle(date, today), total: list.reduce((a, i) => a + i.amount, 0), items: list }));
  return {
    days,
    spent: shown.filter(i => i.kind === 'depense').reduce((a, i) => a + i.amount, 0),
    fixed: shown.filter(i => i.kind === 'charge').reduce((a, i) => a + i.amount, 0),
    count: shown.length,
  };
}

/** Premier mois où une dépense a été saisie (pour borner la navigation) */
export function firstMonth(expenses: Expense[], today: Date): { year: number; month: number } {
  let min = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  for (const e of expenses) if (e.date.slice(0, 7) < min) min = e.date.slice(0, 7);
  return { year: Number(min.slice(0, 4)), month: Number(min.slice(5, 7)) - 1 };
}
