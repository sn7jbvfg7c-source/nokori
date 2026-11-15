/**
 * Stockage clé-valeur sur iPhone et Android : base SQLite chiffrée par SQLCipher.
 * La clé (256 bits, aléatoire) est rangée dans le trousseau / Keystore, liée à cet appareil :
 * elle ne part ni dans les sauvegardes iCloud ni sur un autre téléphone. Une base restaurée sans sa clé est donc illisible :
 * elle est remplacée par une base vide (voir open()).
 *
 * SQLCipher demande une version compilée de l'app (EAS Build) : il n'existe pas dans Expo Go.
 * En développement, on accepte une base non chiffrée avec un avertissement ;
 * dans l'app publiée, on refuse d'écrire quoi que ce soit si le chiffrement est absent.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import type { KV } from './kv';

const DB_NAME = 'nokori.db';
const KEY_NAME = 'nokori.dbkey';
const KEY_OPTS: SecureStore.SecureStoreOptions = { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY };

const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

async function databaseKey(): Promise<{ key: string; fresh: boolean }> {
  let key = await SecureStore.getItemAsync(KEY_NAME, KEY_OPTS);
  const fresh = !key;
  if (!key) {
    key = toHex(Crypto.getRandomBytes(32));
    await SecureStore.setItemAsync(KEY_NAME, key, KEY_OPTS);
  }
  // la clé est insérée dans une instruction PRAGMA : on n'accepte que 64 caractères hexadécimaux
  if (!/^[0-9a-f]{64}$/.test(key)) throw new Error('Clé de chiffrement invalide');
  return { key, fresh };
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function open(): Promise<SQLite.SQLiteDatabase> {
  const { key, fresh } = await databaseKey();
  // Nouvelle clé alors qu'une base existe déjà : c'est une base restaurée d'une sauvegarde iCloud
  // sur un autre iPhone (la clé, elle, reste sur l'ancien). Illisible sans sa clé : on repart d'une base vide,
  // sinon plus rien ne pourrait être enregistré.
  if (fresh) { try { await SQLite.deleteDatabaseAsync(DB_NAME); } catch { /* pas de base */ } }
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  await db.execAsync(`PRAGMA key = "x'${key}'";`);
  const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version;');
  if (!cipher?.cipher_version) {
    if (!__DEV__) { await db.closeAsync(); throw new Error('Base non chiffrée : enregistrement refusé'); }
    console.warn('[Nokori] SQLCipher absent (Expo Go ?) : base NON chiffrée, développement uniquement.');
  }
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
