# Services tiers et intégrations

Inventaire vérifié le 15 novembre 2026, par lecture du code (`src/`, `app.json`, `app.config.js`, `package.json`) et par observation du site en ligne (Playwright : cookies, stockage, hôtes contactés).

## Ce qui n’existe pas

Aucun outil d’analyse d’audience, de publicité, de suivi, de rapport de plantage, de paiement, d’authentification, d’e-mail ni d’API distante. Aucun appel réseau dans le code de l’app : `src/__tests__/security.test.js` interdit `fetch`, `XMLHttpRequest`, `WebSocket` et les adresses `http://`, et l’app Android distribuée n’a pas la permission Internet (vérifié dans l’APK).

## Services conservés

| Service | Rôle | Données transmises | Lieu | Garanties |
| --- | --- | --- | --- | --- |
| **Expo EAS Hosting** (650 Industries, Inc.) | Héberge la version web de test `nokori.expo.app` | Données techniques de connexion des visiteurs du site (adresse IP, navigateur, système, erreurs, performances), selon expo.dev/privacy. **Aucune donnée de budget** : elles restent dans le navigateur. Aucun cookie observé. | États-Unis (sous-traitants : Cloudflare, AWS…) | Expo déclare le Data Privacy Framework UE–États-Unis et les clauses contractuelles types. Durée de conservation et DPA à demander à Expo. |
| **Expo EAS Build** | Compile l’app (code source envoyé à Expo pour la compilation) | Code source et configuration, aucune donnée d’utilisateur | États-Unis | Conditions d’Expo ; le dépôt ne contient aucun secret. |
| **Apple App Store, Google Play** | Distribution de l’app | Données traitées par Apple et Google selon leurs politiques (téléchargement, compte du store). L’éditeur reçoit au plus des statistiques globales et anonymes. | Selon Apple et Google | Contrats développeur Apple et Google. |
| **Notifications locales** (`expo-notifications`) | Rappels avant prélèvement | Rien : notifications programmées sur le téléphone, aucun jeton de notification demandé (`getExpoPushTokenAsync` n’est jamais appelé). | Téléphone | — |
| **Biométrie** (`expo-local-authentication`) | Verrouillage | Rien : le téléphone répond seulement « reconnu » ou non. | Téléphone | — |
| **Stockage de la sauvegarde** (choisi par l’utilisateur : Fichiers, iCloud Drive, Google Drive…) | Ranger le fichier de sauvegarde | Un fichier chiffré (scrypt + AES-256-GCM), illisible sans la phrase secrète | Choix de l’utilisateur | Chiffrement de bout en bout côté appareil. |

## Si un service est ajouté

Le déclarer ici, dans la politique de confidentialité (`src/legal/documents.ts`) et, s’il dépose un traceur facultatif, dans `src/legal/consent.ts` : le bandeau de consentement s’affichera alors automatiquement avant tout dépôt.
