import * as Crypto from 'expo-crypto';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ACCOUNT_KINDS, parseBalance, totals, type Account, type AccountKind } from '../domain/accounts';
import { dayTitle } from '../domain/activity';
import { formatEuros, toInputText } from '../domain/money';
import { cleanName } from '../domain/onboarding';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { radius, space, tabular, type as t } from '../theme/tokens';
import { BIG_TEXT_MAX_SCALE } from '../ui/a11y';
import { Badge, Button, Card, Chip, Confirm, EmptyState, IconButton, Notice, Row, ScreenHeader, SectionHeader, type IconName } from '../ui/kit';
import { useMoney } from '../ui/money';

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const updatedText = (iso: string, today: Date) => {
  const x = dayTitle(iso, today);
  return x === 'Aujourd’hui' ? 'mis à jour aujourd’hui' : x === 'Hier' ? 'mis à jour hier' : `mis à jour le ${x}`;
};
const balanceText = toInputText;
const ageDays = (iso: string, today: Date) => Math.round((Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()) - Date.parse(iso + 'T00:00:00Z')) / 86_400_000);
/** Au-delà, on suggère de mettre le solde à jour */
export const STALE_DAYS = 30;
export const KIND_ICON: Record<AccountKind, IconName> = { courant: 'credit-card', livret: 'archive', placement: 'trending-up', especes: 'dollar-sign' };
const KIND_HINT: Record<AccountKind, string> = { courant: 'l’argent du quotidien', livret: 'épargne disponible', placement: 'épargne à long terme', especes: 'billets et pièces' };

interface Draft { id: string | null; name: string; kind: AccountKind; balance: string }

function Editor({ draft, setDraft, onSave, onCancel, onDelete }: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const [confirm, setConfirm] = useState(false);
  const bal = parseBalance(draft.balance);
  const ok = draft.name.trim().length > 0 && bal !== null;
  return (
    <View style={st.editor}>
      <TextInput value={draft.name} onChangeText={v => setDraft({ ...draft, name: cleanName(v) })} maxLength={40} placeholder="Nom : compte courant, Livret A…" placeholderTextColor={c.ink3} accessibilityLabel="Nom du compte" style={st.input} />
      <View style={st.kinds}>
        {ACCOUNT_KINDS.map(k => <Chip key={k.id} label={k.name} icon={KIND_ICON[k.id]} selected={draft.kind === k.id} onPress={() => setDraft({ ...draft, kind: k.id })} />)}
      </View>
      <View style={st.balRow}>
        <Text style={st.lbl}>Solde</Text>
        <View style={st.balBox}>
          <TextInput value={draft.balance} onChangeText={v => setDraft({ ...draft, balance: v.replace(/[^\d,.\s\-−]/g, '').slice(0, 14) })} keyboardType="numbers-and-punctuation" inputMode="decimal" maxLength={14} placeholder="0" placeholderTextColor={c.ink3} accessibilityLabel="Solde du compte" style={st.balInput} />
          <Text style={st.euro}>€</Text>
        </View>
      </View>
      {draft.balance.trim() !== '' && bal === null && <Text style={st.err}>Solde invalide (un signe moins pour un découvert, 2 décimales)</Text>}
      {confirm
        ? <Confirm question="Supprimer ce compte ?" confirmLabel="Supprimer" a11yConfirm={`Confirmer la suppression de ${draft.name}`} onCancel={() => setConfirm(false)} onConfirm={() => onDelete?.()} />
        : <View style={st.btns}>
            {onDelete && <Button label="Supprimer" variant="ghost" small onPress={() => setConfirm(true)} a11yLabel={`Supprimer ${draft.name}`} />}
            <View style={{ flex: 1 }} />
            <Button label="Annuler" variant="secondary" small onPress={onCancel} />
            <Button label="Enregistrer" small onPress={onSave} disabled={!ok} a11yLabel="Enregistrer le compte" />
          </View>}
    </View>
  );
}

/** Comptes saisis à la main : total, répartition par type, soldes à mettre à jour */
export function AccountsScreen({ accounts, today, onSave, onRemove }: { accounts: Account[]; today: Date; onSave: (a: Account) => void; onRemove: (id: string) => void }) {
  const c = useColors(); const st = useStyles(makeStyles);
  const m$ = useMoney();
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<Draft | null>(null);
  const tot = totals(accounts);
  const positive = tot.byKind.map(k => Math.max(0, k.total));
  const posSum = Math.max(1, positive.reduce((a, x) => a + x, 0));
  const stale = accounts.filter(a => ageDays(a.updated, today) > STALE_DAYS).length;
  const kindColor: Record<AccountKind, string> = { courant: c.pillar.besoins, livret: c.teal, placement: c.pillar.culture, especes: c.vermilion };
  const newDraft = () => setDraft({ id: null, name: '', kind: 'courant', balance: '' });
  const save = () => {
    if (!draft) return;
    const bal = parseBalance(draft.balance);
    if (bal === null || !draft.name.trim()) return;
    const prev = accounts.find(a => a.id === draft.id);
    // renommer un compte ne le marque pas « mis à jour » : seule une modification du solde compte
    onSave({ id: draft.id ?? Crypto.randomUUID(), name: draft.name.trim(), kind: draft.kind, balance: bal, updated: prev && prev.balance === bal ? prev.updated : isoOf(today) });
    setDraft(null);
  };

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 48 }} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Comptes" right={<IconButton icon="plus" label="Ajouter un compte" onPress={newDraft} variant="filled" />} />
      {accounts.length > 0 && (
        <View style={st.head}>
          <Text style={st.kick}>Total de vos comptes</Text>
          <Text maxFontSizeMultiplier={BIG_TEXT_MAX_SCALE} style={[st.total, tot.total < 0 && !m$.hidden && { color: c.vermilion }]} numberOfLines={1} adjustsFontSizeToFit
            accessibilityLabel={m$.hidden ? 'Total masqué' : `Total de vos comptes : ${formatEuros(tot.total)}`}>{m$.eur(tot.total)}</Text>
          {tot.byKind.length > 1 && posSum > 1 && (
            <View style={st.dist} accessible accessibilityRole="image" accessibilityLabel={`Répartition : ${tot.byKind.map((k, i) => `${k.plural} ${Math.round((positive[i] / posSum) * 100)} %`).join(', ')}`}>
              {tot.byKind.map((k, i) => positive[i] > 0 && <View key={k.id} style={{ flex: positive[i] / posSum, backgroundColor: kindColor[k.id] }} />)}
            </View>
          )}
        </View>
      )}
      {stale > 0 && <View style={st.notice}><Notice icon="clock">{stale > 1 ? `${stale} soldes ont plus d’un mois` : 'Un solde a plus d’un mois'} : touchez un compte pour le mettre à jour.</Notice></View>}
      {draft && draft.id === null && <Card style={{ marginTop: space.md }}><Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} /></Card>}
      {tot.byKind.map(k => (
        <View key={k.id}>
          <SectionHeader title={k.plural} right={m$.eur(k.total)} />
          <Card>
            {k.accounts.map((a, i) => (
              <View key={a.id}>
                {draft?.id === a.id ? (
                  <View style={i > 0 && st.sep}><Editor draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} onDelete={() => { onRemove(a.id); setDraft(null); }} /></View>
                ) : (
                  <Row first={i === 0} title={a.name} subtitle={`${updatedText(a.updated, today)}${ageDays(a.updated, today) > STALE_DAYS ? ' · à mettre à jour' : ''}`}
                    left={<Badge color={kindColor[a.kind]} icon={KIND_ICON[a.kind]} />}
                    right={<Text style={[st.bal, a.balance < 0 && !m$.hidden && { color: c.vermilion }]}>{m$.eur(a.balance)}</Text>}
                    onPress={() => setDraft({ id: a.id, name: a.name, kind: a.kind, balance: balanceText(a.balance) })}
                    a11yLabel={`${a.name}, ${updatedText(a.updated, today)}, ${m$.hidden ? 'solde masqué' : formatEuros(a.balance)}`} />
                )}
              </View>
            ))}
          </Card>
          <Text style={st.kindHint}>{KIND_HINT[k.id]}</Text>
        </View>
      ))}
      {!accounts.length && !draft && (
        <Card style={{ marginTop: space.lg }}>
          <EmptyState icon="credit-card" title="Aucun compte pour l’instant" text="Ajoutez vos comptes à la main (compte courant, livrets, placements) et mettez à jour leur solde quand vous voulez."
            action={<Button label="Ajouter un compte" icon="plus" onPress={newDraft} />} />
        </Card>
      )}
      <Text style={st.note}>Saisie à la main : Nokori ne se connecte à aucune banque, et ces soldes restent sur votre téléphone.</Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  head: { paddingHorizontal: space.gutter + space.xs, marginTop: space.lg },
  kick: { ...t.overline, color: c.ink2 },
  total: { ...t.h1, ...tabular, fontSize: 40, lineHeight: 46, color: c.ink, marginTop: space.xs },
  dist: { flexDirection: 'row', height: 8, borderRadius: 8, overflow: 'hidden', gap: 2, marginTop: space.md },
  notice: { marginHorizontal: space.gutter, marginTop: space.md },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  bal: { ...t.bodyStrong, ...tabular, color: c.ink },
  kindHint: { ...t.caption, color: c.ink2, marginHorizontal: space.gutter + space.sm, marginTop: 6 },
  editor: { gap: space.md, paddingVertical: space.lg },
  input: { ...t.body, height: 46, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md, color: c.ink },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  balRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  lbl: { ...t.callout, color: c.ink },
  balBox: { flexDirection: 'row', alignItems: 'center', flex: 1, maxWidth: 200, minWidth: 0, height: 46, borderRadius: radius.md, backgroundColor: c.fill, paddingHorizontal: space.md },
  balInput: { ...t.headline, ...tabular, flex: 1, minWidth: 0, width: '100%', color: c.ink, textAlign: 'right' },
  euro: { ...t.body, color: c.ink2, marginLeft: 6 },
  err: { ...t.footnote, color: c.vermilion },
  btns: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  note: { ...t.caption, color: c.ink2, marginHorizontal: space.gutter + space.sm, marginTop: space.xl },
});
