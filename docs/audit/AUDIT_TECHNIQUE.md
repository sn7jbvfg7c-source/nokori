# Audit technique de Nokori

Audit du 16 novembre 2026, sur le commit `48c96ff`.

Méthode :
- Lecture du code et relevés automatiques : tailles de fichiers, recherche des contournements de type et des erreurs ignorées.
- Commandes en lecture seule : `npx jest` (199/199), `npm run typecheck` (0 erreur), `npx expo lint` (0 erreur), `npm ls`, `npm audit`.

Aucun fichier n'a été modifié. Une réécriture complète **n'est pas justifiée** : la base est saine et les améliorations ci-dessous sont ciblées.

## 1. Architecture générale

Couches :
- `src/app` : routes Expo Router.
- `src/screens` : écrans.
- `src/ui` : composants et kit.
- `src/domain` : calculs purs.
- `src/data` : stockage, notifications, fichiers.
- `src/state` : état global.
- `src/theme` : jetons.
- `src/legal` : textes juridiques.

Points forts :
- **Domaine pur.** `src/domain` n'importe ni React, ni React Native, ni Expo (vérifié par recherche). Toute la logique budgétaire est testable seule : 14 fichiers de tests, environ 150 tests.
- **Variantes par plateforme propres.** Les fichiers `.native.ts` / `.ts` (`kv`, `backupFile`, `notify`) et `PresentationVideo.web.tsx` séparent bien le natif du web.
- **Taille raisonnable.** Environ 6 600 lignes dans `src/`. Aucun fichier ne dépasse 365 lignes (le plus gros : `OnboardingScreen.tsx`).

Écarts mineurs :
- Quelques écrans importent directement `src/data` (`SettingsScreen.tsx:6` pour les notifications, `BackupScreen.tsx:7` pour les fichiers) au lieu de passer par l'état. C'est acceptable à cette taille.
- Style très dense, avec des lignes de 200 caractères ou plus (par exemple `AppState.tsx:184`). Cela gênera la relecture à plusieurs.

## 2. Qualité du code TypeScript

- `strict: true`.
- Aucun `any`, `@ts-ignore` ni `eslint-disable` dans `src/`.
- Environ 47 conversions de type `as`, dont 3 `as unknown as` (`useEscapeToClose.ts:15`, `kv.ts:26`, `backup.ts:134`).
- Quelques assertions non nulles `!` (`(tabs)/activite.tsx:15`, `(tabs)/bilan.tsx:15`, `ActivityScreen.tsx`).
- `noUncheckedIndexedAccess` n'est pas activé : un accès hors tableau n'est pas signalé par le compilateur.
- ESLint utilise la configuration Expo seule, sans règle propre au projet.

## 3. Gestion des erreurs

Ce qui est bien fait :
- **Lecture des données à trois états** (`ok`, `erreur`, `illisible`).
- **Aucune écriture tant que rien n'est chargé.** Une donnée illisible est copiée à part et jamais écrasée.
- **Clé perdue** : le choix est laissé à l'utilisateur (restaurer ou repartir de zéro).
- **Écritures en file** (`AppState.tsx:126-139`). Un échec affiche un bandeau « Impossible d'enregistrer ».
- **Erreurs typées** pour la sauvegarde (`RestoreError`).

Ce qui manque :
- **Aucune ErrorBoundary.** Recherche de `ErrorBoundary` et `componentDidCatch` : aucun résultat. Une erreur de rendu dans un écran donne un écran blanc, sans message et sans moyen de repartir.
- **Pas de nouvel essai ni de retour en arrière après un échec d'écriture.** La donnée reste affichée mais n'est pas enregistrée. Elle ne le sera qu'à la prochaine écriture réussie (l'état complet est réécrit), ou elle sera perdue si l'app est fermée avant.
- **Erreurs ignorées.** Trois `.catch(() => {})` (`_layout.tsx:46-47` pour la programmation des rappels, `a11y.ts:9`, `notify.native.ts:19`). Un échec de programmation des rappels est donc silencieux.
- **Aucun rapport de plantage** (choix lié à la confidentialité). Les bugs en production seront invisibles, sauf si les utilisateurs écrivent.

## 4. Performances

- Calculs coûteux mémorisés : `buildMonth` (`BudgetScreen.tsx:26`), `activityFor` (`ActivityScreen.tsx:45`, avec `useDeferredValue`), le bilan et les objectifs.
- **Listes non virtualisées.** Toutes les listes sont des `ScrollView` + `map` ; il n'y a aucune `FlatList`. Un mois tient sans problème. En revanche, la **recherche sur tout l'historique** affiche tous les résultats d'un coup.
- **Un seul contexte global.** Données, préférences, statut et une vingtaine d'actions sont dans un seul `useMemo` (`AppState.tsx:141`). Chaque modification fait redessiner tous les écrans abonnés, et les actions changent d'identité à chaque modification. Le coût est négligeable aujourd'hui, mais il augmentera avec les fonctions.
- **Persistance « tout en un bloc ».** L'état complet est sérialisé en JSON à chaque modification (environ 6 Mo pour 50 000 dépenses, d'après `persist.ts:2`). Ce choix est simple et robuste (une seule transaction), et suffisant pour des années d'usage normal.
- **Bundle web** : 1,42 Mo non compressé, en un seul fichier (`asyncRoutes: false`, choisi pour la fiabilité).
- 4 graisses de Geist et la police d'icônes Feather sont chargées au démarrage.

## 5. Dépendances

- Expo SDK 58 en `~`. `react`, `react-native` et `@noble/*` sont épinglés à une version exacte (bon choix pour la cryptographie). `package-lock.json` est présent et `npm ls` est complet.
- Dépendances sans import direct :
  - `expo-constants`, `expo-linking`, `react-native-screens`, `react-dom`, `react-native-web` et `@expo/metro-runtime` sont normales : ce sont des dépendances requises par Expo Router ou le web.
  - `expo-system-ui` sert au thème automatique sur Android.
  - **`expo-linear-gradient` semble inutile** depuis la suppression des dégradés (hypothèse, à confirmer avant de la retirer).
- **Playwright n'est pas déclaré** dans `devDependencies`. Les tests e2e reposent sur le navigateur préinstallé de l'environnement. La version de Node n'est pas fixée (ni `engines`, ni `.nvmrc`).
- `npm audit` : 3 alertes modérées dans `minimatch` via `@expo/fingerprint`, un outil de compilation d'Expo. La correction proposée (revenir à Expo 52) serait une régression : il vaut mieux attendre une mise à jour d'Expo.

## 6. Gestion des états

- `AppStateProvider` contient les données (profil, historique du profil, dépenses, comptes, objectifs, notes, préférences), le statut et les messages.
- Références internes :
  - `latest` : dernier état connu, pour éviter les valeurs périmées dans les fonctions ;
  - `writable` : écriture autorisée ou non ;
  - `queue` : écritures en série.
- Web : synchronisation entre onglets par l'événement `storage`. Le dernier onglet qui écrit gagne, sans fusion.
- Limites codées en dur et dispersées : 30 objectifs (`AppState.tsx:185`), 280 caractères par note, 200 suggestions ignorées. L'expression régulière des mois est dupliquée (`persist.ts:15` et `AppState.tsx:184`).
- Format de données `v: 1`. Une version future est refusée sans être écrasée (bon). **Aucun mécanisme de migration n'existe encore** : il faudra l'écrire avant la première évolution du format (`F1`, `F2`).

## 7. Compatibilité Android, iOS et Web

- **Android**
  - Un APK a été compilé et vérifié le 16 novembre : pas de permission Internet, module `NokoriSecure` inclus.
  - Le fonctionnement sur un vrai téléphone n'a pas été vérifié.
- **iOS**
  - Aucune compilation iOS n'a encore été faite (pas de compte Apple). Le verrou, Face ID, SQLCipher et les rappels n'ont jamais été exécutés sur un iPhone.
  - `supportsTablet: false`.
- **Web**
  - Couvert par 144 vérifications e2e.
  - Pas de chiffrement, pas de verrou, pas de rappels (voulu).
- **Tests sur appareil** : aucun test automatique ne tourne sur le natif (pas de Detox ni de Maestro). C'est le principal angle mort technique.

## 8. Maintenance

- **Pas d'intégration continue.** Il n'y a pas de dossier `.github/workflows` : les tests ne tournent que lorsqu'on les lance à la main.
- **Couverture des tests**
  - Excellente sur le domaine. `persist` (lecture et nettoyage) est couvert par `reliability.test.ts`.
  - **Aucun test** pour `AppState`, `LockGate`, `notify.native.ts`, `kv.native.ts` (sauf des vérifications textuelles dans `security.test.js`), ni pour le rendu des écrans (seul l'e2e web les couvre).
- **Textes en dur en français**, sans système de traduction. C'est cohérent pour un lancement en France ; l'international demanderait un chantier.
- **Documentation périmée par endroits** :
  - `SECURITY.md` dit qu'une base sans clé est remplacée par une base vide, alors que le code demande à l'utilisateur ;
  - le commentaire de `review.ts:3` est faux.
- **Version « 1.0 » en dur** dans les Réglages (`SettingsScreen.tsx:118`).
- **Rythme d'Expo** : environ trois versions du SDK par an, chacune avec des changements incompatibles (voir `AGENTS.md`). Il faut prévoir une mise à niveau par version, testée sur appareil.
- **Retour prédictif Android** désactivé (`predictiveBackGestureEnabled: false`) : à revoir avant qu'Android ne l'impose.

## Problèmes techniques

| ID | Problème | Localisation | Impact | Solution recommandée | Prio | Dépend de |
| --- | --- | --- | --- | --- | --- | --- |
| T1 | Aucune ErrorBoundary | `src/app/_layout.tsx` | Écran blanc définitif en cas d'erreur de rendu | ErrorBoundary d'Expo Router à la racine et par onglet, avec « Réessayer » ; les données ne sont pas touchées | P1 | — |
| T2 | Aucun test automatique du natif ni d'`AppState`, `LockGate`, `notify.native`, `kv.native` | `src/state`, `src/ui/LockGate.tsx`, `src/data/*.native.ts` | Régressions invisibles sur les fonctions les plus sensibles | Tests unitaires d'`AppState` (file d'écriture, échecs), tests sur appareil (Maestro) pour le verrou, les rappels et la restauration | P1 | S8 |
| T3 | Pas d'intégration continue | — (pas de `.github/workflows`) | Un oubli de test passe inaperçu | GitHub Actions : jest, typecheck, lint, e2e à chaque envoi | P1 | T7 |
| T5 | Aucun mécanisme de migration du format de données | `src/data/persist.ts`, `src/domain/backup.ts` | Bloque les évolutions (catégories, revenus) sans risque de perte | Migrations versionnées v1 → v2 testées, appliquées à la lecture et à la restauration d'une sauvegarde | P1 (avant F1) | — |
| T11 | Documentation de sécurité périmée | `SECURITY.md:17`, `src/domain/review.ts:3` | Information fausse dans un document de référence | Corriger les deux textes | P1 | — |
| T4 | Contexte global unique, actions instables | `src/state/AppState.tsx:141` | Re-rendus inutiles qui augmenteront avec les fonctions | Séparer données, préférences et actions ; actions stables | P2 | — |
| T6 | Listes non virtualisées | `ActivityScreen.tsx:90`, recherche | Lenteur sur un gros historique | `SectionList` pour l'Activité et la recherche | P2 | — |
| T7 | Playwright non déclaré, Node non fixé | `package.json` | Tests non reproductibles ailleurs (intégration continue, autre poste) | Déclarer Playwright, ajouter `engines` et `.nvmrc` | P2 | — |
| T9 | Styles hors jetons et lignes très longues | `OnboardingScreen.tsx`, `MonthStory.tsx`, `AppState.tsx` | Maintenance difficile | Passer au système de design (voir U2), formatage Prettier | P2 | U2 |
| T12 | Pas de plan de mise à niveau d'Expo | `package.json` | Dette qui s'accumule, versions de stores refusées à terme | Une mise à niveau par SDK, avec tests sur appareil | P2 | T2 |
| T15 | Aucun signalement de plantage | — | Bugs de production invisibles | Journal local exportable par l'utilisateur (sans réseau), ou rapport facultatif après accord | P2 | C4 (choix réseau) |
| T19 | Échec d'écriture sans nouvel essai | `src/state/AppState.tsx:126-139` | Saisie perdue si l'app est fermée juste après l'échec | Nouvel essai automatique et indicateur « non enregistré » persistant | P2 | — |
| T8 | `expo-linear-gradient` probablement inutile | `package.json` | Poids et surface inutiles | Vérifier, puis retirer | P3 | — |
| T10 | Pas d'i18n | Tous les écrans | Bloque l'international | Extraction des textes (i18n) le jour où l'international est décidé | P3 | F13 |
| T13 | Version « 1.0 » en dur | `SettingsScreen.tsx:118` | Version fausse après une mise à jour | Lire la version depuis la configuration de l'app | P3 | — |
| T14 | 3 alertes npm modérées dans l'outillage | `@expo/fingerprint` → `minimatch` | Faible (outil de compilation) | Suivre les mises à jour d'Expo | P3 | — |
| T16 | Bundle web d'un seul bloc de 1,42 Mo | `dist/` | Chargement web lent | À revoir seulement si le web devient un produit | P3 | F12 |
| T17 | `noUncheckedIndexedAccess` absent, quelques `!` | `tsconfig.json` | Erreurs d'indice non détectées | Activer l'option et corriger | P3 | — |
| T18 | Retour prédictif Android désactivé | `app.json` | Futur refus ou comportement daté | Tester et activer | P3 | — |
