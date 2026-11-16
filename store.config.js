// Fiche App Store envoyée par EAS Metadata (bêta d'Expo, App Store uniquement) : npx eas-cli@latest metadata:push
// Les textes sont dans store/texts.js. Google Play ne se remplit pas ainsi : voir store/FICHES.md.
const { appStore: t } = require('./store/texts');
const { expo } = require('./app.json');

// Pages publiques servies par la version web (src/legal/documents.ts). Elles ne sont présentables qu'une fois
// les informations de l'éditeur renseignées : l'envoi s'arrête tant que docs/A-COMPLETER.md liste des manques.
const PRIVACY_URL = 'https://nokori.expo.app/legal/confidentialite';
const SUPPORT_URL = 'https://nokori.expo.app/legal/assistance';
const todo = require('fs').readFileSync(require('path').join(__dirname, 'docs/A-COMPLETER.md'), 'utf8').split('À décider ou vérifier aussi')[0];
if (/^- \[ \]/m.test(todo)) throw new Error('store.config.js : des informations de l’éditeur manquent encore (docs/A-COMPLETER.md). Les pages publiques afficheraient « [À compléter] ».');

module.exports = {
  configVersion: 0,
  apple: {
    categories: ['FINANCE'],
    info: {
      'fr-FR': {
        title: t.title,
        subtitle: t.subtitle,
        description: t.description,
        keywords: t.keywords,
        promoText: t.promoText,
        // pas de notes de version pour la toute première version
        ...(expo.version !== '1.0.0' && { releaseNotes: t.releaseNotes }),
        supportUrl: SUPPORT_URL,
        privacyPolicyUrl: PRIVACY_URL,
      },
    },
    // Classification par âge : aucun contenu sensible. À revérifier dans App Store Connect,
    // car Apple a ajouté des questions en 2025 que l'outil d'Expo ne couvre peut-être pas encore.
    advisory: {
      alcoholTobaccoOrDrugUseOrReferences: 'NONE',
      contests: 'NONE',
      gamblingSimulated: 'NONE',
      horrorOrFearThemes: 'NONE',
      matureOrSuggestiveThemes: 'NONE',
      medicalOrTreatmentInformation: 'NONE',
      profanityOrCrudeHumor: 'NONE',
      sexualContentGraphicAndNudity: 'NONE',
      sexualContentOrNudity: 'NONE',
      violenceCartoonOrFantasy: 'NONE',
      violenceRealistic: 'NONE',
      violenceRealisticProlongedGraphicOrSadistic: 'NONE',
      gambling: false,
      unrestrictedWebAccess: false,
      kidsAgeBand: null,
      ageRatingOverride: 'NONE',
      koreaAgeRatingOverride: 'NONE',
    },
    review: {
      // Vos nom, e-mail et téléphone se saisissent dans App Store Connect (App Review) : ils ne sont pas dans le dépôt.
      demoRequired: false,
      notes: [
        'Nokori is a manual budget app (kakeibo method). No account, no login, no server, no bank connection: all data is entered by hand and stored only on the device, in a SQLCipher-encrypted database.',
        'To test: open the app, go through the short onboarding (income, payday, savings rate, fixed charges; any values work), then add an expense with the + button.',
        'Face ID lock and charge reminders (local notifications, no amounts shown) are optional, in Settings (gear icon).',
        'The app makes no network requests. Encryption is only used to protect the user\'s own data on the device (exempt, ITSAppUsesNonExemptEncryption = NO).',
      ].join('\n\n'),
    },
  },
};
