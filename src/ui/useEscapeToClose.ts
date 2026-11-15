/**
 * Version web : la touche Échap ferme la fenêtre en cours (dépense, réglages, sauvegarde, documents).
 * Seule la fenêtre du dessus réagit : un document ouvert depuis les réglages se ferme seul, les réglages restent.
 */
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

export function useEscapeToClose(onClose: () => void) {
  const focused = useIsFocused();
  const ref = useRef(onClose);
  useEffect(() => { ref.current = onClose; });
  useEffect(() => {
    if (Platform.OS !== 'web' || !focused) return;
    const w = globalThis as unknown as { addEventListener: (t: string, f: (e: KeyboardEvent) => void) => void; removeEventListener: (t: string, f: (e: KeyboardEvent) => void) => void };
    const f = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current(); };
    w.addEventListener('keydown', f);
    return () => w.removeEventListener('keydown', f);
  }, [focused]);
}
