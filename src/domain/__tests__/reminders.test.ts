import { decode, encode, EMPTY } from '../../data/persist';
import { MAX_REMINDERS, reminders } from '../reminders';
import type { Profile } from '../types';

const now = new Date(2026, 10, 14, 10, 0, 0);
const p: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [
  { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 16, freq: 'mois' },
  { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
] };

describe('rappels', () => {
  test('3 jours avant, à 9 h, dans l’ordre', () => {
    const r = reminders(p, now);
    expect(r[0].date).toEqual(new Date(2026, 10, 13, 9, 0, 0) > now ? new Date(2026, 10, 13, 9) : new Date(2026, 11, 2, 9));
    expect(r.map(x => x.id).slice(0, 3)).toEqual(['loyer-2026-12-5', 'netflix-2026-12-16', 'loyer-2027-1-5']);
  });
  test('rappel déjà passé ignoré (Netflix le 16 : rappel le 13 à 9 h, déjà passé le 14)', () => {
    expect(reminders(p, now).some(x => x.id === 'netflix-2026-11-16')).toBe(false);
  });
  test('aucun montant dans le texte (écran verrouillé)', () => {
    for (const r of reminders(p, now)) { expect(r.body).not.toMatch(/\d+,\d\d|€/); expect(r.title).not.toMatch(/€/); }
    expect(reminders(p, now)[0].body).toBe('Loyer sera prélevé le 5 décembre. Déjà compté dans votre budget.');
  });
  test('au plus 60 rappels programmés', () => {
    const many: Profile = { ...p, charges: Array.from({ length: 40 }, (_, i) => ({ id: 'c' + i, name: 'C' + i, group: 'abos' as const, amount: 100, day: (i % 28) + 1, freq: 'mois' as const })) };
    expect(reminders(many, now)).toHaveLength(MAX_REMINDERS);
  });
  test('préférences relues et validées', () => {
    const d = decode(encode({ ...EMPTY, prefs: { theme: 'sombre', lock: true, hideAmounts: true, alerts: true } }));
    expect(d.prefs).toEqual({ theme: 'sombre', lock: true, hideAmounts: true, alerts: true });
    expect(decode(JSON.stringify({ v: 1, prefs: { theme: 'fluo', lock: 'oui', alerts: 1 } })).prefs).toEqual(EMPTY.prefs);
  });
});
