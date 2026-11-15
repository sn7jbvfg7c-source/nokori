import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askPermission, notificationsSupported } from '../data/notify';
import type { Prefs } from '../data/persist';
import type { ThemePref } from '../theme/theme';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font } from '../theme/tokens';

interface Props { prefs: Prefs; onChange: (p: Partial<Prefs>) => void; onClose: () => void; onEditAnswers: () => void; onWipe: () => void }

export function SettingsScreen({ prefs, onChange, onClose, onEditAnswers, onWipe }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useColors(); const st = useStyles(makeStyles);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const web = Platform.OS === 'web';

  const toggleLock = async (on: boolean) => {
    setMsg(null);
    if (!on) return onChange({ lock: false });
    if (!(await LocalAuthentication.hasHardwareAsync()) || !(await LocalAuthentication.isEnrolledAsync())) return setMsg('Aucun Face ID, Touch ID ou empreinte configuré sur ce téléphone.');
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: 'Activer le verrouillage', cancelLabel: 'Annuler' });
    if (r.success) onChange({ lock: true });
  };
  const toggleAlerts = async (on: boolean) => {
    setMsg(null);
    if (!on) return onChange({ alerts: false });
    if (await askPermission()) onChange({ alerts: true });
    else setMsg('Notifications refusées : autorisez-les dans les réglages du téléphone.');
  };

  const row = (title: string, sub: string, value: boolean, onToggle: (v: boolean) => void, disabled = false) => (
    <View style={st.row}>
      <View style={{ flex: 1 }}><Text style={[st.rowT, disabled && { color: colors.ink3 }]}>{title}</Text><Text style={st.rowS}>{sub}</Text></View>
      <Switch value={value} onValueChange={onToggle} disabled={disabled} accessibilityLabel={title}
        trackColor={{ false: colors.fill2, true: colors.teal }} thumbColor="#FFFFFF" />
    </View>
  );

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <View style={st.head}>
        <Text style={st.title}>Réglages</Text>
        <Pressable onPress={onClose} style={st.close} accessibilityRole="button" accessibilityLabel="Fermer les réglages"><Text style={st.closeTxt}>×</Text></Pressable>
      </View>

      <Text style={st.sec}>Affichage</Text>
      <View style={st.card}>
        <Text style={st.rowT}>Thème</Text>
        <View style={st.seg} accessibilityRole="radiogroup">
          {([['auto', 'Auto'], ['clair', 'Clair'], ['sombre', 'Sombre']] as [ThemePref, string][]).map(([k, l]) => (
            <Pressable key={k} onPress={() => onChange({ theme: k })} style={[st.segBtn, prefs.theme === k && st.segOn]} accessibilityRole="radio" accessibilityState={{ checked: prefs.theme === k }} accessibilityLabel={`Thème ${l}`}>
              <Text style={[st.segTxt, prefs.theme === k && { color: colors.ink }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={st.rowS}>« Auto » suit le réglage du téléphone.</Text>
        <View style={st.sep} />
        {row('Masquer les montants', 'Pour ouvrir l’app en public : budget et comptes floutés', prefs.hideAmounts, v => onChange({ hideAmounts: v }))}
      </View>

      <Text style={st.sec}>Sécurité</Text>
      <View style={st.card}>
        {row('Verrouillage Face ID', web ? 'Indisponible dans le navigateur' : 'À l’ouverture et après 1 minute en arrière-plan', prefs.lock, toggleLock, web)}
      </View>

      <Text style={st.sec}>Rappels</Text>
      <View style={st.card}>
        {row('Avant chaque prélèvement', notificationsSupported ? 'Une notification 3 jours avant, sans montant affiché' : 'Indisponible dans le navigateur', prefs.alerts, toggleAlerts, !notificationsSupported)}
      </View>
      {msg && <Text style={st.msg} accessibilityLiveRegion="polite">{msg}</Text>}

      <Text style={st.sec}>Mon budget</Text>
      <View style={st.card}>
        <Pressable onPress={onEditAnswers} style={st.link} accessibilityRole="button"><Text style={st.rowT}>Modifier mes réponses</Text><Text style={st.chev}>›</Text></Pressable>
      </View>

      <Text style={st.sec}>Vos données</Text>
      <View style={st.card}>
        <Text style={st.rowS}>Tout est enregistré sur ce téléphone, dans une base chiffrée. Nokori n’a pas de serveur et ne se connecte à aucune banque.</Text>
        <View style={st.sep} />
        {confirm ? (
          <View style={{ gap: 10 }}>
            <Text style={[st.rowT, { color: colors.vermilion }]}>Tout effacer de ce téléphone ?</Text>
            <Text style={st.rowS}>Dépenses, charges, comptes, objectifs et bilans seront supprimés. C’est définitif.</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => setConfirm(false)} style={[st.btn, { backgroundColor: colors.fill }]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
              <Pressable onPress={onWipe} style={[st.btn, { backgroundColor: colors.vermilion }]} accessibilityRole="button" accessibilityLabel="Confirmer : tout effacer"><Text style={[st.btnTxt, { color: '#fff' }]}>Tout effacer</Text></Pressable>
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setConfirm(true)} style={st.link} accessibilityRole="button" accessibilityLabel="Tout effacer"><Text style={[st.rowT, { color: colors.vermilion }]}>Tout effacer</Text></Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 22, color: colors.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 22, lineHeight: 24, color: colors.ink },
  sec: { fontFamily: font.medium, fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.ink2, marginHorizontal: 24, marginTop: 22, marginBottom: 8 },
  card: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowT: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowS: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: colors.ink2, marginTop: 2 },
  seg: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 12, padding: 3, marginTop: 4 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface },
  segTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
  sep: { height: 1, backgroundColor: colors.hair, marginVertical: 4 },
  msg: { fontFamily: font.medium, fontSize: 13, color: colors.vermilion, marginHorizontal: 24, marginTop: 8 },
  link: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  chev: { fontSize: 22, color: colors.ink2 },
  btn: { flex: 1, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
});
