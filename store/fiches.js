// Écrit store/FICHES.md à partir de store/texts.js : node store/fiches.js
const fs = require('fs'), path = require('path');
const { appStore: a, googlePlay: g } = require('./texts');
const n = s => `${[...s].length} caractères`;
const md = `# Fiches des stores

Fichier généré par \`node store/fiches.js\` à partir de \`store/texts.js\` : modifiez \`texts.js\`, pas ce fichier.

## App Store (envoyé par \`eas metadata:push\`, ou à copier dans App Store Connect)

**Nom** (${n(a.title)} sur 30)

${a.title}

**Sous-titre** (${n(a.subtitle)} sur 30)

${a.subtitle}

**Texte promotionnel** (${n(a.promoText)} sur 170)

${a.promoText}

**Mots-clés** (${Buffer.byteLength(a.keywords.join(','))} octets sur 100)

${a.keywords.join(',')}

**Notes de version**

${a.releaseNotes}

## Google Play (à copier dans la Play Console › Présence sur le Store › Fiche principale)

**Nom de l'application** (${n(g.title)} sur 30)

${g.title}

**Description courte** (${n(g.shortDescription)} sur 80)

${g.shortDescription}

## Description complète, commune aux deux stores (${n(a.description)} sur 4000)

${a.description}
`;
fs.writeFileSync(path.join(__dirname, 'FICHES.md'), md);
console.log('store/FICHES.md écrit');
