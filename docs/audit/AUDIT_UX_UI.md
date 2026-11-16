# Audit UX/UI et design de Nokori

Audit du 16 novembre 2026, sur le commit `48c96ff`, vu comme le ferait la direction artistique d'une app financière haut de gamme. Méthode :
- captures de tous les écrans (393 × 852 et 320 × 568, clair et sombre), avec des données d'exemple ;
- lecture du système de design (`src/theme/tokens.ts`, `src/ui/kit.tsx`) ;
- relevé des écarts dans le code.

Aucun fichier n'a été modifié.

## Verdict

Nokori a déjà **une vraie identité** :
- papier chaud ;
- police Geist ;
- une couleur et un kanji par saison ;
- un grand chiffre « Disponible » ;
- des cartes calmes et un mode sombre soigné.

Ce n'est pas une app « générique ». Ce qui la sépare d'un rendu premium, ce sont des **finitions inégales** :
- l'écran de bienvenue (le premier contact) est construit en dehors du système de design ;
- la couleur de marque varie d'un endroit à l'autre ;
- l'écran de saisie se tasse sur petit écran ;
- les retours après action sont pauvres (pas de vibration, peu de confirmations) ;
- les mouvements sont rares.

Il ne faut **pas de refonte** : il faut une passe de finition rigoureuse.

## 1. Cohérence visuelle

**Points forts**
- Les jetons sont complets (`tokens.ts:72-98`) :
  - espacements de 2 à 48 ;
  - 5 rayons ;
  - échelle typographique de 11,5 à 56 ;
  - 3 durées d'animation ;
  - palettes claire et sombre testées pour le contraste (`src/theme/__tests__/contrast.test.ts`).
- Kit commun utilisé par la plupart des écrans : Button, Card, Row, Chip, Segmented, Notice, Toast, Confirm…

**Écarts relevés**
- **`OnboardingScreen.tsx`** n'utilise presque aucun jeton :
  - 36 tailles de texte en dur (de 12,5 à 54) ;
  - 22 rayons en dur ;
  - 15 boutons refaits à la main ;
  - des glyphes texte (« ‹ », « ✓ », « + ») au lieu d'icônes ;
  - une graisse 800 hors échelle (`:311`).
- **`MonthStory.tsx`** garde sa propre palette (`#FFF6EC`, `#3E2114`) et des tailles en dur.
- **Couleur de marque instable** :
  - fond de l'icône Android `#C5502A` (`app.json:34`) ;
  - pastille de l'onboarding `#C9572C` (`OnboardingScreen.tsx:310`) ;
  - jeton vermillon `#B54020` ;
  - vermillon sombre `#E26A44`.

  On compte donc trois à quatre rouges différents pour une seule marque. `#C5502A` est par ailleurs la couleur de saison « kaki » de novembre (`months.ts:13`) : l'icône dépend d'un mois.
- `LockGate.tsx` refait son propre bouton (hauteur 50, rayon 16) au lieu de `Button`. `DataProblem.tsx` refait sa propre confirmation au lieu de `Confirm`.

## 2. Hiérarchie de l'information

**Points forts**
- Écran Budget : un chiffre roi (« Disponible »), le « par jour », la barre dépensé / à venir / disponible, puis les piliers. La lecture est immédiate.
- Bilan : épargne d'abord, comparaison ensuite, détail en dernier.

**À améliorer**
- La **carte du mois** est très dominante : un aplat vermillon plein sur toute la largeur, chaque mois dans une couleur vive. Sur 320 × 568 (capture `S-01`), elle occupe tout l'écran et les piliers passent sous la ligne de flottaison. Le badge « kaki, la couleur du mois » s'étale sur deux lignes.
- Les légendes secondaires sont très petites :
  - « Dépensé 994 € · Reste 990 € · Épargne 496 € » en `caption` dans le Bilan ;
  - le libellé ambigu « reste » au-dessus des piliers.
- Sur l'écran Comptes, avec peu de comptes, la page paraît vide et le texte « l'argent du quotidien » flotte sous la carte.

## 3. Lisibilité

- Le contraste est vérifié (0 violation axe sur 34 écrans, clair et sombre).
- Les chiffres sont à chasse fixe (`tabular`), ce qui est excellent pour une app financière.
- Les grands textes sont plafonnés à 1,3 seulement pour les grands chiffres (`BIG_TEXT_MAX_SCALE`). Les textes courants grossissent librement, ce qui est bien pour l'accessibilité. En revanche, la barre d'onglets a une hauteur fixe (`66 + insets.bottom`) avec des libellés de 11,5 non plafonnés : risque de texte coupé en très grande taille (**hypothèse, à vérifier sur appareil**).

## 4. Navigation

- 5 onglets clairs, avec les Réglages et la saisie en fenêtres modales.
- L'ordre au clavier est correct sur le web (vérifié par un test).
- Échap ne ferme que la fenêtre du dessus.
- Les lignes de charges fixes de l'Activité ne sont pas cliquables, et rien n'indique qu'elles se modifient par « Modifier mes réponses ».
- Les transitions sont celles par défaut d'Expo Router (`presentation: 'modal'`). Il n'y a aucune transition propre à la marque.

## 5. Animations et transitions

- Seule l'API `Animated` de React Native est utilisée. On trouve :
  - un ressort à l'appui des boutons ;
  - une barre de progression (`useNativeDriver: false`) ;
  - un toast en fondu ;
  - un éclat coloré sur le pilier après un ajout (1200 ms en dur, sans les jetons `motion`).
- « Réduire les animations » est respecté (`useReducedMotion`).
- Il manque :
  - un compteur animé du chiffre « Disponible » après un ajout ;
  - une transition entre « Mois » et « Calendrier » ;
  - une apparition des cartes ;
  - une confirmation animée d'enregistrement.

  Ce sont ces micro-mouvements qui donnent l'impression de qualité d'une app haut de gamme.

## 6. Formulaires

- Le texte d'exemple tient lieu d'étiquette : « Nom : compte courant, Livret A… » (`AccountsScreen.tsx:37`, `GoalsScreen.tsx:53`, `OnboardingScreen.tsx:122`). Une fois le champ rempli, on ne sait plus à quoi il sert.
- Il n'existe aucun composant de champ commun : six styles de `TextInput` différents.
- Pas d'enchaînement au clavier (`returnKeyType` et `onSubmitEditing` absents des champs de nom et de solde).
- `KeyboardAvoidingView` ne protège que l'onboarding et la sauvegarde. Sur iPhone, le clavier peut masquer les éditeurs de compte et d'objectif (**hypothèse, à vérifier sur appareil**).
- La validation se fait par filtrage à la frappe, avec des messages précis (« Solde invalide (un signe moins pour un découvert, 2 décimales) »), ce qui est bien.
- La date d'un versement se tape en texte JJ/MM/AAAA, sans sélecteur.

## 7. Retours visuels après une action

- Pas de **vibration** (expo-haptics absent). C'est la lacune la plus visible face aux apps haut de gamme.
- Le toast n'existe qu'après l'ajout d'une dépense et une suppression. Rien après l'enregistrement d'un compte, d'un objectif, d'un versement ou d'une note.
- Points positifs :
  - le bouton principal de la saisie annonce exactement ce qui va se passer (« Ajouter 12,50 € en Besoins ») ;
  - les confirmations de suppression sont intégrées à l'écran, sans fenêtre système.

## 8. Petit écran

- **Saisie d'une dépense**, capture `S-07` en 320 × 568 :
  - Culture, Imprévus, le libellé et la date sont cachés sous le pavé ;
  - la zone du haut défile, mais sans indicateur (`showsVerticalScrollIndicator={false}`) ni dégradé de bord.

  Même en 393 × 852 (`L-07`), la ligne « Aujourd'hui / Hier / Autre jour » est rognée par le pavé.
- **Budget** : la carte du mois remplit l'écran (voir § 2).
- Les puces de l'Activité débordent à droite (« Imprévus » coupé). Le défilement horizontal fonctionne mais n'est pas suggéré.

## 9. Accessibilité

**Points forts, rares à ce niveau**
- Libellés vocaux complets, y compris pour les montants.
- Titres de niveau 1 et 2.
- Onglets inactifs masqués aux lecteurs d'écran.
- Mouvements réduits respectés.
- Story sans avance automatique avec lecteur d'écran.
- Audit axe automatique dans les tests.

**À corriger**
- Plusieurs **cibles tactiles sous 44 points** :
  - retour de l'onboarding : 36 ;
  - boutons − / + : 32 ;
  - bascules : 32 ;
  - lecture de la vidéo : 32 ;
  - fermeture de la story : 36 (`MonthStory.tsx:84`).
- Un seul `accessibilityHint` dans toute l'app.
- VoiceOver et TalkBack n'ont jamais été essayés sur de vrais téléphones.

## 10. Incohérences entre écrans

- **Verbes** :
  - « Supprimer » partout, mais « Tout effacer… » dans un sous-titre et « Tout supprimer » sur le bouton (`SettingsScreen.tsx:94-99`) ;
  - « Enregistrer » ou « Ajouter » selon les écrans.
- **Titres** : « Nouvelle dépense » et « Sauvegarde » sont des textes faits à la main (`t.headline`) et non des `ScreenHeader`. Leur taille et leur rôle diffèrent des autres écrans.
- **Dates** : saisie JJ/MM/AAAA, `longDate`, `short()`, « lun. 3 nov. » : plusieurs formats coexistent.
- **Icônes** :
  - `check` et `check-circle` pour la même idée ;
  - `x` sert à la fois à « fermer » et à « jour raté » (`GoalsScreen.tsx:248`) ;
  - la story ferme avec un « × » en texte.
- **« Verrouillage Face ID » sur Android**, où le terme ne s'applique pas (`SettingsScreen.tsx:66`).

---

## Pistes pour un rendu plus haut de gamme, sans dénaturer l'identité

1. **Une seule couleur de marque.** Fixer un vermillon de marque (logo, icône, onboarding, verrou), distinct des couleurs de saison, qui restent l'élément vivant du mois.
2. **Carte du mois plus retenue.** Garder l'aplat de saison, mais réduire sa hauteur sur petit écran, alléger la barre et la légende, et remettre le badge de saison sur une ligne (kanji + nom).
3. **Onboarding remis dans le système.** Mêmes jetons, mêmes composants, icônes Feather. C'est la première impression et l'écran des captures des stores.
4. **Retours sensoriels.** Vibration légère à l'ajout, à la validation et à l'erreur ; compteur animé du « Disponible » ; toast de succès homogène pour toutes les créations.
5. **Mouvements de marque.** Transition Mois ↔ Calendrier, apparition douce des cartes, barres animées par le moteur natif. Le tout dans les jetons `motion`, avec « réduire les animations » respecté.
6. **Composant de champ commun.** Étiquette visible, aide, erreur, enchaînement clavier et protection du clavier.
7. **Saisie d'une dépense réorganisée.** Catégories sur une rangée qui défile horizontalement ou en grille compacte, date dans une seule puce, pavé plus bas. Tout doit tenir en 320 × 568 sans défilement caché.
8. **Typographie secondaire.** Remonter les légendes clés de `caption` à `footnote`, préciser « reste ».
9. **Vocabulaire et icônes.** Un lexique (Ajouter / Enregistrer / Supprimer / Fermer), un format de date court et un format long, une icône par concept.
10. **Écran Comptes enrichi.** État vide illustré, évolution du solde, regroupement visuel plus dense.

## Problèmes UX/UI

| ID | Problème | Localisation | Impact | Solution recommandée | Prio | Dépend de |
| --- | --- | --- | --- | --- | --- | --- |
| U1 | 3 à 4 rouges de marque différents ; icône Android teintée par la couleur de novembre | `app.json:34`, `OnboardingScreen.tsx:310`, `tokens.ts:24-38`, `months.ts:13` | Identité floue, moins « marque » | Jeton `brand` unique utilisé par l'icône, l'onboarding et le verrou | P1 | C17 (charte AVERYN) |
| U2 | Onboarding hors système de design (36 tailles, 15 boutons maison, glyphes texte) | `src/screens/OnboardingScreen.tsx:289-346` | Première impression moins soignée que le reste, maintenance difficile | Réécrire les styles avec les jetons et le kit, icônes Feather | P1 | U1 |
| U3 | Saisie : contenu caché sous le pavé sur petit écran, date rognée en 393 × 852, défilement invisible | `src/screens/AddExpenseScreen.tsx:69-114` | Action principale de l'app gênée | Réorganiser (catégories en rangée, date en une puce), indicateur de défilement | P1 | — |
| U8 | Cibles tactiles sous 44 points | `OnboardingScreen.tsx:295-345`, `MonthStory.tsx:84`, `kit.tsx:81` | Accessibilité, refus possible en revue | Minimum 44 × 44 (ou `hitSlop`) partout | P1 | U2 |
| U4 | Carte du mois envahissante sur petit écran, badge sur 2 lignes | `src/ui/MonthCard.tsx` | Piliers invisibles sans défilement | Variante compacte sous 700 px de haut | P2 | — |
| U5 | Pas de vibration, peu de confirmations après action | `src/ui/kit.tsx` (Toast), écrans | Ressenti moins premium, incertitude | expo-haptics, toast de succès homogène | P2 | — |
| U6 | Mouvements rares, transitions par défaut | `kit.tsx`, `src/app/_layout.tsx` | Rendu statique | Micro-animations dans les jetons `motion` | P2 | — |
| U7 | Texte d'exemple utilisé comme étiquette, pas de champ commun, clavier non géré partout | `AccountsScreen.tsx`, `GoalsScreen.tsx`, `ReviewScreen.tsx` | Erreurs de saisie, accessibilité | Composant `Field` dans le kit | P2 | — |
| U9 | « Verrouillage Face ID » affiché sur Android | `SettingsScreen.tsx:66` | Imprécision visible | « Verrouillage biométrique » sur Android | P2 | — |
| U10 | Écran Comptes pauvre, texte isolé | `AccountsScreen.tsx` | Écran perçu comme inachevé | État vide soigné, mise en page dense | P2 | F8 |
| U11 | Vocabulaire, formats de date et icônes incohérents | Plusieurs écrans | Finition | Lexique et formateurs communs | P2 | — |
| U12 | Légendes très petites ; barre d'onglets de hauteur fixe avec grands textes | `MonthCard.tsx`, `ReviewScreen.tsx`, `(tabs)/_layout.tsx:21` | Lisibilité | Remonter les légendes, hauteur souple (à vérifier sur appareil) | P2 | — |
| U13 | Story avec palette et tailles propres | `src/ui/MonthStory.tsx:82-104` | Divergence de style | Jetons, mode sombre | P3 | — |
| U14 | Icônes Feather génériques | Partout | Rendu « open source » | Set d'icônes retravaillé (graisse, rayons) | P3 | C17 |
| U15 | Pas de widgets ni de raccourcis | — | Moins d'usage quotidien | Widget « Disponible » iOS et Android | P3 | — |
