# Audit de Nokori (novembre 2026)

Audit fait en lisant tout le code source (environ 3 000 lignes : `src/domain`, `src/data`, `src/state`, `src/app`, `src/screens`, `src/ui`, `src/theme`), sans se fier au fait qu’une fonction « existe ». Chaque problème renvoie au fichier concerné. État de départ : commit `b11388a`.

Priorités : **P0** perte de données, faille de sécurité ou chiffre faux affiché ; **P1** fonction cassée ou trompeuse ; **P2** manque important pour une app payante ; **P3** finition.

## 1. Données et fiabilité

| # | Prio | Problème | Où |
| --- | --- | --- | --- |
| D1 | P0 | **Perte de données possible au démarrage.** Si la lecture de la base échoue (trousseau indisponible, erreur SQLite), l’état reste vide, `ready` passe à vrai, et sans profil la barre d’onglets renvoie vers l’accueil. Si l’utilisateur répond, `commit` réécrit la base avec un état vide : tout est écrasé dès que le stockage redevient disponible. | `state/AppState.tsx`, `app/(tabs)/_layout.tsx` |
| D2 | P0 | **Donnée illisible = remise à zéro silencieuse.** `decode` renvoie `EMPTY` pour un JSON abîmé ou une version inconnue (`v !== 1`). Même suite que D1 : la prochaine écriture efface tout. Il n’y a aucun chemin de migration pour une future version 2. | `data/persist.ts` |
| D3 | P1 | **Double ajout.** Toucher deux fois « Ajouter » enregistre la dépense deux fois (aucun verrou pendant l’enregistrement). Même chose pour les comptes, objectifs et versements. | `screens/AddExpenseScreen.tsx`, `app/depense.tsx` |
| D4 | P1 | **« Modifier mes réponses » déplace des charges.** Le brouillon perd `anchor` (4 semaines) et `month` (annuelle) ; à l’enregistrement, `toFixedCharge` les recalcule avec la date du jour. Une assurance annuelle de mars passe en novembre. | `domain/onboarding.ts` |
| D5 | P1 | **Les mois passés sont recalculés avec le profil actuel.** Changer son revenu ou une charge réécrit les bilans, le calendrier et l’activité des mois passés. Le bilan l’avoue en petit, mais c’est un chiffre faux. | `domain/review.ts`, `calendar.ts`, `activity.ts` |
| D6 | P2 | **Aucune sauvegarde, aucun transfert vers un nouveau téléphone.** La clé de chiffrement est liée à l’appareil : changer de téléphone fait tout perdre. | — |
| D7 | P3 | Tout l’état est un seul bloc JSON réécrit à chaque modification. C’est correct jusqu’à quelques milliers de dépenses ; au-delà de 20 000, la lecture tronque. | `data/persist.ts` |

## 2. Sécurité et confidentialité

| # | Prio | Problème | Où |
| --- | --- | --- | --- |
| S1 | P0 | **Le verrouillage Face ID ne s’active pas au démarrage.** `LockGate` lit `enabled` une seule fois, à sa création, quand `ready` est encore faux : `locked` reste faux. Le verrou ne joue qu’au retour après plus d’une minute en arrière-plan. | `ui/LockGate.tsx` |
| S2 | P1 | **« Masquer les montants » ne masque que le Budget et les Comptes.** L’Activité, le Calendrier, les Objectifs, le Bilan et la story affichent tout en clair, alors que le réglage promet « budget et comptes floutés ». | `screens/*` |
| S3 | P2 | SQLCipher : pas de `temp_store = MEMORY` (fichiers temporaires de tri sur disque) ni de `secure_delete` (le contenu effacé reste dans les pages libres). Le chiffrement lui-même est vérifié (`cipher_version`, refus d’écrire sans chiffrement hors développement). | `data/kv.native.ts` |
| S4 | OK | Clé de 256 bits aléatoire, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`, format contrôlé avant le `PRAGMA key` ; base restaurée sans clé remplacée (corrigé au commit `52bcca3`). Pas de journal, pas de réseau, permissions Android minimales, manifeste iOS sans collecte : vérifiés par `src/__tests__/security.test.js`. | — |
| S5 | Limite | La vérification réelle de SQLCipher (`cipher_version` non vide, fichier illisible sans clé) ne peut se faire que sur une version compilée (EAS Build), pas dans le navigateur ni dans Expo Go. | `docs/BETA.md` |

## 3. Calculs budgétaires

| # | Prio | Problème | Où |
| --- | --- | --- | --- |
| C1 | P0 | **Le grand chiffre « à dépenser » compte des prélèvements pas encore passés.** Il affiche `left` (budget moins dépensé), qui inclut les charges fixes à venir. Exemple réel des captures : 997 € affichés, dont 133 € de prélèvements à venir. Le « par jour », lui, les retire. | `ui/MonthCard.tsx`, `domain/budget.ts` |
| C2 | P1 | Budget dépassé : « ≈ −12 € par jour » s’affiche tel quel. | `ui/MonthCard.tsx` |
| C3 | P2 | La projection de fin de mois extrapole le rythme dès le 1er jour : une grosse dépense le 2 donne une projection absurde. | `domain/budget.ts` |
| C4 | P3 | Le jour de paie n’influence que le calendrier ; le budget suit le mois civil (choix kakeibo, à expliquer). `extraIncome` existe mais ne peut pas être saisi. | `domain/budget.ts` |
| C5 | OK | Montants en centimes entiers, dates des charges en UTC, saisie bornée, charges 4 semaines et annuelles : couverts par 106 tests. | `domain/__tests__` |

## 4. Fonctions incomplètes

| # | Prio | Problème | Où |
| --- | --- | --- | --- |
| F1 | P1 | **Activité limitée au mois dernier et au mois en cours**, sans recherche ; une dépense ne peut pas être **modifiée** (seulement supprimée, sans « Annuler »). | `domain/activity.ts`, `screens/ActivityScreen.tsx` |
| F2 | P2 | **Calendrier bloqué** entre le mois dernier et dans 3 mois. | `ui/CalendarView.tsx` |
| F3 | P2 | **Bilan** : seulement le mois en cours et le précédent, aucune comparaison entre deux mois, aucun graphique par catégorie. | `screens/ReviewScreen.tsx` |
| F4 | P2 | **Objectifs** : un versement ne fait qu’augmenter « déjà épargné » ; il n’y a aucun historique des versements. | `screens/GoalsScreen.tsx` |
| F5 | P3 | Saisie d’une dépense : seulement aujourd’hui ou hier. | `screens/AddExpenseScreen.tsx` |

## 5. Interface

| # | Prio | Problème | Où |
| --- | --- | --- | --- |
| U1 | P2 | Pas de système de mise en page : chaque écran a ses propres espacements (marges de 16, 20 ou 24), rayons (12 à 30), tailles de titre (17 à 20) et boutons. Voir l’inventaire en annexe. | tous les écrans |
| U2 | P2 | Pictogrammes en caractères texte (« + », « × », « ‹ », « › », « ⌂ ♡ ❖ ☂ ») : rendu différent selon le téléphone, et la police Geist n’a pas ces glyphes. | `PillarList`, `BudgetScreen`, `CalendarView`… |
| U3 | P2 | Dégradés sur la carte du mois, le bandeau du calendrier, le bilan et la story : jugés « artificiels » par la direction artistique demandée. | `MonthCard`, `CalendarView`, `ReviewScreen`, `MonthStory` |
| U4 | P3 | Couleurs codées en dur restées de l’ancienne palette (`rgba(188,68,35,…)`, `#C9572C`, `#F2B48A`). | `ActivityScreen`, `CalendarView`, `LockGate`, `BudgetScreen` |
| U5 | P3 | Pas d’état de chargement (écran vide au démarrage) ni de confirmation après une suppression. | `app/(tabs)/_layout.tsx` |

## 6. Plan de correction

1. **Fiabilité et sécurité** (D1 à D5, S1 à S3, C1 à C3) : écran d’erreur bloquant au lieu de l’accueil, copie de secours avant toute réécriture d’une donnée illisible, migrations versionnées ; verrou au démarrage ; masquage global des montants ; enregistrement protégé contre le double appui ; charges préservées à la modification ; historique du profil par mois ; montant disponible juste, projection amortie.
2. **Sauvegarde chiffrée** (D6) : fichier exporté chiffré par une phrase secrète (scrypt + AES-256-GCM, bibliothèques auditées sans dépendance), partagé par la feuille de partage du téléphone, restauré par le sélecteur de fichiers, avec validation complète et confirmation avant de remplacer.
3. **Système de design et écrans** (U1 à U5) : jetons d’espacement, rayons et typographie, composants communs (en-tête, carte, bouton, puce, ligne, état vide), icônes Feather, couleurs de saison en aplat.
4. **Fonctions** (F1 à F5) : activité complète avec recherche et modification, calendrier libre, bilan avec graphiques et comparaison, historique des versements.
5. **Tests et publication** : tests unitaires des calculs, de la sauvegarde et de la restauration, parcours de bout en bout, vérification Android et iOS (prebuild), documents de publication relus.

## Annexe : inventaire visuel (relevé automatique du code)

- **25 tailles de texte** différentes (de 11,5 à 110), dont 6 entre 12 et 15. Titre d’écran à 17 (Budget, Activité, Comptes, Objectifs), 18 (Nouvelle dépense) ou 22 (Réglages).
- **16 rayons d’angle** différents (3 à 30, plus 99). Les cartes de liste ont des rayons de 20, 22 ou 24, et des marges intérieures de 12, 14, 16 ou 18.
- **Composants copiés** : le bouton rond « + » est défini 4 fois à l’identique ; le sélecteur à onglets existe en 4 versions ; la confirmation de suppression, en 3 versions ; l’état vide, en 3 versions (une carte, un texte seul ou un paragraphe).
- **Boutons** : 8 hauteurs (36 à 56) pour des rôles proches.
- **Couleurs hors palette** : 11 valeurs hexadécimales et 8 valeurs rgba codées en dur, dont l’ancien vermillon `rgba(188,68,35,…)` à 7 endroits. `MonthStory` et le sceau d’épargne utilisent la palette claire même en mode sombre.
- **Animations** : un seul effet animé (l’éclat du pilier, sans pilote natif). Les éditeurs, les confirmations, le toast et les barres de progression apparaissent ou changent d’un coup.
- **Icônes** : Feather à 3 endroits seulement ; ailleurs, des caractères texte sans police définie.

## 7. Statut au 15 novembre 2026, après corrections

| # | Statut | Ce qui a été fait |
| --- | --- | --- |
| D1 | Corrigé | Écran « Réessayer » à la place de l’accueil ; aucune écriture tant que rien n’est chargé (`state/AppState.tsx`, `ui/DataProblem.tsx`). |
| D2 | Corrigé | Lecture en trois états ; donnée illisible copiée à part, jamais écrasée ; version future refusée (`data/persist.ts`). |
| D3 | Corrigé | Boutons bloqués pendant l’enregistrement, identifiant déjà présent ignoré, écritures en file. |
| D4 | Corrigé | Mois des charges annuelles et échéance des charges à 4 semaines conservés (`domain/onboarding.ts`). |
| D5 | Corrigé | Historique du profil par mois, utilisé par le bilan, le calendrier et l’activité (`domain/history.ts`). |
| D6 | Corrigé | Sauvegarde chiffrée, restauration depuis les réglages et dès l’accueil d’un nouveau téléphone. |
| D7 | Restant | Un seul bloc JSON : suffisant pour plusieurs années de saisie (50 000 dépenses relues au plus). À revoir si besoin. |
| S1 | Corrigé | Verrou enclenché dès l’ouverture, Face ID demandé tout de suite (`ui/LockGate.tsx`). |
| S2 | Corrigé | Masquage centralisé (`ui/money.tsx`) : tous les écrans, la story comprise ; vérifié par un test de bout en bout. |
| S3 | Corrigé | `temp_store = MEMORY`, `secure_delete = ON`. |
| S5 | Restant | Vérification de SQLCipher sur un vrai téléphone (version compilée) : à faire à la main. |
| C1 | Corrigé | Le grand chiffre est l’argent disponible, prélèvements à venir déduits. |
| C2 | Corrigé | « Budget dépassé de … », 0 € par jour. |
| C3 | Corrigé | Projection complétée par le rythme prévu les 7 premiers jours, marquée « estimation ». |
| C4 | Restant | Budget au mois civil (choix kakeibo) ; « autres revenus » conservés mais pas encore saisissables. |
| F1 | Corrigé | Activité mois par mois depuis la première dépense, recherche, modification, suppression annulable. |
| F2 | Corrigé | Calendrier de −24 à +12 mois, bouton « Revenir à aujourd’hui ». |
| F3 | Corrigé | Bilan de n’importe quel mois, comparaison au même jour avec le mois précédent, dépenses par catégorie. |
| F4 | Corrigé | Historique des versements, versement du mois, paliers. |
| F5 | Corrigé | Date jusqu’à 62 jours en arrière, montant inhabituel signalé. |
| U1 à U5 | Corrigé | Système de design (`theme/tokens.ts`) et composants communs (`ui/kit.tsx`) sur tous les écrans ; icônes Feather ; aplats de couleur ; état de chargement ; confirmations animées. |
