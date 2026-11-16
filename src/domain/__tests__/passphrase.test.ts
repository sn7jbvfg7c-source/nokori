/** A1 : règle de phrase secrète à la création des sauvegardes (12 caractères, pas de phrase évidente, jauge) */
import { createBackup, openBackup } from '../backup';
import { EMPTY } from '../../data/persist';
import { MIN_PASSPHRASE, passphraseProblem, passphraseStrength } from '../passphrase';

const rnd = (n: number) => globalThis.crypto.getRandomValues(new Uint8Array(n));
const level = (p: string) => passphraseStrength(p).level;

describe('force de la phrase secrète', () => {
  test('12 caractères au moins, comptés en caractères réels (accents, emoji)', () => {
    expect(MIN_PASSPHRASE).toBe(12);
    expect(passphraseProblem('onze carac.')).toMatch(/encore 1/);
    expect(passphraseProblem('été à l’île ☀')).toBeNull(); // 13 caractères réels, plus d'unités UTF-16
    expect(passphraseProblem('🌧🌧🌧🌧🌧🌧🌧🌧🌧🌧🌧')).toMatch(/Au moins 12/); // 11 emoji = 22 unités UTF-16
  });
  test('suites de touches ou de chiffres : refusées', () => {
    for (const p of ['123456789012', '098765432109', 'azertyuiopqs', 'qwertyuiop12', 'abcdefghijkl', 'AZERTY UIOP QSD']) {
      expect(passphraseProblem(p)).toMatch(/prévisible|répétitive/);
    }
  });
  test('répétitions : refusées', () => {
    for (const p of ['aaaaaaaaaaaa', 'abcabcabcabc', '121212121212', 'ababababababab', 'xyxyxyxyxyxyz']) expect(level(p)).toBe('faible');
  });
  test('mots de passe courants, même avec des chiffres ou des majuscules autour : refusés', () => {
    for (const p of ['motdepasse123', 'MotDePasse2026!', 'Mot de passe 12', 'password1234', 'iloveyou2026', 'soleilsoleil', 'nokori-nokori']) {
      expect(passphraseProblem(p)).not.toBeNull();
    }
  });
  test('phrases de plusieurs mots : excellentes', () => {
    expect(level('riz gris sous la pluie')).toBe('excellente');
    expect(level('le chat dort sur le canapé bleu')).toBe('excellente');
  });
  test('mots de passe générés (gestionnaire) : acceptés', () => {
    expect(level('Xk9#mP2qLw4z')).toBe('correcte');
    expect(level('Xk9#mP2qLw4z!Rt7v')).toBe('excellente');
  });
  test('phrase correcte mais simple : acceptée sans être « excellente »', () => {
    expect(level('vacances2026')).toBe('correcte');
    expect(passphraseProblem('vacances2026')).toBeNull();
  });
});

describe('la règle ne concerne que la création', () => {
  test('création refusée avec une phrase faible', async () => {
    await expect(createBackup(EMPTY, '12345678', new Date(2026, 10, 16), rnd)).rejects.toThrow();
    await expect(createBackup(EMPTY, '123456789012', new Date(2026, 10, 16), rnd)).rejects.toThrow();
  });
  test('création acceptée avec une phrase valide, et réouverture', async () => {
    const f = await createBackup(EMPTY, 'riz gris sous la pluie', new Date(2026, 10, 16), rnd);
    expect(await openBackup(f, 'riz gris sous la pluie')).toEqual(EMPTY);
  }, 30000);
});
