/**
 * Pavé numérique de saisie d'un montant : le texte affiché reste toujours un montant valide
 * (au plus 2 décimales, au plus 100 000 €), quoi que l'on tape.
 */
import type { Cents } from './money';

export type Key = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | ',' | '⌫';
export const KEYS: Key[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', ',', '0', '⌫'];
const MAX: Cents = 10_000_000;

export function press(current: string, key: Key): string {
  if (key === '⌫') return current.length > 1 ? current.slice(0, -1) : '0';
  if (key === ',') return current.includes(',') ? current : current + ',';
  const [int, dec] = current.split(',');
  if (dec !== undefined && dec.length >= 2) return current;
  const next = current === '0' ? key : current + key;
  return toCents(next) > MAX || (dec === undefined && int.length >= 6 && current !== '0') ? current : next;
}

export function toCents(s: string): Cents {
  const [int, dec = ''] = s.split(',');
  return Number(int || '0') * 100 + Number((dec + '00').slice(0, 2));
}
