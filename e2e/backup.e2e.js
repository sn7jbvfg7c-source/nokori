// Sauvegarde chiffrée : créer le fichier, tout effacer, restaurer au premier lancement (date figée au 14 novembre 2026)
const { chromium } = require('playwright');
const fs = require('fs');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 300)); } };
const SEED = {
  v: 1, dismissed: [], notes: { '2026-10': 'Moins de restos' }, prefs: { theme: 'auto', lock: false, hideAmounts: false, alerts: false },
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [{ id: 'a', date: '2026-11-10', label: 'Marché du samedi', categoryId: 'courses', amount: 4000 }],
  accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: 96433, updated: '2026-11-14' }],
  goals: [{ id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 90000, monthly: 20000 }],
};
const PASS = 'riz gris sous la pluie';

(async () => {
  const srv = await serve(8095);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, acceptDownloads: true });
  const p = await ctx.newPage();
  p.setDefaultTimeout(15000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const W = ms => p.waitForTimeout(ms);
  await p.goto('http://localhost:8095/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.goto('http://localhost:8095/'); await W(1800);
  let file = '';

  await t('réglages : rappel « aucune sauvegarde »', async () => {
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(600);
    await p.getByText('Aucune sauvegarde pour l’instant', { exact: false }).waitFor();
  });
  await t('phrase trop courte ou différente : bouton bloqué', async () => {
    await p.getByRole('button', { name: /^Sauvegarde et restauration/ }).click(); await W(600);
    await p.getByLabel('Phrase secrète de la sauvegarde', { exact: true }).fill('court');
    await p.getByText('Au moins 8 caractères', { exact: false }).waitFor();
    await p.getByLabel('Phrase secrète de la sauvegarde', { exact: true }).fill(PASS);
    await p.getByLabel('Confirmer la phrase secrète').fill(PASS + 'x');
    await p.getByText('Les deux phrases ne sont pas identiques.').waitFor();
    if (!(await p.getByRole('button', { name: /^Créer la sauvegarde/ }).isDisabled())) throw new Error('bouton actif');
  });
  await t('création : un fichier .nokori téléchargé, sans aucune donnée lisible', async () => {
    await p.getByLabel('Confirmer la phrase secrète').fill(PASS);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: /^Créer la sauvegarde/ }).click()]);
    if (dl.suggestedFilename() !== 'nokori-2026-11-14.nokori') throw new Error(dl.suggestedFilename());
    file = await dl.path();
    const txt = fs.readFileSync(file, 'utf8');
    for (const s of ['Marché', 'Japon', 'Compte courant', 'Loyer', 'restos']) if (txt.includes(s)) throw new Error('lisible : ' + s);
    if (!txt.includes('"format":"nokori-sauvegarde"')) throw new Error('format');
    await p.getByText('Sauvegarde créée.', { exact: false }).waitFor();
  });
  await t('la date de la dernière sauvegarde est retenue', async () => {
    await p.getByText('dernière : 14 novembre 2026').waitFor();
  });
  await t('tout effacer, puis l’accueil propose de restaurer', async () => {
    await p.getByRole('button', { name: 'Fermer la sauvegarde' }).click(); await W(500);
    await p.getByRole('button', { name: 'Tout effacer' }).click(); await W(200);
    await p.getByRole('button', { name: 'Confirmer : tout effacer' }).click(); await W(1200);
    await p.getByText('sans le carnet.').waitFor();
    await p.getByRole('button', { name: 'J’ai déjà une sauvegarde Nokori' }).click(); await W(600);
    await p.getByText('Restaurer', { exact: true }).waitFor();
    if (await p.getByText('Créer une sauvegarde').count()) throw new Error('export proposé sans données');
  });
  await t('un fichier quelconque est refusé avec un message clair', async () => {
    const junk = file + '.txt'; fs.writeFileSync(junk, 'bonjour');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Choisir un fichier' }).click()]);
    await fc.setFiles(junk); await W(500);
    await p.getByText('Ce fichier n’est pas une sauvegarde Nokori.').waitFor();
  });
  await t('mauvaise phrase secrète : refusée, rien n’est remplacé', async () => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Choisir un fichier' }).click()]);
    await fc.setFiles(file); await W(500);
    await p.getByText('Sauvegarde du', { exact: false }).waitFor();
    await p.getByLabel('Phrase secrète de la sauvegarde à restaurer').fill('riz gris sous la neige');
    await p.getByRole('button', { name: /^Ouvrir/ }).click();
    await p.getByText('Phrase secrète incorrecte, ou fichier modifié ou abîmé.').waitFor();
  });
  await t('bonne phrase : résumé, confirmation, données restaurées', async () => {
    await p.getByLabel('Phrase secrète de la sauvegarde à restaurer').fill(PASS);
    await p.getByRole('button', { name: /^Ouvrir/ }).click();
    await p.getByText('Sauvegarde ouverte : 1 dépense, 1 compte, 1 objectif, budget compris.').waitFor();
    await p.getByRole('button', { name: 'Remplacer mes données' }).click(); await W(600);
    await p.getByText('Données restaurées.', { exact: false }).waitFor();
    await p.getByRole('button', { name: 'Ouvrir mon budget' }).click(); await W(1200);
    await p.getByText('kaki, la couleur du mois').waitFor();
  });
  await t('tout est revenu : dépense, compte, objectif, note', async () => {
    await p.getByRole('tab', { name: /Activité/ }).click(); await W(500);
    await p.getByText('Marché du samedi').waitFor();
    await p.getByRole('tab', { name: /Comptes/ }).click(); await W(500);
    const tot = await p.locator('[aria-label^="Total de vos comptes"]').getAttribute('aria-label');
    if (!/964,33/.test(tot)) throw new Error(tot);
    await p.getByRole('tab', { name: /Objectifs/ }).click(); await W(500);
    await p.getByText('Japon', { exact: true }).waitFor();
    const st = await p.evaluate(() => JSON.parse(localStorage.getItem('nokori:state')));
    if (st.notes['2026-10'] !== 'Moins de restos') throw new Error('note perdue');
    if (st.prefs.lock !== false || st.prefs.alerts !== false) throw new Error('réglages propres au téléphone restaurés');
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
