import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatEurosRound } from '../domain/money';
import { capitalize, MONTH_COLORS, MONTH_NAMES } from '../domain/months';
import type { Review } from '../domain/review';
import { font, pillarColor } from '../theme/tokens';

const N = 5, SLIDE_MS = 4000;

/** Le mois clos en 5 écrans : avance seule toutes les 4 s, touchez à gauche ou à droite pour naviguer */
export function MonthStory({ r, note, visible, onClose }: { r: Review; note: string; visible: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [i, setI] = useState(0);
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) { setPrevVisible(visible); if (visible) setI(0); } // repart du début à chaque ouverture
  useEffect(() => {
    if (!visible || i >= N - 1) return;
    const t = setTimeout(() => setI(x => Math.min(N - 1, x + 1)), SLIDE_MS);
    return () => clearTimeout(t);
  }, [visible, i]);
  const c = MONTH_COLORS[r.month], name = MONTH_NAMES[r.month], next = MONTH_NAMES[(r.month + 1) % 12];
  const max = Math.max(1, ...r.pillars.map(p => p.spent));

  const slides = [
    <View key={0} style={st.slide}><Text style={st.kanji}>{c.kanji}</Text><Text style={st.small}>{capitalize(name)}, {c.name}</Text><Text style={st.h2}>Votre mois,{'\n'}en une minute.</Text></View>,
    <View key={1} style={st.slide}>
      <Text style={st.small}>Vous avez épargné</Text>
      <Text style={st.big} accessibilityLabel={`Épargné : ${formatEurosRound(r.savedTotal)}`}>{formatEurosRound(r.savedTotal)}</Text>
      <Text style={st.p}>{Math.round(r.savedPct * 100)} % du revenu. {r.left > 0 ? `Les ${formatEurosRound(r.left)} non dépensés comptent aussi comme épargne.` : r.left < 0 ? `Le budget a été dépassé de ${formatEurosRound(-r.left)}.` : ''}</Text>
    </View>,
    <View key={2} style={st.slide}>
      <Text style={st.small}>Le pilier qui a le plus pesé</Text>
      <Text style={st.h2}>{r.top?.name ?? '—'}</Text>
      <View style={{ gap: 12, marginTop: 14 }}>
        {r.pillars.map(p => (
          <View key={p.id} style={st.pRow}>
            <Text style={st.pName}>{p.name}</Text>
            <View style={st.pBar}><View style={{ height: 10, borderRadius: 6, width: `${(p.spent / max) * 100}%`, backgroundColor: p.id === 'besoins' ? '#FFF6EC' : pillarColor[p.id] }} /></View>
            <Text style={st.pVal}>{formatEurosRound(p.spent)}</Text>
          </View>
        ))}
      </View>
    </View>,
    <View key={3} style={st.slide}>
      <Text style={st.small}>Votre idée pour faire mieux</Text>
      <Text style={st.quote}>{note.trim() ? `« ${note.trim()} »` : 'Pas encore de note pour ce mois. Vous pouvez l’écrire dans le bilan, question 4.'}</Text>
    </View>,
    <View key={4} style={st.slide}>
      <Text style={st.small}>Les quatre questions</Text>
      {([['Reçu', r.income], ['Épargné', r.savedTotal], ['Dépensé', r.spent]] as [string, number][]).map(([l, v]) => (
        <View key={l} style={st.qRow}><Text style={st.qL}>{l}</Text><Text style={st.qV}>{formatEurosRound(v)}</Text></View>
      ))}
      <View style={st.qRow}><Text style={st.qL}>Faire mieux</Text><Text style={st.qV} numberOfLines={1}>{note.trim() ? 'noté' : '—'}</Text></View>
      <Pressable onPress={onClose} style={st.go} accessibilityRole="button"><Text style={st.goTxt}>Préparer {next}</Text></Pressable>
    </View>,
  ];

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <LinearGradient colors={[c.light, c.dark, '#1E1712']} locations={[0, 0.6, 1]} style={[st.root, { paddingTop: insets.top + 10 }]} accessibilityViewIsModal accessibilityLabel={`Bilan de ${name} en story`}>
        <View style={st.bars}>{Array.from({ length: N }, (_, k) => <View key={k} style={st.barBg}><View style={[st.barFill, { width: k <= i ? '100%' : '0%', opacity: k < i ? 1 : k === i ? 0.95 : 0 }]} /></View>)}</View>
        <Pressable onPress={onClose} style={st.close} accessibilityRole="button" accessibilityLabel="Fermer la story"><Text style={st.closeTxt}>×</Text></Pressable>
        <Pressable style={st.tapL} onPress={() => setI(x => Math.max(0, x - 1))} accessibilityRole="button" accessibilityLabel="Écran précédent" />
        <Pressable style={st.tapR} onPress={() => setI(x => Math.min(N - 1, x + 1))} accessibilityRole="button" accessibilityLabel="Écran suivant" />
        <View style={[st.body, { paddingBottom: insets.bottom + 30 }]} pointerEvents="box-none">{slides[i]}</View>
      </LinearGradient>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  bars: { flexDirection: 'row', gap: 4, paddingHorizontal: 16 },
  barBg: { flex: 1, height: 3, borderRadius: 3, backgroundColor: 'rgba(255,246,236,0.3)', overflow: 'hidden' },
  barFill: { height: 3, backgroundColor: '#FFF6EC' },
  close: { position: 'absolute', right: 14, top: 56, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,246,236,0.16)', alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  closeTxt: { color: '#FFF6EC', fontSize: 22, lineHeight: 24 },
  tapL: { position: 'absolute', left: 0, top: 110, bottom: 160, width: '35%', zIndex: 2 },
  tapR: { position: 'absolute', right: 0, top: 110, bottom: 160, width: '35%', zIndex: 2 },
  body: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  slide: { gap: 10 },
  kanji: { color: '#FFF6EC', fontSize: 110, lineHeight: 120 },
  small: { color: 'rgba(255,246,236,0.78)', fontFamily: font.medium, fontSize: 13, letterSpacing: 1.2, textTransform: 'uppercase' },
  h2: { color: '#FFF6EC', fontFamily: font.semibold, fontSize: 38, lineHeight: 42, letterSpacing: -1.4 },
  big: { color: '#FFF6EC', fontFamily: font.semibold, fontSize: 76, letterSpacing: -3.5 },
  p: { color: 'rgba(255,246,236,0.92)', fontFamily: font.regular, fontSize: 16, lineHeight: 23 },
  pRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pName: { width: 78, color: '#FFF6EC', fontFamily: font.medium, fontSize: 14 },
  pBar: { flex: 1, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,246,236,0.14)', overflow: 'hidden' },
  pVal: { width: 70, textAlign: 'right', color: '#FFF6EC', fontFamily: font.semibold, fontSize: 14 },
  quote: { color: '#FFF6EC', fontFamily: font.medium, fontSize: 24, lineHeight: 32, letterSpacing: -0.5 },
  qRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,246,236,0.16)' },
  qL: { color: '#FFF6EC', fontFamily: font.regular, fontSize: 16 },
  qV: { color: '#FFF6EC', fontFamily: font.semibold, fontSize: 16 },
  go: { marginTop: 22, height: 52, borderRadius: 16, backgroundColor: '#FFF6EC', alignItems: 'center', justifyContent: 'center', zIndex: 4 },
  goTxt: { color: '#3E2114', fontFamily: font.semibold, fontSize: 16 },
});
