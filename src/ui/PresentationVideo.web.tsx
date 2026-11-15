/**
 * Vidéo de présentation (38 s, sans son), version web uniquement : public/presentation.mp4.
 * Fabriquée à partir des vrais écrans de l'app (store/video/film.html), données d'exemple.
 */
import Feather from '@expo/vector-icons/Feather';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

export const presentationAvailable = true;

export function PresentationVideo({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} aria-label="Vidéo de présentation de Nokori">
      <View style={s.back}>
        <video src="/presentation.mp4" poster="/presentation.jpg" controls autoPlay muted playsInline
          aria-label="Présentation de Nokori, 38 secondes, sans son"
          style={{ maxHeight: '86vh', maxWidth: '92vw', aspectRatio: '9 / 16', borderRadius: 18, background: '#000' }} />
        <Pressable onPress={onClose} style={s.close} accessibilityRole="button" accessibilityLabel="Fermer la vidéo">
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  back: { flex: 1, backgroundColor: 'rgba(10,9,8,0.92)', alignItems: 'center', justifyContent: 'center' },
  close: { position: 'absolute', top: 18, right: 18, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
});
