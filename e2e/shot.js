// Capture de l'écran Budget dans la version web d'Expo, taille iPhone
const {chromium}=require('playwright'); const http=require('http'); const fs=require('fs'); const path=require('path');
const root=path.resolve(__dirname,'../dist'); const types={'.html':'text/html','.js':'text/javascript','.ttf':'font/ttf','.json':'application/json','.ico':'image/x-icon'};
const srv=http.createServer((q,s)=>{let f=path.join(root,decodeURIComponent(q.url.split('?')[0]));if(!f.startsWith(root))return s.writeHead(403).end();if(!fs.existsSync(f)||fs.statSync(f).isDirectory())f=path.join(root,'index.html');s.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(s);}).listen(8099,async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:393,height:852},deviceScaleFactor:2});const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
 await p.goto('http://localhost:8099/');await p.waitForTimeout(2500);await p.screenshot({path:process.argv[2]||'e2e/budget.png'});
 console.log(errs.length?'ERREURS '+errs.join(' | '):'aucune erreur');await b.close();srv.close();});
