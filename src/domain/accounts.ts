/**
 * Comptes saisis à la main : Nokori ne se connecte à aucune banque dans cette version.
 * Le solde peut être négatif (découvert) ; il est mis à jour par l'utilisateur quand il le souhaite.
 */
import type { Cents } from './money';

export type AccountKind = 'courant' | 'livret' | 'placement' | 'especes';
export interface Account { id: string; name: string; kind: AccountKind; balance: Cents; /** date ISO de la dernière mise à jour */ updated: string }

export const ACCOUNT_KINDS: { id: AccountKind; name: string; plural: string }[] = [
  { id: 'courant', name: 'Compte courant', plural: 'Comptes courants' },
  { id: 'livret', name: 'Livret', plural: 'Livrets' },
  { id: 'placement', name: 'Placement', plural: 'Placements' },
  { id: 'especes', name: 'Espèces', plural: 'Espèces' },
];

/** 100 millions d'euros : borne haute d'un solde, en centimes */
export const MAX_BALANCE: Cents = 10_000_000_000;

/** Solde saisi : « 964,33 », « -120 », « −1 250,5 » ; null si invalide */
export function parseBalance(input: string): Cents | null {
  const s = String(input).trim().replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.');
  if (!/^-?\d{1,9}(\.\d{0,2})?$/.test(s)) return null;
  const neg = s.startsWith('-'), [int, dec = ''] = s.replace('-', '').split('.');
  const c = Number(int) * 100 + Number((dec + '00').slice(0, 2));
  if (c > MAX_BALANCE) return null;
  return neg ? -c : c;
}

export function totals(accounts: Account[]) {
  const byKind = ACCOUNT_KINDS.map(k => ({ ...k, accounts: accounts.filter(a => a.kind === k.id), total: accounts.filter(a => a.kind === k.id).reduce((s, a) => s + a.balance, 0) }));
  return { total: accounts.reduce((s, a) => s + a.balance, 0), byKind: byKind.filter(k => k.accounts.length > 0) };
}

/** Ajoute ou remplace un compte (même identifiant) ; 50 comptes au plus */
export function upsertAccount(list: Account[], a: Account): Account[] {
  const i = list.findIndex(x => x.id === a.id);
  if (i >= 0) return list.map(x => (x.id === a.id ? a : x));
  return list.length >= 50 ? list : [...list, a];
}
