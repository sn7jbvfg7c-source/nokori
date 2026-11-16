# Audit fonctionnel de Nokori

Audit du 16 novembre 2026, sur le commit `48c96ff`. Méthode :
- lecture du code (`src/domain`, `src/screens`, `src/app`, `src/data`, `src/state`) ;
- captures de chaque écran sur la version web (393 × 852, 320 × 568, clair et sombre) ;
- lecture des tests existants.

Aucun fichier du projet n'a été modifié.

Légende : **Fonctionne**, **Incomplet**, **À améliorer**. Chaque problème porte un identifiant (`F1`…) repris dans `ROADMAP_PRIORISEE.md`.

---

## 1. Budget

**Fonctionne**
- Calcul du mois (`src/domain/budget.ts:70-119`) :
  - épargne retirée dès la paie (plafond 40 %) ;
  - charges fixes mensuelles, toutes les 4 semaines et annuelles, mensualisées ;
  - budget restant réparti en 4 piliers et 7 catégories ;
  - « Disponible » qui déduit les prélèvements à venir ;
  - « par jour » à 0 si le budget est dépassé ;
  - déficit visible quand les charges dépassent le revenu.
- Projection de fin de mois amortie les 7 premiers jours, marquée « estimation ».
- Toucher un pilier ouvre l'Activité filtrée sur ce pilier (`src/app/(tabs)/index.tsx:20`).
- Toast « ajouté » avec « Annuler » après une saisie.
- Vue Calendrier (`src/ui/CalendarView.tsx`) : de −24 à +12 mois, pastilles de charges et de paie, intensité des dépenses par jour. Les mois passés sont calculés avec le profil de l'époque (`src/domain/history.ts`).
- Couvert par les tests `domain`, `reliability`, `qa-calculs` et `calendar`, et par les e2e `history`, `activity` et `onboarding`.

**Incomplet**
- Les budgets par catégorie sont répartis selon des **références figées du prototype** (Courses 380 €, Santé 40 €…) au prorata du budget restant (`budget.ts:13-21`, `:58-67`). L'utilisateur ne peut ni ajuster un pilier ni une catégorie.
- Le **revenu secondaire** (`extraIncome`) existe dans le modèle (`types.ts:22-26`) mais aucun écran ne permet de le saisir. Il n'y a ni revenus multiples, ni revenus variables, et un seul jour de paie.
- Pas de report d'un mois sur l'autre : un reste n'est pas reporté. C'est un choix kakeibo cohérent, mais il n'est expliqué nulle part.
- Une dépense datée dans le futur est ignorée (`budget.ts:98`). Il n'existe aucune dépense planifiée.

**À améliorer**
- Le libellé « reste » au-dessus des piliers est ambigu (on ne sait pas s'il s'agit du reste par pilier ou du total).
- La division par 30 en dur dans le récapitulatif de l'onboarding (`onboarding.ts:81`) donne un « par jour » approximatif, différent de celui de l'écran Budget.

## 2. Activité et transactions

**Fonctionne**
- Historique mois par mois depuis la première dépense, regroupé par jour avec un total par jour.
- Recherche insensible aux accents et à la casse, sur tout l'historique, charges fixes comprises (`activity.ts:70-92`).
- Filtre par pilier.
- Modification et suppression confirmée, avec annulation par toast.
- Détection des dépenses récurrentes (`recurring.ts`) : suggestion « Ajouter aux charges fixes » ou « Ignorer ».
- Couvert par les tests `activity`, `recurring` et `feedback`, et par les e2e `activity` et `history`.

**Incomplet**
- Aucun filtre par catégorie, montant ou plage de dates.
- Une seule suppression est annulable (`lastRemoved` unique, `AppState.tsx:75`).
- Les lignes de charges fixes ne sont pas cliquables. Pour les modifier, il faut passer par « Modifier mes réponses » sans que l'écran l'indique.
- Une seule suggestion de récurrence s'affiche à la fois. Le groupe de la charge créée est deviné de façon sommaire (`recurring.ts:42-45`).
- Pas de notes, de tags ni de pièces jointes.

**À améliorer**
- La recherche sur tout l'historique affiche les résultats sans virtualisation (`ScrollView` + `map`). Elle risque de devenir lente avec plusieurs années de saisie (voir `T6`).

## 3. Comptes

**Fonctionne**
- Saisie manuelle de 4 types de comptes (courant, livret, placement, espèces).
- Découvert autorisé et affiché en vermillon.
- Total, sous-totaux par type et barre de répartition.
- Alerte quand un solde n'a pas été mis à jour depuis plus de 30 jours.
- Couvert par les tests `accounts` et l'e2e `accounts`.

**Incomplet**
- Les comptes ne sont reliés à rien : ni au budget, ni aux dépenses, ni aux objectifs.
- Pas d'historique de solde ni d'évolution.
- La limite de 50 comptes est silencieuse.

**À améliorer**
- L'écran paraît inachevé quand il y a peu de comptes : un grand total, une ligne, puis un texte isolé (« l'argent du quotidien ») sous la carte (capture `04-comptes`).

## 4. Objectifs d'épargne et défis

**Fonctionne**
- Objectifs avec 6 types, montant visé, montant déjà épargné, versement mensuel et paliers 25/50/75/100 %.
- Date d'arrivée estimée au rythme mensuel, et variante qui ajoute le reste du mois.
- Versements datés, sans date future (`goals.ts:16-21`, `:107-115`).
- Deux défis :
  - « semaine sans envies » ;
  - « 3 jours sous le budget du jour ».
  Aucun des deux ne compte avant la première saisie.
- Couvert par les tests `goals` et `feedback`, et par les e2e `goals` et `history`.

**Incomplet**
- L'historique des versements ne s'affiche que pour l'objectif en tête (les 3 derniers versements). Un versement ne se modifie pas et ne se supprime pas.
- Modifier « déjà épargné » écrase le total sans tenir compte de l'historique, ce qui rend les deux incohérents.
- Pas de date cible (on ne fixe qu'un rythme) et pas de lien avec un compte.
- La date d'un versement se saisit en texte JJ/MM/AAAA, sans sélecteur de date.
- Les deux défis sont fixes : pas de choix, pas d'historique des semaines passées.

## 5. Bilan et statistiques

**Fonctionne**
- Bilan de n'importe quel mois : épargne prévue ou réalisée, et comparaison au même jour avec le mois précédent, hors charges fixes.
- Répartition des dépenses par catégorie, les « quatre questions » du kakeibo et une note libre.
- Story de 5 écrans pour un mois clos. Son avance automatique s'arrête si les animations sont réduites ou si un lecteur d'écran est actif.
- Couvert par les tests `review` et `reliability`, et par les e2e `review` et `history`.

**Incomplet**
- Pas d'évolution sur plusieurs mois, de bilan annuel, de moyenne ni de tendance.
- La story ne peut pas être partagée ni exportée en image.

**À améliorer**
- Le commentaire en tête de `src/domain/review.ts:3` (« un mois passé est recalculé avec le profil actuel ») est périmé : le code utilise le profil de l'époque, ce que l'e2e `history` vérifie.

## 6. Ajout et modification d'une dépense

**Fonctionne**
- Pavé numérique dédié (`keypad.ts`) : 2 décimales, 100 000 € au plus.
- Catégorie obligatoire. Libellé facultatif, qui reprend la catégorie par défaut.
- Date « Aujourd'hui », « Hier » ou jusqu'à 62 jours en arrière.
- Alerte « montant inhabituel » à partir de 1 000 €.
- Protection contre le double appui.
- Écran « Dépense introuvable » si le lien vise une dépense supprimée.
- Couvert par les tests `keypad` et l'e2e `history`.

**Incomplet**
- Pas de remboursement ni de recette ponctuelle (montant négatif impossible).
- Pas de dépense future ni de récurrence décidée à la saisie.
- La limite de 62 jours en arrière est codée en dur.

**À améliorer**
- Sur petit écran, Culture, Imprévus, le libellé et la date passent sous le pavé (capture 320 × 568, voir `U3`). On peut les atteindre en faisant défiler la zone du haut, mais rien ne l'indique.

## 7. Réglages

**Fonctionne**
- Thème Auto, Clair ou Sombre.
- « Masquer les montants » sur tous les écrans (`src/ui/money.tsx`), story comprise (vérifié dans `MonthStory.tsx:18`).
- Verrouillage biométrique et rappels avant prélèvement.
- « Modifier mes réponses ».
- Rappel de sauvegarde quand il n'y en a jamais eu ou qu'elle date de plus de 30 jours.
- Suppression totale confirmée.
- Informations légales et Aide.

**Incomplet**
- Pas de choix de langue ni de devise.
- Pas de réglage de l'heure ni du délai des rappels.
- Pas de premier jour de semaine ni de début de mois personnalisable.
- Le numéro de version « 1.0 » est écrit en dur (`SettingsScreen.tsx:118`) au lieu d'être lu depuis `app.json`.

**À améliorer**
- Le libellé « Verrouillage Face ID » s'affiche aussi sur Android, où Face ID n'existe pas (voir `U9`).

## 8. Sauvegarde et restauration

**Fonctionne**
- Fichier `.nokori` chiffré par une phrase secrète (scrypt + AES-256-GCM), avec un en-tête authentifié.
- Export par la feuille de partage du téléphone.
- Import qui vérifie l'en-tête, demande la phrase, montre un résumé et demande confirmation.
- Erreurs typées : pas une sauvegarde, version future, mauvaise phrase, fichier abîmé, fichier trop gros.
- La restauration reste possible même quand les données locales sont illisibles ou que la clé est perdue.
- Couvert par les tests `backup` (13) et l'e2e `backup`.

**Incomplet**
- La sauvegarde est **entièrement manuelle**. `allowBackup: false` exclut la sauvegarde système Android, et la clé de la base est liée à l'appareil. Perdre ou casser son téléphone sans sauvegarde récente fait tout perdre (voir `F11`).
- Pas d'export lisible (CSV ou JSON en clair) pour réutiliser ses données ailleurs (voir `F3`).
- La restauration remplace tout ; elle ne fusionne pas.
- La force de la phrase n'est pas vérifiée (voir `S1`).

## 9. Notifications

**Fonctionne**
- Rappels locaux 3 jours avant chaque charge, à 9 h, sur 62 jours, 60 au plus (`reminders.ts`).
- Aucun montant affiché, et aucun nom de charge si les montants sont masqués.
- Rappels reprogrammés à chaque changement.
- Aucun serveur ni jeton de notification.

**Incomplet**
- Un seul type de rappel. Il n'y a pas de rappel de saisie, de sauvegarde, de dépassement de budget ni de fin de mois.
- Le délai et l'heure ne sont pas réglables.
- Le mode discret dépend de « Masquer les montants » au lieu d'avoir son propre réglage (voir `S6`).
- Aucun test automatique de `notify.native.ts`.

## 10. Spécificités Android

**Fonctionne**
- Aucune permission Internet dans les versions distribuées (vérifié dans l'APK du 16 novembre).
- `allowBackup: false`, permissions de stockage retirées, icône adaptative avec version monochrome.
- `FLAG_SECURE` posé quand le verrou est actif (module local `modules/nokori-secure`).

**Incomplet**
- `FLAG_SECURE`, le verrou et la base chiffrée n'ont **jamais été vérifiés sur un vrai téléphone** (voir `S8`).
- `predictiveBackGestureEnabled: false` : le retour prédictif d'Android est désactivé. Google le rend progressivement obligatoire (à surveiller).
- Pas de widget ni de raccourci sur l'écran d'accueil.

## 11. Fonctionnement sur navigateur

**Fonctionne**
- Toutes les fonctions, sauf le verrou et les rappels.
- Avertissement clair (« version de test, non chiffrée »).
- Cadre de 480 px sur ordinateur, touche Échap, navigation au clavier.
- 144 vérifications e2e et un audit d'accessibilité axe sans aucune violation sur 34 écrans.

**Incomplet**
- Les données sont **en clair** dans le stockage du navigateur.
- La version web est **publique** (nokori.expo.app) et installable comme une app (`public/manifest.json`, `display: standalone`). Rien n'empêche quelqu'un d'y saisir ses vraies données (voir `F12` et `S7`).
- Sur le web, la sauvegarde sert surtout de transfert vers le téléphone.

---

## Problèmes fonctionnels

| ID | Problème | Localisation | Impact | Solution recommandée | Prio | Dépend de |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | Catégories et budgets par pilier ou catégorie figés (références du prototype) | `src/domain/budget.ts:13-21`, `:58-67` ; `src/data/persist.ts:64` | Impossible d'adapter le budget à sa vie : principal frein à la rétention d'utilisateurs payants | Budgets par pilier réglables, puis catégories personnalisables (renommer, ajouter, masquer) ; nouveau format de données v2 avec migration | P1 | T5 (migrations), sauvegarde v2 |
| F2 | Revenu secondaire non saisissable ; ni revenus multiples ni revenus variables | `src/domain/types.ts:22-26`, `OnboardingScreen.tsx` | Budget faux pour les indépendants, les primes et les doubles revenus | Écran « Revenus » avec plusieurs sources, plus une recette ponctuelle dans le mois | P1 | F1 (même migration) |
| F3 | Aucun export lisible (CSV) | — | Données prisonnières de l'app : argument négatif pour un produit payant | Export CSV des dépenses, et éventuellement un résumé PDF du bilan | P1 | — |
| F11 | Sauvegarde 100 % manuelle ; perte du téléphone = perte des données | `app.json` (`allowBackup:false`), `kv.native.ts` (clé liée à l'appareil) | Risque élevé de perte de données et d'avis négatifs | Rappel actif (notification) ; puis sauvegarde automatique chiffrée vers un dossier choisi (iCloud Drive, Google Drive par le sélecteur du système) | P1 | S1, F10 |
| F12 | Version web publique, installable, en clair | `public/manifest.json`, `src/data/kv.ts` | Confusion avec le produit, données réelles exposées | Décider : démo à données fictives, accès restreint ou retrait | P1 | S7, C10 |
| F4 | Activité : pas de filtre par catégorie, montant ou date ; une seule annulation | `ActivityScreen.tsx`, `AppState.tsx:75` | Recherche limitée sur de longs historiques | Filtres avancés, pile d'annulations courte | P2 | T6 |
| F5 | Versements non modifiables ; « déjà épargné » incohérent avec l'historique ; date en texte | `GoalsScreen.tsx:83-130`, `goals.ts:16-21` | Erreurs de saisie impossibles à corriger | Historique complet et modifiable, total calculé depuis l'historique, sélecteur de date | P2 | — |
| F7 | Bilan sans évolution sur plusieurs mois ni bilan annuel ; story non partageable | `ReviewScreen.tsx`, `MonthStory.tsx` | Valeur perçue limitée au mois | Tendances sur 6 et 12 mois, bilan annuel, export de la story en image (candidat Premium) | P2 | C5 |
| F8 | Comptes isolés du reste ; pas d'historique de solde | `AccountsScreen.tsx`, `accounts.ts` | Fonction peu utile, écran souvent vide | Historique des soldes, lien facultatif objectif ↔ compte | P2 | — |
| F9 | Pas de remboursement, de dépense future ni de récurrence à la saisie | `AddExpenseScreen.tsx`, `budget.ts:98` | Cas de la vie réelle non couverts | Type « remboursement », dépense planifiée, case « tous les mois » | P2 | F1 |
| F10 | Un seul type de rappel, délai et heure fixes | `reminders.ts`, `_layout.tsx:43-48` | Peu d'engagement, saisie oubliée | Rappels de saisie, de sauvegarde et de fin de mois, avec réglages | P2 | S6 |
| F18 | Aucun mode démonstration | `OnboardingScreen.tsx` | On ne peut pas essayer sans saisir ses chiffres | « Essayer avec des données d'exemple » effaçable | P2 | C11 |
| F6 | Défis fixes, sans historique | `GoalsScreen.tsx:238-262` | Engagement qui s'essouffle | Bibliothèque de défis, historique des semaines | P3 | — |
| F13 | Français et euro uniquement | `money.ts:24`, textes en dur | Marché limité aux pays francophones de la zone euro | i18n et devise, si l'ambition est internationale | P3 | T10 |
| F14 | Pas de report de solde d'un mois à l'autre, sans explication | `budget.ts` | Incompréhension possible | Expliquer le choix kakeibo ; report facultatif plus tard | P3 | — |
| F17 | Une seule suggestion de récurrence ; groupe deviné | `ActivityScreen.tsx:47`, `recurring.ts:42-45` | Gain de temps limité | Liste des suggestions, choix du groupe | P3 | — |
