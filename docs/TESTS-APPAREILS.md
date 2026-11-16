# Protocole de tests sur appareils

Ce que les tests automatiques ne peuvent pas prouver se vérifie ici, à la main, sur de **vrais téléphones**. Il s'agit du chiffrement réel, du verrou, du masquage de l'aperçu, de la vitesse du chiffrement des sauvegardes et de la restauration sur un autre appareil. Chaque test indique ce qu'il faut faire, le résultat attendu et la preuve à garder.

Rédigé le 16 novembre 2026, pour la version qui suit le lot « Sécurité et fiabilité ».

## 1. Préparation

**Appareils** (minimum) :

| Appareil | Pourquoi |
| --- | --- |
| 1 Android récent (Android 14 ou plus) | Comportement de référence, `FLAG_SECURE`, retrait d'empreinte |
| 1 Android d'entrée de gamme (2 Go de RAM environ) | Vitesse du chiffrement des sauvegardes (décision A3), mémoire |
| 1 iPhone (iOS 17 ou plus) | Face ID, trousseau, voile du sélecteur d'apps. Nécessite le compte Apple Developer : impossible avant |

**Versions de l'app** :
- Android : APK du profil `preview`, compilé avec `EXPO_TOKEN=jeton-factice npx -y eas-cli@latest build --platform android --profile preview` (sans permission Internet, sans mode développement).
- iPhone : version TestFlight (profil `production` ou `preview`), dès que le compte Apple existe.
- Pour le test 8 seulement : une version de **développement** (profil `development`). Elle ne doit jamais être distribuée.

**Précautions** :
- **Avant d'installer la nouvelle version, faire une sauvegarde** depuis la version actuelle (Réglages › Sauvegarde et restauration). Garder le fichier et sa phrase.
- Pour les captures d'écran envoyées comme preuve, activer **Masquer les montants**. Les captures du diagnostic ne contiennent aucun montant, mais les autres écrans en contiennent.
- Ne jamais envoyer de fichier `.nokori` ni de phrase secrète par messagerie au développeur.

**Noter pour chaque appareil** : modèle, version d'Android ou d'iOS, version de Nokori (Réglages, en bas), date.

## 2. Tests

### Test 1 : diagnostic de sécurité

Réglages › Sécurité et rappels › **Vérifier la protection**.

| Ligne | Résultat attendu |
| --- | --- |
| Données chiffrées sur ce téléphone | ✓, avec une version de SQLCipher (par exemple « 4.x community ») |
| Clé rangée dans le trousseau du téléphone | ✓ |
| Calculs de chiffrement corrects | ✓ (vecteurs officiels recalculés par le téléphone lui-même) |
| Verrouillage | Selon le réglage |
| Sauvegarde | Selon la dernière sauvegarde |

**Preuve** : capture de l'écran entier. **Échec** si une ligne « chiffrement » ou « clé » est en alerte : ne pas continuer, signaler.

### Test 2 : vitesse du chiffrement des sauvegardes (décision A3)

Même écran, bouton **Mesurer**. Le relancer 3 fois et noter les durées.

| Appareil | Réglage actuel (2^15) | Deux fois plus résistant (2^16) |
| --- | --- | --- |
| Android récent | … s | … s |
| Android entrée de gamme | … s | … s |
| iPhone | … s | … s |

**Règle de décision** : on ne passera au réglage 2^16 que si la mesure la plus lente reste sous **2 à 3 secondes** sur l'Android d'entrée de gamme. Sinon, on reste à 2^15. Les anciennes sauvegardes restent lisibles dans tous les cas : le lecteur accepte jusqu'à 2^17.

### Test 3 : verrouillage (Android)

Activer Réglages › Verrouillage. Puis :

| # | Action | Résultat attendu |
| --- | --- | --- |
| 3.1 | Fermer l'app (balayer dans les apps récentes), la rouvrir | Écran « Nokori est verrouillée », demande d'empreinte immédiate |
| 3.2 | Annuler la demande | Reste verrouillée, **aucun** message d'erreur, bouton « Déverrouiller » |
| 3.3 | Mauvais doigt plusieurs fois | « Non reconnu » puis « Trop d'essais. Utilisez le code du téléphone… », le code est proposé |
| 3.4 | Déverrouiller, passer en arrière-plan moins d'une minute, revenir | Pas de nouvelle demande |
| 3.5 | Arrière-plan plus d'une minute, revenir | Nouvelle demande |
| 3.6 | Supprimer toutes les empreintes du téléphone (garder le code), rouvrir Nokori | Le **code du téléphone** déverrouille ; le verrou reste **activé** |
| 3.7 | Retirer aussi le code du téléphone, rouvrir Nokori | L'app s'ouvre ; un avis « Le verrouillage a été désactivé le … » apparaît au-dessus des onglets et dans les Réglages, et reste après fermeture de l'app jusqu'à « Compris » |
| 3.8 | Remettre un code et une empreinte, réactiver le verrou | L'avis disparaît |

**Preuve** : captures de 3.2, 3.3 et 3.7. **Échec grave** : le verrou se désactive en 3.2, 3.3 ou 3.6.

### Test 4 : verrouillage (iPhone)

Mêmes étapes avec Face ID. En plus : couvrir la caméra pendant la demande (Face ID échoue), puis vérifier que le code de l'iPhone est proposé et que **le verrou reste activé**.

### Test 5 : aperçu masqué et captures

| # | Action | Résultat attendu |
| --- | --- | --- |
| 5.1 | Android, verrou **activé** : ouvrir les apps récentes | Aperçu de Nokori vide ou gris (`FLAG_SECURE`) |
| 5.2 | Android, verrou activé : faire une capture d'écran dans Nokori | Refusée par le système |
| 5.3 | Android, verrou **désactivé** : capture d'écran | Autorisée |
| 5.4 | iPhone, verrou activé : sélecteur d'apps | Voile Nokori (logo), pas de montants |

**Preuve** : photo de l'écran prise avec un autre appareil pour 5.1 et 5.4.

### Test 6 : sauvegarde et restauration sur un autre téléphone

| # | Action | Résultat attendu |
| --- | --- | --- |
| 6.1 | Créer une sauvegarde avec « 123456789012 » | Refusée : « Trop prévisible » |
| 6.2 | Créer une sauvegarde avec une phrase de 4 mots | Jauge « Excellente », fichier partagé (Fichiers, Drive…) |
| 6.3 | Sur un **autre** téléphone : installer Nokori, « J'ai déjà une sauvegarde Nokori », choisir le fichier, entrer la phrase | Résumé exact (nombre de dépenses, comptes, objectifs), puis données identiques |
| 6.4 | Restaurer avec une mauvaise phrase | « Phrase secrète incorrecte… », rien n'est remplacé |
| 6.5 | Restaurer la sauvegarde faite **avec l'ancienne version** (préparation, phrase de 8 caractères possible) | Restauration réussie : les anciennes sauvegardes restent compatibles |

### Test 7 : mise à jour sans perte

Installer la nouvelle version **par-dessus** l'ancienne, qui contient des données (même clé de signature).

**Résultat attendu** : toutes les données sont là, verrou et réglages compris. Le diagnostic (test 1) est entièrement ✓.

### Test 8 : écran d'erreur (version de développement uniquement)

1. Lancer la version `development`, ouvrir le débogueur JavaScript (touche `j` dans le terminal d'Expo).
2. Dans la console : `globalThis.__NOKORI_TEST_FLAGS = { 'test-plantage': 'budget' }`, puis toucher l'onglet Activité, puis Budget.
3. **Attendu** : « Un problème est survenu », barre d'onglets visible, détails techniques sans montant.
4. `globalThis.__NOKORI_TEST_FLAGS = {}` puis « Réessayer » : le Budget revient, données intactes.

Dans une version `preview` ou `production`, ce drapeau n'a **aucun effet** : à vérifier une fois en répétant l'étape 2 sur l'APK, où il ne doit rien se passer.

### Test 9 : clé perdue (iPhone)

1. Faire une sauvegarde Nokori (fichier).
2. Restaurer une sauvegarde iCloud de l'iPhone sur un **autre** iPhone.
3. Ouvrir Nokori.

**Attendu** : écran « données illisibles » qui propose de restaurer un fichier, sans rien supprimer d'office. La restauration du fichier fonctionne. « Repartir de zéro » demande une confirmation.

### Test 10 : permissions et rappels

- Android, Paramètres › Applications › Nokori › Autorisations : pas d'accès Internet. Seulement les notifications, si elles ont été autorisées.
- Activer « Avant chaque prélèvement » avec une charge dans 3 jours : la notification arrive à 9 h, **sans montant**. Si « Masquer les montants » est activé, elle ne nomme pas la charge.

## 3. Feuille de résultats

Recopier ce tableau par appareil :

| Test | Résultat (✓ / ✗) | Remarque | Preuve (nom de la capture) |
| --- | --- | --- | --- |
| 1 Diagnostic | | | |
| 2 Vitesse (3 mesures) | | | |
| 3 / 4 Verrou | | | |
| 5 Aperçu et captures | | | |
| 6 Sauvegarde et restauration | | | |
| 7 Mise à jour | | | |
| 8 Écran d'erreur | | | |
| 9 Clé perdue (iPhone) | | | |
| 10 Permissions et rappels | | | |

En cas d'échec : ne pas désinstaller l'app, faire une sauvegarde si possible, noter les étapes exactes et envoyer la feuille avec les captures (montants masqués).
