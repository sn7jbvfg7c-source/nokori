import { testFlag } from '../data/kv';

/**
 * Plantage volontaire, pour tester les écrans d'erreur. Sans effet par défaut :
 * - web : seulement si le stockage du navigateur contient `nokori:test-plantage` égal à `where` (tests e2e) ;
 * - téléphone : seulement dans une version de DÉVELOPPEMENT (voir testFlag dans kv.native.ts), jamais dans une version distribuée.
 */
export function CrashProbe({ where }: { where: string }) {
  if (testFlag('test-plantage') === where) throw new Error(`Plantage de test (${where}) avec "un libellé" et 1234,56 €`);
  return null;
}
