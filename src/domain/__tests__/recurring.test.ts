import { chargeFromSuggestion, detectRecurring, labelKey } from '../recurring';
import type { Expense, FixedCharge } from '../types';

const nov14 = new Date(2026, 10, 14);
const e = (id: string, date: string, label: string, amount: number, categoryId = 'loisirs'): Expense => ({ id, date, label, amount, categoryId });
const netflix: FixedCharge = { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 10, freq: 'mois' };

describe('dépenses régulières', () => {
  test('clé de libellé : casse, accents, chiffres', () => {
    expect(labelKey('Disney+ 11/2026')).toBe(labelKey('disney+'));
    expect(labelKey('Crèche Les Lutins')).toBe('creche les lutins');
  });
  test('Disney+ deux mois de suite : proposé', () => {
    const s = detectRecurring([e('1', '2026-10-13', 'Disney+', 1099), e('2', '2026-11-13', 'Disney+', 1099)], [], nov14, []);
    expect(s).toEqual([{ key: 'disney+', label: 'Disney+', amount: 1099, day: 13, months: 2, categoryId: 'loisirs' }]);
  });
  test('une seule fois, ou deux fois le même mois : rien', () => {
    expect(detectRecurring([e('1', '2026-11-02', 'Boulangerie', 400), e('2', '2026-11-09', 'Boulangerie', 400)], [], nov14, [])).toEqual([]);
  });
  test('montants trop différents : rien (courses variables)', () => {
    expect(detectRecurring([e('1', '2026-10-05', 'Carrefour', 4455, 'courses'), e('2', '2026-11-05', 'Carrefour', 9020, 'courses')], [], nov14, [])).toEqual([]);
  });
  test('déjà une charge fixe : rien', () => {
    expect(detectRecurring([e('1', '2026-10-10', 'Netflix', 1499), e('2', '2026-11-10', 'NETFLIX', 1499)], [netflix], nov14, [])).toEqual([]);
  });
  test('ignorée une fois : plus proposée', () => {
    expect(detectRecurring([e('1', '2026-10-13', 'Disney+', 1099), e('2', '2026-11-13', 'Disney+', 1099)], [], nov14, ['disney+'])).toEqual([]);
  });
  test('trop ancien (plus de 2 mois) ou dans le futur : ignoré', () => {
    expect(detectRecurring([e('1', '2026-07-13', 'Disney+', 1099), e('2', '2026-08-13', 'Disney+', 1099)], [], nov14, [])).toEqual([]);
    expect(detectRecurring([e('1', '2026-10-13', 'Disney+', 1099), e('2', '2026-11-20', 'Disney+', 1099)], [], nov14, [])).toEqual([]);
  });
  test('devient une charge mensuelle du bon groupe', () => {
    const [s] = detectRecurring([e('1', '2026-10-13', 'Disney+', 1099), e('2', '2026-11-13', 'Disney+', 1099)], [], nov14, []);
    expect(chargeFromSuggestion(s, 'x')).toEqual({ id: 'x', name: 'Disney+', group: 'abos', amount: 1099, day: 13, freq: 'mois' });
    const [m] = detectRecurring([e('1', '2026-10-03', 'Pharmacie Lafayette', 1200, 'sante'), e('2', '2026-11-03', 'Pharmacie Lafayette', 1250, 'sante')], [], nov14, []);
    expect(chargeFromSuggestion(m, 'y').group).toBe('sante');
  });
});
