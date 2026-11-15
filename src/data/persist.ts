/**
 * Sérialisation de l'état. Tout ce qui est relu est vérifié champ par champ :
 * une donnée abîmée ou inattendue est écartée, jamais exécutée ni affichée telle quelle.
 */
import { MAX_BALANCE, type Account, type AccountKind } from '../domain/accounts';
import { CATEGORIES } from '../domain/budget';
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
/**
 * Texte relu : sans caractères de contrôle ni caractères qui inversent le sens d'écriture (U+202A-202E, U+2066-2069),
 * qui pourraient faire mentir l'affichage d'un libellé. Les retours à la ligne des notes sont gardés.
 */
export const cleanText = (s: string, keepNewlines = false) =>
  s.replace(keepNewlines ? /[\u0000-\u0009\u000b-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g : /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '');
const label = (x: unknown, max = 40): string | null => (text(x, max) ? cleanText(x as string).trim() || null : null);
const CATEGORY_IDS = new Set(CATEGORIES.map(c => c.id));
const day = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= 31;
/** Date AAAA-MM-JJ qui existe vraiment (pas de 31 février), entre 2000 et 2100 */
const isoDate = (x: unknown): x is string => {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false;
  const y = Number(x.slice(0, 4)), m = Number(x.slice(5, 7)), d = Number(x.slice(8, 10));
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
};

function charge(x: unknown): FixedCharge | null {
  const name = label(isObj(x) ? x.name : null);
  if (!isObj(x) || !text(x.id, 64) || !name || !GROUPS.includes(x.group as ChargeGroup) || !cents(x.amount) || !day(x.day) || !FREQS.includes(x.freq as Frequency)) return null;
  const c: FixedCharge = { id: x.id as string, name, group: x.group as ChargeGroup, amount: x.amount as number, day: x.day as number, freq: x.freq as Frequency };
  if (c.freq === '4sem') { if (!isoDate(x.anchor)) return null; c.anchor = x.anchor as string; }
  if (c.freq === 'an') { if (typeof x.month !== 'number' || !Number.isInteger(x.month) || x.month < 0 || x.month > 11) return null; c.month = x.month; }
  return c;
}

function profile(x: unknown): Profile | null {
  if (isObj(x) && x.extraIncome === undefined) x = { ...x, extraIncome: 0 }; // champ ajouté plus tard : absent = 0
  if (!isObj(x) || !cents(x.income) || !cents((x as Record<string, unknown>).extraIncome) || !day(x.payday) || typeof x.savePct !== 'number' || !Number.isFinite(x.savePct) || !Array.isArray(x.charges)) return null;
  const charges = x.charges.slice(0, 200).map(charge).filter((c): c is FixedCharge => c !== null);
  return { income: x.income as number, extraIncome: x.extraIncome as number, payday: x.payday as number, savePct: Math.min(0.4, Math.max(0, x.savePct as number)), charges };
}

function expense(x: unknown): Expense | null {
  const l = label(isObj(x) ? x.label : null);
  // catégorie inconnue : la dépense serait invisible partout (ni liste, ni totaux) et impossible à supprimer
  if (!isObj(x) || !text(x.id, 64) || !isoDate(x.date) || !l || typeof x.categoryId !== 'string' || !CATEGORY_IDS.has(x.categoryId) || !cents(x.amount)) return null;
  return { id: x.id as string, date: x.date as string, label: l, categoryId: x.categoryId, amount: x.amount as number };
}

const KINDS: AccountKind[] = ['courant', 'livret', 'placement', 'especes'];
function account(x: unknown): Account | null {
  const name = label(isObj(x) ? x.name : null);
  if (!isObj(x) || !text(x.id, 64) || !name || !KINDS.includes(x.kind as AccountKind) || !isoDate(x.updated)) return null;
  if (typeof x.balance !== 'number' || !Number.isInteger(x.balance) || Math.abs(x.balance) > MAX_BALANCE) return null;
  return { id: x.id as string, name, kind: x.kind as AccountKind, balance: x.balance, updated: x.updated as string };
}

const GOAL_TYPES: GoalType[] = ['voyage', 'voiture', 'maison', 'precaution', 'etudes', 'autre'];
const bigCents = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= MAX_BALANCE;
function goal(x: unknown): Goal | null {
  const name = label(isObj(x) ? x.name : null);
  if (!isObj(x) || !text(x.id, 64) || !name || !GOAL_TYPES.includes(x.type as GoalType) || !bigCents(x.target) || !bigCents(x.saved) || !bigCents(x.monthly) || (x.target as number) <= 0) return null;
  const g: Goal = { id: x.id as string, name, type: x.type as GoalType, target: x.target as number, saved: x.saved as number, monthly: x.monthly as number };
  if (Array.isArray(x.deposits)) {
    const deps = x.deposits.slice(0, 100).filter((d): d is { date: string; amount: number } => isObj(d) && isoDate(d.date) && bigCents(d.amount) && (d.amount as number) > 0).map(d => ({ date: d.date, amount: d.amount }));
    if (deps.length) g.deposits = deps;
  }
  return g;
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
export type Decoded = { status: 'vide'; data: AppData } | { status: 'ok'; data: AppData; /** éléments abîmés écartés à la lecture */ dropped: number } | { status: 'illisible'; data: AppData };

export function decodeState(raw: string | null): Decoded {
  if (raw === null || raw === '') return { status: 'vide', data: EMPTY };
  const r = parse(raw);
  return r ? { status: 'ok', data: r.data, dropped: r.dropped } : { status: 'illisible', data: EMPTY };
}

/** Lecture tolérante (tests, compatibilité) : une donnée illisible donne un état vide */
export const decode = (raw: string | null): AppData => decodeState(raw).data;

function parse(raw: string): { data: AppData; dropped: number } | null {
  // 50 000 dépenses font environ 6 Mo : tout ce que l'app peut écrire doit pouvoir être relu
  if (raw.length > 30_000_000) return null;
  try {
    const j: unknown = JSON.parse(raw);
    if (!isObj(j) || typeof j.v !== 'number' || j.v < 1 || j.v > STATE_VERSION) return null;
    const seen = new Set<string>();
    // même identifiant deux fois : on garde la première (sinon modifier ou supprimer toucherait les deux)
    const expenses = Array.isArray(j.expenses) ? j.expenses.slice(0, 50_000).map(expense).filter((e): e is Expense => e !== null && !seen.has(e.id) && (seen.add(e.id), true)) : [];
    const dismissed = Array.isArray(j.dismissed) ? j.dismissed.filter((k): k is string => typeof k === 'string' && k.length > 0 && k.length <= 64).slice(0, 200) : [];
    const accounts = Array.isArray(j.accounts) ? j.accounts.slice(0, 50).map(account).filter((a): a is Account => a !== null) : [];
    const goals = Array.isArray(j.goals) ? j.goals.slice(0, 30).map(goal).filter((g): g is Goal => g !== null) : [];
    const notes: Record<string, string> = Object.create(null);
    // les 60 mois les plus récents (et non les 60 premiers lus)
    if (isObj(j.notes)) for (const [k, v] of Object.entries(j.notes).filter(([k]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(k)).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 60)) if (typeof v === 'string' && v.length <= 280) notes[k] = cleanText(v, true);
    const pr = isObj(j.prefs) ? j.prefs : {};
    const prefs: Prefs = {
      theme: pr.theme === 'clair' || pr.theme === 'sombre' ? pr.theme : 'auto',
      lock: pr.lock === true, hideAmounts: pr.hideAmounts === true, alerts: pr.alerts === true,
    };
    if (isoDate(pr.lastBackup)) prefs.lastBackup = pr.lastBackup as string;
    const prof = j.profile == null ? null : profile(j.profile);
    const len = (x: unknown) => (Array.isArray(x) ? x.length : 0);
    const dropped = (len(j.expenses) - expenses.length) + (len(j.accounts) - accounts.length) + (len(j.goals) - goals.length)
      + (j.profile != null && !prof ? 1 : 0) + (prof && isObj(j.profile) ? len(j.profile.charges) - prof.charges.length : 0);
    return { data: { profile: prof, history: history(j.history), expenses, dismissed, accounts, goals, notes: { ...notes }, prefs }, dropped };
  } catch {
    return null;
  }
}

export const encode = (d: AppData): string => JSON.stringify({ v: STATE_VERSION, profile: d.profile, history: d.history, expenses: d.expenses, dismissed: d.dismissed, accounts: d.accounts, goals: d.goals, notes: d.notes, prefs: d.prefs });
