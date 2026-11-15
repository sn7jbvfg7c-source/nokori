// Onglet Objectifs et défis (date figée au samedi 14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 260)); } };
const SEED = {
  v: 1, dismissed: [], accounts: [], goals: [],
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [{ id: 'r1', date: '2026-11-11', label: 'Restaurant', categoryId: 'restos', amount: 1800 }],
};

(async () => {
  const srv = await serve(8092);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
  p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  await p.goto('http://localhost:8092/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.reload(); await W(1800);
  const create = async (name, type, target, saved, monthly) => {
    await p.getByRole('button', { name: 'Ajouter un objectif' }).first().click(); await W(200);
    await p.getByLabel('Nom de l’objectif').fill(name);
    await p.getByRole('button', { name: type, exact: true }).click();
    await p.getByLabel('Montant visé').fill(target);
    await p.getByLabel('Déjà épargné').fill(saved);
    await p.getByLabel('Versement par mois').fill(monthly);
    await p.getByRole('button', { name: 'Enregistrer l’objectif' }).click(); await W(300);
  };

  await t('onglet Objectifs, état vide et défis', async () => {
    await p.getByRole('tab', { name: /Objectifs/ }).click(); await W(500);
    await p.getByText('Un projet en tête ?').waitFor();
    await p.getByLabel('Semaine sans envies : 5 jours sur 7').waitFor();
    await p.getByLabel('Série : 3 jours sur 3').waitFor();
  });
  await t('montant visé invalide : « Enregistrer » bloqué', async () => {
    await p.getByRole('button', { name: 'Ajouter un objectif' }).first().click(); await W(200);
    await p.getByLabel('Nom de l’objectif').fill('Test');
    await p.getByLabel('Montant visé').fill('12,345');
    await p.getByText('Montant invalide').waitFor();
    if (!(await p.getByRole('button', { name: 'Enregistrer l’objectif' }).isDisabled())) throw new Error('bouton actif');
    await p.getByRole('button', { name: 'Annuler', exact: true }).click(); await W(200);
  });
  await t('Japon : 1 450 sur 3 000 €, 150 € par mois → octobre 2027', async () => {
    await create('Voyage au Japon', 'Voyage', '3000', '1450', '150');
    await p.getByText('Au rythme de 150 € par mois : octobre 2027').waitFor();
    await p.getByText('48 %').waitFor();
  });
  await t('avec le reste du mois : plus tôt, recalculé à chaque dépense', async () => {
    const txt = await p.getByLabel('Date avec le reste du mois').innerText();
    if (!/janvier 2027/.test(txt)) throw new Error(txt);
    await shot('g1');
  });
  await t('noter un versement de 100 € → 52 %, septembre 2027', async () => {
    await p.getByRole('button', { name: 'Noter un versement pour Voyage au Japon' }).click(); await W(200);
    await p.getByLabel('Versement pour Voyage au Japon', { exact: true }).fill('100');
    await p.getByRole('button', { name: 'Noter le versement pour Voyage au Japon' }).click(); await W(300);
    await p.getByText('52 %').waitFor();
    await p.getByText('Au rythme de 150 € par mois : septembre 2027').waitFor();
  });
  await t('voiture : 6 200 € restants à 250 € → décembre 2028 ; total 4 350 €', async () => {
    await create('Voiture', 'Voiture', '9000', '2800', '250');
    await p.getByText(/décembre 2028/).waitFor();
    await p.getByLabel('4 350 € épargnés').waitFor();
    await shot('g2');
  });
  await t('suppression avec confirmation', async () => {
    await p.getByRole('button', { name: 'Modifier Voiture' }).click(); await W(200);
    await p.getByRole('button', { name: 'Supprimer Voiture' }).click(); await W(200);
    await p.getByText('Supprimer cet objectif ?').waitFor();
    await p.getByRole('button', { name: 'Confirmer la suppression de Voiture' }).click(); await W(300);
    if (await p.getByText('Voiture', { exact: true }).count()) throw new Error('encore là');
  });
  await t('gardé après rechargement', async () => {
    await p.reload(); await W(1800); await p.getByRole('tab', { name: /Objectifs/ }).click(); await W(500);
    await p.getByText('52 %').waitFor();
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
