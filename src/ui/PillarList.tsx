import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { PillarState } from '../domain/budget';
import type { PillarId } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { radius, space, tabular, tint, type as t } from '../theme/tokens';
import { useReducedMotion } from './a11y';
import { Badge, Card, ProgressBar, SectionHeader, type IconName } from './kit';
import { useMoney } from './money';

export const PILLAR_ICON: Record<PillarId, IconName> = { besoins: 'home', envies: 'heart', culture: 'book-open', imprevus: 'umbrella' };

/** Bref éclat de la couleur du pilier quand une dépense vient d'y être ajoutée */
function Flash({ color, run }: { color: string; run: unknown }) {
  const reduced = useReducedMotion();
  const [a] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run || reduced) return;
    a.setValue(1);
    Animated.timing(a, { toValue: 0, duration: 1200, useNativeDriver: true }).start();
  }, [run, a, reduced]);
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius.md, backgroundColor: tint(color, 0.14), opacity: a }]} />;
}

/** Les quatre piliers kakeibo : ce qui reste, ce qui a été dépensé, et la part du budget consommée */
export function PillarList({ pillars, highlight }: { pillars: PillarState[]; highlight?: PillarId }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m = useMoney();
  return (
    <View>
      <SectionHeader title="Les quatre piliers" right="reste" />
      <Card>
        {pillars.map((p, i) => {
          const color = c.pillar[p.id];
          const over = p.left < 0;
          return (
            <View key={p.id} style={[st.row, i > 0 && st.sep]} accessible accessibilityLabel={`${p.name} : il reste ${m.spoken(p.left)} sur ${m.spoken(p.budget)}`}>
              <Flash color={color} run={highlight === p.id ? p.spent : 0} />
              <Badge color={color} icon={PILLAR_ICON[p.id]} />
              <View style={st.body}>
                <View style={st.line}>
                  <Text style={st.name}>{p.name}</Text>
                  <Text style={[st.left, over && { color: c.vermilion }]}>{m.round(p.left)}</Text>
                </View>
                <ProgressBar value={p.budget > 0 ? p.spent / p.budget : p.spent > 0 ? 1 : 0} color={over ? c.vermilion : color} height={4} />
                <Text style={st.detail}>{m.round(p.spent)} dépensés sur {m.round(p.budget)} · {p.hint}</Text>
              </View>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md + 2, gap: space.md },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  body: { flex: 1, gap: 6 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  name: { ...t.bodyStrong, color: c.ink },
  left: { ...t.headline, ...tabular, color: c.ink },
  detail: { ...t.caption, color: c.ink2 },
});
