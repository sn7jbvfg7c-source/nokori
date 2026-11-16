# Audit sécurité et confidentialité de Nokori

Audit du 16 novembre 2026, sur le commit `48c96ff`. Méthode : lecture du code, de `SECURITY.md` et des tests de sécurité, inspection de l'APK Android compilé le 16 novembre. Aucun fichier n'a été modifié.

Chaque constat porte un statut :
- **Vérifié** : lu dans le code ou constaté dans l'APK.
- **Non vérifié** : nécessite un vrai téléphone ou une version compilée, jamais fait.
- **Hypothèse** : raisonnement plausible, non prouvé.

Principe suivi : une fonction n'est pas « sûre » du seul fait qu'elle chiffre. Ce qui compte, ce sont la clé, la phrase, ce qui reste en clair, et ce qui a été réellement testé.

## Synthèse

| Domaine | Appréciation | Statut |
| --- | --- | --- |
| Architecture (rien ne sort du téléphone) | Très bonne : aucun appel réseau dans le code, pas de permission Internet dans l'APK, aucun traceur | Vérifié |
| Base chiffrée (SQLCipher) | Bien conçue dans le code | Code vérifié ; **fonctionnement réel jamais vérifié sur un téléphone** |
| Clé dans SecureStore | Correcte | Vérifié (code) |
| Sauvegarde chiffrée | Format solide, mais **phrase trop faible acceptée** | Vérifié |
| Verrou biométrique | Barrière d'**interface**, pas cryptographique ; désactivation silencieuse possible | Vérifié |
| Version web | Données **en clair** | Vérifié |
| Journaux | Aucune fuite | Vérifié |
| Notifications | Pas de montant ; **nom de la charge visible** par défaut sur l'écran verrouillé | Vérifié |
| Dépendances | Bibliothèques cryptographiques épinglées ; 3 alertes modérées dans l'outillage | Vérifié |

## 1. SQLite et SQLCipher (`src/data/kv.native.ts`)

**Vérifié dans le code**
- Base `nokori.db` ouverte avec `PRAGMA key = "x'<64 hex>'"` (l. 56) : une clé brute de 256 bits, sans dérivation, ce qui est correct pour une clé aléatoire. La clé est contrôlée par l'expression `/^[0-9a-f]{64}$/` avant d'être insérée (l. 47), donc aucune injection n'est possible.
- `PRAGMA cipher_version` est lu (l. 57). S'il est vide dans une version publiée (`!__DEV__`), la base est fermée et l'app refuse d'écrire (l. 59). Une version de développement l'accepte avec un simple avertissement (l. 60).
- Une lecture de contrôle a lieu après la clé. En cas d'échec, l'app lève `KeyLostError` et ne supprime rien (l. 63-64).
- `temp_store = MEMORY` et `secure_delete = ON` (l. 66).
- `wipe()` ferme la base, la supprime, puis supprime la clé (l. 81-86).

**Non vérifié**
- SQLCipher réellement présent dans l'APK ou l'IPA : `cipher_version` non vide, fichier illisible sans la clé.
- Le mode du journal (WAL) et la suppression effective des fichiers `-wal` et `-shm` lors du `wipe` (**hypothèse** : expo-sqlite s'en charge, et ces fichiers sont chiffrés par SQLCipher).

## 2. Clé et SecureStore

**Vérifié**
- Clé de 32 octets tirée par `expo-crypto.getRandomBytes`, un générateur aléatoire du système.
- Stockée avec `WHEN_UNLOCKED_THIS_DEVICE_ONLY` : elle n'est pas synchronisée dans iCloud et n'est pas transférée vers un autre appareil.
- Si la clé est absente alors que la base existe : `KeyLostError`, et rien n'est régénéré sans l'accord de l'utilisateur. Si le test d'existence de la base échoue, l'app suppose que la base existe (prudent).
- **`requireAuthentication` n'est pas utilisé.** La clé est lisible dès que le téléphone est déverrouillé, sans Face ID.

**Conséquence.** Le verrou Nokori protège l'**écran**, pas les **données**. Sur un téléphone déverrouillé, rooté ou débogué, les données sont accessibles sans passer par le verrou.

C'est le modèle de la plupart des apps grand public, et un choix défendable : lier la clé à la biométrie ferait tout perdre lors d'un changement d'empreinte sous Android. Mais il faut **le dire honnêtement** : aucune communication du type « chiffré par Face ID ».

## 3. Chiffrement AES-256-GCM et dérivation scrypt (`src/domain/backup.ts`)

**Vérifié**
- Format du fichier : `{format, v:1, created, kdf:{scrypt, N, r, p, salt}, cipher:{aes-256-gcm, nonce}, data}`.
- Sel de 16 octets et nonce de 12 octets, tirés au hasard à chaque sauvegarde.
- Tout l'en-tête est authentifié (AAD, l. 97). Une modification d'un seul octet est détectée par GCM.
- Bibliothèques `@noble/hashes` et `@noble/ciphers` 2.4.0, épinglées. Elles sont auditées et sans dépendance.
- La clé dérivée est effacée après usage (`key.fill(0)`).
- Validation stricte à l'import :
  - taille ;
  - version, avec refus d'une version future ;
  - bornes de N, r et p ;
  - date ;
  - longueur du nonce ;
  - base64.
- La phrase est normalisée (NFC).

**Faiblesses réelles (vérifiées)**
1. **Phrase secrète de 8 caractères minimum, sans mesure de force** (`MIN_PASSPHRASE`, l. 17 et 103). « 12345678 » est accepté.
2. **scrypt N = 2^15, r = 8, p = 1** (l. 19) : un réglage « interactif », en dessous des recommandations actuelles (de l'ordre de N = 2^17). Avec une phrase faible, un fichier volé (dans un Drive ou dans un e-mail envoyé à soi-même) **peut être cassé hors ligne**. Le chiffrement est solide ; c'est la phrase qui est le maillon faible.
3. **Le lecteur refuse N > 2^16** (l. 132). Il sera impossible de durcir les paramètres plus tard sans une migration. Il faut élargir cette borne **avant** la première diffusion publique, pour que les fichiers futurs restent lisibles.
4. La phrase et le texte déchiffré restent en mémoire sous forme de chaînes JavaScript, impossibles à effacer. C'est une limite de la plateforme, mineure.
5. La date de création du fichier est lisible en clair dans l'en-tête. La fuite est faible (une métadonnée).

**Fichiers temporaires** (`src/data/backupFile.native.ts`), vérifié :
- Le fichier chiffré est écrit dans le cache, puis supprimé dans un `finally` après le partage.
- À l'import, la copie est elle aussi supprimée.
- Seul du contenu déjà chiffré passe par le disque.

## 4. Sauvegardes et restauration

- La restauration remplace toutes les données, après un résumé et une confirmation.
- Le verrou et les rappels sont désactivés après une restauration (choix prudent). L'utilisateur est invité à les réactiver.
- La restauration reste possible même si la base locale est illisible ou si la clé est perdue.
- **Risque produit majeur (vérifié)** : la sauvegarde est 100 % manuelle, et `allowBackup: false` exclut la sauvegarde système Android. Un téléphone perdu sans sauvegarde récente, c'est tout l'historique perdu. Ce n'est pas une faille, mais c'est le risque le plus probable pour un utilisateur réel (voir `F11`).

## 5. Stockage web (`src/data/kv.ts`)

**Vérifié**
- Toutes les données sont dans `localStorage` **en clair** (`nokori:state`).
- Les copies de secours `state.illisible` et `state.avant-nettoyage` y restent aussi, sans être purgées automatiquement.
- Le site est public (nokori.expo.app) et installable comme une app (`manifest.json`, `display: standalone`).
- Un avertissement clair est affiché à l'accueil et dans les Réglages.

**Risque.** Une extension du navigateur, une personne ayant accès à l'ordinateur ou une faille XSS (aucune n'est connue ; le code interdit `innerHTML` et `eval`) peut lire les données. Tant que le web reste une **démonstration**, c'est acceptable. Il ne faut pas en faire un produit sans chiffrement côté navigateur.

## 6. Données sensibles et journaux

**Vérifié**
- **Un seul appel aux journaux** dans tout `src/` : un avertissement de développement sans aucune donnée (`kv.native.ts:60`). Aucun `console.log`.
- **Presse-papiers** jamais utilisé.
- **Nettoyage des données à la lecture** :
  - montants entiers bornés ;
  - dates réelles ;
  - textes débarrassés des caractères de contrôle et des caractères d'inversion de sens (bidi) ;
  - protection contre la pollution des prototypes (`notes`) ;
  - plafonds de taille.
- **Masquage des montants** respecté partout, story et libellés vocaux compris (vérifié dans `MonthStory.tsx:18`). Un rapport de collecte affirmait le contraire ; c'est faux.
- **Aucune collecte, aucun traceur, aucun cookie.** Le manifeste de confidentialité iOS déclare « aucune donnée ».

## 7. Permissions

**Vérifié dans l'APK du 16 novembre**
- Permissions présentes :
  - `USE_BIOMETRIC` et `USE_FINGERPRINT` ;
  - `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE` et `READ_APP_BADGE` ;
  - `ACCESS_NETWORK_STATE` ;
  - `BIND_JOB_SERVICE` et `DUMP`.
- **Pas d'`INTERNET`.** Retirée par `app.config.js` pour les versions `preview` et `production`.

**Remarques**
- `ACCESS_NETWORK_STATE` et `DUMP` viennent des modules Expo. Elles sont inoffensives sans Internet, mais apparaîtront dans la fiche Google Play. **Hypothèse** : on peut les bloquer sans casser l'app ; à tester.
- iOS : le manifeste de confidentialité ne déclare que `UserDefaults`. Les autres API sensibles sont déclarées par les modules Expo eux-mêmes (**non vérifié** sans compilation iOS).

## 8. Verrou biométrique (`src/ui/LockGate.tsx`)

**Vérifié**
- Verrouillage dès l'ouverture, Face ID demandé tout de suite, voile pendant le chargement (pas de contenu qui apparaît une fraction de seconde).
- Verrou de nouveau au retour après 60 secondes, voile dès le passage en arrière-plan.
- `FLAG_SECURE` sur Android quand le verrou est activé.
- **Désactivation silencieuse** : si l'authentification répond `not_available` (par exemple capteur momentanément indisponible), `not_enrolled` ou `passcode_not_set`, le verrou est **coupé et enregistré comme désactivé** (`LockGate.tsx:34`, `_layout.tsx:55` et `:66`), **sans message**. Une erreur passagère peut donc retirer la protection durablement, sans que l'utilisateur le sache.
- Le délai de 60 secondes se mesure avec `Date.now()` : changer l'heure du téléphone permet de le contourner. C'est une faiblesse mineure.
- Les données sont déjà déchiffrées et chargées en mémoire derrière le voile (voir § 2).

**Non vérifié** : sur iPhone, le voile apparaît-il assez tôt pour l'aperçu du sélecteur d'apps ? Et le `FLAG_SECURE` fonctionne-t-il vraiment ?

## 9. Notifications

**Vérifié**
- Notifications locales uniquement : aucun jeton push n'est demandé (`getExpoPushTokenAsync` n'est jamais appelé).
- Aucun montant dans les notifications.
- La permission n'est demandée qu'à l'activation du réglage.
- Si « Masquer les montants » est actif, les rappels ne nomment plus la charge.

**Faiblesse** : par défaut, le **nom de la charge** (« Crédit auto sera prélevé le 5 ») apparaît sur l'écran verrouillé, et le mode discret dépend d'un autre réglage. Pour une app financière, il vaudrait mieux que les rappels soient discrets par défaut, avec leur propre réglage.

**Non vérifié** : les notifications programmées sont gardées en clair dans la base du système, hors SQLCipher.

## 10. Dépendances

**Vérifié**
- `@noble/ciphers` et `@noble/hashes` 2.4.0, épinglés.
- `expo-secure-store` 58.0.3, `expo-sqlite` 58.0.17, `react-native` 0.88.1.
- `npm audit` (lancé le 16 novembre) : 3 alertes modérées, `minimatch` via `@expo/fingerprint`, un outil de compilation. L'impact sur l'app livrée semble nul (**hypothèse**).

## 11. Ce que les tests de sécurité prouvent vraiment

`src/__tests__/security.test.js` **lit le texte du code**. Il vérifie notamment :
- l'absence de `fetch`, `eval`, `console.log` et `localStorage` hors `kv.ts` ;
- la présence de `WHEN_UNLOCKED_THIS_DEVICE_ONLY` et des PRAGMA ;
- les options d'`app.json`.

Ce sont des garde-fous utiles contre une régression, mais **pas des preuves de comportement**. Ils ne montrent pas que SQLCipher chiffre, que le verrou bloque ou que le fichier temporaire est effacé. Les tests de la sauvegarde (`backup.test.ts`), eux, testent vraiment le chiffrement, le déchiffrement et l'altération des fichiers.

## 12. Points juridiques liés au chiffrement (à faire vérifier)

**Hypothèses, à confirmer par un juriste ou auprès des organismes concernés** :
- **Apple** : `usesNonExemptEncryption: false` est déclaré alors que l'app embarque SQLCipher et AES-256-GCM. Le chiffrement de ses propres données entre probablement dans une exemption, mais cette réponse engage l'éditeur auprès d'Apple. Elle doit être confirmée.
- **France (ANSSI)** : fournir un « moyen de cryptologie » peut demander une déclaration, sauf exemption. Le cadre est la LCEN (art. 30) et le décret n° 2007-663. Il faut vérifier si Nokori entre dans une exemption.

## Problèmes de sécurité et de confidentialité

| ID | Problème | Statut | Localisation | Impact | Solution recommandée | Prio | Dépend de |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | Phrase de sauvegarde faible acceptée (8 caractères), scrypt N = 2^15 | Vérifié | `src/domain/backup.ts:17-19`, `:103-104` | Sauvegarde volée cassable hors ligne si la phrase est faible ; promesse « illisible sans la phrase » non tenue dans ce cas | Phrase de 12 caractères ou plus avec mesure de force (ou phrase de 4 à 5 mots proposée par l'app) ; N relevé après une mesure de durée sur un téléphone d'entrée de gamme | P0 | S2 |
| S2 | Le lecteur refuse N > 2^16 | Vérifié | `src/domain/backup.ts:132` | Impossible de durcir plus tard sans migration | Accepter jusqu'à 2^18 (avec une borne mémoire) dès la première version publique | P0 | — |
| S8 | Aucune vérification sur un vrai téléphone : SQLCipher, fichier illisible sans clé, `FLAG_SECURE`, voile iOS, trousseau après restauration et changement de biométrie, rappels | Non vérifié | `docs/BETA.md` (procédure) | La protection principale n'est qu'une supposition tant que ce n'est pas testé | Campagne de tests sur au moins 1 iPhone et 2 Android (dont un d'entrée de gamme), avec procédure écrite et preuves (captures, `cipher_version`) | P0 | Compte Apple (C8) |
| S10 | Déclarations liées au chiffrement (Apple, ANSSI) non vérifiées | Hypothèse | `app.json:26` | Rejet ou non-conformité | Confirmer l'exemption ou faire les déclarations | P0 | C1 |
| S4 | Désactivation silencieuse et durable du verrou sur `not_available` | Vérifié | `src/ui/LockGate.tsx:34`, `src/app/_layout.tsx:55,66` | Protection perdue sans que l'utilisateur le sache | Ne désactiver qu'après vérification (`hasHardwareAsync`, `isEnrolledAsync`) et avec un message ; garder le voile en cas d'erreur passagère | P1 | — |
| S3 | Verrou = barrière d'interface (clé lisible sans biométrie, données en mémoire) | Vérifié | `kv.native.ts:19`, `LockGate.tsx` | Promesse surévaluée si mal communiquée | Textes et fiches des stores exacts ; option « verrou renforcé » plus tard (clé liée à la biométrie, avec sauvegarde obligatoire) | P1 (communication), P3 (option) | C6 |
| S7 | Web : données en clair, site public et installable, copies de secours non purgées | Vérifié | `src/data/kv.ts`, `public/manifest.json`, `AppState.tsx:98-109` | Exposition de données réelles saisies sur le web | Démo à données fictives ou retrait ; à défaut, retirer le côté installable et purger les copies | P1 | F12 |
| S11 | `SECURITY.md` affirme qu'une base sans clé est remplacée par une base vide | Vérifié | `SECURITY.md:17` | Documentation de sécurité fausse | Corriger | P1 | — |
| S6 | Nom de la charge visible sur l'écran verrouillé par défaut | Vérifié | `src/domain/reminders.ts:29`, `_layout.tsx:46` | Indiscrétion (crédit, assurance…) | Rappels discrets par défaut, avec un réglage propre | P2 | F10 |
| S9 | Tests de sécurité textuels et non comportementaux | Vérifié | `src/__tests__/security.test.js` | Fausse impression de couverture | Tests sur appareil (voir T2), test de lecture du fichier sans clé | P2 | T2 |
| S16 | `ACCESS_NETWORK_STATE` et `DUMP` dans l'APK | Vérifié | APK, modules Expo | Fiche Google Play moins nette | Tester leur blocage dans `blockedPermissions` | P2 | S8 |
| S5 | Délai de verrouillage basé sur l'horloge système | Vérifié | `LockGate.tsx:51` | Contournable en changeant l'heure | Horloge monotone (temps écoulé depuis le démarrage) | P3 | — |
| S12 | Une version de développement accepte une base non chiffrée | Vérifié | `kv.native.ts:60` | Aucun, si les versions de développement ne sont jamais distribuées | Règle écrite : ne jamais distribuer le profil `development` | P3 | — |
| S13 | 3 alertes npm modérées dans l'outillage | Vérifié | `@expo/fingerprint` | Faible | Suivre les mises à jour d'Expo | P3 | — |
| S15 | Les achats intégrés exigeront Internet et la facturation des stores | Hypothèse | `app.config.js` (INTERNET bloqué) | Remet en cause la promesse « aucune connexion » | Décider du modèle économique avant de coder (voir C4) | P0 (décision) | C4 |
