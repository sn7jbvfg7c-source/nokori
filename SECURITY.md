# Sécurité de Nokori

Nokori est une app de suivi de budget **manuelle** : elle ne se connecte à aucune banque, ne déplace pas d’argent et n’envoie rien sur Internet. Ce document liste ce qu’on protège, contre quoi, comment, et ce qui a été vérifié (revue du 15 novembre 2026, version 1.0.0).

## Ce qu’on protège

- Revenus, charges fixes, dépenses, soldes de comptes, objectifs et notes du mois.
- Ces données restent **uniquement sur le téléphone**. Il n’y a ni serveur, ni compte utilisateur, ni analytics, ni publicité.

## Contre quoi

| Risque | Protection |
| --- | --- |
| Quelqu’un prend le téléphone déverrouillé | Verrouillage Face ID / Touch ID / empreinte (Réglages). Il revient tout seul après 1 minute en arrière-plan. |
| L’aperçu de l’app dans le sélecteur d’apps | Le contenu est masqué dès que l’app passe en arrière-plan (si le verrouillage est activé). |
| Regard par-dessus l’épaule | « Masquer les montants » remplace les sommes par •••. |
| Lecture des fichiers de l’app (sauvegarde, téléphone volé et forcé) | La base SQLite est chiffrée par **SQLCipher** (AES-256). La clé de 256 bits est tirée au hasard et rangée dans le trousseau iOS / Keystore Android avec `WHEN_UNLOCKED_THIS_DEVICE_ONLY` : elle ne part ni dans iCloud ni sur un autre appareil. Une base restaurée par iCloud sur un autre iPhone arrive donc sans sa clé : elle est illisible, et l’app la remplace par une base vide au lieu de rester bloquée. |
| Sauvegarde Android copiée ailleurs | `allowBackup` est désactivé. |
| App publiée sans chiffrement par erreur | Dans l’app publiée, si `PRAGMA cipher_version` ne répond pas, l’app **refuse d’écrire**. |
| Fichier de données modifié ou corrompu | Chaque champ est relu et validé (types, bornes des montants, longueurs, nombre d’éléments). Une donnée invalide est écartée, l’app ne plante pas. |
| Injection dans la base | Requêtes paramétrées. La clé, seule valeur insérée dans un `PRAGMA`, doit faire exactement 64 caractères hexadécimaux. |
| Notifications lues sur l’écran verrouillé | Les rappels de prélèvement ne contiennent **aucun montant**. |
| Fuite par le réseau | L’app ne fait aucun appel réseau, un test le vérifie à chaque lancement. Sur Android, les versions distribuées n’ont même pas la permission Internet. |

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
- **iOS** (vérifié par prebuild) : le texte d’autorisation Face ID est présent. `PrivacyInfo.xcprivacy` déclare l’absence de suivi et de données collectées. `ITSAppUsesNonExemptEncryption` vaut `false`.

## Points à confirmer avant publication

- **Chiffrement et export.** Nokori n’utilise le chiffrement que pour protéger ses propres données sur le téléphone, avec un algorithme standard. C’est en principe une utilisation exemptée de déclaration d’export aux États-Unis, d’où `usesNonExemptEncryption: false`. App Store Connect pose aussi une question sur la distribution en **France** : la même exemption s’applique en général aux usages de protection des données, mais à relire au moment de remplir le formulaire.
- **Version web.** Elle sert seulement aux tests. Elle stocke les données en clair dans le navigateur et n’a pas de verrouillage. Elle ne doit pas être publiée.

## Signaler un problème

Écrire au contact indiqué sur la fiche de l’app dans les stores. Merci de ne pas publier le problème avant qu’il soit corrigé.
