// Réglages : thème, masquer les montants, options indisponibles sur le web, tout effacer
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 260)); } };
const SEED = {
  v: 1, dismissed: [], goals: [], notes: {},
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [{ id: 'a', date: '2026-11-10', label: 'Marché', categoryId: 'courses', amount: 4000 }],
  accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: 96433, updated: '2026-11-14' }],
};

(async () => {
  const srv = await serve(8089);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2, colorScheme: 'light' })).newPage();
  p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  await p.goto('http://localhost:8089/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.reload(); await W(1800);
  const titleColor = () => p.getByText('Budget', { exact: true }).first().evaluate(e => getComputedStyle(e).color);
  const openSettings = async () => { await p.getByRole('button', { name: 'Réglages' }).click(); await W(600); await p.getByText('Réglages', { exact: true }).last().waitFor(); };

  await t('thème clair par défaut', async () => { const c = await titleColor(); if (c !== 'rgb(20, 20, 18)') throw new Error(c); });
  await t('la roue crantée ouvre les Réglages', openSettings);
  await t('Face ID et rappels indiqués indisponibles dans le navigateur', async () => {
    await p.getByText('Indisponible dans le navigateur').first().waitFor();
    if (!(await p.getByRole('switch', { name: 'Verrouillage Face ID' }).isDisabled())) throw new Error('interrupteur actif');
    if (!(await p.getByRole('switch', { name: 'Avant chaque prélèvement' }).isDisabled())) throw new Error('interrupteur actif');
  });
  await t('thème sombre appliqué partout', async () => {
    await p.getByRole('radio', { name: 'Thème Sombre' }).click(); await W(300); await shot('st1');
    await p.getByRole('button', { name: 'Fermer les réglages' }).click(); await W(500);
    const c = await titleColor(); if (c !== 'rgb(242, 238, 232)') throw new Error(c);
    await shot('st2');
    for (const tab of ['Activité', 'Comptes', 'Objectifs', 'Bilan']) { await p.getByRole('tab', { name: new RegExp(tab) }).click(); await W(400); await shot('dark-' + tab.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()); }
    await p.getByRole('tab', { name: /Budget/ }).click(); await W(400);
  });
  await t('thème gardé après rechargement', async () => { await p.reload(); await W(1800); const c = await titleColor(); if (c !== 'rgb(242, 238, 232)') throw new Error(c); });
  await t('« Auto » suit le téléphone (ici clair)', async () => {
    await openSettings(); await p.getByRole('radio', { name: 'Thème Auto' }).click(); await W(300);
    await p.getByRole('button', { name: 'Fermer les réglages' }).click(); await W(400);
    const c = await titleColor(); if (c !== 'rgb(20, 20, 18)') throw new Error(c);
  });
  await t('masquer les montants : budget et comptes', async () => {
    await openSettings(); await p.getByRole('switch', { name: 'Masquer les montants' }).click(); await W(300);
    await p.getByRole('button', { name: 'Fermer les réglages' }).click(); await W(400);
    await p.getByLabel('Disponible : montant masqué, prélèvements à venir déduits').waitFor();
    await p.getByRole('tab', { name: /Comptes/ }).click(); await W(400);
    await p.getByLabel('Total masqué').waitFor();
    if (await p.getByText('964,33', { exact: false }).count()) throw new Error('solde visible');
    await shot('st3');
    await p.getByRole('tab', { name: /Budget/ }).click(); await W(300);
  });
  await t('tout effacer : confirmation, puis retour à l’accueil, stockage vidé', async () => {
    await openSettings();
    await p.getByRole('button', { name: 'Tout effacer' }).click(); await W(200);
    await p.getByText('Tout effacer de ce navigateur ?').waitFor();
    await p.getByRole('button', { name: 'Confirmer : tout effacer' }).click(); await W(1200);
    await p.getByText('sans le carnet.').waitFor();
    const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('nokori:')));
    if (keys.length) throw new Error('reste : ' + keys.join(', '));
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
