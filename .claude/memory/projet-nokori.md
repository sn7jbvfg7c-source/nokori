---
name: projet-nokori
description: Ce qu'est Nokori, où en est le projet et les décisions importantes
type: project
---

Nokori (残, « ce qui reste ») : app de budget kakeibo, gratuite, sans compte ni serveur ni banque. Données uniquement sur l'appareil (SQLCipher + clé SecureStore sur téléphone ; localStorage pour la version web de test). Expo SDK 58, React Native, TypeScript ; on travaille directement sur `main`.

État au 15 novembre 2026 : étapes 0 à 16 faites (voir « Avancement » du README). Dernier gros chantier : audit de conformité en 20 points (`docs/CONFORMITE.md`, commit 9e9cf70), déployé sur nokori.expo.app.

Décisions à ne pas défaire sans raison :
- Bandeau de consentement codé mais masqué tant qu'aucun traceur facultatif n'existe (`src/legal/consent.ts`, `OPTIONAL_TRACKERS = []`) : en afficher un serait un faux choix.
- Documents juridiques générés depuis `src/legal/config.ts` (champs de l'éditeur à `null`) ; `npm run legal:docs` régénère `docs/legal/` et un test vérifie qu'ils sont à jour.
- Plugin expo-router en `asyncRoutes: false` (sinon écrans blancs dans les tests web).
- Montants en centimes entiers ; aucune requête réseau dans l'app (test de sécurité qui l'interdit ; Android sans permission Internet).

Reste à faire (côté propriétaire) : remplir `docs/A-COMPLETER.md` (13 éléments : statut, identité, adresse, téléphone, e-mail, SIRET… et adresse/téléphone/durée des journaux d'Expo), faire relire les textes par un juriste, comptes Apple/Google et envoi aux stores (`docs/PUBLICATION.md`). Côté technique : test VoiceOver/TalkBack et vérification de FLAG_SECURE sur vrais téléphones.

Fait le 16/11/2026 : page « Aide et contact » (`/legal/assistance`, adresses dans `store.config.js`, qui refuse l'envoi tant que `docs/A-COMPLETER.md` liste des manques) ; FLAG_SECURE Android via le module local `modules/nokori-secure` (pas expo-screen-capture : il enregistre un détecteur de captures qui exige une permission sur Android 14, sinon plantage) ; typographie française (`scripts/typo-fr.js`, vérifiée par un test : les tests e2e doivent comparer les textes avec `\s`, pas une espace simple) ; l'ordre clavier web était déjà bon. APK de test (profil preview) recompilé le 16/11 avec tous ces correctifs : aucune permission Internet, module NokoriSecure inclus.

**Why:** reprendre sans tout relire ni refaire des choix déjà tranchés.

**How to apply:** vérifier `git log` et le README avant d'agir ; ces informations datent du 15/11/2026.

Lot « Sécurité et fiabilité » (16/11/2026, commits 843493e → D3) : D4, A2, A1, B, C, D1, E1, E2, E3, D2, D3 faits, un commit chacun. Restent volontairement : campagne sur téléphones (`docs/TESTS-APPAREILS.md`) et choix du coût scrypt A3 (rester à 2^15 sauf si 2^16 < 2-3 s sur Android d'entrée de gamme ; ne pas dépasser 2^16 pour les APK déjà distribués). Intégration continue : `.github/workflows/ci.yml`, vérifiable avec les outils GitHub Actions du dépôt `sn7jbvfg7c-source/nokori`. Le texte de typographie est contrôlé par un test : lancer `node scripts/typo-fr.js` après avoir écrit des textes.
