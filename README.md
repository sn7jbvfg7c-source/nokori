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
npm test           # tests du moteur de calcul
npm run typecheck  # vérification des types
```

## Organisation

| Dossier | Contenu |
| --- | --- |
| `src/domain` | Moteur de calcul, sans interface : budget du mois, charges fixes, argent en centimes, couleurs du mois |
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

## Avancement

- [x] 0. Fondations : Expo SDK 58, TypeScript, police Geist, couleurs du mois
- [x] 1. Moteur de calcul et ses tests
- [ ] 2. Accueil au premier lancement
- [x] 3. Budget : carte du mois et quatre piliers (première version, avec un profil d'exemple)
- [ ] 4 à 12 : voir le cahier des charges, onglet « Plan solo avec agents IA »
