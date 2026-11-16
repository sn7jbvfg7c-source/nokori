/** Conformité : documents fidèles au fonctionnement réel, aucune donnée inventée, consentement sans piège */
import { LEGAL, missingLegalFields, TO_COMPLETE, val } from '../legal/config';
import { choiceAll, choiceCustom, CONSENT_VERSION, isAllowed, needsConsent, OPTIONAL_TRACKERS } from '../legal/consent';
import { legalDocs } from '../legal/documents';

const all = (id: keyof ReturnType<typeof legalDocs>) => { const d = legalDocs()[id]; return [d.intro, ...d.sections.flatMap(s => [s.h, ...(s.p ?? []), ...(s.list ?? [])])].join('\n').replace(/[\u00a0\u202f]/g, ' '); };

describe('informations de l’éditeur : rien d’inventé', () => {
  test('aucune information personnelle renseignée par défaut : tout est « À compléter »', () => {
    expect(Object.values(LEGAL.editor).every(v => v === null)).toBe(true);
    expect(all('mentions')).toMatch(TO_COMPLETE);
    expect(val(null, 'SIRET')).toBe('[À compléter\u00a0: SIRET]');
    expect(val('  ', 'x')).toBe('[À compléter\u00a0: x]');
  });
  test('liste des éléments à fournir, selon le statut', () => {
    expect(missingLegalFields().length).toBeGreaterThan(5);
    const particulierAnonyme = { ...LEGAL, editor: { ...LEGAL.editor, status: 'particulier' as const, anonymous: true, email: 'contact@exemple.test' } };
    const m = missingLegalFields(particulierAnonyme);
    expect(m.some(x => /SIRET/.test(x))).toBe(false);
    expect(m.some(x => /Nom et prénoms/.test(x))).toBe(false); // anonymat permis par la LCEN, art. 1-1 II
    const complet = { ...LEGAL, editor: { name: 'Exemple', status: 'professionnel' as const, legalForm: 'EI', address: '1 rue X', anonymous: null, siret: '000', vatNumber: 'FR00', email: 'a@b.test', phone: '0000', publicationDirector: 'Exemple' }, webHost: { name: 'H', address: 'A', contact: 'C', logRetention: '12 mois' }, consumerMediator: 'Médiateur X' };
    expect(missingLegalFields(complet)).toEqual([]);
    expect(Object.values(legalDocs(complet)).some(d => TO_COMPLETE.test(JSON.stringify(d)))).toBe(false);
  });
  test('particulier anonyme : seules les coordonnées de l’hébergeur sont publiées', () => {
    const cfg = { ...LEGAL, editor: { ...LEGAL.editor, status: 'particulier' as const, anonymous: true } };
    const txt = JSON.stringify(legalDocs(cfg).mentions);
    expect(txt).toMatch(/rester anonyme/);
    expect(txt).not.toMatch(/Directeur ou directrice/);
  });
});

describe('les documents décrivent le fonctionnement réel', () => {
  test('confidentialité : données sur l’appareil, aucun destinataire, droits, CNIL, hébergeur et transferts', () => {
    const t = all('confidentialite');
    for (const m of [/uniquement faire fonctionner/, /Destinataires : personne/, /portabilité/, /CNIL/, /Data Privacy Framework/, /adresse IP/, /Supprimer toutes mes données/]) expect(t).toMatch(m);
  });
  test('cookies : aucun cookie déclaré, et aucun traceur facultatif dans le code', () => {
    expect(OPTIONAL_TRACKERS).toEqual([]);
    expect(all('cookies')).toMatch(/aucun cookie/i);
    expect(all('cookies')).toMatch(/nokori:state/);
  });
  test('remboursement : app gratuite, droits légaux rappelés sans être supprimés', () => {
    const t = all('remboursement');
    expect(t).toMatch(/entièrement gratuite/);
    expect(t).toMatch(/L221-28/);
    expect(t).toMatch(/garantie légale de conformité/);
  });
  test('conditions : pas de clause qui supprimerait les droits du consommateur', () => {
    const t = all('conditions');
    expect(t).toMatch(/ne limite les droits que la loi vous accorde/);
    expect(t).not.toMatch(/aucune responsabilité|en aucun cas responsable/i);
  });
  test('mentions : article 1-1 de la LCEN (rédaction 2024)', () => {
    expect(all('mentions')).toMatch(/article 1-1/);
  });
});

describe('consentement aux traceurs facultatifs', () => {
  const T = [{ id: 'a', name: 'A', purpose: 'p', provider: 'x' }, { id: 'b', name: 'B', purpose: 'p', provider: 'y' }];
  test('aucun traceur facultatif : aucun bandeau', () => {
    expect(needsConsent([], undefined)).toBe(false);
  });
  test('avec des traceurs : bandeau tant qu’aucun choix n’est fait, et rien n’est autorisé avant', () => {
    expect(needsConsent(T, undefined)).toBe(true);
    expect(isAllowed('a', undefined)).toBe(false);
  });
  test('tout refuser / tout accepter / personnaliser', () => {
    const no = choiceAll(T, false, '2026-11-16'), yes = choiceAll(T, true, '2026-11-16'), mix = choiceCustom(T, { a: true }, '2026-11-16');
    expect(isAllowed('a', no) || isAllowed('b', no)).toBe(false);
    expect(isAllowed('a', yes) && isAllowed('b', yes)).toBe(true);
    expect([isAllowed('a', mix), isAllowed('b', mix)]).toEqual([true, false]); // non coché par défaut
    expect(needsConsent(T, no)).toBe(false); // le choix est conservé
  });
  test('nouvelle version de la liste : on redemande', () => {
    expect(needsConsent(T, { ...choiceAll(T, true, '2026-11-16'), v: CONSENT_VERSION - 1 })).toBe(true);
  });
});
