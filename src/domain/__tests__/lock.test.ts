/** B : le verrou ne se désactive jamais sur une erreur passagère, seulement si le téléphone n'a plus aucune protection */
import { decodeState, encode, EMPTY } from '../../data/persist';
import { lockOffNotice, lockOutcome, LOCK_MESSAGES, securityFromLevel, type DeviceSecurity } from '../lock';
import { MONTH_NAMES } from '../months';

const ALL_ERRORS = ['not_enrolled', 'user_cancel', 'app_cancel', 'not_available', 'lockout', 'no_space', 'timeout', 'unable_to_process',
  'unknown', 'system_cancel', 'user_fallback', 'invalid_context', 'passcode_not_set', 'authentication_failed', undefined];
const SECURITIES: DeviceSecurity[] = ['aucune', 'code', 'biometrie', 'inconnue'];

describe('décision du verrouillage', () => {
  test('succès : déverrouillé, quel que soit l’état du téléphone', () => {
    for (const s of SECURITIES) expect(lockOutcome({ success: true }, s)).toEqual({ kind: 'deverrouille' });
  });
  test('aucune erreur ne désactive le verrou tant que le téléphone a un code ou une biométrie, ou que son état est inconnu', () => {
    for (const error of ALL_ERRORS) for (const s of ['code', 'biometrie', 'inconnue'] as DeviceSecurity[]) {
      expect(lockOutcome({ success: false, error }, s).kind).toBe('reste-verrouille');
    }
  });
  test('capteur indisponible avec un code sur le téléphone : reste verrouillé, message clair (cas qui désactivait le verrou en silence)', () => {
    expect(lockOutcome({ success: false, error: 'not_available' }, 'code')).toEqual({ kind: 'reste-verrouille', message: LOCK_MESSAGES.indisponible });
    expect(lockOutcome({ success: false, error: 'not_available' }, 'inconnue').kind).toBe('reste-verrouille');
  });
  test('plus ni code ni biométrie : désactivation (le verrou n’aurait plus rien à protéger)', () => {
    for (const error of ['not_enrolled', 'passcode_not_set', 'not_available']) expect(lockOutcome({ success: false, error }, 'aucune')).toEqual({ kind: 'desactive' });
  });
  test('les autres erreurs ne désactivent jamais, même sans protection détectée', () => {
    for (const error of ['user_cancel', 'lockout', 'authentication_failed', 'timeout', 'unknown']) expect(lockOutcome({ success: false, error }, 'aucune').kind).toBe('reste-verrouille');
  });
  test('messages : annulation sans message, trop d’essais, non reconnu', () => {
    expect(lockOutcome({ success: false, error: 'user_cancel' }, 'biometrie')).toEqual({ kind: 'reste-verrouille', message: null });
    expect(lockOutcome({ success: false, error: 'lockout' }, 'biometrie')).toEqual({ kind: 'reste-verrouille', message: LOCK_MESSAGES.tropDEssais });
    expect(lockOutcome({ success: false, error: 'authentication_failed' }, 'biometrie')).toEqual({ kind: 'reste-verrouille', message: LOCK_MESSAGES.nonReconnu });
  });
  test('niveaux du téléphone', () => {
    expect([0, 1, 2, 3, null, undefined, 7].map(securityFromLevel)).toEqual(['aucune', 'code', 'biometrie', 'biometrie', 'inconnue', 'inconnue', 'inconnue']);
  });
});

describe('avis « verrou désactivé » conservé', () => {
  test('enregistré et relu après fermeture de l’app', () => {
    const d = { ...EMPTY, prefs: { ...EMPTY.prefs, lockOff: { date: '2026-11-12' } } };
    const back = decodeState(encode(d));
    expect(back.status === 'ok' && back.data.prefs.lockOff).toEqual({ date: '2026-11-12' });
  });
  test('valeur abîmée ignorée, sans toucher au reste', () => {
    for (const lockOff of [{ date: '2026-13-40' }, 'oui', 42, null]) {
      const raw = JSON.parse(encode(EMPTY)); raw.prefs.lockOff = lockOff; raw.prefs.hideAmounts = true;
      const back = decodeState(JSON.stringify(raw));
      expect(back.status).toBe('ok');
      if (back.status === 'ok') { expect(back.data.prefs.lockOff).toBeUndefined(); expect(back.data.prefs.hideAmounts).toBe(true); }
    }
  });
  test('un état enregistré sans ce champ (versions précédentes) se lit à l’identique', () => {
    const old = JSON.parse(encode(EMPTY)); delete old.prefs.lockOff;
    const back = decodeState(JSON.stringify(old));
    expect(back.status === 'ok' && back.data).toEqual(EMPTY);
  });
  // la restauration (forRestore) qui retire l'avis est testée avec AppState (src/state/__tests__)
  test('texte de l’avis', () => {
    expect(lockOffNotice('2026-11-12', MONTH_NAMES)).toMatch(/^Le verrouillage a été désactivé le 12 novembre 2026/);
  });
});
