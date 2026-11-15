/**
 * Traceurs facultatifs (mesure d'audience, publicité, outils tiers…) et consentement.
 *
 * ÉTAT RÉEL AU 16/11/2026 : AUCUN. L'app ne dépose aucun cookie et n'utilise aucun traceur soumis à consentement ;
 * seul le stockage local strictement nécessaire au service est utilisé (exempté de consentement, CNIL).
 * Le bandeau ne s'affiche donc pas : il n'y a rien à accepter ni à refuser. Afficher un faux choix serait trompeur.
 *
 * Si un traceur facultatif est ajouté un jour : le déclarer ici. Le bandeau (Tout accepter / Tout refuser / Personnaliser)
 * s'affichera alors automatiquement, AVANT tout dépôt, et le traceur ne devra être chargé que si isAllowed(id) est vrai.
 */

export interface Tracker {
  id: string;
  name: string;
  /** à quoi il sert, en une phrase */
  purpose: string;
  /** qui le fournit et où vont les données */
  provider: string;
}

/** Traceurs facultatifs réellement utilisés : aucun. */
export const OPTIONAL_TRACKERS: Tracker[] = [];

/** Version du bandeau : à augmenter si la liste change, pour redemander le choix */
export const CONSENT_VERSION = 1;

export interface ConsentChoice {
  v: number;
  /** date du choix (AAAA-MM-JJ) */
  date: string;
  /** traceur → autorisé ; rien n'est autorisé par défaut */
  allowed: Record<string, boolean>;
}

/** Faut-il (re)demander ? Seulement s'il existe des traceurs facultatifs et pas de choix valide pour cette version. */
export const needsConsent = (trackers: Tracker[], choice: ConsentChoice | undefined) => trackers.length > 0 && (!choice || choice.v !== CONSENT_VERSION);

/** Un traceur facultatif n'est autorisé que par un choix explicite (jamais par défaut, jamais avant le choix) */
export const isAllowed = (id: string, choice: ConsentChoice | undefined) => !!choice && choice.v === CONSENT_VERSION && choice.allowed[id] === true;

export const choiceAll = (trackers: Tracker[], allow: boolean, date: string): ConsentChoice =>
  ({ v: CONSENT_VERSION, date, allowed: Object.fromEntries(trackers.map(t => [t.id, allow])) });

export const choiceCustom = (trackers: Tracker[], allowed: Record<string, boolean>, date: string): ConsentChoice =>
  ({ v: CONSENT_VERSION, date, allowed: Object.fromEntries(trackers.map(t => [t.id, allowed[t.id] === true])) });
