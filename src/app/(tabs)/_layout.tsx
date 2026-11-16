import Feather from '@expo/vector-icons/Feather';
import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../../state/AppState';
import { useColors } from '../../theme/theme';
import { font } from '../../theme/tokens';
import { LockOffBanner } from '../../ui/LockOffBanner';

const TAB_BAR = 66;

/** Barre d'onglets ; sans profil, on part vers l'accueil */
export default function TabsLayout() {
  const { ready, profile } = useAppState();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.ink2} accessibilityLabel="Chargement" /></View>;
  if (!profile) return <Redirect href="/accueil" />;
  return (
    <View style={{ flex: 1 }}>
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.ink2,
      // hauteur fixée avec la marge de sécurité du téléphone : l'icône et le libellé ne sont jamais coupés
      tabBarStyle: { backgroundColor: colors.paper, borderTopColor: colors.hair, height: TAB_BAR + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
      tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11.5 },
      sceneStyle: { backgroundColor: colors.paper },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Budget', tabBarIcon: ({ color, size }) => <Feather name="pie-chart" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="activite" options={{ title: 'Activité', tabBarIcon: ({ color, size }) => <Feather name="list" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="comptes" options={{ title: 'Comptes', tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="objectifs" options={{ title: 'Objectifs', tabBarIcon: ({ color, size }) => <Feather name="target" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="bilan" options={{ title: 'Bilan', tabBarIcon: ({ color, size }) => <Feather name="file-text" color={String(color)} size={size - 2} /> }} />
    </Tabs>
    <LockOffBanner tabBarHeight={TAB_BAR} />
    </View>
  );
}
