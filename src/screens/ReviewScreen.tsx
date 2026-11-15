import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { firstMonth } from '../domain/activity';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import { byCategory, cleanNote, compareWithPrevious, monthKey, review } from '../domain/review';
import type { Expense, Profile } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, tabular, type as t } from '../theme/tokens';
import { BIG_TEXT_MAX_SCALE } from '../ui/a11y';
import { Button, Card, EmptyState, IconButton, ProgressBar, ScreenHeader, SectionHeader } from '../ui/kit';
import { MonthStory } from '../ui/MonthStory';
import { useMoney } from '../ui/money';

interface Props {
  profile: Profile; profileAt?: (y: number, m: number) => Profile; expenses: Expense[]; notes: Record<string, string>; today: Date;
  onSaveNote: (month: string, text: string) => void;
}

const W = '#FFFFFF';

/** Bilan kakeibo : n'importe quel mois depuis la première dépense, comparaison avec le mois d'avant, où est parti l'argent */
export function ReviewScreen({ profile, profileAt, expenses, notes, today, onSaveNote }: Props) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m$ = useMoney();
  const insets = useSafeAreaInsets();
  const first = useMemo(() => firstMonth(expenses, today), [expenses, today]);
  const minOffset = Math.min(-1, (first.year * 12 + first.month) - (today.getFullYear() * 12 + today.getMonth()));
  const [offset, setOffset] = useState(0);
  const [story, setStory] = useState(false);
  const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = d.getFullYear(), mo = d.getMonth();
  const prof = profileAt ? profileAt(y, mo) : profile;
  const r = review(prof, expenses, y, mo, today);
  const cats = byCategory(expenses, y, mo, today);
  const cmp = compareWithPrevious(expenses, y, mo, today);
  const col = MONTH_COLORS[mo], name = MONTH_NAMES[mo], prevName = MONTH_NAMES[(mo + 11) % 12];
  const key = monthKey(y, mo);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const note = drafts[key] ?? notes[key] ?? '';
  const total = Math.max(1, r.spent + Math.max(0, r.left) + r.saving);
  const maxCat = Math.max(1, ...cats.map(x => x.spent));
  const variable = cats.reduce((a, x) => a + x.spent, 0);

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 48 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Bilan" overline="Kakeibo" />
      <View style={st.nav}>
        <IconButton icon="chevron-left" label="Bilan : mois d’avant" small onPress={() => setOffset(o => o - 1)} disabled={offset <= minOffset} />
        <Text style={st.navTitle} accessibilityRole="header">{capitalize(name)} {y}</Text>
        <IconButton icon="chevron-right" label="Bilan : mois d’après" small onPress={() => setOffset(o => o + 1)} disabled={offset >= 0} />
      </View>

      <View style={[st.hero, { backgroundColor: col.light }]}>
        <View style={st.row}><Text style={st.heroM}>{capitalize(name)}, {r.closed ? 'clos' : 'en cours'}</Text><View style={st.tag}><Text style={st.tagTxt}>{col.kanji} {col.name}</Text></View></View>
        <Text style={st.heroLabel}>{r.closed ? 'Épargné' : 'Épargne prévue'}</Text>
        <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={st.big} accessibilityLabel={`${m$.round(r.savedTotal)} épargnés`}>{m$.round(r.savedTotal)}</Text>
        <Text style={st.sub}>{r.closed ? `${Math.round(r.savedPct * 100)} % du revenu${r.left > 0 ? ', non-dépensé compris' : ''}` : `${Math.round(prof.savePct * 100)} % du revenu, prévus dès la paie`}</Text>
        <View style={st.split} aria-hidden>
          <View style={{ flex: r.spent / total, backgroundColor: 'rgba(255,255,255,0.45)' }} />
          {r.left > 0 && <View style={{ flex: r.left / total, backgroundColor: 'rgba(255,255,255,0.25)' }} />}
          <View style={{ flex: r.saving / total, backgroundColor: W }} />
        </View>
        <View style={st.legend}>
          <Text style={st.lg}>Dépensé {m$.round(r.spent)}</Text>
          {r.left !== 0 && <Text style={st.lg}>{r.left > 0 ? (r.closed ? 'Non dépensé' : 'Reste') : 'Dépassement'} {m$.round(Math.abs(r.left))}</Text>}
          <Text style={st.lg}>Épargne {m$.round(r.saving)}</Text>
        </View>
      </View>

      {r.closed && (
        <Pressable onPress={() => setStory(true)} style={[st.storyBtn, { backgroundColor: col.dark }]} accessibilityRole="button" accessibilityLabel={`Revoir ${name} en story`}>
          <Text style={st.storyK} aria-hidden>{col.kanji}</Text><Text style={st.storyTxt}>Revoir {name} en story</Text><Feather name="play" size={16} color={W} />
        </Pressable>
      )}

      <SectionHeader title={`Par rapport à ${prevName}`} />
      <Card style={st.cmp}>
        {cmp.before === 0 && cmp.now === 0 ? <Text style={st.muted}>Aucune dépense saisie sur ces deux mois.</Text> : <>
          <Text style={st.cmpMain} accessibilityLiveRegion="polite">
            {cmp.pct === null ? `Pas de dépense saisie en ${prevName}.`
              : cmp.diff === 0 ? 'Autant de dépenses courantes.'
              : `${cmp.diff < 0 ? '−' : '+'}${Math.abs(Math.round(cmp.pct * 100))} % de dépenses courantes`}
          </Text>
          <Text style={st.muted}>{cmp.sameDay ? `Du 1er au ${today.getDate()} de chaque mois, hors charges fixes.` : 'Mois complets, hors charges fixes.'}</Text>
          <Bars rows={[[capitalize(prevName), cmp.before, c.fill2], [capitalize(name), cmp.now, col.light]]} />
        </>}
      </Card>

      <SectionHeader title="Où est parti l’argent" right={variable ? m$.round(variable) : undefined} />
      <Card>
        {cats.length === 0 ? <EmptyState icon="pie-chart" title="Aucune dépense ce mois-ci" text="Les dépenses saisies apparaîtront ici, rangées par catégorie." /> : cats.map((x, i) => (
          <View key={x.id} style={[st.catRow, i > 0 && st.sep]} accessible accessibilityLabel={`${x.name} : ${m$.spoken(x.spent)}, ${x.count} dépense${x.count > 1 ? 's' : ''}, ${Math.round((x.spent / Math.max(1, variable)) * 100)} %`}>
            <View style={st.catTop}>
              <Text style={st.catName} numberOfLines={1}>{x.name}</Text>
              <Text style={st.catVal}>{m$.round(x.spent)}</Text>
            </View>
            <ProgressBar value={x.spent / maxCat} color={c.pillar[x.pillar]} height={6} />
            <Text style={st.catSub}>{x.count} dépense{x.count > 1 ? 's' : ''} · {Math.round((x.spent / Math.max(1, variable)) * 100)} %</Text>
          </View>
        ))}
      </Card>

      <SectionHeader title="Les quatre questions" />
      <Card>
        {([['Combien ai-je reçu ?', r.income], [r.closed ? 'Combien voulais-je épargner ?' : 'Combien est-ce que je veux épargner ?', r.saving], ['Combien ai-je dépensé ?', r.spent]] as [string, number][]).map(([q, v], i) => (
          <View key={q} style={[st.qRow, i > 0 && st.sep]}><Text style={st.qn}>{i + 1}</Text><Text style={st.q}>{q}</Text><Text style={st.qv}>{m$.round(v)}</Text></View>
        ))}
        <View style={[st.sep, { paddingVertical: space.md }]}>
          <View style={{ flexDirection: 'row', gap: space.sm + 2 }}><Text style={st.qn}>4</Text><Text style={st.q}>Comment faire mieux ?</Text></View>
          <TextInput
            value={note} multiline maxLength={280} placeholder="Une idée pour le mois prochain : moins de livraisons, plus de marché…" placeholderTextColor={c.ink3}
            onChangeText={v => setDrafts(s => ({ ...s, [key]: cleanNote(v) }))} onBlur={() => { if (drafts[key] !== undefined) onSaveNote(key, drafts[key]); }}
            accessibilityLabel={`Comment faire mieux en ${name}`} style={st.note}
          />
          <View style={st.noteFoot}>
            <Text style={st.count}>{note.length} / 280</Text>
            {drafts[key] !== undefined && drafts[key] !== (notes[key] ?? '') && (
              <Button label="Enregistrer" small onPress={() => onSaveNote(key, drafts[key])} a11yLabel="Enregistrer la note" />
            )}
          </View>
        </View>
      </Card>

      <SectionHeader title={`Les piliers ${r.closed ? `de ${name}` : 'à ce jour'}`} />
      <Card>
        {r.pillars.map((p, i) => {
          const f = p.budget > 0 ? p.spent / p.budget : 0;
          return (
            <View key={p.id} style={[st.pRow, i > 0 && st.sep]} accessible accessibilityLabel={`${p.name} : ${Math.round(f * 100)} % du budget utilisé`}>
              <Text style={st.pName}>{p.name}</Text>
              <View style={{ flex: 1 }}><ProgressBar value={f} color={p.spent > p.budget ? c.vermilion : c.pillar[p.id]} /></View>
              <Text style={st.pVal}>{Math.round(f * 100)} %</Text>
            </View>
          );
        })}
      </Card>
      <Text style={st.hint}>Les mois passés gardent le revenu et les charges fixes qu’ils avaient à l’époque.</Text>
      {r.closed && <MonthStory r={r} note={notes[key] ?? ''} visible={story} onClose={() => setStory(false)} />}
    </ScrollView>
  );
}

/** Deux barres horizontales comparées (valeurs réelles, même échelle) */
function Bars({ rows }: { rows: [string, number, string][] }) {
  const st = useStyles(makeStyles); const m$ = useMoney();
  const max = Math.max(1, ...rows.map(r => r[1]));
  return (
    <View style={{ gap: space.sm, marginTop: space.md }}>
      {rows.map(([label, v, color]) => (
        <View key={label} style={st.barRow}>
          <Text style={st.barLabel}>{label}</Text>
          <View style={st.barTrack}><View style={{ width: `${(v / max) * 100}%`, height: 10, borderRadius: 5, backgroundColor: color }} /></View>
          <Text style={st.barVal}>{m$.round(v)}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: space.gutter, marginTop: space.md },
  navTitle: { ...t.headline, color: c.ink },
  hero: { marginHorizontal: space.gutter, marginTop: space.md, borderRadius: radius.xl, padding: space.xl - 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroM: { ...t.headline, color: W },
  tag: { backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagTxt: { ...t.caption, fontFamily: font.semibold, color: W },
  heroLabel: { ...t.overline, color: W, marginTop: space.lg },
  big: { ...t.display, ...tabular, fontSize: 48, lineHeight: 54, color: W, marginTop: space.xs },
  sub: { ...t.callout, color: W },
  split: { flexDirection: 'row', height: 8, borderRadius: 8, overflow: 'hidden', marginTop: space.lg, gap: 2 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, marginTop: space.sm + 2 },
  lg: { ...t.caption, ...tabular, color: W },
  storyBtn: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginHorizontal: space.gutter, marginTop: space.sm + 2, paddingHorizontal: space.lg, height: 52, borderRadius: radius.md },
  storyK: { color: W, fontSize: 18 },
  storyTxt: { ...t.bodyStrong, flex: 1, color: W },
  cmp: { paddingVertical: space.lg },
  cmpMain: { ...t.headline, color: c.ink },
  muted: { ...t.footnote, color: c.ink2, marginTop: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2 },
  barLabel: { ...t.caption, color: c.ink2, width: 78 },
  barTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: c.fill, overflow: 'hidden' },
  barVal: { ...t.footnote, ...tabular, fontFamily: font.semibold, color: c.ink, width: 72, textAlign: 'right' },
  catRow: { paddingVertical: space.md, gap: 6 },
  catTop: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  catName: { ...t.bodyStrong, color: c.ink, flex: 1 },
  catVal: { ...t.bodyStrong, ...tabular, color: c.ink },
  catSub: { ...t.caption, color: c.ink2 },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  qRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingVertical: space.md + 2 },
  qn: { ...t.caption, fontFamily: font.semibold, color: c.vermilion, width: 14 },
  q: { ...t.body, flex: 1, color: c.ink },
  qv: { ...t.bodyStrong, ...tabular, color: c.ink },
  note: { ...t.body, minHeight: 76, marginTop: space.sm + 2, borderRadius: radius.md, backgroundColor: c.fill, padding: space.md, color: c.ink, textAlignVertical: 'top' },
  noteFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space.sm, minHeight: 40 },
  count: { ...t.caption, color: c.ink2 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, paddingVertical: space.md + 1 },
  pName: { ...t.callout, width: 82, color: c.ink },
  pVal: { ...t.footnote, ...tabular, fontFamily: font.semibold, width: 48, textAlign: 'right', color: c.ink },
  hint: { ...t.caption, color: c.ink2, marginHorizontal: space.gutter + space.sm, marginTop: space.md },
});

