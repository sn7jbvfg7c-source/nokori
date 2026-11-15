import { useRouter } from 'expo-router';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAppState } from '../state/AppState';

export default function Reglages() {
  const { prefs, savePrefs, wipeAll } = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return (
    <SettingsScreen
      prefs={prefs} onChange={savePrefs} onClose={close}
      onEditAnswers={() => router.replace('/accueil')}
      onBackup={() => router.push('/sauvegarde')}
      onWipe={async () => { await wipeAll(); router.dismissAll(); router.replace('/accueil'); }}
    />
  );
}
