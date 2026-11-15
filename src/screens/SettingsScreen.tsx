import Feather from '@expo/vector-icons/Feather';
import * as LocalAuthentication from 'expo-local-authentication';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { askPermission, notificationsSupported } from '../data/notify';
import type { Prefs } from '../data/persist';
import { MONTH_NAMES } from '../domain/months';
import type { ThemePref } from '../theme/theme';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { space, type as t } from '../theme/tokens';
import { Badge, Card, Confirm, IconButton, Notice, Row, ScreenHeader, SectionHeader, Segmented, type IconName } from '../ui/kit';

interface Props { prefs: Prefs; today?: Date; onChange: (p: Partial<Prefs>) => void; onClose: () => void; onEditAnswers: () => void; onBackup: () => void; onWipe: () => void }

/** Une sauvegarde de plus d'un mois mérite un rappel */
export const BACKUP_REMINDER_DAYS = 30;
const longDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTH_NAMES[m - 1]} ${y}`; };

export function SettingsScreen({ prefs, today = new Date(), onChange, onClose, onEditAnswers, onBackup, onWipe }: Props) {
  const insets = useSafeAreaInsets();
  const c = useColors(); const st = useStyles(makeStyles);
  const [msg, setMsg] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const web = Platform.OS === 'web';
  const backupAge = prefs.lastBackup ? Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.parse(prefs.lastBackup + 'T00:00:00Z')) / 86_400_000) : null;

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

  const toggle = (icon: IconName, color: string, title: string, sub: string, value: boolean, onToggle: (v: boolean) => void, disabled = false, first = false) => (
    <Row first={first} title={title} subtitle={sub} left={<Badge color={color} icon={icon} size={34} />}
      right={<Switch value={value} onValueChange={onToggle} disabled={disabled} accessibilityLabel={title} trackColor={{ false: c.fill2, true: c.teal }} thumbColor="#FFFFFF" />} />
  );

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 48 }}>
      <ScreenHeader title="Réglages" right={<IconButton icon="x" label="Fermer les réglages" onPress={onClose} small />} />

      <SectionHeader title="Affichage" />
      <Card style={st.pad}>
        <Text style={st.rowT}>Thème</Text>
        <Segmented role="radio" label="Thème" value={prefs.theme} onChange={(k: ThemePref) => onChange({ theme: k })}
          options={[{ key: 'auto', label: 'Auto', a11y: 'Thème Auto' }, { key: 'clair', label: 'Clair', a11y: 'Thème Clair' }, { key: 'sombre', label: 'Sombre', a11y: 'Thème Sombre' }]} />
        <Text style={st.rowS}>« Auto » suit le réglage du téléphone.</Text>
      </Card>
      <Card style={{ marginTop: space.sm }}>
        {toggle('eye-off', c.ink2, 'Masquer les montants', 'Pour ouvrir l’app en public : les montants des écrans sont remplacés par •••. Ils restent visibles quand vous les saisissez ou les modifiez.', prefs.hideAmounts, v => onChange({ hideAmounts: v }), false, true)}
      </Card>

      <SectionHeader title="Sécurité et rappels" />
      <Card>
        {toggle('lock', c.vermilion, 'Verrouillage Face ID', web ? 'Indisponible dans le navigateur' : 'À l’ouverture et après 1 minute en arrière-plan', prefs.lock, toggleLock, web, true)}
        {toggle('bell', c.teal, 'Avant chaque prélèvement', notificationsSupported ? 'Une notification 3 jours avant, sans montant affiché' : 'Indisponible dans le navigateur', prefs.alerts && notificationsSupported, toggleAlerts, !notificationsSupported)}
      </Card>
      {msg && <View style={st.msg}><Notice icon="alert-circle" tone="warn">{msg}</Notice></View>}

      <SectionHeader title="Mon budget" />
      <Card>
        <Row first title="Modifier mes réponses" subtitle="Revenu, jour de paie, épargne, charges fixes" left={<Badge color={c.pillar.culture} icon="sliders" size={34} />} onPress={onEditAnswers} chevron />
      </Card>

      <SectionHeader title="Vos données" />
      {(backupAge === null || backupAge > BACKUP_REMINDER_DAYS) && (
        <View style={st.msg}><Notice icon="alert-triangle" tone="warn">
          {backupAge === null ? `Aucune sauvegarde pour l’instant. Si ${web ? 'ce navigateur est effacé' : 'ce téléphone est perdu ou changé'}, vos données le seront aussi.` : `Dernière sauvegarde il y a ${backupAge} jours. Pensez à en refaire une.`}
        </Notice></View>
      )}
      <Card style={{ marginTop: space.sm }}>
        <Row first title="Sauvegarde et restauration" subtitle={prefs.lastBackup ? `Dernière sauvegarde : ${longDate(prefs.lastBackup)}` : 'Fichier chiffré, pour changer de téléphone'}
          left={<Badge color={c.teal} icon="shield" size={34} />} onPress={onBackup} chevron />
        <View style={st.privacy}>
          <Feather name={web ? 'globe' : 'smartphone'} size={15} color={c.ink2} style={{ marginTop: 2 }} />
          <Text style={st.rowS}>{web
            ? 'Version de test : tout est enregistré dans ce navigateur, sans chiffrement. Nokori n’a pas de serveur et ne se connecte à aucune banque. L’app pour téléphone chiffre tout.'
            : 'Tout est enregistré sur ce téléphone, dans une base chiffrée. Nokori n’a pas de serveur et ne se connecte à aucune banque.'}</Text>
        </View>
        <View style={st.sep}>
          {confirm ? (
            <View style={{ paddingTop: space.md }}>
              <Text style={[st.rowT, { color: c.vermilion }]}>{web ? 'Tout effacer de ce navigateur ?' : 'Tout effacer de ce téléphone ?'}</Text>
              <Text style={[st.rowS, { marginBottom: space.sm }]}>Dépenses, charges, comptes, objectifs et bilans seront supprimés. C’est définitif. Une sauvegarde faite avant reste utilisable.</Text>
              <Confirm question="" confirmLabel="Tout effacer" a11yConfirm="Confirmer : tout effacer" onCancel={() => setConfirm(false)} onConfirm={onWipe} />
            </View>
          ) : (
            <Row first title="Tout effacer" danger left={<Badge color={c.vermilion} icon="trash-2" size={34} />} onPress={() => setConfirm(true)} a11yLabel="Tout effacer" />
          )}
        </View>
      </Card>
      <Text style={st.version}>Nokori · version 1.0 · aucune donnée collectée</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  pad: { paddingVertical: space.lg, gap: space.sm + 2 },
  rowT: { ...t.bodyStrong, color: c.ink },
  rowS: { ...t.footnote, color: c.ink2, flex: 1 },
  msg: { marginHorizontal: space.gutter, marginTop: space.sm },
  privacy: { flexDirection: 'row', gap: space.sm, paddingVertical: space.md, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  version: { ...t.caption, color: c.ink2, textAlign: 'center', marginTop: space.xl },
});
