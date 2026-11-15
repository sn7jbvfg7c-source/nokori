import { decode, DEFAULT_PREFS as EMPTY_PREFS, encode } from '../../data/persist';
import { cleanNote, monthKey, review } from '../review';
import type { Expense, Profile } from '../types';

const nov14 = new Date(2026, 10, 14);
const p: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] };
const e = (id: string, date: string, categoryId: string, amount: number): Expense => ({ id, date, label: id, categoryId, amount });
const oct = [e('a', '2026-10-03', 'courses', 30000), e('b', '2026-10-12', 'restos', 12000), e('c', '2026-10-20', 'culture', 5000)];

describe('bilan', () => {
  test('octobre clos : tout le mois compté, le non-dépensé rejoint l’épargne', () => {
    const r = review(p, oct, 2026, 9, nov14);
    expect(r.closed).toBe(true);
    expect(r.spent).toBe(78000 + 30000 + 12000 + 5000);
    expect(r.saving).toBe(49600);
    // budget = revenu − épargne (à quelques centimes d'arrondi près) ; non dépensé = budget − dépensé
    expect(Math.abs(r.left - (248000 - 49600 - 125000))).toBeLessThanOrEqual(7);
    expect(r.savedTotal).toBe(49600 + r.left);
    expect(r.savedPct).toBeCloseTo(r.savedTotal / 248000, 5);
  });
  test('le pilier qui a le plus pesé : Besoins (loyer + courses)', () => {
    expect(review(p, oct, 2026, 9, nov14).top?.id).toBe('besoins');
  });
  test('mois en cours : pas encore de « non dépensé » ajouté à l’épargne', () => {
    const r = review(p, oct, 2026, 10, nov14);
    expect(r.closed).toBe(false);
    expect(r.savedTotal).toBe(49600);
  });
  test('mois dépassé : épargne prévue seulement, dépassement visible', () => {
    const r = review(p, [e('x', '2026-10-02', 'shopping', 150000)], 2026, 9, nov14);
    expect(r.left).toBeLessThan(0);
    expect(r.savedTotal).toBe(49600);
  });
  test('clé de mois', () => expect(monthKey(2026, 9)).toBe('2026-10'));
  test('note nettoyée, 280 caractères au plus', () => {
    expect(cleanNote('<script>x</script>moins de livraisons')).toBe('scriptx/scriptmoins de livraisons');
    expect(cleanNote('a'.repeat(400))).toHaveLength(280);
    expect(cleanNote('ligne 1\nligne 2')).toBe('ligne 1\nligne 2');
  });
  test('relecture des notes : clés et longueurs validées', () => {
    const d = decode(encode({ profile: null, expenses: [], dismissed: [], accounts: [], goals: [], notes: { '2026-10': 'Moins de livraisons' }, prefs: EMPTY_PREFS }));
    expect(d.notes).toEqual({ '2026-10': 'Moins de livraisons' });
    const bad = JSON.stringify({ v: 1, notes: { '2026-10': 'ok', hack: 'x', '2026-11': 'a'.repeat(500), __proto__: { polluted: 1 }, '2026-12': 42 } });
    expect(decode(bad).notes).toEqual({ '2026-10': 'ok' });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
