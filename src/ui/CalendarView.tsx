import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../domain/budget';
import { calendarMonth } from '../domain/calendar';
import { profileAt, type ProfileEra } from '../domain/history';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import type { Expense, Profile } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, tabular, tint, type as t } from '../theme/tokens';
import { Card, IconButton, SectionHeader } from './kit';
import { useMoney } from './money';

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DOW_FULL = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
/** Navigation : deux ans en arrière, un an en avant */
export const CAL_MIN = -24, CAL_MAX = 12;

/** Calendrier : les charges fixes se reportent toutes seules, les mois passés gardent leurs chiffres d'époque */
export function CalendarView({ profile, history = [], expenses, today }: { profile: Profile; history?: ProfileEra[]; expenses: Expense[]; today: Date }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m$ = useMoney();
  const [offset, setOffset] = useState(0);
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const cm = calendarMonth(profileAt(profile, history, y, m), expenses, y, m, today);
  const [selByMonth, setSel] = useState<Record<string, number>>({});
  const key = `${y}-${m}`;
  const sel = Math.min(selByMonth[key] ?? (offset === 0 ? today.getDate() : 1), cm.length);
  const day = cm.days[sel - 1];
  const col = MONTH_COLORS[m];
  const max = Math.max(1, ...cm.days.map(d => d.spent));
  const month = MONTH_NAMES[m];
  const dow = DOW_FULL[(cm.firstDow + sel - 1) % 7];

  return (
    <View>
      <View style={st.head}>
        <IconButton icon="chevron-left" label="Mois précédent" variant="surface" onPress={() => setOffset(o => Math.max(CAL_MIN, o - 1))} disabled={offset <= CAL_MIN} />
        <View style={st.titleWrap}>
          <Text style={st.title} accessibilityRole="header">{capitalize(month)} {y}</Text>
          <View style={[st.status, { backgroundColor: cm.status === 'prévu' ? tint(c.teal, 0.14) : cm.status === 'en cours' ? tint(col.light, 0.16) : c.fill }]}>
            <Text style={st.statusTxt}>{cm.status}</Text>
          </View>
        </View>
        <IconButton icon="chevron-right" label="Mois suivant" variant="surface" onPress={() => setOffset(o => Math.min(CAL_MAX, o + 1))} disabled={offset >= CAL_MAX} />
      </View>
      {offset !== 0 && (
        <Pressable onPress={() => setOffset(0)} style={st.today} accessibilityRole="button" accessibilityLabel="Revenir au mois en cours">
          <Feather name="rotate-ccw" size={13} color={c.ink2} /><Text style={st.todayTxt}>Revenir à aujourd’hui</Text>
        </Pressable>
      )}
      <View style={[st.band, { backgroundColor: col.light }]}>
        <Text style={st.bandK} aria-hidden>{col.kanji}</Text><Text style={st.bandTxt}>{col.name}, la couleur de {month}</Text>
      </View>
      <View style={st.sum}>
        <Stat label="Revenus" value={`+${m$.round(cm.income)}`} color={c.teal} />
        <Stat label="Charges fixes" value={m$.round(cm.fixed)} />
        <Stat label={cm.status === 'prévu' ? 'Budget libre' : 'Dépenses'} value={m$.round(cm.status === 'prévu' ? cm.free : cm.variable)}
          a11y={cm.status === 'prévu' ? `Budget libre ${m$.round(cm.free)}` : `Dépenses ${m$.round(cm.variable)}`} />
      </View>
      <View style={st.grid}>
        {DOW.map((d, i) => <Text key={i} style={st.dow} aria-hidden>{d}</Text>)}
        {Array.from({ length: cm.firstDow }, (_, i) => <View key={'e' + i} style={st.cell} />)}
        {cm.days.map(d => {
          const isToday = offset === 0 && d.d === today.getDate(), on = sel === d.d;
          const heat = d.future ? 0 : d.spent / max;
          return (
            <Pressable key={d.d} onPress={() => setSel(s => ({ ...s, [key]: d.d }))} style={st.cell} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.d} ${month}${d.charges.length ? `, ${d.charges.length} charge${d.charges.length > 1 ? 's' : ''} fixe${d.charges.length > 1 ? 's' : ''}` : ''}${d.income ? ', paie' : ''}${d.spent ? `, ${m$.spoken(d.spent)} dépensés` : ''}${isToday ? ', aujourd’hui' : ''}`}>
              <View style={[st.dayBox, { backgroundColor: on ? c.btn : heat ? tint(col.light, 0.1 + heat * 0.4) : 'transparent' }, isToday && !on && { borderWidth: 1.5, borderColor: col.light }]}>
                <Text style={[st.dayN, d.future && !on && { color: c.ink2 }, on && { color: c.onBtn }]}>{d.d}</Text>
                <View style={st.marks}>
                  {d.charges.slice(0, 3).map(ch => <View key={ch.id} style={[st.mark, { backgroundColor: on ? c.onBtn : c.vermilion, opacity: d.future ? 0.6 : 1 }]} />)}
                  {d.income > 0 && <View style={[st.mark, { backgroundColor: on ? c.onBtn : c.teal }]} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={st.legend} aria-hidden>
        <View style={st.lg}><View style={[st.mark, { backgroundColor: c.vermilion }]} /><Text style={st.lgTxt}>charge fixe</Text></View>
        <View style={st.lg}><View style={[st.mark, { backgroundColor: c.teal }]} /><Text style={st.lgTxt}>paie</Text></View>
        <View style={st.lg}><View style={[st.sq, { backgroundColor: tint(col.light, 0.4) }]} /><Text style={st.lgTxt}>dépenses (plus foncé = plus dépensé)</Text></View>
      </View>
      <SectionHeader plain title={`${dow} ${sel} ${month}${day.future ? ', prévu' : ''}`} right={day.spent ? m$.signed(day.spent, '−') : undefined} />
      <Card>
        {day.income > 0 && <Line first name="Paie" sub="revenu" amount={m$.signed(day.income, '+')} color={c.teal} />}
        {day.charges.map((ch, i) => <Line key={ch.id} first={!day.income && i === 0} name={ch.name} sub={day.future ? 'charge fixe, prévue' : 'charge fixe'} amount={m$.signed(ch.amount, '−')} />)}
        {day.expenses.map((e, i) => <Line key={e.id} first={!day.income && !day.charges.length && i === 0} name={e.label} sub={CATEGORIES.find(x => x.id === e.categoryId)?.name ?? ''} amount={m$.signed(e.amount, '−')} />)}
        {!day.income && !day.charges.length && !day.expenses.length && <Text style={st.empty}>{day.future ? 'Rien de prévu ce jour-là.' : 'Aucune dépense ce jour-là.'}</Text>}
      </Card>
    </View>
  );
}

function Stat({ label, value, color, a11y }: { label: string; value: string; color?: string; a11y?: string }) {
  const st = useStyles(makeStyles);
  return (
    <View style={st.box}>
      <Text style={st.boxL}>{label}</Text>
      <Text style={[st.boxV, color ? { color } : null]} accessibilityLabel={a11y} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
    </View>
  );
}

function Line({ name, sub, amount, color, first }: { name: string; sub: string; amount: string; color?: string; first?: boolean }) {
  const st = useStyles(makeStyles);
  return (
    <View style={[st.row, !first && st.rowSep]}>
      <View style={{ flex: 1 }}><Text style={st.rowName}>{name}</Text>{!!sub && <Text style={st.rowSub}>{sub}</Text>}</View>
      <Text style={[st.rowAmt, color ? { color } : null]}>{amount}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: space.gutter, marginTop: space.lg },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title: { ...t.headline, fontSize: 19, color: c.ink },
  status: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill },
  statusTxt: { ...t.caption, fontFamily: font.semibold, color: c.ink },
  today: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: space.sm, paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: c.fill, minHeight: 32 },
  todayTxt: { ...t.caption, color: c.ink2 },
  band: { flexDirection: 'row', alignItems: 'center', gap: space.sm + 2, marginHorizontal: space.gutter, marginTop: space.md, borderRadius: radius.md, paddingHorizontal: space.md + 2, paddingVertical: space.sm + 2 },
  bandK: { color: '#FFFFFF', fontSize: 18 },
  bandTxt: { ...t.callout, fontFamily: font.semibold, color: '#FFFFFF' },
  sum: { flexDirection: 'row', gap: space.sm, marginHorizontal: space.gutter, marginTop: space.sm },
  box: { flex: 1, backgroundColor: c.surface, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  boxL: { ...t.caption, color: c.ink2 },
  boxV: { ...t.bodyStrong, ...tabular, fontSize: 16, color: c.ink, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: space.gutter, marginTop: space.sm, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.sm },
  dow: { width: '14.2857%', textAlign: 'center', ...t.caption, color: c.ink2, paddingVertical: 6 },
  cell: { width: '14.2857%', aspectRatio: 0.92, padding: 2 },
  dayBox: { flex: 1, borderRadius: radius.sm, alignItems: 'center', paddingTop: 6 },
  dayN: { ...t.footnote, ...tabular, fontFamily: font.semibold, color: c.ink },
  marks: { flexDirection: 'row', gap: 2, marginTop: 4 },
  mark: { width: 5, height: 5, borderRadius: 3 },
  sq: { width: 10, height: 10, borderRadius: 3 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.md + 2, rowGap: 4, marginHorizontal: space.gutter + space.sm, marginTop: space.sm + 2 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgTxt: { ...t.caption, color: c.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, minHeight: 52 },
  rowSep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  rowName: { ...t.bodyStrong, color: c.ink },
  rowSub: { ...t.footnote, color: c.ink2, marginTop: 1 },
  rowAmt: { ...t.bodyStrong, ...tabular, color: c.ink },
  empty: { ...t.footnote, color: c.ink2, paddingVertical: space.lg },
});
