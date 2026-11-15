import { buildMonth } from '../budget';
import { chargeDays, daysInMonth, monthlyAmount } from '../charges';
import { formatEuros, formatEurosRound, parseEuros } from '../money';
import type { FixedCharge, Profile } from '../types';

const netflix: FixedCharge = { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 10, freq: 'mois' };
const basicfit: FixedCharge = { id: 'basicfit', name: 'Basic-Fit', group: 'sport', amount: 2999, day: 12, freq: '4sem', anchor: '2026-11-12' };
const loyer: FixedCharge = { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 31, freq: 'mois' };
const assurance: FixedCharge = { id: 'auto', name: 'Assurance auto', group: 'assurance', amount: 42000, day: 15, freq: 'an', month: 2 };

describe('argent', () => {
  test('saisies valides converties en centimes', () => {
    expect(parseEuros('12')).toBe(1200);
    expect(parseEuros('12,5')).toBe(1250);
    expect(parseEuros('1 234,56')).toBe(123456);
    expect(parseEuros('0,1')).toBe(10);
  });
  test('saisies invalides refusées', () => {
    for (const bad of ['', '-5', 'abc', '12,345', '1e9', '12,3,4', '<img>', '99999999']) expect(parseEuros(bad)).toBeNull();
  });
  test('plafond de 100 000 €', () => {
    expect(parseEuros('100000')).toBe(10_000_000);
    expect(parseEuros('100000,01')).toBeNull();
  });
  test('format français, espaces insécables', () => {
    expect(formatEuros(123456)).toBe('1\u00a0234,56\u00a0€');
    expect(formatEuros(-1499)).toBe('−14,99\u00a0€');
    expect(formatEurosRound(65049)).toBe('650\u00a0€');
    expect(formatEurosRound(100349)).toBe('1\u00a0003\u00a0€');
  });
  test('aucune erreur de virgule flottante : 0,10 + 0,20 = 0,30', () => {
    expect((parseEuros('0,1') ?? 0) + (parseEuros('0,2') ?? 0)).toBe(30);
  });
});

describe('charges fixes', () => {
  test('Netflix le 10 novembre revient le 10 décembre', () => {
    expect(chargeDays(netflix, 2026, 10)).toEqual([10]);
    expect(chargeDays(netflix, 2026, 11)).toEqual([10]);
  });
  test('Basic-Fit toutes les 4 semaines : 12 nov., 10 déc., 7 janv.', () => {
    expect(chargeDays(basicfit, 2026, 10)).toEqual([12]);
    expect(chargeDays(basicfit, 2026, 11)).toEqual([10]);
    expect(chargeDays(basicfit, 2027, 0)).toEqual([7]);
    expect(chargeDays(basicfit, 2026, 9)).toEqual([15]);
  });
  test('un mois peut avoir deux échéances à 4 semaines', () => {
    const c = { ...basicfit, anchor: '2027-03-01' };
    expect(chargeDays(c, 2027, 2)).toEqual([1, 29]);
  });
  test('le 31 devient le dernier jour des mois courts', () => {
    expect(chargeDays(loyer, 2027, 1)).toEqual([28]);
    expect(chargeDays(loyer, 2028, 1)).toEqual([29]);
    expect(chargeDays(loyer, 2026, 3)).toEqual([30]);
  });
  test('une charge annuelle ne tombe que son mois', () => {
    expect(chargeDays(assurance, 2027, 2)).toEqual([15]);
    expect(chargeDays(assurance, 2027, 3)).toEqual([]);
  });
  test('passage à l’heure d’hiver sans décalage (25 oct. 2026)', () => {
    const c = { ...basicfit, anchor: '2026-10-20' };
    expect(chargeDays(c, 2026, 10)).toEqual([17]);
  });
  test('équivalent mensuel', () => {
    expect(monthlyAmount(netflix)).toBe(1499);
    expect(monthlyAmount(basicfit)).toBe(3249);
    expect(monthlyAmount(assurance)).toBe(3500);
  });
  test('jours par mois', () => {
    expect(daysInMonth(2026, 10)).toBe(30);
    expect(daysInMonth(2028, 1)).toBe(29);
  });
});

describe('budget du mois', () => {
  const profile: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [netflix, basicfit, { ...loyer, day: 5 }] };
  const nov14 = new Date(2026, 10, 14);

  test('l’épargne est retirée en premier', () => {
    const s = buildMonth(profile, [], nov14);
    expect(s.saving).toBe(49600);
  });
  test('le budget du mois vaut revenu − épargne, une fois les charges mises à l’échelle', () => {
    const s = buildMonth(profile, [], nov14);
    const fixedThisMonth = 1499 + 2999 + 78000;
    // budget = charges de ce mois + reste à vivre réparti (à un centime près par catégorie)
    expect(Math.abs(s.budget - (fixedThisMonth + (248000 - 49600 - s.fixedMonthly)))).toBeLessThanOrEqual(7);
  });
  test('charges passées comptées comme dépensées, futures comme à venir', () => {
    const s = buildMonth(profile, [], new Date(2026, 10, 11));
    expect(s.upcoming).toBe(2999);
    expect(s.spent).toBe(1499 + 78000);
  });
  test('une dépense du mois réduit son pilier ; une autre du mois suivant est ignorée', () => {
    const base = buildMonth(profile, [], nov14);
    const s = buildMonth(profile, [
      { id: 'a', date: '2026-11-13', label: 'Café', categoryId: 'restos', amount: 480 },
      { id: 'b', date: '2026-12-02', label: 'Plus tard', categoryId: 'restos', amount: 9999 },
      { id: 'c', date: '2026-11-20', label: 'Futur', categoryId: 'restos', amount: 5000 },
    ], nov14);
    const env = (x: typeof s) => x.pillars.find(p => p.id === 'envies')!;
    expect(env(base).left - env(s).left).toBe(480);
  });
  test('catégorie inconnue ignorée (aucun plantage)', () => {
    const s = buildMonth(profile, [{ id: 'x', date: '2026-11-10', label: 'x', categoryId: 'inconnue', amount: 100 }], nov14);
    expect(s.spent).toBe(buildMonth(profile, [], nov14).spent);
  });
  test('montant par jour = ce qui reste après les charges à venir, sur les jours restants', () => {
    const s = buildMonth(profile, [], nov14);
    expect(s.daysLeft).toBe(17);
    expect(s.perDay).toBe(Math.round(s.free / 17));
  });
  test('projection : au rythme actuel il manquera de l’argent si on dépense trop', () => {
    const big = Array.from({ length: 14 }, (_, i) => ({ id: String(i), date: `2026-11-${String(i + 1).padStart(2, '0')}`, label: 'x', categoryId: 'courses', amount: 9000 }));
    expect(buildMonth(profile, big, nov14).endOfMonth).toBeLessThan(0);
  });
  test('part d’épargne bornée entre 0 et 40 %', () => {
    expect(buildMonth({ ...profile, savePct: 2 }, [], nov14).saving).toBe(99200);
    expect(buildMonth({ ...profile, savePct: -1 }, [], nov14).saving).toBe(0);
  });
});
