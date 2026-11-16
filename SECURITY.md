# Sécurité de Nokori

Nokori est une app de suivi de budget **manuelle** : elle ne se connecte à aucune banque, ne déplace pas d’argent et n’envoie rien sur Internet. Ce document liste ce qu’on protège, contre quoi, comment, et ce qui a été vérifié (revue du 15 novembre 2026, version 1.0.0).

## Ce qu’on protège

- Revenus, charges fixes, dépenses, soldes de comptes, objectifs et notes du mois.
- Ces données restent **uniquement sur le téléphone**. Il n’y a ni serveur, ni compte utilisateur, ni analytics, ni publicité.

## Contre quoi

| Risque | Protection |
| --- | --- |
| Quelqu’un prend le téléphone déverrouillé | Verrouillage Face ID / Touch ID / empreinte (Réglages). Il revient tout seul après 1 minute en arrière-plan. C’est une protection de l’**écran** : la clé de la base n’est pas liée à la biométrie (voir « Limites »). |
| L’aperçu de l’app dans le sélecteur d’apps | Si le verrouillage est activé : le contenu est masqué dès que l’app passe en arrière-plan et, sur Android, la fenêtre est marquée sécurisée (FLAG_SECURE, module local `modules/nokori-secure`, aucune permission) : aperçu masqué et captures d’écran bloquées. |
| Regard par-dessus l’épaule | « Masquer les montants » remplace les sommes par •••. |
| Lecture des fichiers de l’app (sauvegarde, téléphone volé et forcé) | La base SQLite est chiffrée par **SQLCipher** (AES-256). La clé de 256 bits est tirée au hasard et rangée dans le trousseau iOS / Keystore Android avec `WHEN_UNLOCKED_THIS_DEVICE_ONLY` : elle ne part ni dans iCloud ni sur un autre appareil. Une base restaurée par iCloud sur un autre iPhone arrive donc sans sa clé : elle est illisible. L’app ne supprime rien d’elle-même : elle affiche un écran qui propose de restaurer une sauvegarde chiffrée ou, sur confirmation, de repartir de zéro (`KeyLostError`, `src/data/kv.native.ts`). |
| Sauvegarde Android copiée ailleurs | `allowBackup` est désactivé. |
| App publiée sans chiffrement par erreur | Dans l’app publiée, si `PRAGMA cipher_version` ne répond pas, l’app **refuse d’écrire**. |
| Fichier de données modifié ou corrompu | Chaque champ est relu et validé (types, bornes des montants, longueurs, nombre d’éléments). Une donnée invalide est écartée, l’app ne plante pas. |
| Injection dans la base | Requêtes paramétrées. La clé, seule valeur insérée dans un `PRAGMA`, doit faire exactement 64 caractères hexadécimaux. |
| Notifications lues sur l’écran verrouillé | Les rappels de prélèvement ne contiennent **aucun montant**. Ils nomment la charge (« Loyer sera prélevé le 5 »), sauf si « Masquer les montants » est activé : ils disent alors seulement qu’un prélèvement est prévu. |
| Fuite par le réseau | L’app ne fait aucun appel réseau, un test automatique le vérifie (`src/__tests__/security.test.js`). Sur Android, les versions distribuées n’ont même pas la permission Internet. |

## Sauvegarde chiffrée

- **Fichier** : créé seulement quand l’utilisateur le demande (Réglages › Sauvegarde et restauration), proposé par la feuille de partage du téléphone, puis effacé du cache de l’app. Nokori ne l’envoie nulle part.
- **Chiffrement** : clé dérivée de la phrase secrète par scrypt (N = 2^15, r = 8, p = 1 ; sel aléatoire de 16 octets), données chiffrées en AES-256-GCM (nonce aléatoire de 12 octets). L’en-tête (version, paramètres, date) est authentifié : toute modification du fichier est détectée. Bibliothèques `@noble/hashes` et `@noble/ciphers` 2.4.0, versions figées, auditées par Cure53, sans dépendance ni code natif.
- **Phrase secrète** : 8 caractères au moins, jamais enregistrée. Perdue, la sauvegarde ne peut plus être ouverte.
- **Restauration** : le fichier est vérifié avant tout calcul (format, version, paramètres bornés pour éviter un épuisement de mémoire), puis chaque donnée est validée comme au démarrage. Un résumé est affiché et l’utilisateur confirme avant le remplacement. Le verrouillage et les rappels sont désactivés après restauration, car ils dépendent du téléphone.
- **Tests** : `src/domain/__tests__/backup.test.ts` (13 tests : aller-retour, mauvaise phrase, octet modifié, en-tête trafiqué, faux fichier, version future, paramètres démesurés) et `e2e/backup.e2e.js` (parcours complet dans le navigateur).

## Fiabilité des données

- **Lecture** : trois cas distincts. Rien d’enregistré (premier lancement), données relues, ou données illisibles (fichier abîmé, version plus récente de l’app). Dans le dernier cas, rien n’est réécrit : une copie est gardée et l’utilisateur choisit (restaurer une sauvegarde, réessayer après une mise à jour, ou repartir de zéro après confirmation).
- **Stockage indisponible** (trousseau verrouillé, erreur SQLite) : écran « Réessayer » au lieu du questionnaire de départ. Avant ce correctif, répondre au questionnaire pouvait écraser toutes les données.
- **Écritures** : en file, dans l’ordre ; un échec affiche un bandeau. Double appui sans effet.
- **SQLCipher** : `PRAGMA temp_store = MEMORY` (pas de fichier temporaire de tri sur le disque) et `PRAGMA secure_delete = ON` (le contenu effacé est réellement écrasé).

## Ce qui est vérifié automatiquement

`src/__tests__/security.test.js` échoue si le code contient :

- un appel réseau (`fetch`, `XMLHttpRequest`, `WebSocket`, axios) ;
- du code exécuté dynamiquement (`eval`, `new Function`, `innerHTML`) ;
- un stockage en clair (`AsyncStorage`, ou `localStorage` hors de la version web de développement) ;
- des journaux de données (`console.log`, `console.info`, `console.debug`) ;
- une adresse `http://`, un lien externe ouvert ou une WebView.

Il vérifie aussi la clé liée à l’appareil, le refus d’écrire sans chiffrement, l’absence de montant dans les rappels, et la configuration (`allowBackup: false`, permissions retirées, manifeste de confidentialité iOS).

## Résultats de la revue

- **Dépendances** (`npm audit`) : 3 alertes modérées, toutes dans `minimatch` via `@expo/fingerprint`, un outil de compilation qui n’est pas embarqué dans l’app.
- **Secrets** : aucune clé ni aucun mot de passe dans le code ou la configuration.
- **Android** (vérifié par prebuild) : `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` et `SYSTEM_ALERT_WINDOW` sont retirées. Restent la biométrie (`USE_BIOMETRIC`, `USE_FINGERPRINT`), `VIBRATE`, les notifications (ajoutée par la bibliothèque) et `INTERNET`, qu’Expo ajoute par défaut et dont la version de développement a besoin pour se connecter à l’ordinateur. `allowBackup="false"`. Dans les versions bêta (`preview`) et stores (`production`), `app.config.js` retire aussi `INTERNET` : l’app ne peut matériellement pas accéder au réseau (vérifié par prebuild et par un test).
- **Modules de fichiers** (sauvegarde) : le prebuild de production du 15 novembre 2026 confirme que `expo-document-picker`, `expo-sharing` et `expo-file-system` n’ajoutent aucune permission Android restante : `INTERNET`, `READ_EXTERNAL_STORAGE` et `WRITE_EXTERNAL_STORAGE` sont retirées. `expo-file-system` embarque son propre manifeste de confidentialité iOS.
- **iOS** (vérifié par prebuild) : application pour iPhone uniquement (`TARGETED_DEVICE_FAMILY = 1`). Le texte d’autorisation Face ID est présent. `PrivacyInfo.xcprivacy` déclare l’absence de suivi et de données collectées. `ITSAppUsesNonExemptEncryption` vaut `false`.

## Points à confirmer avant publication

- **Chiffrement et export.** Nokori n’utilise le chiffrement que pour protéger ses propres données sur le téléphone, avec un algorithme standard. C’est en principe une utilisation exemptée de déclaration d’export aux États-Unis, d’où `usesNonExemptEncryption: false`. App Store Connect pose aussi une question sur la distribution en **France** : la même exemption s’applique en général aux usages de protection des données, mais à relire au moment de remplir le formulaire.
- **SQLCipher sur un vrai téléphone.** Le chiffrement ne se vérifie que sur une version compilée (EAS Build) : au lancement, aucun avertissement « SQLCipher absent » ne doit apparaître, et l’app refuse d’écrire sans chiffrement. À contrôler une fois sur iPhone et sur Android (voir docs/BETA.md).
- **Version web.** C’est une version de test, à partager avec des testeurs, pas une version publique. Elle n’a ni serveur ni accès réseau : les données restent dans le navigateur de chacun, mais en clair (`localStorage`), sans verrouillage ni rappels. Elle le dit dès le premier écran et dans les réglages, et demande aux moteurs de recherche de ne pas l’indexer (`noindex`). Pour de vrais chiffres, l’app pour téléphone reste la référence.

## Limites connues

- **Le verrouillage protège l’écran, pas la clé.** La clé de la base est lisible par l’app dès que le téléphone est déverrouillé (`requireAuthentication` n’est pas utilisé, pour ne pas tout perdre lors d’un changement d’empreinte). Les données sont déchiffrées en mémoire derrière le voile. Sur un téléphone rooté, débogué ou déjà déverrouillé par un tiers, le verrou de Nokori ne suffit pas.
- **La sauvegarde vaut ce que vaut sa phrase.** Le fichier est chiffré correctement, mais une phrase faible peut être retrouvée par essais hors ligne si le fichier est volé.
- **La version web n’est pas chiffrée** (voir plus haut).
- **Les tests de `security.test.js` lisent le code** : ce sont des garde-fous contre les régressions, pas des preuves de comportement. Le chiffrement réel, le verrou et `FLAG_SECURE` se vérifient sur un téléphone.
- **Permissions Android réellement présentes** (APK `preview` du 16 novembre 2026) : `USE_BIOMETRIC`, `USE_FINGERPRINT`, `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`, `WAKE_LOCK`, `VIBRATE`, `READ_APP_BADGE`, `ACCESS_NETWORK_STATE`, `BIND_JOB_SERVICE`, `DUMP`, ajoutées par les modules Expo. Pas d’`INTERNET`.

## Signaler un problème

Écrire au contact indiqué sur la fiche de l’app dans les stores. Merci de ne pas publier le problème avant qu’il soit corrigé.
