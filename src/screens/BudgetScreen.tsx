import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMonth } from '../domain/budget';
import type { Expense, Profile } from '../domain/types';
import { colors, font } from '../theme/tokens';
import { MonthCard } from '../ui/MonthCard';
import { PillarList } from '../ui/PillarList';

export function BudgetScreen({ profile, expenses, today, onAdd, onEdit }: { profile: Profile; expenses: Expense[]; today: Date; onAdd?: () => void; onEdit?: () => void }) {
  const s = buildMonth(profile, expenses, today);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }}>
      <View style={st.top}>
        <Text style={st.title}>Budget</Text>
        <Pressable onPress={onAdd} style={st.add} accessibilityRole="button" accessibilityLabel="Ajouter une dépense">
          <Text style={st.plus}>+</Text>
        </Pressable>
      </View>
      <MonthCard s={s} />
      <PillarList pillars={s.pillars} />
      <View style={st.save}>
        <View style={st.seal}><Text style={st.sealText}>{Math.round(profile.savePct * 100)} %</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={st.saveTitle}>Épargne prévue ce mois-ci</Text>
          <Text style={st.saveSub}>Déjà retirée de votre budget, comme le veut le kakeibo</Text>
        </View>
      </View>
      {onEdit && (
        <Pressable onPress={onEdit} style={st.edit} accessibilityRole="button">
          <Text style={st.editTxt}>Modifier mes réponses</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  plus: { color: '#fff', fontSize: 24, lineHeight: 26, fontFamily: font.medium },
  save: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 10, backgroundColor: colors.surface, borderRadius: 22, padding: 16 },
  seal: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sealText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  saveTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  edit: { alignSelf: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 16 },
  editTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2, textDecorationLine: 'underline' },
  saveSub: { fontFamily: font.regular, fontSize: 13, color: colors.ink2, marginTop: 2 },
});
