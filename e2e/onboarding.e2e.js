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
  await t('retour au budget sans rien changer', async () => { await btn('Passer').click(); await W(300); await btn('Ouvrir mon budget').click(); await W(1000); await p.getByText('kaki, la couleur du mois').waitFor(); });
  const envies = async () => (await p.locator('[aria-label^="Envies : il reste"]').first().getAttribute('aria-label'));
  let before = '';
  await t('dépense : « Ajouter » bloqué sans montant ni catégorie', async () => {
    before = await envies();
    await p.getByRole('button', { name: 'Ajouter une dépense' }).click(); await W(600);
    if (!(await p.getByRole('button', { name: 'Ajouter la dépense' }).isDisabled())) throw new Error('bouton actif');
  });
  await t('dépense : pavé borné (2 décimales, 100 000 € au plus)', async () => {
    for (const k of ['9', '9', '9', '9', '9', '9', '9']) await btn(k).click();
    await p.getByLabel('Montant : 99 999,00 €').waitFor();
    for (let i = 0; i < 5; i++) await btn('Effacer').click();
    for (const k of ['4', 'Virgule', '8', '0', '5']) await btn(k).click();
    await p.getByLabel('Montant : 4,80 €').waitFor();
  });
  await t('dépense : café 4,80 € en Envies, libellé hostile neutralisé', async () => {
    await p.getByRole('button', { name: 'Restos et sorties, Envies' }).click();
    await p.getByLabel('Libellé de la dépense').fill('<b onmouseover=alert(1)>Café');
    await shot('d1');
    await p.getByRole('button', { name: 'Ajouter la dépense' }).click(); await W(900);
    await p.getByText('b onmouseover=alert(1)Café, 4,80 € ajouté en Envies').waitFor();
    await shot('d2');
  });
  await t('dépense : le pilier Envies baisse de 4,80 €', async () => {
    const after = await envies();
    if (after === before) throw new Error('inchangé : ' + after);
  });
  await t('dépense : « Annuler » retire la dépense', async () => {
    await p.getByRole('button', { name: 'Annuler l’ajout' }).click(); await W(500);
    eq(await envies(), before, 'Envies après annulation');
  });
  await t('dépense : ajout d’un vrai café, gardé après rechargement', async () => {
    await p.getByRole('button', { name: 'Ajouter une dépense' }).click(); await W(500);
    for (const k of ['4', 'Virgule', '8']) await btn(k).click();
    await p.getByRole('button', { name: 'Restos et sorties, Envies' }).click();
    await p.getByLabel('Libellé de la dépense').fill('Café');
    await p.getByRole('button', { name: 'Ajouter la dépense' }).click(); await W(800);
    await p.reload(); await W(1800);
    if ((await envies()) === before) throw new Error('dépense perdue');
  });
  await t('calendrier : novembre en cours, le café du 14 dans la journée', async () => {
    await p.getByRole('tab', { name: 'Calendrier' }).click(); await W(500);
    await p.getByText('Novembre 2026').waitFor(); await p.getByText('en cours').waitFor();
    await p.getByText('Café', { exact: true }).waitFor(); await shot('c1');
  });
  await t('calendrier : décembre prévu, la salle de sport le 10, budget libre 1 129 €', async () => {
    await p.getByRole('button', { name: 'Mois suivant' }).click(); await W(400);
    await p.getByText('Décembre 2026').waitFor(); await p.getByText('prévu', { exact: true }).waitFor();
    await p.getByText('pin, la couleur de décembre').waitFor();
    await p.getByLabel('Budget libre 1 129 €').waitFor();
    await p.getByRole('button', { name: '10 décembre, 1 charge fixe' }).click(); await W(300);
    await p.getByText('Salle de sport').waitFor(); await p.getByText('charge fixe, prévue').waitFor(); await shot('c2');
  });
  await t('calendrier : de octobre (clos) à février au plus', async () => {
    for (let i = 0; i < 2; i++) await p.getByRole('button', { name: 'Mois suivant' }).click();
    await p.getByText('Février 2027').waitFor();
    if (!(await p.getByRole('button', { name: 'Mois suivant' }).isDisabled())) throw new Error('au-delà de +3 mois');
    for (let i = 0; i < 4; i++) await p.getByRole('button', { name: 'Mois précédent' }).click();
    await p.getByText('Octobre 2026').waitFor(); await p.getByText('clos', { exact: true }).waitFor();
  });
  await t('aucun débordement horizontal sur téléphone', async () => {
    const w = await p.evaluate(() => { const inScroller = e => { for (let a = e.parentElement; a; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll)/.test(s.overflowX) && a.scrollWidth > a.clientWidth) return true; } return false; }; return [document.documentElement.scrollWidth, document.documentElement.clientWidth, Math.max(0, ...[...document.querySelectorAll('*')].filter(e => !inScroller(e)).map(e => e.getBoundingClientRect().right))]; });
    if (w[0] > w[1] + 1 || w[2] > 394) throw new Error('largeur ' + w.join(' / '));
  });
  await t('un seul écran Budget dans la pile', async () => { eq(await p.getByRole('button', { name: 'Ajouter une dépense' }).count(), 1, 'écrans Budget'); });
  await t('aucune injection exécutée, aucune erreur', async () => {
    if (await p.evaluate(() => window.__xss)) throw new Error('script exécuté');
    if (errs.length) throw new Error(errs.slice(0, 2).join(' | '));
  });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
