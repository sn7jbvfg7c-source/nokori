// Historique et nouvelles fonctions : recherche, modification, suppression annulable, bilan comparé, versements (14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 12).join(' ').slice(0, 1500)); } };
const SEED = {
  v: 1, dismissed: [], notes: {}, prefs: { theme: 'auto', lock: false, hideAmounts: false, alerts: false },
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  // le profil d'août-septembre était différent : le bilan de septembre doit garder ses 200 000
  history: [{ until: '2026-09', profile: { income: 200000, extraIncome: 0, payday: 1, savePct: 0.1, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 70000, day: 5, freq: 'mois' }] } }],
  expenses: [
    { id: 's1', date: '2026-09-04', label: 'Pharmacie', categoryId: 'sante', amount: 2500 },
    { id: 'o1', date: '2026-10-03', label: 'Courses', categoryId: 'courses', amount: 10000 },
    { id: 'o2', date: '2026-10-09', label: 'Librairie', categoryId: 'culture', amount: 3000 },
    { id: 'n1', date: '2026-11-02', label: 'Courses', categoryId: 'courses', amount: 6000 },
    { id: 'n2', date: '2026-11-08', label: 'Cinéma', categoryId: 'culture', amount: 1200 },
  ],
  accounts: [], goals: [{ id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 90000, monthly: 20000 }],
};

(async () => {
  const srv = await serve(8096);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 } })).newPage();
  p.setDefaultTimeout(8000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const W = ms => p.waitForTimeout(ms);
  const tab = n => p.getByRole('tab', { name: new RegExp(n) });
  await p.goto('http://localhost:8096/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.goto('http://localhost:8096/'); await W(1800);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('nokori:state')));

  await t('budget : le grand chiffre est le disponible, prélèvements déduits', async () => {
    await p.locator('[aria-label*="disponibles, prélèvements à venir déduits"]').waitFor();
  });
  await t('activité : mois en cours, puis octobre, puis septembre (historique complet)', async () => {
    await tab('Activité').click(); await W(500);
    await p.getByText('Novembre 2026').waitFor();
    await p.getByRole('button', { name: 'Activité : mois d’avant' }).click(); await W(300);
    await p.getByText('Octobre 2026').waitFor(); await p.getByText('Librairie').waitFor();
    await p.getByRole('button', { name: 'Activité : mois d’avant' }).click(); await W(300);
    await p.getByText('Septembre 2026').waitFor(); await p.getByText('Pharmacie').waitFor();
    if (!(await p.getByRole('button', { name: 'Activité : mois d’avant' }).isDisabled())) throw new Error('avant la première dépense');
  });
  await t('recherche sur tout l’historique, sans accents ni majuscules', async () => {
    await p.getByLabel('Rechercher une dépense').fill('COURSES'); await W(300);
    await p.getByText('2 résultats', { exact: false }).waitFor();
    await p.getByLabel('Rechercher une dépense').fill('cinema'); await W(300);
    await p.getByText('1 résultat', { exact: false }).waitFor();
    await p.getByLabel('Rechercher une dépense').fill('zzz'); await W(300);
    await p.getByText('Aucune dépense trouvée').waitFor();
    await p.getByRole('button', { name: 'Effacer la recherche' }).click(); await W(300);
  });
  await t('modifier une dépense : montant et libellé changés, même identifiant', async () => {
    for (let i = 0; i < 2; i++) await p.getByRole('button', { name: 'Activité : mois d’après' }).click();
    await p.getByRole('button', { name: /^Cinéma, / }).click(); await W(200);
    await p.getByRole('button', { name: 'Modifier Cinéma' }).click(); await W(600);
    await p.getByText('Modifier la dépense').waitFor();
    await p.getByLabel('Montant : 12,00 €').waitFor();
    await p.getByRole('button', { name: 'Effacer' }).click(); await p.getByRole('button', { name: 'Effacer' }).click();
    for (const k of ['1', '5']) await p.getByRole('button', { name: k, exact: true }).click();
    await p.getByLabel('Libellé de la dépense').fill('Cinéma avec Léa');
    await p.getByRole('button', { name: /^Enregistrer la dépense/ }).click(); await W(700);
    await p.getByText('Cinéma avec Léa').waitFor();
    const e = (await state()).expenses.find(x => x.id === 'n2');
    if (e.amount !== 1500 || e.label !== 'Cinéma avec Léa' || e.date !== '2026-11-08') throw new Error(JSON.stringify(e));
  });
  await t('supprimer puis « Annuler » : la dépense revient', async () => {
    await p.getByRole('button', { name: /^Cinéma avec Léa, / }).click(); await W(200);
    await p.getByRole('button', { name: 'Supprimer Cinéma avec Léa' }).click(); await W(200);
    await p.getByRole('button', { name: 'Confirmer la suppression de Cinéma avec Léa' }).click(); await W(400);
    await p.getByText('Cinéma avec Léa supprimée').waitFor();
    await p.getByRole('button', { name: 'Annuler la suppression' }).click(); await W(400);
    if (!(await state()).expenses.some(x => x.id === 'n2')) throw new Error('pas revenue');
  });
  await t('saisie : un montant inhabituel est signalé, une date plus ancienne est possible', async () => {
    await tab('Budget').click(); await W(400);
    await p.getByRole('button', { name: 'Ajouter une dépense' }).first().click(); await W(600);
    for (const k of ['1', '2', '0', '0']) await p.getByRole('button', { name: k, exact: true }).click();
    await p.getByText('Montant inhabituel', { exact: false }).waitFor();
    await p.getByRole('button', { name: 'Courses, Besoins' }).click();
    await p.getByRole('button', { name: 'Autre jour' }).click(); await W(200);
    await p.getByText('jeu. 12 nov.').waitFor();
    await p.getByRole('button', { name: 'Jour précédent' }).click(); await W(100);
    await p.getByText('mer. 11 nov.').waitFor();
    await p.getByRole('button', { name: /^Ajouter la dépense/ }).click(); await W(700);
    if (!(await state()).expenses.some(x => x.date === '2026-11-11' && x.amount === 120000)) throw new Error('date ou montant');
  });
  await t('bilan : comparaison avec octobre et dépenses par catégorie (vraies saisies)', async () => {
    await tab('Bilan').click(); await W(500);
    await p.getByText('Par rapport à octobre', { exact: false }).waitFor();
    await p.getByText('Du 1er au 14 de chaque mois, hors charges fixes.').waitFor();
    await p.locator('[aria-label^="Courses : "]').first().waitFor();
  });
  await t('bilan de septembre : profil d’époque (revenu 2 000 €), pas l’actuel', async () => {
    for (let i = 0; i < 2; i++) await p.getByRole('button', { name: 'Bilan : mois d’avant' }).click();
    await p.getByText('Septembre, clos').waitFor();
    const row = p.locator('text=Combien ai-je reçu ?').locator('xpath=..');
    const txt = await row.innerText();
    if (!/2\s000\s€/.test(txt)) throw new Error(txt);
  });
  await t('objectif : versement noté avec sa date, versement du mois suivi', async () => {
    await tab('Objectifs').click(); await W(500);
    await p.getByRole('button', { name: 'Noter un versement pour Japon' }).click();
    await p.getByLabel('Versement pour Japon', { exact: true }).fill('150');
    await p.getByRole('button', { name: 'Noter le versement pour Japon' }).click(); await W(400);
    await p.getByText('Derniers versements').waitFor();
    await p.getByText('Versé en novembre :', { exact: false }).waitFor();
    const g = (await state()).goals[0];
    if (g.saved !== 105000 || g.deposits?.[0]?.date !== '2026-11-14' || g.deposits[0].amount !== 15000) throw new Error(JSON.stringify(g));
  });
  await t('masquer les montants : plus aucun montant dans l’activité ni le bilan', async () => {
    await tab('Budget').click(); await W(400);
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(500);
    await p.getByRole('switch', { name: 'Masquer les montants' }).click(); await W(200);
    await p.getByRole('button', { name: 'Fermer les réglages' }).click(); await W(400);
    for (const n of ['Activité', 'Bilan', 'Objectifs']) {
      await tab(n).click(); await W(400);
      const visible = await p.evaluate(() => [...document.querySelectorAll('div[dir="auto"]')].filter(e => e.checkVisibility() && /\d+,\d{2}\s?€|\d\s?€/.test(e.textContent) && !/%/.test(e.textContent)).map(e => e.textContent).slice(0, 3));
      if (visible.length) throw new Error(`${n} : ${visible.join(' | ')}`);
    }
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
