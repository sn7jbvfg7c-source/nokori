// Audit d'accessibilité automatique (axe-core) : chaque écran, en clair et en sombre.
// Règles écartées :
//  - « region » (repères de page web : header, main…) : n'existe pas sur iPhone et Android ;
//  - « label-content-name-mismatch » : sur le web, React Native colle les textes voisins sans espace
//    (« Compte courantmis à jour… »), d'où de fausses alertes. Elle est remplacée par labelInName() :
//    chaque texte visible d'un bouton (hors décor aria-hidden) doit se retrouver dans son nom, pour la commande vocale.
const { chromium } = require('playwright');
const path = require('path');
const serve = require('./serve');
const AXE = path.join(path.dirname(require.resolve('axe-core')), 'axe.min.js');
const SEED = theme => ({
  v: 1, dismissed: [], notes: { '2026-10': 'Moins de restos' },
  prefs: { theme: 'auto', lock: false, hideAmounts: false, alerts: false },
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.2, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [
    { id: 'a', date: '2026-10-03', label: 'Courses', categoryId: 'courses', amount: 30000 },
    { id: 'b', date: '2026-10-12', label: 'Restaurant', categoryId: 'restos', amount: 12000 },
    { id: 'd', date: '2026-11-10', label: 'Marché', categoryId: 'courses', amount: 4000 },
  ],
  accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: 96433, updated: '2026-11-14' }],
  goals: [{ id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 90000, monthly: 20000 }],
});

(async () => {
  const srv = await serve(8092);
  const b = await chromium.launch();
  const all = []; let ko = 0;
  for (const theme of ['light', 'dark']) {
    const p = await (await b.newContext({ viewport: { width: 393, height: 852 }, colorScheme: theme })).newPage();
    p.setDefaultTimeout(6000);
    await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
    const W = ms => p.waitForTimeout(ms);
    const audit = async name => {
      await p.addScriptTag({ path: AXE }).catch(() => {});
      const v = await p.evaluate(async () => (await window.axe.run(document, { resultTypes: ['violations'], rules: { region: { enabled: false }, 'label-content-name-mismatch': { enabled: false } } })).violations
        .map(x => ({ id: x.id, impact: x.impact, help: x.help, n: x.nodes.length, ex: x.nodes.slice(0, 3).map(n => (n.failureSummary || '').split('\n').pop().trim() + ' ← ' + (n.html || '').slice(0, 140)) })));
      const mism = await p.evaluate(() => {
        const norm = t => t.toLowerCase().replace(/[\s\u00a0]+/g, ' ').replace(/[.,:;·’'()+›‹×−-]/g, '').trim();
        const out = [];
        for (const el of document.querySelectorAll('[aria-label][role="button"], button[aria-label], [aria-label][role="tab"], [aria-label][role="radio"], [aria-label][role="switch"]')) {
          if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
          const name = norm(el.getAttribute('aria-label'));
          const walk = n => n.nodeType === 3 ? [n.nodeValue] : (n.getAttribute && n.getAttribute('aria-hidden') === 'true') ? [] : [...n.childNodes].flatMap(walk);
          for (const t of walk(el).map(norm).filter(t => t.length > 1)) if (!name.includes(t)) { out.push(`« ${t} » absent de « ${el.getAttribute('aria-label')} »`); break; }
        }
        return out;
      });
      if (mism.length) v.push({ id: 'label-in-name', impact: 'serious', help: 'Le texte visible doit faire partie du nom (commande vocale)', n: mism.length, ex: mism.slice(0, 4) });
      all.push({ screen: `${theme} · ${name}`, v }); if (v.length) ko += v.length;
    };
    await p.goto('http://localhost:8092/');
    await p.evaluate(() => localStorage.clear()); await p.reload(); await W(1800);
    await audit('accueil');
    await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify(s)), SEED(theme));
    await p.goto('http://localhost:8092/'); await W(1800);
    await audit('budget');
    await p.getByRole('tab', { name: 'Calendrier' }).click(); await W(500);
    await audit('calendrier');
    for (const tab of ['Activité', 'Comptes', 'Objectifs', 'Bilan']) {
      await p.getByRole('tab', { name: new RegExp(tab) }).click(); await W(500);
      await audit(tab.toLowerCase());
      if (tab === 'Comptes') { await p.getByRole('button', { name: /^Compte courant,/ }).click(); await W(400); await audit('modifier un compte'); await p.getByRole('button', { name: 'Annuler' }).filter({ visible: true }).click(); await W(300); }
      if (tab === 'Objectifs') { await p.getByRole('button', { name: /modifier Japon/ }).click(); await W(400); await audit('modifier un objectif'); await p.getByRole('button', { name: 'Annuler' }).filter({ visible: true }).click(); await W(300); }
    }
    await p.getByRole('button', { name: 'Bilan : mois d’avant' }).click(); await W(400);
    await audit('bilan octobre');
    await p.getByRole('button', { name: 'Revoir octobre en story' }).click(); await W(800);
    await audit('story'); await p.goto('http://localhost:8092/'); await W(1800);
    await p.getByRole('button', { name: 'Réglages' }).click(); await W(700);
    await audit('réglages');
    await p.getByRole('button', { name: /^Sauvegarde et restauration/ }).click(); await W(700);
    await audit('sauvegarde'); await p.getByRole('button', { name: 'Fermer la sauvegarde' }).click(); await W(500);
    await p.getByRole('button', { name: /^Mentions légales/ }).click(); await W(700);
    await audit('mentions légales'); await p.keyboard.press('Escape'); await W(500);
    await p.getByRole('button', { name: 'Fermer les réglages' }).click(); await W(500);
    await p.evaluate(() => localStorage.setItem('nokori:test-traceur', '1')); await p.goto('http://localhost:8092/'); await W(1800);
    await audit('bandeau de consentement');
    await p.getByRole('button', { name: 'Personnaliser', exact: true }).click(); await W(300);
    await audit('bandeau personnalisé');
    await p.getByRole('button', { name: 'Tout refuser', exact: true }).click(); await W(300);
    await p.evaluate(() => localStorage.removeItem('nokori:test-traceur'));
    await p.getByRole('button', { name: /Ajouter une dépense/ }).first().click(); await W(700);
    await audit('dépense');
    await p.context().close();
  }
  await b.close(); srv.close();
  for (const s of all) {
    console.log((s.v.length ? '✗ ' : '✓ ') + s.screen);
    for (const x of s.v) { console.log(`   [${x.impact}] ${x.id} (${x.n}) ${x.help}`); x.ex.forEach(e => console.log('      ' + e)); }
  }
  console.log(ko ? ko + ' problème(s)' : `tout ✓ (${all.length})`);
  process.exit(ko ? 1 : 0);
})();
