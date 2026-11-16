/**
 * Informations légales de l'éditeur, en un seul endroit.
 * RÈGLE : rien n'est inventé. Une valeur inconnue reste `null` et s'affiche « [À compléter : …] »
 * dans l'app et dans les documents, pour que le propriétaire voie exactement ce qui manque.
 * Liste des champs manquants : missingLegalFields() (affichée aussi dans docs/A-COMPLETER.md).
 */

export interface Editor {
  /** nom et prénom (particulier) ou dénomination sociale (entreprise) */
  name: string | null;
  /** « particulier » : personne physique non professionnelle ; « professionnel » : entreprise individuelle ou société */
  status: 'particulier' | 'professionnel' | null;
  /** professionnel : forme juridique (EI, micro-entreprise, SAS, SARL…) et capital social pour une société */
  legalForm: string | null;
  /** adresse (domicile pour un particulier, siège pour une société) */
  address: string | null;
  /**
   * Particulier seulement : rester anonyme (LCEN, art. 1-1 II). On ne publie alors que le nom et l'adresse de l'hébergeur,
   * à condition de lui avoir communiqué son identité. null = pas encore décidé.
   */
  anonymous: boolean | null;
  /** professionnel : numéro SIRET (ou RCS / RNE) */
  siret: string | null;
  /** professionnel assujetti : numéro de TVA intracommunautaire */
  vatNumber: string | null;
  /** adresse e-mail de contact (exercice des droits, assistance) */
  email: string | null;
  /** téléphone (exigé par la LCEN, art. 1-1 I, sauf anonymat d'un particulier) */
  phone: string | null;
  /** directeur ou directrice de la publication (en général l'éditeur lui-même) */
  publicationDirector: string | null;
}

export interface Host {
  name: string | null;
  address: string | null;
  contact: string | null;
  /** durée de conservation des journaux de connexion (adresse IP…) chez l'hébergeur */
  logRetention: string | null;
}

export const LEGAL: {
  appName: string;
  editor: Editor;
  /** hébergeur de la version web de test (nokori.expo.app) */
  webHost: Host;
  /** date de mise à jour des documents (AAAA-MM-JJ) */
  updated: string;
  /** médiateur de la consommation (seulement si des services payants sont un jour vendus par un professionnel) */
  consumerMediator: string | null;
} = {
  appName: 'Nokori',
  editor: {
    name: null,
    status: null,
    legalForm: null,
    address: null,
    anonymous: null,
    siret: null,
    vatNumber: null,
    email: null,
    phone: null,
    publicationDirector: null,
  },
  webHost: {
    // EAS Hosting d'Expo (raison sociale relevée sur expo.dev/privacy et expo.dev/terms, novembre 2026)
    name: '650 Industries, Inc. (Expo)',
    // adresse postale introuvable sur les pages publiques d'Expo : à demander à Expo
    address: null,
    // la LCEN demande un numéro de téléphone ; seul un formulaire est public (expo.dev/contact)
    contact: null,
    // non publiée par Expo : à demander
    logRetention: null,
  },
  updated: '2026-11-15',
  consumerMediator: null,
};

/** Valeur à afficher : la valeur réelle, ou un repère visible « [À compléter : …] » */
export const val = (v: string | null | undefined, label: string): string => (v && v.trim() ? v : `[À compléter : ${label}]`);

export const TO_COMPLETE = /\[À compléter\s:\s[^\]]+\]/;

/** Champs à fournir par le propriétaire, selon son statut */
export function missingLegalFields(cfg = LEGAL): string[] {
  const e = cfg.editor, out: string[] = [];
  const anonymous = e.status === 'particulier' && e.anonymous === true;
  if (!e.status) out.push('Statut de l’éditeur : particulier ou professionnel');
  if (e.status === 'particulier' && e.anonymous === null) out.push('Particulier : publier votre identité, ou rester anonyme (LCEN art. 1-1 II : seul l’hébergeur est alors indiqué, après lui avoir confié votre identité)');
  if (!anonymous) {
    if (!e.name) out.push('Nom et prénoms (ou dénomination sociale) de l’éditeur');
    if (!e.address) out.push(e.status === 'professionnel' ? 'Adresse du siège social' : 'Adresse du domicile');
    if (!e.phone) out.push('Numéro de téléphone de l’éditeur');
    if (!e.publicationDirector) out.push('Directeur ou directrice de la publication');
  }
  if (!e.email) out.push('Adresse e-mail de contact (exercice des droits, assistance)');
  if (e.status !== 'particulier') {
    if (!e.legalForm) out.push('Forme juridique (et capital social pour une société)');
    if (!e.siret) out.push('Numéro d’inscription (SIRET, RCS ou RNE)');
    if (!e.vatNumber) out.push('Numéro de TVA intracommunautaire (si assujetti)');
    if (!cfg.consumerMediator) out.push('Médiateur de la consommation (professionnel : obligatoire dès qu’un contrat est conclu avec des consommateurs)');
  }
  if (!cfg.webHost.name) out.push('Hébergeur de la version web : dénomination');
  if (!cfg.webHost.address) out.push('Hébergeur de la version web (Expo, 650 Industries, Inc.) : adresse postale, à demander à Expo');
  if (!cfg.webHost.logRetention) out.push('Hébergeur de la version web : durée de conservation des journaux de connexion, à demander à Expo');
  if (!cfg.webHost.contact) out.push('Hébergeur de la version web : numéro de téléphone (la LCEN l’exige ; Expo ne publie qu’un formulaire)');
  return out;
}
