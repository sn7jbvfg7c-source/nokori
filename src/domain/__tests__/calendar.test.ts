import { calendarMonth } from '../calendar';
import type { Profile } from '../types';

const p: Profile = {
  income: 248000, extraIncome: 0, payday: 1, savePct: 0.2,
  charges: [
    { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 10, freq: 'mois' },
    { id: 'salle', name: 'Salle de sport', group: 'sport', amount: 2999, day: 12, freq: '4sem', anchor: '2026-11-12' },
    { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 31, freq: 'mois' },
  ],
};
const nov14 = new Date(2026, 10, 14);
const ex = [
  { id: 'a', date: '2026-11-13', label: 'Café', categoryId: 'restos', amount: 480 },
  { id: 'b', date: '2026-11-20', label: 'Futur', categoryId: 'restos', amount: 999 },
  { id: 'c', date: '2026-10-05', label: 'Octobre', categoryId: 'courses', amount: 3000 },
];

describe('calendrier', () => {
  test('novembre en cours : 1er = dimanche, charges et dépenses du mois', () => {
    const m = calendarMonth(p, ex, 2026, 10, nov14);
    expect(m.status).toBe('en cours');
    expect(m.firstDow).toBe(6);
    expect(m.days[9].charges.map(c => c.name)).toEqual(['Netflix']);
    expect(m.days[12].spent).toBe(480);
    expect(m.days[19].expenses).toEqual([]);
    expect(m.variable).toBe(480);
    expect(m.days[0].income).toBe(248000);
    expect(m.days[13].future).toBe(false);
    expect(m.days[14].future).toBe(true);
  });
  test('décembre prévu : Netflix le 10 et la salle à 4 semaines le 10', () => {
    const m = calendarMonth(p, ex, 2026, 11, nov14);
    expect(m.status).toBe('prévu');
    expect(m.days[9].charges.map(c => c.name).sort()).toEqual(['Netflix', 'Salle de sport']);
    expect(m.fixed).toBe(1499 + 2999 + 78000);
    expect(m.free).toBe(248000 - 49600 - (1499 + 2999 + 78000));
    expect(m.variable).toBe(0);
  });
  test('février : le loyer du 31 tombe le 28', () => {
    const m = calendarMonth(p, [], 2027, 1, nov14);
    expect(m.days[27].charges.map(c => c.name)).toContain('Loyer');
  });
  test('octobre clos : les dépenses d’octobre seulement', () => {
    const m = calendarMonth(p, ex, 2026, 9, nov14);
    expect(m.status).toBe('clos');
    expect(m.variable).toBe(3000);
    expect(m.days.every(d => !d.future)).toBe(true);
  });
  test('paie le 31 placée au dernier jour des mois courts', () => {
    const m = calendarMonth({ ...p, payday: 31 }, [], 2026, 10, nov14);
    expect(m.days[29].income).toBe(248000);
  });
});
