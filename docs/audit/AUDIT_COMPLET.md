# Audit complet de Nokori, en vue de sa commercialisation sous AVERYN

Audit du 16 novembre 2026, sur le commit `48c96ff` de la branche `main`.

**Périmètre :** Expo SDK 58, React Native 0.88, TypeScript strict, environ 6 600 lignes dans `src/`.

**Nature de ce travail :** audit seul. Aucun fichier source, aucune configuration, aucune donnée et aucune dépendance n'ont été modifiés. Seuls les sept documents de `docs/audit/` ont été créés.

## Méthode

- Lecture du code, avec des relevés confiés à quatre agents de collecte (fonctionnel, technique, sécurité, interface). Leurs constats importants ont été revérifiés dans le code ; un constat inexact a été écarté (« la story ne respecte pas le masquage des montants » : faux).
- Captures de tous les écrans sur la version web, en 393 × 852 et 320 × 568, en clair et en sombre.
- Commandes en lecture seule : `npx jest` (199 réussis sur 199), `npm run typecheck` (0 erreur), `npx expo lint` (0 erreur), `npm ls` (complet), `npm audit` (3 alertes modérées dans l'outillage).
- Inspection de l'APK Android compilé le 16 novembre : permissions, présence du module natif.
- Règles des stores vérifiées sur les pages officielles de Google et d'Apple.
- Statut des constats :
  - **vérifié** : code lu ou APK inspecté ;
  - **non vérifié** : demande un vrai téléphone ;
  - **hypothèse** : raisonnement non prouvé.

## Documents

| Document | Contenu |
| --- | --- |
| [AUDIT_FONCTIONNEL.md](AUDIT_FONCTIONNEL.md) | Les 11 fonctionnalités : ce qui marche, ce qui manque, ce qui est à améliorer (`F…`) |
| [AUDIT_UX_UI.md](AUDIT_UX_UI.md) | Regard de direction artistique et d'expert UX, pistes pour un rendu haut de gamme (`U…`) |
| [AUDIT_TECHNIQUE.md](AUDIT_TECHNIQUE.md) | Architecture, TypeScript, erreurs, performances, dépendances, état, compatibilité (`T…`) |
| [AUDIT_SECURITE_CONFIDENTIALITE.md](AUDIT_SECURITE_CONFIDENTIALITE.md) | SQLCipher, SecureStore, AES-GCM, scrypt, sauvegardes, web, journaux, permissions, notifications (`S…`) |
| [AUDIT_COMMERCIAL.md](AUDIT_COMMERCIAL.md) | Ce qui manque pour vendre : marque, offre, paiements, juridique, stores, site (`C…`) |
| [ROADMAP_PRIORISEE.md](ROADMAP_PRIORISEE.md) | Tous les problèmes classés de P0 à P3, avec leurs dépendances et l'ordre conseillé |

## Diagnostic global

**Nokori est un produit sain, honnête et singulier, techniquement prêt pour une bêta, mais pas encore pour être vendu.**

| Axe | Note indicative | En une phrase |
| --- | --- | --- |
| Fonctionnel | 7/10 | Parcours kakeibo complet et fiable ; manquent la personnalisation (catégories, revenus), l'export et la sauvegarde automatique |
| UX/UI et design | 7/10 | Identité réelle et accessibilité remarquable ; finitions inégales (onboarding, couleur de marque, saisie sur petit écran, retours) |
| Technique | 8/10 | Domaine pur et très testé, gestion prudente des données ; manquent ErrorBoundary, intégration continue, tests natifs, migrations |
| Sécurité et confidentialité | 7/10 | Architecture sans réseau exemplaire ; sauvegardes trop permissives sur la phrase ; **rien de vérifié sur un vrai téléphone** |
| Préparation commerciale | 3/10 | Textes et captures prêts ; ni entité, ni marque, ni comptes, ni modèle économique, ni support, ni site |

Ces notes sont des **appréciations** pour situer les axes les uns par rapport aux autres, pas des mesures.

## Les 10 améliorations les plus importantes

1. **Créer le cadre juridique et les identifiants d'AVERYN** avant toute soumission (`C1`, `C2`, `C3`) : entité, marque, domaines, organisations Expo et GitHub, bundle définitif (irréversible après la première publication).
2. **Décider du modèle économique** en connaissant sa conséquence (`C4`, `S15`) : un achat intégré impose Internet et oblige à reformuler la promesse « aucune connexion ».
3. **Tester réellement la sécurité sur des téléphones** (`S8`) : SQLCipher actif, fichier illisible sans la clé, verrou, `FLAG_SECURE`, rappels, restauration. C'est aujourd'hui une supposition.
4. **Durcir les sauvegardes** (`S1`, `S2`) : phrase plus longue avec mesure de force, scrypt plus lourd, lecteur ouvert aux réglages futurs.
5. **Protéger contre la perte de données** (`F11`) : rappels actifs, puis sauvegarde automatique chiffrée vers iCloud Drive ou Google Drive.
6. **Rendre le budget personnalisable** (`T5`, `F1`, `F2`) : migrations du format de données, budgets par pilier, catégories, revenus multiples.
7. **Fiabiliser le code** (`T1`, `T2`, `T3`, `S4`) : ErrorBoundary, tests d'`AppState` et du natif, intégration continue, verrou qui ne se désactive plus en silence.
8. **Faire une passe de finition premium** (`U1`, `U2`, `U3`, `U8`, puis `U4` à `U7`) : une seule couleur de marque, onboarding dans le système de design, saisie compacte, cibles de 44 points, vibrations et micro-animations.
9. **Compléter le juridique et le support** (`C6`, `C7`, `S10`) : informations d'éditeur, CGV, relecture juridique, déclarations liées au chiffrement, adresse de support.
10. **Construire la présence d'AVERYN** (`C10`, `C17`, `F12`) : site du studio, page Nokori, pages légales sur un domaine propre, design system partagé, version web transformée en démo.

## Risques critiques

| Risque | Gravité | Statut | Parade |
| --- | --- | --- | --- |
| **Perte définitive des données** d'un utilisateur qui perd son téléphone sans sauvegarde récente (sauvegarde manuelle, `allowBackup:false`, clé liée à l'appareil) | Élevée (risque le plus probable en production) | Vérifié | `F11` |
| **Identifiants irréversibles** : bundle `app.nokori` et projet sur un compte personnel au moment de la première publication | Élevée | Vérifié | `C2` avant toute soumission |
| **Sécurité jamais vérifiée sur appareil** : SQLCipher pourrait ne pas être actif sans qu'aucun test web ne le voie | Élevée (impact) | Non vérifié | `S8` |
| **Sauvegarde cassable** si la phrase est faible (8 caractères acceptés) | Moyenne | Vérifié | `S1`, `S2` |
| **Promesse de confidentialité remise en cause** par un paiement intégré mal anticipé | Moyenne | Hypothèse (selon la décision) | `C4`, `S15` |
| **Non-conformité juridique** : documents incomplets, pas de CGV, déclarations liées au chiffrement non vérifiées | Élevée pour vendre | Vérifié et hypothèse | `C1`, `C6`, `S10` |
| **Verrou désactivé en silence** sur une erreur passagère | Moyenne | Vérifié | `S4` |
| **Données réelles saisies sur le site web public**, en clair | Moyenne | Vérifié | `F12`, `S7` |
| **Délais administratifs** (D-U-N-S, test Google de 14 jours, marques) qui décalent le lancement | Moyenne | Vérifié | Lancer `C8` immédiatement |

## Points forts à conserver absolument

1. **La promesse de confidentialité réelle** : aucun appel réseau dans le code, pas de permission Internet dans l'APK, aucun traceur, aucun journal de données. C'est l'avantage concurrentiel principal.
2. **Un domaine de calcul pur et très testé** : montants en centimes entiers, environ 150 tests du domaine, profil historisé par mois.
3. **La prudence sur les données** :
   - aucune écriture tant que rien n'est chargé ;
   - une donnée illisible n'est jamais écrasée ;
   - clé perdue : rien n'est supprimé sans l'accord de l'utilisateur ;
   - écritures en série.
4. **Le format de sauvegarde** : en-tête authentifié, validation stricte, bibliothèques auditées et épinglées.
5. **L'identité kakeibo** : les quatre piliers, les quatre questions, une couleur et un kanji par saison, le papier chaud, Geist et un ton bienveillant.
6. **Le système de design** (jetons et kit) : la bonne base pour un design system AVERYN.
7. **L'accessibilité** : libellés vocaux complets, mouvements réduits respectés, audit axe sans violation sur 34 écrans.
8. **Des documents juridiques générés depuis le code**, qui affichent « [À compléter] » plutôt que d'inventer.
9. **Les tests e2e** (144 vérifications) et les scripts de captures et de fiches des stores, qui rendent les itérations peu coûteuses.

## Grandes étapes avant la commercialisation

Estimation **indicative**. Les durées dépendent surtout des démarches administratives et de tes décisions, pas du code.

| Étape | Contenu | Qui | Durée indicative |
| --- | --- | --- | --- |
| 0. Décisions et démarches | Entité AVERYN, marques et domaines, modèle économique, D-U-N-S, comptes développeur | Toi, avec un juriste ou un expert-comptable | 2 à 6 semaines, en parallèle des étapes suivantes |
| 1. Sécurité et fiabilité | `S1`, `S2`, `S4`, `T1`, `T3`, documentation | Développement | 1 à 2 semaines |
| 2. Produit | Migrations (`T5`), budgets et catégories (`F1`), revenus (`F2`), export (`F3`), sauvegarde automatique (`F11`) | Développement | 3 à 5 semaines |
| 3. Finition premium | Couleur de marque, onboarding, saisie, retours sensoriels, micro-animations, P2 visuels | Développement et direction artistique | 2 à 3 semaines |
| 4. Monétisation (si retenue) | Offre Plus, achats natifs, confidentialité reformulée, formulaires des stores | Développement et juridique | 1 à 2 semaines |
| 5. Validation | Tests sur appareils (`S8`, `T2`), relecture juridique, support, site, captures | Toi et développement | 2 à 3 semaines |
| 6. Bêta fermée et soumission | TestFlight et test fermé Play (12 testeurs ou plus, 14 jours ou plus), corrections, revue des stores | Toi et testeurs | 3 à 5 semaines |

**Ordre de grandeur : 3 à 5 mois calendaires** entre aujourd'hui et une première version payante, si les décisions de l'étape 0 sont prises rapidement. Une sortie **gratuite** sans offre payante pourrait être plus rapide, en sautant l'étape 4 et une partie de la 2. Les délais de l'étape 0 restent les mêmes.

## Prochaine étape

Aucune correction n'a été commencée. J'attends ta validation, notamment sur trois points :
- l'ordre de la roadmap ;
- les décisions de l'étape 0 ;
- le premier lot de travail à lancer.
