import type { PillarId } from '../domain/types';

/** Couleurs et typographie reprises du prototype */
export const colors = {
  paper: '#F7F4EF',
  surface: '#FFFFFF',
  ink: '#141412',
  ink2: '#6E6A62',
  ink3: '#B4B0A7',
  hair: 'rgba(20,20,18,0.08)',
  vermilion: '#BC4423',
  teal: '#467A6B',
};

export const pillarColor: Record<PillarId, string> = {
  besoins: '#26231F',
  envies: '#BC4423',
  culture: '#A27A26',
  imprevus: '#467A6B',
};

/** Teinte légère d'une couleur hexadécimale (fond des pastilles) */
export function tint(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const font = {
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semibold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
};
