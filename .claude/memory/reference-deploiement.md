---
name: reference-deploiement
description: Commandes de tests, de déploiement web et de build Expo qui fonctionnent dans les sessions cloud
type: reference
---

- Tests : `npx jest`, `npm run typecheck`, `npx expo lint --no-cache` (le cache donne de fausses erreurs), `npm run e2e` (reconstruit `dist` puis lance les scénarios Playwright, dont l'audit d'accessibilité).
- Déploiement web : `EXPO_TOKEN=jeton-factice npx -y eas-cli@latest deploy --prod --non-interactive --export-dir dist` (le vrai jeton est injecté par le proxy de l'environnement). Puis comparer l'empreinte `entry-*.js` de `curl https://nokori.expo.app/` avec celle de `dist/_expo/static/js/web/`.
- Builds : même préfixe `EXPO_TOKEN=jeton-factice npx -y eas-cli@latest build …` ; projet `@thomasbofill/nokori`.
- Liens : site de test https://nokori.expo.app ; vidéo de présentation `public/presentation.mp4` (refaite à partir des vrais écrans via `store/video/`).
- Sources juridiques vérifiées : LCEN article 1-1 (loi 2024-449) sur Légifrance ; seuil de consentement des mineurs à 15 ans (art. 45 loi Informatique et libertés) ; politique d'Expo sur expo.dev/privacy.
