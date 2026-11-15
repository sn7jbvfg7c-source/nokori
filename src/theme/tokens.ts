import type { PillarId } from '../domain/types';

/** Palette d'un thème. Les écrans lisent la palette courante via useColors(), jamais une couleur figée. */
export interface Palette {
  dark: boolean;
  paper: string;
  surface: string;
  ink: string;
  ink2: string;
  ink3: string;
  hair: string;
  /** fond léger des pastilles, champs et boutons secondaires */
  fill: string;
  /** bordures et fonds un peu plus marqués */
  fill2: string;
  vermilion: string;
  teal: string;
  /** bouton principal et texte posé dessus */
  btn: string;
  onBtn: string;
  pillar: Record<PillarId, string>;
}

export const light: Palette = {
  dark: false,
  paper: '#F7F4EF', surface: '#FFFFFF', ink: '#141412', ink2: '#65615A', ink3: '#B4B0A7',
  hair: 'rgba(20,20,18,0.08)', fill: 'rgba(20,20,18,0.06)', fill2: 'rgba(20,20,18,0.14)',
  vermilion: '#B54020', teal: '#467A6B', btn: '#141412', onBtn: '#FFFFFF',
  pillar: { besoins: '#26231F', envies: '#B54020', culture: '#A27A26', imprevus: '#467A6B' },
};

export const dark: Palette = {
  dark: true,
  paper: '#151412', surface: '#201E1B', ink: '#F2EEE8', ink2: '#A8A196', ink3: '#6F695F',
  hair: 'rgba(255,255,255,0.08)', fill: 'rgba(255,255,255,0.08)', fill2: 'rgba(255,255,255,0.16)',
  vermilion: '#E26A44', teal: '#5E9B89', btn: '#F2EEE8', onBtn: '#151412',
  pillar: { besoins: '#D8D0C4', envies: '#E26A44', culture: '#C9A04A', imprevus: '#5E9B89' },
};

/** Palette claire, pour le code hors écran (tests, valeurs par défaut) */
export const colors = light;
export const pillarColor = light.pillar;

/** Teinte légère d'une couleur hexadécimale (fond des pastilles) */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** Texte lisible sur un fond donné : sombre sur fond clair, blanc sur fond foncé (luminance relative WCAG) */
export function onColor(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const lin = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // contraste avec le blanc contre contraste avec l'encre : on prend le meilleur
  return (1.05 / (L + 0.05)) >= ((L + 0.05) / (0.0067 + 0.05)) ? '#FFFFFF' : '#141412';
}

export const font = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
};
