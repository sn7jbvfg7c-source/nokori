/**
 * Bandeau de consentement aux traceurs facultatifs.
 * Il n'apparaît QUE s'il existe des traceurs soumis au consentement (aucun aujourd'hui : voir src/legal/consent.ts).
 * Trois choix de même taille et de même poids visuel : « Tout refuser », « Personnaliser », « Tout accepter ».
 * Rien n'est coché par défaut ; fermer sans choisir n'autorise rien ; le choix se modifie à tout moment.
 */
import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { choiceAll, choiceCustom, type ConsentChoice, type Tracker } from '../legal/consent';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { radius, space, type as t } from '../theme/tokens';
import { Button } from './kit';

const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function ConsentBanner({ trackers, current, onChoice, onReadPolicy, startCustom = false }: {
  trackers: Tracker[]; current?: ConsentChoice; onChoice: (c: ConsentChoice) => void; onReadPolicy?: () => void; startCustom?: boolean;
}) {
  const c = useColors(); const st = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [custom, setCustom] = useState(startCustom);
  const [draft, setDraft] = useState<Record<string, boolean>>(() => Object.fromEntries(trackers.map(x => [x.id, current?.allowed[x.id] === true])));
  return (
    <View style={[st.wrap, { paddingBottom: insets.bottom + space.md }]} role="dialog" aria-label="Choix des traceurs facultatifs" accessibilityLiveRegion="polite">
      <Text style={st.title} accessibilityRole="header">Traceurs facultatifs</Text>
      <Text style={st.p}>
        Nokori fonctionne sans eux. Ils ne sont utilisés que si vous les acceptez, et vous pouvez changer d’avis à tout moment dans Réglages › Cookies et traceurs.
      </Text>
      {custom && (
        <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ gap: space.sm }}>
          {trackers.map(x => (
            <View key={x.id} style={st.row}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{x.name}</Text>
                <Text style={st.small}>{x.purpose} Fourni par : {x.provider}.</Text>
              </View>
              <Switch value={draft[x.id] === true} onValueChange={v => setDraft(d => ({ ...d, [x.id]: v }))} accessibilityLabel={`Autoriser ${x.name}`}
                trackColor={{ false: c.fill2, true: c.teal }} thumbColor="#FFFFFF" />
            </View>
          ))}
        </ScrollView>
      )}
      {onReadPolicy && <Button label="Lire la politique des cookies" variant="ghost" small onPress={onReadPolicy} style={{ alignSelf: 'flex-start' }} />}
      {/* trois boutons identiques en taille et en style : refuser n'est ni plus petit ni plus caché qu'accepter */}
      <View style={st.btns}>
        <Button label="Tout refuser" variant="secondary" onPress={() => onChoice(choiceAll(trackers, false, isoToday()))} style={st.btn} />
        {custom
          ? <Button label="Enregistrer mes choix" variant="secondary" onPress={() => onChoice(choiceCustom(trackers, draft, isoToday()))} style={st.btn} />
          : <Button label="Personnaliser" variant="secondary" onPress={() => setCustom(true)} style={st.btn} />}
        <Button label="Tout accepter" variant="secondary" onPress={() => onChoice(choiceAll(trackers, true, isoToday()))} style={st.btn} />
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: c.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: space.xl, gap: space.md,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 24, shadowOffset: { width: 0, height: -4 }, elevation: 12 },
  title: { ...t.headline, color: c.ink },
  p: { ...t.footnote, color: c.ink2 },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: c.fill },
  name: { ...t.bodyStrong, color: c.ink },
  small: { ...t.caption, color: c.ink2, marginTop: 2 },
  btns: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  btn: { flexGrow: 1, flexBasis: 100 },
});
