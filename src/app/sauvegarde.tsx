import { useRouter } from 'expo-router';
import { BackupScreen } from '../screens/BackupScreen';
import { forRestore, useAppState } from '../state/AppState';

export default function Sauvegarde() {
  const state = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const { profile, history, expenses, dismissed, accounts, goals, notes, prefs } = state;
  return (
    <BackupScreen
      data={{ profile, history, expenses, dismissed, accounts, goals, notes, prefs }} today={new Date()}
      onReplace={d => state.replaceAll(forRestore(d))}
      onExported={date => state.savePrefs({ lastBackup: date })}
      onClose={close}
    />
  );
}
