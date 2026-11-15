// Onglet Comptes, saisie à la main (date figée au 14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 300)); } };
const SEED = { v: 1, dismissed: [], expenses: [], accounts: [], profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [] } };

(async () => {
  const srv = await serve(8094);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
  p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  await p.goto('http://localhost:8094/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.reload(); await W(1800);
  const add = async (name, kind, bal) => {
    await p.getByRole('button', { name: 'Ajouter un compte' }).first().click(); await W(200);
    await p.getByLabel('Nom du compte').fill(name);
    await p.getByRole('button', { name: kind, exact: true }).click();
    await p.getByLabel('Solde du compte').fill(bal);
    await p.getByRole('button', { name: 'Enregistrer le compte' }).click(); await W(300);
  };
  const total = () => p.locator('[aria-label^="Total de vos comptes"]').getAttribute('aria-label');

  await t('onglet Comptes, état vide', async () => { await p.getByRole('tab', { name: /Comptes/ }).click(); await W(500); await p.getByText('Aucun compte pour l’instant').waitFor(); });
  await t('ajout du compte courant et du Livret A', async () => {
    await add('Compte courant', 'Compte courant', '964,33');
    await add('Livret A', 'Livret', '6 450');
    await p.getByText('mis à jour aujourd’hui').first().waitFor();
  });
  await t('total : 7 414,33 €', async () => { if ((await total()) !== 'Total de vos comptes : 7 414,33 €') throw new Error(await total()); await shot('k1'); });
  await t('solde invalide : message et « Enregistrer » bloqué', async () => {
    await p.getByRole('button', { name: /^Compte courant, 964,33/ }).click(); await W(200);
    await p.getByLabel('Solde du compte').fill('1,234');
    await p.getByText('Solde invalide').waitFor();
    if (!(await p.getByRole('button', { name: 'Enregistrer le compte' }).isDisabled())) throw new Error('bouton actif');
  });
  await t('découvert : −120 €, total 6 330,00 €', async () => {
    await p.getByLabel('Solde du compte').fill('-120');
    await p.getByRole('button', { name: 'Enregistrer le compte' }).click(); await W(300);
    if ((await total()) !== 'Total de vos comptes : 6 330,00 €') throw new Error(await total());
    await p.getByText('−120,00 €').first().waitFor(); await shot('k2');
  });
  await t('nom hostile affiché comme du texte', async () => {
    await add('<img src=x onerror="window.__x=1">PEA', 'Placement', '4870');
    if (await p.locator('img[src="x"]').count()) throw new Error('balise injectée');
    await p.getByText('Placements', { exact: true }).waitFor();
  });
  await t('suppression avec confirmation', async () => {
    await p.getByRole('button', { name: /PEA, 4.870,00/ }).click(); await W(200);
    await p.getByRole('button', { name: /^Supprimer .*PEA$/ }).click(); await W(200);
    await p.getByText('Supprimer ce compte ?').waitFor();
    await p.getByRole('button', { name: /^Confirmer la suppression de .*PEA$/ }).click(); await W(300);
    if (await p.getByText('Placements', { exact: true }).count()) throw new Error('compte encore là');
  });
  await t('gardés après rechargement', async () => {
    await p.reload(); await W(1800); await p.getByRole('tab', { name: /Comptes/ }).click(); await W(500);
    if ((await total()) !== 'Total de vos comptes : 6 330,00 €') throw new Error(await total());
  });
  await t('aucune injection exécutée, aucune erreur', async () => {
    if (await p.evaluate(() => window.__x)) throw new Error('script exécuté');
    if (errs.length) throw new Error(errs.slice(0, 2).join(' | '));
  });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
