import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseBalance } from '../domain/accounts';
import { eta, GOAL_TYPES, monthSurplus, progress, streakUnderDailyBudget, weekWithoutWants, type Goal, type GoalType } from '../domain/goals';
import { formatEuros, formatEurosRound } from '../domain/money';
import { MONTH_NAMES } from '../domain/months';
import { cleanName } from '../domain/onboarding';
import type { Expense, Profile } from '../domain/types';
import { font, tint, onColor } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';

const amount = (s: string) => { const v = parseBalance(s); return v !== null && v >= 0 ? v : null; };
const txt = (c: number) => formatEuros(c).replace(/ €$/, '').replace(/ /g, ' ');
const typeOf = (t: GoalType) => GOAL_TYPES.find(x => x.id === t)!;

interface Draft { id: string | null; name: string; type: GoalType; target: string; saved: string; monthly: string }

function Field({ label, value, onChange, a11y }: { label: string; value: string; onChange: (s: string) => void; a11y: string }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const bad = value.trim() !== '' && amount(value) === null;
  return (
    <View>
      <View style={st.fRow}>
        <Text style={st.fLbl}>{label}</Text>
        <View style={st.fBox}>
          <TextInput value={value} onChangeText={t => onChange(t.replace(/[^\d,.\s]/g, '').slice(0, 14))} keyboardType="decimal-pad" inputMode="decimal" maxLength={14} placeholder="0" placeholderTextColor={colors.ink3} accessibilityLabel={a11y} style={st.fInput} />
          <Text style={st.euro}>€</Text>
        </View>
      </View>
      {bad && <Text style={st.err}>Montant invalide</Text>}
    </View>
  );
}

function Editor({ d, set, onSave, onCancel, onDelete }: { d: Draft; set: (d: Draft) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const [confirm, setConfirm] = useState(false);
  const ok = d.name.trim() !== '' && (amount(d.target) ?? 0) > 0 && amount(d.saved || '0') !== null && amount(d.monthly || '0') !== null;
  return (
    <View style={st.editor}>
      <TextInput value={d.name} onChangeText={t => set({ ...d, name: cleanName(t) })} maxLength={40} placeholder="Nom : voyage au Japon, voiture…" placeholderTextColor={colors.ink3} accessibilityLabel="Nom de l’objectif" style={st.input} />
      <View style={st.types}>
        {GOAL_TYPES.map(t => (
          <Pressable key={t.id} onPress={() => set({ ...d, type: t.id })} style={[st.type, d.type === t.id && { backgroundColor: t.color }]} accessibilityRole="button" accessibilityState={{ selected: d.type === t.id }}>
            <Text style={[st.typeTxt, d.type === t.id && { color: onColor(t.color) }]}>{t.name}</Text>
          </Pressable>
        ))}
      </View>
      <Field label="Montant visé" value={d.target} onChange={v => set({ ...d, target: v })} a11y="Montant visé" />
      <Field label="Déjà épargné" value={d.saved} onChange={v => set({ ...d, saved: v })} a11y="Déjà épargné" />
      <Field label="Versement par mois" value={d.monthly} onChange={v => set({ ...d, monthly: v })} a11y="Versement par mois" />
      {confirm ? (
        <View style={st.btns}>
          <Text style={st.ask}>Supprimer cet objectif ?</Text>
          <Pressable onPress={() => setConfirm(false)} style={[st.btn, st.btnLight]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
          <Pressable onPress={onDelete} style={[st.btn, { backgroundColor: colors.vermilion }]} accessibilityRole="button" accessibilityLabel={`Confirmer la suppression de ${d.name}`}><Text style={[st.btnTxt, { color: '#fff' }]}>Supprimer</Text></Pressable>
        </View>
      ) : (
        <View style={st.btns}>
          {onDelete && <Pressable onPress={() => setConfirm(true)} style={st.del} accessibilityRole="button" accessibilityLabel={`Supprimer ${d.name}`}><Text style={[st.btnTxt, { color: colors.vermilion }]}>Supprimer</Text></Pressable>}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onCancel} style={[st.btn, st.btnLight]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
          <Pressable onPress={onSave} disabled={!ok} style={[st.btn, st.btnDark, !ok && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Enregistrer l’objectif"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Enregistrer</Text></Pressable>
        </View>
      )}
    </View>
  );
}

export function GoalsScreen({ goals, profile, expenses, today, onSave, onRemove }: { goals: Goal[]; profile: Profile; expenses: Expense[]; today: Date; onSave: (g: Goal) => void; onRemove: (id: string) => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deposit, setDeposit] = useState<{ id: string; value: string } | null>(null);
  const surplus = monthSurplus(profile, expenses, today);
  const week = weekWithoutWants(expenses, today), okWeek = week.filter(Boolean).length;
  const streak = streakUnderDailyBudget(profile, expenses, today);
  const save = () => {
    if (!draft) return;
    const target = amount(draft.target), saved = amount(draft.saved || '0'), monthly = amount(draft.monthly || '0');
    if (!draft.name.trim() || !target || saved === null || monthly === null) return;
    onSave({ id: draft.id ?? Crypto.randomUUID(), name: draft.name.trim(), type: draft.type, target, saved, monthly });
    setDraft(null);
  };
  const edit = (g: Goal) => setDraft({ id: g.id, name: g.name, type: g.type, target: txt(g.target), saved: txt(g.saved), monthly: txt(g.monthly) });
  const newDraft = () => setDraft({ id: null, name: '', type: 'voyage', target: '', saved: '', monthly: '' });

  const etaText = (g: Goal) => {
    const e = eta(g.target, g.saved, g.monthly, today);
    return e.reached ? 'Objectif atteint' : e.label ? `Au rythme de ${formatEurosRound(g.monthly)} par mois : ${e.label}` : 'Ajoutez un versement mensuel pour voir la date d’arrivée';
  };

  const depositRow = (g: Goal) => deposit?.id === g.id ? (
    <View style={st.depRow}>
      <View style={[st.fBox, { flex: 1, width: undefined }]}>
        <TextInput value={deposit.value} onChangeText={t => setDeposit({ id: g.id, value: t.replace(/[^\d,.\s]/g, '').slice(0, 14) })} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" placeholderTextColor={colors.ink3} accessibilityLabel={`Versement pour ${g.name}`} style={st.fInput} />
        <Text style={st.euro}>€</Text>
      </View>
      <Pressable onPress={() => setDeposit(null)} style={[st.btn, st.btnLight]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
      <Pressable
        onPress={() => { const v = amount(deposit.value); if (v) { onSave({ ...g, saved: Math.min(g.saved + v, 10_000_000_000) }); setDeposit(null); } }}
        disabled={!amount(deposit.value)} style={[st.btn, st.btnDark, !amount(deposit.value) && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel={`Noter le versement pour ${g.name}`}>
        <Text style={[st.btnTxt, { color: colors.onBtn }]}>Noter</Text>
      </Pressable>
    </View>
  ) : (
    <Pressable onPress={() => setDeposit({ id: g.id, value: '' })} style={st.depBtn} accessibilityRole="button" accessibilityLabel={`Noter un versement pour ${g.name}`}>
      <Text style={st.depTxt}>+ Noter un versement</Text>
    </Pressable>
  );

  const [lead, ...others] = goals;
  const leadType = lead && typeOf(lead.type);
  const leadWith = lead && eta(lead.target, lead.saved, lead.monthly + surplus, today);

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <Text style={st.title}>Objectifs</Text>
        <Pressable onPress={newDraft} style={st.add} accessibilityRole="button" accessibilityLabel="Ajouter un objectif"><Text style={st.plus}>+</Text></Pressable>
      </View>
      {goals.length > 0 && (
        <View style={st.head}>
          <Text style={st.total} accessibilityLabel={`${formatEurosRound(goals.reduce((a, g) => a + g.saved, 0))} épargnés`}>{formatEurosRound(goals.reduce((a, g) => a + g.saved, 0))}</Text>
          <Text style={st.kick}>épargnés pour {goals.length} projet{goals.length > 1 ? 's' : ''}</Text>
        </View>
      )}
      {draft && draft.id === null && <View style={{ marginHorizontal: 16 }}><Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} /></View>}

      {lead && (draft?.id === lead.id ? (
        <View style={{ marginHorizontal: 16 }}><Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(lead.id); setDraft(null); }} /></View>
      ) : (
        <View style={st.leadCard}>
          <Pressable onPress={() => edit(lead)} accessibilityRole="button" accessibilityLabel={`Modifier ${lead.name}`} style={[st.leadTop, { backgroundColor: leadType.color }]}>
            <Feather name={leadType.icon as 'globe'} size={26} color="#fff" />
            <Text style={st.leadType}>{leadType.name}</Text>
          </Pressable>
          <View style={st.leadBody}>
            <View style={st.rowBetween}><Text style={st.leadName}>{lead.name}</Text><Text style={[st.pct, { color: leadType.color }]}>{Math.round(progress(lead) * 100)} %</Text></View>
            <View style={[st.bar, { backgroundColor: tint(leadType.color, 0.14) }]}><View style={[st.fill, { width: `${progress(lead) * 100}%`, backgroundColor: leadType.color }]} /></View>
            <Text style={st.meta}>{formatEurosRound(lead.saved)} sur {formatEurosRound(lead.target)}</Text>
            <View style={st.eta}>
              <Text style={st.etaMain}>{etaText(lead)}</Text>
              {!eta(lead.target, lead.saved, 0, today).reached && surplus > 0 && leadWith?.label && (
                <Text style={st.etaSub} accessibilityLabel="Date avec le reste du mois">En y ajoutant ce qui restera fin {MONTH_NAMES[today.getMonth()]} (≈ {formatEurosRound(surplus)}) : {leadWith.label}. Recalculé à chaque dépense.</Text>
              )}
            </View>
            {depositRow(lead)}
          </View>
        </View>
      ))}

      {others.length > 0 && (
        <View style={st.list}>
          {others.map((g, i) => {
            const t = typeOf(g.type);
            return (
              <View key={g.id} style={i > 0 && st.sep}>
                {draft?.id === g.id ? (
                  <Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(g.id); setDraft(null); }} />
                ) : (
                  <View style={{ paddingVertical: 12 }}>
                    <Pressable onPress={() => edit(g)} style={st.row} accessibilityRole="button" accessibilityLabel={`Modifier ${g.name}`}>
                      <View style={[st.icon, { backgroundColor: tint(t.color, 0.14) }]}><Feather name={t.icon as 'globe'} size={18} color={t.color} /></View>
                      <View style={{ flex: 1 }}>
                        <View style={st.rowBetween}><Text style={st.name}>{g.name}</Text><Text style={[st.pctSmall, { color: t.color }]}>{Math.round(progress(g) * 100)} %</Text></View>
                        <View style={[st.bar, { backgroundColor: tint(t.color, 0.14), marginTop: 6 }]}><View style={[st.fill, { width: `${progress(g) * 100}%`, backgroundColor: t.color }]} /></View>
                        <Text style={st.meta}>{formatEurosRound(g.saved)} sur {formatEurosRound(g.target)} · {etaText(g)}</Text>
                      </View>
                    </Pressable>
                    {depositRow(g)}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      {!goals.length && !draft && (
        <View style={st.empty}>
          <Text style={st.emptyTitle}>Un projet en tête ?</Text>
          <Text style={st.emptyTxt}>Un voyage, une voiture, une épargne de précaution : fixez un montant et un versement mensuel, Nokori calcule la date d’arrivée.</Text>
          <Pressable onPress={newDraft} style={[st.btn, st.btnDark, { alignSelf: 'center', marginTop: 12 }]} accessibilityRole="button"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Créer un objectif</Text></Pressable>
        </View>
      )}

      <View style={st.secHead}><Text style={st.sec}>Défis kakeibo</Text><Text style={st.secR}>cette semaine</Text></View>
      <View style={st.chal}>
        <View style={st.rowBetween}><Text style={st.name}>Une semaine sans envies</Text><Text style={st.score} accessibilityLabel={`Semaine sans envies : ${okWeek} jours sur 7`}>{okWeek} / 7</Text></View>
        <View style={st.days}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => {
            const v = week[i];
            return <View key={i} style={[st.day, v === true && { backgroundColor: colors.teal }, v === false && { backgroundColor: 'rgba(188,68,35,0.14)' }]}><Text style={[st.dayTxt, v === true && { color: '#fff' }, v === false && { color: colors.vermilion }]}>{v === null ? l : v ? '✓' : '·'}</Text></View>;
          })}
        </View>
        <Text style={st.meta}>{week.includes(false) ? 'Une envie s’est glissée cette semaine : on repart lundi.' : `Encore ${7 - okWeek} jour${7 - okWeek > 1 ? 's' : ''} sans resto, shopping ni loisirs.`}</Text>
      </View>
      <View style={st.chal}>
        <View style={st.rowBetween}><Text style={st.name}>3 jours sous le budget du jour</Text><Text style={st.score} accessibilityLabel={`Série : ${Math.min(3, streak.days)} jours sur 3`}>{Math.min(3, streak.days)} / 3</Text></View>
        <View style={st.flames}>{[0, 1, 2].map(i => <View key={i} style={[st.flame, i < streak.days && { backgroundColor: colors.vermilion }]} />)}</View>
        <Text style={st.meta}>{streak.perDay <= 0 ? 'Le budget du jour est épuisé ce mois-ci.' : streak.days >= 3 ? `Réussi : ${streak.days} jours d’affilée sous ${formatEurosRound(streak.perDay)}.` : `${streak.days} jour${streak.days > 1 ? 's' : ''} d’affilée sous ${formatEurosRound(streak.perDay)}. Encore ${3 - streak.days}.`}</Text>
      </View>
      <Text style={st.note}>Nokori ne déplace pas d’argent : notez un versement après l’avoir fait dans votre banque.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.onBtn, fontSize: 24, lineHeight: 26, fontFamily: font.medium },
  head: { paddingHorizontal: 24, paddingTop: 14 },
  total: { fontFamily: font.semibold, fontSize: 40, letterSpacing: -1.8, color: colors.ink },
  kick: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  leadCard: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.surface },
  leadTop: { height: 92, padding: 16, justifyContent: 'space-between' },
  leadType: { color: '#fff', fontFamily: font.semibold, fontSize: 13 },
  leadBody: { padding: 16, gap: 8 },
  leadName: { fontFamily: font.semibold, fontSize: 18, color: colors.ink, flex: 1 },
  pct: { fontFamily: font.bold, fontSize: 18 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  bar: { height: 6, borderRadius: 6, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 6 },
  meta: { fontFamily: font.regular, fontSize: 12.5, color: colors.ink2, marginTop: 4 },
  eta: { backgroundColor: 'rgba(217,102,43,0.08)', borderRadius: 14, padding: 12, gap: 4, marginTop: 4 },
  etaMain: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  etaSub: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 17, color: colors.ink2 },
  depBtn: { alignSelf: 'flex-start', paddingVertical: 6 },
  depTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.vermilion },
  depRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  list: { marginHorizontal: 16, marginTop: 12, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hair },
  row: { flexDirection: 'row', gap: 12 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.ink, flexShrink: 1 },
  pctSmall: { fontFamily: font.bold, fontSize: 14 },
  editor: { marginVertical: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(188,68,35,0.06)', gap: 10 },
  input: { minWidth: 0, width: '100%', height: 44, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12, fontFamily: font.regular, fontSize: 15, color: colors.ink, borderWidth: 1.5, borderColor: colors.fill2 },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  type: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.fill },
  typeTxt: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  fRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  fLbl: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  fBox: { flexDirection: 'row', alignItems: 'center', width: 160, height: 44, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.fill2 },
  fInput: { flex: 1, minWidth: 0, width: '100%', textAlign: 'right', fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  euro: { fontFamily: font.semibold, fontSize: 15, color: colors.ink2, marginLeft: 6 },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.vermilion, marginTop: 4 },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingHorizontal: 14, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnLight: { backgroundColor: colors.surface },
  btnDark: { backgroundColor: colors.btn },
  del: { paddingHorizontal: 4, height: 40, justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  ask: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  empty: { margin: 16, marginTop: 20, padding: 22, borderRadius: 22, backgroundColor: colors.surface },
  emptyTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyTxt: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center', marginTop: 6 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 24, marginBottom: 8 },
  sec: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  secR: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  chal: { marginHorizontal: 16, marginBottom: 10, backgroundColor: colors.surface, borderRadius: 20, padding: 14 },
  score: { fontFamily: font.bold, fontSize: 15, color: colors.vermilion },
  days: { flexDirection: 'row', gap: 6, marginTop: 10 },
  day: { flex: 1, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.fill },
  dayTxt: { fontFamily: font.bold, fontSize: 13, color: colors.ink3 },
  flames: { flexDirection: 'row', gap: 8, marginTop: 10 },
  flame: { flex: 1, height: 10, borderRadius: 6, backgroundColor: colors.fill },
  note: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.ink2, marginHorizontal: 24, marginTop: 10 },
});
