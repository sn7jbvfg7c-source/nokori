/** D2 : diagnostic de sécurité, phrases justes selon les constats, et jamais de clé, de phrase ni de donnée financière */
import { cryptoSelfTest, isPlainSqliteHeader, scryptDuration, securityChecks, SQLITE_PLAIN_HEADER, STORAGE_REPORT_FIELDS, type CheckInput, type StorageReport } from '../securityCheck';

const PHONE_OK: StorageReport = { platform: 'telephone', cipherVersion: '4.6.1 community', fileHeaderPlain: false, keyPresent: true, keyWellFormed: true };
const base: CheckInput = { report: PHONE_OK, selfTestOk: true, lock: true, lastBackup: '2026-11-10', today: '2026-11-16' };
const byId = (i: CheckInput) => Object.fromEntries(securityChecks(i).map(c => [c.id, c]));

describe('constats → phrases', () => {
  test('téléphone protégé : tout est vérifié', () => {
    const c = byId(base);
    expect(c.chiffrement).toMatchObject({ status: 'ok', title: 'Données chiffrées sur ce téléphone' });
    expect(c.chiffrement.text).toContain('4.6.1 community');
    expect(c.cle.status).toBe('ok');
    expect(c.calculs.status).toBe('ok');
    expect(c.verrou.status).toBe('ok');
    expect(c.sauvegarde).toMatchObject({ status: 'ok', title: 'Sauvegarde faite il y a 6 jours' });
  });
  test('fichier lisible en clair ou SQLCipher absent : alerte, jamais « chiffré »', () => {
    for (const r of [{ ...PHONE_OK, fileHeaderPlain: true }, { ...PHONE_OK, cipherVersion: null }, { ...PHONE_OK, cipherVersion: null, fileHeaderPlain: null }]) {
      const c = byId({ ...base, report: r }).chiffrement;
      expect(c.status).toBe('attention');
      expect(c.title).not.toMatch(/^Données chiffrées/);
    }
  });
  test('fichier non relu : prudence, pas de faux « vérifié »', () => {
    expect(byId({ ...base, report: { ...PHONE_OK, fileHeaderPlain: null } }).chiffrement.status).toBe('attention');
  });
  test('clé absente ou mal formée : alerte, conseil de ne pas désinstaller', () => {
    for (const r of [{ ...PHONE_OK, keyPresent: false, keyWellFormed: false }, { ...PHONE_OK, keyWellFormed: false }]) {
      expect(byId({ ...base, report: r }).cle).toMatchObject({ status: 'attention' });
      expect(byId({ ...base, report: r }).cle.text).toMatch(/Ne désinstallez pas/);
    }
  });
  test('navigateur : dit honnêtement que les données sont en clair, sans ligne « clé »', () => {
    const c = byId({ ...base, report: { platform: 'navigateur', cipherVersion: null, fileHeaderPlain: null, keyPresent: false, keyWellFormed: false }, lock: false });
    expect(c.chiffrement).toMatchObject({ status: 'attention', title: 'Données en clair dans ce navigateur' });
    expect(c.cle).toBeUndefined();
    expect(c.verrou.status).toBe('info');
  });
  test('calculs faux : alerte', () => {
    expect(byId({ ...base, selfTestOk: false }).calculs.status).toBe('attention');
  });
  test('sauvegarde : aucune, ancienne de plus de 30 jours, du jour', () => {
    expect(byId({ ...base, lastBackup: undefined }).sauvegarde).toMatchObject({ status: 'attention', title: 'Aucune sauvegarde' });
    expect(byId({ ...base, lastBackup: '2026-09-01' }).sauvegarde).toMatchObject({ status: 'attention', title: 'Dernière sauvegarde il y a 76 jours' });
    expect(byId({ ...base, lastBackup: '2026-11-16' }).sauvegarde.title).toBe('Sauvegarde faite aujourd’hui');
  });
});

describe('aucune donnée sensible', () => {
  test('le constat de stockage ne contient que des champs autorisés (ni clé, ni donnée)', () => {
    expect(STORAGE_REPORT_FIELDS).toEqual(['platform', 'cipherVersion', 'fileHeaderPlain', 'keyPresent', 'keyWellFormed']);
    expect(STORAGE_REPORT_FIELDS.some(f => /key$|pass|amount|montant|data/i.test(f) && !/^key(Present|WellFormed)$/.test(f))).toBe(false);
  });
  test('même si on lui passait une clé ou des données par erreur, le diagnostic ne les reprend pas', () => {
    const KEY = 'ab'.repeat(32);
    const polluted = { ...base, report: { ...PHONE_OK, key: KEY, expenses: [{ label: 'Marché du samedi', amount: 4000 }] } as unknown as StorageReport, passphrase: 'riz gris sous la pluie' } as CheckInput;
    const out = JSON.stringify(securityChecks(polluted));
    for (const secret of [KEY, 'Marché du samedi', '4000', 'riz gris']) expect(out).not.toContain(secret);
    expect(out).not.toMatch(/[0-9a-f]{32,}/);
  });
});

describe('vérifications techniques', () => {
  test('en-tête d’un SQLite non chiffré reconnu ; octets aléatoires (fichier chiffré) non', () => {
    const plain = Uint8Array.from(SQLITE_PLAIN_HEADER, ch => ch.charCodeAt(0));
    expect(isPlainSqliteHeader(plain)).toBe(true);
    expect(isPlainSqliteHeader(globalThis.crypto.getRandomValues(new Uint8Array(16)))).toBe(false);
    expect(isPlainSqliteHeader(plain.slice(0, 10))).toBe(false);
  });
  test('auto-test des calculs de référence : réussi', async () => {
    await expect(cryptoSelfTest()).resolves.toBe(true);
  });
  test('mesure de vitesse : une durée en millisecondes, sans donnée de l’utilisateur', async () => {
    let t = 0; const now = () => (t += 250);
    await expect(scryptDuration(2 ** 10, now)).resolves.toBe(250);
  });
});
