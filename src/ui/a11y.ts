import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/** Suit un réglage d'accessibilité du téléphone (valeur initiale puis changements en direct) */
function useA11ySetting(read: () => Promise<boolean>, event: 'reduceMotionChanged' | 'screenReaderChanged') {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    read().then(v => { if (alive) setOn(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener(event, v => setOn(!!v));
    return () => { alive = false; sub.remove(); };
  }, [read, event]);
  return on;
}

/** « Réduire les animations » est activé sur le téléphone */
export const useReducedMotion = () => useA11ySetting(AccessibilityInfo.isReduceMotionEnabled, 'reduceMotionChanged');
/** VoiceOver ou TalkBack est actif (le web répond toujours « oui » : on ne s'y fie pas) */
const noReader = () => Promise.resolve(false);
export const useScreenReader = () => useA11ySetting(Platform.OS === 'web' ? noReader : AccessibilityInfo.isScreenReaderEnabled, 'screenReaderChanged');

/** Grands chiffres : ils grossissent avec la taille du texte du téléphone, mais pas au point de casser la mise en page */
export const BIG_TEXT_MAX_SCALE = 1.3;
