/** Bugs trouvés par la campagne de tests automatique (agent « calculs »), un test chacun */
import { decodeState, encode, EMPTY } from '../../data/persist';
import { parseBalance } from '../accounts';
import { activityFor, dayTitle } from '../activity';
import { buildMonth, CATEGORIES, savingOf, share } from '../budget';
import { calendarMonth } from '../calendar';
import { addDeposit } from '../goals';
import { formatEuros, formatEurosRound } from '../money';
import { cleanName } from '../onboarding';
import { cleanNote, review } from '../review';
import type { Expense, Profile } from '../types';

const base = (over: Partial<Profile> = {}): Profile => ({ income: 100000, extraIncome: 0, payday: 1, savePct: 0, charges: [], ...over });
const nov15 = new Date(2026, 10, 15);

test('1. charges plus fortes que le revenu : le manque apparaît (dépassé), il n’est plus absorbé', () => {
  const p = base({ charges: [{ id: 'l', name: 'Loyer', group: 'logement', amount: 150000, day: 20, freq: 'mois' }] });
  const s = buildMonth(p, [], nov15);
  expect(s.free).toBe(-50000);
  expect(s.over).toBe(true);
  expect(s.endOfMonth).toBe(-50000);
  expect(s.budget).toBe(s.spent + s.upcoming + s.free);
  const s2 = buildMonth(p, [{ id: 'x', date: '2026-11-10', label: 'Courses', categoryId: 'courses', amount: 5000 }], nov15);
  expect(s2.free).toBe(-55000);
  const oct = review(p, [], 2026, 9, nov15);
  expect(oct.left).toBe(-50000);
});

test('2. un gros historique (50 000 dépenses, environ 6 Mo) se relit', () => {
  const expenses: Expense[] = Array.from({ length: 50000 }, (_, i) => ({ id: `id-${i}-aaaaaaaa-bbbb-cccc-dddd`, date: '2026-01-01', label: 'Courses', categoryId: 'courses', amount: 100 }));
  const raw = encode({ ...EMPTY, profile: base(), expenses });
  expect(raw.length).toBeGreaterThan(5_000_000);
  const d = decodeState(raw);
  expect(d.status).toBe('ok');
  expect(d.data.expenses.length).toBe(50000);
});

test('3. dates impossibles écartées à la lecture (31 février, 31 avril, an 0000)', () => {
  const mk = (date: string) => ({ id: date, date, label: 'x', categoryId: 'courses', amount: 100 });
  const raw = JSON.stringify({ v: 1, expenses: ['2026-02-30', '2026-02-31', '2026-04-31', '0000-01-01', '2024-02-29', '2026-03-31'].map(mk) });
  expect(decodeState(raw).data.expenses.map(e => e.date)).toEqual(['2024-02-29', '2026-03-31']);
});

test('4. les budgets des catégories font exactement le reste à vivre, au centime près', () => {
  for (const income of [100001, 123457, 99999, 248000, 1]) {
    const s = buildMonth(base({ income }), [], nov15);
    expect(s.budget).toBe(income);
  }
  expect(share(10, [1, 1, 1])).toEqual([4, 3, 3]);
  expect(share(0, [1, 2])).toEqual([0, 0]);
  expect(share(100, CATEGORIES.map(c => c.reference)).reduce((a, b) => a + b, 0)).toBe(100);
});

test('5. épargne arrondie juste (35 % de 0,90 € = 0,32 €)', () => {
  expect(savingOf(90, 0.35)).toBe(32);
  expect(savingOf(248000, 0.15)).toBe(37200);
  expect(savingOf(100, 0.5)).toBe(40); // plafond 40 %
});

test('6. le calendrier ignore les dépenses de catégorie inconnue, comme le budget', () => {
  const e = [{ id: 'u', date: '2026-11-05', label: '?', categoryId: 'inconnue', amount: 777 }];
  expect(calendarMonth(base(), e, 2026, 10, nov15).variable).toBe(0);
});

test('7. pas de « −0 € »', () => {
  expect(formatEurosRound(-49)).toBe('0 €');
  expect(formatEurosRound(-1)).toBe('0 €');
  expect(formatEuros(-0.4)).toBe('0,00 €');
  expect(formatEurosRound(-50)).toBe('−1 €');
});

test('8. un retour à la ligne ou une tabulation devient un espace', () => {
  expect(cleanName('Loyer\nappart')).toBe('Loyer appart');
  expect(cleanName('a\tb')).toBe('a b');
});

test('9. un emoji n’est jamais coupé en deux', () => {
  const name = cleanName('x'.repeat(39) + '😀');
  expect(name).toBe('x'.repeat(39) + '😀');
  expect(Array.from(cleanName('😀'.repeat(50))).length).toBe(40);
  expect(cleanName('😀'.repeat(50)).endsWith('😀')).toBe(true);
  expect(cleanNote('é'.repeat(279) + '😀😀').endsWith('😀')).toBe(true);
});

test('10. chercher « x » ne renvoie pas toutes les charges fixes', () => {
  const p = base({ charges: [{ id: 'l', name: 'Loyer', group: 'logement', amount: 50000, day: 5, freq: 'mois' }] });
  const q = (query: string) => activityFor(p, [], nov15, { year: 2026, month: 10, query }).count;
  for (const s of ['x', 'fi', 'ch', 'charg']) expect(q(s)).toBe(0);
  expect(q('charge')).toBe(1);
  expect(q('charges fixes')).toBe(1);
});

test('11. « -0 » donne 0, pas -0', () => {
  expect(Object.is(parseBalance('-0'), 0)).toBe(true);
  expect(Object.is(parseBalance('-0,00'), 0)).toBe(true);
});

test('titres de jour : l’année quand ce n’est pas l’année en cours (recherche sur plusieurs années)', () => {
  expect(dayTitle('2025-12-31', nov15)).toBe('mer. 31 déc. 2025');
  expect(dayTitle('2026-11-12', nov15)).toBe('jeu. 12 nov.');
});

test('profil sans « autres revenus » (ancienne sauvegarde) : gardé, pas jeté', () => {
  const raw = JSON.stringify({ v: 1, profile: { income: 200000, payday: 1, savePct: 0.1, charges: [] } });
  expect(decodeState(raw).data.profile?.extraIncome).toBe(0);
});

test('versement nul ou négatif ignoré', () => {
  const g = { id: 'g', name: 'J', type: 'voyage' as const, target: 1000, saved: 100, monthly: 0 };
  expect(addDeposit(g, -500, '2026-11-01')).toBe(g);
  expect(addDeposit(g, 0, '2026-11-01')).toBe(g);
});
