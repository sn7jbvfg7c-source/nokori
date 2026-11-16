import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { storageReport } from '../data/kv';
import { cryptoSelfTest, scryptDuration } from '../domain/securityCheck';
import { SecurityCheckScreen } from '../screens/SecurityCheckScreen';
import { useAppState } from '../state/AppState';
import { useEscapeToClose } from '../ui/useEscapeToClose';

const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/** Réglages › Vérifier la protection (lecture seule : rien n'est écrit) */
export default function Securite() {
  const { prefs } = useAppState();
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEscapeToClose(close);
  const { lock, lastBackup } = prefs;
  const load = useCallback(async () => ({ report: await storageReport(), selfTestOk: await cryptoSelfTest(), lock, lastBackup, today: isoToday() }), [lock, lastBackup]);
  return <SecurityCheckScreen load={load} measure={N => scryptDuration(N)} onClose={close} />;
}

/** Plantage pendant l'affichage : écran d'erreur au lieu d'un écran blanc (aucune donnée lue ni écrite) */
export { ModalCrash as ErrorBoundary } from '../ui/CrashScreen';
