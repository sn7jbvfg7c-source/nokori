import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { backupFileName, BackupError, createBackup, openBackup, passphraseStrength, readHeader, RESTORE_MESSAGES, summarize, type PassphraseLevel } from '../domain/backup';
import { MONTH_NAMES } from '../domain/months';
import type { AppData } from '../data/persist';
import { pickBackup, randomBytes, shareBackup } from '../data/backupFile';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, type as t } from '../theme/tokens';
import { Button, Card, IconButton, Notice, ScreenHeader, SectionHeader } from '../ui/kit';

type Step =
  | { k: 'idle' }
  | { k: 'picked'; text: string; created: string }
  | { k: 'opened'; data: AppData }
  | { k: 'done' };

const longDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTH_NAMES[m - 1]} ${y}`; };
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

const LEVEL_TEXT: Record<PassphraseLevel, string> = { faible: 'Faible', correcte: 'Correcte', excellente: 'Excellente' };
const LEVEL_STEPS: Record<PassphraseLevel, number> = { faible: 1, correcte: 2, excellente: 3 };

/** Jauge de sécurité de la phrase secrète : 3 segments, un mot, et le conseil ou la raison du refus */
function StrengthMeter({ level, problem }: { level: PassphraseLevel; problem: string | null }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const color = level === 'faible' ? c.vermilion : level === 'correcte' ? c.pillar.culture : c.teal;
  return (
    <View accessible accessibilityLabel={`Sécurité de la phrase : ${LEVEL_TEXT[level]}. ${problem ?? (level === 'correcte' ? 'Acceptée. Quelques mots de plus la rendraient excellente.' : 'Acceptée.')}`} accessibilityLiveRegion="polite">
      <View style={st.meter} aria-hidden>
        {[1, 2, 3].map(i => <View key={i} style={[st.meterSeg, { backgroundColor: i <= LEVEL_STEPS[level] ? color : c.fill2 }]} />)}
      </View>
      <Text style={st.hint}>
        <Text style={{ color: c.ink, fontFamily: font.semibold }}>Sécurité : {LEVEL_TEXT[level]}. </Text>
        {problem ?? (level === 'correcte' ? 'Acceptée. Quelques mots de plus la rendraient excellente.' : 'Acceptée.')}
      </Text>
    </View>
  );
}

interface Props {
  /** « restore » : seulement la restauration (données actuelles illisibles) */
  mode?: 'all' | 'restore';
  data: AppData; today: Date;
  onReplace: (d: AppData) => Promise<void>;
  onExported: (date: string) => void;
  onClose: () => void;
  /** après une restauration réussie (sinon : onClose) */
  onDone?: () => void;
}

/** Sauvegarde chiffrée : créer un fichier, ou restaurer depuis un fichier (nouveau téléphone, perte) */
export function BackupScreen({ mode = 'all', data, today, onReplace, onExported, onClose, onDone }: Props) {
  const insets = useSafeAreaInsets();
  const c = useColors(); const st = useStyles(makeStyles);
  // export
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // restauration
  const [step, setStep] = useState<Step>({ k: 'idle' });
  const [rpass, setRpass] = useState('');
  const [rprogress, setRprogress] = useState<number | null>(null);
  const [restoreErr, setRestoreErr] = useState<string | null>(null);

  const strength = pass ? passphraseStrength(pass) : null;
  const problem = strength?.problem ?? null;
  const mismatch = pass2.length > 0 && pass !== pass2;
  const canExport = !!pass && !problem && pass === pass2 && progress === null;

  const doExport = async () => {
    setExportMsg(null);
    try {
      setProgress(0);
      const file = await createBackup(data, pass, today, randomBytes, f => setProgress(f));
      setProgress(null);
      const shared = await shareBackup(file, backupFileName(today));
      if (!shared) { setExportMsg({ ok: false, text: 'Le partage de fichiers n’est pas disponible sur cet appareil.' }); return; }
      const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      onExported(iso);
      setPass(''); setPass2('');
      setExportMsg({ ok: true, text: 'Sauvegarde créée. Rangez le fichier en lieu sûr (Fichiers, iCloud Drive, Google Drive, ordinateur) et gardez votre phrase secrète : sans elle, personne ne peut l’ouvrir, pas même vous.' });
    } catch {
      setProgress(null);
      setExportMsg({ ok: false, text: 'La sauvegarde n’a pas pu être créée. Vos données ne sont pas touchées. Réessayez.' });
    }
  };

  const doPick = async () => {
    setRestoreErr(null);
    try {
      const text = await pickBackup();
      if (text === null) return;
      if (text === '\u0000trop-gros') return setRestoreErr(RESTORE_MESSAGES['trop-gros']);
      const h = readHeader(text);
      setStep({ k: 'picked', text, created: h.created });
    } catch (e) {
      setRestoreErr(e instanceof BackupError ? e.message : 'Ce fichier n’a pas pu être lu.');
    }
  };

  const doOpen = async () => {
    if (step.k !== 'picked') return;
    setRestoreErr(null);
    try {
      setRprogress(0);
      const d = await openBackup(step.text, rpass, f => setRprogress(f));
      setRprogress(null);
      setRpass('');
      setStep({ k: 'opened', data: d });
    } catch (e) {
      setRprogress(null);
      setRestoreErr(e instanceof BackupError ? e.message : 'La sauvegarde n’a pas pu être ouverte.');
    }
  };

  const doReplace = async () => {
    if (step.k !== 'opened') return;
    await onReplace(step.data);
    setStep({ k: 'done' });
  };

  const pct = (f: number | null) => (f === null ? '' : ` ${Math.round(f * 100)} %`);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxxl }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={mode === 'restore' ? 'Restaurer' : 'Sauvegarde'} right={<IconButton icon="x" label="Fermer la sauvegarde" onPress={onClose} small />} />
        <View style={st.intro}>
          <Notice icon="shield">Le fichier est chiffré par une phrase secrète que vous choisissez. Il ne part nulle part sans vous : c’est vous qui décidez où le ranger. Nokori n’a pas de serveur.</Notice>
        </View>

        {mode === 'all' && <>
          <SectionHeader title="Créer une sauvegarde" right={data.prefs.lastBackup ? `dernière : ${longDate(data.prefs.lastBackup)}` : 'jamais faite'} />
          <Card style={st.card}>
            <Text style={st.label}>Phrase secrète</Text>
            <TextInput value={pass} onChangeText={setPass} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password"
              placeholder="4 mots sans lien entre eux" placeholderTextColor={c.ink3} accessibilityLabel="Phrase secrète de la sauvegarde" style={st.input} maxLength={200} />
            {strength ? <StrengthMeter level={strength.level} problem={problem} />
              : <Text style={st.hint}>12 caractères au moins. Le plus sûr : 4 mots sans lien entre eux, faciles à retenir pour vous.</Text>}
            <Text style={st.label}>La même, une seconde fois</Text>
            <TextInput value={pass2} onChangeText={setPass2} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="newPassword" autoComplete="new-password"
              placeholderTextColor={c.ink3} accessibilityLabel="Confirmer la phrase secrète" style={st.input} maxLength={200} />
            {mismatch && <Text style={[st.hint, { color: c.vermilion }]}>Les deux phrases ne sont pas identiques.</Text>}
            <Button label={progress !== null ? `Chiffrement…${pct(progress)}` : 'Créer la sauvegarde'} icon="download" onPress={doExport} disabled={!canExport} style={{ marginTop: space.sm }} />
            {exportMsg && <Notice icon={exportMsg.ok ? 'check-circle' : 'alert-circle'} tone={exportMsg.ok ? 'neutral' : 'warn'}>{exportMsg.text}</Notice>}
          </Card>
        </>}

        <SectionHeader title="Restaurer une sauvegarde" />
        <Card style={st.card}>
          {step.k === 'idle' && <>
            <Text style={st.p}>Sur un nouveau téléphone, ou après avoir réinstallé Nokori : choisissez le fichier .nokori, puis entrez sa phrase secrète.</Text>
            <Button label="Choisir un fichier" icon="folder" variant="secondary" onPress={doPick} />
          </>}
          {step.k === 'picked' && <>
            <Text style={st.p}>Sauvegarde du <Text style={st.strong}>{longDate(step.created)}</Text>.</Text>
            <Text style={st.label}>Sa phrase secrète</Text>
            <TextInput value={rpass} onChangeText={setRpass} secureTextEntry autoCapitalize="none" autoCorrect={false} textContentType="password"
              placeholderTextColor={c.ink3} accessibilityLabel="Phrase secrète de la sauvegarde à restaurer" style={st.input} maxLength={200} onSubmitEditing={doOpen} />
            <View style={st.row}>
              <Button label="Autre fichier" variant="secondary" onPress={() => { setStep({ k: 'idle' }); setRestoreErr(null); setRpass(''); }} style={{ flex: 1 }} />
              <Button label={rprogress !== null ? `Ouverture…${pct(rprogress)}` : 'Ouvrir'} onPress={doOpen} disabled={!rpass || rprogress !== null} style={{ flex: 1 }} />
            </View>
          </>}
          {step.k === 'opened' && (() => {
            const s = summarize(step.data);
            return <>
              <Text style={st.p}>Sauvegarde ouverte : {plural(s.expenses, 'dépense', 'dépenses')}, {plural(s.accounts, 'compte', 'comptes')}, {plural(s.goals, 'objectif', 'objectifs')}{s.hasProfile ? ', budget compris' : ''}.</Text>
              <Notice icon="alert-triangle" tone="warn">Toutes les données actuelles de cet appareil seront remplacées par celles de la sauvegarde.</Notice>
              <View style={st.row}>
                <Button label="Annuler" variant="secondary" onPress={() => setStep({ k: 'idle' })} style={{ flex: 1 }} />
                <Button label="Remplacer mes données" variant="danger" onPress={doReplace} style={{ flex: 1 }} />
              </View>
            </>;
          })()}
          {step.k === 'done' && <>
            <Notice icon="check-circle">Données restaurées. Pensez à réactiver le verrouillage et les rappels dans les réglages de ce téléphone si besoin.</Notice>
            <Button label="Ouvrir mon budget" onPress={onDone ?? onClose} />
          </>}
          {restoreErr && <Notice icon="alert-circle" tone="warn">{restoreErr}</Notice>}
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  intro: { marginHorizontal: space.gutter, marginTop: space.lg },
  card: { paddingVertical: space.lg, gap: space.sm },
  label: { ...t.caption, color: c.ink2, marginTop: space.xs },
  input: { ...t.body, color: c.ink, height: 48, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md },
  hint: { ...t.footnote, color: c.ink2 },
  meter: { flexDirection: 'row', gap: space.xs, marginBottom: space.xs },
  meterSeg: { flex: 1, height: 4, borderRadius: radius.pill },
  p: { ...t.body, color: c.ink },
  strong: { fontFamily: t.bodyStrong.fontFamily },
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
});
