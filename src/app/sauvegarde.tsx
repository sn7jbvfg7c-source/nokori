import { useState } from 'react';
import { useRouter } from 'expo-router';
import { BackupScreen } from '../screens/BackupScreen';
import { forRestore, useAppState } from '../state/AppState';
import { useEscapeToClose } from '../ui/useEscapeToClose';
import { useToday } from '../ui/useToday';

export default function Sauvegarde() {
  const today = useToday();
  const state = useAppState();
  const router = useRouter();
  // décidé à l'ouverture : après une restauration, l'écran ne bascule pas en mode « créer une sauvegarde »
  const [mode] = useState<'all' | 'restore'>(state.profile ? 'all' : 'restore');
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEscapeToClose(close);
  const { profile, history, expenses, dismissed, accounts, goals, notes, prefs } = state;
  return (
    <BackupScreen
      mode={mode}
      onDone={() => { if (router.canDismiss()) router.dismissAll(); router.replace('/'); }}
      data={{ profile, history, expenses, dismissed, accounts, goals, notes, prefs }} today={today}
      onReplace={d => state.replaceAll(forRestore(d))}
      onExported={date => state.savePrefs({ lastBackup: date })}
      onClose={close}
    />
  );
}

/** Plantage pendant l'affichage : écran d'erreur au lieu d'un écran blanc (aucune donnée lue ni écrite) */
export { ModalCrash as ErrorBoundary } from '../ui/CrashScreen';
