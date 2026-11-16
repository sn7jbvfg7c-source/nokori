#!/usr/bin/env node
/**
 * Typographie française dans les textes de l'app : espace insécable avant « : » et entre guillemets,
 * espace fine insécable avant « ; ! ? % ». Seuls les textes (chaînes, gabarits, texte JSX) sont touchés, jamais le code.
 *   node scripts/typo-fr.js          corrige les fichiers de src/
 *   node scripts/typo-fr.js --check  liste les fautes sans rien modifier (utilisé par un test)
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const NBSP = ' ', NNBSP = ' ';
const ROOT = path.join(__dirname, '..');

/** Corrige un morceau de texte. `afterExpr` : le morceau suit une expression (`${x} :` ou `{x} :`) */
function fixText(s, afterExpr) {
  const lead = afterExpr ? '(^|\\S)' : '(\\S)';
  return s
    .replace(new RegExp(lead + ' :(?=\\s|$|[^/\\w])', 'g'), `$1${NBSP}:`)
    .replace(new RegExp(lead + ' ([;!?])(?![\\w=.])', 'g'), `$1${NNBSP}$2`)
    .replace(/(\d) %/g, `$1${NNBSP}%`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ »/g, `${NBSP}»`);
}

function fixSource(src, file) {
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const edits = [];
  const visit = node => {
    const k = node.kind;
    if (k === ts.SyntaxKind.StringLiteral || k === ts.SyntaxKind.NoSubstitutionTemplateLiteral || k === ts.SyntaxKind.TemplateHead
      || k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail || k === ts.SyntaxKind.JsxText) {
      // les imports, clés d'objets et attributs techniques ne sont pas du texte affiché
      const p = node.parent;
      const technical = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isExternalModuleReference(p)
        || (ts.isPropertyAssignment(p) && p.name === node) || ts.isLiteralTypeNode(p));
      // requêtes SQL : les « ? » y sont des paramètres
      const sql = /\b(SELECT|INSERT|UPDATE|DELETE|PRAGMA|CREATE)\b/.test(node.getText(sf));
      if (!technical && !sql) {
        const start = node.getStart(sf), end = node.getEnd(), text = src.slice(start, end);
        const afterExpr = k === ts.SyntaxKind.TemplateMiddle || k === ts.SyntaxKind.TemplateTail || k === ts.SyntaxKind.JsxText;
        const fixed = fixText(text, afterExpr);
        if (fixed !== text) edits.push({ start, end, fixed, line: sf.getLineAndCharacterOfPosition(start).line + 1, text });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  let out = src;
  for (const e of edits.sort((a, b) => b.start - a.start)) out = out.slice(0, e.start) + e.fixed + out.slice(e.end);
  return { out, edits };
}

function files(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) return d.name === '__tests__' ? [] : files(f);
    return /\.(ts|tsx)$/.test(d.name) && !/\.d\.ts$/.test(d.name) ? [f] : [];
  });
}

function run(check) {
  const faults = [];
  for (const f of files(path.join(ROOT, 'src'))) {
    const src = fs.readFileSync(f, 'utf8');
    const { out, edits } = fixSource(src, f);
    for (const e of edits) faults.push(`${path.relative(ROOT, f)}:${e.line}  ${e.text.slice(0, 80)}`);
    if (!check && out !== src) fs.writeFileSync(f, out);
  }
  return faults;
}

module.exports = { fixText, run };

if (require.main === module) {
  const check = process.argv.includes('--check');
  const faults = run(check);
  if (check) { console.log(faults.length ? faults.join('\n') : 'Typographie : rien à corriger.'); process.exit(faults.length ? 1 : 0); }
  console.log(`${faults.length} texte(s) corrigé(s).`);
}
