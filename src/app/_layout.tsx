import { Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold, useFonts } from '@expo-google-fonts/geist';
import Feather from '@expo/vector-icons/Feather';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { cancelReminders, notificationsSupported, scheduleReminders } from '../data/notify';
import { reminders } from '../domain/reminders';
import { BackupScreen } from '../screens/BackupScreen';
import { AppStateProvider, EMPTY_DATA, forRestore, useAppState } from '../state/AppState';
import { ThemeProvider, useColors } from '../theme/theme';
import { font, light, radius, space } from '../theme/tokens';
import { DataProblem } from '../ui/DataProblem';
import { LockGate } from '../ui/LockGate';
import { MoneyProvider } from '../ui/money';
import { WebFrame } from '../ui/WebFrame';

/** Bandeau en haut de l'écran quand un enregistrement a échoué */
function SaveError() {
  const { error } = useAppState();
  const c = useColors(); const insets = useSafeAreaInsets();
  if (!error) return null;
  return (
    <View style={[s.banner, { top: insets.top + space.sm, backgroundColor: c.vermilion }]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
      <Feather name="alert-circle" size={16} color="#fff" />
      <Text style={s.bannerTxt}>{error}</Text>
    </View>
  );
}

function Shell() {
  const c = useColors();
  const { prefs, profile, ready, status, retryLoad, startFresh, replaceAll, unreadableReason, savePrefs } = useAppState();
  const [restoring, setRestoring] = useState(false);
  // rappels : reprogrammés à chaque changement du profil ou du réglage
  useEffect(() => {
    if (status !== 'ok' || !notificationsSupported) return;
    // montants masqués : les rappels ne disent même pas quelle charge arrive (écran verrouillé visible par d'autres)
    if (prefs.alerts && profile) scheduleReminders(reminders(profile, new Date(), 3, 62, prefs.hideAmounts)).catch(() => {});
    else cancelReminders().catch(() => {});
  }, [status, prefs.alerts, prefs.hideAmounts, profile]);

  // tant que les données ne sont pas lues, aucun écran : un lien direct (/depense?id=…) ne doit pas démarrer sur un état vide
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.paper }} />;

  if (status === 'erreur' || status === 'illisible') {
    return (
      <LockGate enabled={prefs.lock} ready onUnavailable={() => savePrefs({ lock: false })}>
      <View style={{ flex: 1, backgroundColor: c.paper }}>
        {restoring
          ? <BackupScreen mode="restore" data={EMPTY_DATA} today={new Date()} onReplace={d => replaceAll(forRestore(d))} onExported={() => {}} onClose={() => setRestoring(false)} />
          : <DataProblem status={status} reason={unreadableReason} onRetry={retryLoad} onStartFresh={startFresh} onRestore={status === 'illisible' ? () => setRestoring(true) : undefined} />}
        <StatusBar style={c.dark ? 'light' : 'dark'} />
      </View>
      </LockGate>
    );
  }
  return (
    <LockGate enabled={ready && prefs.lock} ready={ready} onUnavailable={() => savePrefs({ lock: false })}>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.paper } }}>
        <Stack.Screen name="depense" options={{ presentation: 'modal' }} />
        <Stack.Screen name="reglages" options={{ presentation: 'modal' }} />
        <Stack.Screen name="sauvegarde" options={{ presentation: 'modal' }} />
      </Stack>
      <SaveError />
      <StatusBar style={c.dark ? 'light' : 'dark'} />
    </LockGate>
  );
}

function Themed() {
  const { prefs } = useAppState();
  return (
    <ThemeProvider pref={prefs.theme}>
      <MoneyProvider hidden={prefs.hideAmounts}>
        <WebFrame>
          <Shell />
        </WebFrame>
      </MoneyProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({ Geist_400Regular, Geist_500Medium, Geist_600SemiBold, Geist_700Bold });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: light.paper }} />;
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <Themed />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  banner: { position: 'absolute', left: space.gutter, right: space.gutter, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.md },
  bannerTxt: { flex: 1, color: '#fff', fontFamily: font.medium, fontSize: 13, lineHeight: 18 },
});

