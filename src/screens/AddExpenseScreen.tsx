import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CATEGORIES, PILLARS } from '../domain/budget';
import { KEYS, press, toCents } from '../domain/keypad';
import { formatEuros } from '../domain/money';
import { cleanName } from '../domain/onboarding';
import type { Expense } from '../domain/types';
import { font, tint, onColor } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Saisie d'une dépense : montant au pavé, catégorie rangée par pilier, libellé facultatif, aujourd'hui ou hier */
export function AddExpenseScreen({ today, onSave, onClose }: { today: Date; onSave: (e: Expense) => void; onClose: () => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [amount, setAmount] = useState('0');
  const [cat, setCat] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [yesterday, setYesterday] = useState(false);
  const cents = toCents(amount);
  const ok = cents > 0 && cat !== null;
  const category = CATEGORIES.find(c => c.id === cat);

  const save = () => {
    if (!ok || !category) return;
    const d = new Date(today); if (yesterday) d.setDate(d.getDate() - 1);
    onSave({ id: Crypto.randomUUID(), date: iso(d), label: cleanName(label).trim() || category.name, categoryId: category.id, amount: cents });
  };

  return (
    <View style={[st.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 }]}>
      <View style={st.head}>
        <Text style={st.title}>Nouvelle dépense</Text>
        <Pressable onPress={onClose} style={st.close} accessibilityRole="button" accessibilityLabel="Fermer"><Text style={st.closeTxt}>×</Text></Pressable>
      </View>
      <Text style={st.amount} accessibilityLabel={`Montant : ${formatEuros(cents)}`} accessibilityLiveRegion="polite">{amount}<Text style={st.cur}> €</Text></Text>
      <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={st.groups}>
        {PILLARS.map(pl => (
          <View key={pl.id} style={st.group}>
            <View style={[st.dot, { backgroundColor: colors.pillar[pl.id] }]} />
            <View style={st.catRow}>
              {CATEGORIES.filter(c => c.pillar === pl.id).map(c => {
                const on = cat === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setCat(c.id)} accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={`${c.name}, ${pl.name}`}
                    style={[st.cat, { backgroundColor: on ? colors.pillar[pl.id] : tint(colors.pillar[pl.id], 0.12) }]}>
                    <Text style={[st.catTxt, on && { color: onColor(colors.pillar[pl.id]) }]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={st.meta}>
        <TextInput value={label} onChangeText={t => setLabel(cleanName(t))} maxLength={40} placeholder={category ? category.name : 'Libellé (facultatif)'} placeholderTextColor={colors.ink3} accessibilityLabel="Libellé de la dépense" style={st.label} />
        <View style={st.days}>
          {([[false, 'Aujourd’hui'], [true, 'Hier']] as [boolean, string][]).map(([v, l]) => (
            <Pressable key={l} onPress={() => setYesterday(v)} style={[st.day, yesterday === v && st.dayOn]} accessibilityRole="button" accessibilityState={{ selected: yesterday === v }}>
              <Text style={[st.dayTxt, yesterday === v && { color: colors.onBtn }]}>{l}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={st.keys}>
        {KEYS.map(k => (
          <Pressable key={k} onPress={() => setAmount(a => press(a, k))} style={({ pressed }) => [st.key, pressed && { backgroundColor: colors.fill }]} accessibilityRole="button" accessibilityLabel={k === '⌫' ? 'Effacer' : k === ',' ? 'Virgule' : k}>
            <Text style={st.keyTxt}>{k}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={save} disabled={!ok} style={[st.go, { backgroundColor: category ? colors.pillar[category.pillar] : colors.btn }, !ok && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Ajouter la dépense">
        <Text style={[st.goTxt, { color: category ? onColor(colors.pillar[category.pillar]) : colors.onBtn }]}>{ok && category ? `Ajouter ${formatEuros(cents)} en ${PILLARS.find(p => p.id === category.pillar)!.name}` : 'Ajouter'}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: 20 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: font.semibold, fontSize: 18, color: colors.ink },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.fill, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 22, lineHeight: 24, color: colors.ink },
  amount: { fontFamily: font.semibold, fontSize: 60, letterSpacing: -2.8, color: colors.ink, textAlign: 'center', marginTop: 8 },
  cur: { fontSize: 34, color: colors.ink2, letterSpacing: 0 },
  groups: { gap: 8, paddingVertical: 10 },
  group: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 12 },
  catRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cat: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99 },
  catTxt: { fontFamily: font.medium, fontSize: 14, color: colors.ink },
  meta: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 4 },
  label: { flex: 1, minWidth: 0, height: 42, borderRadius: 12, backgroundColor: colors.fill, paddingHorizontal: 12, fontFamily: font.regular, fontSize: 15, color: colors.ink },
  days: { flexDirection: 'row', gap: 4 },
  day: { paddingHorizontal: 10, height: 42, borderRadius: 12, backgroundColor: colors.fill, justifyContent: 'center' },
  dayOn: { backgroundColor: colors.btn },
  dayTxt: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  keys: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, flex: 1, alignContent: 'flex-end' },
  key: { width: '33.33%', height: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 14 },
  keyTxt: { fontFamily: font.medium, fontSize: 26, color: colors.ink },
  go: { height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  goTxt: { fontFamily: font.semibold, fontSize: 16, color: '#fff' },
});
