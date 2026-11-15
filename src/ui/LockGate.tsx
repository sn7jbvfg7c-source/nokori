import * as LocalAuthentication from 'expo-local-authentication';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Palette } from '../theme/tokens';
import { font } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';
import { BIG_TEXT_MAX_SCALE } from './a11y';

const RELOCK_AFTER_MS = 60_000;

/**
 * Verrouillage : Face ID / Touch ID / empreinte à l'ouverture (bouton « Déverrouiller ») et,
 * au retour après plus d'une minute en arrière-plan, demande automatique.
 * Quand l'app passe en arrière-plan, son contenu est masqué (aperçu du sélecteur d'apps).
 * Le web n'a pas de biométrie : le verrou n'y est pas proposé.
 */
export function LockGate({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const active = enabled && Platform.OS !== 'web';
  const [locked, setLocked] = useState(active);
  const [hidden, setHidden] = useState(false);
  const [failed, setFailed] = useState(false);
  const leftAt = useRef<number | null>(null);
  const colors = useColors(); const st = useStyles(makeStyles);

  const unlock = useCallback(async () => {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Déverrouiller Nokori', cancelLabel: 'Annuler', disableDeviceFallback: false });
    setFailed(!r.success);
    if (r.success) setLocked(false);
  }, []);

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

  return (
    <View style={{ flex: 1 }}>
      {children}
      {active && (locked || hidden) && (
        <View style={st.cover} accessibilityViewIsModal accessibilityLabel="Nokori est verrouillée">
          <View style={st.icon}><Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={st.k}>残</Text></View>
          {locked && <>
            <Text style={st.title}>Nokori est verrouillée</Text>
            <Text style={st.sub}>Vos montants restent masqués tant que vous n’êtes pas reconnu.</Text>
            <Pressable onPress={unlock} style={st.btn} accessibilityRole="button"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Déverrouiller</Text></Pressable>
            {failed && <Text style={st.err}>Non reconnu. Réessayez.</Text>}
          </>}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  icon: { width: 80, height: 80, borderRadius: 24, backgroundColor: '#C9572C', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  k: { color: '#FFF8F0', fontSize: 44, fontWeight: '800' },
  title: { fontFamily: font.semibold, fontSize: 20, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center' },
  btn: { marginTop: 18, height: 50, paddingHorizontal: 26, borderRadius: 16, backgroundColor: colors.btn, justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 16 },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.vermilion },
});
