import { decode, encode } from '../../data/persist';
import { buildMonth } from '../budget';
import { chargeDays } from '../charges';
import { buildProfile, cleanName, draftFromProfile, emptyDraft, searchCatalog, summary, toFixedCharge } from '../onboarding';

const nov14 = new Date(2026, 10, 14);

describe('accueil', () => {
  test('le brouillon de départ est vide : aucune charge, aucun montant pré-rempli', () => {
    const d = emptyDraft();
    expect(d.charges).toEqual([]);
    expect(d.income).toBeNull();
  });
  test('recherche sans accents ni majuscules', () => {
    expect(searchCatalog('ENGIE', null).map(i => i.id)).toEqual(['engie']);
    expect(searchCatalog('energie', null).map(i => i.id)).toEqual(['total']);
    expect(searchCatalog('', 'energie').map(i => i.id)).toContain('edf');
    expect(searchCatalog('assur', null).map(i => i.id)).toEqual(['habitation', 'auto']);
  });
  test('nom saisi nettoyé', () => {
    expect(cleanName('<img src=x onerror=alert(1)>Cantine')).toBe('img src=x onerror=alert(1)Cantine');
    expect(cleanName('a'.repeat(80))).toHaveLength(40);
    expect(cleanName('  Crèche\u0000  municipale')).toBe('Crèche municipale');
  });
  test('une charge sans montant n’entre pas dans le profil', () => {
    const p = buildProfile({ ...emptyDraft(), income: 200000, charges: [{ id: 'edf', name: 'EDF', group: 'energie', amount: null, day: 5, freq: 'mois' }] }, nov14);
    expect(p.charges).toEqual([]);
  });
  test('charge à 4 semaines ancrée sur ce mois-ci', () => {
    const c = toFixedCharge({ id: 'salle', name: 'Salle de sport', group: 'sport', amount: 2999, day: 12, freq: '4sem' }, nov14)!;
    expect(c.anchor).toBe('2026-11-12');
    expect(chargeDays(c, 2026, 11)).toEqual([10]);
  });
  test('charge annuelle ancrée sur le mois de la saisie', () => {
    const c = toFixedCharge({ id: 'auto', name: 'Assurance auto', group: 'assurance', amount: 42000, day: 3, freq: 'an' }, nov14)!;
    expect(c.month).toBe(10);
  });
  test('récapitulatif : revenus, épargne, charges, reste à vivre', () => {
    const s = summary({ income: 248000, payday: 1, savePct: 0.2, charges: [
      { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
      { id: 'perso-1', name: 'Cantine', group: 'logement', amount: 4500, day: 5, freq: 'mois', custom: true },
    ] }, nov14);
    expect(s).toEqual({ income: 248000, saving: 49600, fixed: 82500, free: 115900, perDay: 3863 });
  });
  test('le profil construit alimente directement le budget', () => {
    const p = buildProfile({ income: 248000, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] }, nov14);
    const m = buildMonth(p, [], nov14);
    expect(m.saving).toBe(49600);
    expect(m.pillars.find(x => x.id === 'besoins')!.spent).toBe(78000);
  });
  test('modifier ses réponses reprend le profil existant', () => {
    const p = buildProfile({ income: 150000, payday: 5, savePct: 0.1, charges: [{ id: 'perso-9', name: 'Crèche', group: 'logement', amount: 30000, day: 2, freq: 'mois', custom: true }] }, nov14);
    const d = draftFromProfile(p);
    expect(d.income).toBe(150000);
    expect(d.charges[0]).toMatchObject({ name: 'Crèche', custom: true });
  });
});

describe('données relues depuis le stockage', () => {
  const p = buildProfile({ income: 248000, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] }, nov14);
  test('aller-retour sans perte', () => {
    const d = decode(encode({ profile: p, expenses: [{ id: 'e1', date: '2026-11-13', label: 'Café', categoryId: 'restos', amount: 480 }], dismissed: ['disney+'] }));
    expect(d.dismissed).toEqual(['disney+']);
    expect(d.profile).toEqual(p);
    expect(d.expenses).toHaveLength(1);
  });
  test('donnée abîmée, inconnue ou hostile : écartée sans planter', () => {
    for (const raw of [null, '', '{', 'null', '[]', '{"v":99}', '{"v":1,"profile":{"income":-5}}', '{"v":1,"profile":{"income":1,"extraIncome":0,"payday":1,"savePct":9,"charges":[]}}', '{"__proto__":{"x":1},"v":1}']) {
      const d = decode(raw);
      expect(d.profile).toBeNull();
      expect(Array.isArray(d.expenses)).toBe(true);
    }
  });
  test('une charge invalide est retirée, les autres gardées', () => {
    const raw = encode({ profile: p, expenses: [], dismissed: [] }).replace('"charges":[', '"charges":[{"id":"x","name":"","group":"pirate","amount":1e12,"day":99,"freq":"jour"},');
    expect(decode(raw).profile!.charges).toEqual(p.charges);
  });
  test('dépense hostile retirée', () => {
    const raw = JSON.stringify({ v: 1, profile: null, expenses: [{ id: 'a', date: '2026-11-13', label: 'ok', categoryId: 'restos', amount: 100 }, { id: 'b', date: 'demain', label: '<script>', categoryId: 'restos', amount: -1 }] });
    expect(decode(raw).expenses.map(e => e.id)).toEqual(['a']);
  });
});
