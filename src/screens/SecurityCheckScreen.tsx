import Feather from '@expo/vector-icons/Feather';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KDF } from '../domain/backup';
import { securityChecks, type Check, type CheckInput } from '../domain/securityCheck';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { space, type as t } from '../theme/tokens';
import { Button, Card, IconButton, Notice, ScreenHeader, SectionHeader } from '../ui/kit';

const seconds = (ms: number) => `${(ms / 1000).toFixed(1).replace('.', ',')} s`;

/**
 * Réglages › Vérifier la protection : l'état réel de cet appareil, en phrases simples.
 * Ne montre jamais la clé, la phrase secrète ni les montants (voir src/domain/securityCheck.ts).
 */
export function SecurityCheckScreen({ load, measure, onClose }: {
  /** constats (stockage, calculs de référence, verrou, sauvegarde) : aucune donnée sensible */
  load: () => Promise<CheckInput>;
  /** durée (ms) de la dérivation d'une clé de sauvegarde pour un réglage N */
  measure: (N: number) => Promise<number>;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const c = useColors(); const st = useStyles(makeStyles);
  const [checks, setChecks] = useState<Check[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [speed, setSpeed] = useState<{ current: number; strong: number } | 'mesure' | 'echec' | null>(null);

  useEffect(() => {
    let alive = true;
    load().then(i => { if (alive) setChecks(securityChecks(i)); }).catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [load]);

  const runSpeed = async () => {
    setSpeed('mesure');
    try { const current = await measure(KDF.N); const strong = await measure(KDF.N * 2); setSpeed({ current, strong }); }
    catch { setSpeed('echec'); }
  };

  const icon = (s: Check['status']) => s === 'ok' ? { name: 'check-circle' as const, color: c.teal, label: 'Vérifié' }
    : s === 'attention' ? { name: 'alert-triangle' as const, color: c.vermilion, label: 'À surveiller' } : { name: 'info' as const, color: c.ink2, label: 'Information' };

  return (
    <ScrollView style={st.screen} contentContainerStyle={{ paddingTop: insets.top + space.md, paddingBottom: insets.bottom + space.xxxl }}>
      <ScreenHeader title="Vérifier la protection" right={<IconButton icon="x" label="Fermer la vérification" onPress={onClose} small />} />
      <View style={st.intro}>
        <Notice icon="shield">Ce que Nokori constate sur cet appareil, maintenant. Ce diagnostic ne montre jamais votre clé, votre phrase secrète ni vos montants, et ne quitte pas votre appareil.</Notice>
      </View>
      <SectionHeader title="État de la protection" />
      <Card>
        {failed && <Text style={st.p}>Le diagnostic n’a pas pu se faire. Réessayez plus tard.</Text>}
        {!checks && !failed && <Text style={st.p} accessibilityLiveRegion="polite">Vérification en cours…</Text>}
        {checks?.map((k, i) => {
          const ic = icon(k.status);
          return (
            <View key={k.id} style={[st.row, i > 0 && st.sep]} accessible accessibilityLabel={`${ic.label} : ${k.title}. ${k.text}`}>
              <View aria-hidden style={{ marginTop: 2 }}><Feather name={ic.name} size={20} color={ic.color} /></View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={st.title}>{k.title}</Text>
                <Text style={st.p}>{k.text}</Text>
              </View>
            </View>
          );
        })}
      </Card>
      <SectionHeader title="Vitesse du chiffrement des sauvegardes" />
      <Card style={{ gap: space.sm, paddingVertical: space.md }}>
        <Text style={st.p}>Mesure le temps que met cet appareil à calculer la clé d’une sauvegarde, avec le réglage actuel et un réglage deux fois plus résistant. Aucune de vos données n’est utilisée. Ces mesures servent à choisir le réglage des prochaines versions.</Text>
        {speed && typeof speed === 'object' && (
          <Text style={st.title} accessibilityLiveRegion="polite">Réglage actuel : {seconds(speed.current)} · Deux fois plus résistant : {seconds(speed.strong)}</Text>
        )}
        {speed === 'echec' && <Text style={[st.p, { color: c.vermilion }]}>La mesure n’a pas pu se faire sur cet appareil.</Text>}
        <Button label={speed === 'mesure' ? 'Mesure en cours…' : 'Mesurer (quelques secondes)'} icon="clock" variant="secondary" onPress={runSpeed} disabled={speed === 'mesure'} />
      </Card>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  intro: { paddingHorizontal: space.gutter, marginBottom: space.sm },
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.md },
  sep: { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hair },
  title: { ...t.bodyStrong, color: c.ink },
  p: { ...t.footnote, color: c.ink2 },
});
