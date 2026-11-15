import Feather from '@expo/vector-icons/Feather';
import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, PILLARS } from '../domain/budget';
import { KEYS, press, toCents } from '../domain/keypad';
import { formatEuros } from '../domain/money';
import { cleanName } from '../domain/onboarding';
import type { Expense } from '../domain/types';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, tabular, type as t } from '../theme/tokens';
import { BIG_TEXT_MAX_SCALE } from '../ui/a11y';
import { Button, Chip, IconButton, Notice, type IconName } from '../ui/kit';

export const CATEGORY_ICON: Record<string, IconName> = {
  courses: 'shopping-cart', sante: 'plus-circle', restos: 'coffee', shopping: 'shopping-bag', loisirs: 'smile', culture: 'book', imprevus: 'alert-circle',
};
/** On peut saisir une dépense jusqu'à 62 jours en arrière (jamais dans le futur) */
export const MAX_DAYS_BACK = 62;
/** Au-delà, on demande de vérifier le montant (une virgule oubliée arrive vite) */
export const UNUSUAL = 100_000;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const MON = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DOW = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
const short = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
const toKeypad = (c: number) => (c % 100 === 0 ? String(c / 100) : `${Math.floor(c / 100)},${String(c % 100).padStart(2, '0').replace(/0$/, '')}`);
const daysBetween = (a: Date, b: Date) => Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86_400_000);

/** Saisie d'une dépense (ou modification si `initial`) : montant au pavé, catégorie par pilier, libellé, jour */
export function AddExpenseScreen({ today, initial, onSave, onClose }: { today: Date; initial?: Expense; onSave: (e: Expense) => unknown; onClose: () => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState(initial ? toKeypad(initial.amount) : '0');
  const [cat, setCat] = useState<string | null>(initial?.categoryId ?? null);
  const category = CATEGORIES.find(x => x.id === cat);
  const [label, setLabel] = useState(initial && initial.label !== category?.name ? initial.label : '');
  const initialBack = initial ? Math.max(0, daysBetween(today, new Date(initial.date + 'T12:00:00'))) : 0;
  const [back, setBack] = useState(initialBack);
  const cents = toCents(amount);
  const ok = cents > 0 && cat !== null;
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - back);
  const pillar = category ? PILLARS.find(p => p.id === category.pillar)! : null;
  const accent = category ? c.pillar[category.pillar] : undefined;

  const goLabel = ok && pillar ? `${initial ? 'Enregistrer' : 'Ajouter'} ${formatEuros(cents)} en ${pillar.name}` : cents === 0 ? 'Tapez un montant' : 'Choisissez une catégorie';
  const save = () => {
    if (!ok || !category) return;
    return onSave({ id: initial?.id ?? Crypto.randomUUID(), date: iso(date), label: cleanName(label).trim() || category.name, categoryId: category.id, amount: cents });
  };

  return (
    <View style={[st.screen, { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md }]}>
      <View style={st.head}>
        <Text style={st.title} accessibilityRole="header">{initial ? 'Modifier la dépense' : 'Nouvelle dépense'}</Text>
        <IconButton icon="x" label="Fermer" onPress={onClose} small />
      </View>

      <ScrollView style={st.top} contentContainerStyle={{ paddingBottom: space.sm }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={[st.amount, cents === 0 && { color: c.ink3 }]} accessibilityLabel={`Montant : ${formatEuros(cents)}`} accessibilityLiveRegion="polite">
          {amount}<Text style={st.cur}> €</Text>
        </Text>
        {cents >= UNUSUAL && <View style={st.warn}><Notice icon="alert-circle" tone="warn">Montant inhabituel : {formatEuros(cents)}. Vérifiez la virgule.</Notice></View>}

        {PILLARS.map(pl => (
          <View key={pl.id} style={st.group}>
            <View style={st.groupHead}><View style={[st.groupDot, { backgroundColor: c.pillar[pl.id] }]} /><Text style={st.groupName}>{pl.name}</Text></View>
            <View style={st.catRow}>
              {CATEGORIES.filter(x => x.pillar === pl.id).map(x => (
                <Chip key={x.id} label={x.name} icon={CATEGORY_ICON[x.id]} selected={cat === x.id} onPress={() => setCat(x.id)} color={c.pillar[pl.id]} a11yLabel={`${x.name}, ${pl.name}`} />
              ))}
            </View>
          </View>
        ))}

        <TextInput value={label} onChangeText={v => setLabel(cleanName(v))} maxLength={40} placeholder={category ? `Libellé (${category.name.toLowerCase()})` : 'Libellé (facultatif)'}
          placeholderTextColor={c.ink3} accessibilityLabel="Libellé de la dépense" style={st.label} returnKeyType="done" />

        <View style={st.days}>
          <Chip label="Aujourd’hui" selected={back === 0} onPress={() => setBack(0)} />
          <Chip label="Hier" selected={back === 1} onPress={() => setBack(1)} />
          {back >= 2 ? (
            <View style={st.stepper}>
              <Pressable onPress={() => setBack(b => Math.min(MAX_DAYS_BACK, b + 1))} disabled={back >= MAX_DAYS_BACK} hitSlop={8} accessibilityRole="button" accessibilityLabel="Jour précédent" style={[st.stepBtn, back >= MAX_DAYS_BACK && { opacity: 0.3 }]}>
                <Feather name="chevron-left" size={16} color={c.onBtn} />
              </Pressable>
              <Text style={st.stepTxt} accessibilityLiveRegion="polite">{short(date)}</Text>
              <Pressable onPress={() => setBack(b => Math.max(2, b - 1))} disabled={back <= 2} hitSlop={8} accessibilityRole="button" accessibilityLabel="Jour suivant" style={[st.stepBtn, back <= 2 && { opacity: 0.3 }]}>
                <Feather name="chevron-right" size={16} color={c.onBtn} />
              </Pressable>
            </View>
          ) : (
            <Chip label="Autre jour" icon="calendar" selected={false} onPress={() => setBack(2)} />
          )}
        </View>
      </ScrollView>

      <View style={st.keys}>
        {KEYS.map(k => (
          <Pressable key={k} onPress={() => setAmount(a => press(a, k))} style={({ pressed }) => [st.key, pressed && { backgroundColor: c.fill2 }]}
            accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Effacer' : k === ',' ? 'Virgule' : k}>
            {k === '⌫' ? <Feather name="delete" size={22} color={c.ink} /> : <Text style={st.keyTxt}>{k}</Text>}
          </Pressable>
        ))}
      </View>
      <Button onPress={save} disabled={!ok} color={accent} a11yLabel={`${initial ? 'Enregistrer la dépense' : 'Ajouter la dépense'} : ${goLabel}`} style={{ marginTop: space.sm }} label={goLabel} />
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.surface, paddingHorizontal: space.lg + 4 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  title: { ...t.headline, color: c.ink },
  top: { flexGrow: 0, flexShrink: 1 },
  amount: { ...t.display, ...tabular, fontSize: 60, lineHeight: 70, color: c.ink, textAlign: 'center', marginTop: space.xs },
  cur: { fontSize: 32, color: c.ink2, letterSpacing: 0 },
  warn: { marginBottom: space.sm },
  group: { marginTop: space.sm + 2 },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  groupDot: { width: 6, height: 6, borderRadius: 3 },
  groupName: { ...t.overline, color: c.ink2 },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  label: { ...t.body, height: 46, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md, color: c.ink, marginTop: space.lg },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: space.sm + 2, alignItems: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 36, borderRadius: radius.pill, backgroundColor: c.btn, paddingHorizontal: 6 },
  stepBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { ...t.callout, fontFamily: font.semibold, color: c.onBtn, minWidth: 92, textAlign: 'center' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', marginTop: space.sm, rowGap: 6 },
  key: { width: '33.33%', height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
  keyTxt: { ...t.title, ...tabular, fontFamily: font.medium, fontSize: 26, color: c.ink },
});

