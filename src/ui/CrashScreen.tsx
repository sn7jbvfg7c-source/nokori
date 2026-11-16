/**
 * Écran affiché quand un écran plante pendant son affichage (ErrorBoundary d'Expo Router), au lieu d'un écran blanc.
 *
 * - Il ne lit ni n'écrit AUCUNE donnée : « Réessayer » réaffiche l'écran ; à la racine, l'app relit le stockage sans rien
 *   écrire tant que les données ne sont pas chargées (AppState).
 * - Rien n'est envoyé nulle part (l'app n'a pas de réseau).
 * - Les détails techniques sont masqués par défaut et nettoyés : les textes entre guillemets et les nombres sont retirés,
 *   pour qu'aucune donnée (libellé, montant) ne puisse s'y retrouver.
 * - `standalone` : variante pour la racine, utilisable même si le thème, les polices ou les données n'ont pas pu se charger.
 */
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import type { ErrorBoundaryProps } from 'expo-router';
import { useRouter } from 'expo-router';
import { useColors } from '../theme/theme';
import { dark, light, radius, size, space, type Palette } from '../theme/tokens';

/** Message d'erreur sans données : guillemets et nombres retirés, longueur bornée */
export function safeErrorText(error: unknown): string {
  const e = error instanceof Error ? error : new Error(String(error));
  const msg = (e.message || '').replace(/"[^"]*"|'[^']*'|«[^»]*»|“[^”]*”/g, '"…"').replace(/\d[\d\s.,]*/g, '#').slice(0, 200);
  return `${e.name || 'Error'} : ${msg}`.trim();
}

export function CrashScreen({ error, retry, onClose, standalone = false, palette }: { error: unknown; retry: () => void | Promise<void>; onClose?: () => void; standalone?: boolean; palette?: Palette }) {
  const scheme = useColorScheme();
  const c: Palette = palette ?? (scheme === 'dark' ? dark : light);
  const [details, setDetails] = useState(false);
  // à la racine, les polices peuvent ne pas être chargées : police du système
  const f = (weight: '400' | '600') => (standalone ? { fontWeight: weight } : { fontFamily: weight === '600' ? 'Geist_600SemiBold' : 'Geist_400Regular' });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.paper }} contentContainerStyle={st.wrap}>
      <View role="alert" accessibilityLiveRegion="assertive" style={{ gap: space.md }}>
        <View style={[st.icon, { backgroundColor: c.fill }]} aria-hidden><Feather name="alert-triangle" size={24} color={c.ink2} /></View>
        <Text style={[st.title, f('600'), { color: c.ink }]} role="heading" aria-level={1}>Un problème est survenu</Text>
        <Text style={[st.p, f('400'), { color: c.ink2 }]}>
          Cet écran n’a pas pu s’afficher. Vos données n’ont pas été touchées : elles restent enregistrées sur cet appareil.
        </Text>
      </View>
      <Pressable onPress={() => { retry(); }} role="button" accessibilityLabel="Réessayer" style={({ pressed }) => [st.btn, { backgroundColor: c.btn, opacity: pressed ? 0.85 : 1 }]}>
        <Text style={[st.btnTxt, f('600'), { color: c.onBtn }]}>Réessayer</Text>
      </Pressable>
      {onClose && (
        <Pressable onPress={onClose} role="button" accessibilityLabel="Fermer cet écran" style={({ pressed }) => [st.btn, { backgroundColor: c.fill, opacity: pressed ? 0.85 : 1 }]}>
          <Text style={[st.btnTxt, f('600'), { color: c.ink }]}>Fermer cet écran</Text>
        </Pressable>
      )}
      <Pressable onPress={() => setDetails(d => !d)} role="button" accessibilityLabel={details ? 'Masquer les détails techniques' : 'Afficher les détails techniques'} aria-expanded={details} style={st.link}>
        <Text style={[st.small, f('400'), { color: c.ink2, textDecorationLine: 'underline' }]}>{details ? 'Masquer les détails techniques' : 'Détails techniques'}</Text>
      </Pressable>
      {details && (
        <Text selectable style={[st.small, { color: c.ink2, fontFamily: undefined }]}>
          {safeErrorText(error)}{'\n'}Si le problème revient, décrivez ce que vous faisiez au support, sans envoyer vos montants.
        </Text>
      )}
    </ScrollView>
  );
}

const st = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: space.xl, paddingTop: space.xxxl, gap: space.md, maxWidth: 480, width: '100%', alignSelf: 'center' },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 28 },
  p: { fontSize: 15, lineHeight: 21 },
  btn: { minHeight: size.button, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  btnTxt: { fontSize: 16 },
  link: { minHeight: size.touch, justifyContent: 'center', alignSelf: 'flex-start' },
  small: { fontSize: 13, lineHeight: 18 },
});

/** Racine : thème, polices et données peuvent manquer, l'écran se suffit à lui-même */
export function RootCrash(props: ErrorBoundaryProps) {
  return <CrashScreen error={props.error} retry={props.retry} standalone />;
}

/** Onglet : sous le verrou et dans le thème de l'app ; la barre d'onglets reste utilisable */
export function TabCrash(props: ErrorBoundaryProps) {
  return <CrashScreen error={props.error} retry={props.retry} palette={useColors()} />;
}

/** Fenêtre (dépense, réglages, sauvegarde, pages légales) : on peut aussi la fermer */
export function ModalCrash(props: ErrorBoundaryProps) {
  const router = useRouter();
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  return <CrashScreen error={props.error} retry={props.retry} palette={useColors()} onClose={close} />;
}
