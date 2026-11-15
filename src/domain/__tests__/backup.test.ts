import { EMPTY, type AppData } from '../../data/persist';
import { BackupError, createBackup, fromB64, KDF, openBackup, passphraseProblem, readHeader, toB64 } from '../backup';

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
