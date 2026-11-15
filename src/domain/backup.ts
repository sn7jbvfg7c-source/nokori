/**
 * Sauvegarde chiffrée de toutes les données, pour changer de téléphone ou se protéger d'une perte.
 *
 * Le fichier ne contient rien de lisible sans la phrase secrète choisie par l'utilisateur :
 * - la phrase est transformée en clé par scrypt (lent exprès, pour freiner les essais en série) ;
 * - les données sont chiffrées en AES-256-GCM, qui détecte aussi toute modification du fichier ;
 * - l'en-tête (version, paramètres) est authentifié avec les données : on ne peut pas le trafiquer.
 * Bibliothèques : @noble/hashes et @noble/ciphers (auditées par Cure53, sans dépendance, sans code natif).
 * La phrase secrète n'est jamais enregistrée : perdue, la sauvegarde est perdue.
 */
import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';
import { decodeState, encode, type AppData } from '../data/persist';

export const BACKUP_FORMAT = 'nokori-sauvegarde';
export const BACKUP_VERSION = 1;
export const MIN_PASSPHRASE = 8;
/** scrypt : 2^15 × 8 = 32 Mo de mémoire, quelques secondes sur un téléphone ; paramètres écrits dans le fichier */
export const KDF = { N: 2 ** 15, r: 8, p: 1 } as const;
const MAX_FILE = 20_000_000;

export interface BackupHeader {
  format: typeof BACKUP_FORMAT; v: number; created: string;
  kdf: { name: 'scrypt'; N: number; r: number; p: number; salt: string };
  cipher: { name: 'aes-256-gcm'; nonce: string };
}

export type RestoreError = 'pas-une-sauvegarde' | 'version-future' | 'phrase-ou-fichier' | 'contenu-illisible' | 'trop-gros';

export const RESTORE_MESSAGES: Record<RestoreError, string> = {
  'pas-une-sauvegarde': 'Ce fichier n’est pas une sauvegarde Nokori.',
  'version-future': 'Cette sauvegarde vient d’une version plus récente de Nokori. Mettez l’app à jour, puis réessayez.',
  'phrase-ou-fichier': 'Phrase secrète incorrecte, ou fichier modifié ou abîmé.',
  'contenu-illisible': 'La sauvegarde s’ouvre, mais son contenu est illisible. Vos données actuelles n’ont pas été touchées.',
  'trop-gros': 'Ce fichier est trop volumineux pour être une sauvegarde Nokori.',
};

export class BackupError extends Error {
  constructor(public code: RestoreError) { super(RESTORE_MESSAGES[code]); }
}

// UTF-8 sans dépendre de TextEncoder / TextDecoder (absents de certaines versions de Hermes)
const enc = {
  encode(str: string): Uint8Array {
    const out: number[] = [];
    for (const ch of str) {
      const c = ch.codePointAt(0)!;
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return Uint8Array.from(out);
  },
};
const dec = {
  decode(b: Uint8Array): string {
    let out = '';
    for (let i = 0; i < b.length;) {
      const x = b[i];
      let c: number;
      if (x < 0x80) { c = x; i += 1; }
      else if (x >> 5 === 6) { c = ((x & 31) << 6) | (b[i + 1] & 63); i += 2; }
      else if (x >> 4 === 14) { c = ((x & 15) << 12) | ((b[i + 1] & 63) << 6) | (b[i + 2] & 63); i += 3; }
      else { c = ((x & 7) << 18) | ((b[i + 1] & 63) << 12) | ((b[i + 2] & 63) << 6) | (b[i + 3] & 63); i += 4; }
      out += String.fromCodePoint(c);
    }
    return out;
  },
};

// base64 sans dépendance (Hermes n'a pas toujours btoa/atob pour les octets)
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function toB64(b: Uint8Array): string {
  let out = '';
  for (let i = 0; i < b.length; i += 3) {
    const n = (b[i] << 16) | ((b[i + 1] ?? 0) << 8) | (b[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + (i + 1 < b.length ? B64[(n >> 6) & 63] : '=') + (i + 2 < b.length ? B64[n & 63] : '=');
  }
  return out;
}
export function fromB64(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4 !== 0) return null;
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12) | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** En-tête sérialisé toujours dans le même ordre : c'est lui qui est authentifié */
const aad = (h: BackupHeader) => enc.encode(JSON.stringify([h.format, h.v, h.created, h.kdf.name, h.kdf.N, h.kdf.r, h.kdf.p, h.kdf.salt, h.cipher.name, h.cipher.nonce]));

/** La phrase est normalisée (NFC) : « é » tapé sur deux claviers différents donne la même clé */
const deriveKey = (pass: string, salt: Uint8Array, k: { N: number; r: number; p: number }, onProgress?: (f: number) => void) =>
  scryptAsync(enc.encode(pass.normalize('NFC')), salt, { ...k, dkLen: 32, maxmem: 2 ** 27, onProgress });

export const passphraseProblem = (p: string): string | null =>
  [...p].length < MIN_PASSPHRASE ? `Au moins ${MIN_PASSPHRASE} caractères. Une phrase de plusieurs mots est plus sûre et plus facile à retenir.` : null;

/** Crée le fichier de sauvegarde (texte). `random` fournit des octets aléatoires sûrs. */
export async function createBackup(data: AppData, pass: string, today: Date, random: (n: number) => Uint8Array, onProgress?: (f: number) => void): Promise<string> {
  if (passphraseProblem(pass)) throw new Error('phrase trop courte');
  const salt = random(16), nonce = random(12);
  const header: BackupHeader = {
    format: BACKUP_FORMAT, v: BACKUP_VERSION,
    created: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
    kdf: { name: 'scrypt', ...KDF, salt: toB64(salt) },
    cipher: { name: 'aes-256-gcm', nonce: toB64(nonce) },
  };
  const key = await deriveKey(pass, salt, KDF, onProgress);
  const sealed = gcm(key, nonce, aad(header)).encrypt(enc.encode(encode(data)));
  key.fill(0);
  return JSON.stringify({ ...header, data: toB64(sealed) });
}

/** Lit l'en-tête sans phrase secrète : vérifie qu'il s'agit bien d'une sauvegarde Nokori */
export function readHeader(text: string): BackupHeader & { data: string } {
  if (text.length > MAX_FILE) throw new BackupError('trop-gros');
  let j: unknown;
  try { j = JSON.parse(text); } catch { throw new BackupError('pas-une-sauvegarde'); }
  const o = j as Record<string, unknown>;
  if (typeof j !== 'object' || j === null || o.format !== BACKUP_FORMAT || typeof o.v !== 'number') throw new BackupError('pas-une-sauvegarde');
  if (o.v > BACKUP_VERSION) throw new BackupError('version-future');
  const kdf = o.kdf as Record<string, unknown> | undefined, cipher = o.cipher as Record<string, unknown> | undefined;
  const okNum = (x: unknown, min: number, max: number) => typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
  if (!kdf || kdf.name !== 'scrypt' || !okNum(kdf.N, 2 ** 10, 2 ** 16) || ((kdf.N as number) & ((kdf.N as number) - 1)) !== 0 || !okNum(kdf.r, 1, 8) || !okNum(kdf.p, 1, 4) || typeof kdf.salt !== 'string'
    || !cipher || cipher.name !== 'aes-256-gcm' || typeof cipher.nonce !== 'string' || typeof o.data !== 'string' || typeof o.created !== 'string') throw new BackupError('pas-une-sauvegarde');
  return o as unknown as BackupHeader & { data: string };
}

/** Ouvre une sauvegarde : renvoie les données validées, ou lève une BackupError explicite */
export async function openBackup(text: string, pass: string, onProgress?: (f: number) => void): Promise<AppData> {
  const h = readHeader(text);
  const salt = fromB64(h.kdf.salt), nonce = fromB64(h.cipher.nonce), sealed = fromB64(h.data);
  if (!salt || !nonce || nonce.length !== 12 || !sealed || sealed.length < 17) throw new BackupError('pas-une-sauvegarde');
  const key = await deriveKey(pass, salt, h.kdf, onProgress);
  let plain: Uint8Array;
  try { plain = gcm(key, nonce, aad(h)).decrypt(sealed); }
  catch { throw new BackupError('phrase-ou-fichier'); }
  finally { key.fill(0); }
  const d = decodeState(dec.decode(plain));
  if (d.status !== 'ok') throw new BackupError('contenu-illisible');
  return d.data;
}

/** Résumé lisible d'une sauvegarde ouverte, pour confirmer avant de remplacer */
export function summarize(d: AppData) {
  return { expenses: d.expenses.length, accounts: d.accounts.length, goals: d.goals.length, hasProfile: d.profile !== null };
}

export const backupFileName = (today: Date) =>
  `nokori-${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}.nokori`;
