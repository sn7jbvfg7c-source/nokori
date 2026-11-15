import Feather from '@expo/vector-icons/Feather';
import { useDeferredValue, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activityFor, firstMonth } from '../domain/activity';
import { PILLARS } from '../domain/budget';
import { capitalize, MONTH_NAMES } from '../domain/months';
import { detectRecurring, type Suggestion } from '../domain/recurring';
import type { Expense, PillarId, Profile } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { radius, space, tabular, tint, type as t } from '../theme/tokens';
import { Badge, Button, Card, Chip, Confirm, EmptyState, IconButton, ScreenHeader, SectionHeader, Toast } from '../ui/kit';
import { useMoney } from '../ui/money';
import { CATEGORY_ICON } from './AddExpenseScreen';

interface Props {
  profile: Profile; profileAt?: (y: number, m: number) => Profile; expenses: Expense[]; dismissed: string[]; today: Date;
  onAdd: () => void; onEdit: (id: string) => void; onDelete: (id: string) => void; onIgnore: (key: string) => void; onAccept: (s: Suggestion) => void;
  lastRemoved?: Expense | null; onUndoRemove?: () => void; onClearRemoved?: () => void;
  /** pilier demandé depuis le Budget ; `linkKey` change à chaque demande */
  linkFilter?: PillarId | null; linkKey?: string;
}

/** Activité : chaque mois depuis la première dépense, recherche dans tout l'historique, modification et suppression */
export function ActivityScreen({ profile, profileAt, expenses, dismissed, today, onAdd, onEdit, onDelete, onIgnore, onAccept, lastRemoved, onUndoRemove, onClearRemoved, linkFilter, linkKey }: Props) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m$ = useMoney();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<PillarId | null>(linkFilter ?? null);
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  // ouvert depuis un pilier du Budget : ce pilier, le mois en cours, sans recherche
  const [seenKey, setSeenKey] = useState(linkKey);
  if (linkKey !== seenKey) { setSeenKey(linkKey); setFilter(linkFilter ?? null); setOffset(0); setQuery(''); setOpen(null); }
  const first = useMemo(() => firstMonth(expenses, today), [expenses, today]);
  const minOffset = (first.year * 12 + first.month) - (today.getFullYear() * 12 + today.getMonth());
  const shown = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const y = shown.getFullYear(), mo = shown.getMonth();
  // la liste suit la frappe sans la bloquer : chaque touche s'affiche tout de suite, le filtrage suit
  const deferredQuery = useDeferredValue(query);
  const searching = deferredQuery.trim().length >= 2;
  const res = useMemo(() => activityFor(profile, expenses, today, { year: y, month: mo, filter, query: searching ? deferredQuery : '', profileAt }),
    [profile, expenses, today, y, mo, filter, deferredQuery, searching, profileAt]);
  const sugg = useMemo(() => detectRecurring(expenses, profile.charges, today, dismissed)[0], [expenses, profile.charges, today, dismissed]);

  return (
    <View style={st.screen}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 100 }} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Activité" right={<IconButton icon="plus" label="Ajouter une dépense" onPress={onAdd} variant="filled" />} />

        <View style={st.search}>
          <Feather name="search" size={17} color={c.ink2} />
          <TextInput value={query} onChangeText={v => { setQuery(v.slice(0, 40)); setOpen(null); }} placeholder="Rechercher une dépense" placeholderTextColor={c.ink3}
            accessibilityLabel="Rechercher une dépense" style={st.searchInput} returnKeyType="search" autoCorrect={false} />
          {!!query && <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Effacer la recherche"><Feather name="x-circle" size={17} color={c.ink2} /></Pressable>}
        </View>

        {sugg && !searching && (
          <View style={st.sugg} accessibilityRole="summary">
            <View style={st.suggHead}><Feather name="repeat" size={14} color={c.vermilion} /><Text style={st.suggKicker}>Dépense régulière repérée</Text></View>
            <Text style={st.suggName}>{sugg.label}</Text>
            <Text style={st.suggTxt}>{m$.eur(sugg.amount)} vers le {sugg.day}, {sugg.months} mois de suite. L’ajouter à vos charges fixes ? Elle sera prévue chaque mois dans le calendrier.</Text>
            <View style={st.suggBtns}>
              <Button label="Ignorer" variant="secondary" small onPress={() => onIgnore(sugg.key)} a11yLabel={`Ignorer ${sugg.label}`} />
              <Button label="Ajouter aux charges fixes" small onPress={() => onAccept(sugg)} a11yLabel={`Ajouter ${sugg.label} aux charges fixes`} style={{ flex: 1 }} />
            </View>
          </View>
        )}

        {!searching && (
          <View style={st.monthNav}>
            <IconButton icon="chevron-left" label="Activité : mois d’avant" small onPress={() => setOffset(o => o - 1)} disabled={offset <= minOffset} />
            <View style={{ alignItems: 'center' }}>
              <Text style={st.month} accessibilityRole="header">{capitalize(MONTH_NAMES[mo])} {y}</Text>
              <Text style={st.monthSum}>{m$.round(res.spent)} de dépenses · {m$.round(res.fixed)} de charges</Text>
            </View>
            <IconButton icon="chevron-right" label="Activité : mois d’après" small onPress={() => setOffset(o => o + 1)} disabled={offset >= 0} />
          </View>
        )}
        {searching && <Text style={st.results} accessibilityLiveRegion="polite">{res.count ? `${res.count} résultat${res.count > 1 ? 's' : ''}${res.spent ? ` · ${m$.round(res.spent)} de dépenses` : ''}${res.fixed ? ` · ${m$.round(res.fixed)} de charges fixes` : ''}` : 'Aucun résultat'}</Text>}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filters}>
          <Chip label="Tout" selected={filter === null} onPress={() => setFilter(null)} />
          {PILLARS.map(p => <Chip key={p.id} label={p.name} selected={filter === p.id} onPress={() => setFilter(p.id)} color={c.pillar[p.id]} />)}
        </ScrollView>

        {res.days.map(d => (
          <View key={d.date}>
            <SectionHeader plain title={d.title} right={m$.signed(d.total, '−')} />
            <Card>
              {d.items.map((i, n) => (
                <View key={i.key} style={n > 0 && st.sep}>
                  <Pressable style={st.row} disabled={i.kind !== 'depense'} onPress={() => { setOpen(open === i.key ? null : i.key); setConfirm(null); }}
                    accessibilityRole={i.kind === 'depense' ? 'button' : undefined} accessibilityState={i.kind === 'depense' ? { expanded: open === i.key } : undefined}
                    accessibilityLabel={`${i.label}, ${i.sub}, −${m$.spoken(i.amount)}`}>
                    <Badge color={c.pillar[i.pillar]} icon={i.kind === 'charge' ? 'repeat' : CATEGORY_ICON[expenses.find(e => e.id === i.id)?.categoryId ?? ''] ?? 'circle'} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={st.name} numberOfLines={1}>{i.label}</Text>
                      <Text style={st.sub} numberOfLines={1}>{searching ? `${i.sub} · ${d.title}` : i.sub}</Text>
                    </View>
                    <Text style={st.amt}>{m$.signed(i.amount, '−')}</Text>
                  </Pressable>
                  {open === i.key && (confirm === i.key
                    ? <Confirm question="Supprimer cette dépense ?" confirmLabel="Supprimer" a11yConfirm={`Confirmer la suppression de ${i.label}`}
                        onCancel={() => setConfirm(null)} onConfirm={() => { onDelete(i.id); setOpen(null); setConfirm(null); }} />
                    : <View style={st.actions}>
                        <Button label="Modifier" icon="edit-2" variant="secondary" small onPress={() => { setOpen(null); onEdit(i.id); }} a11yLabel={`Modifier ${i.label}`} />
                        <Button label="Supprimer" icon="trash-2" variant="secondary" small onPress={() => setConfirm(i.key)} a11yLabel={`Supprimer ${i.label}`} />
                      </View>)}
                </View>
              ))}
            </Card>
          </View>
        ))}
        {!res.days.length && (
          searching ? <EmptyState icon="search" title="Aucune dépense trouvée" text="Essayez un autre mot : un magasin, une catégorie (« courses », « santé »)." />
            : filter ? <EmptyState icon="filter" title="Rien dans ce pilier" text={`Aucune dépense ${PILLARS.find(p => p.id === filter)!.name.toLowerCase()} en ${MONTH_NAMES[mo]}.`} />
            : <EmptyState icon="inbox" title={offset === 0 ? 'Aucune dépense pour l’instant' : `Rien en ${MONTH_NAMES[mo]}`}
                text={offset === 0 ? 'Ajoutez une dépense avec le bouton « + » : elle apparaîtra ici, rangée par jour.' : 'Aucune dépense ni charge n’a été comptée ce mois-là.'}
                action={offset === 0 ? <Button label="Ajouter une dépense" icon="plus" onPress={onAdd} /> : undefined} />
        )}
      </ScrollView>
      {lastRemoved && onClearRemoved && (
        <Toast bottom={insets.bottom + space.lg} icon="trash-2" onHide={onClearRemoved} message={`${lastRemoved.label} supprimée`}
          actionLabel="Annuler" actionA11y="Annuler la suppression" onAction={onUndoRemove} />
      )}
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  search: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginHorizontal: space.gutter, marginTop: space.md, height: 44, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md },
  searchInput: { ...t.body, flex: 1, color: c.ink, height: 44 },
  sugg: { marginHorizontal: space.gutter, marginTop: space.md, borderRadius: radius.lg, padding: space.lg, backgroundColor: tint(c.vermilion, 0.07), borderWidth: 1, borderColor: tint(c.vermilion, 0.22) },
  suggHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  suggKicker: { ...t.overline, color: c.vermilion },
  suggName: { ...t.headline, color: c.ink, marginTop: space.sm },
  suggTxt: { ...t.footnote, color: c.ink2, marginTop: space.xs },
  suggBtns: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: space.gutter, marginTop: space.lg },
  month: { ...t.headline, color: c.ink },
  monthSum: { ...t.caption, ...tabular, color: c.ink2, marginTop: 2 },
  results: { ...t.footnote, color: c.ink2, marginHorizontal: space.gutter + space.sm, marginTop: space.md },
  filters: { gap: 6, paddingHorizontal: space.gutter, paddingTop: space.md },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, minHeight: 60 },
  name: { ...t.bodyStrong, color: c.ink },
  sub: { ...t.footnote, color: c.ink2, marginTop: 1 },
  amt: { ...t.bodyStrong, ...tabular, color: c.ink },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.sm, paddingBottom: space.md },
});

