import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { legalDocs, type LegalDocId } from '../../legal/documents';
import { needsConsent } from '../../legal/consent';
import { trackersForThisSession } from '../../legal/sessionTrackers';
import { LegalScreen } from '../../screens/LegalScreen';
import { useAppState } from '../../state/AppState';
import { Button } from '../../ui/kit';
import { useEscapeToClose } from '../../ui/useEscapeToClose';

/** /legal/mentions, /legal/confidentialite, /legal/conditions, /legal/remboursement, /legal/cookies, /legal/licences */
export default function Legal() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const { prefs, savePrefs } = useAppState();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  useEscapeToClose(close);
  const docs = legalDocs();
  if (!doc || !(doc in docs)) return <Redirect href="/" />;
  const trackers = trackersForThisSession();
  // Cookies : si des traceurs facultatifs existent un jour, le choix se modifie ici à tout moment
  const extra = doc === 'cookies' && trackers.length > 0
    ? <Button label="Modifier mes choix" variant="secondary" onPress={() => savePrefs({ consent: undefined })} a11yLabel={needsConsent(trackers, prefs.consent) ? 'Choisir pour les traceurs facultatifs' : 'Modifier mes choix sur les traceurs facultatifs'} />
    : undefined;
  return <LegalScreen doc={docs[doc as LegalDocId]} onClose={close} extra={extra} />;
}

/** Plantage pendant l'affichage : écran d'erreur au lieu d'un écran blanc (aucune donnée lue ni écrite) */
export { ModalCrash as ErrorBoundary } from '../../ui/CrashScreen';
