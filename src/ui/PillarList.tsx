import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { PillarState } from '../domain/budget';
import { formatEurosRound } from '../domain/money';
import type { PillarId } from '../domain/types';
import { font, tint } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';

const GLYPH: Record<string, string> = { besoins: '⌂', envies: '♡', culture: '❖', imprevus: '☂' };

/** Bref éclat de la couleur du pilier quand une dépense vient d'y être ajoutée */
function Flash({ color, run }: { color: string; run: unknown }) {
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run) return;
    a.setValue(1);
    Animated.timing(a, { toValue: 0, duration: 1400, useNativeDriver: false }).start();
  }, [run, a]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 14, backgroundColor: tint(color, 0.16), opacity: a }]} />;
}

export function PillarList({ pillars, hideAmounts = false, highlight }: { pillars: PillarState[]; hideAmounts?: boolean; highlight?: PillarId }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const money = (v: number) => (hideAmounts ? '•••' : formatEurosRound(v));
  return (
    <View>
      <View style={st.head}><Text style={st.h3}>Les quatre piliers</Text><Text style={st.mono}>reste</Text></View>
      <View style={st.list}>
        {pillars.map((p, i) => (
          <View key={p.id} style={[st.row, i > 0 && st.sep]} accessible accessibilityLabel={`${p.name} : il reste ${money(p.left)} sur ${money(p.budget)}`}>
            <Flash color={colors.pillar[p.id]} run={highlight === p.id ? p.spent : 0} />
            <View style={[st.chip, { backgroundColor: tint(colors.pillar[p.id], 0.12) }]}>
              <Text style={[st.glyph, { color: colors.pillar[p.id] }]}>{GLYPH[p.id]}</Text>
            </View>
            <View style={st.text}>
              <Text style={st.name}>{p.name}</Text>
              <Text style={st.detail}>{money(p.spent)} dépensés sur {money(p.budget)}</Text>
            </View>
            <Text style={[st.left, p.left < 0 && { color: colors.vermilion }]}>{money(p.left)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 24, paddingTop: 26, paddingBottom: 8 },
  h3: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  mono: { fontFamily: font.regular, fontSize: 12, color: colors.ink2 },
  list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 24, paddingHorizontal: 18 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, gap: 12 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hair },
  chip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  glyph: { fontSize: 17 },
  text: { flex: 1 },
  name: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  detail: { fontFamily: font.regular, fontSize: 13, color: colors.ink2, marginTop: 2 },
  left: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, letterSpacing: -0.4 },
});
