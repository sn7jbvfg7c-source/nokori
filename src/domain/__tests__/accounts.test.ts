import { decode, encode } from '../../data/persist';
import { parseBalance, totals, upsertAccount, type Account } from '../accounts';

const cc: Account = { id: 'a', name: 'Compte courant', kind: 'courant', balance: 96433, updated: '2026-11-14' };
const la: Account = { id: 'b', name: 'Livret A', kind: 'livret', balance: 645000, updated: '2026-11-01' };

describe('comptes', () => {
  test('solde : positif, négatif (découvert), formats français', () => {
    expect(parseBalance('964,33')).toBe(96433);
    expect(parseBalance('-120')).toBe(-12000);
    expect(parseBalance('−1 250,5')).toBe(-125050);
    expect(parseBalance('6 450')).toBe(645000);
  });
  test('solde invalide refusé', () => {
    for (const bad of ['', '-', 'abc', '1,234', '--5', '1e5', '<b>', '9999999999']) expect(parseBalance(bad)).toBeNull();
  });
  test('totaux par type, types vides masqués', () => {
    const t = totals([cc, la, { ...cc, id: 'c', name: 'Joint', balance: -5000 }]);
    expect(t.total).toBe(96433 + 645000 - 5000);
    expect(t.byKind.map(k => [k.id, k.total])).toEqual([['courant', 91433], ['livret', 645000]]);
  });
  test('ajout puis modification du même compte', () => {
    let l = upsertAccount([], cc);
    l = upsertAccount(l, { ...cc, balance: 1000 });
    expect(l).toEqual([{ ...cc, balance: 1000 }]);
  });
  test('50 comptes au plus', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ ...cc, id: String(i) }));
    expect(upsertAccount(many, { ...cc, id: 'x' })).toHaveLength(50);
  });
  test('relecture : comptes valides gardés, comptes abîmés écartés', () => {
    const raw = encode({ profile: null, expenses: [], dismissed: [], accounts: [cc, la] });
    expect(decode(raw).accounts).toEqual([cc, la]);
    const bad = JSON.stringify({ v: 1, profile: null, expenses: [], dismissed: [], accounts: [cc, { id: 'z', name: '', kind: 'crypto', balance: 1e15, updated: 'hier' }, 'texte'] });
    expect(decode(bad).accounts).toEqual([cc]);
  });
});
