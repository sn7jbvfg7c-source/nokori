import { Redirect, useRouter } from 'expo-router';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAppState } from '../state/AppState';
import { useEscapeToClose } from '../ui/useEscapeToClose';

export default function Reglages() {
  const { prefs, savePrefs, wipeAll, profile } = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEscapeToClose(close);
  if (!profile) return <Redirect href="/accueil" />;
  return (
    <SettingsScreen
      prefs={prefs} onChange={savePrefs} onClose={close}
      onEditAnswers={() => router.replace('/accueil')}
      onBackup={() => router.push('/sauvegarde')}
      onLegal={doc => router.push({ pathname: '/legal/[doc]', params: { doc } })}
      onWipe={async () => { await wipeAll(); router.dismissAll(); router.replace({ pathname: '/accueil', params: { supprime: '1' } }); }}
    />
  );
}
