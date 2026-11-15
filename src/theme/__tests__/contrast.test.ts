import { GOAL_TYPES } from '../../domain/goals';
import { MONTH_COLORS } from '../../domain/months';
import { dark, light, onColor } from '../tokens';

// Contraste WCAG entre deux couleurs hexadécimales opaques
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(n >> 16) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255);
};
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
// fond d'une couleur rgba posée sur un fond opaque
const over = (rgba: string, bg: string) => {
  const [r, g, b, a] = rgba.match(/[\d.]+/g)!.map(Number);
  const n = parseInt(bg.slice(1), 16), base = [n >> 16, (n >> 8) & 255, n & 255];
  return '#' + [r, g, b].map((v, i) => Math.round(a * v + (1 - a) * base[i]).toString(16).padStart(2, '0')).join('');
};

describe('contrastes (WCAG AA, texte courant : 4,5:1)', () => {
  test.each([['clair', light], ['sombre', dark]])('thème %s : textes principal et secondaire lisibles sur tous les fonds', (_, c) => {
    for (const bg of [c.paper, c.surface, over(c.fill, c.paper), over(c.fill, c.surface)]) {
      expect(ratio(c.ink, bg)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c.ink2, bg)).toBeGreaterThanOrEqual(4.5);
    }
    expect(ratio(c.onBtn, c.btn)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(onColor(c.vermilion), c.vermilion)).toBeGreaterThanOrEqual(4.5);
  });
  test('texte blanc lisible sur les 12 couleurs de mois (haut et bas du dégradé)', () => {
    for (const m of MONTH_COLORS) {
      expect(ratio('#FFFFFF', m.light)).toBeGreaterThanOrEqual(4.5);
      expect(ratio('#FFFFFF', m.dark)).toBeGreaterThanOrEqual(4.5);
    }
  });
  test('étiquettes des types d’objectif lisibles', () => {
    for (const t of GOAL_TYPES) expect(ratio(onColor(t.color), t.color)).toBeGreaterThanOrEqual(4.5);
  });
  test('sceau d’épargne : blanc sur vermillon clair', () => {
    expect(ratio('#FFFFFF', light.vermilion)).toBeGreaterThanOrEqual(4.5);
  });
});
