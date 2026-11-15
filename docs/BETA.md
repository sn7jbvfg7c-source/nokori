# Lancer la bêta de Nokori, pas à pas

Ce guide part du code tel qu’il est dans ce dépôt. Les commandes se tapent dans un terminal, à la racine du projet. Les compilations se font sur les serveurs d’Expo (EAS Build) : **pas besoin de Mac**, même pour l’iPhone.

## 0. Le plus simple : un lien web

Vos amis ouvrent un lien dans Chrome ou Safari, sans rien installer. Sur iPhone, « Partager › Sur l’écran d’accueil » ajoute même l’icône Nokori comme une vraie app.

```bash
npx expo export --platform web --output-dir dist
```

```bash
npx eas-cli@latest deploy --prod
```

`deploy` publie le dossier `dist` sur l’hébergement d’Expo (EAS Hosting, offre gratuite) et affiche l’adresse, du type `nokori.expo.app`.

Limites de cette version de test, rappelées dans l’app : les données restent dans le navigateur, mais sans chiffrement, et il n’y a ni Face ID ni rappels. Pour tester ces fonctions, il faut la version téléphone ci-dessous.

## 1. Les comptes à créer (une seule fois)

| Compte | Prix | Pour quoi |
| --- | --- | --- |
| Expo (expo.dev) | gratuit (offre gratuite : quelques compilations par mois) | compiler l’app |
| Apple Developer Program (developer.apple.com) | 99 $ par an | TestFlight et App Store |
| Google Play Console (play.google.com/console) | 25 $, une seule fois | test interne et Google Play |

- **Apple** : l’inscription en tant que particulier demande une pièce d’identité et peut prendre 1 à 2 jours.
- **Google** : un compte personnel récent doit faire tester l’app en **test fermé par au moins 12 personnes pendant 14 jours** avant de pouvoir la publier. Vérifiez les chiffres actuels dans la Play Console, et commencez tôt.

## 2. Relier le projet à Expo

```bash
npm install
```

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` ajoute l’identifiant du projet dans `app.json`. Enregistrez ce changement dans git.

## 3. Une version de développement sur votre propre téléphone

C’est la vraie app, avec le chiffrement SQLCipher, Face ID et les rappels. Expo Go ne les a pas.

**iPhone** : enregistrez d’abord le téléphone (un lien s’ouvre sur l’iPhone), puis compilez :

```bash
npx eas-cli@latest device:create
```

```bash
npx eas-cli@latest build --profile development --platform ios
```

**Android** :

```bash
npx eas-cli@latest build --profile development --platform android
```

À la fin, EAS affiche un lien et un QR code pour installer l’app. Lancez ensuite le code depuis votre ordinateur :

```bash
npx expo start --dev-client
```

### À vérifier à la main sur le téléphone

1. **Chiffrement** : aucun avertissement « SQLCipher absent » dans le terminal au lancement.
2. **Face ID** : Réglages › Verrouillage. Quittez l’app plus d’une minute, revenez : elle doit demander Face ID. L’aperçu dans le sélecteur d’apps doit être masqué.
3. **Rappels** : Réglages › Avant chaque prélèvement, avec une charge dans 1 à 3 jours. La notification arrive à 9 h, sans montant.
4. **VoiceOver / TalkBack** : faites le tour des 5 onglets, ajoutez une dépense, ouvrez la story du mois.
5. **Texte très grand** : réglez la taille du texte au maximum. Rien ne doit être coupé ni se chevaucher.
6. **Mode sombre** : passez le téléphone en sombre avec le thème « Auto ».
7. **Tout effacer** : l’app revient à l’accueil, sans aucune donnée.

## 4. Bêta iPhone avec TestFlight

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

- `submit` crée la fiche de l’app dans App Store Connect si elle n’existe pas, puis envoie la compilation. Le traitement par Apple prend environ 15 à 30 minutes.
- La question sur le chiffrement est déjà réglée dans la configuration. Nokori ne chiffre que ses propres données, sur le téléphone, avec un algorithme standard (voir `SECURITY.md`).
- **Testeurs internes** (jusqu’à 100, membres de votre équipe App Store Connect) : disponible tout de suite, sans relecture d’Apple.
- **Testeurs externes** (jusqu’à 10 000, par e-mail ou lien public) : la première version passe une relecture bêta d’Apple, en général en moins de 48 heures.
- Les testeurs installent l’app **TestFlight**, puis Nokori. Ils peuvent envoyer une capture d’écran annotée en la partageant depuis TestFlight.

## 5. Bêta Android

**Le plus simple pour quelques amis** : un fichier APK à installer directement, sans passer par Google Play.

```bash
npx eas-cli@latest build --profile preview --platform android
```

**Par Google Play**, nécessaire pour publier ensuite :

```bash
npx eas-cli@latest build --profile production --platform android
```

1. Dans la Play Console : *Créer une application*, nom « Nokori », langue français, application gratuite.
2. **La toute première fois, le fichier `.aab` s’envoie à la main** : Tests › Test interne › Créer une version, puis déposer le fichier téléchargé depuis EAS. Ensuite, `npx eas-cli@latest submit --platform android` suffit (il demande une clé de compte de service Google, et EAS explique comment la créer).
3. Ajoutez les testeurs par adresse e-mail (jusqu’à 100 en test interne), puis passez en **test fermé** pour les 12 personnes pendant 14 jours.

## 6. Ce que les stores demandent dès la bêta

- **Politique de confidentialité** : une adresse web publique. Le texte est prêt dans `docs/confidentialite.md`. Complétez les champs entre crochets, puis publiez-le sur une page publique : un site perso, une page Notion publique, ou GitHub Pages depuis un dépôt public séparé (ce dépôt-ci est privé).
- **Étiquette de confidentialité Apple** : « Données non collectées ».
- **Sécurité des données Google Play** : aucune donnée collectée, aucune donnée partagée. Données chiffrées : oui, sur l’appareil. Suppression possible : oui, avec « Tout effacer » ou en désinstallant l’app.
- **Questionnaire de classification du contenu** (Google) et **classification par âge** (Apple) : ni violence, ni achat, ni contenu généré par d’autres. On obtient « 4+ » ou « Tout public ».
- **Catégorie** : Finance.
- **URL d’assistance** (Apple) : une page publique avec vos coordonnées. Le texte est prêt dans `docs/assistance.md`.

## 7. Nouvelle version de la bêta

Augmentez `version` dans `app.json` seulement pour une nouvelle version visible, par exemple 1.0.1. Le numéro de compilation augmente tout seul (`autoIncrement` dans `eas.json`). Relancez ensuite les commandes `build` et `submit` des étapes 4 et 5.

Pour la sortie publique sur les stores, suivez ensuite [PUBLICATION.md](PUBLICATION.md).

---

*Ces textes ont été préparés par IA. Les politiques d’Apple et de Google changent souvent : relisez leurs pages au moment de chaque étape. La politique de confidentialité et les conditions ne remplacent pas l’avis d’un juriste.*
