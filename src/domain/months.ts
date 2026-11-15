/** Une couleur de saison par mois : kanji, nom, couleur claire, couleur foncée (texte blanc lisible) */
export const MONTH_COLORS = [
  { kanji: '椿', name: 'camélia', light: '#C4434F', dark: '#8C2232' },
  { kanji: '梅', name: 'prunier', light: '#C65B7C', dark: '#93365A' },
  { kanji: '若草', name: 'jeune herbe', light: '#6E9A3A', dark: '#4C7424' },
  { kanji: '桜', name: 'cerisier', light: '#CC6F87', dark: '#9C4560' },
  { kanji: '藤', name: 'glycine', light: '#8466B0', dark: '#5B4287' },
  { kanji: '紫陽花', name: 'hortensia', light: '#4F72B5', dark: '#334F8C' },
  { kanji: '海', name: 'océan', light: '#2D8A9A', dark: '#1B6372' },
  { kanji: '向日葵', name: 'tournesol', light: '#B87A12', dark: '#8A5A08' },
  { kanji: '稲穂', name: 'épis de riz', light: '#A08A2E', dark: '#77661C' },
  { kanji: '栗', name: 'châtaigne', light: '#9A6B3F', dark: '#6E4524' },
  { kanji: '柿', name: 'kaki', light: '#D35A31', dark: '#A3361A' },
  { kanji: '松', name: 'pin', light: '#3F7D5E', dark: '#24543D' },
] as const;

export const MONTH_NAMES = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
