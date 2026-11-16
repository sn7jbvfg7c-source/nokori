import { Redirect, useRouter } from 'expo-router';
import { SettingsScreen } from '../screens/SettingsScreen';
import { useAppState } from '../state/AppState';
import { useEscapeToClose } from '../ui/useEscapeToClose';
import { CrashProbe } from '../ui/CrashProbe';

export default function Reglages() {
  const { prefs, savePrefs, wipeAll, profile } = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEscapeToClose(close);
  if (!profile) return <Redirect href="/accueil" />;
  return (
    <>
    <CrashProbe where="reglages" />
    <SettingsScreen
      prefs={prefs} onChange={savePrefs} onClose={close}
      onEditAnswers={() => router.replace('/accueil')}
      onBackup={() => router.push('/sauvegarde')}
      onSecurity={() => router.push('/securite')}
      onLegal={doc => router.push({ pathname: '/legal/[doc]', params: { doc } })}
      onWipe={async () => { await wipeAll(); router.dismissAll(); router.replace({ pathname: '/accueil', params: { supprime: '1' } }); }}
    />
    </>
  );
}

/** Plantage pendant l'affichage : écran d'erreur au lieu d'un écran blanc (aucune donnée lue ni écrite) */
export { ModalCrash as ErrorBoundary } from '../ui/CrashScreen';
