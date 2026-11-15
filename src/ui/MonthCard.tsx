import { StyleSheet, Text, View } from 'react-native';
import type { MonthState } from '../domain/budget';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import { font, radius, space, tabular, type as t } from '../theme/tokens';
import { BIG_TEXT_MAX_SCALE } from './a11y';
import { useMoney } from './money';

const W = '#FFFFFF';

/**
 * La carte du mois, en aplat de la couleur de saison.
 * Le grand chiffre est l'argent VRAIMENT disponible : prélèvements à venir déjà retirés.
 * Dessous : où en est le mois (dépensé, à venir, disponible) et la projection au dernier jour.
 */
export function MonthCard({ s }: { s: MonthState }) {
  const m = useMoney();
  const c = MONTH_COLORS[s.month];
  const spent = s.spent, upcoming = s.upcoming, free = Math.max(0, s.free);
  const total = Math.max(1, spent + upcoming + free);
  const short = s.endOfMonth < 0;
  const days = s.daysLeft > 1 ? `pendant ${s.daysLeft} jours` : 'aujourd’hui';
  return (
    <View style={[st.card, { backgroundColor: c.light }]}>
      <View style={st.row}>
        <Text style={st.month}>{capitalize(MONTH_NAMES[s.month])}</Text>
        <View style={st.tag}><Text style={st.tagText}>{c.kanji} {c.name}, la couleur du mois</Text></View>
      </View>

      <Text style={st.label}>{s.over ? 'Budget dépassé de' : 'Disponible'}</Text>
      <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={st.big} numberOfLines={1} adjustsFontSizeToFit
        accessibilityLabel={s.over ? `Budget dépassé de ${m.spoken(-s.free)}` : `Il reste ${m.spoken(s.free)} disponibles, prélèvements à venir déduits`}>
        {m.round(s.over ? -s.free : s.free)}
      </Text>
      <Text style={st.sub}>
        {s.over ? 'Les dépenses dépassent le budget du mois.' : `≈ ${m.round(s.perDay)} par jour ${days}`}
      </Text>

      <View style={st.bar} accessible accessibilityRole="image" accessibilityLabel={`Dépensé ${m.spoken(spent)}, à venir ${m.spoken(upcoming)}, disponible ${m.spoken(free)}`}>
        <View style={{ flex: spent / total, backgroundColor: 'rgba(255,255,255,0.55)' }} />
        {upcoming > 0 && <View style={{ flex: upcoming / total, backgroundColor: 'rgba(255,255,255,0.3)' }} />}
        {free > 0 && <View style={{ flex: free / total, backgroundColor: W }} />}
      </View>
      <View style={st.legend} aria-hidden>
        <Legend dot="rgba(255,255,255,0.55)" label="Dépensé" value={m.round(spent)} />
        <Legend dot="rgba(255,255,255,0.3)" label="À venir" value={m.round(upcoming)} />
        <Legend dot={W} label="Disponible" value={m.round(free)} />
      </View>

      <View style={st.eom}>
        <Text style={st.eomText}>
          {short ? 'À ce rythme, il manquera ≈ ' : 'À ce rythme, il restera ≈ '}
          <Text style={st.eomStrong}>{m.round(Math.abs(s.endOfMonth))}</Text> le {s.length}{s.earlyProjection ? ' (estimation)' : ''}
        </Text>
      </View>
    </View>
  );
}

function Legend({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <View style={st.lg}>
      <View style={[st.dot, { backgroundColor: dot }]} />
      <View>
        <Text style={st.lgLabel}>{label}</Text>
        <Text style={st.lgVal}>{value}</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginHorizontal: space.gutter, marginTop: space.md, borderRadius: radius.xl, padding: space.xl - 2, overflow: 'hidden' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  month: { ...t.headline, color: W },
  tag: { backgroundColor: 'rgba(0,0,0,0.16)', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, flexShrink: 1 },
  tagText: { ...t.caption, fontFamily: font.semibold, color: W },
  label: { ...t.overline, color: W, marginTop: space.xl },
  big: { ...t.display, ...tabular, color: W, marginTop: space.xs },
  sub: { ...t.callout, color: W },
  bar: { flexDirection: 'row', height: 8, borderRadius: 8, overflow: 'hidden', marginTop: space.xl, gap: 2, backgroundColor: 'rgba(255,255,255,0.12)' },
  legend: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.md },
  lg: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  lgLabel: { ...t.caption, color: W },
  lgVal: { ...t.footnote, ...tabular, fontFamily: font.semibold, color: W },
  eom: { alignSelf: 'flex-start', marginTop: space.lg, backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  eomText: { ...t.footnote, fontFamily: font.medium, color: W },
  eomStrong: { fontFamily: font.bold },
});
