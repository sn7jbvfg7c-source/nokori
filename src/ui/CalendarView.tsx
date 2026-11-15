import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CATEGORIES } from '../domain/budget';
import { calendarMonth } from '../domain/calendar';
import { formatEuros, formatEurosRound } from '../domain/money';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import type { Expense, Profile } from '../domain/types';
import { colors, font, tint } from '../theme/tokens';

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/** Calendrier : du mois dernier à dans 3 mois ; les charges fixes se reportent toutes seules */
export function CalendarView({ profile, expenses, today }: { profile: Profile; expenses: Expense[]; today: Date }) {
  const [offset, setOffset] = useState(0);
  const base = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = base.getFullYear(), m = base.getMonth();
  const cm = calendarMonth(profile, expenses, y, m, today);
  const [selByMonth, setSel] = useState<Record<string, number>>({});
  const key = `${y}-${m}`;
  const sel = Math.min(selByMonth[key] ?? (offset === 0 ? today.getDate() : 1), cm.length);
  const day = cm.days[sel - 1];
  const col = MONTH_COLORS[m];
  const max = Math.max(1, ...cm.days.map(d => d.spent));
  const month = MONTH_NAMES[m];

  return (
    <View>
      <View style={st.head}>
        <Pressable onPress={() => setOffset(o => Math.max(-1, o - 1))} disabled={offset <= -1} style={[st.nav, offset <= -1 && st.navOff]} accessibilityRole="button" accessibilityLabel="Mois précédent"><Text style={st.navTxt}>‹</Text></Pressable>
        <View style={st.titleWrap}>
          <Text style={st.title}>{capitalize(month)} {y}</Text>
          <View style={[st.status, cm.status === 'prévu' && st.statusFut]}><Text style={st.statusTxt}>{cm.status}</Text></View>
        </View>
        <Pressable onPress={() => setOffset(o => Math.min(3, o + 1))} disabled={offset >= 3} style={[st.nav, offset >= 3 && st.navOff]} accessibilityRole="button" accessibilityLabel="Mois suivant"><Text style={st.navTxt}>›</Text></Pressable>
      </View>
      <LinearGradient colors={[col.light, col.dark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.band}>
        <Text style={st.bandK}>{col.kanji}</Text><Text style={st.bandTxt}>{col.name}, la couleur de {month}</Text>
      </LinearGradient>
      <View style={st.sum}>
        <View style={st.box}><Text style={st.boxL}>Revenus</Text><Text style={[st.boxV, { color: colors.teal }]}>+{formatEurosRound(cm.income)}</Text></View>
        <View style={st.box}><Text style={st.boxL}>Charges fixes</Text><Text style={st.boxV}>{formatEurosRound(cm.fixed)}</Text></View>
        <View style={st.box}>
          <Text style={st.boxL}>{cm.status === 'prévu' ? 'Budget libre' : 'Dépenses'}</Text>
          <Text style={st.boxV} accessibilityLabel={cm.status === 'prévu' ? `Budget libre ${formatEurosRound(cm.free)}` : `Dépenses ${formatEurosRound(cm.variable)}`}>{formatEurosRound(cm.status === 'prévu' ? cm.free : cm.variable)}</Text>
        </View>
      </View>
      <View style={st.grid}>
        {DOW.map((d, i) => <Text key={i} style={st.dow}>{d}</Text>)}
        {Array.from({ length: cm.firstDow }, (_, i) => <View key={'e' + i} style={st.cell} />)}
        {cm.days.map(d => {
          const isToday = offset === 0 && d.d === today.getDate(), on = sel === d.d;
          const heat = d.future ? 0 : d.spent / max;
          return (
            <Pressable key={d.d} onPress={() => setSel(s => ({ ...s, [key]: d.d }))} style={st.cell} accessibilityRole="button" accessibilityState={{ selected: on }}
              accessibilityLabel={`${d.d} ${month}${d.charges.length ? `, ${d.charges.length} charge${d.charges.length > 1 ? 's' : ''} fixe${d.charges.length > 1 ? 's' : ''}` : ''}${d.spent ? `, ${formatEuros(d.spent)} dépensés` : ''}`}>
              <View style={[st.dayBox, { backgroundColor: on ? colors.ink : heat ? tint(col.light, 0.12 + heat * 0.45) : 'rgba(20,20,18,0.03)' }, isToday && !on && { borderWidth: 2, borderColor: col.light }]}>
                <Text style={[st.dayN, d.future && { color: colors.ink2 }, on && { color: '#fff' }]}>{d.d}</Text>
                <View style={st.marks}>
                  {d.charges.slice(0, 3).map(c => <View key={c.id} style={[st.mark, { backgroundColor: on ? '#fff' : colors.vermilion, opacity: d.future ? 0.55 : 1 }]} />)}
                  {d.income > 0 && <View style={[st.mark, { backgroundColor: on ? '#fff' : colors.teal }]} />}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={st.legend}>
        <View style={st.lg}><View style={[st.mark, { backgroundColor: colors.vermilion }]} /><Text style={st.lgTxt}>charge fixe</Text></View>
        <View style={st.lg}><View style={[st.mark, { backgroundColor: colors.teal }]} /><Text style={st.lgTxt}>paie</Text></View>
        <View style={st.lg}><View style={[st.sq, { backgroundColor: tint(col.light, 0.4) }]} /><Text style={st.lgTxt}>dépenses</Text></View>
      </View>
      <View style={st.secHead}><Text style={st.sec}>{sel} {month}{day.future ? ', prévu' : ''}</Text><Text style={st.secR}>{day.spent ? '−' + formatEuros(day.spent) : ''}</Text></View>
      <View style={st.list}>
        {day.income > 0 && <Row name="Paie" sub="revenu" amount={'+' + formatEuros(day.income)} pos />}
        {day.charges.map(c => <Row key={c.id} name={c.name} sub={day.future ? 'charge fixe, prévue' : 'charge fixe'} amount={'−' + formatEuros(c.amount)} />)}
        {day.expenses.map(e => <Row key={e.id} name={e.label} sub={CATEGORIES.find(c => c.id === e.categoryId)?.name ?? ''} amount={'−' + formatEuros(e.amount)} />)}
        {!day.income && !day.charges.length && !day.expenses.length && <Text style={st.empty}>{day.future ? 'Rien de prévu ce jour-là.' : 'Aucune dépense ce jour-là.'}</Text>}
      </View>
    </View>
  );
}

function Row({ name, sub, amount, pos }: { name: string; sub: string; amount: string; pos?: boolean }) {
  return (
    <View style={st.row}>
      <View style={{ flex: 1 }}><Text style={st.rowName}>{name}</Text>{!!sub && <Text style={st.rowSub}>{sub}</Text>}</View>
      <Text style={[st.rowAmt, pos && { color: colors.teal }]}>{amount}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 16, marginTop: 12 },
  nav: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  navOff: { opacity: 0.35 },
  navTxt: { fontSize: 24, lineHeight: 26, color: colors.ink },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontFamily: font.semibold, fontSize: 20, letterSpacing: -0.5, color: colors.ink },
  status: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 99, backgroundColor: 'rgba(188,68,35,0.12)' },
  statusFut: { backgroundColor: 'rgba(70,122,107,0.14)' },
  statusTxt: { fontFamily: font.semibold, fontSize: 12, color: colors.ink },
  band: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10 },
  bandK: { color: '#fff', fontSize: 20 },
  bandTxt: { color: '#fff', fontFamily: font.semibold, fontSize: 14 },
  sum: { flexDirection: 'row', gap: 8, marginHorizontal: 16, marginTop: 10 },
  box: { flex: 1, backgroundColor: colors.surface, borderRadius: 16, padding: 10 },
  boxL: { fontFamily: font.regular, fontSize: 12, color: colors.ink2 },
  boxV: { fontFamily: font.semibold, fontSize: 16, color: colors.ink, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: 12, marginTop: 12, backgroundColor: colors.surface, borderRadius: 24, padding: 6 },
  dow: { width: '14.2857%', textAlign: 'center', fontFamily: font.medium, fontSize: 12, color: colors.ink2, paddingVertical: 6 },
  cell: { width: '14.2857%', aspectRatio: 0.92, padding: 2 },
  dayBox: { flex: 1, borderRadius: 12, alignItems: 'center', paddingTop: 5 },
  dayN: { fontFamily: font.semibold, fontSize: 13, color: colors.ink },
  marks: { flexDirection: 'row', gap: 2, marginTop: 4 },
  mark: { width: 6, height: 6, borderRadius: 3 },
  sq: { width: 10, height: 10, borderRadius: 3 },
  legend: { flexDirection: 'row', gap: 14, marginHorizontal: 20, marginTop: 10 },
  lg: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lgTxt: { fontFamily: font.regular, fontSize: 12, color: colors.ink2 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 20, marginBottom: 8 },
  sec: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  secR: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 16 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowName: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  rowSub: { fontFamily: font.regular, fontSize: 12.5, color: colors.ink2, marginTop: 1 },
  rowAmt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  empty: { fontFamily: font.regular, fontSize: 14, color: colors.ink2, paddingVertical: 14 },
});
