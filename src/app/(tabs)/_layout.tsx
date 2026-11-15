import Feather from '@expo/vector-icons/Feather';
import { Redirect, Tabs } from 'expo-router';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppState } from '../../state/AppState';
import { colors, font } from '../../theme/tokens';

/** Barre d'onglets ; sans profil, on part vers l'accueil */
export default function TabsLayout() {
  const { ready, profile, error } = useAppState();
  const insets = useSafeAreaInsets();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  if (error && !profile) return (
    <View style={{ flex: 1, backgroundColor: colors.paper, justifyContent: 'center', padding: 32 }}>
      <Text style={{ fontFamily: font.semibold, fontSize: 18, color: colors.ink }}>{error}</Text>
    </View>
  );
  if (!profile) return <Redirect href="/accueil" />;
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.ink,
      tabBarInactiveTintColor: colors.ink2,
      // hauteur fixée avec la marge de sécurité du téléphone : l'icône et le libellé ne sont jamais coupés
      tabBarStyle: { backgroundColor: 'rgba(247,244,239,0.97)', borderTopColor: colors.hair, height: 66 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4 },
      tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11.5 },
      sceneStyle: { backgroundColor: colors.paper },
    }}>
      <Tabs.Screen name="index" options={{ title: 'Budget', tabBarIcon: ({ color, size }) => <Feather name="pie-chart" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="activite" options={{ title: 'Activité', tabBarIcon: ({ color, size }) => <Feather name="list" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="comptes" options={{ title: 'Comptes', tabBarIcon: ({ color, size }) => <Feather name="credit-card" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="objectifs" options={{ title: 'Objectifs', tabBarIcon: ({ color, size }) => <Feather name="target" color={String(color)} size={size - 2} /> }} />
      <Tabs.Screen name="bilan" options={{ title: 'Bilan', tabBarIcon: ({ color, size }) => <Feather name="file-text" color={String(color)} size={size - 2} /> }} />
    </Tabs>
  );
}
