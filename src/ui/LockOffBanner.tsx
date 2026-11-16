import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { lockOffNotice } from '../domain/lock';
import { MONTH_NAMES } from '../domain/months';
import { useAppState } from '../state/AppState';
import { useColors } from '../theme/theme';
import { radius, space } from '../theme/tokens';
import { Button, Notice } from './kit';

/**
 * Avis conservé après une désactivation automatique du verrou (téléphone sans code ni biométrie),
 * affiché au-dessus de la barre d'onglets jusqu'à ce que l'utilisateur le lise. Il ne couvre ni l'en-tête ni la navigation.
 */
export function LockOffBanner({ tabBarHeight }: { tabBarHeight: number }) {
  const { prefs, savePrefs } = useAppState();
  const c = useColors(); const insets = useSafeAreaInsets();
  if (!prefs.lockOff) return null;
  return (
    <View style={[st.box, { bottom: tabBarHeight + insets.bottom + space.sm, backgroundColor: c.surface, borderColor: c.hair }]} accessibilityRole="alert">
      <Notice icon="unlock" tone="warn">{lockOffNotice(prefs.lockOff.date, MONTH_NAMES)}</Notice>
      <Button label="Compris" variant="secondary" small onPress={() => savePrefs({ lockOff: undefined })} style={{ alignSelf: 'flex-end' }} />
    </View>
  );
}

const st = StyleSheet.create({
  box: { position: 'absolute', left: space.gutter, right: space.gutter, padding: space.md, gap: space.sm, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth * 2,
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
});
