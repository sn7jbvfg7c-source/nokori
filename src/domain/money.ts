/**
 * Argent : tous les montants sont des centimes entiers.
 * Jamais de nombre à virgule pour un montant : 0,1 + 0,2 ne fait pas 0,3 en virgule flottante.
 */
export type Cents = number;

/** Espace insécable : la police Geist n'a pas l'espace fine U+202F, elle s'afficherait collée. */
export const NBSP = '\u00a0';

/** Convertit une saisie (« 12,5 », « 1 234,56 », « 12.50 ») en centimes, ou null si invalide. */
export function parseEuros(input: string, max: Cents = 10_000_000): Cents | null {
  const s = String(input).trim().replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d{1,7}(\.\d{0,2})?$/.test(s)) return null;
  const [int, dec = ''] = s.split('.');
  const cents = Number(int) * 100 + Number((dec + '00').slice(0, 2));
  return cents > max ? null : cents;
}

function group(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

/** 123456 → « 1 234,56 € » */
export function formatEuros(c: Cents): string {
  const neg = c < 0, a = Math.abs(Math.round(c));
  return `${neg ? '−' : ''}${group(Math.floor(a / 100))},${String(a % 100).padStart(2, '0')}${NBSP}€`;
}

/** 123456 → « 1 235 € » (arrondi à l'euro, pour les grands chiffres) */
export function formatEurosRound(c: Cents): string {
  const neg = c < 0, a = Math.round(Math.abs(c) / 100);
  return `${neg ? '−' : ''}${group(a)}${NBSP}€`;
}

/**
 * Montant pré-rempli dans un champ de saisie : « 2 000,00 » (espaces normaux, sans symbole €),
 * relisible tel quel par parseEuros / parseBalance. Négatif : « -120,00 ».
 */
export function toInputText(c: Cents): string {
  return formatEuros(c).replace(/[\s ]*€$/, '').replace(/ /g, ' ').replace('−', '-');
}
