/**
 * Version web : sur un ordinateur ou une tablette, l'app garde la largeur d'un téléphone,
 * centrée, au lieu de s'étirer sur tout l'écran. Sur iPhone et Android, rien ne change.
 */
import type { ReactNode } from 'react';
import { Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useColors } from '../theme/theme';

/** Largeur maximale de l'app dans un navigateur (un grand téléphone) */
export const WEB_MAX_WIDTH = 480;

export function WebFrame({ children }: { children: ReactNode }) {
  const c = useColors();
  const { width } = useWindowDimensions();
  if (Platform.OS !== 'web') return <>{children}</>;
  const wide = width > WEB_MAX_WIDTH + 40;
  return (
    <View style={[s.outer, { backgroundColor: wide ? (c.dark ? '#0B0A09' : '#E9E3DA') : c.paper }]}>
      <View style={[s.frame, { backgroundColor: c.paper }, wide && s.wide, wide && { borderColor: c.hair }]}>
        {children}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  outer: { flex: 1, alignItems: 'center' },
  frame: { flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH, overflow: 'hidden' },
  wide: { borderLeftWidth: 1, borderRightWidth: 1, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } },
});
