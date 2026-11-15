import { dark, light, onColor } from '../tokens';

const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
};
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('palettes', () => {
  test('texte sur fond coloré : le plus lisible des deux', () => {
    expect(onColor('#141412')).toBe('#FFFFFF');
    expect(onColor('#F2EEE8')).toBe('#141412');
    expect(onColor('#D8D0C4')).toBe('#141412');
    expect(onColor('#BC4423')).toBe('#FFFFFF');
  });
  test.each([['clair', light], ['sombre', dark]])('thème %s : contrastes WCAG AA du texte (4,5:1)', (_, p) => {
    expect(contrast(p.ink, p.paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.ink, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.ink2, p.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(p.onBtn, p.btn)).toBeGreaterThanOrEqual(4.5);
  });
  test.each([['clair', light], ['sombre', dark]])('thème %s : chaque pilier reste visible sur la surface (3:1)', (_, p) => {
    for (const c of Object.values(p.pillar)) expect(contrast(c, p.surface)).toBeGreaterThanOrEqual(3);
  });
});
