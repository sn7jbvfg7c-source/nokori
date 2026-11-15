import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { scheduleReminders, cancelReminders, notificationsSupported } from '../data/notify';
import { reminders } from '../domain/reminders';
import { AppStateProvider, useAppState } from '../state/AppState';
import { ThemeProvider, useColors } from '../theme/theme';
import { LockGate } from '../ui/LockGate';

function Shell() {
  const c = useColors();
  const { prefs, profile, ready } = useAppState();
  // rappels : reprogrammés à chaque changement du profil ou du réglage
  useEffect(() => {
    if (!ready || !notificationsSupported) return;
    if (prefs.alerts && profile) scheduleReminders(reminders(profile, new Date())).catch(() => {});
    else cancelReminders().catch(() => {});
  }, [ready, prefs.alerts, profile]);
  return (
    <LockGate enabled={ready && prefs.lock}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
        <Stack.Screen name="depense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reglages" options={{ presentation: 'modal' }} />
      </Stack>
      <StatusBar style={c.dark ? 'light' : 'dark'} />
    </LockGate>
  );
}

function Themed() {
  const { prefs } = useAppState();
  return <ThemeProvider pref={prefs.theme}><Shell /></ThemeProvider>;
}

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#F7F4EF' }} />;
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Themed />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
