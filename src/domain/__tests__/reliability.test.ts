import { decodeState, encode, EMPTY, STATE_VERSION } from '../../data/persist';
import { buildMonth } from '../budget';
import { profileAt, recordChange } from '../history';
import { buildProfile, draftFromProfile } from '../onboarding';
import { review } from '../review';
import type { Profile } from '../types';

const base: Profile = {
  income: 200000, extraIncome: 0, payday: 1, savePct: 0.1,
  charges: [
    { id: 'loyer', name: 'Loyer', group: 'logement', amount: 70000, day: 5, freq: 'mois' },
    { id: 'assur', name: 'Assurance auto', group: 'assurance', amount: 36000, day: 15, freq: 'an', month: 2 },
    { id: 'gym', name: 'Salle', group: 'sport', amount: 3000, day: 9, freq: '4sem', anchor: '2026-01-09' },
  ],
};

describe('lecture des données : jamais de remise à zéro silencieuse', () => {
  test('rien d’enregistré : premier lancement', () => {
    expect(decodeState(null).status).toBe('vide');
    expect(decodeState('').status).toBe('vide');
  });
  test('données correctes : relues', () => {
    const d = decodeState(encode({ ...EMPTY, profile: base }));
    expect(d.status).toBe('ok');
    expect(d.data.profile).toEqual(base);
  });
  test('fichier abîmé : illisible, pas « vide »', () => {
    expect(decodeState('{"v":1,"profile":').status).toBe('illisible');
    expect(decodeState('null').status).toBe('illisible');
    expect(decodeState('[1,2]').status).toBe('illisible');
  });
  test('version plus récente que l’app : illisible (une ancienne app ne doit pas écraser des données récentes)', () => {
    expect(decodeState(JSON.stringify({ v: STATE_VERSION + 1, profile: null })).status).toBe('illisible');
  });
  test('une date impossible est écartée', () => {
    const raw = JSON.stringify({ v: 1, expenses: [{ id: 'a', date: '2026-13-45', label: 'x', categoryId: 'courses', amount: 100 }, { id: 'b', date: '2026-11-14', label: 'y', categoryId: 'courses', amount: 100 }] });
    expect(decodeState(raw).data.expenses.map(e => e.id)).toEqual(['b']);
  });
});

describe('historique du profil : les mois passés gardent leurs chiffres', () => {
  const raised = { ...base, income: 260000 };
  test('changer son revenu en novembre ne réécrit pas octobre', () => {
    const history = recordChange([], base, new Date(2026, 10, 14));
    expect(history).toEqual([{ until: '2026-10', profile: base }]);
    expect(profileAt(raised, history, 2026, 9).income).toBe(200000);
    expect(profileAt(raised, history, 2026, 0).income).toBe(200000);
    expect(profileAt(raised, history, 2026, 10).income).toBe(260000);
  });
  test('deux changements le même mois : l’ancien profil d’origine reste celui des mois passés', () => {
    const h1 = recordChange([], base, new Date(2026, 10, 3));
    const h2 = recordChange(h1, raised, new Date(2026, 10, 20));
    expect(h2).toEqual(h1);
  });
  test('changements sur plusieurs mois : chaque période garde le sien', () => {
    const p2 = { ...base, income: 220000 };
    let h = recordChange([], base, new Date(2026, 7, 10)); // base jusqu'en juillet
    h = recordChange(h, p2, new Date(2026, 9, 2)); // p2 en août et septembre
    expect(profileAt(raised, h, 2026, 6).income).toBe(200000);
    expect(profileAt(raised, h, 2026, 8).income).toBe(220000);
    expect(profileAt(raised, h, 2026, 9).income).toBe(260000);
  });
  test('le bilan d’un mois clos utilise le profil de l’époque', () => {
    const h = recordChange([], base, new Date(2026, 10, 14));
    const oct = review(profileAt(raised, h, 2026, 9), [], 2026, 9, new Date(2026, 10, 14));
    expect(oct.income).toBe(200000);
  });
  test('l’historique est enregistré et relu', () => {
    const h = recordChange([], base, new Date(2026, 10, 14));
    expect(decodeState(encode({ ...EMPTY, profile: raised, history: h })).data.history).toEqual(h);
  });
});

describe('« Modifier mes réponses » ne déplace aucune charge', () => {
  test('charge annuelle de mars : reste en mars, même modifiée en novembre', () => {
    const p = buildProfile(draftFromProfile(base), new Date(2026, 10, 14), base);
    expect(p.charges.find(c => c.id === 'assur')!.month).toBe(2);
  });
  test('charge toutes les 4 semaines : garde son échéance de référence si le jour ne change pas', () => {
    const p = buildProfile(draftFromProfile(base), new Date(2026, 10, 14), base);
    expect(p.charges.find(c => c.id === 'gym')!.anchor).toBe('2026-01-09');
  });
  test('profil identique après un aller-retour dans l’accueil', () => {
    expect(buildProfile(draftFromProfile(base), new Date(2026, 10, 14), base)).toEqual(base);
  });
  test('les autres revenus sont conservés', () => {
    const withExtra = { ...base, extraIncome: 15000 };
    expect(buildProfile(draftFromProfile(withExtra), new Date(2026, 10, 14), withExtra).extraIncome).toBe(15000);
  });
});

describe('montant disponible et projection', () => {
  const p: Profile = { income: 248000, extraIncome: 0, payday: 1, savePct: 0.15, charges: [
    { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
    { id: 'navigo', name: 'Pass', group: 'transports', amount: 8800, day: 25, freq: 'mois' },
  ] };
  test('le disponible retire les prélèvements à venir', () => {
    const s = buildMonth(p, [], new Date(2026, 10, 14));
    expect(s.upcoming).toBe(8800);
    expect(s.paidFixed).toBe(78000);
    expect(s.free).toBe(s.left - 8800);
    expect(s.budget).toBe(s.spent + s.upcoming + s.free);
  });
  test('budget dépassé : 0 par jour, signalé', () => {
    const s = buildMonth(p, [{ id: 'x', date: '2026-11-10', label: 'Gros achat', categoryId: 'imprevus', amount: 200000 }], new Date(2026, 10, 14));
    expect(s.over).toBe(true);
    expect(s.perDay).toBe(0);
    expect(s.free).toBeLessThan(0);
  });
  test('le 2 du mois, un gros achat ne fait pas une projection absurde', () => {
    const e = [{ id: 'x', date: '2026-11-02', label: 'Courses du mois', categoryId: 'courses', amount: 25000 }];
    const s = buildMonth(p, e, new Date(2026, 10, 2));
    const naive = s.left - ((25000 / 2) * (30 - 2) + s.upcoming);
    expect(s.earlyProjection).toBe(true);
    expect(s.endOfMonth).toBeGreaterThan(naive);
  });
  test('à partir du 7, la projection suit le rythme réel', () => {
    const e = [{ id: 'x', date: '2026-11-03', label: 'A', categoryId: 'courses', amount: 7000 }];
    const s = buildMonth(p, e, new Date(2026, 10, 14));
    expect(s.earlyProjection).toBe(false);
    expect(s.endOfMonth).toBe(Math.round(s.left - ((7000 / 14) * 16 + s.upcoming)));
  });
});
