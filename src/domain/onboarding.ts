/**
 * Logique de l'accueil : catalogue des charges fixes, brouillon des réponses, construction du profil.
 * Pas de logos de marques dans la vraie app tant que les marques ne l'ont pas autorisé.
 */
import { daysInMonth, monthlyAmount } from './charges';
import type { Cents } from './money';
import type { ChargeGroup, FixedCharge, Frequency, Profile } from './types';

export interface CatalogItem { id: string; name: string; group: ChargeGroup }

export const CATALOG: CatalogItem[] = [
  ['loyer', 'Loyer', 'logement'], ['credit', 'Crédit immobilier', 'logement'], ['copro', 'Charges de copropriété', 'logement'],
  ['edf', 'EDF', 'energie'], ['engie', 'Engie', 'energie'], ['total', 'TotalEnergies', 'energie'], ['ekwateur', 'ekWateur', 'energie'], ['eau', 'Eau', 'energie'],
  ['free', 'Free', 'internet'], ['orange', 'Orange', 'internet'], ['sfr', 'SFR', 'internet'], ['bouygues', 'Bouygues Telecom', 'internet'], ['sosh', 'Sosh', 'internet'], ['red', 'RED by SFR', 'internet'],
  ['habitation', 'Assurance habitation', 'assurance'], ['auto', 'Assurance auto', 'assurance'],
  ['mutuelle', 'Mutuelle santé', 'sante'],
  ['transports', 'Pass transports', 'transports'], ['navigo', 'Navigo', 'transports'],
  ['netflix', 'Netflix', 'abos'], ['spotify', 'Spotify', 'abos'], ['disney', 'Disney+', 'abos'], ['prime', 'Prime Video', 'abos'], ['canal', 'Canal+', 'abos'], ['deezer', 'Deezer', 'abos'], ['youtube', 'YouTube Premium', 'abos'], ['icloud', 'iCloud+', 'abos'],
  ['salle', 'Salle de sport', 'sport'],
].map(([id, name, group]) => ({ id, name, group: group as ChargeGroup }));

export const PAYDAYS: [number, string][] = [[1, 'le 1er'], [5, 'le 5'], [10, 'le 10'], [25, 'le 25'], [28, 'le 28'], [31, 'fin de mois']];
export const SAVE_STEPS = [0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4];

/** Une charge en cours de saisie : montant pas encore renseigné possible */
export interface DraftCharge { id: string; name: string; group: ChargeGroup; amount: Cents | null; day: number; freq: Frequency; custom?: boolean }
export interface Draft { income: Cents | null; payday: number; savePct: number; charges: DraftCharge[] }

export const emptyDraft = (): Draft => ({ income: null, payday: 1, savePct: 0.2, charges: [] });

/** Nettoie un nom saisi : pas de caractères de contrôle ni de chevrons, 40 caractères au plus */
export const cleanName = (s: string): string =>
  s.replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trimStart().slice(0, 40);

export const searchCatalog = (q: string, group: ChargeGroup | null): CatalogItem[] => {
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const n = norm(q.trim());
  return CATALOG.filter(i => (!group || i.group === group) && (!n || norm(i.name).includes(n)));
};

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Transforme une charge du brouillon en charge fixe ; `today` fixe l'ancre des charges à 4 semaines et le mois des charges annuelles */
export function toFixedCharge(d: DraftCharge, today: Date): FixedCharge | null {
  if (d.amount === null || d.amount <= 0) return null;
  const y = today.getFullYear(), m = today.getMonth();
  const c: FixedCharge = { id: d.id, name: cleanName(d.name).trim() || 'Charge', group: d.group, amount: d.amount, day: Math.min(31, Math.max(1, d.day)), freq: d.freq };
  if (d.freq === '4sem') c.anchor = iso(y, m, Math.min(c.day, daysInMonth(y, m)));
  if (d.freq === 'an') c.month = m;
  return c;
}

export function buildProfile(d: Draft, today: Date): Profile {
  return {
    income: d.income ?? 0,
    extraIncome: 0,
    payday: d.payday,
    savePct: Math.min(0.4, Math.max(0, d.savePct)),
    charges: d.charges.map(c => toFixedCharge(c, today)).filter((c): c is FixedCharge => c !== null),
  };
}

/** Récapitulatif : revenus, épargne, charges fixes (équivalent mensuel), reste à vivre, montant par jour */
export function summary(d: Draft, today: Date) {
  const p = buildProfile(d, today);
  const saving = Math.round(p.income * p.savePct);
  const fixed = p.charges.reduce((a, c) => a + monthlyAmount(c), 0);
  const free = p.income - saving - fixed;
  return { income: p.income, saving, fixed, free, perDay: Math.round(Math.max(0, free) / 30) };
}

/** Reprend un profil existant dans le brouillon (pour modifier ses réponses) */
export function draftFromProfile(p: Profile): Draft {
  return {
    income: p.income, payday: p.payday, savePct: p.savePct,
    charges: p.charges.map(c => ({ id: c.id, name: c.name, group: c.group, amount: c.amount, day: c.day, freq: c.freq, custom: !CATALOG.some(i => i.id === c.id) })),
  };
}
