# Publier Nokori sur l’App Store et Google Play

Ce guide fait suite à [BETA.md](BETA.md) : les comptes existent, la bêta tourne et les vérifications à la main sont faites. Tout ce qui pouvait être préparé dans le dépôt l’est déjà :

| Quoi | Où |
| --- | --- |
| Textes des fiches (nom, sous-titre, descriptions, mots-clés) | [store/FICHES.md](../store/FICHES.md), généré depuis `store/texts.js` |
| Fiche App Store envoyée en une commande | `store.config.js` (EAS Metadata) |
| 6 captures iPhone 1320 × 2868 | `store/screenshots/ios/` |
| 6 captures Android 1080 × 1920, image de présentation 1024 × 500, icône 512 × 512 | `store/screenshots/android/` |
| Politique de confidentialité, conditions, page d’assistance | `docs/legal/` (générés depuis l’app par `node scripts/legal-docs.js`), `docs/assistance.md` |

L’app est réglée pour l’iPhone seulement (`supportsTablet: false`) : Apple ne demande donc pas de captures iPad. Sur iPad, elle s’ouvre quand même, en format iPhone.

## 1. Deux pages web publiques (obligatoire)

1. Renseignez les informations de l’éditeur dans `src/legal/config.ts` (liste dans `docs/A-COMPLETER.md`), lancez `node scripts/legal-docs.js`, puis complétez `docs/assistance.md`.
2. Publiez-les à une adresse publique : un site perso, une page Notion publique, Google Sites, ou GitHub Pages depuis un dépôt public séparé (ce dépôt-ci est privé).
3. Recopiez les deux adresses en haut de `store.config.js` (`PRIVACY_URL`, `SUPPORT_URL`). Tant qu’elles sont vides, l’envoi de la fiche s’arrête avec un message.

## 2. App Store

```bash
npx eas-cli@latest build --profile production --platform ios
```

```bash
npx eas-cli@latest submit --platform ios
```

Une fois la compilation traitée par Apple (15 à 30 minutes), envoyez la fiche :

```bash
npx eas-cli@latest metadata:push
```

Cela remplit le nom, le sous-titre, la description, les mots-clés, la catégorie Finance, la classification par âge et les notes pour la relecture. EAS Metadata est encore en bêta chez Expo : si la commande échoue, copiez les textes de `store/FICHES.md` à la main dans App Store Connect.

Puis, dans **App Store Connect**, sur la version 1.0 :

1. **Captures d’écran** : glissez les 6 fichiers de `store/screenshots/ios/` dans la case iPhone 6,9 pouces. Apple les réduit pour les autres tailles d’iPhone.
2. **Compilation** : choisissez celle envoyée par `submit`.
3. **Confidentialité de l’app** : « Données non collectées ».
4. **Classification par âge** : répondez « Aucun » ou « Non » à toutes les questions. Vérifiez que le résultat est 4+ : Apple a ajouté des questions en 2025, que l’outil d’Expo ne remplit peut-être pas toutes.
5. **Prix et disponibilité** : gratuit, et les pays de votre choix (la fiche n’existe qu’en français).
6. **App Review** : vos nom, e-mail et téléphone (ils ne sont pas dans le dépôt). Pas de compte de démonstration : il n’y a pas de connexion. Les notes en anglais pour le relecteur sont déjà envoyées.
7. **Publication** : choisissez « Publier manuellement cette version », pour décider vous-même du jour de sortie.
8. **Soumettre pour relecture**. La réponse arrive en général sous 1 à 2 jours. En cas de refus, Apple explique pourquoi : collez son message dans une conversation avec Claude.

## 3. Google Play

**Prérequis pour un compte personnel récent** : un test fermé avec au moins 12 testeurs, inscrits sans interruption pendant 14 jours (voir BETA.md, étape 5). Ensuite seulement, la Play Console permet de demander l’accès à la production, avec un court questionnaire sur le test.

Pendant ces 14 jours, remplissez la fiche :

1. **Présence sur le Store › Fiche principale** : nom, description courte et description complète depuis `store/FICHES.md`, l’icône `icon-512.png`, l’image de présentation `feature-graphic.jpg` et les 6 captures de `store/screenshots/android/`.
2. **Règles et programmes › Contenu de l’application** :
   - Politique de confidentialité : l’adresse publique de l’étape 1.
   - Annonces : non.
   - Accès à l’application : aucune restriction, toutes les fonctions sont accessibles sans connexion.
   - Classification du contenu : questionnaire, catégorie « Utilitaire, productivité, communication ou autre », non partout. Résultat attendu : tout public.
   - Public cible : 18 ans et plus (une app de budget ne s’adresse pas aux enfants, ce qui évite les règles « Familles »).
   - Sécurité des données : aucune donnée collectée, aucune donnée partagée. Données chiffrées : oui, sur l’appareil. Suppression possible : oui, avec « Tout effacer » ou en désinstallant l’app.
   - Fonctionnalités financières : si la Console pose la question, indiquez une gestion de budget personnelle, sans prêt, sans paiement et sans service bancaire.
3. **Catégorie** : Finance.

Une fois l’accès à la production obtenu :

```bash
npx eas-cli@latest build --profile production --platform android
```

Dans **Production › Créer une version**, choisissez la compilation, ajoutez « Première version de Nokori. » en notes, puis lancez un **déploiement progressif** (par exemple 20 % des utilisateurs, puis 100 % après quelques jours sans plantage). La première relecture de Google prend de quelques heures à quelques jours.

`eas submit --platform android` envoie les versions suivantes en test interne et en brouillon (réglé dans `eas.json`) : vous les passez ensuite en production depuis la Console.

## 4. Les mises à jour

1. Augmentez `version` dans `app.json` (1.0.1 pour une correction, 1.1.0 pour une nouveauté).
2. Écrivez les nouveautés dans `releaseNotes` de `store/texts.js`, puis `node store/fiches.js`.
3. Compilez et envoyez (`build`, puis `submit`, puis `metadata:push` pour l’App Store).
4. Si l’app a changé d’aspect, refaites les captures :

```bash
npx expo export --platform web --output-dir dist
```

```bash
node store/raw.js light && node store/compose.js
```

Les phrases des captures sont dans `store/compose.js`, les données d’exemple dans `store/seed.js`.

## 5. Après la sortie

- Lisez les avis et répondez-y : dans App Store Connect (Notes et avis) et dans la Play Console (Avis).
- Surveillez les plantages : Play Console › Qualité › Android vitals, et App Store Connect › TestFlight ou Xcode › Organizer pour l’iPhone. Nokori n’envoie aucun rapport de plantage lui-même, puisqu’il n’a pas accès à Internet.

---

*Préparé par IA à partir des pages d’aide d’Apple, de Google et d’Expo consultées en novembre 2026. Ces règles changent souvent : relisez les écrans de chaque console au moment de remplir.*
