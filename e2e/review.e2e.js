// Onglet Bilan et story du mois clos (date figée au 14 novembre 2026)
const { chromium } = require('playwright');
const serve = require('./serve');
const r = []; let ko = 0;
const t = async (n, f) => { try { await f(); r.push('✓ ' + n); } catch (e) { ko++; r.push('✗ ' + n + ' : ' + e.message.split('\n').slice(0, 3).join(' ').slice(0, 260)); } };
const SEED = {
  v: 1, dismissed: [], accounts: [], goals: [], notes: {},
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [
    { id: 'a', date: '2026-10-03', label: 'Courses', categoryId: 'courses', amount: 30000 },
    { id: 'b', date: '2026-10-12', label: 'Restaurant', categoryId: 'restos', amount: 12000 },
    { id: 'c', date: '2026-10-20', label: 'Cinéma', categoryId: 'culture', amount: 5000 },
    { id: 'd', date: '2026-11-10', label: 'Marché', categoryId: 'courses', amount: 4000 },
  ],
};

(async () => {
  const srv = await serve(8091);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 2 })).newPage();
  p.setDefaultTimeout(6000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: `e2e/${n}.png` });
  await p.goto('http://localhost:8091/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED);
  await p.reload(); await W(1800);

  await t('novembre en cours : 496 € épargnés (prévus dès la paie)', async () => {
    await p.getByRole('tab', { name: /Bilan/ }).click(); await W(500);
    await p.getByText('Novembre, en cours').waitFor();
    await p.getByLabel('496 € épargnés').waitFor();
    await p.getByText('Combien est-ce que je veux épargner ?').waitFor();
    await shot('r1');
  });
  await t('octobre clos : 1 230 € épargnés, 50 % du revenu', async () => {
    await p.getByRole('tab', { name: 'Octobre' }).click(); await W(400);
    await p.getByText('Octobre, clos').waitFor();
    await p.getByLabel(/^1.23\d.€ épargnés$/).waitFor();
    await p.getByText(/^50 % du revenu/).waitFor();
    await p.getByText('Combien voulais-je épargner ?').waitFor();
  });
  await t('note « comment faire mieux » nettoyée et enregistrée', async () => {
    await p.getByLabel('Comment faire mieux en octobre').fill('Moins de livraisons <b>le soir</b>');
    await p.getByRole('button', { name: 'Enregistrer la note' }).click(); await W(300);
    await p.reload(); await W(1800); await p.getByRole('tab', { name: /Bilan/ }).click(); await W(400); await p.getByRole('tab', { name: 'Octobre' }).click(); await W(300);
    const v = await p.getByLabel('Comment faire mieux en octobre').inputValue();
    if (v !== 'Moins de livraisons ble soir/b') throw new Error('« ' + v + ' »');
    await shot('r2');
  });
  await t('story : 5 écrans, du kanji aux quatre questions', async () => {
    await p.getByRole('button', { name: 'Revoir octobre en story' }).click(); await W(600);
    await p.getByText('Votre mois,', { exact: false }).waitFor(); await shot('s1');
    await p.getByRole('button', { name: 'Écran suivant' }).click(); await W(300);
    await p.getByLabel(/^Épargné : 1.23\d.€$/).waitFor(); await shot('s2');
    await p.getByRole('button', { name: 'Écran suivant' }).click(); await W(300);
    await p.getByText('Le pilier qui a le plus pesé').waitFor(); await p.getByText('Besoins', { exact: true }).last().waitFor(); await shot('s3');
    await p.getByRole('button', { name: 'Écran suivant' }).click(); await W(300);
    await p.getByText(/Moins de livraisons/).last().waitFor();
    await p.getByRole('button', { name: 'Écran suivant' }).click(); await W(300);
    await p.getByRole('button', { name: 'Préparer novembre' }).waitFor(); await shot('s5');
    await p.getByRole('button', { name: 'Préparer novembre' }).click(); await W(500);
    if (await p.getByRole('button', { name: 'Préparer novembre' }).count()) throw new Error('story encore ouverte');
  });
  await t('story : avance seule après 4 secondes', async () => {
    await p.getByRole('button', { name: 'Revoir octobre en story' }).click(); await W(600);
    await p.getByText('Votre mois,', { exact: false }).waitFor();
    await W(4500);
    await p.getByText('Vous avez épargné').waitFor();
    await p.getByRole('button', { name: 'Fermer la story' }).click(); await W(400);
  });
  await t('aucune erreur', async () => { if (errs.length) throw new Error(errs.slice(0, 2).join(' | ')); });
  await b.close(); srv.close();
  console.log(r.join('\n') + '\n' + (ko ? ko + ' échec(s)' : `tout ✓ (${r.length})`));
  process.exit(ko ? 1 : 0);
})();
