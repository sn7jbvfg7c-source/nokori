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

Reste à faire (côté propriétaire) : remplir `docs/A-COMPLETER.md` (13 éléments : statut, identité, adresse, téléphone, e-mail, SIRET… et adresse/téléphone/durée des journaux d'Expo), faire relire les textes par un juriste, comptes Apple/Google et envoi aux stores (`docs/PUBLICATION.md`). Côté technique : nouvelle version Android (l'APK de test est antérieur aux derniers correctifs), FLAG_SECURE Android non fait, espaces insécables avant « : ? % » non faits, test VoiceOver/TalkBack sur vrais téléphones.

**Why:** reprendre sans tout relire ni refaire des choix déjà tranchés.

**How to apply:** vérifier `git log` et le README avant d'agir ; ces informations datent du 15/11/2026.
