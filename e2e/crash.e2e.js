// Protection contre les plantages : écran d'erreur au lieu d'un écran blanc, « Réessayer », données intactes, aucun détail sensible
const { chromium } = require('playwright');
const path = require('path');
const serve = require('./serve');
const AXE = path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 300)); } };
const SEED = {
  v: 1, dismissed: [], notes: { '2026-10': 'Moins de restos' }, prefs: { theme: 'auto', lock: false, hideAmounts: false, alerts: false },
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [{ id: 'a', date: '2026-11-10', label: 'Marché du samedi', categoryId: 'courses', amount: 4000 }],
  accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: 96433, updated: '2026-11-14' }],
  goals: [{ id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 90000, monthly: 20000 }],
};

(async () => {
  const srv = await serve(8098);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 } })).newPage();
  p.setDefaultTimeout(8000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const W = ms => p.waitForTimeout(ms);
  const state = () => p.evaluate(() => localStorage.getItem('nokori:state'));
  const flag = v => p.evaluate(x => x ? localStorage.setItem('nokori:test-plantage', x) : localStorage.removeItem('nokori:test-plantage'), v);
  await p.goto('http://localhost:8098/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.goto('http://localhost:8098/'); await W(1500);
  const before = await state();

  await t('un onglet qui plante : écran d’erreur clair, barre d’onglets toujours là', async () => {
    await flag('budget'); await p.reload(); await W(1800);
    await p.getByRole('heading', { name: 'Un problème est survenu' }).waitFor();
    await p.getByText('Vos données n’ont pas été touchées', { exact: false }).waitFor();
    await p.getByRole('tab', { name: /Activité/ }).waitFor();
  });
  await t('détails techniques masqués par défaut, sans libellé ni montant', async () => {
    if (await p.getByText('Plantage de test', { exact: false }).count()) throw new Error('détails visibles d’emblée');
    await p.getByRole('button', { name: 'Afficher les détails techniques' }).click(); await W(300);
    const txt = await p.getByText('Plantage de test', { exact: false }).innerText();
    if (/1234|un libellé/.test(txt)) throw new Error('donnée dans les détails : ' + txt);
  });
  await t('les autres onglets restent utilisables', async () => {
    await p.getByRole('tab', { name: /Activité/ }).click(); await W(600);
    await p.getByText('Marché du samedi').waitFor();
    await p.getByRole('tab', { name: /Budget/ }).click(); await W(600);
  });
  await t('« Réessayer » réaffiche l’écran une fois le problème disparu', async () => {
    await flag(null);
    await p.getByRole('button', { name: 'Réessayer' }).click(); await W(800);
    await p.getByText('kaki, la couleur du mois').waitFor();
  });
  await t('une fenêtre qui plante : écran d’erreur et « Fermer cet écran »', async () => {
    await flag('reglages');
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(800);
    await p.getByRole('heading', { name: 'Un problème est survenu' }).waitFor();
    await p.getByRole('button', { name: 'Fermer cet écran' }).click(); await W(800);
    await p.getByText('kaki, la couleur du mois').waitFor();
    await flag(null);
  });
  await t('plantage à la racine : écran autonome, puis l’app repart avec ses données', async () => {
    await flag('racine'); await p.reload(); await W(1800);
    await p.getByRole('heading', { name: 'Un problème est survenu' }).waitFor();
    await p.addScriptTag({ path: AXE });
    const v = await p.evaluate(async () => (await window.axe.run(document, { runOnly: ['color-contrast', 'button-name', 'heading-order'] })).violations.map(x => x.id));
    if (v.length) throw new Error('accessibilité : ' + v.join(', '));
    await flag(null);
    await p.getByRole('button', { name: 'Réessayer' }).click(); await W(1500);
    await p.getByText('kaki, la couleur du mois').waitFor();
  });
  await t('aucune donnée modifiée par les plantages', async () => {
    if ((await state()) !== before) throw new Error('état modifié');
  });
  await t('en mode sombre aussi, l’écran d’erreur est lisible', async () => {
    const d = await (await b.newContext({ viewport: { width: 393, height: 852 }, colorScheme: 'dark' })).newPage();
    await d.goto('http://localhost:8098/');
    await d.evaluate(s => { localStorage.setItem('nokori:state', JSON.stringify(s)); localStorage.setItem('nokori:test-plantage', 'racine'); }, SEED);
    await d.goto('http://localhost:8098/'); await d.waitForTimeout(1500);
    await d.getByRole('heading', { name: 'Un problème est survenu' }).waitFor();
    await d.addScriptTag({ path: AXE });
    const v = await d.evaluate(async () => (await window.axe.run(document, { runOnly: ['color-contrast'] })).violations.length);
    if (v) throw new Error(v + ' problème(s) de contraste');
    await d.close();
  });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
