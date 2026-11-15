import { activity, dayTitle } from '../activity';
import type { Profile } from '../types';

const nov14 = new Date(2026, 10, 14);
const p: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [
  { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
  { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 20, freq: 'mois' },
] };
const ex = [
  { id: 'a', date: '2026-11-14', label: 'Café', categoryId: 'restos', amount: 480 },
  { id: 'b', date: '2026-11-13', label: 'Pathé', categoryId: 'culture', amount: 2200 },
  { id: 'c', date: '2026-11-30', label: 'Futur', categoryId: 'restos', amount: 999 },
  { id: 'd', date: '2026-08-01', label: 'Vieux', categoryId: 'restos', amount: 100 },
];

describe('activité', () => {
  test('titres de jours', () => {
    expect(dayTitle('2026-11-14', nov14)).toBe('Aujourd’hui');
    expect(dayTitle('2026-11-13', nov14)).toBe('Hier');
    expect(dayTitle('2026-11-12', nov14)).toBe('jeu. 12 nov.');
    expect(dayTitle('2026-10-31', nov14)).toBe('sam. 31 oct.');
  });
  test('du plus récent au plus ancien, futur et trop ancien exclus', () => {
    const days = activity(p, ex, nov14);
    expect(days[0].title).toBe('Aujourd’hui');
    expect(days.map(d => d.date)).toEqual(['2026-11-14', '2026-11-13', '2026-11-05', '2026-10-20', '2026-10-05']);
  });
  test('charges passées incluses (mois dernier compris), charges à venir exclues', () => {
    const labels = activity(p, ex, nov14).flatMap(d => d.items.map(i => `${i.date} ${i.label}`));
    expect(labels).toContain('2026-11-05 Loyer');
    expect(labels).toContain('2026-10-20 Netflix');
    expect(labels).not.toContain('2026-11-20 Netflix');
  });
  test('filtre par pilier', () => {
    const env = activity(p, ex, nov14, 'envies');
    expect(env.flatMap(d => d.items.map(i => i.label))).toEqual(['Café', 'Netflix']);
  });
  test('total du jour', () => {
    expect(activity(p, ex, nov14)[0].total).toBe(480);
  });
});
