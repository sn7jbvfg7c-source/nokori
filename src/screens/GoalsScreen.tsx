import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseBalance } from '../domain/accounts';
import { dayTitle } from '../domain/activity';
import { addDeposit, depositedIn, eta, parseDayFr, GOAL_TYPES, milestone, monthSurplus, progress, streakUnderDailyBudget, weekWithoutWants, type Goal, type GoalType } from '../domain/goals';
import { toInputText } from '../domain/money';
import { MONTH_NAMES } from '../domain/months';
import { cleanName } from '../domain/onboarding';
import type { Expense, Profile } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, tabular, tint, type as t } from '../theme/tokens';
import { BIG_TEXT_MAX_SCALE } from '../ui/a11y';
import { Badge, Button, Card, Chip, Confirm, EmptyState, IconButton, ProgressBar, ScreenHeader, SectionHeader, type IconName } from '../ui/kit';
import { useMoney } from '../ui/money';

const amount = (s: string) => { const v = parseBalance(s); return v !== null && v >= 0 ? v : null; };
const txt = toInputText;
const typeOf = (x: GoalType) => GOAL_TYPES.find(g => g.id === x)!;
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
/** « lun. 3 mars », avec l'année si ce n'est pas l'année en cours */
const depDay = (iso: string, today: Date) => dayTitle(iso, today) + (iso.slice(0, 4) !== String(today.getFullYear()) ? ` ${iso.slice(0, 4)}` : '');
const MILESTONE: Record<25 | 50 | 75 | 100, string> = { 25: 'Un quart du chemin.', 50: 'La moitié est faite.', 75: 'Les trois quarts : la ligne d’arrivée approche.', 100: 'Objectif atteint. Bravo.' };

interface Draft { id: string | null; name: string; type: GoalType; target: string; saved: string; monthly: string }

function Field({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const bad = value.trim() !== '' && amount(value) === null;
  return (
    <View>
      <View style={st.fRow}>
        <Text style={st.fLbl}>{label}</Text>
        <View style={st.fBox}>
          <TextInput value={value} onChangeText={v => onChange(v.replace(/[^\d,.\s]/g, '').slice(0, 14))} keyboardType="decimal-pad" inputMode="decimal" maxLength={14} placeholder="0" placeholderTextColor={c.ink3} accessibilityLabel={label} style={st.fInput} />
          <Text style={st.euro}>€</Text>
        </View>
      </View>
      {bad && <Text style={st.err}>Montant invalide</Text>}
    </View>
  );
}

function Editor({ d, set, onSave, onCancel, onDelete }: { d: Draft; set: (d: Draft) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const [confirm, setConfirm] = useState(false);
  const ok = d.name.trim() !== '' && (amount(d.target) ?? 0) > 0 && amount(d.saved || '0') !== null && amount(d.monthly || '0') !== null;
  return (
    <View style={st.editor}>
      <TextInput value={d.name} onChangeText={v => set({ ...d, name: cleanName(v) })} maxLength={40} placeholder="Nom : voyage au Japon, voiture…" placeholderTextColor={c.ink3} accessibilityLabel="Nom de l’objectif" style={st.input} />
      <View style={st.types}>
        {GOAL_TYPES.map(x => <Chip key={x.id} label={x.name} icon={x.icon as IconName} selected={d.type === x.id} onPress={() => set({ ...d, type: x.id })} color={x.color} />)}
      </View>
      <Field label="Montant visé" value={d.target} onChange={v => set({ ...d, target: v })} />
      <Field label="Déjà épargné" value={d.saved} onChange={v => set({ ...d, saved: v })} />
      <Field label="Versement par mois" value={d.monthly} onChange={v => set({ ...d, monthly: v })} />
      {confirm
        ? <Confirm question="Supprimer cet objectif ?" confirmLabel="Supprimer" a11yConfirm={`Confirmer la suppression de ${d.name}`} onCancel={() => setConfirm(false)} onConfirm={() => onDelete?.()} />
        : <View style={st.btns}>
            {onDelete && <Button label="Supprimer" variant="ghost" small onPress={() => setConfirm(true)} a11yLabel={`Supprimer ${d.name}`} />}
            <View style={{ flex: 1 }} />
            <Button label="Annuler" variant="secondary" small onPress={onCancel} />
            <Button label="Enregistrer" small onPress={onSave} disabled={!ok} a11yLabel="Enregistrer l’objectif" />
          </View>}
    </View>
  );
}

export function GoalsScreen({ goals, profile, expenses, today, onSave, onRemove }: { goals: Goal[]; profile: Profile; expenses: Expense[]; today: Date; onSave: (g: Goal) => void; onRemove: (id: string) => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m$ = useMoney();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [deposit, setDeposit] = useState<{ id: string; value: string; date: string | null } | null>(null);
  // calculs sur toutes les dépenses : refaits seulement quand elles changent (pas à chaque frappe dans un champ)
  const surplus = useMemo(() => monthSurplus(profile, expenses, today), [profile, expenses, today]);
  const week = useMemo(() => weekWithoutWants(expenses, today), [expenses, today]), okWeek = week.filter(Boolean).length;
  const streak = useMemo(() => streakUnderDailyBudget(profile, expenses, today), [profile, expenses, today]);
  const thisMonth = isoOf(today).slice(0, 7);
  const save = () => {
    if (!draft) return;
    const target = amount(draft.target), saved = amount(draft.saved || '0'), monthly = amount(draft.monthly || '0');
    if (!draft.name.trim() || !target || saved === null || monthly === null) return;
    const prev = goals.find(g => g.id === draft.id);
    onSave({ ...prev, id: draft.id ?? Crypto.randomUUID(), name: draft.name.trim(), type: draft.type, target, saved, monthly });
    setDraft(null);
  };
  const edit = (g: Goal) => setDraft({ id: g.id, name: g.name, type: g.type, target: txt(g.target), saved: txt(g.saved), monthly: txt(g.monthly) });
  const newDraft = () => setDraft({ id: null, name: '', type: 'voyage', target: '', saved: '', monthly: '' });

  const etaText = (g: Goal) => {
    const e = eta(g.target, g.saved, g.monthly, today);
    return e.reached ? 'Objectif atteint' : e.label ? `Au rythme de ${m$.round(g.monthly)} par mois : ${e.label}` : 'Ajoutez un versement mensuel pour voir la date d’arrivée';
  };

  const depositRow = (g: Goal) => {
    if (deposit?.id !== g.id) return (
      <Button label="Noter un versement" icon="plus" variant="secondary" small onPress={() => setDeposit({ id: g.id, value: '', date: null })} a11yLabel={`Noter un versement pour ${g.name}`} style={{ alignSelf: 'flex-start' }} />
    );
    const v = amount(deposit.value);
    // date : aujourd'hui par défaut, ou une date passée (versement fait avant de créer l'objectif)
    const iso = deposit.date === null ? isoOf(today) : parseDayFr(deposit.date, today);
    const badDate = deposit.date !== null && deposit.date.trim().length >= 6 && !iso;
    return (
      <View style={st.depBox}>
        <View style={st.depRow}>
          <View style={[st.fBox, { flex: 1, width: undefined }]}>
            <TextInput value={deposit.value} onChangeText={x => setDeposit({ ...deposit, value: x.replace(/[^\d,.\s]/g, '').slice(0, 14) })} keyboardType="decimal-pad" inputMode="decimal" placeholder="0" placeholderTextColor={c.ink3} accessibilityLabel={`Versement pour ${g.name}`} style={st.fInput} autoFocus />
            <Text style={st.euro}>€</Text>
          </View>
        </View>
        <View style={st.depRow}>
          <Chip label="Aujourd’hui" selected={deposit.date === null} onPress={() => setDeposit({ ...deposit, date: null })} />
          <Chip label="Autre date" icon="calendar" selected={deposit.date !== null} onPress={() => setDeposit({ ...deposit, date: deposit.date ?? '' })} />
        </View>
        {deposit.date !== null && (
          <View>
            <TextInput value={deposit.date} onChangeText={x => setDeposit({ ...deposit, date: x.replace(/[^\d/.\- ]/g, '').slice(0, 10) })} placeholder="JJ/MM/AAAA" placeholderTextColor={c.ink3}
              keyboardType="numbers-and-punctuation" inputMode="numeric" accessibilityLabel={`Date du versement pour ${g.name}`} style={st.input} maxLength={10} />
            <Text style={[st.meta, badDate && { color: c.vermilion }]}>{badDate ? 'Date invalide (jamais dans le futur).' : iso && deposit.date ? `Versement du ${depDay(iso, today).toLowerCase()}.` : 'Si vous ne savez plus exactement, une date approximative suffit.'}</Text>
          </View>
        )}
        <View style={st.btns}>
          <View style={{ flex: 1 }} />
          <Button label="Annuler" variant="secondary" small onPress={() => setDeposit(null)} />
          <Button label="Noter" small disabled={!v || !iso} a11yLabel={`Noter le versement pour ${g.name}`}
            onPress={() => { if (v && iso) { onSave(addDeposit(g, v, iso)); setDeposit(null); } }} />
        </View>
      </View>
    );
  };

  const monthLine = (g: Goal) => {
    if (g.monthly <= 0 || progress(g) >= 1) return null;
    const done = depositedIn(g, thisMonth);
    return (
      <View style={st.monthLine}>
        <Text style={st.meta}>Versé en {MONTH_NAMES[today.getMonth()]} : <Text style={st.metaStrong}>{m$.round(done)}</Text> sur {m$.round(g.monthly)}</Text>
        {done >= g.monthly && <Feather name="check-circle" size={14} color={c.teal} />}
      </View>
    );
  };

  const [lead, ...others] = goals;
  const leadType = lead && typeOf(lead.type);
  const leadWith = lead && eta(lead.target, lead.saved, lead.monthly + surplus, today);
  const leadMs = lead && milestone(lead);
  const totalSaved = goals.reduce((a, g) => a + g.saved, 0);

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 48 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Objectifs" right={<IconButton icon="plus" label="Ajouter un objectif" onPress={newDraft} variant="filled" />} />
      {goals.length > 0 && (
        <View style={st.head}>
          <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={st.total} accessibilityLabel={`${m$.round(totalSaved)} épargnés`}>{m$.round(totalSaved)}</Text>
          <Text style={st.kick}>épargnés pour {goals.length} projet{goals.length > 1 ? 's' : ''}</Text>
        </View>
      )}
      {draft && draft.id === null && <Card style={{ marginTop: space.md }}><Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} /></Card>}

      {lead && (draft?.id === lead.id ? (
        <Card style={{ marginTop: space.md }}><Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(lead.id); setDraft(null); }} /></Card>
      ) : (
        <View style={st.leadCard}>
          <View style={[st.leadTop, { backgroundColor: leadType.color }]}>
            <Feather name={leadType.icon as IconName} size={24} color="#fff" />
            <Text style={st.leadType}>{leadType.name}</Text>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => edit(lead)} style={st.leadEdit} accessibilityRole="button" accessibilityLabel={`${leadType.name} : modifier ${lead.name}`}>
              <Feather name="edit-2" size={14} color="#141412" /><Text style={st.leadEditTxt}>Modifier</Text>
            </Pressable>
          </View>
          <View style={st.leadBody}>
            <View style={st.rowBetween}><Text style={st.leadName}>{lead.name}</Text><Text style={st.pct}>{Math.round(progress(lead) * 100)} %</Text></View>
            <ProgressBar value={progress(lead)} color={leadType.color} height={8} />
            <Text style={st.meta}>{m$.round(lead.saved)} sur {m$.round(lead.target)}{lead.target > lead.saved ? ` · encore ${m$.round(lead.target - lead.saved)}` : ''}</Text>
            {leadMs && <View style={st.msRow}><Feather name={leadMs === 100 ? 'award' : 'flag'} size={14} color={leadType.color} /><Text style={st.ms}>{MILESTONE[leadMs]}</Text></View>}
            {progress(lead) < 1 && <View style={[st.eta, { backgroundColor: tint(leadType.color, 0.08) }]}>
              <Text style={st.etaMain}>{etaText(lead)}</Text>
              {!eta(lead.target, lead.saved, 0, today).reached && surplus > 0 && leadWith?.label && (
                <Text style={st.etaSub} accessibilityLabel="Date avec le reste du mois">En y ajoutant ce qui restera fin {MONTH_NAMES[today.getMonth()]} (≈ {m$.round(surplus)}) : {leadWith.label}. Recalculé à chaque dépense.</Text>
              )}
            </View>}
            {monthLine(lead)}
            {depositRow(lead)}
            {!!lead.deposits?.length && (
              <View style={st.history}>
                <Text style={st.histTitle}>Derniers versements</Text>
                {lead.deposits.slice(0, 3).map((dp, i) => (
                  <View key={i} style={st.histRow}><Text style={st.histDate}>{depDay(dp.date, today)}</Text><Text style={st.histAmt}>{m$.signed(dp.amount, '+')}</Text></View>
                ))}
              </View>
            )}
          </View>
        </View>
      ))}

      {others.length > 0 && <SectionHeader title="Autres projets" />}
      {others.length > 0 && (
        <Card>
          {others.map((g, i) => {
            const ty = typeOf(g.type);
            return (
              <View key={g.id} style={i > 0 && st.sep}>
                {draft?.id === g.id ? (
                  <Editor d={draft} set={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(g.id); setDraft(null); }} />
                ) : (
                  <View style={{ paddingVertical: space.md, gap: space.sm }}>
                    <View style={st.row}>
                      <Badge color={ty.color} icon={ty.icon as IconName} size={40} />
                      <View style={{ flex: 1, gap: 6 }}>
                        <View style={st.rowBetween}><Text style={st.name} numberOfLines={1}>{g.name}</Text><Text style={st.pctSmall}>{Math.round(progress(g) * 100)} %</Text></View>
                        <ProgressBar value={progress(g)} color={ty.color} />
                        <Text style={st.meta}>{m$.round(g.saved)} sur {m$.round(g.target)} · {etaText(g)}</Text>
                        {monthLine(g)}
                      </View>
                    </View>
                    <View style={st.btns}>
                      {depositRow(g)}
                      {deposit?.id !== g.id && <Button label="Modifier" variant="ghost" small onPress={() => edit(g)} a11yLabel={`Modifier ${g.name}`} />}
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      )}

      {!goals.length && !draft && (
        <Card style={{ marginTop: space.lg }}>
          <EmptyState icon="target" title="Un projet en tête ?" text="Un voyage, une voiture, une épargne de précaution : fixez un montant et un versement mensuel, Nokori calcule la date d’arrivée."
            action={<Button label="Créer un objectif" icon="plus" onPress={newDraft} />} />
        </Card>
      )}

      <SectionHeader title="Défis kakeibo" right="cette semaine" />
      <Card style={st.chal}>
        <View style={st.rowBetween}><Text style={st.name}>Une semaine sans envies</Text><Text style={st.score} accessibilityLabel={`Semaine sans envies : ${okWeek} jour${okWeek > 1 ? 's' : ''} sur 7`}>{okWeek} / 7</Text></View>
        <View style={st.days}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((l, i) => {
            const v = week[i];
            return (
              <View key={i} style={[st.day, v === true && { backgroundColor: c.teal }, v === false && { backgroundColor: tint(c.vermilion, 0.14) }]} aria-hidden>
                {v === true ? <Feather name="check" size={14} color="#fff" /> : v === false ? <Feather name="x" size={14} color={c.vermilion} /> : <Text style={st.dayTxt}>{l}</Text>}
              </View>
            );
          })}
        </View>
        <Text style={st.meta}>{!expenses.length ? 'Le défi commence avec votre première dépense notée.' : week.includes(false) ? 'Une envie s’est glissée cette semaine : on repart lundi.' : `Encore ${week.filter(v => v === null).length} jour${week.filter(v => v === null).length > 1 ? 's' : ''} à tenir sans resto, shopping ni loisirs.`}</Text>
      </Card>
      <Card style={[st.chal, { marginTop: space.sm }]}>
        <View style={st.rowBetween}><Text style={st.name}>3 jours sous le budget du jour</Text><Text style={st.score} accessibilityLabel={`Série : ${Math.min(3, streak.days)} jour${streak.days > 1 ? 's' : ''} sur 3`}>{Math.min(3, streak.days)} / 3</Text></View>
        <View style={st.flames} aria-hidden>{[0, 1, 2].map(i => <View key={i} style={[st.flame, i < streak.days && { backgroundColor: c.vermilion }]} />)}</View>
        <Text style={st.meta}>{!expenses.length ? 'La série commence avec votre première dépense notée.' : streak.perDay <= 0 ? 'Le budget du jour est épuisé ce mois-ci.' : streak.days >= 3 ? `Réussi : ${streak.days} jours d’affilée sous ${m$.round(streak.perDay)}.` : `${streak.days} jour${streak.days > 1 ? 's' : ''} d’affilée sous ${m$.round(streak.perDay)}. Encore ${3 - streak.days} jour${3 - streak.days > 1 ? 's' : ''}.`}</Text>
      </Card>
      <Text style={st.note}>Nokori ne déplace pas d’argent : notez un versement après l’avoir fait dans votre banque.</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  head: { paddingHorizontal: space.gutter + space.xs, marginTop: space.lg },
  total: { ...t.h1, ...tabular, fontSize: 40, lineHeight: 46, color: c.ink },
  kick: { ...t.callout, color: c.ink2 },
  leadCard: { marginHorizontal: space.gutter, marginTop: space.lg, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: c.surface },
  leadTop: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingHorizontal: space.lg, paddingVertical: space.md },
  leadType: { ...t.callout, fontFamily: font.semibold, color: '#fff' },
  leadEdit: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: space.md, borderRadius: radius.pill, backgroundColor: 'rgba(255,255,255,0.92)' },
  leadEditTxt: { ...t.caption, fontFamily: font.semibold, color: '#141412' },
  leadBody: { padding: space.lg, gap: space.sm + 2 },
  leadName: { ...t.title, fontSize: 20, color: c.ink, flex: 1 },
  pct: { ...t.title, ...tabular, fontSize: 20, color: c.ink },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  meta: { ...t.footnote, ...tabular, color: c.ink2 },
  metaStrong: { fontFamily: font.semibold, color: c.ink },
  msRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ms: { ...t.callout, fontFamily: font.semibold, color: c.ink },
  eta: { borderRadius: radius.md, padding: space.md, gap: space.xs },
  etaMain: { ...t.callout, fontFamily: font.semibold, color: c.ink },
  etaSub: { ...t.footnote, color: c.ink2 },
  monthLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  depBox: { gap: space.sm, flex: 1 },
  depRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  history: { marginTop: space.xs, paddingTop: space.sm, borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair, gap: 6 },
  histTitle: { ...t.overline, color: c.ink2 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between' },
  histDate: { ...t.footnote, color: c.ink2 },
  histAmt: { ...t.footnote, ...tabular, fontFamily: font.semibold, color: c.teal },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  row: { flexDirection: 'row', gap: space.md },
  name: { ...t.bodyStrong, color: c.ink, flexShrink: 1 },
  pctSmall: { ...t.callout, ...tabular, fontFamily: font.bold, color: c.ink },
  editor: { gap: space.md, paddingVertical: space.lg },
  input: { ...t.body, height: 46, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md, color: c.ink },
  types: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  fRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  fLbl: { ...t.callout, color: c.ink2 },
  fBox: { flexDirection: 'row', alignItems: 'center', width: 170, height: 46, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md },
  fInput: { ...t.bodyStrong, ...tabular, fontSize: 16, flex: 1, minWidth: 0, textAlign: 'right', color: c.ink },
  euro: { ...t.body, color: c.ink2, marginLeft: 6 },
  err: { ...t.footnote, color: c.vermilion, marginTop: space.xs },
  btns: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  chal: { paddingVertical: space.lg, gap: space.sm + 2 },
  score: { ...t.bodyStrong, ...tabular, fontFamily: font.bold, color: c.vermilion },
  days: { flexDirection: 'row', gap: 6 },
  day: { flex: 1, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: c.fill },
  dayTxt: { ...t.caption, fontFamily: font.bold, color: c.ink2 },
  flames: { flexDirection: 'row', gap: space.sm },
  flame: { flex: 1, height: 8, borderRadius: 6, backgroundColor: c.fill },
  note: { ...t.caption, color: c.ink2, marginHorizontal: space.gutter + space.sm, marginTop: space.lg },
});
