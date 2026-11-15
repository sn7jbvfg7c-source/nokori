import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { dark, light, type Palette } from './tokens';

export type ThemePref = 'auto' | 'clair' | 'sombre';

const Ctx = createContext<Palette>(light);

/** Fournit la palette : réglage de l'utilisateur, ou celui du téléphone en « auto » */
export function ThemeProvider({ pref, children }: { pref: ThemePref; children: ReactNode }) {
  const system = useColorScheme();
  const palette = pref === 'sombre' || (pref === 'auto' && system === 'dark') ? dark : light;
  return <Ctx.Provider value={palette}>{children}</Ctx.Provider>;
}

export const useColors = () => useContext(Ctx);

/** Styles recalculés seulement quand la palette change */
export function useStyles<T>(make: (c: Palette) => T): T {
  const c = useColors();
  return useMemo(() => make(c), [make, c]);
}
