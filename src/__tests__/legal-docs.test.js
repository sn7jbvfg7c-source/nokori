/* global describe, test, expect, __dirname */
// Les documents légaux de docs/legal sont générés depuis l'app : ils doivent être à jour (node scripts/legal-docs.js)
const fs = require('fs');
const path = require('path');
const { legalDocs, ALL_DOCS } = require('../legal/documents');

describe('docs/legal à jour avec les textes de l’app', () => {
  test.each(ALL_DOCS)('%s', id => {
    const md = fs.readFileSync(path.join(__dirname, '../../docs/legal', `${id}.md`), 'utf8');
    const d = legalDocs()[id];
    expect(md).toContain(`# ${d.title}`);
    for (const s of d.sections) expect(md).toContain(`## ${s.h}`);
    for (const s of d.sections) for (const p of s.p || []) expect(md).toContain(p);
  });
});
