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

import { activityFor } from '../activity';
describe('recherche dans l’activité : les charges fixes aussi (bug signalé)', () => {
  const p = { income: 200000, extraIncome: 0, payday: 1, savePct: 0.1, charges: [
    { id: 'loyer', name: 'Loyer', group: 'logement' as const, amount: 70000, day: 5, freq: 'mois' as const },
    { id: 'net', name: 'Netflix', group: 'abos' as const, amount: 1399, day: 20, freq: 'mois' as const },
  ] };
  const expenses = [{ id: 'a', date: '2026-09-10', label: 'Courses', categoryId: 'courses', amount: 5000 }];
  const today = new Date(2026, 10, 14);
  const q = (query: string) => activityFor(p, expenses, today, { year: 2026, month: 10, query });
  test('par nom : chaque prélèvement passé, depuis la première dépense, jamais dans le futur', () => {
    const r = q('loyer');
    expect(r.days.map(d => d.date)).toEqual(['2026-11-05', '2026-10-05', '2026-09-05']);
    expect(r.fixed).toBe(210000);
    expect(q('netflix').days.map(d => d.date)).toEqual(['2026-10-20', '2026-09-20']);
  });
  test('par groupe (« abonnements ») ou par « charge fixe »', () => {
    expect(q('abonnements').count).toBe(2);
    expect(q('charge fixe').count).toBe(5);
  });
  test('les dépenses restent trouvées, sans doublon', () => {
    expect(q('courses').count).toBe(1);
  });
  test('montant d’époque : un loyer augmenté en novembre garde l’ancien montant en octobre', () => {
    const old = { ...p, charges: [{ ...p.charges[0], amount: 65000 }, p.charges[1]] };
    const r = activityFor(p, expenses, today, { year: 2026, month: 10, query: 'loyer', profileAt: (y, m) => (y * 12 + m < 2026 * 12 + 10 ? old : p) });
    expect(r.days.map(d => d.total)).toEqual([70000, 65000, 65000]);
  });
});
