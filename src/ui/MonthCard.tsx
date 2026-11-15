import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { MonthState } from '../domain/budget';
import { formatEurosRound } from '../domain/money';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import { font } from '../theme/tokens';

/** La carte du mois : sa couleur de saison, ce qui reste, le montant par jour, la projection, les 4 piliers */
export function MonthCard({ s, hideAmounts = false }: { s: MonthState; hideAmounts?: boolean }) {
  const c = MONTH_COLORS[s.month];
  const money = (v: number) => (hideAmounts ? '•••' : formatEurosRound(v));
  const short = s.endOfMonth < 0;
  return (
    <LinearGradient colors={[c.light, c.dark]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={st.card}>
      <View style={st.row}>
        <Text style={st.month}>{capitalize(MONTH_NAMES[s.month])}</Text>
        <View style={st.tag}><Text style={st.tagText}>{c.kanji} {c.name}, la couleur du mois</Text></View>
      </View>
      <Text style={st.big} accessibilityLabel={`Il reste ${money(s.left)} à dépenser`}>{money(s.left)}</Text>
      <Text style={st.sub}>à dépenser, ≈ {money(s.perDay)} par jour d’ici le {s.length}</Text>
      <View style={st.eom}>
        <Text style={st.eomText}>
          {short ? 'À ce rythme, il manquera ≈ ' : 'À ce rythme, il restera ≈ '}
          <Text style={st.eomStrong}>{money(Math.abs(s.endOfMonth))}</Text> le {s.length}
        </Text>
      </View>
      <View style={st.minis}>
        {s.pillars.map(p => (
          <View key={p.id} style={st.mini}>
            <View style={st.row}><Text style={st.miniName}>{p.name}</Text><Text style={st.miniVal}>{money(p.left)}</Text></View>
            <View style={st.bar}><View style={[st.fill, { width: `${Math.max(0, Math.min(100, (p.left / Math.max(1, p.budget)) * 100))}%` }]} /></View>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 30, padding: 20, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  month: { color: '#fff', fontFamily: font.semibold, fontSize: 15 },
  tag: { backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  tagText: { color: '#fff', fontFamily: font.semibold, fontSize: 11.5 },
  big: { color: '#fff', fontFamily: font.semibold, fontSize: 60, letterSpacing: -2.8, marginTop: 10 },
  sub: { color: '#fff', fontFamily: font.medium, fontSize: 14, marginTop: 2 },
  eom: { alignSelf: 'flex-start', marginTop: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6 },
  eomText: { color: '#fff', fontFamily: font.medium, fontSize: 13 },
  eomStrong: { fontFamily: font.bold },
  minis: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, rowGap: 14, columnGap: 18 },
  mini: { width: '46%' },
  miniName: { color: '#fff', fontFamily: font.medium, fontSize: 13 },
  miniVal: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  bar: { height: 4, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.28)', marginTop: 6, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 4, backgroundColor: '#fff' },
});
