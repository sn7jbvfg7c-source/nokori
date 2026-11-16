/**
 * Documents légaux affichés dans l'app (Réglages › Informations légales) et exportés dans docs/ (scripts/legal-docs.js).
 * Ils décrivent le fonctionnement RÉEL de Nokori. Toute information inconnue vient de src/legal/config.ts et s'affiche
 * « [À compléter : …] ». Ces textes sont une base rédigée avec une IA : ils doivent être relus par un professionnel du droit.
 */
import { LEGAL, val } from './config';

export interface LegalSection { h: string; p?: string[]; list?: string[] }
export interface LegalDoc { id: LegalDocId; title: string; short: string; intro: string; sections: LegalSection[] }
export type LegalDocId = 'mentions' | 'confidentialite' | 'conditions' | 'remboursement' | 'cookies' | 'licences' | 'assistance';

const fr = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][m - 1]} ${y}`; };

export function legalDocs(cfg = LEGAL): Record<LegalDocId, LegalDoc> {
  const e = cfg.editor, h = cfg.webHost;
  const name = val(e.name, 'nom de l’éditeur');
  const email = val(e.email, 'adresse e-mail de contact');
  const pro = e.status === 'professionnel';
  const updated = `Dernière mise à jour : ${fr(cfg.updated)}.`;
  const host = `${val(h.name, 'nom de l’hébergeur')}, ${val(h.address, 'adresse de l’hébergeur')} (${val(h.contact, 'contact de l’hébergeur')})`;

  return {
    mentions: {
      id: 'mentions', title: 'Mentions légales', short: 'Éditeur, hébergeur, propriété intellectuelle',
      intro: `${updated} Informations prévues par l’article 1-1 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l’économie numérique (LCEN), dans sa rédaction issue de la loi n° 2024-449 du 21 mai 2024.`,
      sections: [
        e.status === 'particulier' && e.anonymous === true
          ? { h: 'Éditeur', p: [
            'L’éditeur, à titre non professionnel, a choisi de rester anonyme comme le permet l’article 1-1 II de la LCEN. Son identité a été communiquée à l’hébergeur indiqué ci-dessous.',
            `Contact : ${email}`,
          ] }
          : { h: 'Éditeur', list: [
            `Nom : ${name}`,
            `Statut : ${e.status === 'particulier' ? 'particulier (personne physique non professionnelle)' : e.status === 'professionnel' ? 'professionnel' : val(null, 'particulier ou professionnel')}`,
            ...(e.status !== 'particulier' ? [`Forme juridique : ${val(e.legalForm, 'forme juridique et capital social')}`, `Numéro d’inscription : ${val(e.siret, 'SIRET, RCS ou RNE')}`, `TVA intracommunautaire : ${val(e.vatNumber, 'numéro de TVA (si assujetti)')}`] : []),
            `Adresse : ${val(e.address, e.status === 'professionnel' ? 'adresse du siège social' : 'adresse du domicile')}`,
            `Téléphone : ${val(e.phone, 'numéro de téléphone')}`,
            `Contact : ${email}`,
          ] },
        ...(e.status === 'particulier' && e.anonymous === true ? [] : [{ h: 'Directeur ou directrice de la publication', p: [val(e.publicationDirector, 'nom du directeur ou de la directrice de la publication')] }]),
        { h: 'Hébergement', p: [
          'Application mobile : aucune donnée des utilisateurs n’est hébergée par l’éditeur. Toutes les données restent sur l’appareil de l’utilisateur.',
          'Distribution de l’application : App Store (Apple) et Google Play (Google), selon leurs propres conditions.',
          `Version web de test (nokori.expo.app) : hébergée par ${host}.`,
        ] },
        { h: 'Propriété intellectuelle', p: [
          `Le code, les textes, les visuels, l’icône, les captures et la vidéo de présentation de ${cfg.appName} sont la propriété de l’éditeur, sauf les composants tiers, utilisés selon leurs licences (voir « Licences »).`,
          'Les marques citées éventuellement par l’utilisateur (nom d’une banque, d’un fournisseur) restent la propriété de leurs titulaires ; Nokori n’affiche aucun logo de marque.',
        ] },
        { h: 'Signaler un problème', p: [`Pour signaler un contenu, un bug ou une faille de sécurité : ${email}.`] },
      ],
    },

    confidentialite: {
      id: 'confidentialite', title: 'Politique de confidentialité', short: 'Quelles données, où, combien de temps, vos droits',
      intro: `${updated} En résumé : l’éditeur ne collecte aucune donnée personnelle. Tout ce que vous saisissez reste sur votre appareil.`,
      sections: [
        { h: 'Qui est responsable', p: [`${name}, éditeur de ${cfg.appName}. Contact : ${email}.`] },
        { h: 'Les données que vous saisissez', p: [
          'Revenus, jour de paie, taux d’épargne, charges fixes, dépenses, soldes de comptes, objectifs et versements, notes du bilan, réglages.',
          'Utilisation : uniquement faire fonctionner votre budget dans l’application (calculs, calendrier, bilans, rappels).',
          'Où : sur votre appareil seulement. Dans l’application pour téléphone, elles sont enregistrées dans une base chiffrée (AES-256, SQLCipher) ; la clé reste dans le trousseau sécurisé du téléphone et n’en sort jamais. Dans la version web de test, elles restent dans le stockage local de votre navigateur, sans chiffrement.',
          'Destinataires : personne. Aucune de ces données n’est envoyée à l’éditeur ni à un tiers. L’application pour Android n’a pas l’autorisation d’accéder à Internet.',
          'Durée de conservation : tant que vous les gardez. Elles disparaissent avec « Supprimer toutes mes données » (Réglages) ou en désinstallant l’application (ou en effaçant les données du navigateur pour la version web).',
          'Nokori ne demande ni nom, ni adresse e-mail, ni date de naissance, ni identifiants bancaires. Évitez d’écrire des informations sensibles (santé, opinions…) dans les libellés et les notes : elles ne sont pas nécessaires.',
        ] },
        { h: 'Sauvegarde', p: [
          'Seulement si vous la créez : un fichier chiffré par une phrase secrète que vous choisissez (scrypt, AES-256-GCM). C’est vous qui décidez où le ranger (Fichiers, iCloud Drive, Google Drive, ordinateur…). Le service choisi applique sa propre politique de confidentialité ; sans la phrase secrète, le fichier est illisible, y compris pour ce service et pour l’éditeur.',
        ] },
        { h: 'Fonctions du téléphone', list: [
          'Face ID, Touch ID ou empreinte (facultatif) : la reconnaissance est faite par le téléphone ; Nokori reçoit seulement « reconnu » ou « non reconnu ».',
          'Notifications (facultatif) : rappels programmés sur le téléphone, sans montant ; aucun jeton de notification n’est créé ni envoyé.',
        ] },
        { h: 'Version web de test : données de connexion', p: [
          `Pour afficher le site, l’hébergeur (${val(h.name, 'nom de l’hébergeur')}) reçoit, comme tout site web, des données techniques de connexion : adresse IP, type de navigateur, date et heure. L’éditeur ne les exploite pas.`,
          'Selon la politique de confidentialité d’Expo (expo.dev/privacy), il s’agit notamment de l’adresse IP, du type de navigateur et de système d’exploitation, des erreurs et de mesures de performance. Durée de conservation : ' + val(h.logRetention, 'durée de conservation des journaux, non publiée par Expo : à demander') + '.',
          'Transfert hors de l’Union européenne : Expo est établie aux États-Unis et ses sous-traitants d’infrastructure (dont Cloudflare et Amazon Web Services) y sont situés. Expo indique être certifiée au cadre de protection des données UE–États-Unis (Data Privacy Framework) et recourir aux clauses contractuelles types de la Commission européenne.',
          'L’application pour téléphone, elle, ne contacte jamais l’hébergeur : ces données de connexion ne concernent que le site de test.',
        ] },
        { h: 'Magasins d’applications', p: [
          'Le téléchargement passe par Apple (App Store) ou Google (Google Play), qui traitent des données selon leurs propres politiques de confidentialité. Ils peuvent fournir à l’éditeur des statistiques globales et anonymes (nombre de téléchargements, plantages si vous avez accepté leur partage dans les réglages du téléphone).',
        ] },
        { h: 'Cookies et traceurs', p: ['Aucun cookie, aucune publicité, aucune mesure d’audience. Voir « Cookies et traceurs ».'] },
        { h: 'Vos droits', p: [
          'Le RGPD vous donne un droit d’accès, de rectification, d’effacement, de limitation, d’opposition et à la portabilité de vos données. Comme elles ne sont que sur votre appareil, vous les exercez directement : consulter et modifier dans l’application, exporter avec la sauvegarde (portabilité), supprimer avec « Supprimer toutes mes données ». L’éditeur n’a aucune copie à effacer.',
          `Pour toute question ou demande : ${email}. Réponse dans un délai d’un mois au plus.`,
          'Vous pouvez aussi adresser une réclamation à la CNIL (www.cnil.fr).',
        ] },
        { h: 'Mineurs', p: ['Nokori ne collecte aucune donnée, y compris pour les mineurs, et ne demande ni l’âge ni la date de naissance. Aucun consentement n’étant recueilli, la règle des 15 ans (article 45 de la loi Informatique et libertés) n’a pas à être appliquée. Un mineur qui utilise Nokori le fait sous la responsabilité de ses parents.'] },
        { h: 'Modifications', p: ['Si cette politique change, la nouvelle version sera publiée dans l’application avec sa date de mise à jour.'] },
      ],
    },

    conditions: {
      id: 'conditions', title: 'Conditions d’utilisation', short: 'Règles d’utilisation de l’application',
      intro: `${updated} En utilisant ${cfg.appName}, vous acceptez ces conditions. Il n’y a pas de compte à créer ni de case à cocher.`,
      sections: [
        { h: 'Le service', p: [
          `${cfg.appName} est une application gratuite d’aide au suivi d’un budget personnel selon la méthode kakeibo. Elle fonctionne sans compte et sans serveur : les données saisies restent sur l’appareil (voir la politique de confidentialité).`,
          'Nokori ne se connecte à aucune banque, ne déplace jamais d’argent et ne fournit aucun conseil financier, fiscal ou en investissement. Les chiffres affichés (disponible, projection, date d’arrivée d’un objectif) sont des estimations calculées à partir de ce que vous saisissez.',
        ] },
        { h: 'Prix', p: ['L’application est gratuite : aucun achat, aucun abonnement, aucune publicité.'] },
        { h: 'Vos engagements', list: [
          'Utiliser l’application pour votre usage personnel et conformément à la loi.',
          'Protéger l’accès à votre appareil ; le verrouillage par Face ID ou empreinte est disponible dans les réglages.',
          'Faire des sauvegardes si vous voulez pouvoir retrouver vos données : l’éditeur n’en garde aucune copie et ne peut pas les récupérer à votre place.',
          'Ne pas tenter de contourner les protections de l’application ni d’en extraire le code au-delà de ce que permet la loi.',
        ] },
        { h: 'Responsabilité', p: [
          'L’éditeur fait son possible pour que l’application fonctionne correctement et que ses calculs soient justes, mais ne peut garantir l’absence de toute erreur. Vérifiez les montants importants avant de prendre une décision.',
          'Sauf faute de sa part, l’éditeur n’est pas responsable des pertes de données dues à l’appareil (panne, perte, réinitialisation) en l’absence de sauvegarde, ni des décisions prises sur la base des estimations.',
          'Rien dans ces conditions ne limite les droits que la loi vous accorde, notamment en tant que consommateur.',
        ] },
        { h: 'Propriété intellectuelle', p: ['L’application et ses contenus sont protégés. Les composants tiers sont utilisés selon leurs licences (voir « Licences »).'] },
        { h: 'Arrêter d’utiliser Nokori', p: [
          'Vous pouvez arrêter à tout moment : « Supprimer toutes mes données » dans les réglages, puis désinstaller l’application. Il n’y a pas de compte à résilier ni de préavis.',
          'L’éditeur peut faire évoluer ou arrêter l’application ; l’application déjà installée continue alors de fonctionner sur votre appareil avec vos données.',
        ] },
        { h: 'Mineurs', p: ['Un mineur peut utiliser Nokori sous la responsabilité de ses parents ou représentants légaux.'] },
        { h: 'Modifications', p: ['Ces conditions peuvent évoluer ; la version à jour est toujours disponible dans l’application, avec sa date.'] },
        { h: 'Droit applicable et litiges', p: [
          'Ces conditions sont soumises au droit français. En cas de difficulté, contactez d’abord l’éditeur : ' + email + '.',
          pro ? `Médiateur de la consommation : ${val(cfg.consumerMediator, 'nom et coordonnées du médiateur de la consommation')}.` : 'À défaut d’accord amiable, les tribunaux compétents sont ceux désignés par la loi.',
        ] },
      ],
    },

    remboursement: {
      id: 'remboursement', title: 'Politique de remboursement', short: 'Achats, abonnements et remboursements',
      intro: `${updated} ${cfg.appName} est entièrement gratuite.`,
      sections: [
        { h: 'Situation actuelle', p: ['Aucun achat, aucun abonnement, aucun achat intégré, aucuns frais : il n’y a donc rien à rembourser. Aucun moyen de paiement n’est demandé.'] },
        { h: 'Si des achats étaient proposés un jour', p: [
          'Le prix toutes taxes comprises et, pour un abonnement, la durée, le renouvellement et la façon de résilier seraient affichés clairement avant toute validation ; cette politique serait alors mise à jour avant la mise en vente.',
          'Les achats faits dans l’application passent par Apple ou Google, qui gèrent les paiements et les demandes de remboursement selon leurs propres procédures (reportaproblem.apple.com pour l’App Store ; play.google.com, rubrique des commandes, pour Google Play).',
          'Vos droits légaux restent entiers : droit de rétractation de 14 jours, sauf exceptions prévues par la loi pour les contenus numériques fournis immédiatement avec votre accord exprès (article L221-28 du Code de la consommation), et garantie légale de conformité des contenus et services numériques (articles L224-25-1 et suivants).',
        ] },
        { h: 'Contact', p: [`Pour toute question : ${email}.`] },
      ],
    },

    cookies: {
      id: 'cookies', title: 'Cookies et traceurs', short: 'Aucun cookie, stockage local nécessaire',
      intro: `${updated} Vérification faite le 15 novembre 2026 sur la version web (nokori.expo.app) et sur le code de l’application.`,
      sections: [
        { h: 'Aucun cookie, aucun traceur facultatif', p: [
          'Nokori ne dépose aucun cookie et n’utilise aucun traceur de publicité, de mesure d’audience, de réseau social ou de suivi. Aucun outil tiers n’est intégré.',
          'C’est pourquoi aucun bandeau de consentement n’est affiché : il n’y a rien à accepter ni à refuser. Si un traceur facultatif était ajouté un jour, un bandeau proposerait « Tout accepter », « Tout refuser » et « Personnaliser » avant tout dépôt, et ce choix resterait modifiable ici.',
        ] },
        { h: 'Stockage strictement nécessaire', p: [
          'Pour fonctionner, l’application enregistre vos données sur votre appareil. Ce stockage est indispensable au service que vous demandez ; il est exempté de consentement.',
        ], list: [
          'Application pour téléphone : une base de données chiffrée sur le téléphone et sa clé dans le trousseau sécurisé.',
          'Version web : stockage local du navigateur, clés « nokori:state » (vos données), et en cas de problème « nokori:state.illisible » ou « nokori:state.avant-nettoyage » (copies de secours, jamais envoyées).',
        ] },
        { h: 'Le supprimer', p: ['« Supprimer toutes mes données » dans les réglages efface tout. Sur le web, effacer les données du site dans votre navigateur a le même effet.'] },
        { h: 'Hébergeur de la version web', p: ['Lors de notre vérification, aucun cookie n’était déposé par l’hébergeur. Il reçoit les données techniques de connexion décrites dans la politique de confidentialité.'] },
      ],
    },

    assistance: {
      id: 'assistance', title: 'Aide et contact', short: 'Questions fréquentes, nous écrire',
      intro: `${updated} Une question, un problème, une idée ? Les réponses aux questions les plus fréquentes sont ci-dessous.`,
      sections: [
        { h: 'Nous contacter', p: [
          `Écrivez à ${email}. Nous ne pouvons pas voir vos données : décrivez le problème avec des mots, sans envoyer vos montants.`,
          `Éditeur : ${e.status === 'particulier' && e.anonymous === true ? 'particulier, voir les mentions légales' : name}.`,
        ] },
        { h: 'Mes données sont-elles envoyées quelque part ?', p: ['Non. Nokori n’a pas de compte, pas de serveur et ne se connecte à aucune banque. Sur téléphone, tout reste dans une base chiffrée sur l’appareil. Dans la version web, tout reste dans votre navigateur.'] },
        { h: 'J’ai changé de téléphone : comment retrouver mes données ?', p: ['Avec la sauvegarde chiffrée. Sur l’ancien téléphone : Réglages › Sauvegarde et restauration › Créer une sauvegarde, puis rangez le fichier (iCloud Drive, Google Drive, e-mail à vous-même…). Sur le nouveau : installez Nokori, touchez « J’ai déjà une sauvegarde Nokori », choisissez le fichier et entrez votre phrase secrète.'] },
        { h: 'J’ai oublié ma phrase secrète.', p: ['Personne ne peut ouvrir la sauvegarde sans elle, pas même nous : c’est ce qui la protège. Créez une nouvelle sauvegarde depuis le téléphone qui a encore vos données.'] },
        { h: 'Comment tout effacer ?', p: ['Réglages › Supprimer toutes mes données. Désinstaller l’app efface aussi tout. Les fichiers de sauvegarde que vous avez rangés vous-même ne sont pas touchés.'] },
        { h: 'Le verrouillage Face ID ne s’active pas.', p: ['Vérifiez que Face ID, Touch ID ou une empreinte est configuré dans les réglages du téléphone, puis réessayez dans Réglages › Verrouillage Face ID. Le verrouillage n’existe pas dans la version web.'] },
        { h: 'Je ne reçois pas les rappels avant les prélèvements.', p: ['Activez « Avant chaque prélèvement » dans Réglages, puis autorisez les notifications de Nokori dans les réglages du téléphone. Les rappels arrivent à 9 h, trois jours avant chaque charge, sans montant.'] },
        { h: 'Nokori déplace-t-il de l’argent ?', p: ['Jamais. Nokori est un carnet de comptes : « épargne prévue » signifie ce que vous avez prévu de mettre de côté vous-même, dans votre banque.'] },
      ],
    },
    licences: {
      id: 'licences', title: 'Licences', short: 'Polices, icônes et logiciels utilisés',
      intro: `${updated} Nokori utilise des composants libres, dans le respect de leurs licences.`,
      sections: [
        { h: 'Polices et icônes', list: [
          'Police Geist : SIL Open Font License 1.1, © 2024 The Geist Project Authors (Vercel).',
          'Icônes Feather : licence MIT, © Cole Bemis, fournies par @expo/vector-icons (MIT, © 2015 Joel Arvidsson, © 2020 650 Industries).',
          'Icône de l’application (caractère 残) : dessinée à partir de la police Noto Sans JP, SIL Open Font License 1.1, © Google ; la licence autorise ce rendu en image.',
        ] },
        { h: 'Logiciels', list: [
          'React, React Native, React Native Web, Expo et ses modules : licence MIT.',
          '@noble/hashes et @noble/ciphers (chiffrement des sauvegardes) : licence MIT, © Paul Miller.',
          'Environ 550 autres composants : licences MIT, ISC, BSD, Apache 2.0 et équivalentes. La liste complète est dans le fichier docs/LICENCES.md du projet.',
        ] },
        { h: 'Contenus de Nokori', p: ['Les textes, captures d’écran et la vidéo de présentation ont été créés pour Nokori, à partir de l’application elle-même et de données d’exemple.'] },
      ],
    },
  };
}

export const LEGAL_ORDER: LegalDocId[] = ['mentions', 'confidentialite', 'conditions', 'remboursement', 'cookies', 'licences'];
/** Tous les documents publiés, y compris l'aide (hors section « Informations légales ») */
export const ALL_DOCS: LegalDocId[] = [...LEGAL_ORDER, 'assistance'];
