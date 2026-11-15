// Captures brutes de l'app web (taille iPhone 6,9 pouces : 440 × 956 points, ×3 = 1320 × 2868 pixels).
// Usage : node store/raw.js light|dark  (après npx expo export --platform web --output-dir dist)
const { chromium } = require('playwright');
const path = require('path');
const serve = require('../e2e/serve');
const SEED = require('./seed');
const theme = process.argv[2] === 'dark' ? 'dark' : 'light';
const out = n => path.join(__dirname, 'raw', `${theme}-${n}.png`);

(async () => {
  require('fs').mkdirSync(path.join(__dirname, 'raw'), { recursive: true });
  const srv = await serve(8097);
  const b = await chromium.launch();
  const p = await (await b.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, colorScheme: theme, reducedMotion: 'reduce' })).newPage();
  p.setDefaultTimeout(8000);
  await p.clock.setFixedTime(new Date(2026, 10, 14, 10, 0, 0));
  const W = ms => p.waitForTimeout(ms), shot = n => p.screenshot({ path: out(n) });
  await p.goto('http://localhost:8097/');
  await p.evaluate(s => localStorage.setItem('nokori:state', JSON.stringify({ ...s, prefs: { ...s.prefs, lock: false } })), SEED);
  await p.goto('http://localhost:8097/'); await W(2000);
  await shot('1-budget');
  await p.getByRole('button', { name: 'Ajouter une dépense' }).click(); await W(700);
  for (const k of ['2', '4', 'Virgule', '5', '0']) { await p.getByRole('button', { name: k, exact: true }).click(); await W(60); }
  await p.getByRole('button', { name: 'Restos et sorties, Envies' }).click();
  await p.getByLabel('Libellé de la dépense').fill('Dîner entre amis'); await p.keyboard.press('Tab'); await W(300);
  await shot('2-depense');
  await p.goto('http://localhost:8097/'); await W(1800);
  await p.getByRole('tab', { name: 'Calendrier' }).click(); await W(600);
  await p.getByRole('button', { name: /^11 novembre/ }).click(); await W(400);
  await shot('3-calendrier');
  await p.getByRole('tab', { name: /Objectifs/ }).click(); await W(600);
  await shot('4-objectifs');
  await p.getByRole('tab', { name: /Bilan/ }).click(); await W(500);
  await p.getByRole('tab', { name: 'Octobre' }).click(); await W(500);
  await shot('5-bilan');
  await p.getByRole('tab', { name: /Comptes/ }).click(); await W(600);
  await shot('6-comptes');
  await p.getByRole('tab', { name: /Activité/ }).click(); await W(600);
  await shot('7-activite');
  await b.close(); srv.close();
  console.log('captures dans store/raw/');
})();
