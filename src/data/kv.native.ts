/**
 * Stockage clé-valeur sur iPhone et Android : base SQLite chiffrée par SQLCipher.
 * La clé (256 bits, aléatoire) est rangée dans le trousseau / Keystore, liée à cet appareil :
 * elle ne part ni dans les sauvegardes iCloud ni sur un autre téléphone. Une base restaurée sans sa clé est donc illisible :
 * l'app le signale et laisse l'utilisateur choisir (KeyLostError), sans rien supprimer d'office.
 *
 * SQLCipher demande une version compilée de l'app (EAS Build) : il n'existe pas dans Expo Go.
 * En développement, on accepte une base non chiffrée avec un avertissement ;
 * dans l'app publiée, on refuse d'écrire quoi que ce soit si le chiffrement est absent.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { File, FileMode } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';
import type { KV } from './kv';
import { isPlainSqliteHeader, type StorageReport } from '../domain/securityCheck';

const DB_NAME = 'nokori.db';
const KEY_NAME = 'nokori.dbkey';
const KEY_OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

/** La base existe mais sa clé n'est plus là (ou ne l'ouvre pas) : illisible. On ne supprime rien sans l'accord de l'utilisateur. */
export class KeyLostError extends Error {
  code = 'KEY_LOST' as const;
  constructor() { super('Clé de chiffrement absente ou différente'); }
}

const databaseFile = () => {
  const dir = String(SQLite.defaultDatabaseDirectory);
  return new File(dir.startsWith('file:') ? dir : `file://${dir}`, DB_NAME);
};

/** Le fichier de base existe-t-il ? En cas de doute, on répond oui : mieux vaut demander que supprimer. */
function databaseExists(): boolean {
  try { return databaseFile().exists; } catch { return true; }
}

async function databaseKey(): Promise<string> {
  let key = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTS);
  if (!key) {
    // Pas de clé mais une base : restauration d'une sauvegarde de l'appareil, trousseau réinitialisé…
    // Avant, la base était supprimée d'office ; maintenant l'utilisateur choisit (restaurer un fichier, ou repartir de zéro).
    if (databaseExists()) throw new KeyLostError();
    key = toHex(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(KEY_NAME, key, KEY_OPTS);
  }
  // la clé est insérée dans une instruction PRAGMA : on n'accepte que 64 caractères hexadécimaux
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Clé de chiffrement invalide');
  return key;
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const key = await databaseKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
  if (!cipher?.cipher_version) {
    if (!__DEV__) { await db.closeAsync(); throw new Error('Base non chiffrée : enregistrement refusé'); }
    console.warn('[Nokori] SQLCipher absent (Expo Go ?) : base NON chiffrée, développement uniquement.');
  }
  // première lecture : si la clé ne correspond pas à la base (« file is not a database »), elle est illisible
  try { await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master;'); }
  catch { try { await db.closeAsync(); } catch { /* déjà fermée */ } throw new KeyLostError(); }
  // fichiers temporaires (tris, index) en mémoire plutôt que sur le disque ; contenu effacé réellement écrasé
  await db.execAsync('PRAGMA temp_store = MEMORY; PRAGMA secure_delete = ON;');
  await db.execAsync('CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);');
  return db;
}

const db = () => (dbPromise ??= open().catch(e => { dbPromise = null; throw e; }));

export const kv: KV = {
  async get(key) {
    const row = await (await db()).getFirstAsync<{ v: string }>('SELECT v FROM kv WHERE k = ?;', key);
    return row?.v ?? null;
  },
  async set(key, value) {
    await (await db()).runAsync('INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v;', key, value);
  },
  async wipe() {
    if (dbPromise) { try { await (await dbPromise).closeAsync(); } catch { /* déjà fermée */ } }
    dbPromise = null;
    try { await SQLite.deleteDatabaseAsync(DB_NAME); } catch { /* pas de base */ }
    await SecureStore.deleteItemAsync(KEY_NAME, KEY_OPTS);
  },
};

/**
 * Diagnostic de sécurité, en lecture seule : ne renvoie que des constats, JAMAIS la clé ni une donnée.
 * - version de SQLCipher annoncée par la base ouverte ;
 * - les 16 premiers octets du fichier : un SQLite non chiffré commence toujours par « SQLite format 3 » ;
 * - la clé est-elle présente et bien formée (sa valeur ne sort pas de cette fonction).
 * N'écrit rien et ne crée aucune clé.
 */
export async function storageReport(): Promise<StorageReport> {
  let cipherVersion: string | null = null;
  try { cipherVersion = (await (await db()).getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;'))?.cipher_version || null; } catch { cipherVersion = null; }
  let fileHeaderPlain: boolean | null = null;
  try {
    const f = databaseFile();
    if (f.exists) {
      const h = f.open(FileMode.ReadOnly);
      try { fileHeaderPlain = isPlainSqliteHeader(h.readBytesSync(16)); } finally { h.close(); }
    }
  } catch { fileHeaderPlain = null; }
  let keyPresent = false, keyWellFormed = false;
  try {
    const k = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTS);
    keyPresent = !!k; keyWellFormed = !!k && /^[0-9a-f]{64}$/.test(k);
  } catch { /* trousseau indisponible : clé signalée absente */ }
  return { platform: 'telephone', cipherVersion, fileHeaderPlain, keyPresent, keyWellFormed };
}

/**
 * Drapeaux de test : toujours null dans une version distribuée (preview, production).
 * En développement seulement, on peut en poser depuis la console du débogueur :
 * globalThis.__NOKORI_TEST_FLAGS = { 'test-plantage': 'budget' } (voir docs/TESTS-APPAREILS.md).
 */
export const testFlag = (name: string): string | null =>
  __DEV__ ? ((globalThis as { __NOKORI_TEST_FLAGS?: Record<string, string> }).__NOKORI_TEST_FLAGS?.[name] ?? null) : null;
