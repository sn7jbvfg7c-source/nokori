/**
 * Écran d'onglet : quand l'onglet n'est pas affiché, son contenu est retiré de l'arbre d'accessibilité.
 * Sur le web, les onglets restent montés les uns sous les autres : sans cela, un lecteur d'écran lirait les 5 écrans.
 */
import { useIsFocused } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';

export function TabScene({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  return (
    <View style={{ flex: 1 }} aria-hidden={!focused} importantForAccessibility={focused ? 'auto' : 'no-hide-descendants'} accessibilityElementsHidden={!focused}>
      {children}
    </View>
  );
}
