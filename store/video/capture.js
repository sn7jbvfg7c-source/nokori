// Captures des vrais écrans pour la vidéo de présentation (données d'exemple de store/seed.js, 14 novembre 2026).
// Usage : node store/video/capture.js   (après npx expo export --platform web --output-dir dist)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const serve = require('../../e2e/serve');
const SEED = require('../seed');
const OUT = path.join(__dirname, 'shots');

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve(8093);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })).newPage();
  p.setDefaultTimeout(8000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: path.join(OUT, n + '.png') });
  const taps = {};
  const box = async (loc, name) => { const r = await loc.boundingBox(); taps[name] = { x: (r.x + r.width / 2) / 440, y: (r.y + r.height / 2) / 956 }; };
  await p.goto('http://localhost:8093/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify({ ...s, prefs: { ...s.prefs, lock: false } })), SEED);
  await p.goto('http://localhost:8093/'); await W(2000);
  await shot('budget');
  await box(p.getByRole('button', { name: 'Ajouter une dépense' }).first(), 'add');
  await p.getByRole('button', { name: 'Ajouter une dépense' }).first().click(); await W(700);
  await shot('exp-0');
  const keys = [['2', '2'], ['4', '4'], ['Virgule', ','], ['5', '5'], ['0', '0']];
  let i = 1;
  for (const [label] of keys) {
    const k = p.getByRole('button', { name: label, exact: true });
    await box(k, 'k' + i);
    await k.click(); await W(120);
    await shot('exp-' + i); i++;
  }
  const cat = p.getByRole('button', { name: 'Restos et sorties, Envies' });
  await box(cat, 'cat'); await cat.click(); await W(200); await shot('exp-cat');
  const go = p.getByRole('button', { name: /^Ajouter la dépense/ });
  await box(go, 'go'); await go.click(); await W(500);
  await shot('budget-toast');
  await W(5600); // la confirmation disparaît avant les écrans suivants
  await p.getByRole('tab', { name: 'Calendrier' }).click(); await W(500);
  await p.getByRole('button', { name: /^11 novembre/ }).click(); await W(300);
  await shot('calendar');
  await p.getByRole('tab', { name: /Bilan/ }).click(); await W(500);
  await p.getByRole('button', { name: 'Bilan : mois d’avant' }).click(); await W(500);
  await shot('review');
  await p.getByRole('tab', { name: /Objectifs/ }).click(); await W(500);
  await shot('goals');
  fs.writeFileSync(path.join(OUT, 'taps.json'), JSON.stringify(taps, null, 2));
  await b.close(); srv.close();
  console.log('captures :', fs.readdirSync(OUT).join(', '));
})();
