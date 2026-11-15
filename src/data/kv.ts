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
  /** web : prévient quand un autre onglet a modifié une valeur */
  subscribe?(key: string, cb: (value: string | null) => void): () => void;
}

const PREFIX = 'nokori:';

export const kv: KV = {
  async get(key) {
    try { return globalThis.localStorage?.getItem(PREFIX + key) ?? null; } catch { return null; }
  },
  async set(key, value) {
    // stockage plein ou bloqué : l'erreur remonte, l'app affiche « Impossible d'enregistrer » (au lieu de faire croire que c'est fait)
    globalThis.localStorage?.setItem(PREFIX + key, value);
  },
  subscribe(key, cb) {
    const w = globalThis as unknown as { addEventListener?: (t: string, f: (e: StorageEvent) => void) => void; removeEventListener?: (t: string, f: (e: StorageEvent) => void) => void };
    if (!w.addEventListener) return () => {};
    const f = (e: StorageEvent) => { if (e.key === PREFIX + key) cb(e.newValue); };
    w.addEventListener('storage', f);
    return () => w.removeEventListener?.('storage', f);
  },
  async wipe() {
    try {
      const ls = globalThis.localStorage;
      if (!ls) return;
      Object.keys(ls).filter(k => k.startsWith(PREFIX)).forEach(k => ls.removeItem(k));
    } catch { /* rien à effacer */ }
  },
};
