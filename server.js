const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'public')));

// ==================== QUESTIONS QUIZ ERP/PPR ====================
const quizQuestions = [
  // FACILE (33 questions) - Notions de base
  {
    id: 1,
    question: "Qu'est-ce qu'un plan cadastral ?",
    options: [
      "Un document de délimitation des zones urbanisées",
      "Un plan de la voirie municipale", 
      "Un plan représentant la répartition des propriétés foncières",
      "Un document d'urbanisme destiné à la construction"
    ],
    correct: 2,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 2,
    question: "Que représente une parcelle cadastrale ?",
    options: [
      "Un terrain agricole",
      "Un terrain municipal",
      "Une unité foncière ayant une dénomination et des limites bien définies",
      "Un bien immobilier en construction"
    ],
    correct: 2,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 3,
    question: "Qui est chargé d'établir le plan cadastral en France ?",
    options: [
      "Les communes",
      "L'Institut Géographique National (IGN)",
      "Les notaires",
      "Les géomètres-experts"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 4,
    question: "Quel est le rôle du géomètre dans l'établissement d'un plan cadastral ?",
    options: [
      "Il définit les zones à risques",
      "Il procède à la délimitation des terrains et établit les documents cadastraux",
      "Il élabore les contrats de vente",
      "Il rédige les rapports d'urbanisme"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 5,
    question: "Les plans cadastraux sont utilisés principalement pour :",
    options: [
      "L'aménagement des zones commerciales",
      "Déterminer les limites de propriété et la fiscalité foncière",
      "Obtenir un permis de construire",
      "Localiser les risques naturels"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 6,
    question: "Qu'est-ce qu'un état des risques et pollution (ERP) ?",
    options: [
      "Un document d'urbanisme",
      "Un rapport sur les risques environnementaux associés à un bien immobilier",
      "Une analyse des biens immobiliers dans une zone urbaine",
      "Un diagnostic de performance énergétique"
    ],
    correct: 1,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 7,
    question: "Quel est le but principal de l'ERP ?",
    options: [
      "Estimer la valeur du bien",
      "Fournir une évaluation de la performance énergétique",
      "Informer les acheteurs des risques naturels, technologiques et de pollution",
      "Décrire l'historique du bien immobilier"
    ],
    correct: 2,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 8,
    question: "Dans quel cas un ERP doit-il être fourni ?",
    options: [
      "Lors de la vente d'un bien immobilier",
      "Lors de la signature d'un contrat de location",
      "Lors de l'achat d'un bien commercial",
      "Lors d'une rénovation majeure"
    ],
    correct: 0,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 9,
    question: "Quels risques sont généralement inclus dans un ERP ?",
    options: [
      "Risques sismiques, inondations, pollution industrielle, radon",
      "Risques liés aux nuisances sonores uniquement",
      "Risques financiers liés aux taxes foncières",
      "Risques liés aux prix du marché immobilier"
    ],
    correct: 0,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 10,
    question: "Qui est responsable de l'établissement de l'ERP ?",
    options: [
      "Le vendeur",
      "Le notaire",
      "L'acquéreur",
      "L'agent immobilier"
    ],
    correct: 0,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 11,
    question: "Qu'est-ce qu'un Plan de Prévention des Risques (PPR) ?",
    options: [
      "Un document permettant la construction de nouvelles infrastructures",
      "Un document visant à protéger les biens et les personnes des risques naturels et technologiques",
      "Un plan d'aménagement urbanistique",
      "Un règlement fiscal pour les propriétaires fonciers"
    ],
    correct: 1,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 12,
    question: "Quel est l'objectif principal d'un PPR ?",
    options: [
      "Définir des zones de construction",
      "Identifier les zones naturelles protégées",
      "Identifier et réduire les risques pour les populations et les biens",
      "Augmenter les taxes foncières"
    ],
    correct: 2,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 13,
    question: "Un PPR peut couvrir quel type de risque ?",
    options: [
      "Risque d'inondation",
      "Risque sismique",
      "Risque industriel",
      "Tous les risques ci-dessus"
    ],
    correct: 3,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 14,
    question: "Qui élabore le Plan de Prévention des Risques (PPR) ?",
    options: [
      "Les propriétaires fonciers",
      "L'Agence de l'Environnement",
      "Les communes et les services de l'État",
      "Les notaires"
    ],
    correct: 2,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 15,
    question: "L'eau polluée peut-elle être dangereuse pour la santé ?",
    options: [
      "Oui",
      "Non",
      "Seulement en hiver",
      "Seulement pour les animaux"
    ],
    correct: 0,
    difficulty: "facile",
    category: "Risques Pollution"
  },
  {
    id: 16,
    question: "Le plan cadastral est utilisé principalement pour :",
    options: [
      "Calculer les taxes foncières",
      "Planifier les zones commerciales",
      "Localiser les infrastructures publiques",
      "Évaluer les risques sismiques"
    ],
    correct: 0,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 17,
    question: "Lors de la vente d'un bien immobilier, un ERP doit être remis par le :",
    options: [
      "Vendeur",
      "Notaire",
      "Acquéreur",
      "Géomètre"
    ],
    correct: 0,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 18,
    question: "L'ERP est un document qui :",
    options: [
      "Informe l'acheteur des risques environnementaux avant l'achat",
      "Sert à estimer la valeur du bien",
      "Fournit des informations sur les caractéristiques du bien",
      "Décrit l'historique des propriétaires"
    ],
    correct: 0,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 19,
    question: "Un extrait cadastral peut être obtenu auprès de :",
    options: [
      "La mairie uniquement",
      "Le cadastre ou l'IGN",
      "L'urbanisme local",
      "La préfecture"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 20,
    question: "Le document cadastral est souvent demandé lors de :",
    options: [
      "La signature d'un contrat de location",
      "La vente d'un bien immobilier",
      "L'évaluation des risques financiers",
      "La demande de subvention"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Plans Cadastraux"
  },
  {
    id: 21,
    question: "Lors de l'achat d'une maison, un ERP doit être remis à l'acheteur :",
    options: [
      "À tout moment avant la vente",
      "Lors de la signature du compromis de vente",
      "Après la vente, lors de la remise des clés",
      "Seulement si demandé"
    ],
    correct: 1,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 22,
    question: "Une marée noire pollue principalement :",
    options: [
      "L'air",
      "L'océan",
      "La terre",
      "Les montagnes"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Risques Pollution"
  },
  {
    id: 23,
    question: "Qu'est-ce qu'un \"risque radon\" mentionné dans un ERP ?",
    options: [
      "Un risque lié à des inondations",
      "Un gaz radioactif naturel",
      "Un risque de tremblement de terre",
      "Un risque d'incendie"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Risques Radon"
  },
  {
    id: 24,
    question: "Économiser l'eau est-il important ?",
    options: [
      "Oui",
      "Non",
      "Seulement en été",
      "Seulement dans le désert"
    ],
    correct: 0,
    difficulty: "facile",
    category: "Risques Eau"
  },
  {
    id: 25,
    question: "L'ERP doit être remis :",
    options: [
      "Uniquement au moment de la vente",
      "Avant la signature du compromis de vente",
      "Au moment de la déclaration de sinistre",
      "Après la vente"
    ],
    correct: 1,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 26,
    question: "Dans quelle situation un ERP est-il obligatoire, même si le bien est ancien ?",
    options: [
      "Si le bien a plus de 10 ans",
      "Si le bien est situé dans une zone inondable",
      "Lors de toute vente, quelle que soit l'âge du bien",
      "Si le bien est un terrain nu"
    ],
    correct: 2,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 27,
    question: "Quelle information n'est PAS incluse dans un ERP ?",
    options: [
      "Risque d'inondation",
      "Risque d'explosion industrielle",
      "Historique des propriétaires précédents",
      "Risque de pollution de l'air"
    ],
    correct: 2,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 28,
    question: "Les notaires doivent vérifier l'ERP lors de :",
    options: [
      "La signature de l'acte de vente",
      "La préparation des documents d'héritage",
      "La demande de permis de construire",
      "La mise en location d'un bien"
    ],
    correct: 0,
    difficulty: "facile",
    category: "Procédures"
  },
  {
    id: 29,
    question: "Dans une zone PPR, les constructions peuvent être :",
    options: [
      "Complètement interdites",
      "Restreintes à certaines zones seulement",
      "Autorisées sans aucune restriction",
      "Soumises à des conditions strictes de sécurité"
    ],
    correct: 3,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 30,
    question: "Qui est responsable de la mise en place des PPR ?",
    options: [
      "Les géomètres",
      "Les municipalités et les services de l'État",
      "Les notaires",
      "Les propriétaires"
    ],
    correct: 1,
    difficulty: "facile",
    category: "PPR"
  },
  {
    id: 31,
    question: "Lors de l'achat d'un bien immobilier, l'ERP est valable :",
    options: [
      "Uniquement si le bien a plus de 10 ans",
      "Durant toute la durée de la vente, sans limite de temps",
      "Uniquement pour les biens neufs",
      "Pendant 6 mois maximum"
    ],
    correct: 1,
    difficulty: "facile",
    category: "ERP"
  },
  {
    id: 32,
    question: "L'agriculture biologique utilise-t-elle des pesticides chimiques ?",
    options: [
      "Oui",
      "Non",
      "Parfois",
      "Seulement l'été"
    ],
    correct: 1,
    difficulty: "facile",
    category: "Risques Agriculture"
  },
  {
    id: 33,
    question: "Que peut causer la pollution sonore ?",
    options: [
      "Stress",
      "Croissance",
      "Joie",
      "Sommeil"
    ],
    correct: 0,
    difficulty: "facile",
    category: "Risques Pollution"
  },

  // MOYEN (34 questions) - Connaissances approfondies
  {
    id: 34,
    question: "Quel est le rôle d'un géomètre dans un plan cadastral ?",
    options: [
      "Délivrer les permis de construire",
      "Définir les limites des propriétés et créer les cartes cadastrales",
      "Évaluer la valeur des terrains",
      "Rédiger les actes notariés"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Géomètres"
  },
  {
    id: 35,
    question: "Qu'est-ce qu'une \"servitude\" dans un document cadastral ?",
    options: [
      "Un droit de passage ou d'utilisation accordé sur une propriété",
      "Un impôt foncier payé par le propriétaire",
      "Une restriction sur l'utilisation d'un terrain",
      "Une zone de construction interdite"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Servitudes"
  },
  {
    id: 36,
    question: "Qu'est-ce qu'un \"acte authentique\" en droit notarial ?",
    options: [
      "Un document signé devant un notaire, qui a force probante",
      "Un acte de vente signé uniquement entre les parties",
      "Un document administratif sans valeur juridique",
      "Un contrat de location standard"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Droit Notarial"
  },
  {
    id: 37,
    question: "Qu'est-ce qu'une \"mise à jour cadastrale\" ?",
    options: [
      "L'ajout de nouvelles constructions dans le plan cadastral",
      "La mise à jour des valeurs fiscales des propriétés",
      "La modification des lois d'urbanisme locales",
      "La révision des limites communales"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Mise à jour"
  },
  {
    id: 38,
    question: "Qu'est-ce qu'un \"plan de situation\" ?",
    options: [
      "Un plan qui montre l'emplacement d'un bien immobilier dans une commune",
      "Un plan des zones commerciales environnantes",
      "Un plan détaillant les infrastructures de transport",
      "Un plan de zonage urbain"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Plans"
  },
  {
    id: 39,
    question: "Le risque de \"mouvement de terrain\" dans un ERP peut inclure :",
    options: [
      "Les glissements de terrain ou les affaissements du sol",
      "Le risque d'inondation",
      "Les problèmes d'insectes dans les bâtiments",
      "La pollution atmosphérique"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Risques Terrain"
  },
  {
    id: 40,
    question: "Qu'est-ce qu'une \"zone inondable\" mentionnée dans un ERP ?",
    options: [
      "Une zone où les rivières peuvent déborder et causer des dégâts",
      "Une zone réservée aux espaces verts",
      "Une zone soumise à des taxes spéciales",
      "Une zone de loisirs aquatiques"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Zones Inondables"
  },
  {
    id: 41,
    question: "Le plan cadastral est mis à jour par :",
    options: [
      "Le service des impôts",
      "Les services de l'urbanisme de la commune",
      "Le cadastre, via des géomètres-experts",
      "Les notaires"
    ],
    correct: 2,
    difficulty: "moyen",
    category: "Mise à jour"
  },
  {
    id: 42,
    question: "Une servitude de passage permet :",
    options: [
      "L'accès à un terrain privé pour les travaux publics",
      "L'accès à une propriété voisine à des fins personnelles",
      "La construction sur le terrain d'autrui",
      "La vente forcée d'un terrain"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Servitudes"
  },
  {
    id: 43,
    question: "Qu'est-ce qu'un \"PPRn\" dans un plan de prévention des risques ?",
    options: [
      "Un plan pour la protection contre les incendies",
      "Un plan de prévention des risques naturels (inondations, mouvements de terrain)",
      "Un plan de prévention des risques de pollution industrielle",
      "Un plan de protection des réseaux"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "PPRn"
  },
  {
    id: 44,
    question: "Quel est le risque principal dans les zones sismiques ?",
    options: [
      "La pollution de l'air",
      "Les tremblements de terre et leurs effets destructeurs",
      "La montée des eaux",
      "Les incendies de forêt"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Risques Sismiques"
  },
  {
    id: 45,
    question: "Les zones \"risques industriels\" dans l'ERP correspondent à :",
    options: [
      "Des zones où il y a des activités agricoles",
      "Des zones proches de sites industriels potentiellement dangereux",
      "Des zones avec une forte densité de population",
      "Des zones commerciales"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Risques Industriels"
  },
  {
    id: 46,
    question: "Qu'est-ce qu'un \"Plan de Prévention des Risques Technologiques\" (PPRT) ?",
    options: [
      "Un plan qui cartographie les risques liés à la pollution des sols",
      "Un plan qui vise à prévenir les risques industriels et technologiques",
      "Un plan de prévention des risques naturels",
      "Un plan de modernisation technologique"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "PPRT"
  },
  {
    id: 47,
    question: "Les zones à risque \"PPRi\" font référence à :",
    options: [
      "Des zones de risque d'incendie",
      "Des zones à risque d'inondation",
      "Des zones à risque de pollution industrielle",
      "Des zones à risque d'intervention"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "PPRi"
  },
  {
    id: 48,
    question: "Le \"risque d'inondation\" dans un ERP est évalué sur la base de :",
    options: [
      "L'histoire des crues dans la région",
      "L'altitude des bâtiments",
      "La quantité de pluie annuelle",
      "La proximité des stations météo"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Évaluation Inondation"
  },
  {
    id: 49,
    question: "Les risques liés à la \"pollution des sols\" peuvent inclure :",
    options: [
      "La contamination par des produits chimiques, des métaux lourds, ou des hydrocarbures",
      "Les fuites d'eau de pluie",
      "La forte présence d'humidité dans les murs",
      "Les problèmes de drainage"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Pollution Sols"
  },
  {
    id: 50,
    question: "Un bien immobilier situé dans une zone \"risques radon\" doit être :",
    options: [
      "Obligatoirement décontaminé",
      "Vérifié pour la présence de ce gaz",
      "Déclaré à l'administration locale",
      "Vendu avec une décote obligatoire"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Risques Radon"
  },
  {
    id: 51,
    question: "Le risque \"sismique\" est principalement présent dans :",
    options: [
      "Le Sud-Est de la France",
      "Le Nord-Ouest de la France",
      "La région Parisienne",
      "Toute la France de manière égale"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Risques Sismiques"
  },
  {
    id: 52,
    question: "Qu'est-ce qu'une \"zone rouge\" dans un PPR ?",
    options: [
      "Une zone où les risques sont élevés et où la construction est interdite",
      "Une zone commerciale privilégiée",
      "Une zone protégée pour les espaces verts",
      "Une zone d'urgence médicale"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Zones PPR"
  },
  {
    id: 53,
    question: "Qu'est-ce qu'une \"zone bleue\" dans un plan de prévention des risques ?",
    options: [
      "Une zone sécurisée où aucun risque n'existe",
      "Une zone où les risques sont modérés et où certaines constructions sont autorisées",
      "Une zone d'aménagement commercial",
      "Une zone de stationnement réglementé"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Zones PPR"
  },
  {
    id: 54,
    question: "Lorsqu'un bien est dans une zone inondable, la construction est :",
    options: [
      "Totalement interdite",
      "Soumise à des règles de construction strictes",
      "Encouragée pour prévenir les inondations",
      "Autorisée sans restriction"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Construction Zones"
  },
  {
    id: 55,
    question: "Quel est l'objectif principal d'un PPR ?",
    options: [
      "Déterminer les zones de constructibilité",
      "Réduire les risques naturels et technologiques",
      "Augmenter la densité de construction",
      "Faciliter les transactions immobilières"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Objectifs PPR"
  },
  {
    id: 56,
    question: "Lorsqu'un bien immobilier est situé dans une zone de risques technologiques, l'ERP doit mentionner :",
    options: [
      "Les risques d'inondation uniquement",
      "Les risques d'accidents industriels ou d'explosions",
      "Les taxes locales appliquées",
      "L'historique des incidents"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Risques Technologiques"
  },
  {
    id: 57,
    question: "Dans un PPR, une zone \"Jaune\" indique :",
    options: [
      "Un faible risque, avec des recommandations de prévention",
      "Un risque important nécessitant des mesures de protection",
      "Une zone protégée sans risques",
      "Une zone en attente de classement"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Zones PPR"
  },
  {
    id: 58,
    question: "La cartographie des risques dans l'ERP est souvent basée sur :",
    options: [
      "Des modèles climatiques et géologiques",
      "Les décisions administratives récentes",
      "Les historiques de pollution industrielle",
      "Les avis des riverains"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Cartographie"
  },
  {
    id: 59,
    question: "Quel type de risque est évalué dans un ERP lié aux mouvements de terrain ?",
    options: [
      "Risque d'érosion des sols",
      "Risque de tremblements de terre",
      "Risque de glissements de terrain ou de surélévation",
      "Risque de sécheresse"
    ],
    correct: 2,
    difficulty: "moyen",
    category: "Mouvements Terrain"
  },
  {
    id: 60,
    question: "Les zones \"PPRT\" sont des zones où il y a des risques :",
    options: [
      "D'inondation",
      "Technologiques (industries, risques d'explosion)",
      "Sismiques",
      "De pollution atmosphérique"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "PPRT"
  },
  {
    id: 61,
    question: "Quel risque est principalement lié à la présence de nappes phréatiques dans un ERP ?",
    options: [
      "Risque d'inondation",
      "Risque de pollution de l'air",
      "Risque de contamination des sols par des produits chimiques",
      "Risque de sécheresse"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Nappes Phréatiques"
  },
  {
    id: 62,
    question: "Le plan PPRn est utilisé pour la prévention des risques :",
    options: [
      "Naturels (inondations, incendies, etc.)",
      "Technologiques (explosions, accidents industriels)",
      "Sociétaux (santé publique, etc.)",
      "Financiers"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "PPRn"
  },
  {
    id: 63,
    question: "Le radon est un gaz qui provient principalement de :",
    options: [
      "L'industrie chimique",
      "La dégradation des sols agricoles",
      "La désintégration des roches naturelles",
      "Les installations de chauffage"
    ],
    correct: 2,
    difficulty: "moyen",
    category: "Radon"
  },
  {
    id: 64,
    question: "Dans un ERP, le \"risque d'inondation\" se base sur :",
    options: [
      "Les données météorologiques historiques",
      "La fréquence des crues des rivières locales",
      "L'altitude du bien immobilier",
      "La perméabilité des sols"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Inondation"
  },
  {
    id: 65,
    question: "Le risque lié à l'amiante dans un ERP concerne principalement :",
    options: [
      "Les bâtiments récents uniquement",
      "Les constructions anciennes, avant 1997",
      "Les bâtiments situés dans des zones de risques sismiques",
      "Tous les bâtiments industriels"
    ],
    correct: 1,
    difficulty: "moyen",
    category: "Amiante"
  },
  {
    id: 66,
    question: "Un ERP mentionnant le \"risque sismique\" indique que :",
    options: [
      "Le bâtiment est conçu pour résister aux tremblements de terre",
      "La zone a un faible niveau d'activité sismique",
      "Il y a une probabilité de secousses importantes",
      "Des travaux de renforcement sont obligatoires"
    ],
    correct: 2,
    difficulty: "moyen",
    category: "Risque Sismique"
  },
  {
    id: 67,
    question: "L'ERP inclut également des informations sur le \"risque incendie\" dans les zones :",
    options: [
      "Forestières et agricoles",
      "Urbaines uniquement",
      "Industrielles uniquement",
      "Résidentielles uniquement"
    ],
    correct: 0,
    difficulty: "moyen",
    category: "Risque Incendie"
  },

  // DIFFICILE (33 questions) - Expertise technique et juridique
  {
    id: 68,
    question: "En cas de vente d'un bien situé dans une zone de risques majeurs, l'ERP doit obligatoirement :",
    options: [
      "Mentionner le risque en détail",
      "Réaliser une étude environnementale complète",
      "Fournir des informations sur les taxes locales",
      "Inclure un certificat de conformité"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Obligations ERP"
  },
  {
    id: 69,
    question: "L'ERP doit être remis :",
    options: [
      "Uniquement si le bien est dans une zone à risques naturels",
      "Avant la signature du compromis de vente",
      "Après la vente, lors de la remise des clés",
      "Seulement sur demande de l'acquéreur"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Remise ERP"
  },
  {
    id: 70,
    question: "Lors de la vente d'un terrain nu, l'ERP doit mentionner :",
    options: [
      "Les risques naturels et technologiques",
      "Les caractéristiques du terrain agricole",
      "L'historique des propriétaires précédents",
      "Les possibilités de construction"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Terrain Nu"
  },
  {
    id: 71,
    question: "Un bien immobilier dans une zone à risques peut être soumis à :",
    options: [
      "Des restrictions de construction ou d'aménagement",
      "Une réduction de la taxe foncière",
      "Un délai de construction plus long",
      "Une obligation d'assurance spéciale"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Restrictions"
  },
  {
    id: 72,
    question: "Le \"diagnostic amiante\" dans un ERP concerne :",
    options: [
      "Les bâtiments construits après 2000",
      "Les bâtiments construits avant 1997",
      "Tous les bâtiments commerciaux",
      "Uniquement les immeubles collectifs"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Diagnostic Amiante"
  },
  {
    id: 73,
    question: "La \"zone PPR\" se réfère à une zone où :",
    options: [
      "Les risques industriels sont faibles",
      "Il y a une réglementation spécifique liée à des risques naturels",
      "La construction est fortement encouragée",
      "Les taxes foncières sont réduites"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Zone PPR"
  },
  {
    id: 74,
    question: "Lors de la vente d'un bien, si un ERP est absent, cela peut entraîner :",
    options: [
      "L'annulation de la vente",
      "Une révision des taxes locales",
      "L'ajout d'une servitude sur le bien",
      "Un délai supplémentaire de réflexion"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Absence ERP"
  },
  {
    id: 75,
    question: "Les notaires doivent s'assurer que l'ERP est bien fourni lors de la vente, car :",
    options: [
      "Cela garantit l'authenticité du bien",
      "Cela protège les acheteurs des risques environnementaux",
      "Cela permet d'ajouter des conditions supplémentaires à la vente",
      "C'est une obligation fiscale"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Obligation Notaires"
  },
  {
    id: 76,
    question: "L'ERP est un document qui peut être :",
    options: [
      "Demandé par le vendeur pour évaluer la taxe foncière",
      "Demandé par l'acheteur pour s'assurer de l'absence de risques",
      "Demandé uniquement dans les zones rurales",
      "Demandé par l'administration fiscale"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Demande ERP"
  },
  {
    id: 77,
    question: "Le géomètre-expert a pour rôle :",
    options: [
      "De réaliser les plans de vente",
      "D'établir les rapports d'incendie",
      "D'élargir les zones de construction dans les PPR",
      "De délimiter précisément les propriétés"
    ],
    correct: 3,
    difficulty: "difficile",
    category: "Géomètre Expert"
  },
  {
    id: 78,
    question: "Dans un ERP, le risque \"mouvement de terrain\" est évalué à partir de :",
    options: [
      "L'historique des sinistres dans la zone",
      "Des modèles de prévision sismique",
      "De l'analyse des sols par un géotechnicien",
      "Des témoignages des riverains"
    ],
    correct: 2,
    difficulty: "difficile",
    category: "Évaluation Terrain"
  },
  {
    id: 79,
    question: "Un PPR industriel (PPRT) a pour but de :",
    options: [
      "Protéger les habitants contre les inondations",
      "Réduire les risques liés aux installations industrielles dangereuses",
      "Augmenter la construction dans des zones industrielles",
      "Réglementer les nuisances sonores"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "PPRT Industriel"
  },
  {
    id: 80,
    question: "Les zones PPRT concernent principalement :",
    options: [
      "Les zones agricoles et forestières",
      "Les zones résidentielles seulement",
      "Les zones à proximité de sites industriels dangereux",
      "Les centres-villes historiques"
    ],
    correct: 2,
    difficulty: "difficile",
    category: "Zones PPRT"
  },
  {
    id: 81,
    question: "Les plans PPR peuvent être révisés :",
    options: [
      "Seulement en cas de catastrophe naturelle",
      "Pour intégrer de nouvelles données sur les risques ou les aménagements",
      "Chaque année, indépendamment de l'évolution des risques",
      "Uniquement par décision préfectorale"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Révision PPR"
  },
  {
    id: 82,
    question: "La présence d'un risque de pollution dans un ERP indique :",
    options: [
      "Une contamination des sols ou de l'eau par des produits chimiques ou toxiques",
      "L'existence d'infrastructures de traitement de déchets",
      "Un risque d'explosion lié aux infrastructures locales",
      "Une pollution atmosphérique temporaire"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Pollution ERP"
  },
  {
    id: 83,
    question: "La \"zone de faible potentiel radon\" signifie :",
    options: [
      "Qu'il n'y a aucun risque radon dans cette zone",
      "Que la zone est peu susceptible d'être affectée par le radon",
      "Qu'il existe un faible risque de tremblement de terre",
      "Que le niveau de radiation est négligeable"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Potentiel Radon"
  },
  {
    id: 84,
    question: "Dans une zone à risque de mouvement de terrain, les constructions doivent :",
    options: [
      "Suivre des normes strictes de sécurité",
      "Être interdites dans la plupart des zones",
      "Être exemptées de toutes obligations",
      "Faire l'objet d'une surveillance permanente"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Normes Construction"
  },
  {
    id: 85,
    question: "L'impact du \"risque sismique\" dans un ERP est particulièrement concerné dans :",
    options: [
      "Le Sud-Est et la Corse",
      "Le Nord-Ouest de la France",
      "Les Alpes et les Pyrénées",
      "Toutes les zones côtières"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Zones Sismiques"
  },
  {
    id: 86,
    question: "Une zone où un PPR risque \"inondation\" est mise en place signifie :",
    options: [
      "Qu'aucune construction n'y est permise",
      "Qu'il existe des règles spécifiques de construction pour prévenir les inondations",
      "Que des compensations financières sont prévues",
      "Que la zone sera évacuée en cas de crue"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "PPR Inondation"
  },
  {
    id: 87,
    question: "Quel est le rôle principal du PPRn ?",
    options: [
      "Mettre à jour les valeurs fiscales des propriétés",
      "Définir les mesures de prévention contre les risques naturels",
      "Fournir des compensations financières aux victimes de catastrophes",
      "Organiser les secours d'urgence"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Rôle PPRn"
  },
  {
    id: 88,
    question: "Qu'est-ce qu'une \"zone bleue\" dans un ERP ?",
    options: [
      "Une zone où des constructions sont fortement encouragées",
      "Une zone soumise à une réglementation de sécurité spécifique",
      "Une zone où les risques sont faibles, mais des mesures de précaution sont recommandées",
      "Une zone de protection du patrimoine"
    ],
    correct: 2,
    difficulty: "difficile",
    category: "Zone Bleue ERP"
  },
  {
    id: 89,
    question: "Un ERP doit être mis à jour :",
    options: [
      "Tous les 5 ans",
      "Lorsqu'un risque nouveau est identifié ou qu'une réglementation évolue",
      "Seulement lorsque de nouveaux bâtiments sont construits",
      "À chaque changement de propriétaire"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Mise à jour ERP"
  },
  {
    id: 90,
    question: "Les zones \"jaunes\" dans un plan PPR indiquent :",
    options: [
      "Qu'il n'y a aucun risque dans la zone",
      "Qu'il existe un risque modéré, avec des recommandations spécifiques",
      "Qu'il s'agit de zones naturelles protégées",
      "Qu'il s'agit de zones d'activité économique"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Zones Jaunes PPR"
  },
  {
    id: 91,
    question: "Le rôle principal d'un PPR est de :",
    options: [
      "Limiter l'urbanisation dans certaines zones",
      "Prévenir et réduire les risques naturels et technologiques",
      "Promouvoir le développement industriel dans des zones spécifiques",
      "Faciliter les procédures d'urbanisme"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Rôle Principal PPR"
  },
  {
    id: 92,
    question: "Un bien immobilier situé dans une zone \"haute pollution\" devra, selon l'ERP :",
    options: [
      "Être exempté de toutes taxes foncières",
      "Subir des inspections régulières pour vérifier la qualité de l'air et des sols",
      "Avoir des restrictions d'usage ou de construction",
      "Faire l'objet d'une décontamination obligatoire"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Zone Haute Pollution"
  },
  {
    id: 93,
    question: "En cas de découverte de pollution dans un bien immobilier, l'ERP doit mentionner :",
    options: [
      "Les coordonnées des responsables de la pollution",
      "Les risques pour la santé et l'environnement associés à cette pollution",
      "Les compensations financières possibles pour les acheteurs",
      "Les procédures de décontamination"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Découverte Pollution"
  },
  {
    id: 94,
    question: "Le radon est particulièrement dangereux pour :",
    options: [
      "Les installations industrielles",
      "Les habitants exposés à des concentrations élevées dans les bâtiments",
      "Les sols agricoles et les cultures",
      "Les réseaux d'eau potable"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Danger Radon"
  },
  {
    id: 95,
    question: "La loi impose la remise de l'ERP lors de :",
    options: [
      "La signature d'un compromis de vente",
      "La demande de permis de construire",
      "L'acquisition d'un terrain agricole",
      "Toute transaction immobilière"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Loi ERP"
  },
  {
    id: 96,
    question: "L'ERP mentionne-t-il systématiquement les \"zones de bruit\" ?",
    options: [
      "Oui, surtout dans les zones urbaines à forte densité de circulation",
      "Non, cela relève d'une étude complémentaire",
      "Seulement si la zone est proche d'un aéroport",
      "Uniquement pour les biens commerciaux"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Zones Bruit"
  },
  {
    id: 97,
    question: "Dans une zone à risques d'inondation, il est obligatoire de :",
    options: [
      "Informer les autorités sur la construction",
      "Construire des maisons sur pilotis ou utiliser des matériaux résistant à l'humidité",
      "Réaliser une étude d'impact environnemental",
      "Souscrire une assurance spéciale"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Obligations Inondation"
  },
  {
    id: 98,
    question: "Un PPR de \"zone d'inondation\" peut limiter :",
    options: [
      "La hauteur des bâtiments uniquement",
      "Le type d'activité autorisée et les types de constructions autorisées",
      "La vente du bien immobilier dans cette zone",
      "L'accès aux services publics"
    ],
    correct: 1,
    difficulty: "difficile",
    category: "Limitations PPR"
  },
  {
    id: 99,
    question: "La parcelle cadastrale est identifiée par :",
    options: [
      "Un numéro et une lettre",
      "Un code postal",
      "Un nom propre",
      "Un identifiant unique lié à la municipalité"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Identification Parcelle"
  },
  {
    id: 100,
    question: "Quel organisme délivre un extrait cadastral en France ?",
    options: [
      "Le cadastre",
      "La mairie",
      "L'urbanisme",
      "La préfecture"
    ],
    correct: 0,
    difficulty: "difficile",
    category: "Organisme Cadastre"
  }
];

// ==================== ÉTATS DE JEU ====================
// État du Mastermind
let mastermindState = {
  targetNumber: null,
  mode: 'random',
  isGameActive: false,
  attempts: [],
  players: {},
  hostId: null,
  maxAttempts: 30
};

// État du Quiz
let quizState = {
  currentQuestion: null,
  currentQuestionIndex: 0,
  questions: [],
  isGameActive: false,
  players: {},
  hostId: null,
  answers: {},
  scores: {},
  gameSettings: {
    questionCount: 10,
    difficulty: 'mixed', // 'facile', 'moyen', 'difficile', 'mixed'
    timePerQuestion: 30
  },
  questionStartTime: null,
  questionTimer: null
};

// ==================== FONCTIONS MASTERMIND ====================
function generateRandomNumber() {
  return Math.floor(Math.random() * 9999).toString().padStart(4, '0');
}

function validateNumber(number) {
  return /^\d{4}$/.test(number) && number >= '0001' && number <= '9999';
}

function compareNumbers(guess, target) {
  const guessArray = guess.split('');
  const targetArray = target.split('');
  
  let correctPosition = 0;
  let correctNumber = 0;
  
  for (let i = 0; i < 4; i++) {
    if (guessArray[i] === targetArray[i]) {
      correctPosition++;
      guessArray[i] = 'X';
      targetArray[i] = 'Y';
    }
  }
  
  for (let i = 0; i < 4; i++) {
    if (guessArray[i] !== 'X') {
      const index = targetArray.indexOf(guessArray[i]);
      if (index !== -1) {
        correctNumber++;
        targetArray[index] = 'Z';
      }
    }
  }
  
  return { correctPosition, correctNumber };
}

function resetMastermind() {
  mastermindState.targetNumber = null;
  mastermindState.isGameActive = false;
  mastermindState.attempts = [];
  mastermindState.mode = 'random';
}

// ==================== FONCTIONS QUIZ ====================
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function selectQuestions(difficulty, count) {
  let availableQuestions = [];
  
  if (difficulty === 'mixed') {
    const easyCount = Math.floor(count * 0.4);
    const mediumCount = Math.floor(count * 0.4);
    const hardCount = count - easyCount - mediumCount;
    
    const easy = shuffleArray(quizQuestions.filter(q => q.difficulty === 'facile')).slice(0, easyCount);
    const medium = shuffleArray(quizQuestions.filter(q => q.difficulty === 'moyen')).slice(0, mediumCount);
    const hard = shuffleArray(quizQuestions.filter(q => q.difficulty === 'difficile')).slice(0, hardCount);
    
    availableQuestions = [...easy, ...medium, ...hard];
  } else {
    availableQuestions = quizQuestions.filter(q => q.difficulty === difficulty);
  }
  
  return shuffleArray(availableQuestions).slice(0, count);
}

function resetQuiz() {
  quizState.currentQuestion = null;
  quizState.currentQuestionIndex = 0;
  quizState.questions = [];
  quizState.isGameActive = false;
  quizState.answers = {};
  quizState.questionStartTime = null;
  if (quizState.questionTimer) {
    clearTimeout(quizState.questionTimer);
    quizState.questionTimer = null;
  }
}

function nextQuestion() {
  if (quizState.currentQuestionIndex >= quizState.questions.length) {
    endQuiz();
    return;
  }
  
  quizState.currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  quizState.answers = {};
  quizState.questionStartTime = Date.now();
  
  // Envoyer la question à tous les joueurs
  io.to('quiz').emit('new-question', {
    question: quizState.currentQuestion,
    questionNumber: quizState.currentQuestionIndex + 1,
    totalQuestions: quizState.questions.length,
    timeLimit: quizState.gameSettings.timePerQuestion
  });
  
  // Démarrer le timer
  quizState.questionTimer = setTimeout(() => {
    processAnswers();
  }, quizState.gameSettings.timePerQuestion * 1000);
}

function processAnswers() {
  if (quizState.questionTimer) {
    clearTimeout(quizState.questionTimer);
    quizState.questionTimer = null;
  }
  
  const correctAnswer = quizState.currentQuestion.correct;
  const results = {};
  
  // Calculer les scores
  Object.keys(quizState.players).forEach(playerId => {
    const playerAnswer = quizState.answers[playerId];
    const isCorrect = playerAnswer !== undefined && playerAnswer === correctAnswer;
    
    if (isCorrect) {
      const timeBonus = Math.max(0, quizState.gameSettings.timePerQuestion - Math.floor((Date.now() - quizState.questionStartTime) / 1000));
      const points = 10 + timeBonus;
      quizState.scores[playerId] = (quizState.scores[playerId] || 0) + points;
    }
    
    results[playerId] = {
      answer: playerAnswer,
      correct: isCorrect,
      points: isCorrect ? (10 + Math.max(0, quizState.gameSettings.timePerQuestion - Math.floor((Date.now() - quizState.questionStartTime) / 1000))) : 0
    };
  });
  
  // Envoyer les résultats
  io.to('quiz').emit('question-results', {
    correctAnswer,
    results,
    scores: quizState.scores,
    explanation: quizState.currentQuestion.explanation || null
  });
  
  quizState.currentQuestionIndex++;
  
  // Passer à la question suivante après 5 secondes
  setTimeout(() => {
    nextQuestion();
  }, 5000);
}

function endQuiz() {
  quizState.isGameActive = false;
  
  // Calculer le classement
  const ranking = Object.entries(quizState.scores)
    .map(([playerId, score]) => ({
      playerId,
      playerName: quizState.players[playerId]?.name || 'Inconnu',
      score
    }))
    .sort((a, b) => b.score - a.score);
  
  io.to('quiz').emit('quiz-ended', {
    ranking,
    totalQuestions: quizState.questions.length
  });
}

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('Nouvel utilisateur connecté:', socket.id);
  
  // ========== ÉVÉNEMENTS MASTERMIND ==========
  socket.on('join-mastermind', (playerName) => {
    socket.join('mastermind');
    
    mastermindState.players[socket.id] = {
      name: playerName || `Joueur ${Object.keys(mastermindState.players).length + 1}`,
      id: socket.id,
      score: 0
    };
    
    if (!mastermindState.hostId) {
      mastermindState.hostId = socket.id;
      socket.emit('mastermind-host-status', true);
    }
    
    socket.emit('mastermind-game-state', {
      ...mastermindState,
      targetNumber: undefined
    });
    
    io.to('mastermind').emit('mastermind-player-joined', {
      player: mastermindState.players[socket.id],
      players: mastermindState.players
    });
  });
  
  socket.on('start-mastermind', (data) => {
    if (socket.id !== mastermindState.hostId) {
      socket.emit('error', 'Seul l\'hôte peut démarrer une partie');
      return;
    }
    
    resetMastermind();
    mastermindState.mode = data.mode;
    
    if (data.mode === 'random') {
      mastermindState.targetNumber = generateRandomNumber();
      mastermindState.isGameActive = true;
      
      io.to('mastermind').emit('mastermind-game-started', {
        mode: 'random',
        message: 'Une nouvelle partie a commencé ! Le nombre a été généré aléatoirement.'
      });
    } else if (data.mode === 'manual') {
      if (!validateNumber(data.customNumber)) {
        socket.emit('error', 'Le nombre doit être entre 0001 et 9999');
        return;
      }
      
      mastermindState.targetNumber = data.customNumber;
      mastermindState.isGameActive = true;
      
      io.to('mastermind').emit('mastermind-game-started', {
        mode: 'manual',
        message: 'Une nouvelle partie a commencé ! Le nombre a été défini par l\'hôte.'
      });
    }
  });
  
  socket.on('mastermind-guess', (guess) => {
    if (!mastermindState.isGameActive) {
      socket.emit('error', 'Aucune partie en cours');
      return;
    }
    
    if (!validateNumber(guess)) {
      socket.emit('error', 'Le nombre doit être entre 0001 et 9999');
      return;
    }
    
    const player = mastermindState.players[socket.id];
    if (!player) {
      socket.emit('error', 'Joueur non trouvé');
      return;
    }
    
    const result = compareNumbers(guess, mastermindState.targetNumber);
    
    const attempt = {
      id: Date.now(),
      playerName: player.name,
      playerId: socket.id,
      guess: guess,
      result: result,
      timestamp: new Date().toLocaleTimeString()
    };
    
    mastermindState.attempts.push(attempt);
    
    const isWin = result.correctPosition === 4;
    const isGameOver = isWin || mastermindState.attempts.length >= mastermindState.maxAttempts;
    
    if (isWin) {
      mastermindState.players[socket.id].score++;
      io.to('mastermind').emit('mastermind-game-won', {
        winner: player.name,
        targetNumber: mastermindState.targetNumber,
        attempts: mastermindState.attempts.length
      });
      mastermindState.isGameActive = false;
    } else if (isGameOver) {
      io.to('mastermind').emit('mastermind-game-over', {
        targetNumber: mastermindState.targetNumber,
        message: 'Nombre maximum de tentatives atteint !'
      });
      mastermindState.isGameActive = false;
    }
    
    io.to('mastermind').emit('mastermind-new-attempt', attempt);
    
    io.to('mastermind').emit('mastermind-game-state-update', {
      isGameActive: mastermindState.isGameActive,
      attemptsCount: mastermindState.attempts.length,
      maxAttempts: mastermindState.maxAttempts,
      players: mastermindState.players
    });
  });
  
  // ========== ÉVÉNEMENTS QUIZ ==========
  socket.on('join-quiz', (playerName) => {
    socket.join('quiz');
    
    quizState.players[socket.id] = {
      name: playerName || `Joueur ${Object.keys(quizState.players).length + 1}`,
      id: socket.id
    };
    
    if (!quizState.scores[socket.id]) {
      quizState.scores[socket.id] = 0;
    }
    
    if (!quizState.hostId) {
      quizState.hostId = socket.id;
      socket.emit('quiz-host-status', true);
    }
    
    socket.emit('quiz-game-state', {
      isGameActive: quizState.isGameActive,
      currentQuestion: quizState.currentQuestion,
      questionNumber: quizState.currentQuestionIndex + 1,
      totalQuestions: quizState.questions.length,
      players: quizState.players,
      scores: quizState.scores,
      gameSettings: quizState.gameSettings
    });
    
    io.to('quiz').emit('quiz-player-joined', {
      player: quizState.players[socket.id],
      players: quizState.players
    });
  });
  
  socket.on('start-quiz', (settings) => {
    if (socket.id !== quizState.hostId) {
      socket.emit('error', 'Seul l\'hôte peut démarrer une partie');
      return;
    }
    
    resetQuiz();
    quizState.gameSettings = { ...quizState.gameSettings, ...settings };
    
    // Sélectionner les questions
    quizState.questions = selectQuestions(
      quizState.gameSettings.difficulty,
      quizState.gameSettings.questionCount
    );
    
    if (quizState.questions.length === 0) {
      socket.emit('error', 'Aucune question disponible pour ces critères');
      return;
    }
    
    // Réinitialiser les scores
    Object.keys(quizState.players).forEach(playerId => {
      quizState.scores[playerId] = 0;
    });
    
    quizState.isGameActive = true;
    quizState.currentQuestionIndex = 0;
    
    io.to('quiz').emit('quiz-game-started', {
      message: `Quiz démarré ! ${quizState.questions.length} questions, difficulté: ${quizState.gameSettings.difficulty}`,
      settings: quizState.gameSettings
    });
    
    // Démarrer la première question après 3 secondes
    setTimeout(() => {
      nextQuestion();
    }, 3000);
  });
  
  socket.on('quiz-answer', (answerIndex) => {
    if (!quizState.isGameActive || !quizState.currentQuestion) {
      socket.emit('error', 'Aucune question en cours');
      return;
    }
    
    if (quizState.answers[socket.id] !== undefined) {
      socket.emit('error', 'Vous avez déjà répondu à cette question');
      return;
    }
    
    if (answerIndex < 0 || answerIndex >= quizState.currentQuestion.options.length) {
      socket.emit('error', 'Réponse invalide');
      return;
    }
    
    quizState.answers[socket.id] = answerIndex;
    
    socket.emit('quiz-answer-recorded', {
      answerIndex,
      questionId: quizState.currentQuestion.id
    });
    
    // Vérifier si tous les joueurs ont répondu
    const totalPlayers = Object.keys(quizState.players).length;
    const totalAnswers = Object.keys(quizState.answers).length;
    
    if (totalAnswers === totalPlayers) {
      processAnswers();
    }
  });
  
  // ========== ÉVÉNEMENTS COMMUNS ==========
  socket.on('chat-message', (data) => {
    const { message, game } = data;
    const gameState = game === 'quiz' ? quizState : mastermindState;
    const player = gameState.players[socket.id];
    
    if (player && message.trim()) {
      io.to(game).emit('chat-message', {
        playerName: player.name,
        message: message.trim(),
        timestamp: new Date().toLocaleTimeString(),
        game
      });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    
    // Nettoyer Mastermind
    if (mastermindState.players[socket.id]) {
      delete mastermindState.players[socket.id];
      
      if (mastermindState.hostId === socket.id) {
        const remainingPlayers = Object.keys(mastermindState.players);
        if (remainingPlayers.length > 0) {
          mastermindState.hostId = remainingPlayers[0];
          io.to(mastermindState.hostId).emit('mastermind-host-status', true);
        } else {
          mastermindState.hostId = null;
          resetMastermind();
        }
      }
      
      io.to('mastermind').emit('mastermind-player-left', {
        playerId: socket.id,
        players: mastermindState.players
      });
    }
    
    // Nettoyer Quiz
    if (quizState.players[socket.id]) {
      delete quizState.players[socket.id];
      delete quizState.scores[socket.id];
      
      if (quizState.hostId === socket.id) {
        const remainingPlayers = Object.keys(quizState.players);
        if (remainingPlayers.length > 0) {
          quizState.hostId = remainingPlayers[0];
          io.to(quizState.hostId).emit('quiz-host-status', true);
        } else {
          quizState.hostId = null;
          resetQuiz();
        }
      }
      
      io.to('quiz').emit('quiz-player-left', {
        playerId: socket.id,
        players: quizState.players
      });
    }
  });
});

// ==================== ROUTES ====================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/mastermind', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mastermind.html'));
});

app.get('/quiz', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quiz.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur le port ${PORT}`);
  console.log(`Quiz: ${quizQuestions.length} questions chargées`);
});
