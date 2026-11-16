/**
 * Force de la phrase secrète d'une sauvegarde (création seulement : l'ouverture d'un fichier n'applique AUCUNE règle,
 * pour que les sauvegardes créées avec les anciennes règles restent restaurables).
 *
 * Règle : 12 caractères au moins, pas de phrase évidente (suite de touches ou de chiffres, répétition, mot de passe courant).
 * La jauge distingue « faible » (refusée), « correcte » et « excellente ». Pas de bibliothèque externe : quelques règles
 * simples et testées suffisent pour écarter les phrases qu'un attaquant essaierait en premier.
 */

export const MIN_PASSPHRASE = 12;

export type PassphraseLevel = 'faible' | 'correcte' | 'excellente';
export interface PassphraseStrength { level: PassphraseLevel; problem: string | null }

/** Mots de passe parmi les plus utilisés (français et anglais), comparés sans accents, espaces ni chiffres autour */
const COMMON = new Set([
  'motdepasse', 'monmotdepasse', 'password', 'passw0rd', 'passphrase', 'azerty', 'azertyuiop', 'qwerty', 'qwertyuiop', 'wxcvbn',
  'soleil', 'bonjour', 'bonsoir', 'salut', 'coucou', 'doudou', 'chouchou', 'loulou', 'cheval', 'chocolat', 'princesse', 'jetaime',
  'iloveyou', 'marseille', 'paris', 'football', 'liverpool', 'arsenal', 'dragon', 'monkey', 'sunshine', 'princess', 'welcome',
  'admin', 'administrateur', 'utilisateur', 'secret', 'motdepassesecret', 'nokori', 'kakeibo', 'sauvegarde', 'budget', 'banque',
  'abc', 'abcdef', 'abcdefgh', 'letmein', 'master', 'trustno', 'starwars', 'pokemon', 'naruto', 'superman', 'batman',
]);

/** Rangées de clavier et suites, à l'endroit et à l'envers (comparées sur la phrase en minuscules, sans espaces) */
const SEQUENCES = ['abcdefghijklmnopqrstuvwxyz', '01234567890123456789', 'azertyuiop', 'qsdfghjklm', 'wxcvbn', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890'];

const simplify = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Part des paires de caractères voisins qui se suivent sur une rangée de clavier ou dans l'alphabet */
function sequentialShare(s: string): number {
  if (s.length < 2) return 1;
  let seq = 0;
  for (let i = 1; i < s.length; i++) {
    const pair = s[i - 1] + s[i], back = s[i] + s[i - 1];
    if (SEQUENCES.some(q => q.includes(pair) || q.includes(back))) seq++;
  }
  return seq / (s.length - 1);
}

/** Vrai si la phrase n'est qu'un motif court répété (« abcabcabcabc », « 1212121212 ») */
function isRepeatedPattern(s: string): boolean {
  for (let n = 1; n <= 4 && n < s.length; n++) {
    const unit = s.slice(0, n);
    if (unit.repeat(Math.ceil(s.length / n)).slice(0, s.length) === s) return true;
  }
  return false;
}

export function passphraseStrength(p: string): PassphraseStrength {
  const chars = [...p];
  if (chars.length < MIN_PASSPHRASE) {
    const missing = MIN_PASSPHRASE - chars.length;
    return { level: 'faible', problem: `Au moins ${MIN_PASSPHRASE} caractères (encore ${missing}). Une phrase de 4 mots ou plus est plus sûre et plus facile à retenir.` };
  }
  const flat = simplify(p).replace(/\s+/g, '');
  const distinct = new Set([...flat]).size;
  if (distinct < 5 || isRepeatedPattern(flat)) return { level: 'faible', problem: 'Trop répétitive : variez les caractères, ou choisissez plusieurs mots.' };
  if (sequentialShare(flat) >= 0.75) return { level: 'faible', problem: 'Trop prévisible : évitez les suites de touches ou de chiffres.' };
  const core = flat.replace(/[^a-z]/g, '');
  if (COMMON.has(core) || COMMON.has(flat) || (core.length > 0 && [...COMMON].some(w => w.length >= 6 && core === w + w))) {
    return { level: 'faible', problem: 'Trop courante : elle fait partie des mots de passe les plus utilisés.' };
  }

  // estimation grossière : variété des caractères × longueur, ou nombre de mots
  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^\p{L}\p{N}]/u].filter(r => r.test(p)).length + (/[^\u0020-\u007E]/.test(p) ? 1 : 0);
  const words = p.split(/[\s\-_.,;:]+/).filter(w => [...w].length >= 3).length;
  const strong = (words >= 4 && chars.length >= 20) || (chars.length >= 16 && classes >= 3 && distinct >= 10);
  return { level: strong ? 'excellente' : 'correcte', problem: null };
}

/** Message bloquant (phrase faible), ou null si la phrase est acceptée */
export const passphraseProblem = (p: string): string | null => passphraseStrength(p).problem;
