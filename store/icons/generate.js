// Génère l'icône de Nokori (caractère 残 sur un dégradé kaki) et ses déclinaisons dans assets/.
// Police : Noto Sans JP Bold (SIL Open Font License 1.1, © Google), à télécharger à part, par exemple :
//   npm pack @expo-google-fonts/noto-sans-jp@0.4.4 && tar xzf expo-google-fonts-noto-sans-jp-0.4.4.tgz
// Usage : node store/icons/generate.js <chemin/NotoSansJP_700Bold.ttf> assets
// Un dessin rendu en image à partir d'une police OFL n'est pas soumis à l'OFL (FAQ OFL, points 1.12 et 1.13).
const { chromium } = require('playwright');
const FONT = process.argv[2], OUT = process.argv[3];
const grad = 'linear-gradient(145deg, #D9663B 0%, #C5502A 45%, #A3361A 100%)';
const glyph = (size, color, shadow) => `<div style="font-family:K;font-weight:700;font-size:${size}px;line-height:1;color:${color};${shadow ? 'text-shadow:0 ' + size * 0.02 + 'px ' + size * 0.05 + 'px rgba(80,20,5,.25);' : ''}transform:translateY(-2%)">残</div>`;
const page = (w, bg, inner, radius = 0) => `<html><head><style>@font-face{font-family:K;src:url(file://${FONT})}html,body{margin:0;background:transparent}</style></head><body><div style="width:${w}px;height:${w}px;display:flex;align-items:center;justify-content:center;background:${bg};border-radius:${radius}px;overflow:hidden">${inner}</div></body></html>`;
const items = [
  ['icon.png', 1024, page(1024, grad, glyph(600, '#FFF8F0', true)), false],
  ['android-icon-background.png', 1024, page(1024, grad, ''), false],
  ['android-icon-foreground.png', 1024, page(1024, 'transparent', glyph(400, '#FFF8F0', true)), true],
  ['android-icon-monochrome.png', 1024, page(1024, 'transparent', glyph(400, '#FFFFFF', false)), true],
  ['splash-icon.png', 1024, page(1024, 'transparent', '<div style="width:680px;height:680px;border-radius:155px;background:' + grad + ';display:flex;align-items:center;justify-content:center">' + glyph(400, '#FFF8F0', true) + '</div>'), true],
  ['favicon.png', 48, page(48, grad, glyph(30, '#FFF8F0', false), 11), true],
];
(async () => {
  const b = await chromium.launch();
  for (const [name, w, html, transparent] of items) {
    const p = await b.newPage({ viewport: { width: w, height: w }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${name}`, omitBackground: transparent, clip: { x: 0, y: 0, width: w, height: w } });
    await p.close();
  }
  await b.close(); console.log('ok');
})();
