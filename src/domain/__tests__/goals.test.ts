import { decode, DEFAULT_PREFS as EMPTY_PREFS, encode } from '../../data/persist';
import { eta, monthSurplus, progress, streakUnderDailyBudget, weekWithoutWants, type Goal } from '../goals';
import type { Expense, Profile } from '../types';

const nov14 = new Date(2026, 10, 14); // samedi
const p: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] };
const e = (id: string, date: string, categoryId: string, amount: number): Expense => ({ id, date, label: id, categoryId, amount });
const japon: Goal = { id: 'g1', name: 'Voyage au Japon', type: 'voyage', target: 300000, saved: 145000, monthly: 15000 };

describe('objectifs', () => {
  test('date d’arrivée : 1 550 € à 150 € par mois = 11 mois, octobre 2027', () => {
    expect(eta(japon.target, japon.saved, japon.monthly, nov14)).toEqual({ reached: false, months: 11, label: 'octobre 2027' });
  });
  test('objectif atteint', () => expect(eta(1000, 1000, 0, nov14).reached).toBe(true));
  test('sans versement mensuel : pas de date', () => expect(eta(1000, 0, 0, nov14)).toEqual({ reached: false, months: null, label: null }));
  test('trop lointain (plus de 50 ans) : pas de date', () => expect(eta(10_000_000, 0, 100, nov14).label).toBeNull());
  test('progression bornée à 100 %', () => {
    expect(progress(japon)).toBeCloseTo(0.4833, 3);
    expect(progress({ ...japon, saved: 999999 })).toBe(1);
  });
  test('le reste du mois baisse quand on dépense', () => {
    const before = monthSurplus(p, [], nov14);
    const after = monthSurplus(p, [e('x', '2026-11-14', 'shopping', 20000)], nov14);
    expect(after).toBeLessThan(before);
    expect(monthSurplus(p, Array.from({ length: 14 }, (_, i) => e(String(i), `2026-11-${String(i + 1).padStart(2, '0')}`, 'courses', 30000)), nov14)).toBe(0);
  });
  test('relecture : objectifs valides gardés, abîmés écartés', () => {
    expect(decode(encode({ profile: null, expenses: [], dismissed: [], accounts: [], goals: [japon], notes: {}, prefs: EMPTY_PREFS })).goals).toEqual([japon]);
    const bad = JSON.stringify({ v: 1, goals: [japon, { id: 'x', name: 'x', type: 'fusée', target: -1, saved: 0, monthly: 0 }, null] });
    expect(decode(bad).goals).toEqual([japon]);
  });
});

describe('défis', () => {
  test('semaine sans envies : lundi 9 au dimanche 15, une envie mercredi', () => {
    const w = weekWithoutWants([e('a', '2026-11-11', 'restos', 1800), e('b', '2026-11-12', 'courses', 4000)], nov14);
    expect(w).toEqual([true, true, false, true, true, true, null]);
  });
  test('série sous le budget du jour', () => {
    const { days, perDay } = streakUnderDailyBudget(p, [e('a', '2026-11-14', 'courses', 500), e('b', '2026-11-12', 'courses', 20000)], nov14);
    expect(perDay).toBeGreaterThan(500);
    expect(days).toBe(2); // 14 et 13 ; le 12 dépasse
  });
  test('la série s’arrête au début du mois', () => {
    expect(streakUnderDailyBudget(p, [], new Date(2026, 10, 3)).days).toBe(3);
  });
});
