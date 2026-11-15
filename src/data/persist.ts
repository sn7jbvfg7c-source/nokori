/**
 * Sérialisation de l'état. Tout ce qui est relu est vérifié champ par champ :
 * une donnée abîmée ou inattendue est écartée, jamais exécutée ni affichée telle quelle.
 */
import type { ChargeGroup, Expense, FixedCharge, Frequency, Profile } from '../domain/types';

export const STATE_KEY = 'state';
export const STATE_VERSION = 1;

export interface AppData { profile: Profile | null; expenses: Expense[] }
export const EMPTY: AppData = { profile: null, expenses: [] };

const GROUPS: ChargeGroup[] = ['logement', 'energie', 'internet', 'assurance', 'sante', 'transports', 'abos', 'sport'];
const FREQS: Frequency[] = ['mois', '4sem', 'an'];
const MAX_CENTS = 10_000_000;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const cents = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= MAX_CENTS;
const text = (x: unknown, max = 40) => typeof x === 'string' && x.length > 0 && x.length <= max;
const day = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 31;
const isoDate = (x: unknown) => typeof x === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x);

function charge(x: unknown): FixedCharge | null {
  if (!isObj(x) || !text(x.id, 64) || !text(x.name) || !GROUPS.includes(x.group as ChargeGroup) || !cents(x.amount) || !day(x.day) || !FREQS.includes(x.freq as Frequency)) return null;
  const c: FixedCharge = { id: x.id as string, name: x.name as string, group: x.group as ChargeGroup, amount: x.amount as number, day: x.day as number, freq: x.freq as Frequency };
  if (c.freq === '4sem') { if (!isoDate(x.anchor)) return null; c.anchor = x.anchor as string; }
  if (c.freq === 'an') { if (typeof x.month !== 'number' || !Number.isInteger(x.month) || x.month < 0 || x.month > 11) return null; c.month = x.month; }
  return c;
}

function profile(x: unknown): Profile | null {
  if (!isObj(x) || !cents(x.income) || !cents(x.extraIncome) || !day(x.payday) || typeof x.savePct !== 'number' || !(x.savePct >= 0 && x.savePct <= 0.4) || !Array.isArray(x.charges)) return null;
  const charges = x.charges.slice(0, 200).map(charge).filter((c): c is FixedCharge => c !== null);
  return { income: x.income as number, extraIncome: x.extraIncome as number, payday: x.payday as number, savePct: x.savePct, charges };
}

function expense(x: unknown): Expense | null {
  if (!isObj(x) || !text(x.id, 64) || !isoDate(x.date) || !text(x.label) || !text(x.categoryId, 40) || !cents(x.amount)) return null;
  return { id: x.id as string, date: x.date as string, label: x.label as string, categoryId: x.categoryId as string, amount: x.amount as number };
}

export function decode(raw: string | null): AppData {
  if (!raw || raw.length > 2_000_000) return EMPTY;
  try {
    const j: unknown = JSON.parse(raw);
    if (!isObj(j) || j.v !== STATE_VERSION) return EMPTY;
    const expenses = Array.isArray(j.expenses) ? j.expenses.slice(0, 20_000).map(expense).filter((e): e is Expense => e !== null) : [];
    return { profile: j.profile == null ? null : profile(j.profile), expenses };
  } catch {
    return EMPTY;
  }
}

export const encode = (d: AppData): string => JSON.stringify({ v: STATE_VERSION, profile: d.profile, expenses: d.expenses });
