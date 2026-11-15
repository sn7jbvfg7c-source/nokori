import { testFlag } from '../data/kv';
import { OPTIONAL_TRACKERS, type Tracker } from './consent';

/**
 * Traceur d'exemple, pour tester le bandeau sans rien installer : version web seulement,
 * activé par la clé locale « nokori:test-traceur » = « 1 ». Il ne charge et n'envoie rien.
 */
export function trackersForThisSession(): Tracker[] {
  if (testFlag('test-traceur') === '1')
    return [...OPTIONAL_TRACKERS, { id: 'exemple', name: 'Exemple de test', purpose: 'Sert uniquement à vérifier le bandeau. Ne charge et n’envoie rien.', provider: 'Aucun' }];
  return OPTIONAL_TRACKERS;
}
