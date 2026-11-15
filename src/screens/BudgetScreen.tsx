import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buildMonth, CATEGORIES, PILLARS } from '../domain/budget';
import type { ProfileEra } from '../domain/history';
import type { Expense, PillarId, Profile } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { light, radius, space, tabular, type as t } from '../theme/tokens';
import { CalendarView } from '../ui/CalendarView';
import { Card, IconButton, ScreenHeader, Segmented, Toast } from '../ui/kit';
import { MonthCard } from '../ui/MonthCard';
import { useMoney } from '../ui/money';
import { PillarList } from '../ui/PillarList';

interface Props {
  profile: Profile; history?: ProfileEra[]; expenses: Expense[]; today: Date;
  onAdd?: () => void; onEdit?: () => void; onSettings?: () => void; onPillar?: (p: PillarId) => void;
  lastAdded?: Expense | null; onUndo?: (id: string) => void; onDismiss?: () => void;
}

export function BudgetScreen({ profile, history = [], expenses, today, onAdd, onEdit, onSettings, onPillar, lastAdded, onUndo, onDismiss }: Props) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m = useMoney();
  const s = useMemo(() => buildMonth(profile, expenses, today), [profile, expenses, today]);
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'mois' | 'cal'>('mois');
  const cat = lastAdded ? CATEGORIES.find(x => x.id === lastAdded.categoryId) : undefined;
  const pillar: PillarId | undefined = cat?.pillar;

  return (
    <View style={st.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 120 }}>
        <ScreenHeader title="Budget" right={<>
          {onSettings && <IconButton icon="settings" label="Réglages" onPress={onSettings} />}
          {onAdd && <IconButton icon="plus" label="Ajouter une dépense" onPress={onAdd} variant="filled" />}
        </>} />
        <View style={st.seg}>
          <Segmented options={[{ key: 'mois', label: 'Mois' }, { key: 'cal', label: 'Calendrier' }]} value={view} onChange={setView} />
        </View>
        {view === 'mois' ? (
          <>
            <MonthCard s={s} />
            <PillarList pillars={s.pillars} highlight={pillar} onOpen={onPillar} />
            <Card style={st.save}>
              <View style={st.seal}><Text style={st.sealText}>{Math.round(profile.savePct * 100)} %</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={st.saveTitle}>Épargne prévue ce mois-ci</Text>
                <Text style={st.saveSub}>{m.round(s.saving)} sont retirés du budget dès la paie. Le virement se fait dans votre banque.</Text>
              </View>
            </Card>
            {onEdit && (
              <Pressable onPress={onEdit} style={st.edit} accessibilityRole="button" accessibilityLabel="Modifier mes réponses">
                <Feather name="sliders" size={15} color={c.ink2} />
                <Text style={st.editTxt}>Modifier mes réponses</Text>
              </Pressable>
            )}
          </>
        ) : (
          <CalendarView profile={profile} history={history} expenses={expenses} today={today} />
        )}
      </ScrollView>
      {lastAdded && cat && onDismiss && (
        <Toast bottom={insets.bottom + space.lg} onHide={onDismiss}
          message={`${lastAdded.label}, ${m.eur(lastAdded.amount)} ajouté en ${PILLARS.find(p => p.id === cat.pillar)!.name}`}
          actionLabel={onUndo ? 'Annuler' : undefined} actionA11y="Annuler l’ajout" onAction={onUndo ? () => onUndo(lastAdded.id) : undefined} />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  seg: { marginHorizontal: space.gutter, marginTop: space.md },
  save: { flexDirection: 'row', alignItems: 'center', gap: space.md + 2, marginTop: space.md, paddingVertical: space.lg },
  seal: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: light.vermilion, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  sealText: { ...t.caption, ...tabular, fontFamily: t.headline.fontFamily, fontSize: 13, color: '#FFFFFF' },
  saveTitle: { ...t.bodyStrong, color: c.ink },
  saveSub: { ...t.footnote, color: c.ink2, marginTop: 2 },
  edit: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', marginTop: space.xl, paddingVertical: space.sm + 2, paddingHorizontal: space.lg, minHeight: 44 },
  editTxt: { ...t.callout, color: c.ink2 },
});
