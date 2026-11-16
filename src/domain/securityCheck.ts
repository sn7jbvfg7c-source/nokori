/**
 * Diagnostic de sécurité (Réglages › Vérifier la protection) : logique pure, testée sans téléphone.
 *
 * Règle absolue : le diagnostic ne manipule JAMAIS la clé, la phrase secrète ni les données financières.
 * Il ne reçoit que des constats (vrai/faux, numéro de version de SQLCipher, durées) et les traduit en phrases claires.
 * Rien ne quitte le téléphone.
 */
import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';

/** Constats sur le stockage, sans aucune donnée : c'est tout ce que storageReport() a le droit de renvoyer */
export interface StorageReport {
  platform: 'telephone' | 'navigateur';
  /** version de SQLCipher annoncée par la base (null : absente ou illisible) */
  cipherVersion: string | null;
  /** le fichier de la base commence-t-il par l'en-tête d'un SQLite NON chiffré ? (null : non lu) */
  fileHeaderPlain: boolean | null;
  keyPresent: boolean;
  keyWellFormed: boolean;
}
export const STORAGE_REPORT_FIELDS: (keyof StorageReport)[] = ['platform', 'cipherVersion', 'fileHeaderPlain', 'keyPresent', 'keyWellFormed'];

/** Les 16 premiers octets d'un fichier SQLite non chiffré : « SQLite format 3 » suivi d'un octet nul */
export const SQLITE_PLAIN_HEADER = 'SQLite format 3\u0000';
export const isPlainSqliteHeader = (bytes: Uint8Array) =>
  bytes.length >= 16 && Array.from(bytes.slice(0, 16), b => String.fromCharCode(b)).join('') === SQLITE_PLAIN_HEADER;

const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');

/**
 * Vecteurs officiels recalculés par le moteur JavaScript de CE téléphone (Hermes, JavaScriptCore ou navigateur) :
 * scrypt RFC 7914 (petit vecteur) et AES-256-GCM (cas 14). Aucune donnée de l'utilisateur n'est utilisée.
 */
export async function cryptoSelfTest(): Promise<boolean> {
  try {
    const k = await scryptAsync(new Uint8Array(0), new Uint8Array(0), { N: 16, r: 1, p: 1, dkLen: 64 });
    const okScrypt = toHex(k) === '77d6576238657b203b19ca42c18a0497f16b4844e3074ae8dfdffa3fede21442fcd0069ded0948f8326a753a0fc81f17e8d3e0fb2e0d3628cf35e20c38d18906';
    const sealed = gcm(new Uint8Array(32), new Uint8Array(12)).encrypt(new Uint8Array(16));
    const okGcm = toHex(sealed) === 'cea7403d4d606b6e074ec5d3baf39d18d0d1c8a799996bf0265b98b5d48ab919';
    return okScrypt && okGcm;
  } catch { return false; }
}

/** Durée (ms) d'une dérivation scrypt au réglage des sauvegardes, avec une phrase et un sel factices */
export async function scryptDuration(N: number, now: () => number = () => Date.now()): Promise<number> {
  const start = now();
  await scryptAsync(new TextEncoder().encode('mesure de vitesse'), new Uint8Array(16), { N, r: 8, p: 1, dkLen: 32, maxmem: 128 * 8 * (N + 2) });
  return now() - start;
}

export type CheckStatus = 'ok' | 'attention' | 'info';
export interface Check { id: string; status: CheckStatus; title: string; text: string }

export interface CheckInput {
  report: StorageReport;
  selfTestOk: boolean;
  lock: boolean;
  lastBackup?: string;
  /** date du jour AAAA-MM-JJ, pour l'ancienneté de la sauvegarde */
  today: string;
}

const daysBetween = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86_400_000);

/** Traduit les constats en phrases compréhensibles. Ne reçoit ni ne produit aucune donnée sensible. */
export function securityChecks({ report, selfTestOk, lock, lastBackup, today }: CheckInput): Check[] {
  const phone = report.platform === 'telephone';
  const out: Check[] = [];

  if (!phone) {
    out.push({ id: 'chiffrement', status: 'attention', title: 'Données en clair dans ce navigateur',
      text: 'La version web est une version de test : vos chiffres sont enregistrés dans ce navigateur sans chiffrement. Sur iPhone et Android, ils sont chiffrés.' });
  } else if (report.cipherVersion && report.fileHeaderPlain === false) {
    out.push({ id: 'chiffrement', status: 'ok', title: 'Données chiffrées sur ce téléphone',
      text: `La base de données est chiffrée par SQLCipher (version ${report.cipherVersion}). Son fichier est illisible sans la clé, même si quelqu’un le copiait.` });
  } else if (report.cipherVersion && report.fileHeaderPlain === null) {
    out.push({ id: 'chiffrement', status: 'attention', title: 'Chiffrement actif, fichier non vérifié',
      text: `SQLCipher (version ${report.cipherVersion}) est actif, mais le fichier de la base n’a pas pu être relu pour le confirmer. Réessayez plus tard.` });
  } else {
    out.push({ id: 'chiffrement', status: 'attention', title: 'Chiffrement non confirmé',
      text: 'Le chiffrement de la base n’a pas pu être confirmé sur ce téléphone. Faites une sauvegarde et contactez le support.' });
  }

  if (phone) {
    out.push(report.keyPresent && report.keyWellFormed
      ? { id: 'cle', status: 'ok', title: 'Clé rangée dans le trousseau du téléphone',
        text: 'La clé qui ouvre vos données est rangée dans l’espace sécurisé du téléphone, réservée à cet appareil. Elle ne part ni dans iCloud ni sur un autre téléphone, et n’est jamais affichée.' }
      : { id: 'cle', status: 'attention', title: 'Clé de chiffrement introuvable',
        text: 'La clé qui ouvre vos données n’a pas été trouvée. Ne désinstallez pas l’app : faites une sauvegarde si c’est encore possible, puis contactez le support.' });
  }

  out.push(selfTestOk
    ? { id: 'calculs', status: 'ok', title: 'Calculs de chiffrement corrects',
      text: 'Les calculs qui protègent vos sauvegardes (scrypt et AES-256-GCM) donnent sur cet appareil exactement les résultats attendus par les normes.' }
    : { id: 'calculs', status: 'attention', title: 'Calculs de chiffrement incorrects',
      text: 'Les calculs de chiffrement ne donnent pas les résultats attendus sur cet appareil. N’utilisez pas la sauvegarde et contactez le support.' });

  out.push(!phone
    ? { id: 'verrou', status: 'info', title: 'Verrouillage indisponible dans le navigateur', text: 'Le verrouillage par Face ID ou empreinte n’existe que sur téléphone.' }
    : lock
      ? { id: 'verrou', status: 'ok', title: 'Verrouillage activé', text: 'Nokori demande Face ID, l’empreinte ou le code du téléphone à l’ouverture et après une minute en arrière-plan. Il protège l’écran : gardez aussi un code sur votre téléphone.' }
      : { id: 'verrou', status: 'info', title: 'Verrouillage désactivé', text: 'Vous pouvez l’activer dans Réglages › Sécurité et rappels, pour que Nokori demande Face ID ou l’empreinte à l’ouverture.' });

  const age = lastBackup ? daysBetween(lastBackup, today) : null;
  out.push(age === null
    ? { id: 'sauvegarde', status: 'attention', title: 'Aucune sauvegarde', text: 'Si ce téléphone est perdu ou cassé, vos données le seront aussi. Créez une sauvegarde chiffrée dans Réglages › Sauvegarde et restauration.' }
    : age > 30
      ? { id: 'sauvegarde', status: 'attention', title: `Dernière sauvegarde il y a ${age} jours`, text: 'Pensez à en refaire une : elle ne contient que ce qui existait ce jour-là.' }
      : { id: 'sauvegarde', status: 'ok', title: age === 0 ? 'Sauvegarde faite aujourd’hui' : `Sauvegarde faite il y a ${age} jour${age > 1 ? 's' : ''}`, text: 'Gardez le fichier et sa phrase secrète en lieu sûr : sans la phrase, personne ne peut l’ouvrir.' });

  out.push({ id: 'reseau', status: 'info', title: 'Rien n’est envoyé', text: 'Nokori n’a ni compte, ni serveur, ni publicité. Ce diagnostic lui-même reste sur votre appareil.' });
  return out;
}
