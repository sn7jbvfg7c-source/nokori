import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../theme/tokens';
import { font, light } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';
import { setSecureWindow } from '../../modules/nokori-secure';
import { lockOutcome, LOCK_MESSAGES, securityFromLevel, type DeviceSecurity } from '../domain/lock';
import { BIG_TEXT_MAX_SCALE } from './a11y';

const RELOCK_AFTER_MS = 60_000;

/**
 * Verrouillage : Face ID / Touch ID / empreinte à l'ouverture (bouton « Déverrouiller ») et,
 * au retour après plus d'une minute en arrière-plan, demande automatique.
 * Quand l'app passe en arrière-plan, son contenu est masqué (aperçu du sélecteur d'apps) ; sur Android,
 * la fenêtre est en plus marquée sécurisée (FLAG_SECURE) tant que le verrou est activé.
 * Le web n'a pas de biométrie : le verrou n'y est pas proposé.
 */
export function LockGate({ enabled, ready = true, onUnavailable, children }: { enabled: boolean; ready?: boolean; /** le téléphone n'a plus ni code ni biométrie : le verrou est levé et l'appelant doit le désactiver ET prévenir l'utilisateur */ onUnavailable?: () => void; children: ReactNode }) {
  const active = enabled && Platform.OS !== 'web';
  const [locked, setLocked] = useState(active);
  // Les réglages se lisent après le premier affichage : le verrou doit s'enclencher dès qu'on sait qu'il est activé,
  // pas seulement au retour d'arrière-plan. Tant que les données chargent, rien n'est montré.
  const [armed, setArmed] = useState(false);
  if (ready && !armed) { setArmed(true); if (active) setLocked(true); }
  const [hidden, setHidden] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const leftAt = useRef<number | null>(null);
  const colors = useColors(); const st = useStyles(makeStyles);

  const unlock = useCallback(async () => {
    let r: LocalAuthentication.LocalAuthenticationResult;
    try { r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Nokori', cancelLabel: 'Annuler', disableDeviceFallback: false }); }
    catch { setMessage(LOCK_MESSAGES.echec); return; } // jamais de déverrouillage sur une exception
    // erreur qui pourrait vouloir dire « plus aucune protection » : on interroge l'état réel du téléphone avant de décider
    let security: DeviceSecurity = 'inconnue';
    if (!r.success && (r.error === 'not_enrolled' || r.error === 'passcode_not_set' || r.error === 'not_available')) {
      try { security = securityFromLevel(await LocalAuthentication.getEnrolledLevelAsync()); } catch { security = 'inconnue'; }
    }
    const o = lockOutcome(r, security);
    if (o.kind === 'reste-verrouille') { setMessage(o.message); return; }
    setMessage(null);
    setLocked(false);
    // plus ni code ni biométrie : le verrou ne protégerait plus rien et garderait l'utilisateur dehors (désactivation signalée)
    if (o.kind === 'desactive') onUnavailable?.();
  }, [onUnavailable]);

  // Android : l'aperçu des apps récentes est capturé avant que le voile ci-dessous ait le temps de s'afficher.
  // Tant que le verrou est activé, la fenêtre est marquée « sécurisée » (aperçu masqué, captures bloquées).
  useEffect(() => {
    setSecureWindow(active);
    return () => setSecureWindow(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') {
        setHidden(false);
        if (leftAt.current !== null && Date.now() - leftAt.current > RELOCK_AFTER_MS) { setLocked(true); unlock(); }
        leftAt.current = null;
      } else {
        setHidden(true);
        if (leftAt.current === null) leftAt.current = Date.now();
      }
    });
    return () => sub.remove();
  }, [active, unlock]);

  // demande Face ID tout de suite à l'ouverture, une seule fois (le bouton « Déverrouiller » reste là si on annule)
  const asked = useRef(false);
  useEffect(() => {
    if (active && locked && armed && !asked.current) { asked.current = true; unlock(); }
  }, [active, locked, armed, unlock]);

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1 }} importantForAccessibility={active && (locked || hidden || !armed) ? 'no-hide-descendants' : 'auto'} accessibilityElementsHidden={active && (locked || hidden || !armed)}>
        {children}
      </View>
      {active && (locked || hidden || !armed) && (
        <View style={st.cover} accessibilityViewIsModal accessibilityLabel="Nokori est verrouillée">
          <View style={st.icon} aria-hidden><Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={st.k}>残</Text></View>
          {locked && <>
            <Text style={st.title}>Nokori est verrouillée</Text>
            <Text style={st.sub}>Vos montants restent masqués tant que vous n’êtes pas reconnu.</Text>
            <Pressable onPress={unlock} style={st.btn} accessibilityRole="button"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Déverrouiller</Text></Pressable>
            {message && <Text style={st.err} accessibilityRole="alert" accessibilityLiveRegion="polite">{message}</Text>}
          </>}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  icon: { width: 80, height: 80, borderRadius: 24, backgroundColor: light.vermilion, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  k: { color: '#FFF8F0', fontSize: 44, fontFamily: font.bold },
  title: { fontFamily: font.semibold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  btn: { marginTop: 18, height: 50, paddingHorizontal: 26, borderRadius: 16, backgroundColor: colors.btn, justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 16 },
  err: { fontFamily: font.medium, fontSize: 13, lineHeight: 18, color: colors.vermilion, textAlign: 'center', maxWidth: 320 },
});
