# Nokori

Suivi de budget selon la méthode kakeibo. Version 1 manuelle : les dépenses se saisissent à la main, toutes les données restent sur le téléphone, aucune connexion bancaire, aucun serveur.

## Lancer le projet

```bash
npm install
npm run web        # dans le navigateur
npm run ios        # simulateur iPhone (Mac) ou Expo Go
npm run android    # émulateur Android ou Expo Go
```

## Vérifier

```bash
npm test           # tests unitaires (moteur, accueil, données relues)
npm run typecheck  # vérification des types
npm run lint       # règles de code
npm run e2e        # parcours complets dans la version web : accueil, dépense, calendrier, activité, comptes, objectifs, bilan, réglages, puis audit d’accessibilité axe-core de 26 écrans en clair et en sombre (Playwright)
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app` | Routes (Expo Router) : onglets `(tabs)/index` (budget et calendrier), `(tabs)/activite`, `(tabs)/comptes`, `(tabs)/objectifs` et `(tabs)/bilan`, `accueil`, `depense` et `reglages` (fenêtres) |
| `src/domain` | Moteur de calcul, sans interface : budget du mois, charges fixes, argent en centimes, couleurs du mois, accueil |
| `src/data` | Stockage : base SQLite chiffrée (SQLCipher) sur téléphone, validation de tout ce qui est relu |
| `src/state` | État de l'app et enregistrement automatique |
| `src/domain/__tests__` | Tests du moteur |
| `src/theme` | Palettes claire et sombre, contexte de thème, typographie |
| `src/ui` | Composants : carte du mois, liste des piliers |
| `src/screens` | Écrans |
| `e2e` | Captures et tests dans la version web |

## Règles du projet

- Tous les montants sont des centimes entiers, jamais des nombres à virgule.
- Les dates des charges se calculent en UTC : l'heure d'été ne décale aucune échéance.
- Nokori ne déplace jamais d'argent : aucune formulation ne doit le laisser croire (« épargne prévue », pas « mis de côté »).
- Aucune donnée ne quitte le téléphone dans la version 1.
- Base chiffrée par SQLCipher, clé aléatoire de 256 bits dans le trousseau, liée à l'appareil. L'app publiée refuse d'écrire si le chiffrement est absent.
- Tout ce qui est relu du stockage est validé champ par champ.

## Fonctions natives

Le verrouillage Face ID et les rappels n'existent pas dans le navigateur : ils sont indiqués « indisponibles » dans la version web et se testent sur une version de développement.

## Accessibilité

Ce qui est vérifié automatiquement :

- **Audit axe-core** (`e2e/a11y.e2e.js`) : chaque écran, en clair et en sombre. Il contrôle les contrastes, les noms des boutons, les rôles (onglets, interrupteurs, choix), la story et la barre de progression de l’accueil. Il vérifie aussi que le texte visible d’un bouton fait partie de son nom, pour la commande vocale.
- **Contrastes des palettes** (`src/theme/__tests__/contrast.test.ts`) : le texte reste lisible (4,5:1 au moins) sur tous les fonds, les 12 couleurs de mois et les étiquettes d’objectif.

Ce que l’app fait :

- Avec VoiceOver ou TalkBack, ou avec « Réduire les animations », la story du mois n’avance plus toute seule.
- Le texte suit la taille choisie dans le téléphone. Seuls les grands chiffres et les titres sont plafonnés (×1,3) pour ne pas casser la mise en page.
- Chaque montant a un libellé lisible par le lecteur d’écran (« Il reste 1 234 € à dépenser ») et les montants masqués sont annoncés comme tels.

À vérifier à la main sur un vrai téléphone, avant la bêta :

1. iPhone, Réglages > Accessibilité > VoiceOver : faire le tour des 5 onglets, ajouter une dépense, ouvrir la story.
2. Taille du texte au maximum (Réglages > Accessibilité > Affichage et taille du texte > Police plus grande) : rien ne doit être coupé ni se chevaucher.
3. Android, TalkBack : même parcours que le point 1.

## Tester sur un téléphone

Le chiffrement SQLCipher n'existe pas dans Expo Go : pour tester la vraie app, il faut une version de développement (`npx eas-cli@latest build --profile development`). Le pas à pas complet, jusqu’à TestFlight et Google Play, est dans [docs/BETA.md](docs/BETA.md). Dans Expo Go, l'app fonctionne mais affiche un avertissement : base non chiffrée, réservé au développement.

## Avancement

- [x] 0. Fondations : Expo SDK 58, TypeScript, police Geist, couleurs du mois
- [x] 1. Moteur de calcul et ses tests
- [x] 2. Accueil au premier lancement : revenu, paie, épargne, charges fixes (liste ou saisie), récapitulatif
- [x] Stockage local chiffré et navigation
- [x] 3. Budget : carte du mois et quatre piliers (première version, avec un profil d'exemple)
- [x] 4. Saisie d'une dépense : pavé numérique, catégories par pilier, libellé, aujourd'hui ou hier, confirmation avec « Annuler »
- [x] 5. Calendrier : du mois dernier à dans 3 mois, couleur du mois, charges reportées, paie, dépenses, détail du jour
- [x] 6. Activité : liste par jour (dépenses et charges passées), filtres par pilier, suppression confirmée, repérage des dépenses régulières ; barre d'onglets
- [x] 7. Comptes saisis à la main : courant, livret, placement, espèces ; solde signé (découvert), date de mise à jour, totaux
- [x] 8. Objectifs : montant visé, déjà épargné, versement mensuel, versements notés, date d'arrivée (et variante avec le reste du mois) ; défis semaine sans envies et série sous le budget du jour
- [x] 9. Bilan : mois en cours et mois précédent, épargné, répartition, quatre questions, note « comment faire mieux » par mois, piliers ; story du mois clos en 5 écrans
- [x] 10. Réglages : thème auto, clair ou sombre (palettes vérifiées WCAG AA), masquer les montants, verrouillage Face ID, rappels locaux 3 jours avant chaque charge (sans montant), tout effacer
- [x] 11a : revue de sécurité (voir [SECURITY.md](SECURITY.md)) : test automatique « aucun réseau, aucun code dynamique, aucun stockage en clair », pas de sauvegarde Android, permissions inutiles retirées, manifeste de confidentialité iOS
- [x] 11b : accessibilité : audit automatique de 26 écrans, contrastes renforcés (teintes de 7 mois, vermillon, texte secondaire), noms des boutons, story sans défilement automatique pour VoiceOver/TalkBack et « Réduire les animations », grands chiffres plafonnés
- [x] 11c : préparation de la bêta : `eas.json` (développement, bêta interne, stores), icône et écran de démarrage 残, permission Internet retirée des versions distribuées sur Android, politique de confidentialité et conditions ([docs/](docs)), guide [docs/BETA.md](docs/BETA.md)
- [ ] 12 : publication
