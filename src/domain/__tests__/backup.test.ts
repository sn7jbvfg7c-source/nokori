import { EMPTY, type AppData } from '../../data/persist';
import { SAUVEGARDE_V1 } from './fixtures/sauvegardeV1';
import { BackupError, createBackup, fromB64, KDF, KDF_MAX_N, openBackup, passphraseProblem, readHeader, scryptMemory, toB64 } from '../backup';

const rnd = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const today = new Date(2026, 10, 15);
const data: AppData = {
  ...EMPTY,
  profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.15, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
  expenses: [{ id: 'a', date: '2026-11-02', label: 'Café ☕ à Montréal', categoryId: 'restos', amount: 480 }],
  accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: -12000, updated: '2026-11-14' }],
  notes: { '2026-10': 'Moins de livraisons, plus de marché' },
};
const PASS = 'riz gris sous la pluie';

jest.setTimeout(30000);

describe('sauvegarde chiffrée', () => {
  let file: string;
  beforeAll(async () => { file = await createBackup(data, PASS, today, rnd); });

  test('aller-retour : toutes les données reviennent à l’identique (accents et emoji compris)', async () => {
    expect(await openBackup(file, PASS)).toEqual(data);
  });
  test('le fichier ne contient aucune donnée lisible', () => {
    for (const secret of ['Loyer', 'Montréal', 'livraisons', '248000', 'Compte courant']) expect(file).not.toContain(secret);
  });
  test('en-tête : format, version, paramètres scrypt, date', () => {
    const h = readHeader(file);
    expect(h.format).toBe('nokori-sauvegarde');
    expect(h.kdf).toMatchObject({ name: 'scrypt', N: KDF.N, r: 8, p: 1 });
    expect(h.cipher.name).toBe('aes-256-gcm');
    expect(h.created).toBe('2026-11-15');
  });
  test('deux sauvegardes des mêmes données ne se ressemblent pas (sel et nonce aléatoires)', async () => {
    const other = await createBackup(data, PASS, today, rnd);
    expect(JSON.parse(other).data).not.toBe(JSON.parse(file).data);
  });
  test('mauvaise phrase secrète : refusée, message clair', async () => {
    await expect(openBackup(file, 'riz gris sous la neige')).rejects.toMatchObject({ code: 'phrase-ou-fichier' });
  });
  test('un seul octet modifié dans les données : refusé', async () => {
    const j = JSON.parse(file); const b = fromB64(j.data)!; b[5] ^= 1; j.data = toB64(b);
    await expect(openBackup(JSON.stringify(j), PASS)).rejects.toMatchObject({ code: 'phrase-ou-fichier' });
  });
  test('en-tête trafiqué (date changée) : refusé, car il est authentifié', async () => {
    const j = JSON.parse(file); j.created = '2020-01-01';
    await expect(openBackup(JSON.stringify(j), PASS)).rejects.toMatchObject({ code: 'phrase-ou-fichier' });
  });
  test('un fichier quelconque n’est pas une sauvegarde', async () => {
    for (const t of ['bonjour', '{}', '{"format":"autre"}', JSON.stringify({ ...JSON.parse(file), kdf: { name: 'scrypt', N: 3, r: 8, p: 1, salt: 'AA==' } })])
      await expect(openBackup(t, PASS)).rejects.toBeInstanceOf(BackupError);
  });
  test('paramètres de calcul démesurés (attaque par épuisement de mémoire) : refusés avant tout calcul', () => {
    const j = { ...JSON.parse(file), kdf: { ...JSON.parse(file).kdf, N: 2 ** 22 } };
    expect(() => readHeader(JSON.stringify(j))).toThrow(BackupError);
  });
  test('sauvegarde d’une version plus récente : message de mise à jour', () => {
    const j = { ...JSON.parse(file), v: 99 };
    expect(() => readHeader(JSON.stringify(j))).toThrow(expect.objectContaining({ code: 'version-future' }));
  });
  test('phrase trop courte refusée', async () => {
    expect(passphraseProblem('court')).not.toBeNull();
    expect(passphraseProblem('assez longue')).toBeNull();
    await expect(createBackup(data, 'court', today, rnd)).rejects.toThrow();
  });
  test('la phrase est normalisée : « é » composé ou décomposé donne la même clé', async () => {
    const f = await createBackup(data, 'café au lait', today, rnd);
    expect(await openBackup(f, 'café au lait')).toEqual(data);
  });
  test('base64 : aller-retour sur toutes les longueurs', () => {
    for (let n = 0; n < 40; n++) { const b = rnd(n); expect(fromB64(toB64(b))).toEqual(b); expect(toB64(b)).toBe(btoa(String.fromCharCode(...b))); }
    expect(fromB64('pas du base64!')).toBeNull();
  });
});

/** A2 : les fichiers déjà créés restent lisibles, et le lecteur accepte un renforcement futur de la dérivation */
describe('compatibilité des sauvegardes', () => {
  // fichier créé le 16/11/2026 par la version d'avant ce changement (commit 843493e), phrase faible de 8 caractères
  const OLD = SAUVEGARDE_V1;
  const OLD_DATA: AppData = {
    ...EMPTY,
    profile: { income: 248000, extraIncome: 0, payday: 1, savePct: 0.15, charges: [{ id: 'loyer', name: 'Loyer', group: 'logement', amount: 78000, day: 5, freq: 'mois' }] },
    expenses: [{ id: 'a', date: '2026-11-02', label: 'Café ☕ à Montréal', categoryId: 'restos', amount: 480 }, { id: 'b', date: '2026-10-12', label: 'Marché', categoryId: 'courses', amount: 4000 }],
    accounts: [{ id: 'c', name: 'Compte courant', kind: 'courant', balance: -12000, updated: '2026-11-14' }],
    goals: [{ id: 'g', name: 'Japon', type: 'voyage', target: 300000, saved: 90000, monthly: 20000 }],
    notes: { '2026-10': 'Moins de livraisons, plus de marché' },
  };
  test('une sauvegarde créée par une version précédente (phrase de 8 caractères) se restaure à l’identique', async () => {
    expect(readHeader(OLD).kdf).toMatchObject({ N: 2 ** 15, r: 8, p: 1 });
    expect(await openBackup(OLD, '12345678')).toEqual(OLD_DATA);
  });
  test('la même sauvegarde avec une mauvaise phrase reste refusée', async () => {
    await expect(openBackup(OLD, '12345679')).rejects.toMatchObject({ code: 'phrase-ou-fichier' });
  });
  test('le lecteur accepte N de 2^10 à 2^17 (renforcement futur possible)', async () => {
    expect(KDF_MAX_N).toBe(2 ** 17);
    for (const N of [2 ** 10, 2 ** 16, 2 ** 17]) {
      const f = await createBackup(data, PASS, today, rnd, undefined, { N, r: 8, p: 1 });
      expect(readHeader(f).kdf.N).toBe(N);
      expect(await openBackup(f, PASS)).toEqual(data);
    }
  });
  test('au-delà de 2^17 ou N non puissance de 2 : refusé avant tout calcul', () => {
    const base = JSON.parse(OLD);
    for (const N of [2 ** 18, 2 ** 22, 3 * 2 ** 15, 2 ** 9]) {
      expect(() => readHeader(JSON.stringify({ ...base, kdf: { ...base.kdf, N } }))).toThrow(BackupError);
    }
  });
  test('la mémoire autorisée suit N (l’ancienne limite fixe de 2^27 aurait refusé 2^17)', () => {
    expect(scryptMemory({ N: 2 ** 15, r: 8, p: 1 })).toBeLessThan(2 ** 27);
    expect(scryptMemory({ N: 2 ** 17, r: 8, p: 1 })).toBeGreaterThan(2 ** 27);
    expect(scryptMemory({ N: 2 ** 17, r: 8, p: 1 })).toBeLessThan(2 ** 28);
  });
  test('les nouvelles sauvegardes gardent le réglage actuel (2^15, inchangé tant que la mesure sur téléphone n’est pas faite)', () => {
    expect(KDF).toEqual({ N: 2 ** 15, r: 8, p: 1 });
  });
});
