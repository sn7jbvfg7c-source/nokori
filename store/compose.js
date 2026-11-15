// Captures pour les stores : une phrase en haut, l'écran de l'app en dessous.
// Usage : node store/compose.js  (après node store/raw.js light)
// Sortie (JPEG, sans transparence, comme le demandent Apple et Google) :
//   store/screenshots/ios/      1320 × 2868  (iPhone 6,9 pouces ; Apple les réduit pour les autres tailles)
//   store/screenshots/android/  1080 × 1920  (9:16 ; Google refuse un côté plus de 2 fois plus long que l'autre)
//   store/screenshots/android/feature-graphic.jpg  1024 × 500 (image de présentation Google Play)
//   store/screenshots/android/icon-512.png         512 × 512
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const dir = p => path.join(__dirname, p);
const b64 = f => 'data:image/png;base64,' + fs.readFileSync(f).toString('base64');
const font = w => 'data:font/ttf;base64,' + fs.readFileSync(require.resolve(`@expo-google-fonts/geist/${w}/Geist_${w}.ttf`)).toString('base64');

const SHOTS = [
  ['1-budget', 'Ce qu’il vous reste, vraiment', 'Charges fixes et épargne déjà retirées, au jour près.'],
  ['2-depense', 'Une dépense en quelques secondes', 'Le montant, la catégorie, c’est noté.'],
  ['3-calendrier', 'Vos prélèvements, avant qu’ils tombent', 'Loyer, abonnements, paie\u00a0: le mois d’un coup d’œil.'],
  ['4-objectifs', 'Vos projets ont une date d’arrivée', 'Recalculée à chaque dépense.'],
  ['5-bilan', 'Le bilan kakeibo, chaque mois', 'Quatre questions pour faire mieux le mois suivant.'],
  ['6-comptes', 'Vos données restent sur votre téléphone', 'Aucune banque connectée, aucun serveur, base chiffrée.'],
];
const FORMATS = {
  ios: { w: 1320, h: 2868, pad: 110, top: 190, title: 104, sub: 50, gap: 120, phone: 1040, radius: 72 },
  android: { w: 1080, h: 1920, pad: 84, top: 120, title: 76, sub: 38, gap: 80, phone: 720, radius: 50 },
};
const CSS = `@font-face{font-family:G;font-weight:400;src:url(${font('400Regular')})}
@font-face{font-family:G;font-weight:600;src:url(${font('600SemiBold')})}
*{margin:0;box-sizing:border-box}body{font-family:G;background:#F7F4EF;color:#1F1D1A;overflow:hidden;-webkit-font-smoothing:antialiased}`;

const page = (f, [, title, sub], img) => `<style>${CSS}
.c{width:${f.w}px;height:${f.h}px;position:relative;padding:${f.top}px ${f.pad}px 0;text-align:center;
 background:radial-gradient(120% 60% at 50% 0%,#FBF3EA 0%,#F7F4EF 60%)}
.t{font-weight:600;font-size:${f.title}px;line-height:1.08;letter-spacing:-.025em;text-wrap:balance}
.s{margin-top:${f.title * 0.36}px;font-size:${f.sub}px;line-height:1.3;color:#65615A;text-wrap:balance}
.k{display:inline-block;width:${f.sub * 0.9}px;height:${f.sub * 0.14}px;border-radius:99px;background:#B54020;margin-bottom:${f.title * 0.42}px}
.p{position:absolute;left:50%;transform:translateX(-50%);bottom:-${f.radius}px;width:${f.phone}px;border-radius:${f.radius}px;overflow:hidden;
 border:${f.w / 110}px solid #1F1D1A;box-shadow:0 40px 120px rgba(80,40,20,.22),0 8px 24px rgba(80,40,20,.12)}
.p img{display:block;width:100%}</style>
<div class="c"><div class="k"></div><div class="t">${title}</div><div class="s">${sub}</div>
<div class="p" style="top:auto"><img src="${img}"></div></div>`;

(async () => {
  const b = await chromium.launch();
  for (const [name, f] of Object.entries(FORMATS)) {
    fs.mkdirSync(dir(`screenshots/${name}`), { recursive: true });
    const p = await (await b.newContext({ viewport: { width: f.w, height: f.h }, deviceScaleFactor: 1 })).newPage();
    for (const s of SHOTS) {
      await p.setContent(page(f, s, b64(dir(`raw/light-${s[0]}.png`))));
      await p.evaluate(() => document.fonts.ready);
      // l'écran commence sous le texte, et déborde en bas
      await p.evaluate(gap => { const t = document.querySelector('.s').getBoundingClientRect().bottom; document.querySelector('.p').style.top = (t + gap) + 'px'; document.querySelector('.p').style.bottom = 'auto'; }, f.gap);
      await p.screenshot({ path: dir(`screenshots/${name}/${s[0]}.jpg`), type: 'jpeg', quality: 92 });
    }
    await p.context().close();
  }
  // Google Play : image de présentation et icône
  const icon = b64(path.join(__dirname, '../assets/icon.png'));
  const p = await (await b.newContext({ viewport: { width: 1024, height: 500 } })).newPage();
  await p.setContent(`<style>${CSS}
  .f{width:1024px;height:500px;display:flex;align-items:center;gap:56px;padding:0 84px;color:#FFF8F0;
   background:linear-gradient(145deg,#D9663B,#C5502A 55%,#A3361A)}
  .f img{width:220px;height:220px;border-radius:50px;box-shadow:0 20px 60px rgba(60,20,5,.35);flex:none}
  h1{font-weight:600;font-size:92px;letter-spacing:-.03em;line-height:1}
  p{margin-top:22px;font-size:34px;line-height:1.3;color:rgba(255,248,240,.88);text-wrap:balance}</style>
  <div class="f"><img src="${icon}"><div><h1>Nokori</h1><p>Le budget kakeibo qui reste sur votre téléphone.</p></div></div>`);
  await p.evaluate(() => document.fonts.ready);
  await p.screenshot({ path: dir('screenshots/android/feature-graphic.jpg'), type: 'jpeg', quality: 94 });
  // icône 512 × 512 en PNG 32 bits (avec canal alpha), comme le demande Google : le canvas exporte toujours en RGBA
  const png = await p.evaluate(async src => { const i = new Image(); i.src = src; await i.decode(); const c = document.createElement('canvas'); c.width = c.height = 512; c.getContext('2d').drawImage(i, 0, 0, 512, 512); return c.toDataURL('image/png'); }, icon);
  fs.writeFileSync(dir('screenshots/android/icon-512.png'), Buffer.from(png.split(',')[1], 'base64'));
  await b.close();
  console.log('captures dans store/screenshots/');
})();
