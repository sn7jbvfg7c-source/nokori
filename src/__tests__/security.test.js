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

describe('SQLCipher : fichiers temporaires et effacement', () => {
  test('temp_store en mémoire et secure_delete activés', () => {
    const src = fs.readFileSync(path.join(__dirname, '../data/kv.native.ts'), 'utf8');
    expect(src).toMatch(/PRAGMA temp_store = MEMORY/);
    expect(src).toMatch(/PRAGMA secure_delete = ON/);
  });
});

describe('sauvegarde : rien ne part sans l’utilisateur', () => {
  test('le fichier temporaire est effacé après le partage et après la lecture', () => {
    const src = fs.readFileSync(path.join(__dirname, '../data/backupFile.native.ts'), 'utf8');
    expect((src.match(/finally \{[^}]*delete\(\)/g) || []).length).toBe(2);
  });
  test('la phrase secrète n’est jamais enregistrée', () => {
    const all = fs.readFileSync(path.join(__dirname, '../screens/BackupScreen.tsx'), 'utf8') + fs.readFileSync(path.join(__dirname, '../domain/backup.ts'), 'utf8');
    expect(all).not.toMatch(/savePrefs\([^)]*pass|kv\.set\([^)]*pass/i);
  });
});

describe('base restaurée sans sa clé', () => {
  test('clé absente alors qu’une base existe : rien n’est supprimé d’office, l’utilisateur choisit', () => {
    const src = fs.readFileSync(path.join(__dirname, '../data/kv.native.ts'), 'utf8');
    const key = src.slice(src.indexOf('async function databaseKey()'), src.indexOf('let dbPromise'));
    expect(key).toMatch(/if \(databaseExists\(\)\) throw new KeyLostError\(\)/);
    expect(key.indexOf('KeyLostError')).toBeLessThan(key.indexOf('setItemAsync')); // pas de nouvelle clé avant ce choix
    const open = src.slice(src.indexOf('async function open()'), src.indexOf('const db = () =>'));
    expect(open).not.toMatch(/deleteDatabaseAsync/);
    expect(open).toMatch(/catch \{[^]*throw new KeyLostError\(\)/); // clé qui n'ouvre pas la base
  });
  test('en cas de doute sur l’existence de la base, on considère qu’elle existe', () => {
    const src = fs.readFileSync(path.join(__dirname, '../data/kv.native.ts'), 'utf8');
    expect(src).toMatch(/catch \{ return true; \}/);
  });
});
