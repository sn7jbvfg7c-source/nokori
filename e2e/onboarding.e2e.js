// Parcours complet de l'accueil dans la version web, date figée au 14 novembre 2026
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n')[0].slice(0, 160)); } };
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what} : « ${a} » au lieu de « ${b} »`); };
(async () => {
  const srv = await serve(8099);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  p.on('dialog', d => { errs.push('boîte de dialogue : ' + d.message()); d.dismiss(); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  const btn = name => p.getByRole('button', { name, exact: true });
  await p.goto('http://localhost:8099/'); await W(2000);

  await t('premier lancement : redirection vers l’accueil', async () => { await p.getByText('sans le carnet.').waitFor(); await shot('o0'); await btn('Commencer').click(); await W(300); });
  await t('« Continuer » bloqué tant que le revenu est vide', async () => { if (!(await btn('Continuer').isDisabled())) throw new Error('bouton actif'); });
  await t('revenu invalide signalé', async () => { await p.getByLabel('Revenu mensuel').fill('12,345'); await p.getByText('Montant invalide').waitFor(); });
  await t('revenu et jour de paie', async () => { await p.getByLabel('Revenu mensuel').fill('2 480'); await btn('le 25').click(); await shot('o1'); await btn('Continuer').click(); await W(300); });
  await t('épargne 20 % = 496 €', async () => { await p.getByLabel('Épargne : 496 € par mois').waitFor(); await shot('o2'); await btn('Continuer').click(); await W(300); });
  await t('charges : liste vide au départ', async () => { await p.getByText('Aucune charge choisie').waitFor(); await shot('o3a'); });
  await t('charges : recherche « loyer », ajout, montant et jour', async () => {
    await p.getByLabel('Rechercher une charge').fill('loyer'); await W(200);
    await p.getByRole('checkbox', { name: 'Ajouter Loyer' }).click();
    await p.getByLabel('Montant Loyer').fill('780');
    for (let i = 0; i < 4; i++) await p.getByLabel('Loyer : jour suivant').click();
    await p.getByText('780,00 €, chaque mois le 5').waitFor();
  });
  await t('charges : salle de sport toutes les 4 semaines', async () => {
    await p.getByLabel('Rechercher une charge').fill('salle'); await W(200);
    await p.getByRole('checkbox', { name: 'Ajouter Salle de sport' }).click();
    await p.getByLabel('Montant Salle de sport').fill('29,99');
    await btn('4 semaines').click();
    for (let i = 0; i < 11; i++) await p.getByLabel('Salle de sport : jour suivant').click();
    await p.getByText('toutes les 4 semaines, prochain le 12').waitFor();
  });
  await t('charges : ajout à la main, nom hostile neutralisé', async () => {
    await p.getByLabel('Rechercher une charge').fill(''); await W(200);
    await btn('Ajouter une charge à la main').click();
    await p.getByLabel('Nom de la charge').fill('<img src=x onerror="window.__xss=1">Cantine');
    await p.getByLabel('Montant de la charge').fill('45');
    await p.getByRole('button', { name: 'Ajouter la charge' }).click(); await W(300);
    if (await p.locator('img[src="x"]').count()) throw new Error('balise injectée');
    await p.getByText('Ajoutées à la main').waitFor();
  });
  await t('total des charges : 780 + 32,49 + 45 = 857,49 €', async () => { eq((await p.getByLabel('Total des charges par mois').innerText()).replace(/\s/g, ' '), '857,49 € / mois', 'total'); await shot('o3b'); await btn('Continuer').click(); await W(300); });
  await t('récapitulatif : reste à vivre 1 127 €, ≈ 38 € par jour', async () => {
    await p.getByText('1 127 €').waitFor(); await p.getByLabel('Environ 38 € par jour').waitFor(); await shot('o4');
  });
  await t('ouvrir le budget', async () => { await btn('Ouvrir mon budget').click(); await W(1200); await p.getByText('kaki, la couleur du mois').waitFor(); await shot('b1'); });
  await t('les réponses sont gardées après rechargement', async () => { await p.reload(); await W(2000); await p.getByText('kaki, la couleur du mois').waitFor(); });
  await t('modifier ses réponses reprend les valeurs', async () => {
    await btn('Modifier mes réponses').click(); await W(500); await btn('Commencer').click(); await W(300);
    eq(await p.getByLabel('Revenu mensuel').inputValue(), '2 480,00', 'revenu repris');
  });
  await t('aucun débordement horizontal sur téléphone', async () => {
    const w = await p.evaluate(() => { const inScroller = e => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth) return true; } return false; }; return [document.documentElement.scrollWidth, document.documentElement.clientWidth, Math.max(0, ...[...document.querySelectorAll('*')].filter(e => !inScroller(e)).map(e => e.getBoundingClientRect().right))]; });
    if (w[0] > w[1] + 1 || w[2] > 394) throw new Error('largeur ' + w.join(' / '));
  });
  await t('aucune injection exécutée, aucune erreur', async () => {
    if (await p.evaluate(() => window.__xss)) throw new Error('script exécuté');
    if (errs.length) throw new Error(errs.slice(0, 2).join(' | '));
  });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
