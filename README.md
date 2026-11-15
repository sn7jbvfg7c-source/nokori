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
npm run e2e        # parcours complets dans la version web : accueil, dépense, calendrier, activité, comptes (Playwright)
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/app` | Routes (Expo Router) : onglets `(tabs)/index` (budget et calendrier), `(tabs)/activite` et `(tabs)/comptes`, `accueil`, `depense` (fenêtre de saisie) |
| `src/domain` | Moteur de calcul, sans interface : budget du mois, charges fixes, argent en centimes, couleurs du mois, accueil |
| `src/data` | Stockage : base SQLite chiffrée (SQLCipher) sur téléphone, validation de tout ce qui est relu |
| `src/state` | État de l'app et enregistrement automatique |
| `src/domain/__tests__` | Tests du moteur |
| `src/theme` | Couleurs et typographie du prototype |
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

## Tester sur un téléphone

Le chiffrement SQLCipher n'existe pas dans Expo Go : pour tester la vraie app, il faut une version de développement (`npx eas-cli@latest build --profile development`). Dans Expo Go, l'app fonctionne mais affiche un avertissement : base non chiffrée, réservé au développement.

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
- [ ] 8 à 12 : voir le cahier des charges, onglet « Plan solo avec agents IA »
