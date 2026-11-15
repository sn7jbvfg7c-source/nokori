import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCOUNT_KINDS, parseBalance, totals, type Account, type AccountKind } from '../domain/accounts';
import { dayTitle } from '../domain/activity';
import { formatEuros } from '../domain/money';
import { cleanName } from '../domain/onboarding';
import { font, onColor } from '../theme/tokens';
import type { Palette } from '../theme/tokens';
import { useColors, useStyles } from '../theme/theme';
import { BIG_TEXT_MAX_SCALE } from '../ui/a11y';

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const updatedText = (iso: string, today: Date) => {
  const t = dayTitle(iso, today);
  return t === 'Aujourd’hui' ? 'mis à jour aujourd’hui' : t === 'Hier' ? 'mis à jour hier' : `mis à jour le ${t}`;
};
const balanceText = (c: number) => formatEuros(c).replace(/ €$/, '').replace(/ /g, ' ').replace('−', '-');

interface Draft { id: string | null; name: string; kind: AccountKind; balance: string }

function Editor({ draft, setDraft, onSave, onCancel, onDelete }: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const [confirm, setConfirm] = useState(false);
  const bal = parseBalance(draft.balance);
  const ok = draft.name.trim().length > 0 && bal !== null;
  return (
    <View style={st.editor}>
      <TextInput value={draft.name} onChangeText={t => setDraft({ ...draft, name: cleanName(t) })} maxLength={40} placeholder="Nom : compte courant, Livret A…" placeholderTextColor={colors.ink3} accessibilityLabel="Nom du compte" style={st.input} />
      <View style={st.kinds}>
        {ACCOUNT_KINDS.map(k => (
          <Pressable key={k.id} onPress={() => setDraft({ ...draft, kind: k.id })} style={[st.kind, draft.kind === k.id && st.kindOn]} accessibilityRole="button" accessibilityState={{ selected: draft.kind === k.id }}>
            <Text style={[st.kindTxt, draft.kind === k.id && { color: colors.onBtn }]}>{k.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={st.balRow}>
        <Text style={st.lbl}>Solde</Text>
        <View style={st.balBox}>
          <TextInput value={draft.balance} onChangeText={t => setDraft({ ...draft, balance: t.replace(/[^\d,.\s\-−]/g, '').slice(0, 14) })} keyboardType="numbers-and-punctuation" inputMode="decimal" maxLength={14} placeholder="0" placeholderTextColor={colors.ink3} accessibilityLabel="Solde du compte" style={st.balInput} />
          <Text style={st.euro}>€</Text>
        </View>
      </View>
      {draft.balance.trim() !== '' && bal === null && <Text style={st.err}>Solde invalide (un signe moins pour un découvert, 2 décimales)</Text>}
      {confirm ? (
        <View style={st.btns}>
          <Text style={st.ask}>Supprimer ce compte ?</Text>
          <Pressable onPress={() => setConfirm(false)} style={[st.btn, st.btnLight]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
          <Pressable onPress={onDelete} style={[st.btn, { backgroundColor: colors.vermilion }]} accessibilityRole="button" accessibilityLabel={`Confirmer la suppression de ${draft.name}`}><Text style={[st.btnTxt, { color: onColor(colors.vermilion) }]}>Supprimer</Text></Pressable>
        </View>
      ) : (
        <View style={st.btns}>
          {onDelete && <Pressable onPress={() => setConfirm(true)} style={st.del} accessibilityRole="button" accessibilityLabel={`Supprimer ${draft.name}`}><Text style={[st.btnTxt, { color: colors.vermilion }]}>Supprimer</Text></Pressable>}
          <View style={{ flex: 1 }} />
          <Pressable onPress={onCancel} style={[st.btn, st.btnLight]} accessibilityRole="button"><Text style={st.btnTxt}>Annuler</Text></Pressable>
          <Pressable onPress={onSave} disabled={!ok} style={[st.btn, st.btnDark, !ok && { opacity: 0.35 }]} accessibilityRole="button" accessibilityLabel="Enregistrer le compte"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Enregistrer</Text></Pressable>
        </View>
      )}
    </View>
  );
}

export function AccountsScreen({ accounts, today, onSave, onRemove, hideAmounts = false }: { accounts: Account[]; today: Date; onSave: (a: Account) => void; onRemove: (id: string) => void; hideAmounts?: boolean }) {
  const colors = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const t = totals(accounts);
  const save = () => {
    if (!draft) return;
    const bal = parseBalance(draft.balance);
    if (bal === null || !draft.name.trim()) return;
    onSave({ id: draft.id ?? Crypto.randomUUID(), name: draft.name.trim(), kind: draft.kind, balance: bal, updated: isoOf(today) });
    setDraft(null);
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={st.top}>
        <Text style={st.title}>Comptes</Text>
        <Pressable onPress={() => setDraft({ id: null, name: '', kind: 'courant', balance: '' })} style={st.add} accessibilityRole="button" accessibilityLabel="Ajouter un compte"><Text style={st.plus}>+</Text></Pressable>
      </View>
      {accounts.length > 0 && (
        <View style={st.head}>
          <Text style={st.kick}>Total de vos comptes</Text>
          <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={[st.total, t.total < 0 && { color: colors.vermilion }]} accessibilityLabel={hideAmounts ? 'Total masqué' : `Total de vos comptes : ${formatEuros(t.total)}`}>{hideAmounts ? '•••' : formatEuros(t.total)}</Text>
        </View>
      )}
      {draft && draft.id === null && <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} />}
      {t.byKind.map(k => (
        <View key={k.id}>
          <View style={st.secHead}><Text style={st.sec}>{k.plural}</Text><Text style={st.secR}>{hideAmounts ? '•••' : formatEuros(k.total)}</Text></View>
          <View style={st.list}>
            {k.accounts.map((a, i) => (
              <View key={a.id} style={i > 0 && st.sep}>
                {draft?.id === a.id ? (
                  <Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(a.id); setDraft(null); }} />
                ) : (
                  <Pressable style={st.row} onPress={() => setDraft({ id: a.id, name: a.name, kind: a.kind, balance: balanceText(a.balance) })} accessibilityRole="button" accessibilityLabel={`${a.name}, ${updatedText(a.updated, today)}, ${hideAmounts ? 'solde masqué' : formatEuros(a.balance)}`}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.name}>{a.name}</Text>
                      <Text style={st.sub}>{updatedText(a.updated, today)}</Text>
                    </View>
                    <Text style={[st.bal, a.balance < 0 && !hideAmounts && { color: colors.vermilion }]}>{hideAmounts ? '•••' : formatEuros(a.balance)}</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
      {!accounts.length && !draft && (
        <View style={st.empty}>
          <Text style={st.emptyTitle}>Aucun compte pour l’instant</Text>
          <Text style={st.emptyTxt}>Ajoutez vos comptes à la main (compte courant, livrets, placements) et mettez à jour leur solde quand vous voulez.</Text>
          <Pressable onPress={() => setDraft({ id: null, name: '', kind: 'courant', balance: '' })} style={[st.btn, st.btnDark, { alignSelf: 'center', marginTop: 12 }]} accessibilityRole="button"><Text style={[st.btnTxt, { color: colors.onBtn }]}>Ajouter un compte</Text></Pressable>
        </View>
      )}
      <Text style={st.note}>Saisie à la main : Nokori ne se connecte à aucune banque, et ces soldes restent sur votre téléphone.</Text>
    </ScrollView>
  );
}

const makeStyles = (colors: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  title: { fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.btn, alignItems: 'center', justifyContent: 'center' },
  plus: { color: colors.onBtn, fontSize: 24, lineHeight: 26, fontFamily: font.medium },
  head: { paddingHorizontal: 24, paddingTop: 14 },
  kick: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  total: { fontFamily: font.semibold, fontSize: 40, letterSpacing: -1.8, color: colors.ink, marginTop: 2 },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 24, marginTop: 20, marginBottom: 6 },
  sec: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  secR: { fontFamily: font.regular, fontSize: 13, color: colors.ink2 },
  list: { marginHorizontal: 16, backgroundColor: colors.surface, borderRadius: 20, paddingHorizontal: 14 },
  sep: { borderTopWidth: 1, borderTopColor: colors.hair },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 12 },
  name: { fontFamily: font.semibold, fontSize: 15, color: colors.ink },
  sub: { fontFamily: font.regular, fontSize: 12.5, color: colors.ink2, marginTop: 2 },
  bal: { fontFamily: font.semibold, fontSize: 16, color: colors.ink },
  editor: { marginHorizontal: 0, marginVertical: 10, padding: 12, borderRadius: 16, backgroundColor: 'rgba(188,68,35,0.06)', gap: 10 },
  input: { minWidth: 0, width: '100%', height: 44, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12, fontFamily: font.regular, fontSize: 15, color: colors.ink, borderWidth: 1.5, borderColor: colors.fill2 },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kind: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 99, backgroundColor: colors.fill },
  kindOn: { backgroundColor: colors.btn },
  kindTxt: { fontFamily: font.medium, fontSize: 13, color: colors.ink },
  balRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  lbl: { fontFamily: font.regular, fontSize: 14, color: colors.ink2 },
  balBox: { flexDirection: 'row', alignItems: 'center', width: 170, height: 44, borderRadius: 12, backgroundColor: colors.surface, paddingHorizontal: 12, borderWidth: 1.5, borderColor: colors.fill2 },
  balInput: { flex: 1, minWidth: 0, width: '100%', textAlign: 'right', fontFamily: font.semibold, fontSize: 17, color: colors.ink },
  euro: { fontFamily: font.semibold, fontSize: 16, color: colors.ink2, marginLeft: 6 },
  err: { fontFamily: font.medium, fontSize: 13, color: colors.vermilion },
  btns: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  btn: { paddingHorizontal: 14, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  btnLight: { backgroundColor: colors.surface },
  btnDark: { backgroundColor: colors.btn },
  del: { paddingHorizontal: 4, height: 40, justifyContent: 'center' },
  btnTxt: { fontFamily: font.semibold, fontSize: 14, color: colors.ink },
  ask: { flex: 1, fontFamily: font.medium, fontSize: 14, color: colors.ink },
  empty: { margin: 16, marginTop: 24, padding: 22, borderRadius: 22, backgroundColor: colors.surface },
  emptyTitle: { fontFamily: font.semibold, fontSize: 17, color: colors.ink, textAlign: 'center' },
  emptyTxt: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: colors.ink2, textAlign: 'center', marginTop: 6 },
  note: { fontFamily: font.regular, fontSize: 12.5, lineHeight: 18, color: colors.ink2, marginHorizontal: 24, marginTop: 18 },
});
