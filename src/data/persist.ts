/**
 * Sérialisation de l'état. Tout ce qui est relu est vérifié champ par champ :
 * une donnée abîmée ou inattendue est écartée, jamais exécutée ni affichée telle quelle.
 */
import { MAX_BALANCE, type Account, type AccountKind } from '../domain/accounts';
import type { Goal, GoalType } from '../domain/goals';
import type { ProfileEra } from '../domain/history';
import type { ChargeGroup, Expense, FixedCharge, Frequency, Profile } from '../domain/types';

export const STATE_KEY = 'state';
/** Version du format. Une version plus récente que celle de l'app est refusée (illisible), jamais écrasée. */
export const STATE_VERSION = 1;

export interface AppData { profile: Profile | null; /** profils des mois passés, du plus ancien au plus récent */ history: ProfileEra[]; expenses: Expense[]; /** suggestions de charges ignorées */ dismissed: string[]; accounts: Account[]; goals: Goal[]; /** notes « comment faire mieux », par mois AAAA-MM */ notes: Record<string, string>; prefs: Prefs }
export interface Prefs { theme: 'auto' | 'clair' | 'sombre'; lock: boolean; hideAmounts: boolean; alerts: boolean; /** date de la dernière sauvegarde exportée (AAAA-MM-JJ) */ lastBackup?: string }
export const DEFAULT_PREFS: Prefs = { theme: 'auto', lock: false, hideAmounts: false, alerts: false };
export const EMPTY: AppData = { profile: null, history: [], expenses: [], dismissed: [], accounts: [], goals: [], notes: {}, prefs: DEFAULT_PREFS };

const GROUPS: ChargeGroup[] = ['logement', 'energie', 'internet', 'assurance', 'sante', 'transports', 'abos', 'sport'];
const FREQS: Frequency[] = ['mois', '4sem', 'an'];
const MAX_CENTS = 10_000_000;

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const cents = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= MAX_CENTS;
const text = (x: unknown, max = 40) => typeof x === 'string' && x.length > 0 && x.length <= max;
const day = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 31;
const isoDate = (x: unknown) => typeof x === 'string' && /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(x);

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

const KINDS: AccountKind[] = ['courant', 'livret', 'placement', 'especes'];
function account(x: unknown): Account | null {
  if (!isObj(x) || !text(x.id, 64) || !text(x.name) || !KINDS.includes(x.kind as AccountKind) || !isoDate(x.updated)) return null;
  if (typeof x.balance !== 'number' || !Number.isInteger(x.balance) || Math.abs(x.balance) > MAX_BALANCE) return null;
  return { id: x.id as string, name: x.name as string, kind: x.kind as AccountKind, balance: x.balance, updated: x.updated as string };
}

const GOAL_TYPES: GoalType[] = ['voyage', 'voiture', 'maison', 'precaution', 'etudes', 'autre'];
const bigCents = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= MAX_BALANCE;
function goal(x: unknown): Goal | null {
  if (!isObj(x) || !text(x.id, 64) || !text(x.name) || !GOAL_TYPES.includes(x.type as GoalType) || !bigCents(x.target) || !bigCents(x.saved) || !bigCents(x.monthly) || (x.target as number) <= 0) return null;
  return { id: x.id as string, name: x.name as string, type: x.type as GoalType, target: x.target as number, saved: x.saved as number, monthly: x.monthly as number };
}

const monthKeyOk = (x: unknown): x is string => typeof x === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(x);

function history(x: unknown): ProfileEra[] {
  if (!Array.isArray(x)) return [];
  const out: ProfileEra[] = [];
  for (const e of x.slice(-120)) {
    if (!isObj(e) || !monthKeyOk(e.until)) continue;
    const p = profile(e.profile);
    if (p && (!out.length || out[out.length - 1].until < e.until)) out.push({ until: e.until, profile: p });
  }
  return out;
}

/**
 * Résultat d'une lecture :
 * - « vide » : rien d'enregistré (premier lancement) ;
 * - « ok » : données relues (les éléments abîmés sont écartés un par un) ;
 * - « illisible » : il y a quelque chose, mais ce n'est pas lisible (fichier abîmé, version future).
 *   Dans ce cas, l'app ne doit RIEN réécrire tant que l'utilisateur n'a pas choisi : sinon tout serait perdu.
 */
export type Decoded = { status: 'vide'; data: AppData } | { status: 'ok'; data: AppData } | { status: 'illisible'; data: AppData };

export function decodeState(raw: string | null): Decoded {
  if (raw === null || raw === '') return { status: 'vide', data: EMPTY };
  const data = parse(raw);
  return data ? { status: 'ok', data } : { status: 'illisible', data: EMPTY };
}

/** Lecture tolérante (tests, compatibilité) : une donnée illisible donne un état vide */
export const decode = (raw: string | null): AppData => decodeState(raw).data;

function parse(raw: string): AppData | null {
  if (raw.length > 5_000_000) return null;
  try {
    const j: unknown = JSON.parse(raw);
    if (!isObj(j) || typeof j.v !== 'number' || j.v < 1 || j.v > STATE_VERSION) return null;
    const expenses = Array.isArray(j.expenses) ? j.expenses.slice(0, 50_000).map(expense).filter((e): e is Expense => e !== null) : [];
    const dismissed = Array.isArray(j.dismissed) ? j.dismissed.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 64).slice(0, 200) : [];
    const accounts = Array.isArray(j.accounts) ? j.accounts.slice(0, 50).map(account).filter((a): a is Account => a !== null) : [];
    const goals = Array.isArray(j.goals) ? j.goals.slice(0, 30).map(goal).filter((g): g is Goal => g !== null) : [];
    const notes: Record<string, string> = Object.create(null);
    if (isObj(j.notes)) for (const [k, v] of Object.entries(j.notes).slice(0, 60)) if (/^\d{4}-(0[1-9]|1[0-2])$/.test(k) && typeof v === 'string' && v.length <= 280) notes[k] = v;
    const pr = isObj(j.prefs) ? j.prefs : {};
    const prefs: Prefs = {
      theme: pr.theme === 'clair' || pr.theme === 'sombre' ? pr.theme : 'auto',
      lock: pr.lock === true, hideAmounts: pr.hideAmounts === true, alerts: pr.alerts === true,
    };
    if (isoDate(pr.lastBackup)) prefs.lastBackup = pr.lastBackup as string;
    return { profile: j.profile == null ? null : profile(j.profile), history: history(j.history), expenses, dismissed, accounts, goals, notes: { ...notes }, prefs };
  } catch {
    return null;
  }
}

export const encode = (d: AppData): string => JSON.stringify({ v: STATE_VERSION, profile: d.profile, history: d.history, expenses: d.expenses, dismissed: d.dismissed, accounts: d.accounts, goals: d.goals, notes: d.notes, prefs: d.prefs });
