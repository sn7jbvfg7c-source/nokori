// Génère les documents légaux en Markdown à partir des textes de l'app (source unique : src/legal/*.ts),
// la liste des informations à compléter et la liste des licences : node scripts/legal-docs.js
const fs = require('fs'), path = require('path'), ts = require('typescript'), { execSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

// charge un module TypeScript du projet (transpilation à la volée, sans dépendance supplémentaire)
const cache = {};
function load(file) {
  const abs = require.resolve(file);
  if (cache[abs]) return cache[abs].exports;
  const out = ts.transpileModule(fs.readFileSync(abs, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const mod = { exports: {} }; cache[abs] = mod;
  new Function('require', 'module', 'exports', out)(p => (p.startsWith('.') ? load(path.join(path.dirname(abs), p) + (fs.existsSync(path.join(path.dirname(abs), p) + '.ts') ? '.ts' : '')) : require(p)), mod, mod.exports);
  return mod.exports;
}
const { legalDocs, LEGAL_ORDER } = load(path.join(ROOT, 'src/legal/documents.ts'));
const { missingLegalFields } = load(path.join(ROOT, 'src/legal/config.ts'));

const OUT = path.join(ROOT, 'docs/legal');
fs.mkdirSync(OUT, { recursive: true });
const head = '<!-- Fichier généré par node scripts/legal-docs.js à partir de src/legal/ : ne pas modifier à la main. -->\n\n';
const docs = legalDocs();
for (const id of LEGAL_ORDER) {
  const d = docs[id];
  let md = `${head}# ${d.title}\n\n${d.intro}\n`;
  for (const s of d.sections) {
    md += `\n## ${s.h}\n\n`;
    for (const p of s.p || []) md += `${p}\n\n`;
    for (const l of s.list || []) md += `- ${l}\n`;
    if (s.list) md += '\n';
  }
  md += '\n---\n\n*Texte rédigé avec une IA à partir du fonctionnement réel de l’application. Il doit être relu par un professionnel du droit avant publication.*\n';
  fs.writeFileSync(path.join(OUT, `${id}.md`), md.replace(/\n{3,}/g, '\n\n'));
}

// informations que seul le propriétaire peut fournir
const missing = missingLegalFields();
fs.writeFileSync(path.join(ROOT, 'docs/A-COMPLETER.md'), `${head}# Informations à compléter par le propriétaire\n\nÀ renseigner dans \`src/legal/config.ts\`, puis relancer \`node scripts/legal-docs.js\`. Tant qu’elles manquent, l’app affiche « [À compléter : …] » à leur place, surligné.\n\n${missing.map(m => `- [ ] ${m}`).join('\n')}\n\nÀ décider ou vérifier aussi :\n\n- [ ] Faire relire les six documents par un professionnel du droit.\n- [ ] Publier la politique de confidentialité et la page d’assistance à une adresse web publique (exigé par Apple et Google).\n- [ ] Demander à Expo le lieu de traitement des journaux d’EAS Hosting et l’existence d’un accord de traitement (DPA).
`);

// licences des composants embarqués
const lines = execSync('npm ls --omit=dev --all --parseable', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 }).trim().split('\n').slice(1);
const rows = new Map();
for (const dir of lines) {
  try { const p = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); const lic = typeof p.license === 'string' ? p.license : (p.license && p.license.type) || 'non déclarée'; rows.set(`${p.name}@${p.version}`, lic); } catch { /* paquet sans package.json */ }
}
const count = {};
for (const l of rows.values()) count[l] = (count[l] || 0) + 1;
let lic = `${head}# Licences des composants\n\n## Polices, icônes et visuels\n\n| Ressource | Licence | Titulaire |\n|---|---|---|\n| Police Geist | SIL Open Font License 1.1 | The Geist Project Authors (Vercel) |\n| Icônes Feather (via @expo/vector-icons) | MIT | Cole Bemis ; @expo/vector-icons : Joel Arvidsson, 650 Industries |\n| Icône 残 (assets/*.png, public/*.png) | Créée pour Nokori par store/icons/generate.js, à partir de la police Noto Sans JP (SIL OFL 1.1, Google) : un rendu en image n’est pas soumis à l’OFL | Éditeur de Nokori |\n| Captures, vidéo de présentation | Créées pour Nokori (store/raw.js, store/compose.js, store/video/) | Éditeur de Nokori |\n\n## Logiciels embarqués (${rows.size} paquets)\n\n| Licence | Nombre |\n|---|---|\n${Object.entries(count).sort((a, b) => b[1] - a[1]).map(([l, n]) => `| ${l} | ${n} |`).join('\n')}\n\n<details><summary>Liste complète</summary>\n\n| Paquet | Licence |\n|---|---|\n${[...rows].sort().map(([n, l]) => `| ${n} | ${l} |`).join('\n')}\n\n</details>\n`;
fs.writeFileSync(path.join(ROOT, 'docs/LICENCES.md'), lic);
console.log(`docs/legal/ (${LEGAL_ORDER.length} documents), docs/A-COMPLETER.md (${missing.length} éléments), docs/LICENCES.md (${rows.size} paquets)`);
