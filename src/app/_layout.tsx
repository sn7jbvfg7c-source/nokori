import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../state/AppState';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
        <StatusBar style="dark" />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
