import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatEurosRound } from '../domain/money';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import { cleanNote, monthKey, review } from '../domain/review';
import type { Expense, Profile } from '../domain/types';
import { colors, font, pillarColor, tint } from '../theme/tokens';
import { MonthStory } from '../ui/MonthStory';

interface Props { profile: Profile; expenses: Expense[]; notes: Record<string, string>; today: Date; onSaveNote: (month: string, text: string) => void }

export function ReviewScreen({ profile, expenses, notes, today, onSaveNote }: Props) {
  const insets = useSafeAreaInsets();
  const [prev, setPrev] = useState(false);
  const [story, setStory] = useState(false);
  const d = new Date(today.getFullYear(), today.getMonth() - (prev ? 1 : 0), 1);
  const r = review(profile, expenses, d.getFullYear(), d.getMonth(), today);
  const c = MONTH_COLORS[r.month], name = MONTH_NAMES[r.month];
  const key = monthKey(r.year, r.month);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const note = drafts[key] ?? notes[key] ?? '';
  const prevName = MONTH_NAMES[(today.getMonth() + 11) % 12], curName = MONTH_NAMES[today.getMonth()];
  const total = Math.max(1, r.spent + Math.max(0, r.left) + r.saving);

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <View style={st.switch} accessibilityRole="tablist">
          {([[true, capitalize(prevName)], [false, capitalize(curName)]] as [boolean, string][]).map(([v, l]) => (
            <Pressable key={l} onPress={() => setPrev(v)} style={[st.sw, prev === v && st.swOn]} accessibilityRole="tab" accessibilityState={{ selected: prev === v }}>
              <Text style={[st.swTxt, prev === v && { color: colors.ink }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={st.mono}>Bilan kakeibo</Text>
      </View>

      <LinearGradient colors={[c.light, c.dark]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={st.card}>
        <View style={st.row}><Text style={st.cardM}>{capitalize(name)}, {r.closed ? 'clos' : 'en cours'}</Text><View style={st.tag}><Text style={st.tagTxt}>{c.kanji} {c.name}</Text></View></View>
        <Text style={st.big} accessibilityLabel={`${formatEurosRound(r.savedTotal)} épargnés`}>{formatEurosRound(r.savedTotal)}<Text style={st.bigSmall}> épargnés</Text></Text>
        <Text style={st.sub}>{r.closed ? `${Math.round(r.savedPct * 100)} % du revenu${r.left > 0 ? ', non-dépensé compris' : ''}` : `${Math.round(profile.savePct * 100)} % du revenu, prévus dès la paie`}</Text>
        <View style={st.split}>
          <View style={{ flex: r.spent / total, backgroundColor: 'rgba(255,255,255,0.35)' }} />
          {r.left > 0 && <View style={{ flex: r.left / total, backgroundColor: r.closed ? '#F6D9A8' : 'rgba(255,255,255,0.15)' }} />}
          <View style={{ flex: r.saving / total, backgroundColor: '#fff' }} />
        </View>
        <View style={st.legend}>
          <Text style={st.lg}>Dépensé {formatEurosRound(r.spent)}</Text>
          {r.left !== 0 && <Text style={st.lg}>{r.left > 0 ? (r.closed ? 'Non dépensé' : 'Reste') : 'Dépassement'} {formatEurosRound(Math.abs(r.left))}</Text>}
          <Text style={st.lg}>Épargne {formatEurosRound(r.saving)}</Text>
        </View>
      </LinearGradient>

      {r.closed && (
        <Pressable onPress={() => setStory(true)} style={[st.storyBtn, { backgroundColor: c.dark }]} accessibilityRole="button" accessibilityLabel={`Revoir ${name} en story`}>
          <Text style={st.storyK}>{c.kanji}</Text><Text style={st.storyTxt}>Revoir {name} en story</Text><Text style={st.storyArrow}>›</Text>
        </Pressable>
      )}

      <Text style={st.sec}>Les quatre questions</Text>
      <View style={st.list}>
        {([['Combien ai-je reçu ?', r.income], [r.closed ? 'Combien voulais-je épargner ?' : 'Combien est-ce que je veux épargner ?', r.saving], ['Combien ai-je dépensé ?', r.spent]] as [string, number][]).map(([q, v], i) => (
          <View key={q} style={[st.qRow, i > 0 && st.sep]}><Text style={st.qn}>{i + 1}</Text><Text style={st.q}>{q}</Text><Text style={st.qv}>{formatEurosRound(v)}</Text></View>
        ))}
        <View style={[st.sep, { paddingVertical: 12 }]}>
          <View style={{ flexDirection: 'row', gap: 10 }}><Text style={[st.qn, { color: colors.vermilion }]}>4</Text><Text style={st.q}>Comment faire mieux ?</Text></View>
          <TextInput
            value={note} multiline maxLength={280} placeholder="Une idée pour le mois prochain : moins de livraisons, plus de marché…" placeholderTextColor={colors.ink3}
            onChangeText={t => setDrafts(s => ({ ...s, [key]: cleanNote(t) }))} onBlur={() => { if (drafts[key] !== undefined) onSaveNote(key, drafts[key]); }}
            accessibilityLabel={`Comment faire mieux en ${name}`} style={st.note}
          />
          {drafts[key] !== undefined && drafts[key] !== (notes[key] ?? '') && (
            <Pressable onPress={() => onSaveNote(key, drafts[key])} style={st.saveNote} accessibilityRole="button" accessibilityLabel="Enregistrer la note"><Text style={st.saveNoteTxt}>Enregistrer</Text></Pressable>
          )}
          <Text style={st.count}>{note.length} / 280</Text>
        </View>
      </View>

      <Text style={st.sec}>Les piliers {r.closed ? `de ${name}` : 'à ce jour'}</Text>
      <View style={st.list}>
        {r.pillars.map((p, i) => {
          const f = p.budget > 0 ? Math.min(1, p.spent / p.budget) : 0;
          return (
            <View key={p.id} style={[st.pRow, i > 0 && st.sep]}>
              <Text style={st.pName}>{p.name}</Text>
              <View style={[st.pBar, { backgroundColor: tint(pillarColor[p.id], 0.14) }]}><View style={{ height: 6, borderRadius: 6, width: `${f * 100}%`, backgroundColor: p.spent > p.budget ? colors.vermilion : pillarColor[p.id] }} /></View>
              <Text style={st.pVal}>{Math.round((p.budget > 0 ? p.spent / p.budget : 0) * 100)} %</Text>
            </View>
          );
        })}
      </View>
      <Text style={st.hint}>Un mois passé est recalculé avec votre revenu et vos charges fixes actuels.</Text>
      {r.closed && <MonthStory r={r} note={notes[key] ?? ''} visible={story} onClose={() => setStory(false)} />}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  switch: { flexDirection: 'row', backgroundColor: 'rgba(20,20,18,0.06)', borderRadius: 99, padding: 3 },
  sw: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 99 },
  swOn: { backgroundColor: colors.surface },
  swTxt: { fontFamily: font.medium, fontSize: 13, color: colors.ink2 },
  mono: { fontFamily: font.regular, fontSize: 12, color: colors.ink2 },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 30, padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardM: { color: '#fff', fontFamily: font.semibold, fontSize: 15 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  tagTxt: { color: '#fff', fontFamily: font.semibold, fontSize: 12 },
  big: { color: '#fff', fontFamily: font.semibold, fontSize: 44, letterSpacing: -2, marginTop: 10 },
  bigSmall: { fontSize: 22, letterSpacing: -0.6 },
  sub: { color: '#fff', fontFamily: font.medium, fontSize: 14, marginTop: 2 },
  split: { flexDirection: 'row', height: 10, borderRadius: 6, overflow: 'hidden', marginTop: 16, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  lg: { color: '#fff', fontFamily: font.medium, fontSize: 12 },
  storyBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, padding: 14, borderRadius: 18 },
  storyK: { color: '#FBEFE4', fontSize: 20 },
  storyTxt: { flex: 1, color: '#FBEFE4', fontFamily: font.semibold, fontSize: 15 },
  storyArrow: { color: '#FBEFE4', fontSize: 22 },
  sec: { fontFamily: font.semibold, fontSize: 14, color: colors.ink, marginHorizontal: 24, marginTop: 22, marginBottom: 8 },
  list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hair },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  qn: { fontFamily: font.semibold, fontSize: 12, color: colors.vermilion, width: 14 },
  q: { flex: 1, fontFamily: font.regular, fontSize: 15, color: colors.ink },
  qv: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  note: { minWidth: 0, width: '100%', minHeight: 70, marginTop: 10, borderRadius: 12, backgroundColor: 'rgba(20,20,18,0.04)', padding: 10, fontFamily: font.regular, fontSize: 15, color: colors.ink, textAlignVertical: 'top' },
  saveNote: { alignSelf: 'flex-end', marginTop: 8, paddingHorizontal: 14, height: 36, borderRadius: 10, backgroundColor: colors.ink, justifyContent: 'center' },
  saveNoteTxt: { color: '#fff', fontFamily: font.semibold, fontSize: 13 },
  count: { fontFamily: font.regular, fontSize: 11.5, color: colors.ink3, textAlign: 'right', marginTop: 4 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 13 },
  pName: { width: 80, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  pBar: { flex: 1, height: 6, borderRadius: 6, overflow: 'hidden' },
  pVal: { width: 48, textAlign: 'right', fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  hint: { fontFamily: font.regular, fontSize: 12, color: colors.ink3, marginHorizontal: 24, marginTop: 12 },
});
