import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activity } from '../domain/activity';
import { PILLARS } from '../domain/budget';
import { formatEuros } from '../domain/money';
import { detectRecurring, type Suggestion } from '../domain/recurring';
import type { Expense, PillarId, Profile } from '../domain/types';
import { font, tint, onColor } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';

interface Props {
  profile: Profile; expenses: Expense[]; dismissed: string[]; today: Date;
  onAdd: () => void; onDelete: (id: string) => void; onIgnore: (key: string) => void; onAccept: (s: Suggestion) => void;
}

export function ActivityScreen({ profile, expenses, dismissed, today, onAdd, onDelete, onIgnore, onAccept }: Props) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PillarId | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const days = useMemo(() => activity(profile, expenses, today, filter), [profile, expenses, today, filter]);
  const sugg = useMemo(() => detectRecurring(expenses, profile.charges, today, dismissed)[0], [expenses, profile.charges, today, dismissed]);

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }}>
      <View style={st.top}>
        <Text style={st.title}>Activité</Text>
        <Pressable onPress={onAdd} style={st.add} accessibilityRole="button" accessibilityLabel="Ajouter une dépense"><Text style={st.plus}>+</Text></Pressable>
      </View>

      {sugg && (
        <View style={st.sugg} accessibilityRole="summary">
          <Text style={st.suggHead}>Dépense régulière repérée</Text>
          <Text style={st.suggName}>{sugg.label}</Text>
          <Text style={st.suggTxt}>{formatEuros(sugg.amount)} vers le {sugg.day}, {sugg.months} mois de suite. L’ajouter à vos charges fixes ? Elle sera prévue chaque mois dans le calendrier.</Text>
          <View style={st.suggBtns}>
            <Pressable onPress={() => onIgnore(sugg.key)} style={[st.sb, st.sbLight]} accessibilityRole="button" accessibilityLabel={`Ignorer ${sugg.label}`}><Text style={st.sbTxt}>Ignorer</Text></Pressable>
            <Pressable onPress={() => onAccept(sugg)} style={[st.sb, st.sbDark]} accessibilityRole="button" accessibilityLabel={`Ajouter ${sugg.label} aux charges fixes`}><Text style={[st.sbTxt, { color: '#fff' }]}>Ajouter aux charges fixes</Text></Pressable>
          </View>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
        {([[null, 'Tout'], ...PILLARS.map(p => [p.id, p.name])] as [PillarId | null, string][]).map(([id, name]) => (
          <Pressable key={name} onPress={() => setFilter(id)} style={[st.f, filter === id && { backgroundColor: id ? colors.pillar[id] : colors.btn }]} accessibilityRole="button" accessibilityState={{ selected: filter === id }}>
            <Text style={[st.fTxt, filter === id && { color: id ? onColor(colors.pillar[id]) : colors.onBtn }]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {days.map(d => (
        <View key={d.date}>
          <View style={st.dayHead}><Text style={st.dayTitle}>{d.title}</Text><Text style={st.dayTotal}>−{formatEuros(d.total)}</Text></View>
          <View style={st.list}>
            {d.items.map((i, n) => (
              <View key={i.key} style={n > 0 && st.sep}>
                <Pressable style={st.row} onPress={() => { if (i.kind === 'depense') { setOpen(open === i.key ? null : i.key); setConfirm(null); } }}
                  accessibilityRole={i.kind === 'depense' ? 'button' : undefined} accessibilityLabel={`${i.label}, ${i.sub}, ${formatEuros(i.amount)}`}>
                  <View style={[st.chip, { backgroundColor: tint(colors.pillar[i.pillar], 0.12) }]}><Text style={[st.chipTxt, { color: colors.pillar[i.pillar] }]}>{i.label.charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.name} numberOfLines={1}>{i.label}</Text>
                    <Text style={st.sub}>{i.sub}</Text>
                  </View>
                  <Text style={st.amt}>−{formatEuros(i.amount)}</Text>
                </Pressable>
                {open === i.key && (
                  confirm === i.key ? (
                    <View style={st.actions}>
                      <Text style={st.ask}>Supprimer cette dépense ?</Text>
                      <Pressable onPress={() => setConfirm(null)} style={[st.sb, st.sbLight]} accessibilityRole="button"><Text style={st.sbTxt}>Annuler</Text></Pressable>
                      <Pressable onPress={() => { onDelete(i.id); setOpen(null); setConfirm(null); }} style={[st.sb, { backgroundColor: colors.vermilion }]} accessibilityRole="button" accessibilityLabel={`Confirmer la suppression de ${i.label}`}><Text style={[st.sbTxt, { color: '#fff' }]}>Supprimer</Text></Pressable>
                    </View>
                  ) : (
                    <View style={st.actions}>
                      <Pressable onPress={() => setConfirm(i.key)} style={[st.sb, st.sbLight]} accessibilityRole="button" accessibilityLabel={`Supprimer ${i.label}`}><Text style={[st.sbTxt, { color: colors.vermilion }]}>Supprimer</Text></Pressable>
                    </View>
                  )
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
      {!days.length && <Text style={st.empty}>{filter ? 'Rien dans ce pilier depuis le mois dernier.' : 'Aucune dépense pour l’instant. Ajoutez-en une avec « + ».'}</Text>}
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.onBtn, fontSize: 24, lineHeight: 26, fontFamily: font.medium },
  sugg: { margin: 16, marginBottom: 4, borderRadius: 22, padding: 16, backgroundColor: 'rgba(188,68,35,0.07)', borderWidth: 1.5, borderColor: 'rgba(188,68,35,0.25)' },
  suggHead: { fontFamily: font.semibold, fontSize: 12.5, color: colors.vermilion, textTransform: 'uppercase', letterSpacing: 0.6 },
  suggName: { fontFamily: font.semibold, fontSize: 18, color: colors.ink, marginTop: 6 },
  suggTxt: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, marginTop: 4 },
  suggBtns: { flexDirection: 'row', gap: 8, marginTop: 12 },
  sb: { paddingHorizontal: 14, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sbLight: { backgroundColor: colors.surface },
  sbDark: { backgroundColor: colors.vermilion, flex: 1 },
  sbTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  filters: { gap: 6, paddingHorizontal: 16, paddingVertical: 12 },
  f: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.fill },
  fTxt: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  dayHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 14, marginBottom: 6 },
  dayTitle: { fontFamily: font.semibold, fontSize: 13, color: colors.ink2 },
  dayTotal: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hair },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  chip: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  chipTxt: { fontFamily: font.bold, fontSize: 15 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 12.5, color: colors.ink2, marginTop: 1 },
  amt: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingBottom: 12 },
  ask: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  empty: { fontFamily: font.regular, fontSize: 15, color: colors.ink2, textAlign: 'center', marginTop: 40, paddingHorizontal: 32 },
});
