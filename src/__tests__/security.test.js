/* global describe, test, expect, __dirname */
/**
 * Garde-fous de sécurité vérifiés à chaque lancement des tests :
 * l'app ne fait aucun appel réseau, n'exécute pas de code dynamique, ne stocke rien en clair
 * et ne journalise pas de données.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const files = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(d => {
  const p = path.join(dir, d.name);
  if (d.isDirectory()) return d.name === '__tests__' ? [] : files(p);
  return /\.(ts|tsx)$/.test(d.name) ? [p] : [];
});
const src = files(ROOT).map(f => ({ f: path.relative(ROOT, f), s: fs.readFileSync(f, 'utf8') }));
const offenders = (re, allow = []) => src.filter(x => re.test(x.s) && !allow.includes(x.f)).map(x => x.f);

describe('garde-fous de sécurité', () => {
  test('aucun appel réseau (fetch, XMLHttpRequest, WebSocket, axios)', () => {
    expect(offenders(/\bfetch\s*\(|XMLHttpRequest|new WebSocket|from 'axios'/)).toEqual([]);
  });
  test('aucun code exécuté dynamiquement', () => {
    expect(offenders(/\beval\s*\(|new Function\s*\(|dangerouslySetInnerHTML|innerHTML/)).toEqual([]);
  });
  test('aucun stockage en clair (AsyncStorage, localStorage hors version web de développement)', () => {
    expect(offenders(/AsyncStorage/)).toEqual([]);
    expect(offenders(/localStorage/, ['data/kv.ts'])).toEqual([]);
  });
  test('aucune donnée journalisée (console.log / console.info)', () => {
    expect(offenders(/console\.(log|info|debug)\s*\(/)).toEqual([]);
  });
  test('aucune adresse en clair (http://) ni lien externe ouvert', () => {
    expect(offenders(/['"`]http:\/\//)).toEqual([]);
    expect(offenders(/Linking\.openURL|WebView/)).toEqual([]);
  });
  test('la clé de la base reste liée à cet appareil et n’est insérée qu’après validation', () => {
    const kv = src.find(x => x.f === 'data/kv.native.ts').s;
    expect(kv).toMatch(/WHEN_UNLOCKED_THIS_DEVICE_ONLY/);
    expect(kv).toMatch(/\/\^\[0-9a-f\]\{64\}\$\/\.test\(key\)/);
    expect(kv).toMatch(/if \(!__DEV__\)/);
  });
  test('les rappels ne contiennent pas de montant', () => {
    const r = src.find(x => x.f === 'domain/reminders.ts').s;
    expect(r).not.toMatch(/formatEuros|amount/);
  });
  test('configuration : pas de sauvegarde Android, permissions inutiles retirées, thème automatique', () => {
    const app = JSON.parse(fs.readFileSync(path.resolve(ROOT, '../app.json'), 'utf8')).expo;
    expect(app.android.allowBackup).toBe(false);
    expect(app.android.blockedPermissions).toEqual(expect.arrayContaining(['android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE', 'android.permission.SYSTEM_ALERT_WINDOW']));
    expect(app.userInterfaceStyle).toBe('automatic');
    expect(app.ios.privacyManifests.NSPrivacyTracking).toBe(false);
    expect(app.ios.privacyManifests.NSPrivacyCollectedDataTypes).toEqual([]);
  });
  test('versions bêta et stores : permission Internet retirée sur Android', () => {
    const app = JSON.parse(fs.readFileSync(path.resolve(ROOT, '../app.json'), 'utf8')).expo;
    const configure = require('../../app.config.js');
    const perms = profile => { process.env.EAS_BUILD_PROFILE = profile; return configure({ config: app }).android.blockedPermissions; };
    try {
      expect(perms('production')).toContain('android.permission.INTERNET');
      expect(perms('preview')).toContain('android.permission.INTERNET');
      expect(perms('development')).not.toContain('android.permission.INTERNET');
    } finally { delete process.env.EAS_BUILD_PROFILE; }
  });
});
