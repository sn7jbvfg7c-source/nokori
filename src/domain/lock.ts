/**
 * Décision du verrouillage après une tentative de déverrouillage (logique pure, testée sans téléphone).
 *
 * Règle : on ne désactive JAMAIS le verrou sur une erreur passagère (capteur indisponible, annulation, trop d'essais…).
 * On ne le désactive que si le téléphone n'a vraiment plus aucune protection (ni code, ni biométrie) : le verrou ne
 * protégerait plus rien et enfermerait l'utilisateur dehors. Dans ce cas, l'utilisateur en est informé durablement.
 * En cas de doute (état du téléphone illisible), le verrou reste en place : le code du téléphone reste accepté en secours.
 */

/** Protection configurée sur le téléphone, d'après LocalAuthentication.getEnrolledLevelAsync() */
export type DeviceSecurity = 'aucune' | 'code' | 'biometrie' | 'inconnue';

export type LockOutcome =
  | { kind: 'deverrouille' }
  | { kind: 'reste-verrouille'; message: string | null }
  | { kind: 'desactive' };

/** Niveaux de expo-local-authentication : 0 aucun, 1 code (SECRET), 2 ou 3 biométrie ; null si la lecture a échoué */
export function securityFromLevel(level: number | null | undefined): DeviceSecurity {
  if (level === 0) return 'aucune';
  if (level === 1) return 'code';
  if (level === 2 || level === 3) return 'biometrie';
  return 'inconnue';
}

/** Erreurs qui PEUVENT signifier « plus aucune protection » : à confirmer par l'état réel du téléphone */
const MAYBE_NO_SECURITY = new Set(['not_enrolled', 'passcode_not_set', 'not_available']);

export const LOCK_MESSAGES = {
  indisponible: 'Capteur momentanément indisponible. Réessayez, ou utilisez le code du téléphone.',
  pasDeBiometrie: 'Aucune biométrie enregistrée sur ce téléphone : utilisez son code.',
  tropDEssais: 'Trop d’essais. Utilisez le code du téléphone, ou réessayez dans un moment.',
  nonReconnu: 'Non reconnu. Réessayez.',
  delai: 'Délai dépassé. Réessayez.',
  echec: 'Le déverrouillage n’a pas abouti. Réessayez.',
} as const;

export function lockOutcome(result: { success: boolean; error?: string }, security: DeviceSecurity): LockOutcome {
  if (result.success) return { kind: 'deverrouille' };
  const e = result.error ?? 'unknown';
  if (MAYBE_NO_SECURITY.has(e)) {
    if (security === 'aucune') return { kind: 'desactive' };
    return { kind: 'reste-verrouille', message: e === 'not_enrolled' ? LOCK_MESSAGES.pasDeBiometrie : LOCK_MESSAGES.indisponible };
  }
  switch (e) {
    case 'user_cancel': case 'system_cancel': case 'app_cancel': case 'user_fallback': return { kind: 'reste-verrouille', message: null };
    case 'lockout': return { kind: 'reste-verrouille', message: LOCK_MESSAGES.tropDEssais };
    case 'authentication_failed': return { kind: 'reste-verrouille', message: LOCK_MESSAGES.nonReconnu };
    case 'timeout': return { kind: 'reste-verrouille', message: LOCK_MESSAGES.delai };
    default: return { kind: 'reste-verrouille', message: LOCK_MESSAGES.echec };
  }
}

/** Texte de l'avis conservé après une désactivation automatique (date AAAA-MM-JJ) */
export function lockOffNotice(isoDate: string, monthNames: string[]): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `Le verrouillage a été désactivé le ${d} ${monthNames[m - 1]} ${y} : ce téléphone n’avait plus ni code ni biométrie. Ajoutez-en un dans les réglages du téléphone, puis réactivez le verrouillage dans Réglages.`;
}
