// Activité et barre d'onglets, avec des données préparées sur deux mois (date figée au 14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n')[0].slice(0, 160)); } };
const eq = (a, b, what) => { if (a !== b) throw new Error(`${what} : « ${a} » au lieu de « ${b} »`); };

const SEED = {
  v: 1, dismissed: [],
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [
    { id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' },
    { id: 'netflix', name: 'Netflix', group: 'abos', amount: 1499, day: 10, freq: 'mois' },
  ] },
  expenses: [
    { id: 'd1', date: '2026-10-13', label: 'Disney+', categoryId: 'loisirs', amount: 1099 },
    { id: 'd2', date: '2026-11-13', label: 'Disney+', categoryId: 'loisirs', amount: 1099 },
    { id: 's1', date: '2026-10-21', label: 'Deezer', categoryId: 'loisirs', amount: 1199 },
    { id: 's2', date: '2026-11-03', label: 'Deezer', categoryId: 'loisirs', amount: 1199 },
    { id: 'c1', date: '2026-11-14', label: 'Café', categoryId: 'restos', amount: 480 },
    { id: 'p1', date: '2026-11-12', label: 'Pathé', categoryId: 'culture', amount: 2200 },
  ],
};

(async () => {
  const srv = await serve(8097);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
  p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  await p.goto('http://localhost:8097/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.reload(); await W(1800);
  const tab = name => p.getByRole('tab', { name: new RegExp(name) }).first();

  await t('barre d’onglets : Budget et Activité', async () => { await p.getByText('kaki, la couleur du mois').waitFor(); await tab('Activité').click(); await W(600); await p.getByText('Activité', { exact: true }).first().waitFor(); });
  await t('dépense régulière repérée (2 mois de suite)', async () => {
    await p.getByText('Dépense régulière repérée').waitFor();
    await p.getByText('2 mois de suite', { exact: false }).waitFor(); await shot('a1');
  });
  await t('liste du plus récent au plus ancien, charges passées incluses', async () => {
    const titles = await p.locator('text=/^(Aujourd’hui|Hier|[a-z]{3,4}\\. \\d+ [a-zéû.]+)$/').allInnerTexts();
    eq(titles.slice(0, 3).join(' | '), 'Aujourd’hui | Hier | jeu. 12 nov.', 'jours');
    await p.getByText('charge fixe, logement').first().waitFor();
  });
  await t('filtre Culture : seulement Pathé', async () => {
    await p.getByRole('button', { name: 'Culture', exact: true }).click(); await W(300);
    eq(await p.getByRole('button', { name: /, Livres et sorties culturelles,/ }).count(), 1, 'lignes Culture');
    if (await p.getByText('Café', { exact: true }).count()) throw new Error('Café visible');
    await p.getByRole('button', { name: 'Tout', exact: true }).click(); await W(300);
  });
  await t('supprimer le café, avec confirmation', async () => {
    await p.getByRole('button', { name: /^Café, Restos et sorties/ }).click(); await W(200);
    await p.getByRole('button', { name: 'Supprimer Café' }).click(); await W(200);
    await p.getByText('Supprimer cette dépense ?').waitFor();
    await p.getByRole('button', { name: 'Confirmer la suppression de Café' }).click(); await W(500);
    eq(await p.getByText('Café', { exact: true }).count(), 0, 'Café restant');
  });
  const accept = async name => {
    const sugg = await p.locator('text=Dépense régulière repérée').count();
    if (!sugg) throw new Error('pas de suggestion');
    const which = await p.getByRole('button', { name: /^Ajouter .* aux charges fixes$/ }).getAttribute('aria-label');
    return which;
  };
  let first = '';
  await t('accepter la suggestion : devient une charge fixe, sans doublon ce mois-ci', async () => {
    first = (await accept()).replace(/^Ajouter | aux charges fixes$/g, '');
    await p.getByRole('button', { name: `Ajouter ${first} aux charges fixes` }).click(); await W(800);
    const rows = await p.getByRole('button', { name: new RegExp(`^${first.replace('+', '\\+')},`) }).count();
    const chargeRows = await p.getByText(new RegExp(`^${first.replace('+', '\\+')}$`)).count();
    // ce mois-ci : la charge remplace la dépense ; le mois dernier : la dépense reste
    if (rows !== 1) throw new Error(`${rows} dépense(s) ${first} au lieu d’une (celle du mois dernier)`);
    if (chargeRows < 2) throw new Error('charge du mois absente');
  });
  await t('la seconde suggestion apparaît, « Ignorer » la fait disparaître pour de bon', async () => {
    const second = (await accept()).replace(/^Ajouter | aux charges fixes$/g, '');
    if (second === first) throw new Error('même suggestion');
    await p.getByRole('button', { name: `Ignorer ${second}` }).click(); await W(500);
    eq(await p.getByText('Dépense régulière repérée').count(), 0, 'carte');
    await p.reload(); await W(1800); await tab('Activité').click(); await W(500);
    eq(await p.getByText('Dépense régulière repérée').count(), 0, 'carte après rechargement');
    await shot('a2');
  });
  await t('la charge acceptée tombe aussi en décembre dans le calendrier', async () => {
    await tab('Budget').click(); await W(500);
    await p.getByRole('tab', { name: 'Calendrier' }).click(); await W(400);
    await p.getByRole('button', { name: 'Mois suivant' }).click(); await W(400);
    const day = first === 'Disney+' ? 13 : 3;
    await p.getByRole('button', { name: new RegExp(`^${day} décembre, 1 charge fixe`) }).click(); await W(300);
    await p.getByText(first, { exact: true }).filter({ visible: true }).first().waitFor();
    await shot('a3');
  });
  await t('libellés de la barre d’onglets entiers (pas écrasés sous l’icône)', async () => {
    const h = await p.evaluate(() => Math.min(...[...document.querySelectorAll('[role="tab"] *')].filter(e => e.children.length === 0 && /^(Budget|Activité)$/.test(e.textContent.trim())).map(e => e.getBoundingClientRect().height)));
    if (!(h >= 13)) throw new Error('hauteur du libellé : ' + h + ' px');
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
