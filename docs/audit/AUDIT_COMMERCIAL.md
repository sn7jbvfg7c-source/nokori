# Audit commercial de Nokori

Audit du 16 novembre 2026, sur le commit `48c96ff`, en vue d'une commercialisation sous la marque AVERYN.

Aucun système de paiement n'a été mis en place et aucun fichier n'a été modifié.

Les règles des stores ont été vérifiées le 16 novembre 2026 sur les pages officielles de Google et d'Apple (références en fin de document). Elles changent souvent : il faudra les revérifier au moment de l'inscription.

## Diagnostic

Nokori a un **positionnement rare et crédible** :
- le kakeibo japonais, simple et bienveillant ;
- aucune connexion bancaire, aucun compte, aucune donnée collectée ;
- l'app ne peut techniquement rien envoyer (pas de permission Internet).

Face aux agrégateurs bancaires, c'est un argument fort pour un public sensible à la vie privée. C'est aussi une contrainte : tout se saisit à la main.

Le produit est **techniquement prêt pour une bêta**. Il n'est **pas prêt à être vendu**. Ce qui manque est surtout hors du code :
- une entité juridique ;
- une marque protégée ;
- des comptes et des identifiants au nom d'AVERYN ;
- un modèle économique compatible avec la promesse de confidentialité ;
- des documents juridiques complets ;
- un support ;
- une présence en ligne.

## 1. Expérience utilisateur suffisamment aboutie ?

- **Oui pour une bêta.** Le parcours principal est complet et fiable : onboarding en une minute, budget, saisie, activité, bilan, sauvegarde. Il est couvert par 199 tests unitaires et 144 vérifications e2e, sans aucune violation d'accessibilité automatique.
- **Pas encore pour un produit payant** :
  - finitions visuelles inégales (`U1` à `U4`) ;
  - budgets non personnalisables (`F1`, `F2`) ;
  - pas d'export (`F3`) ;
  - risque de perte de données sans sauvegarde automatique (`F11`).

  Un utilisateur qui paie attend de pouvoir adapter ses catégories et de ne jamais perdre son historique.

## 2. Onboarding

**Points forts**
- 5 étapes : revenu, jour de paie, épargne, charges, récapitulatif.
- Catalogue de charges françaises (EDF, Navigo…).
- Message clair : « Le kakeibo, sans le carnet. »
- Vidéo de présentation, et restauration d'une sauvegarde proposée dès l'accueil.

**À améliorer**
- Pas de mode **démonstration** : il faut donner ses chiffres avant de voir l'app vivre (`F18`).
- L'écran est construit hors du système de design (`U2`). C'est pourtant l'écran des captures des stores.
- Aucun écran ne montre ce que l'offre Premium apporterait (il n'y en a pas encore).
- Français uniquement.

## 3. Identité de marque

**Nokori**
- Nom court et prononçable, sens fort (残, « ce qui reste »).
- Couleurs et kanji de saison, police Geist, ton juste et chaleureux.
- Mais la couleur de marque varie entre l'icône, l'onboarding et l'app (`U1`).

**AVERYN**
- **Absent du dépôt.** Aucune mention, aucune charte, aucun domaine connu.

**À construire**
- Une architecture de marque : « Nokori, par Averyn ». Les apps gardent leur nom et le studio les signe.
- Une charte commune à toutes les apps : typographie, ton, rigueur sur la confidentialité, signature visuelle.
- Un **design system partagé**. Celui de Nokori (`src/theme/tokens.ts`, `src/ui/kit.tsx`) est une bonne base pour en extraire un.

**À vérifier : antériorité des noms.** Il faut rechercher « Nokori » et « Averyn » dans les bases de l'INPI, de l'EUIPO et de l'OMPI (classes 9, 36 et 42), puis vérifier les noms de domaine et les comptes de réseaux sociaux. **Rien n'a été vérifié dans cet audit.**

## 4. Fonctionnalités Premium possibles

La contrainte de départ est la promesse de confidentialité : pas de serveur, pas de compte, rien ne sort du téléphone.

| Fonction | Valeur perçue | Compatible avec la promesse | Effort |
| --- | --- | --- | --- |
| Catégories et budgets personnalisés (`F1`) | Très forte | Oui | Moyen |
| Revenus multiples et variables (`F2`) | Forte | Oui | Moyen |
| Sauvegarde automatique chiffrée vers iCloud Drive ou Google Drive, par le sélecteur de fichiers du téléphone (`F11`) | Très forte | Oui : le fichier reste chiffré et l'éditeur n'a pas de serveur | Moyen |
| Export CSV et bilan PDF (`F3`) | Forte | Oui | Faible |
| Tendances sur 6 et 12 mois, bilan annuel, story partageable (`F7`) | Forte | Oui | Moyen |
| Widgets « Disponible » sur iOS et Android (`U15`) | Forte (usage quotidien) | Oui | Moyen |
| Défis supplémentaires, thèmes de saison, icônes alternatives | Moyenne | Oui | Faible |
| Budget partagé à deux | Très forte | **Non**, sans synchronisation (il faudrait un serveur ou un partage de fichiers chiffrés) | Élevé |
| Synchronisation entre appareils | Forte | **Non**, sauf un fichier chiffré partagé par iCloud ou Drive | Élevé |

**Recommandation.** Un socle gratuit complet, c'est-à-dire le kakeibo actuel, sans limite artificielle. « Nokori Plus » regrouperait la personnalisation, la sauvegarde automatique, l'export, les tendances et les widgets.

## 5. Licences et paiements

Rien n'existe aujourd'hui, et c'est normal.

Le choix du modèle a une **conséquence technique majeure** :
- **Achat intégré** (Apple In-App Purchase, Google Play Billing) : l'app doit contacter les stores. Il faut donc **la permission Internet** et la permission de facturation sur Android. Cela remet en cause le message « l'app ne peut techniquement rien envoyer » (`S15`). On peut rester honnête : « seul le store est contacté, pour l'achat ». La politique de confidentialité et les formulaires des stores devront alors changer.
- **App payante au téléchargement** : aucun code de paiement, aucun réseau, la promesse reste intacte. En revanche, ce modèle convertit mal, faute d'essai gratuit.
- **Pas de système de licence maison** (clé, serveur) : il contredirait la promesse et coûterait cher à sécuriser. Il vaut mieux s'appuyer sur les droits d'achat gérés par les stores.
- **Union européenne** : Apple a annoncé en août 2026 de nouvelles options (achat intégré, paiement alternatif, lien vers le web) avec des commissions différentes. Les termes exacts sont à vérifier avant toute décision.

**Décision à prendre avant tout développement (P0)** : gratuit avec option payante (achat unique ou abonnement), ou app payante.

Mon avis :
- un **achat unique « à vie »**, éventuellement complété par un abonnement plus tard, convient bien à une app sans frais de serveur et à un public attaché à la vie privée ;
- il faut **éviter les SDK tiers de paiement** (ils ajoutent un service qui communique avec ses serveurs) et utiliser directement StoreKit et Play Billing.

## 6. Support utilisateur

- La page « Aide et contact » existe et est publique (`/legal/assistance`), avec une FAQ.
- **Aucune adresse de contact n'existe** : le champ est « [À compléter] ». Apple exige des coordonnées réelles.
- Il manque :
  - une adresse sur le domaine d'AVERYN (par exemple support@…) ;
  - un délai de réponse annoncé ;
  - des réponses types ;
  - un suivi des demandes, même un simple tableau ;
  - une procédure pour « j'ai perdu mes données » (le cas le plus probable, voir `F11`).
- Sans analytics ni rapport de plantage, le support sera **la seule source de retours** avec les avis des stores.

## 7. Politique de confidentialité

- Elle est rédigée, fidèle au fonctionnement réel et publique (`/legal/confidentialite`).
- Il reste des « [À compléter] » : identité de l'éditeur, coordonnées de l'hébergeur, durée de conservation des journaux.
- Elle doit être **relue par un juriste**.
- Elle devra être **réécrite** si des achats intégrés (réseau) ou un service quelconque sont ajoutés.
- Il vaudrait mieux la publier sur le domaine d'AVERYN plutôt que sur `nokori.expo.app`, un site de test hébergé chez un tiers.

## 8. Mentions légales et conditions générales

- Mentions légales, conditions d'utilisation, remboursement, cookies et licences sont rédigés (`src/legal/`). Il manque 13 informations (`docs/A-COMPLETER.md`).
- **Pour vendre**, il faudra :
  - un **statut professionnel** (micro-entreprise ou société AVERYN) avec SIRET, TVA si applicable et **médiateur de la consommation** (obligatoire pour un professionnel qui vend à des consommateurs) ;
  - des **conditions générales de vente** : prix, droit de rétractation pour un contenu numérique, garanties légales ;
  - une politique de remboursement mise à jour.
- **Accessibilité** : si AVERYN est une entreprise qui vend une app, il faut vérifier si l'obligation européenne d'accessibilité s'applique (European Accessibility Act, en vigueur depuis juin 2025 ; exemption possible pour les microentreprises de services). L'app est déjà très accessible, ce qui facilite les choses.
- **Chiffrement** : déclarations Apple et ANSSI à vérifier (voir `S10`).

## 9. Préparation Google Play et App Store

**Prêt**
- Textes des fiches, vérifiés par un test de longueur (`store/texts.js`, `store/FICHES.md`).
- 6 captures iPhone et 6 captures Android, image de présentation, icône 512.
- Vidéo de 38 secondes.
- `store.config.js` pointe vers les pages publiques et refuse l'envoi tant qu'il manque des informations.
- Guides `docs/BETA.md` et `docs/PUBLICATION.md`.

**Manque (vérifié sur les pages officielles le 16 novembre 2026)**
- **Comptes développeur**
  - Apple : 99 USD par an.
  - Google : 25 USD, en une seule fois.
  - **Un compte d'organisation (AVERYN) exige un numéro D-U-N-S** chez Apple comme chez Google. Il est gratuit, mais son obtention peut prendre plusieurs semaines.
- **Google, compte personnel récent** : avant d'accéder à la production, un test fermé avec **au moins 12 testeurs pendant au moins 14 jours d'affilée** est obligatoire. C'est à prévoir dans le calendrier.
- **Identifiants définitifs**
  - Le bundle `app.nokori` ne pourra **plus jamais être changé** après la première publication.
  - Le projet Expo appartient au compte personnel `thomasbofill`.
  - Le dépôt GitHub est sur un autre compte.

  Il faut **décider avant la première soumission** : transférer le projet vers une organisation AVERYN et choisir le bundle (`app.nokori` si le domaine nokori.app est détenu, sinon par exemple `com.averyn.nokori`).
- **Formulaires des stores** : section « Sécurité des données » de Google, « Confidentialité de l'app » d'Apple, classification par âge, déclaration de chiffrement. Ils dépendent du modèle économique (réseau ou non).
- Captures à refaire après la passe de finition (onboarding et carte du mois).
- Tests sur vrais appareils, iPhone compris (`S8`).

## 10. Site internet et présence commerciale

- **Aujourd'hui** : seule existe la version web de test (`nokori.expo.app`).
- **À créer** :
  1. un **site AVERYN** : le studio, sa promesse (« apps premium qui respectent votre vie privée »), ses apps, contact presse ;
  2. une **page Nokori** : bénéfices, captures, vidéo, liens vers les stores, FAQ, et pages légales sur le domaine d'AVERYN ;
  3. un **kit presse** : logo, icônes, captures, texte court et long ;
  4. un **canal d'annonce** : lettre d'information **avec consentement explicite**, réseaux sociaux.
- **Statut de la version web** : en faire une **démo à données fictives** liée à la page Nokori, ou la retirer (`F12`). Ne pas la laisser servir à saisir de vraies données.
- **Mesure** : aucun outil d'analyse dans l'app (c'est un choix cohérent). On s'appuiera sur les statistiques globales des stores et sur des enquêtes facultatives.

## Problèmes commerciaux

| ID | Problème | Localisation | Impact | Solution recommandée | Prio | Dépend de |
| --- | --- | --- | --- | --- | --- | --- |
| C1 | Pas d'entité juridique ni de statut d'éditeur (particulier ou société) | `src/legal/config.ts`, `docs/A-COMPLETER.md` | Vente impossible ; mentions légales et CGV incomplètes | Créer la structure AVERYN (ou une micro-entreprise), SIRET, TVA, compte bancaire, médiateur | P0 | — |
| C2 | Identifiants liés à des comptes personnels ; bundle définitif non arrêté | `app.json:11,40,88` (bundle, package, `owner`), compte Expo, dépôt GitHub | Irréversible après la première publication | Organisation Expo et GitHub AVERYN, choix du bundle, transfert avant la soumission | P0 | C1, C3 |
| C3 | Marques et domaines non vérifiés ni déposés | — | Risque de conflit ou de renommage forcé | Recherche d'antériorité, dépôt INPI ou EUIPO, achat des domaines | P0 | — |
| C4 | Modèle économique non décidé ; l'achat intégré impose Internet | `app.config.js` (INTERNET bloqué) | Contradiction possible avec la promesse ; architecture à adapter | Décider : achat unique, abonnement ou app payante ; StoreKit et Play Billing en direct | P0 (décision) | S15 |
| C6 | Documents juridiques incomplets ; CGV absentes ; relecture juridique non faite | `src/legal/`, `docs/legal/` | Non-conformité, refus des stores | Compléter, rédiger les CGV, relecture par un juriste | P0 | C1, C4 |
| C7 | Aucun contact de support réel | `src/legal/config.ts` (e-mail `null`), `/legal/assistance` | Exigé par Apple ; utilisateurs sans recours | Adresse support sur le domaine d'AVERYN, procédure et réponses types | P0 | C3 |
| C8 | Comptes développeur absents ; D-U-N-S pour une organisation ; règle Google des 12 testeurs pendant 14 jours | — | Délais administratifs de plusieurs semaines | Lancer tôt : D-U-N-S, comptes Apple et Google | P0 | C1 |
| C9 | Formulaires des stores (sécurité des données, confidentialité, âge, chiffrement) non remplis | Consoles des stores | Publication impossible | Remplir après la décision C4 | P0 | C4, S10 |
| C16 | Pas de bêta fermée organisée | `docs/BETA.md` | Lancement sans retours réels ; règle Google | TestFlight et test fermé Play, 12 testeurs ou plus, recueil des retours | P0 | C8, S8 |
| C5 | Offre Premium non définie | — | Pas de revenu | Construire « Nokori Plus » avec F1, F2, F3, F7, F11 et U15 | P1 | C4 |
| C10 | Ni site AVERYN ni page Nokori ; pages légales chez un tiers | — | Crédibilité, référencement, exigence des stores | Site studio, page produit, pages légales sur le domaine | P1 | C3 |
| C13 | Positionnement et concurrence non étudiés | — | Prix et message au hasard | Étude rapide : concurrents, prix, avis ; mots-clés des stores | P1 | — |
| C15 | Applicabilité de l'obligation européenne d'accessibilité non vérifiée | — | Risque juridique | Avis d'un juriste ; l'app part de très haut | P1 | C1 |
| C17 | Pas de charte ni de design system AVERYN | `src/theme`, `src/ui/kit.tsx` | Incohérence entre les futures apps | Extraire les jetons et le kit en un design system partagé | P1 | U1 |
| C11 | Onboarding sans démonstration ni présentation de l'offre ; français seul | `OnboardingScreen.tsx` | Conversion | Mode démo, écran d'offre non intrusif | P2 | F18, C5 |
| C12 | Aucune mesure d'usage (choix) | — | Décisions à l'aveugle | Statistiques des stores, enquêtes facultatives, retours du support | P2 | — |
| C14 | Captures à refaire après la finition | `store/screenshots/` | Fiche moins attrayante | Régénérer avec les scripts `store/` | P2 | U1–U4 |

## Sources consultées le 16 novembre 2026

- Google Play, test fermé pour les nouveaux comptes personnels : support.google.com/googleplay/android-developer/answer/14151465
- Google Play, D-U-N-S pour les organisations : support.google.com/googleplay/android-developer/answer/13634885
- Google Play, frais d'inscription : support.google.com/googleplay/android-developer/answer/6112435
- Apple Developer Program, prix et D-U-N-S : developer.apple.com/programs/enroll/
- Apple, changements pour l'UE (août 2026) : apple.com/newsroom/2026/08/apple-announces-changes-for-apps-in-the-european-union
