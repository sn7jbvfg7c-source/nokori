import { press, toCents, type Key } from '../keypad';

const type = (keys: string) => [...keys].reduce((s, k) => press(s, k as Key), '0');

describe('pavé numérique', () => {
  test('saisie simple', () => {
    expect(type('480')).toBe('480');
    expect(type('4,8')).toBe('4,8');
    expect(toCents(type('4,8'))).toBe(480);
  });
  test('pas de zéro inutile au début', () => expect(type('007')).toBe('7'));
  test('une seule virgule, deux décimales au plus', () => {
    expect(type('1,,2')).toBe('1,2');
    expect(type('1,234')).toBe('1,23');
  });
  test('virgule en premier : 0,50', () => {
    expect(type(',5')).toBe('0,5');
    expect(toCents(type(',5'))).toBe(50);
  });
  test('effacer', () => {
    expect(press('12', '⌫')).toBe('1');
    expect(press('1', '⌫')).toBe('0');
    expect(press('0', '⌫')).toBe('0');
  });
  test('plafond de 100 000 €', () => {
    expect(type('100000')).toBe('100000');
    expect(type('1000001')).toBe('100000');
    expect(type('999999')).toBe('99999');
    expect(toCents(type('100000,5'))).toBe(10_000_000);
  });
  test('montant affiché toujours valide', () => {
    let s = '0';
    const keys: Key[] = ['9', ',', '9', '9', '9', '⌫', ',', '1', '0', '0', '0', '0', '0'];
    for (const k of keys) { s = press(s, k); expect(toCents(s)).toBeLessThanOrEqual(10_000_000); expect(/^\d{1,6}(,\d{0,2})?$/.test(s)).toBe(true); }
  });
});
