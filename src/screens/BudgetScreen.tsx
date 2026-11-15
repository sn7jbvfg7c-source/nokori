import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMonth, CATEGORIES, PILLARS } from '../domain/budget';
import { formatEuros } from '../domain/money';
import type { Expense, PillarId, Profile } from '../domain/types';
import { font } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useStyles } from '../theme/theme';
import { CalendarView } from '../ui/CalendarView';
import { MonthCard } from '../ui/MonthCard';
import { PillarList } from '../ui/PillarList';

interface Props {
  profile: Profile; expenses: Expense[]; today: Date;
  onAdd?: () => void; onEdit?: () => void; onSettings?: () => void; hideAmounts?: boolean;
  lastAdded?: Expense | null; onUndo?: (id: string) => void; onDismiss?: () => void;
}

export function BudgetScreen({ profile, expenses, today, onAdd, onEdit, onSettings, hideAmounts = false, lastAdded, onUndo, onDismiss }: Props) {
  const st = useStyles(makeStyles);
  const s = buildMonth(profile, expenses, today);
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'mois' | 'cal'>('mois');
  const cat = lastAdded ? CATEGORIES.find(c => c.id === lastAdded.categoryId) : undefined;
  const pillar: PillarId | undefined = cat?.pillar;

  // la confirmation disparaît d'elle-même après 5 secondes
  useEffect(() => {
    if (!lastAdded || !onDismiss) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [lastAdded, onDismiss]);

  return (
    <View style={st.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 110 }}>
        <View style={st.top}>
          <Text style={st.title}>Budget</Text>
          <View style={st.actions}>
            {onSettings && (
              <Pressable onPress={onSettings} style={st.gear} accessibilityRole="button" accessibilityLabel="Réglages">
                <Feather name="settings" size={19} color={st.gearIcon.color} />
              </Pressable>
            )}
            <Pressable onPress={onAdd} style={st.add} accessibilityRole="button" accessibilityLabel="Ajouter une dépense">
              <Text style={st.plus}>+</Text>
            </Pressable>
          </View>
        </View>
        <View style={st.seg} accessibilityRole="tablist">
          {([['mois', 'Mois'], ['cal', 'Calendrier']] as const).map(([k, l]) => (
            <Pressable key={k} onPress={() => setView(k)} style={[st.segBtn, view === k && st.segOn]} accessibilityRole="tab" accessibilityState={{ selected: view === k }}>
              <Text style={[st.segTxt, view === k && st.segTxtOn]}>{l}</Text>
            </Pressable>
          ))}
        </View>
        {view === 'mois' ? (
          <>
            <MonthCard s={s} hideAmounts={hideAmounts} />
            <PillarList pillars={s.pillars} highlight={pillar} hideAmounts={hideAmounts} />
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
          </>
        ) : (
          <CalendarView profile={profile} expenses={expenses} today={today} />
        )}
      </ScrollView>
      {lastAdded && cat && (
        <View style={[st.toast, { bottom: insets.bottom + 16 }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
          <Text style={st.toastTxt} numberOfLines={2}>
            {lastAdded.label}, {formatEuros(lastAdded.amount)} ajouté en {PILLARS.find(p => p.id === cat.pillar)!.name}
          </Text>
          {onUndo && <Pressable onPress={() => onUndo(lastAdded.id)} accessibilityRole="button" accessibilityLabel="Annuler l’ajout"><Text style={st.undo}>Annuler</Text></Pressable>}
        </View>
      )}
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  actions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  gear: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  gearIcon: { color: colors.ink },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.onBtn, fontSize: 24, lineHeight: 26, fontFamily: font.medium },
  seg: { flexDirection: 'row', marginHorizontal: 16, marginTop: 12, backgroundColor: colors.fill, borderRadius: 14, padding: 3 },
  segBtn: { flex: 1, paddingVertical: 9, borderRadius: 11, alignItems: 'center' },
  segOn: { backgroundColor: colors.surface },
  segTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2 },
  segTxtOn: { color: colors.ink },
  save: { flexDirection: 'row', alignItems: 'center', gap: 14, marginHorizontal: 16, marginTop: 10, backgroundColor: colors.surface, borderRadius: 22, padding: 16 },
  seal: { width: 42, height: 42, borderRadius: 10, backgroundColor: colors.vermilion, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sealText: { color: '#fff', fontFamily: font.bold, fontSize: 13 },
  saveTitle: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  edit: { alignSelf: 'center', marginTop: 20, paddingVertical: 10, paddingHorizontal: 16 },
  editTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink2, textDecorationLine: 'underline' },
  saveSub: { fontFamily: font.regular, fontSize: 13, color: colors.ink2, marginTop: 2 },
  toast: { position: 'absolute', left: 16, right: 16, backgroundColor: colors.btn, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  toastTxt: { flex: 1, color: colors.onBtn, fontFamily: font.medium, fontSize: 14 },
  undo: { color: colors.dark ? colors.vermilion : '#F2B48A', fontFamily: font.semibold, fontSize: 14 },
});
