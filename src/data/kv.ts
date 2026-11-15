/**
 * Stockage clé-valeur, version web.
 * Le web ne sert qu'au développement et aux tests automatiques : localStorage n'est pas chiffré.
 * Sur iPhone et Android, c'est kv.native.ts qui est utilisé (base SQLite chiffrée).
 */
export interface KV {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  /** efface toutes les données et la clé de chiffrement */
  wipe(): Promise<void>;
}

const PREFIX = 'nokori:';

export const kv: KV = {
  async get(key) {
    try { return globalThis.localStorage?.getItem(PREFIX + key) ?? null; } catch { return null; }
  },
  async set(key, value) {
    try { globalThis.localStorage?.setItem(PREFIX + key, value); } catch { /* stockage indisponible : on garde en mémoire */ }
  },
  async wipe() {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      Object.keys(ls).filter(k => k.startsWith(PREFIX)).forEach(k => ls.removeItem(k));
    } catch { /* rien à effacer */ }
  },
};
