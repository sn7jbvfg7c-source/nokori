// Configuration dynamique : part de app.json et la resserre pour les versions distribuées.
// Les versions « preview » (bêta interne) et « production » (stores) n'ont pas la permission
// Internet sur Android : l'app ne peut matériellement rien envoyer. La version de
// développement la garde pour se connecter à l'ordinateur qui sert le code.
const RELEASE_PROFILES = ['preview', 'production'];

module.exports = ({ config }) => {
  if (!RELEASE_PROFILES.includes(process.env.EAS_BUILD_PROFILE)) return config;
  const blocked = new Set([...(config.android?.blockedPermissions ?? []), 'android.permission.INTERNET']);
  return { ...config, android: { ...config.android, blockedPermissions: [...blocked] } };
};
