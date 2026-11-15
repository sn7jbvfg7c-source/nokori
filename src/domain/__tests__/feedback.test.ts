import { parseBalance } from '../accounts';
import { addDeposit, parseDayFr, type Goal } from '../goals';
import { parseEuros, toInputText } from '../money';

describe('montant pré-rempli dans un champ (bug : « 2 000,00 € » refusé à la modification)', () => {
  test('sans symbole €, avec des espaces normaux, relisible tel quel', () => {
    expect(toInputText(200000)).toBe('2 000,00');
    expect(toInputText(48000)).toBe('480,00');
    expect(toInputText(1234567)).toBe('12 345,67');
    expect(toInputText(-12000)).toBe('-120,00');
    expect(toInputText(200000)).not.toMatch(/€| /);
  });
  test('aller-retour : pré-rempli puis relu sans rien toucher donne le même montant', () => {
    for (const c of [0, 5, 99, 100, 48000, 200000, 9_999_999]) expect(parseEuros(toInputText(c))).toBe(c);
    for (const c of [-12000, 0, 96433, 645000, 1_000_000_000]) expect(parseBalance(toInputText(c))).toBe(c);
  });
});

describe('date d’un versement', () => {
  const today = new Date(2026, 10, 15);
  test('JJ/MM/AAAA et variantes', () => {
    expect(parseDayFr('03/09/2026', today)).toBe('2026-09-03');
    expect(parseDayFr('3/9/26', today)).toBe('2026-09-03');
    expect(parseDayFr('15.11.2026', today)).toBe('2026-11-15');
    expect(parseDayFr('29/02/2024', today)).toBe('2024-02-29');
  });
  test('refusée : futur, impossible, trop ancienne, illisible', () => {
    expect(parseDayFr('16/11/2026', today)).toBeNull();
    expect(parseDayFr('31/02/2026', today)).toBeNull();
    expect(parseDayFr('29/02/2026', today)).toBeNull();
    expect(parseDayFr('01/01/1999', today)).toBeNull();
    expect(parseDayFr('hier', today)).toBeNull();
  });
  test('un versement ancien se range à sa date, le total augmente', () => {
    const g: Goal = { id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 20000, monthly: 0, deposits: [{ date: '2026-11-10', amount: 20000 }] };
    const g2 = addDeposit(g, 50000, '2026-06-01');
    expect(g2.saved).toBe(70000);
    expect(g2.deposits!.map(d => d.date)).toEqual(['2026-11-10', '2026-06-01']);
    expect(addDeposit(g2, 1000, '2026-11-15').deposits![0].date).toBe('2026-11-15');
  });
});
