import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LoadStatus } from '../state/AppState';
import { useColors, useStyles } from '../theme/theme';
import type { Palette } from '../theme/tokens';
import { font, radius, space, type as t } from '../theme/tokens';
import { Button } from './kit';

/**
 * Écran affiché à la place de l'app quand les données ne peuvent pas être chargées.
 * Jamais l'accueil : répondre aux questions de départ réécrirait la base et effacerait tout.
 */
export function DataProblem({ status, reason = 'fichier', onRetry, onRestore, onStartFresh }: {
  status: Exclude<LoadStatus, 'ok' | 'chargement'>;
  reason?: 'fichier' | 'cle';
  onRetry: () => void; onRestore?: () => void; onStartFresh: () => void;
}) {
  const insets = useSafeAreaInsets();
  const colors = useColors(); const st = useStyles(makeStyles);
  const [confirm, setConfirm] = useState(false);
  const unreadable = status === 'illisible';
  return (
    <ScrollView style={st.screen} contentContainerStyle={[st.body, { paddingTop: insets.top + 64, paddingBottom: insets.bottom + 32 }]}>
      <View style={st.icon}><Feather name={unreadable ? 'alert-triangle' : 'lock'} size={26} color={colors.vermilion} /></View>
      <Text style={st.title} accessibilityRole="header">{unreadable ? 'Vos données n’ont pas pu être relues' : 'Nokori n’arrive pas à ouvrir vos données'}</Text>
      <Text style={st.p}>
        {unreadable
          ? reason === 'cle'
            ? 'La clé qui protège vos données n’est plus disponible sur ce téléphone (restauration de l’appareil, réinitialisation du trousseau). Sans elle, la base chiffrée ne peut pas être lue. Rien n’a été effacé.'
            : 'Le fichier enregistré sur ce téléphone est abîmé ou vient d’une version plus récente de Nokori. Rien n’a été effacé : une copie est gardée telle quelle.'
          : 'Le stockage chiffré du téléphone ne répond pas pour l’instant. Rien n’a été modifié. Déverrouillez le téléphone si besoin, puis réessayez.'}
      </Text>
      <View style={st.actions}>
        {unreadable ? (
          <>
            {onRestore && <Button label="Restaurer une sauvegarde" icon="upload" onPress={onRestore} />}
            {reason !== 'cle' && <Button label="Mettre Nokori à jour, puis réessayer" variant="secondary" onPress={onRetry} />}
            {confirm ? (
              <View style={st.confirm}>
                <Text style={st.ask}>{reason === 'cle' ? 'Repartir de zéro ? La base illisible sera supprimée et l’app sera vide. Une sauvegarde .nokori reste utilisable ensuite.' : 'Repartir de zéro ? L’app sera vide. La copie de l’ancien fichier reste gardée sur le téléphone.'}</Text>
                <View style={st.row}>
                  <Button label="Annuler" variant="secondary" onPress={() => setConfirm(false)} style={{ flex: 1 }} />
                  <Button label="Repartir de zéro" variant="danger" onPress={onStartFresh} style={{ flex: 1 }} />
                </View>
              </View>
            ) : (
              <Button label="Repartir de zéro" variant="ghost" onPress={() => setConfirm(true)} />
            )}
          </>
        ) : (
          <Button label="Réessayer" icon="refresh-cw" onPress={onRetry} />
        )}
      </View>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper },
  body: { paddingHorizontal: space.xl, gap: space.md },
  icon: { width: 56, height: 56, borderRadius: radius.lg, backgroundColor: c.fill, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  title: { ...t.title, fontFamily: font.semibold, color: c.ink },
  p: { ...t.body, fontFamily: font.regular, color: c.ink2 },
  actions: { gap: space.sm, marginTop: space.lg },
  confirm: { gap: space.sm, padding: space.md, borderRadius: radius.lg, backgroundColor: c.surface },
  ask: { ...t.body, fontFamily: font.medium, color: c.ink },
  row: { flexDirection: 'row', gap: space.sm },
});
