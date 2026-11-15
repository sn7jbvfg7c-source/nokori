import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GROUP_NAME } from '../domain/charges';
import { formatEuros, formatEurosRound, parseEuros } from '../domain/money';
import { buildProfile, cleanName, draftFromProfile, emptyDraft, PAYDAYS, SAVE_STEPS, searchCatalog, summary, type CatalogItem, type Draft, type DraftCharge } from '../domain/onboarding';
import type { ChargeGroup, Frequency, Profile } from '../domain/types';
import { font } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';

const STEPS = 5;
const GROUPS = Object.keys(GROUP_NAME) as ChargeGroup[];
const FREQS: [Frequency, string][] = [['mois', 'Mensuel'], ['4sem', '4 semaines'], ['an', 'Annuel']];
const freqText = (c: DraftCharge) => (c.freq === '4sem' ? `toutes les 4 semaines, prochain le ${c.day}` : c.freq === 'an' ? `une fois par an, le ${c.day}` : `chaque mois le ${c.day}`);

/** Champ montant : garde le texte tapé, remonte les centimes (ou null si invalide) */
function AmountInput({ value, onChange, label, big }: { value: number | null; onChange: (c: number | null) => void; label: string; big?: boolean }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const [txt, setTxt] = useState(value === null ? '' : formatEuros(value).replace(/ €$/, '').replace(/ /g, ' '));
  const bad = txt.trim() !== '' && parseEuros(txt) === null;
  return (
    <View>
      <View style={[st.amountRow, big && st.amountBig]}>
        <TextInput
          value={txt}
          onChangeText={t => { const clean = t.replace(/[^\d,.\s]/g, '').slice(0, 10); setTxt(clean); onChange(clean.trim() ? parseEuros(clean) : null); }}
          keyboardType="decimal-pad" inputMode="decimal" maxLength={10} placeholder="0" placeholderTextColor={colors.ink3}
          accessibilityLabel={label} style={[st.amountInput, big && st.amountInputBig]}
        />
        <Text style={[st.euro, big && st.euroBig]}>€</Text>
      </View>
      {bad && <Text style={st.err}>Montant invalide (100 000 € au plus, 2 décimales)</Text>}
    </View>
  );
}

function Stepper({ value, onChange, min = 1, max = 31, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.stepper}>
      <Pressable style={st.stepBtn} onPress={() => onChange(Math.max(min, value - 1))} accessibilityRole="button" accessibilityLabel={`${label} : jour précédent`}><Text style={st.stepTxt}>−</Text></Pressable>
      <Text style={st.stepVal} accessibilityLabel={`${label} : le ${value}`}>{value}</Text>
      <Pressable style={st.stepBtn} onPress={() => onChange(Math.min(max, value + 1))} accessibilityRole="button" accessibilityLabel={`${label} : jour suivant`}><Text style={st.stepTxt}>+</Text></Pressable>
    </View>
  );
}

function Chips<T extends string | number>({ items, value, onChange }: { items: [T, string][]; value: T | null; onChange: (v: T) => void }) {
  const st = useStyles(makeStyles);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.chips}>
      {items.map(([v, l]) => (
        <Pressable key={String(v)} onPress={() => onChange(v)} style={[st.chip, value === v && st.chipOn]} accessibilityRole="button" accessibilityState={{ selected: value === v }}>
          <Text style={[st.chipTxt, value === v && st.chipTxtOn]}>{l}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function ChargeEditor({ c, set, remove }: { c: DraftCharge; set: (p: Partial<DraftCharge>) => void; remove: () => void }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.editor}>
      <View style={st.edRow}><Text style={st.edLbl}>Montant</Text><View style={{ width: 150 }}><AmountInput value={c.amount} onChange={a => set({ amount: a })} label={`Montant ${c.name}`} /></View></View>
      <View style={st.edRow}><Text style={st.edLbl}>{c.freq === '4sem' ? 'Prochain le' : c.freq === 'an' ? 'Le' : 'Chaque mois le'}</Text><Stepper value={c.day} onChange={d => set({ day: d })} label={c.name} /></View>
      <View style={st.seg}>
        {FREQS.map(([f, l]) => (
          <Pressable key={f} onPress={() => set({ freq: f })} style={[st.segBtn, c.freq === f && st.segOn]} accessibilityRole="button" accessibilityState={{ selected: c.freq === f }}>
            <Text style={[st.segTxt, c.freq === f && st.segTxtOn]}>{l}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={remove} accessibilityRole="button" accessibilityLabel={`Retirer ${c.name}`}><Text style={st.remove}>Retirer</Text></Pressable>
    </View>
  );
}

function ChargesStep({ draft, setDraft }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<ChargeGroup | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [manual, setManual] = useState<{ name: string; amount: number | null; day: number; group: ChargeGroup } | null>(null);
  const list = useMemo(() => searchCatalog(q, group), [q, group]);
  const sel = (id: string) => draft.charges.find(c => c.id === id);
  const set = (id: string, p: Partial<DraftCharge>) => setDraft(d => ({ ...d, charges: d.charges.map(c => (c.id === id ? { ...c, ...p } : c)) }));
  const remove = (id: string) => { setDraft(d => ({ ...d, charges: d.charges.filter(c => c.id !== id) })); if (open === id) setOpen(null); };
  const toggle = (it: CatalogItem) => {
    if (sel(it.id)) return remove(it.id);
    setDraft(d => ({ ...d, charges: [...d.charges, { id: it.id, name: it.name, group: it.group, amount: null, day: 1, freq: 'mois' }] }));
    setOpen(it.id);
  };
  const customs = draft.charges.filter(c => c.custom);
  const total = draft.charges.reduce((a, c) => a + (c.amount ?? 0) * (c.freq === '4sem' ? 13 / 12 : c.freq === 'an' ? 1 / 12 : 1), 0);
  const n = draft.charges.length;

  const row = (c: DraftCharge | undefined, id: string, name: string, groupName: string, onToggle: () => void) => (
    <View key={id} style={st.rowWrap}>
      <Pressable style={st.row} onPress={() => (c ? setOpen(open === id ? null : id) : onToggle())}>
        <View style={st.rowIcon}><Text style={st.rowIconTxt}>{name.charAt(0)}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.rowName}>{name}</Text>
          <Text style={[st.rowSub, c && { color: colors.vermilion }]}>{c ? (c.amount ? `${formatEuros(c.amount)}, ${freqText(c)}` : 'montant à saisir') : groupName}</Text>
        </View>
        <Pressable onPress={onToggle} style={[st.tg, c && st.tgOn]} accessibilityRole="checkbox" accessibilityState={{ checked: !!c }} accessibilityLabel={(c ? 'Retirer ' : 'Ajouter ') + name}>
          <Text style={[st.tgTxt, c && { color: '#fff' }]}>{c ? '✓' : '+'}</Text>
        </Pressable>
      </Pressable>
      {c && open === id && <ChargeEditor c={c} set={p => set(id, p)} remove={() => remove(id)} />}
    </View>
  );

  return (
    <View>
      <Text style={st.h2}>Vos charges fixes</Text>
      <Text style={st.p}>Choisissez dans la liste ou ajoutez-les à la main. Elles tombent chaque mois dans le calendrier.</Text>
      <TextInput value={q} onChangeText={t => setQ(t.slice(0, 40))} maxLength={40} placeholder="Rechercher : loyer, EDF, Netflix…" placeholderTextColor={colors.ink3} accessibilityLabel="Rechercher une charge" style={st.search} />
      <Chips<string> items={[['tout', 'Tout'], ...GROUPS.map(g => [g, GROUP_NAME[g]] as [string, string])]} value={group ?? 'tout'} onChange={v => setGroup(v === 'tout' ? null : (v as ChargeGroup))} />
      <View style={st.list}>
        {list.map(it => row(sel(it.id), it.id, it.name, GROUP_NAME[it.group], () => toggle(it)))}
        {!list.length && <Text style={[st.p, { padding: 16 }]}>Rien dans la liste : ajoutez-la à la main.</Text>}
      </View>
      {customs.length > 0 && <>
        <Text style={st.h3}>Ajoutées à la main</Text>
        <View style={st.list}>{customs.map(c => row(c, c.id, c.name, GROUP_NAME[c.group], () => remove(c.id)))}</View>
      </>}
      {manual ? (
        <View style={[st.list, { padding: 14, gap: 12 }]}>
          <TextInput value={manual.name} onChangeText={t => setManual({ ...manual, name: cleanName(t) })} maxLength={40} placeholder="Nom : cantine, crèche, crédit auto" placeholderTextColor={colors.ink3} accessibilityLabel="Nom de la charge" style={st.search} />
          <View style={st.edRow}><Text style={st.edLbl}>Montant</Text><View style={{ width: 150 }}><AmountInput value={manual.amount} onChange={a => setManual({ ...manual, amount: a })} label="Montant de la charge" /></View></View>
          <View style={st.edRow}><Text style={st.edLbl}>Chaque mois le</Text><Stepper value={manual.day} onChange={d => setManual({ ...manual, day: d })} label="Nouvelle charge" /></View>
          <Chips<ChargeGroup> items={GROUPS.map(g => [g, GROUP_NAME[g]])} value={manual.group} onChange={g => setManual({ ...manual, group: g })} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable style={[st.small, { flex: 1 }]} onPress={() => setManual(null)} accessibilityRole="button"><Text style={st.smallTxt}>Annuler</Text></Pressable>
            <Pressable
              style={[st.small, st.smallDark, { flex: 1 }, !manual.name.trim() && { opacity: 0.4 }]} disabled={!manual.name.trim()} accessibilityRole="button" accessibilityLabel="Ajouter la charge"
              onPress={() => { const id = `perso-${Date.now()}`; setDraft(d => ({ ...d, charges: [...d.charges, { id, name: manual.name.trim(), group: manual.group, amount: manual.amount, day: manual.day, freq: 'mois', custom: true }] })); setManual(null); setOpen(id); }}>
              <Text style={[st.smallTxt, { color: colors.onBtn }]}>Ajouter</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Pressable style={st.addman} onPress={() => setManual({ name: cleanName(q), amount: null, day: 1, group: 'logement' })} accessibilityRole="button" accessibilityLabel="Ajouter une charge à la main">
          <Text style={st.addmanTxt}>+ Ajouter une charge à la main</Text>
        </Pressable>
      )}
      <View style={st.total}>
        <Text style={st.p}>{n ? `${n} charge${n > 1 ? 's' : ''} fixe${n > 1 ? 's' : ''}` : 'Aucune charge choisie'}</Text>
        <Text style={st.totalVal} accessibilityLabel="Total des charges par mois">{formatEuros(Math.round(total))} / mois</Text>
      </View>
    </View>
  );
}

export function OnboardingScreen({ initial, onDone }: { initial: Profile | null; onDone: (p: Profile) => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [draft, setDraftState] = useState<Draft>(() => (initial ? draftFromProfile(initial) : emptyDraft()));
  const setDraft = (f: (d: Draft) => Draft) => setDraftState(f);
  const today = useMemo(() => new Date(), []);
  const sum = summary(draft, today);
  const incomeOk = draft.income !== null && draft.income > 0;
  const next = () => (step === STEPS - 1 ? onDone(buildProfile(draft, today)) : setStep(step + 1));
  const canGo = step !== 1 || incomeOk;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.paper }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[st.top, { paddingTop: insets.top + 8 }]}>
        {step > 0
          ? <Pressable style={st.back} onPress={() => setStep(step - 1)} accessibilityRole="button" accessibilityLabel="Retour"><Text style={st.backTxt}>‹</Text></Pressable>
          : <View style={{ width: 36 }} />}
        <View style={st.prog} accessibilityLabel={`Étape ${step + 1} sur ${STEPS}`}>{Array.from({ length: STEPS }, (_, i) => <View key={i} style={[st.progSeg, i <= step && st.progOn]} />)}</View>
        <Pressable onPress={() => setStep(STEPS - 1)} accessibilityRole="button"><Text style={st.skip}>Passer</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={st.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <View style={st.art}><Text style={st.artK}>残</Text></View>
            <Text style={st.h1}>Le kakeibo,{'\n'}sans le carnet.</Text>
            <Text style={st.p}>Quelques questions, une minute, et votre mois se calcule tout seul : ce qui tombe, quand, et ce qu’il vous reste vraiment. Tout reste sur votre téléphone.</Text>
          </View>
        )}
        {step === 1 && (
          <View>
            <Text style={st.h2}>Combien gagnez-vous par mois ?</Text>
            <Text style={st.p}>Salaire net, après impôts. C’est la base du kakeibo.</Text>
            <AmountInput big value={draft.income} onChange={c => setDraft(d => ({ ...d, income: c }))} label="Revenu mensuel" />
            <Text style={st.h3}>Le jour de votre paie</Text>
            <Chips<number> items={PAYDAYS} value={draft.payday} onChange={p => setDraft(d => ({ ...d, payday: p }))} />
          </View>
        )}
        {step === 2 && (
          <View>
            <Text style={st.h2}>Combien voulez-vous épargner ?</Text>
            <Text style={st.p}>Le kakeibo commence par l’épargne : on la retire du budget dès la paie. Vous faites le virement dans votre banque, Nokori le compte.</Text>
            <Text style={st.bigVal} accessibilityLabel={`Épargne : ${formatEurosRound(sum.saving)} par mois`}>{formatEurosRound(sum.saving)}</Text>
            <Text style={[st.p, { textAlign: 'center' }]}>par mois, {Math.round(draft.savePct * 100)} % du revenu</Text>
            <Chips<number> items={SAVE_STEPS.map(v => [v, `${Math.round(v * 100)} %`])} value={draft.savePct} onChange={v => setDraft(d => ({ ...d, savePct: v }))} />
            <Text style={st.note}>{draft.savePct >= 0.2 ? 'Très bien : 20 % est la règle d’or du kakeibo.' : draft.savePct >= 0.1 ? 'Un bon début ; vous pourrez monter plus tard.' : 'Même un petit montant compte. Vous pourrez l’ajuster.'}</Text>
          </View>
        )}
        {step === 3 && <ChargesStep draft={draft} setDraft={setDraft} />}
        {step === 4 && (
          <View>
            <Text style={st.h2}>Votre mois, en un coup d’œil</Text>
            <View style={st.list}>
              {([['Revenus', sum.income], ['Épargne', -sum.saving], ['Charges fixes', -sum.fixed], ['Reste à vivre', sum.free]] as [string, number][]).map(([l, v], i) => (
                <View key={l} style={[st.sumRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.hair }, i === 3 && { paddingBottom: 16 }]}>
                  <Text style={[st.rowName, i === 3 && { fontFamily: font.bold }]}>{l}</Text>
                  <Text style={[st.rowName, i === 3 && { fontFamily: font.bold }, v < 0 && i < 3 && { color: colors.ink2 }]}>{formatEurosRound(v)}</Text>
                </View>
              ))}
            </View>
            <View style={st.perDay}>
              <Text style={st.p}>Sur un mois complet, vous pourrez dépenser environ</Text>
              <Text style={st.bigVal} accessibilityLabel={`Environ ${formatEurosRound(sum.perDay)} par jour`}>{formatEurosRound(sum.perDay)}</Text>
              <Text style={st.p}>par jour, sans toucher à votre épargne.</Text>
            </View>
            {!incomeOk && <Text style={st.err}>Revenu non renseigné : vous pourrez le saisir plus tard.</Text>}
          </View>
        )}
      </ScrollView>
      <Pressable
        style={[st.go, { marginBottom: insets.bottom + 16 }, !canGo && { opacity: 0.4 }]} disabled={!canGo} onPress={next} accessibilityRole="button">
        <Text style={st.goTxt}>{step === 0 ? 'Commencer' : step === STEPS - 1 ? 'Ouvrir mon budget' : 'Continuer'}</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16 },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  backTxt: { fontSize: 24, lineHeight: 26, color: colors.ink },
  prog: { flex: 1, flexDirection: 'row', gap: 4 },
  progSeg: { flex: 1, height: 4, borderRadius: 4, backgroundColor: colors.fill2 },
  progOn: { backgroundColor: colors.vermilion },
  skip: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
  body: { padding: 24, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  art: { width: 96, height: 96, borderRadius: 28, backgroundColor: '#C9572C', alignItems: 'center', justifyContent: 'center', marginTop: 40, marginBottom: 32 },
  artK: { color: '#FFF8F0', fontSize: 54, fontWeight: '800' },
  h1: { fontFamily: font.semibold, fontSize: 40, letterSpacing: -1.6, lineHeight: 44, color: colors.ink, marginBottom: 14 },
  h2: { fontFamily: font.semibold, fontSize: 30, letterSpacing: -1.2, lineHeight: 34, color: colors.ink, marginBottom: 8 },
  h3: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, marginTop: 24, marginBottom: 10 },
  p: { fontFamily: font.regular, fontSize: 15, lineHeight: 22, color: colors.ink2 },
  note: { fontFamily: font.medium, fontSize: 14, color: colors.ink, backgroundColor: 'rgba(188,68,35,0.08)', borderRadius: 14, padding: 12, marginTop: 16 },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.vermilion, marginTop: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 12, height: 46, borderWidth: 1.5, borderColor: colors.fill2 },
  amountBig: { height: 80, marginTop: 20, borderRadius: 20 },
  amountInput: { flex: 1, minWidth: 0, width: '100%', fontFamily: font.semibold, fontSize: 18, color: colors.ink, textAlign: 'right' },
  amountInputBig: { fontSize: 40, letterSpacing: -1.5 },
  euro: { fontFamily: font.semibold, fontSize: 18, color: colors.ink2, marginLeft: 6 },
  euroBig: { fontSize: 32 },
  chips: { gap: 6, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 99, backgroundColor: colors.fill },
  chipOn: { backgroundColor: colors.btn },
  chipTxt: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  chipTxtOn: { color: colors.onBtn },
  bigVal: { fontFamily: font.semibold, fontSize: 56, letterSpacing: -2.5, color: colors.ink, textAlign: 'center', marginTop: 24 },
  search: { minWidth: 0, width: '100%', backgroundColor: colors.surface, borderRadius: 14, paddingHorizontal: 14, height: 46, borderWidth: 1.5, borderColor: colors.fill2, fontFamily: font.regular, fontSize: 16, color: colors.ink, marginTop: 14 },
  list: { backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 12, marginTop: 6 },
  rowWrap: { borderBottomWidth: 1, borderBottomColor: colors.hair },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  rowIconTxt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.ink2, marginTop: 1 },
  tg: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  tgOn: { backgroundColor: colors.vermilion },
  tgTxt: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  editor: { marginLeft: 48, marginBottom: 12, backgroundColor: 'rgba(188,68,35,0.06)', borderRadius: 16, padding: 12, gap: 10 },
  edRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  edLbl: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.fill2, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 18, color: colors.ink },
  stepVal: { fontFamily: font.bold, fontSize: 16, color: colors.ink, minWidth: 22, textAlign: 'center' },
  seg: { flexDirection: 'row', backgroundColor: colors.fill, borderRadius: 12, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface },
  segTxt: { fontFamily: font.semibold, fontSize: 13, color: colors.ink2 },
  segTxtOn: { color: colors.ink },
  remove: { fontFamily: font.semibold, fontSize: 13, color: colors.vermilion },
  addman: { marginTop: 12, height: 48, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.fill2, alignItems: 'center', justifyContent: 'center' },
  addmanTxt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  small: { height: 44, borderRadius: 12, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  smallDark: { backgroundColor: colors.btn },
  smallTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  total: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  totalVal: { fontFamily: font.bold, fontSize: 18, color: colors.ink },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 4 },
  perDay: { alignItems: 'center', marginTop: 24 },
  go: { marginHorizontal: 16, height: 56, borderRadius: 18, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  goTxt: { fontFamily: font.semibold, fontSize: 16, color: colors.onBtn },
});
