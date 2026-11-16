import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TO_COMPLETE } from '../legal/config';
import type { LegalDoc } from '../legal/documents';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, tint, type as t } from '../theme/tokens';
import { IconButton, Notice, ScreenHeader } from '../ui/kit';

/** Un texte où les informations manquantes « [À compléter : …] » sont surlignées, pour qu'on ne les oublie pas */
function Rich({ text, style }: { text: string; style: object }) {
  const c = useColors();
  const parts = text.split(/(\[À compléter\s:\s[^\]]+\])/g);
  return (
    <Text style={style}>
      {parts.map((p, i) => TO_COMPLETE.test(p)
        ? <Text key={i} style={{ color: c.ink, fontFamily: font.semibold, backgroundColor: tint(c.vermilion, c.dark ? 0.32 : 0.14), textDecorationLine: 'underline' }}>{p}</Text>
        : p)}
    </Text>
  );
}

/** Document légal (mentions, confidentialité, conditions, remboursement, cookies, licences) */
export function LegalScreen({ doc, onClose, extra }: { doc: LegalDoc; onClose: () => void; extra?: React.ReactNode }) {
  const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const incomplete = [doc.intro, ...doc.sections.flatMap(s => [...(s.p ?? []), ...(s.list ?? [])])].some(x => TO_COMPLETE.test(x));
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 48 }}>
      <ScreenHeader title={doc.title} right={<IconButton icon="x" label="Fermer" onPress={onClose} small />} />
      <View style={st.body}>
        <Text style={st.intro}>{doc.intro}</Text>
        {incomplete && <Notice icon="edit-3" tone="warn">Document en préparation : les passages surlignés doivent être complétés par l’éditeur.</Notice>}
        {doc.sections.map(s => (
          <View key={s.h} style={st.section}>
            <Text style={st.h} accessibilityRole="header" {...({ 'aria-level': 2 } as object)}>{s.h}</Text>
            {s.p?.map((p, i) => <Rich key={i} text={p} style={st.p} />)}
            {s.list && (
              <View style={st.list}>
                {s.list.map((l, i) => (
                  <View key={i} style={st.li}>
                    <Text style={st.bullet} aria-hidden>•</Text>
                    <Rich text={l} style={[st.p, { flex: 1 }]} />
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
        {extra}
        <Text style={st.foot}>{Platform.OS === 'web' ? 'Ce texte est une base qui doit être relue par un professionnel du droit.' : 'Texte de référence ; il doit être relu par un professionnel du droit.'}</Text>
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  body: { paddingHorizontal: space.gutter + space.xs, gap: space.lg, marginTop: space.md },
  intro: { ...t.body, color: c.ink2 },
  section: { gap: space.sm, backgroundColor: c.surface, borderRadius: radius.lg, padding: space.lg },
  h: { ...t.headline, color: c.ink },
  p: { ...t.body, color: c.ink },
  list: { gap: space.xs },
  li: { flexDirection: 'row', gap: space.sm },
  bullet: { ...t.body, color: c.ink2 },
  foot: { ...t.caption, color: c.ink2, textAlign: 'center' },
});
