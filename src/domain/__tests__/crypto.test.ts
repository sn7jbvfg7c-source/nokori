/**
 * D1 : la cryptographie des sauvegardes se comporte comme les normes, et toute altération d'un fichier est refusée.
 * Vecteurs officiels : scrypt (RFC 7914, § 12) et AES-256-GCM (spécification GCM de McGrew et Viega, cas 13 et 14).
 * Ils détectent une régression des bibliothèques @noble (mise à jour, moteur JavaScript différent).
 */
import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { EMPTY, type AppData } from '../../data/persist';
import { createBackup, openBackup } from '../backup';

const hex = (h: string) => Uint8Array.from(h.replace(/\s+/g, '').match(/../g)!.map(x => parseInt(x, 16)));
const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
const utf8 = (s: string) => new TextEncoder().encode(s);
const rnd = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));

jest.setTimeout(60000);

describe('vecteurs officiels', () => {
  test('scrypt, RFC 7914 : mot de passe et sel vides, N = 16, r = 1, p = 1', async () => {
    const k = await scryptAsync(utf8(''), utf8(''), { N: 16, r: 1, p: 1, dkLen: 64 });
    expect(toHex(k)).toBe(toHex(hex(`77 d6 57 62 38 65 7b 20 3b 19 ca 42 c1 8a 04 97 f1 6b 48 44 e3 07 4a e8 df df fa 3f ed e2 14 42
      fc d0 06 9d ed 09 48 f8 32 6a 75 3a 0f c8 1f 17 e8 d3 e0 fb 2e 0d 36 28 cf 35 e2 0c 38 d1 89 06`)));
  });
  test('scrypt, RFC 7914 : « password », sel « NaCl », N = 1024, r = 8, p = 16', async () => {
    const k = await scryptAsync(utf8('password'), utf8('NaCl'), { N: 1024, r: 8, p: 16, dkLen: 64 });
    expect(toHex(k)).toBe(toHex(hex(`fd ba be 1c 9d 34 72 00 78 56 e7 19 0d 01 e9 fe 7c 6a d7 cb c8 23 78 30 e7 73 76 63 4b 37 31 62
      2e af 30 d9 2e 22 a3 88 6f f1 09 27 9d 98 30 da c7 27 af b9 4a 83 ee 6d 83 60 cb df a2 cc 06 40`)));
  });
  test('AES-256-GCM, cas 13 : clé et nonce nuls, message vide', () => {
    const out = gcm(new Uint8Array(32), new Uint8Array(12)).encrypt(new Uint8Array(0));
    expect(toHex(out)).toBe('530f8afbc74536b9a963b4f1c4cb738b');
  });
  test('AES-256-GCM, cas 14 : clé et nonce nuls, 16 octets nuls', () => {
    const out = gcm(new Uint8Array(32), new Uint8Array(12)).encrypt(new Uint8Array(16));
    expect(toHex(out)).toBe('cea7403d4d606b6e074ec5d3baf39d18' + 'd0d1c8a799996bf0265b98b5d48ab919');
  });
  test('AES-256-GCM : un étiquette modifiée est refusée', () => {
    const out = gcm(new Uint8Array(32), new Uint8Array(12)).encrypt(new Uint8Array(16));
    out[out.length - 1] ^= 1;
    expect(() => gcm(new Uint8Array(32), new Uint8Array(12)).decrypt(out)).toThrow();
  });
});

describe('altération d’un fichier de sauvegarde', () => {
  const PASS = 'riz gris sous la pluie';
  const data: AppData = { ...EMPTY, expenses: [{ id: 'a', date: '2026-11-02', label: 'Marché', categoryId: 'courses', amount: 4000 }] };
  let file: Record<string, unknown>;
  beforeAll(async () => { file = JSON.parse(await createBackup(data, PASS, new Date(2026, 10, 16), rnd)); });
  const open = (f: Record<string, unknown>) => openBackup(JSON.stringify(f), PASS);
  const flipB64 = (b64: string) => { const b = Uint8Array.from(atob(b64), c => c.charCodeAt(0)); b[0] ^= 1; return btoa(String.fromCharCode(...b)); };

  test('le fichier intact s’ouvre', async () => {
    await expect(open(file)).resolves.toEqual(data);
  });
  const cases: [string, (f: Record<string, any>) => Record<string, unknown>][] = [
    ['version (v = 0)', f => ({ ...f, v: 0 })],
    ['date de création', f => ({ ...f, created: '2026-11-17' })],
    ['paramètre N (autre valeur valide)', f => ({ ...f, kdf: { ...f.kdf, N: 2 ** 14 } })],
    ['paramètre r', f => ({ ...f, kdf: { ...f.kdf, r: 7 } })],
    ['sel', f => ({ ...f, kdf: { ...f.kdf, salt: flipB64(f.kdf.salt) } })],
    ['nonce', f => ({ ...f, cipher: { ...f.cipher, nonce: flipB64(f.cipher.nonce) } })],
    ['données : premier octet', f => ({ ...f, data: flipB64(f.data) })],
    ['données : étiquette tronquée', f => ({ ...f, data: btoa(atob(f.data).slice(0, -1)) })],
  ];
  test.each(cases)('%s modifié : refusé', async (_n, change) => {
    await expect(open(change(file))).rejects.toMatchObject({ code: 'phrase-ou-fichier' });
  });
  test('format, nom de l’algorithme, p, nonce trop court : refusés comme « pas une sauvegarde »', async () => {
    const f = file as Record<string, any>;
    for (const bad of [
      { ...f, format: 'autre' },
      { ...f, kdf: { ...f.kdf, name: 'pbkdf2' } },
      { ...f, kdf: { ...f.kdf, p: 2 } },
      { ...f, cipher: { ...f.cipher, name: 'aes-128-gcm' } },
      { ...f, cipher: { ...f.cipher, nonce: btoa('court') } },
    ]) await expect(open(bad)).rejects.toMatchObject({ code: 'pas-une-sauvegarde' });
  });
});
