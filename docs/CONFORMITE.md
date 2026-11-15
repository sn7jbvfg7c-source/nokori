# Audit de conformité (15 novembre 2026)

Audit du fonctionnement **réel** de Nokori : application de budget gratuite, sans compte, sans serveur, sans paiement ; données uniquement sur l’appareil (base chiffrée sur téléphone, stockage local du navigateur pour la version web de test).

> Ce document ne déclare pas l’application « conforme ». Les textes juridiques ont été rédigés avec une IA à partir du fonctionnement constaté : ils doivent être relus par un professionnel du droit, et plusieurs informations ne peuvent être fournies que par le propriétaire (`docs/A-COMPLETER.md`).

| # | Point | Constat | Ce qui a été fait | Reste à faire |
| --- | --- | --- | --- | --- |
| 1 | Mentions légales | Aucune page. Base légale vérifiée sur Légifrance : article 1-1 de la LCEN (rédaction de la loi n° 2024-449). | Page dans l’app (Réglages › Informations légales) et `docs/legal/mentions.md`, alimentées par `src/legal/config.ts`. Option d’anonymat du particulier (art. 1-1 II) gérée. Rien d’inventé : chaque manque s’affiche « [À compléter : …] ». | Fournir l’identité de l’éditeur ; obtenir l’adresse et le téléphone d’Expo. |
| 2 | Confidentialité | Ancien texte court. | Politique complète : données, finalité, lieu, destinataires (aucun), durée, sauvegarde, fonctions du téléphone, journaux de l’hébergeur web, transferts hors UE (Expo, DPF + CCT), stores, droits RGPD et leur exercice, CNIL, mineurs. | Durée de conservation des journaux d’Expo ; relecture juridique. |
| 3 | Conditions | Ancien texte court. | Conditions adaptées : gratuité, pas de compte, pas de conseil financier, engagements, responsabilité sans clause abusive (droits du consommateur préservés), arrêt d’utilisation, droit applicable, médiateur si professionnel. | Relecture juridique. |
| 4 | Remboursement | Aucun achat. | Page : rien à rembourser ; cadre prévu si des achats arrivent (prix TTC, abonnements, procédures Apple et Google, droit de rétractation et garantie légale rappelés). | À mettre à jour avant toute vente. |
| 5 | Cookies | Vérifié sur le site : **aucun cookie**, un seul hôte contacté. Seul le stockage local strictement nécessaire est utilisé. | Politique des cookies : clés de stockage listées, exemption expliquée, suppression. | — |
| 6 | Bandeau | Aucun traceur facultatif, donc rien à consentir : afficher un bandeau serait un faux choix. | Bandeau prêt et testé (Tout refuser / Personnaliser / Tout accepter, mêmes taille et style, rien de pré-coché, choix conservé et modifiable dans « Cookies et traceurs ») ; il s’affiche automatiquement dès qu’un traceur est déclaré dans `src/legal/consent.ts`. | Déclarer tout futur traceur à cet endroit. |
| 7 | Formulaires | Aucun formulaire n’envoie de données ; aucun marketing. | Information sur l’utilisation des données dès l’accueil (liens Confidentialité et Conditions), sans case à cocher ni case pré-cochée. | — |
| 8 | Minimisation | Ni nom, ni e-mail, ni date de naissance, ni identifiant bancaire. Champs libres (libellés, notes) seulement. | Politique : conseil de ne pas saisir d’informations sensibles. Rappels discrets (sans nom de charge) quand les montants sont masqués. | — |
| 9 | Outils tiers | Aucun SDK d’audience, de pub, de paiement ou d’authentification. | Inventaire documenté : `docs/TIERS.md` (Expo Hosting et Build, stores, modules locaux). | Demander le DPA et la localisation à Expo. |
| 10 | Pratiques manipulatrices | Aucune trouvée (pas de compte à rebours, pas d’urgence, refus visibles). | Vérifié ; bandeau conçu sans asymétrie. | — |
| 11 | Tarifs | App gratuite, aucun prix. | Gratuité indiquée dans les conditions et la politique de remboursement. | — |
| 12 | Avis clients | Aucun avis ni témoignage. Captures et vidéo marquées « données d’exemple ». | Vérifié. | — |
| 13 | Promesses | « Compatible avec VoiceOver, TalkBack » non vérifié sur appareil ; « aucun serveur » ambigu pour la version web. | Textes rendus factuels (fiches des stores, réglages). | Vérifier VoiceOver et TalkBack sur de vrais téléphones. |
| 14 | Images | Pas d’image dans l’app ; caractère 残 décoratif lu par les lecteurs d’écran. | 残 masqué aux lecteurs d’écran ; vidéo et icônes avec libellés ; icônes décoratives masquées. | — |
| 15 | Contraste | Audit axe sur 34 écrans, clair et sombre. | Repères « À compléter » corrigés en mode sombre. 0 violation. | — |
| 16 | Clavier | Navigation au clavier possible, focus visible ; Échap fermait toutes les fenêtres d’un coup. | Échap ferme la fenêtre du dessus seulement ; test clavier ajouté (Tab, Entrée, Échap). | Ordre de tabulation : la barre d’onglets passe avant le contenu (limite de la navigation d’Expo sur le web). |
| 17 | Mineurs | Aucune donnée collectée, pas d’âge demandé ; le seuil de 15 ans (art. 45 loi Informatique et libertés) ne s’applique qu’au consentement, absent ici. | Expliqué dans la politique et les conditions. | — |
| 18 | E-mails | Aucun e-mail envoyé. | Sans objet, documenté. | À prévoir si une lettre d’information est créée. |
| 19 | Licences | 530 paquets : MIT, ISC, BSD, Apache… ; Geist OFL ; Feather MIT ; aucune licence interdisant l’usage commercial. Origine des icônes non documentée. | Page « Licences », `docs/LICENCES.md` généré, générateur de l’icône remis dans le dépôt (`store/icons/generate.js`, police Noto Sans JP OFL). | — |
| 20 | Suppression | « Tout effacer » existait. | « Supprimer toutes mes données » (Réglages), avec confirmation, explication (aucune copie chez l’éditeur, sauvegardes rangées par l’utilisateur non touchées) et confirmation finale. | — |

## Tests exécutés

- `npm test` : tests unitaires, dont `src/__tests__/legal.test.ts` (documents, absence de données inventées, consentement) et `legal-docs.test.js` (documents à jour).
- `npm run e2e` : dont `e2e/legal.e2e.js` (pages légales, bandeau et ses trois choix, absence de cookie, suppression, clavier, petit écran et ordinateur) et l’audit d’accessibilité étendu aux pages légales et au bandeau.
- `npm run typecheck`, `npm run lint`, export web.

## Risques à faire vérifier par un humain

- Qualification de l’éditeur (particulier ou professionnel) et choix de l’anonymat : conséquences sur les mentions et la médiation.
- Application du RGPD à des données qui ne quittent jamais l’appareil (exception domestique, notion de responsable de traitement) : la politique est écrite de façon prudente.
- Journaux de connexion de l’hébergeur web (adresse IP) : responsabilité de l’éditeur pour le site de test, transferts vers les États-Unis.
- Accessibilité (European Accessibility Act) : champ d’application à une app gratuite d’un particulier non confirmé.
