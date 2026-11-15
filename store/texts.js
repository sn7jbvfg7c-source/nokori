// Textes des fiches App Store et Google Play, en français. Source unique :
// store.config.js (App Store, envoyé par EAS Metadata) et FICHES.md (à copier dans la Play Console) en dépendent.
// Les limites sont vérifiées par src/__tests__/store.test.js.

const description = `Nokori vous dit ce qu’il vous reste vraiment à dépenser ce mois-ci, au jour près. Vos charges fixes et votre épargne sont déjà retirées : le chiffre que vous voyez est celui que vous pouvez dépenser.

Nokori suit la méthode kakeibo, le carnet de comptes japonais : chaque dépense va dans l’un des quatre piliers, Besoins, Envies, Culture et Imprévus, et chaque mois se termine par quatre questions simples.

LE BUDGET DU MOIS
• L’argent vraiment disponible, prélèvements à venir déduits, et combien par jour jusqu’à la fin du mois.
• Une estimation de ce qui restera à la fin du mois si vous continuez au même rythme.
• Les quatre piliers kakeibo, avec ce qui a été dépensé et ce qui reste pour chacun.

UNE DÉPENSE EN QUELQUES SECONDES
• Un pavé numérique, une catégorie, et c’est noté.
• Aujourd’hui, hier ou un autre jour, avec un libellé si vous voulez.
• « Annuler » juste après, en cas d’erreur ; un montant inhabituel est signalé.

LE CALENDRIER
• Deux ans en arrière, un an en avant : la paie, le loyer, les abonnements et vos dépenses, jour par jour.
• Chaque mois a sa couleur, inspirée des saisons japonaises.

L’ACTIVITÉ ET LES COMPTES
• Tout l’historique, mois par mois, avec une recherche et des filtres par pilier.
• Une dépense se modifie ou se supprime, avec « Annuler ».
• Les dépenses qui reviennent souvent sont repérées.
• Les soldes de vos comptes, saisis à la main : compte courant, livrets, placements, espèces.

VOS OBJECTIFS
• Un voyage, une voiture, une épargne de précaution : Nokori calcule la date d’arrivée et la recalcule à chaque dépense.
• Chaque versement noté, avec sa date, et le versement du mois suivi.
• Des défis kakeibo : une semaine sans envies, des jours sous le budget du jour.

LE BILAN DU MOIS
• Combien ai-je reçu ? Combien voulais-je épargner ? Combien ai-je dépensé ? Comment faire mieux ?
• La comparaison avec le mois précédent et les dépenses par catégorie, calculées sur vos saisies.
• Le mois écoulé se revoit en story, en cinq écrans.

VOS DONNÉES RESTENT SUR VOTRE TÉLÉPHONE
• Aucun compte à créer, aucune banque à connecter, aucun serveur : vos données ne quittent pas le téléphone.
• Tout est enregistré dans une base chiffrée, sur votre téléphone uniquement.
• Verrouillage par Face ID, Touch ID ou empreinte, et montants masquables pour ouvrir l’app en public.
• Une sauvegarde chiffrée par une phrase secrète, pour changer de téléphone sans rien perdre.
• Sans publicité et sans pistage.
• Des rappels avant chaque prélèvement, sans aucun montant dans la notification.

Mode clair et mode sombre. Libellés pour les lecteurs d’écran (VoiceOver, TalkBack), contrastes vérifiés et texte qui suit la taille choisie dans le téléphone.

Nokori ne déplace jamais d’argent et ne donne pas de conseil financier : c’est un carnet de comptes, pas une banque.`;

module.exports = {
  appStore: {
    title: 'Nokori : budget kakeibo',
    subtitle: 'Ce qu’il reste, chaque jour',
    promoText: 'Le budget kakeibo qui reste sur votre téléphone : aucune banque connectée, aucun serveur. Vous savez chaque jour ce qu’il vous reste à dépenser.',
    // pas de mot du nom (Nokori, budget, kakeibo) : Apple les indexe déjà ; séparés par des virgules, sans espace
    keywords: ['dépenses', 'épargne', 'comptes', 'finances', 'économies', 'charges', 'prélèvement', 'objectif', 'argent', 'carnet'],
    description,
    releaseNotes: 'Première version de Nokori.',
  },
  googlePlay: {
    title: 'Nokori : budget kakeibo',
    shortDescription: 'Ce qu’il vous reste à dépenser, au jour près. Vos données restent chez vous.',
    description,
  },
};
