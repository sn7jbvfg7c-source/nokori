// Exporte la vidéo en MP4, image par image (30 i/s) : node store/video/render.js [916|169|stills]
// Besoin de ffmpeg. Sortie : store/video/out/nokori-presentation-9x16.mp4 et -16x9.mp4
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'out');
const FPS = 30, DURATION = 38;
const types = { '.html': 'text/html', '.png': 'image/png', '.ttf': 'font/ttf', '.json': 'application/json', '.js': 'text/javascript' };

const serve = () => new Promise(ok => {
  const srv = http.createServer((q, s) => {
    const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return s.writeHead(404).end();
    s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
  }).listen(8091, () => ok(srv));
});

async function open(b, f) {
  const [w, h] = f === '169' ? [1920, 1080] : [1080, 1920];
  const p = await (await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 })).newPage();
  await p.goto(`http://localhost:8091/store/video/film.html?render&f=${f}`);
  await p.evaluate(() => window.ready);
  return p;
}

(async () => {
  const mode = process.argv[2] || '916';
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serve();
  const b = await chromium.launch();
  if (mode === 'stills') {
    for (const f of ['916', '169']) {
      const p = await open(b, f);
      for (const t of [2.5, 7.5, 12.3, 15.5, 19.5, 24, 27, 31, 36.5]) {
        await p.evaluate(x => window.seek(x), t);
        await p.screenshot({ path: path.join(OUT, `still-${f}-${t}.jpg`), type: 'jpeg', quality: 80 });
      }
    }
  } else {
    for (const f of mode === 'all' ? ['916', '169'] : [mode]) {
      const p = await open(b, f);
      const name = path.join(OUT, `nokori-presentation-${f === '169' ? '16x9' : '9x16'}.mp4`);
      const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-colorspace', 'bt709', '-movflags', '+faststart', name], { stdio: ['pipe', 'inherit', 'inherit'] });
      for (let n = 0; n < FPS * DURATION; n++) {
        await p.evaluate(x => window.seek(x), n / FPS);
        const buf = await p.screenshot({ type: 'jpeg', quality: 92 });
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      }
      ff.stdin.end();
      await new Promise(r => ff.on('close', r));
      console.log('écrit :', path.relative(ROOT, name));
    }
  }
  await b.close(); srv.close();
})();
