/* global describe, test, expect, __dirname, Buffer */
// Fiches des stores : limites d'Apple et de Google, et cohérence avec la configuration.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '../..');
const { appStore: a, googlePlay: g } = require('../../store/texts');
const len = s => [...s].length;

describe('fiche App Store', () => {
  test('nom 2 à 30, sous-titre 30, texte promotionnel 170, description 4000', () => {
    expect(len(a.title)).toBeGreaterThanOrEqual(2);
    expect(len(a.title)).toBeLessThanOrEqual(30);
    expect(len(a.subtitle)).toBeLessThanOrEqual(30);
    expect(len(a.promoText)).toBeLessThanOrEqual(170);
    expect(len(a.description)).toBeLessThanOrEqual(4000);
  });
  test('mots-clés : 100 octets, plus de 2 lettres, sans doublon ni mot du nom', () => {
    expect(Buffer.byteLength(a.keywords.join(','))).toBeLessThanOrEqual(100);
    expect(new Set(a.keywords).size).toBe(a.keywords.length);
    const name = a.title.toLowerCase();
    for (const k of a.keywords) {
      expect(k.length).toBeGreaterThan(2);
      expect(k).not.toMatch(/[,\s]/);
      expect(name.includes(k.toLowerCase())).toBe(false);
    }
  });
});

describe('fiche Google Play', () => {
  test('titre 30, description courte 80, description 4000', () => {
    expect(len(g.title)).toBeLessThanOrEqual(30);
    expect(len(g.shortDescription)).toBeLessThanOrEqual(80);
    expect(len(g.description)).toBeLessThanOrEqual(4000);
  });
});

describe('promesses des fiches', () => {
  test('aucune formulation qui laisserait croire que Nokori déplace de l’argent ou se connecte à une banque', () => {
    const all = [a.subtitle, a.promoText, a.description, g.shortDescription].join(' ').toLowerCase();
    expect(all).not.toMatch(/mis de côté|virement automatique|synchronis|connexion bancaire automatique/);
    expect(all).toMatch(/aucune banque/);
  });
  test('FICHES.md est à jour (node store/fiches.js)', () => {
    const md = fs.readFileSync(path.join(root, 'store/FICHES.md'), 'utf8');
    for (const s of [a.title, a.subtitle, a.promoText, a.keywords.join(','), g.shortDescription, a.description]) expect(md.includes(s)).toBe(true);
  });
});

describe('configuration de publication', () => {
  const app = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8')).expo;
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  test('iPhone uniquement (pas de captures iPad exigées)', () => expect(app.ios.supportsTablet).toBe(false));
  test('eas submit : fiche App Store depuis store.config.js, Android en test interne et en brouillon', () => {
    expect(eas.submit.production.ios.metadataPath).toBe('./store.config.js');
    expect(eas.submit.production.android).toEqual({ track: 'internal', releaseStatus: 'draft' });
  });
  test('store.config.js : pages publiques renseignées, envoi refusé tant que des informations de l’éditeur manquent', () => {
    const src = fs.readFileSync(path.join(root, 'store.config.js'), 'utf8');
    expect(src).toMatch(/PRIVACY_URL = 'https:\/\/nokori\.expo\.app\/legal\/confidentialite'/);
    expect(src).toMatch(/SUPPORT_URL = 'https:\/\/nokori\.expo\.app\/legal\/assistance'/);
    const todo = fs.readFileSync(path.join(root, 'docs/A-COMPLETER.md'), 'utf8');
    if (/^- \[ \]/m.test(todo.split('À décider ou vérifier aussi')[0])) expect(() => require('../../store.config.js')).toThrow(/informations de l’éditeur manquent/);
  });
  test('typographie française : espaces insécables partout (node scripts/typo-fr.js)', () => {
    expect(require('../../scripts/typo-fr.js').run(true)).toEqual([]);
  });
  test('captures présentes aux bonnes tailles', () => {
    const size = f => { const b = fs.readFileSync(f); let i = 2; while (i < b.length) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } return null; };
    for (const [d, w, h] of [['ios', 1320, 2868], ['android', 1080, 1920]]) {
      const files = fs.readdirSync(path.join(root, 'store/screenshots', d)).filter(f => /^\d-.*\.jpg$/.test(f));
      expect(files.length).toBe(6);
      for (const f of files) expect(size(path.join(root, 'store/screenshots', d, f))).toEqual([w, h]);
    }
    expect(size(path.join(root, 'store/screenshots/android/feature-graphic.jpg'))).toEqual([1024, 500]);
  });
});
