// Conformité : pages légales, consentement aux traceurs, suppression des données, clavier, tailles d'écran (14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 4).join(' ').slice(0, 400)); } };
const SEED = { v: 1, dismissed: [], notes: {}, prefs: { theme: 'auto', lock: false, hideAmounts: false, alerts: false },
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [] }, expenses: [{ id: 'a', date: '2026-11-10', label: 'Marché', categoryId: 'courses', amount: 4000 }], accounts: [], goals: [] };
const DOCS = [['Mentions légales', true], ['Politique de confidentialité', true], ['Conditions d’utilisation', true], ['Politique de remboursement', true], ['Cookies et traceurs', false], ['Licences', false]];

(async () => {
  const srv = await serve(8097);
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 393, height: 852 } });
  const p = await ctx.newPage();
  p.setDefaultTimeout(8000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const W = ms => p.waitForTimeout(ms);
  const state = () => p.evaluate(() => JSON.parse(localStorage.getItem('nokori:state')));
  await p.goto('http://localhost:8097/');

  await t('premier lancement : liens vers la confidentialité et les conditions, sans case pré-cochée', async () => {
    await p.getByText('Aucun compte, aucune donnée collectée.', { exact: false }).waitFor();
    if (await p.locator('[role=checkbox][aria-checked=true]').count()) throw new Error('case cochée');
    await p.getByRole('link', { name: 'Confidentialité' }).click(); await W(600);
    await p.getByRole('heading', { name: 'Politique de confidentialité' }).waitFor();
    await p.keyboard.press('Escape'); await W(500);
    await p.getByText('sans le carnet.').waitFor();
  });
  await t('aucun bandeau de cookies (aucun traceur facultatif) et aucun cookie déposé', async () => {
    if (await p.getByText('Traceurs facultatifs').count()) throw new Error('bandeau affiché');
    if ((await ctx.cookies()).length) throw new Error('cookie déposé');
  });
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.goto('http://localhost:8097/'); await W(1800);
  await t('les six documents s’ouvrent depuis les réglages ; les manques sont signalés, rien n’est inventé', async () => {
    for (const [title, incomplete] of DOCS) {
      await p.getByRole('button', { name: 'Réglages' }).click(); await W(600);
      await p.getByRole('button', { name: new RegExp('^' + title) }).click(); await W(600);
      await p.getByRole('heading', { name: title }).waitFor();
      const flagged = await p.getByText('Document en préparation', { exact: false }).count();
      if (incomplete !== (flagged > 0)) throw new Error(`${title} : bandeau « en préparation » ${flagged ? 'présent' : 'absent'}`);
      await p.keyboard.press('Escape'); await W(400);
      // Échap ne ferme que la fenêtre du dessus : les réglages sont toujours là
      await p.getByRole('heading', { name: 'Réglages' }).waitFor();
      await p.keyboard.press('Escape'); await W(400);
    }
  });
  await t('mentions légales : champs manquants surlignés « [À compléter : …] »', async () => {
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(500);
    await p.getByRole('button', { name: /^Mentions légales/ }).click(); await W(500);
    const n = await p.getByText(/\[À compléter : /).count();
    if (n < 5) throw new Error(n + ' repères');
    await p.keyboard.press('Escape'); await W(300); await p.keyboard.press('Escape'); await W(400);
  });
  await t('pages légales lisibles sur petit téléphone et sur ordinateur (aucun débordement)', async () => {
    for (const [w, h] of [[320, 568], [1280, 800]]) {
      await p.setViewportSize({ width: w, height: h });
      await p.goto('http://localhost:8097/legal/confidentialite'); await W(1200);
      const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) throw new Error(`${w} px : débordement de ${over} px`);
    }
    await p.setViewportSize({ width: 393, height: 852 });
    await p.goto('http://localhost:8097/'); await W(1500);
  });
  await t('clavier : Tab atteint « Ajouter une dépense » avec un focus visible, Entrée ouvre, Échap ferme', async () => {
    let found = false;
    for (let i = 0; i < 25 && !found; i++) {
      await p.keyboard.press('Tab');
      found = await p.evaluate(() => document.activeElement?.getAttribute('aria-label') === 'Ajouter une dépense');
    }
    if (!found) throw new Error('bouton non atteint au clavier');
    const ring = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle !== 'none' && s.outlineWidth !== '0px' ? 'outline' : s.boxShadow !== 'none' ? 'ombre' : ''; });
    if (!ring) throw new Error('focus invisible');
    await p.keyboard.press('Enter'); await W(700);
    await p.getByText('Nouvelle dépense').waitFor();
    await p.keyboard.press('Escape'); await W(600);
    if (await p.getByText('Nouvelle dépense').count()) throw new Error('fenêtre encore ouverte');
  });
  await t('bandeau (traceur d’exemple) : trois choix de même taille, rien d’autorisé avant le choix', async () => {
    await p.evaluate(() => localStorage.setItem('nokori:test-traceur', '1'));
    await p.goto('http://localhost:8097/'); await W(1500);
    await p.getByText('Traceurs facultatifs').waitFor();
    const boxes = [];
    for (const n of ['Tout refuser', 'Personnaliser', 'Tout accepter']) boxes.push(await p.getByRole('button', { name: n, exact: true }).boundingBox());
    if (boxes.some(x => Math.abs(x.height - boxes[0].height) > 1 || Math.abs(x.width - boxes[0].width) > 2)) throw new Error(JSON.stringify(boxes.map(x => [Math.round(x.width), Math.round(x.height)])));
    if ((await state()).prefs.consent) throw new Error('choix enregistré avant toute action');
  });
  await t('« Tout refuser » : rien n’est autorisé, le choix est gardé après rechargement', async () => {
    await p.getByRole('button', { name: 'Tout refuser', exact: true }).click(); await W(400);
    const c = (await state()).prefs.consent;
    if (!c || c.allowed.exemple !== false) throw new Error(JSON.stringify(c));
    await p.reload(); await W(1500);
    if (await p.getByText('Traceurs facultatifs').count()) throw new Error('bandeau réaffiché');
  });
  await t('modifier son choix à tout moment : « Personnaliser », rien de coché par défaut', async () => {
    await p.goto('http://localhost:8097/legal/cookies'); await W(1200);
    await p.getByRole('button', { name: /Modifier mes choix/ }).click(); await W(500);
    await p.getByRole('button', { name: 'Personnaliser', exact: true }).click(); await W(300);
    const sw = p.getByRole('switch', { name: 'Autoriser Exemple de test' });
    if (await sw.isChecked()) throw new Error('pré-coché');
    await sw.click(); await p.getByRole('button', { name: 'Enregistrer mes choix' }).click(); await W(400);
    if ((await state()).prefs.consent.allowed.exemple !== true) throw new Error('choix non enregistré');
    await p.evaluate(() => localStorage.removeItem('nokori:test-traceur'));
  });
  await t('suppression des données : confirmation demandée, puis confirmation affichée et plus rien de stocké', async () => {
    await p.goto('http://localhost:8097/'); await W(1500);
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(600);
    await p.getByRole('button', { name: /^Supprimer toutes mes données/ }).click(); await W(300);
    await p.getByText('L’éditeur n’en a aucune copie', { exact: false }).waitFor();
    await p.getByRole('button', { name: /^Confirmer : tout effacer/ }).click(); await W(1500);
    await p.getByText('Toutes vos données ont été supprimées').waitFor();
    const keys = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('nokori:')));
    if (keys.length) throw new Error('reste : ' + keys.join(', '));
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
