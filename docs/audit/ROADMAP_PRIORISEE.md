# Roadmap priorisée de Nokori

Document établi le 16 novembre 2026 à partir des cinq audits de ce dossier. Chaque identifiant renvoie au détail dans son audit :
- `F` : fonctionnel ;
- `U` : UX/UI ;
- `T` : technique ;
- `S` : sécurité ;
- `C` : commercial.

Priorités :
- **P0** : indispensable avant toute commercialisation.
- **P1** : important pour la qualité du produit.
- **P2** : confort et finition.
- **P3** : évolutions futures.

Aucune de ces actions n'a été commencée. Chacune attend ta validation.

---

## P0 : indispensable avant toute commercialisation

| ID | Problème | Localisation | Impact | Solution recommandée | Dépend de |
| --- | --- | --- | --- | --- | --- |
| C1 | Pas d'entité juridique ni de statut d'éditeur | `src/legal/config.ts` | Vente impossible | Créer la structure AVERYN (ou une micro-entreprise) : SIRET, TVA, banque, médiateur | — |
| C3 | Marques et domaines non vérifiés | — | Renommage forcé possible | Recherche d'antériorité, dépôt INPI ou EUIPO, domaines | — |
| C2 | Identifiants techniques sur des comptes personnels ; bundle `app.nokori` définitif dès la première publication | `app.json:11,40,88` | Irréversible | Organisations Expo et GitHub AVERYN, choix du bundle, transfert | C1, C3 |
| C4 | Modèle économique non décidé ; l'achat intégré impose Internet | `app.config.js` | Architecture et promesse de confidentialité en jeu | Choisir : achat unique, abonnement ou app payante ; StoreKit et Play Billing sans SDK tiers | — |
| S15 | Paiement intégré incompatible avec « aucune connexion » | `app.config.js` | Promesse à reformuler | Découle de C4 : nouvelle formulation, permissions, politique de confidentialité | C4 |
| C8 | Comptes Apple et Google absents ; D-U-N-S pour une organisation ; Google exige 12 testeurs pendant 14 jours (compte personnel) | — | Plusieurs semaines de délai | Lancer les démarches tout de suite | C1 |
| S1 | Phrase de sauvegarde faible acceptée, scrypt N = 2^15 | `src/domain/backup.ts:17-19,103` | Sauvegarde volée cassable | 12 caractères ou plus avec mesure de force, ou phrase de mots proposée ; N relevé après une mesure de durée | S2 |
| S2 | Le lecteur refuse N > 2^16 | `src/domain/backup.ts:132` | Durcissement futur impossible | Accepter jusqu'à 2^18 dès la première version publique | — |
| S8 | SQLCipher, verrou, `FLAG_SECURE`, rappels et restauration jamais testés sur un vrai téléphone | `docs/BETA.md` | La protection principale reste une supposition | Campagne sur 1 iPhone et 2 Android (dont un d'entrée de gamme), avec preuves | C8 (compte Apple) |
| S10 | Déclarations liées au chiffrement (Apple, ANSSI) non vérifiées | `app.json:26` | Rejet ou non-conformité | Confirmer l'exemption ou faire les déclarations | C1 |
| C6 | Documents juridiques incomplets, CGV absentes, pas de relecture juridique | `src/legal/`, `docs/A-COMPLETER.md` | Non-conformité | Compléter, rédiger les CGV, faire relire | C1, C4 |
| C7 | Aucun contact de support réel | `src/legal/config.ts` | Exigé par Apple | Adresse support AVERYN, procédure, réponses types | C3 |
| C9 | Formulaires des stores non remplis | Consoles | Publication impossible | Remplir après C4 et S10 | C4, S10 |
| C16 | Pas de bêta fermée organisée | `docs/BETA.md` | Pas de retours réels ; règle Google | TestFlight et test fermé Play, 12 testeurs ou plus, recueil des retours | C8, S8 |

## P1 : important pour la qualité du produit

| ID | Problème | Localisation | Impact | Solution recommandée | Dépend de |
| --- | --- | --- | --- | --- | --- |
| T5 | Aucun mécanisme de migration du format de données | `src/data/persist.ts`, `src/domain/backup.ts` | Bloque F1 et F2 sans risque de perte | Migrations versionnées et testées, à la lecture et à la restauration | — |
| F1 | Catégories et budgets figés | `src/domain/budget.ts:13-21,58-67` | Principal frein à la rétention | Budgets par pilier réglables, puis catégories personnalisables | T5 |
| F2 | Revenu secondaire non saisissable, ni revenus multiples ni variables | `src/domain/types.ts:22-26` | Budget faux pour une partie du public | Plusieurs sources de revenus et recette ponctuelle | T5, F1 |
| F11 | Sauvegarde 100 % manuelle | `app.json` (`allowBackup:false`) | Perte totale si le téléphone est perdu | Rappel actif, puis sauvegarde automatique chiffrée vers un dossier choisi | S1 |
| F3 | Aucun export lisible | — | Données prisonnières | Export CSV, et bilan PDF | — |
| F12 / S7 | Web public, installable, en clair | `public/manifest.json`, `src/data/kv.ts` | Données réelles exposées | Démo à données fictives ou retrait | C10 |
| S4 | Le verrou se désactive en silence sur une erreur passagère | `src/ui/LockGate.tsx:34`, `_layout.tsx:55,66` | Protection perdue à l'insu de l'utilisateur | Vérifier avant de désactiver, avec un message | — |
| S3 | Verrou = barrière d'interface | `kv.native.ts:19` | Promesse surévaluée | Communication exacte dans l'app et les fiches | C6 |
| S11 / T11 | Documentation périmée | `SECURITY.md:17`, `review.ts:3` | Information fausse | Corriger | — |
| T1 | Aucune ErrorBoundary | `src/app/_layout.tsx` | Écran blanc définitif | ErrorBoundary avec « Réessayer » | — |
| T2 | Natif, `AppState`, `LockGate` et notifications sans tests automatiques | `src/state`, `src/ui/LockGate.tsx`, `src/data/*.native.ts` | Régressions invisibles | Tests d'`AppState`, tests sur appareil (Maestro) | S8 |
| T3 | Pas d'intégration continue | — | Oublis non détectés | GitHub Actions : jest, typecheck, lint, e2e | T7 |
| U1 | 3 à 4 rouges de marque | `app.json:34`, `OnboardingScreen.tsx:310`, `tokens.ts` | Identité floue | Jeton `brand` unique | C17 |
| U2 | Onboarding hors système de design | `OnboardingScreen.tsx:289-346` | Première impression, captures | Jetons, kit, icônes | U1 |
| U3 | Saisie : contenu caché sous le pavé, date rognée | `AddExpenseScreen.tsx:69-114` | Action principale gênée | Réorganisation compacte, défilement visible | — |
| U8 | Cibles tactiles sous 44 points | `OnboardingScreen.tsx`, `MonthStory.tsx:84` | Accessibilité | 44 × 44 minimum | U2 |
| C5 | Offre Premium non définie | — | Pas de revenu | « Nokori Plus » : F1, F2, F3, F7, F11, U15 | C4 |
| C10 | Ni site AVERYN ni page produit | — | Crédibilité, exigence des stores | Site, page Nokori, pages légales sur le domaine | C3 |
| C13 | Positionnement et prix non étudiés | — | Message et prix au hasard | Étude de concurrence et de mots-clés | — |
| C15 | Obligation européenne d'accessibilité à vérifier | — | Risque juridique | Avis d'un juriste | C1 |
| C17 | Pas de charte ni de design system AVERYN | `src/theme`, `src/ui/kit.tsx` | Incohérence entre les futures apps | Extraire un design system partagé | U1 |

## P2 : confort et finition

| ID | Problème | Localisation | Impact | Solution recommandée | Dépend de |
| --- | --- | --- | --- | --- | --- |
| U4 | Carte du mois envahissante sur petit écran | `src/ui/MonthCard.tsx` | Piliers invisibles | Variante compacte | — |
| U5 | Pas de vibration, peu de confirmations | `kit.tsx`, écrans | Ressenti moins premium | expo-haptics, toast de succès homogène | — |
| U6 | Mouvements rares | `kit.tsx`, `_layout.tsx` | Rendu statique | Micro-animations (jetons `motion`) | — |
| U7 | Texte d'exemple tenant lieu d'étiquette, pas de champ commun | `AccountsScreen.tsx`, `GoalsScreen.tsx`, `ReviewScreen.tsx` | Erreurs de saisie | Composant `Field` | — |
| U9 | « Face ID » affiché sur Android | `SettingsScreen.tsx:66` | Imprécision | « Verrouillage biométrique » | — |
| U10 | Écran Comptes pauvre | `AccountsScreen.tsx` | Paraît inachevé | État vide et mise en page | F8 |
| U11 | Vocabulaire, dates et icônes incohérents | Plusieurs écrans | Finition | Lexique et formateurs communs | — |
| U12 | Légendes petites ; barre d'onglets de hauteur fixe | `MonthCard.tsx`, `(tabs)/_layout.tsx:21` | Lisibilité | Tailles relevées, hauteur souple | — |
| F4 | Filtres limités, une seule annulation | `ActivityScreen.tsx` | Recherche limitée | Filtres et pile d'annulations | T6 |
| F5 | Versements non modifiables, date en texte | `GoalsScreen.tsx`, `goals.ts` | Erreurs non corrigeables | Historique modifiable, sélecteur de date | — |
| F7 | Bilan sans tendances ni bilan annuel | `ReviewScreen.tsx` | Valeur limitée au mois | Tendances, bilan annuel, story partageable | C5 |
| F8 | Comptes isolés, sans historique | `accounts.ts` | Peu d'utilité | Historique des soldes, lien avec les objectifs | — |
| F9 | Pas de remboursement ni de dépense planifiée | `AddExpenseScreen.tsx`, `budget.ts:98` | Cas réels non couverts | Remboursement, dépense planifiée | F1 |
| F10 | Un seul type de rappel | `reminders.ts` | Engagement faible | Rappels de saisie, de sauvegarde et de fin de mois, réglables | S6 |
| F18 / C11 | Pas de démo ; offre non présentée | `OnboardingScreen.tsx` | Conversion | Mode démo et écran d'offre discret | C5 |
| S6 | Nom de la charge visible sur l'écran verrouillé | `reminders.ts:29` | Indiscrétion | Rappels discrets par défaut | — |
| S9 | Tests de sécurité textuels | `security.test.js` | Couverture surestimée | Tests de comportement sur appareil | T2 |
| S16 | `ACCESS_NETWORK_STATE` et `DUMP` dans l'APK | APK | Fiche moins nette | Tester leur blocage | S8 |
| T4 | Contexte global unique | `AppState.tsx:141` | Re-rendus | Séparer données, préférences et actions | — |
| T6 | Listes non virtualisées | `ActivityScreen.tsx` | Lenteur sur un gros historique | `SectionList` | — |
| T7 | Playwright non déclaré, Node non fixé | `package.json` | Tests non reproductibles | Déclarer Playwright, `engines`, `.nvmrc` | — |
| T9 | Styles hors jetons, lignes très longues | `OnboardingScreen.tsx`, `AppState.tsx` | Maintenance | Jetons et Prettier | U2 |
| T12 | Pas de plan de mise à niveau d'Expo | `package.json` | Dette | Une mise à niveau par SDK, testée sur appareil | T2 |
| T15 | Aucun signalement de plantage | — | Bugs invisibles | Journal local exportable | C4 |
| T19 | Échec d'écriture sans nouvel essai | `AppState.tsx:126-139` | Saisie perdue | Nouvel essai et indicateur « non enregistré » | — |
| C12 | Aucune mesure | — | Décisions à l'aveugle | Statistiques des stores, enquêtes | — |
| C14 | Captures à refaire | `store/screenshots/` | Fiche moins attrayante | Régénérer | U1–U4 |

## P3 : évolutions futures

| ID | Problème | Localisation | Impact | Solution recommandée | Dépend de |
| --- | --- | --- | --- | --- | --- |
| F6 | Défis fixes | `GoalsScreen.tsx` | Engagement | Bibliothèque de défis | — |
| F13 / T10 | Français et euro seulement, pas d'i18n | `money.ts`, textes | Marché limité | i18n et devises | — |
| F14 | Pas de report de solde | `budget.ts` | Incompréhension | Expliquer ; option plus tard | — |
| F17 | Une seule suggestion de récurrence | `recurring.ts` | Gain limité | Liste et choix du groupe | — |
| U13 | Story hors jetons | `MonthStory.tsx` | Divergence | Jetons, mode sombre | — |
| U14 | Icônes génériques | Partout | Rendu « open source » | Set retravaillé | C17 |
| U15 | Pas de widgets | — | Usage quotidien | Widget « Disponible » | C5 |
| S3 (option) | Verrou renforcé | `kv.native.ts` | Sécurité avancée | Clé liée à la biométrie, sauvegarde obligatoire | F11 |
| S5 | Délai de verrouillage sur l'horloge système | `LockGate.tsx:51` | Mineur | Horloge monotone | — |
| S12 | Version de développement non chiffrée | `kv.native.ts:60` | Aucun si non distribuée | Règle écrite | — |
| S13 / T14 | Alertes npm dans l'outillage | `@expo/fingerprint` | Faible | Suivre Expo | — |
| T8 | `expo-linear-gradient` probablement inutile | `package.json` | Poids | Vérifier, puis retirer | — |
| T13 | Version « 1.0 » en dur | `SettingsScreen.tsx:118` | Version fausse | Lire la configuration | — |
| T16 | Bundle web d'un seul bloc | `dist/` | Chargement lent | Si le web devient un produit | F12 |
| T17 | `noUncheckedIndexedAccess` absent | `tsconfig.json` | Erreurs d'indice | Activer | — |
| T18 | Retour prédictif Android désactivé | `app.json` | Futur refus | Tester et activer | — |

---

## Ordre de réalisation conseillé

Les dépendances imposent cet enchaînement :

1. **Décisions et démarches** (à toi, en parallèle de tout le reste) : C1, C3, puis C2 ; C4 ; lancement de C8 (D-U-N-S, comptes).
2. **Sécurité et fiabilité, sans changer l'interface** : S2, puis S1, S4, T1, S11 et T11, T3 (avec T7).
3. **Socle d'évolution** : T5 (migrations), puis F1 et F2, puis F3 et F11.
4. **Finition premium** : U1, U2, U3, U8, puis les P2 visuels (U4 à U12), C17 en parallèle.
5. **Monétisation**, si C4 la retient : C5, nouvelle formulation de la confidentialité (S15), C9.
6. **Validation** : S8 et T2 sur appareils, captures (C14), documents juridiques finaux (C6), C7, C10.
7. **Bêta fermée** (C16), d'au moins 14 jours pour Google, puis soumission.
