// Petit serveur statique pour la version web exportée (dossier dist)
const http = require('http'), fs = require('fs'), path = require('path');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ttf': 'font/ttf', '.json': 'application/json', '.ico': 'image/x-icon', '.png': 'image/png' };
module.exports = (port = 8099) => new Promise(ok => {
  const root = path.resolve(__dirname, '../dist');
  const srv = http.createServer((q, s) => {
    let f = path.join(root, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(root)) return s.writeHead(403).end();
    if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html');
    s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(s);
  }).listen(port, () => ok(srv));
});
