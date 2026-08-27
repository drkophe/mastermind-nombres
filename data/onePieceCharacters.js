// ============================================================================
// DONNÉES — 4 IMAGES 1 MOT : ÉDITION ONE PIECE
// ----------------------------------------------------------------------------
// Fichier volontairement séparé de la logique de jeu : il est destiné à être
// complété / corrigé facilement sans toucher au serveur.
//
// Structure d'un personnage :
// {
//   id:         identifiant unique (string, sans espace)
//   name:       nom affiché à la révélation
//   answers:    [string] toutes les réponses acceptées (comparaison insensible
//               à la casse, aux accents, aux espaces et à la ponctuation)
//   difficulty: 1 (très connu) → 5 (secondaire / obscur)
//   clues:      exactement 4 indices, du plus abstrait (1) au plus explicite (4)
//               chaque indice = { emoji, text?, image? }
//                 - emoji : la combinaison d'emoji affichée (fallback par défaut)
//                 - text  : petite légende (utilisée surtout sur les indices 3 et 4)
//                 - image : URL d'une vraie image — SI elle est renseignée, le
//                           client l'affiche À LA PLACE des emoji. C'est le point
//                           d'extension prévu pour brancher de vraies images
//                           (wiki Fandom, assets locaux dans /public/img/...)
//   trivia:     phrase affichée quand la réponse est révélée
// }
// ============================================================================

const onePieceCharacters = [
  // ------------------------------------------------------------------
  // NIVEAU 1 — Ultra connus (les 5 premiers mots d'une partie
  // "progressive" sont toujours tirés dans ce groupe)
  // ------------------------------------------------------------------
  {
    id: 'luffy',
    name: 'Monkey D. Luffy',
    answers: ['luffy', 'monkey d luffy', 'monkey luffy', 'mugiwara', 'chapeau de paille'],
    difficulty: 1,
    clues: [
      { emoji: '🍖😋🥩' },
      { emoji: '🫲🎈💥' },
      { emoji: '👒🌊🏴‍☠️', text: "Capitaine d'un équipage de 10 membres" },
      { emoji: '👒🫱🥊', text: "L'homme élastique au chapeau de paille, futur Roi des Pirates" }
    ],
    trivia: "Capitaine de l'équipage du Chapeau de Paille, il a mangé le Gomu Gomu no Mi."
  },
  {
    id: 'zoro',
    name: 'Roronoa Zoro',
    answers: ['zoro', 'roronoa zoro', 'roronoa', 'zorro'],
    difficulty: 1,
    clues: [
      { emoji: '🧭❓😵‍💫' },
      { emoji: '⚔️⚔️⚔️' },
      { emoji: '🗡️👺🍶', text: 'Trois sabres, dont un tenu entre les dents' },
      { emoji: '💚🩹👁️', text: "Le sabreur au bandana vert, second de l'équipage au Chapeau de Paille" }
    ],
    trivia: "Maître du Santoryu, il veut devenir le plus grand sabreur du monde."
  },
  {
    id: 'nami',
    name: 'Nami',
    answers: ['nami'],
    difficulty: 1,
    clues: [
      { emoji: '🍊🍊🍊' },
      { emoji: '🗺️🧭⛅' },
      { emoji: '⚡🌀🪄', text: 'Manie un bâton qui contrôle la météo' },
      { emoji: '👩‍🦰💰🍊', text: 'La navigatrice rousse, voleuse et obsédée par les berrys' }
    ],
    trivia: "Surnommée « la chatte cambrioleuse », elle rêve de cartographier le monde."
  },
  {
    id: 'sanji',
    name: 'Vinsmoke Sanji',
    answers: ['sanji', 'vinsmoke sanji', 'sandy'],
    difficulty: 1,
    clues: [
      { emoji: '🚬🌀🙄' },
      { emoji: '🍳🥘🔥' },
      { emoji: '🦵🔥❤️', text: 'Se bat uniquement avec les jambes' },
      { emoji: '🥢🍽️😍', text: 'Le cuisinier au sourcil en spirale, fou amoureux de toutes les femmes' }
    ],
    trivia: "Cuisinier de bord, il cherche All Blue, la mer où vivent tous les poissons."
  },
  {
    id: 'chopper',
    name: 'Tony Tony Chopper',
    answers: ['chopper', 'tony tony chopper', 'tony chopper'],
    difficulty: 1,
    clues: [
      { emoji: '❄️🌸🍬' },
      { emoji: '🦌💊🩺' },
      { emoji: '🎩🔵🐾', text: 'Médecin de bord, capable de changer de forme' },
      { emoji: '🦌🎩🍬', text: "Le petit renne médecin qui a mangé le Fruit de l'Humain" }
    ],
    trivia: "Élève du Dr Hiluluk et de la Dr Kureha, sur l'île de Drum."
  },
  {
    id: 'usopp',
    name: 'Usopp',
    answers: ['usopp', 'ussop', 'pipo', 'sogeking', 'god usopp'],
    difficulty: 1,
    clues: [
      { emoji: '👃🤥😰' },
      { emoji: '🎯🪃💥' },
      { emoji: '🔴🥽🌟', text: "Tireur d'élite qui invente des histoires à longueur de journée" },
      { emoji: '👃🎯🐉', text: 'Le menteur au long nez, alias Sogeking' }
    ],
    trivia: "Il veut devenir un brave guerrier des mers, comme son père Yasopp."
  },
  {
    id: 'robin',
    name: 'Nico Robin',
    answers: ['robin', 'nico robin'],
    difficulty: 1,
    clues: [
      { emoji: '📚🏛️🕯️' },
      { emoji: '🌸🖐️🖐️' },
      { emoji: '🖐️🌺🧠', text: "Fait pousser des bras sur n'importe quelle surface" },
      { emoji: '📖🕵️‍♀️🌸', text: "L'archéologue, seule personne capable de lire les Ponéglyphes" }
    ],
    trivia: "Seule survivante d'Ohara, elle cherche l'Histoire du Siècle Oublié."
  },
  {
    id: 'brook',
    name: 'Brook',
    answers: ['brook', 'brooke', 'soul king'],
    difficulty: 1,
    clues: [
      { emoji: '☕💀😂' },
      { emoji: '🎻🎶🎤' },
      { emoji: '💀🎩🗡️', text: 'Revenu à la vie grâce à un fruit du démon' },
      { emoji: '💀🎻🎩', text: 'Le squelette musicien, alias le Soul King' }
    ],
    trivia: "Yohohoho ! Il a attendu 50 ans seul dans le Triangle Florian."
  },

  // ------------------------------------------------------------------
  // NIVEAU 2 — Très populaires
  // ------------------------------------------------------------------
  {
    id: 'franky',
    name: 'Franky',
    answers: ['franky', 'cutty flam', 'franki'],
    difficulty: 2,
    clues: [
      { emoji: '🥤🩲💪' },
      { emoji: '🔧🤖🔩' },
      { emoji: '🌟🦾🥤', text: 'Cyborg charpentier qui carbure au cola' },
      { emoji: '🩲🕶️💇', text: 'Le charpentier cyborg qui hurle SUPEEER' }
    ],
    trivia: "Élève de Tom, il a construit le Thousand Sunny."
  },
  {
    id: 'jinbe',
    name: 'Jinbe',
    answers: ['jinbe', 'jinbei', 'jimbei', 'jimbe'],
    difficulty: 2,
    clues: [
      { emoji: '🌊🥋🫧' },
      { emoji: '🦈👘🥋' },
      { emoji: '🌊👊🥋', text: 'Homme-poisson maître du karaté des hommes-poissons' },
      { emoji: '🦈🚢🧭', text: "L'ancien Grand Corsaire devenu timonier de l'équipage" }
    ],
    trivia: "Le « Chevalier des Mers », dernier membre à rejoindre l'équipage."
  },
  {
    id: 'ace',
    name: 'Portgas D. Ace',
    answers: ['ace', 'portgas d ace', 'portgas ace', 'ace aux poings ardents'],
    difficulty: 2,
    clues: [
      { emoji: '😴🍳🎩' },
      { emoji: '🔥🔥🔥' },
      { emoji: '🔥🎩🧡', text: 'Poings ardents et tatouage ASCE dans le dos' },
      { emoji: '🔥👒👦', text: 'Le frère aîné de Luffy, commandant de la 2e flotte de Barbe Blanche' }
    ],
    trivia: "Fils de Gol D. Roger, mort à Marine Ford pour protéger son frère."
  },
  {
    id: 'shanks',
    name: 'Shanks le Roux',
    answers: ['shanks', 'le roux', 'shanks le roux', 'shank'],
    difficulty: 2,
    clues: [
      { emoji: '🍶🦜😄' },
      { emoji: '🟥🦰🩸' },
      { emoji: '👒🎁🌊', text: "A offert son chapeau de paille à un enfant" },
      { emoji: '🦰🗡️🏴‍☠️', text: "L'Empereur roux qui a perdu un bras pour sauver un gamin" }
    ],
    trivia: "Ancien mousse de Gol D. Roger, il a déclenché le rêve de Luffy."
  },
  {
    id: 'barbe-blanche',
    name: 'Barbe Blanche (Edward Newgate)',
    answers: ['barbe blanche', 'whitebeard', 'edward newgate', 'newgate'],
    difficulty: 2,
    clues: [
      { emoji: '🌊💥🏝️' },
      { emoji: '🌗🔱💢' },
      { emoji: '🩺🛏️👴', text: "Un colosse sous perfusion qui appelle ses hommes « mes fils »" },
      { emoji: '🥸🔱🌍', text: "L'homme le plus fort du monde, Empereur au fruit des Tremblements" }
    ],
    trivia: "Gura Gura no Mi : le fruit capable de détruire le monde."
  },
  {
    id: 'law',
    name: 'Trafalgar D. Water Law',
    answers: ['law', 'trafalgar law', 'trafalgar d water law', 'trafalgar'],
    difficulty: 2,
    clues: [
      { emoji: '🐻‍❄️🎩💛' },
      { emoji: '🔵🔪🏥' },
      { emoji: '🩺🗡️🔵', text: 'Découpe tout ce qui entre dans sa sphère sans faire couler le sang' },
      { emoji: '😼🧥🩻', text: 'Le Chirurgien de la Mort, capitaine des Pirates du Cœur' }
    ],
    trivia: "Room ! Shambles ! Il possède l'Ope Ope no Mi, le fruit ultime."
  },
  {
    id: 'hancock',
    name: 'Boa Hancock',
    answers: ['hancock', 'boa hancock', 'boa', 'imperatrice pirate'],
    difficulty: 2,
    clues: [
      { emoji: '🐍👑💕' },
      { emoji: '💘🗿💔' },
      { emoji: '🏝️👸🐍', text: 'Règne sur une île interdite aux hommes' },
      { emoji: '💖🗿👑', text: "L'Impératrice pirate d'Amazon Lily, éperdument amoureuse de Luffy" }
    ],
    trivia: "Mero Mero no Mi : elle pétrifie quiconque la trouve belle."
  },
  {
    id: 'buggy',
    name: 'Baggy le Clown',
    answers: ['buggy', 'baggy', 'buggy le clown', 'baggy le clown'],
    difficulty: 2,
    clues: [
      { emoji: '🤡🔴👃' },
      { emoji: '✂️🧩🔪' },
      { emoji: '🎪🤡💣', text: 'Se découpe en morceaux qui flottent dans les airs' },
      { emoji: '🤡👃🎪', text: 'Le clown au nez rouge devenu Empereur totalement par accident' }
    ],
    trivia: "Ancien mousse de Roger, il est le roi des malentendus."
  },
  {
    id: 'crocodile',
    name: 'Sir Crocodile',
    answers: ['crocodile', 'sir crocodile', 'mr 0', 'mister 0'],
    difficulty: 2,
    clues: [
      { emoji: '🏜️🌵🚬' },
      { emoji: '⏳🪝🌪️' },
      { emoji: '🐊🪝🏜️', text: "Un crochet en or à la place de la main gauche" },
      { emoji: '🏜️👔🪝', text: "Le maître du sable, patron de Baroque Works à Alabasta" }
    ],
    trivia: "Premier Grand Corsaire vaincu par Luffy — en trois combats."
  },
  {
    id: 'sabo',
    name: 'Sabo',
    answers: ['sabo'],
    difficulty: 2,
    clues: [
      { emoji: '🎩🥽🧵' },
      { emoji: '🔥🤝🕊️' },
      { emoji: '📜🔥🎩', text: "Numéro 2 de l'Armée Révolutionnaire" },
      { emoji: '🔥👦🍶', text: "Le frère juré de Luffy et Ace, héritier du fruit des Flammes" }
    ],
    trivia: "Noble de Goa devenu révolutionnaire, il a hérité du Mera Mera no Mi."
  },

  // ------------------------------------------------------------------
  // NIVEAU 3 — Connus des lecteurs réguliers
  // ------------------------------------------------------------------
  {
    id: 'kaido',
    name: 'Kaido',
    answers: ['kaido', 'kaidou', 'kaido aux cent fauves'],
    difficulty: 3,
    clues: [
      { emoji: '🍶😤💢' },
      { emoji: '🐉☁️⚡' },
      { emoji: '🐲🏝️🌩️', text: 'Se transforme en dragon oriental bleu' },
      { emoji: '🐉🍶👹', text: "L'Empereur de Wano, réputé être la créature la plus forte du monde" }
    ],
    trivia: "Il a survécu à 40 exécutions et saute des îles célestes pour s'amuser."
  },
  {
    id: 'big-mom',
    name: 'Charlotte Linlin (Big Mom)',
    answers: ['big mom', 'bigmom', 'charlotte linlin', 'linlin'],
    difficulty: 3,
    clues: [
      { emoji: '🍰🍭🎂' },
      { emoji: '👻☁️🔥' },
      { emoji: '🍬🏰👶', text: "Une mère à la tête d'une immense famille sur une île de sucreries" },
      { emoji: '🎂👑😈', text: "L'Impératrice de Whole Cake Island, qui donne vie aux objets" }
    ],
    trivia: "Soul Soul no Mi : elle arrache l'espérance de vie des gens."
  },
  {
    id: 'doflamingo',
    name: 'Donquixote Doflamingo',
    answers: ['doflamingo', 'donquixote doflamingo', 'doffy', 'joker'],
    difficulty: 3,
    clues: [
      { emoji: '🦩🕶️😁' },
      { emoji: '🧵🪡🎎' },
      { emoji: '🧵🕶️🎪', text: 'Manipule les gens comme des marionnettes avec des fils' },
      { emoji: '🦩🧥👑', text: "L'ancien roi de Dressrosa au manteau rose, alias Joker" }
    ],
    trivia: "Ancien Dragon Céleste, trafiquant de fruits du démon."
  },
  {
    id: 'smoker',
    name: 'Smoker',
    answers: ['smoker', 'smoker le fumeur blanc', 'fumeur blanc'],
    difficulty: 3,
    clues: [
      { emoji: '🚬🚬💨' },
      { emoji: '☁️🏍️⚓' },
      { emoji: '⚓💨🔱', text: 'Militaire qui poursuit Luffy depuis Loguetown' },
      { emoji: '🚬⚓☁️', text: 'Le Chasseur blanc de la Marine, homme-fumée' }
    ],
    trivia: "Moku Moku no Mi. Toujours accompagné de Tashigi."
  },
  {
    id: 'garp',
    name: 'Monkey D. Garp',
    answers: ['garp', 'monkey d garp', 'monkey garp'],
    difficulty: 3,
    clues: [
      { emoji: '🍩😴👊' },
      { emoji: '⚓👴💥' },
      { emoji: '👊🌋⚓', text: "Un héros de la Marine qui distribue des « poings d'amour »" },
      { emoji: '👴⚓👒', text: 'Le grand-père de Luffy, surnommé le Héros de la Marine' }
    ],
    trivia: "Il a acculé Gol D. Roger sans jamais manger de fruit du démon."
  },
  {
    id: 'rayleigh',
    name: 'Silvers Rayleigh',
    answers: ['rayleigh', 'silvers rayleigh', 'seigneur des tenebres'],
    difficulty: 3,
    clues: [
      { emoji: '👓🍺🔧' },
      { emoji: '🚢🫧🧴' },
      { emoji: '🗡️👴🫧', text: 'Ancien bras droit du Roi des Pirates, recyclé en encreur de navires' },
      { emoji: '👓⚔️👑', text: "Le Seigneur des Ténèbres, mentor de Luffy pendant deux ans" }
    ],
    trivia: "Il a appris le Haki à Luffy sur l'île de Rusukaina."
  },
  {
    id: 'enel',
    name: 'Enel',
    answers: ['enel', 'ener', 'eneru'],
    difficulty: 3,
    clues: [
      { emoji: '🥁⚡😏' },
      { emoji: '☁️⛩️🌩️' },
      { emoji: '⚡👂🏝️', text: "Se prend pour un dieu sur une île perchée dans le ciel" },
      { emoji: '⚡🥁🌕', text: 'Le « dieu » de Skypiea, homme-foudre parti vivre sur la Lune' }
    ],
    trivia: "Goro Goro no Mi. Son Mantra est une forme de Haki de l'Observation."
  },
  {
    id: 'bartolomeo',
    name: 'Bartolomeo',
    answers: ['bartolomeo', 'barto', 'bartholomeo'],
    difficulty: 3,
    clues: [
      { emoji: '🖕😈🟢' },
      { emoji: '🚧🛡️✋' },
      { emoji: '🛡️👒🤩', text: "Un fan complètement hystérique de l'équipage au Chapeau de Paille" },
      { emoji: '🟢🖕🛡️', text: 'Le Cannibale à la crête verte qui érige des barrières invisibles' }
    ],
    trivia: "Bari Bari no Mi. Capitaine de la flotte des Chapeaux de Paille."
  },
  {
    id: 'perona',
    name: 'Perona',
    answers: ['perona', 'perhona'],
    difficulty: 3,
    clues: [
      { emoji: '🩷🎀🧸' },
      { emoji: '👻😞💭' },
      { emoji: '👻🌂🏰', text: 'Ses fantômes rendent les gens profondément dépressifs' },
      { emoji: '🩷👻🎀', text: 'La princesse fantôme de Thriller Bark, qui a veillé sur Zoro' }
    ],
    trivia: "Horo Horo no Mi. « Negative Hollow ! »"
  },
  {
    id: 'mihawk',
    name: 'Dracule Mihawk',
    answers: ['mihawk', 'dracule mihawk', 'oeil de faucon', 'hawkeye', 'hawk eye'],
    difficulty: 3,
    clues: [
      { emoji: '🍷🕯️🏰' },
      { emoji: '🦅👁️⚔️' },
      { emoji: '⚔️🕯️🍷', text: 'Porte une immense lame noire dans le dos et un couteau autour du cou' },
      { emoji: '🦅🗡️💚', text: 'Le plus grand sabreur du monde, maître de Zoro' }
    ],
    trivia: "Il possède Yoru, l'une des 12 Suprêmes."
  },

  // ------------------------------------------------------------------
  // NIVEAU 4 — Pour les vrais lecteurs
  // ------------------------------------------------------------------
  {
    id: 'kuzan',
    name: 'Kuzan (Aokiji)',
    answers: ['kuzan', 'aokiji', 'kuzan aokiji'],
    difficulty: 4,
    clues: [
      { emoji: '😴🚲🕶️' },
      { emoji: '🧊❄️🚲' },
      { emoji: '🧊⚓🌊', text: 'Amiral nonchalant qui gèle la mer pour la traverser à vélo' },
      { emoji: '❄️🕶️🌴', text: "L'ancien amiral homme-glace, parti après son duel à Punk Hazard" }
    ],
    trivia: "Hie Hie no Mi. Il a perdu une jambe contre Akainu."
  },
  {
    id: 'kizaru',
    name: 'Borsalino (Kizaru)',
    answers: ['kizaru', 'borsalino'],
    difficulty: 4,
    clues: [
      { emoji: '🍋😑🕶️' },
      { emoji: '💡⚡🦵' },
      { emoji: '🌟👞⚓', text: 'Amiral qui se déplace à la vitesse de la lumière' },
      { emoji: '🟡🕶️🦩', text: 'Le « Singe Jaune », amiral au fruit de la Lumière' }
    ],
    trivia: "Pika Pika no Mi. Il parle toujours d'un ton traînant."
  },
  {
    id: 'katakuri',
    name: 'Charlotte Katakuri',
    answers: ['katakuri', 'charlotte katakuri'],
    difficulty: 4,
    clues: [
      { emoji: '🍩🧣🍩' },
      { emoji: '🍡👀🔮' },
      { emoji: '🍡🔱🧣', text: 'Voit quelques secondes dans le futur' },
      { emoji: '🍩🧣🔱', text: "L'homme-mochi, fils aîné et invaincu de la famille Charlotte" }
    ],
    trivia: "Mochi Mochi no Mi. Il cache sa bouche derrière une écharpe."
  },
  {
    id: 'yamato',
    name: 'Yamato',
    answers: ['yamato'],
    difficulty: 4,
    clues: [
      { emoji: '🍡🧊⛓️' },
      { emoji: '🐺❄️⚡' },
      { emoji: '📖⛓️🗡️', text: "Se considère comme l'héritier d'Oden après avoir lu son journal" },
      { emoji: '🐺🧊👹', text: "L'enfant de Kaido, chien-gardien Okuchi no Makami" }
    ],
    trivia: "Fruit du démon Zoan mythique. Porte les kanabo de son père."
  },
  {
    id: 'carrot',
    name: 'Carrot',
    answers: ['carrot', 'carott', 'carotte'],
    difficulty: 4,
    clues: [
      { emoji: '🥕🐰🍬' },
      { emoji: '🌕⚡🐇' },
      { emoji: '🐰🌕🌟', text: 'Se transforme sous la pleine lune en guerrier lumineux' },
      { emoji: '🥕🐇🌙', text: 'La Mink lapine de Zou, capable de passer en forme Sulong' }
    ],
    trivia: "Garde du duc Inuarashi, elle a suivi l'équipage jusqu'à Wano."
  },
  {
    id: 'vivi',
    name: 'Nefeltari Vivi',
    answers: ['vivi', 'nefeltari vivi', 'nefertari vivi', 'miss wednesday'],
    difficulty: 4,
    clues: [
      { emoji: '👑🏜️🕊️' },
      { emoji: '🦆💃🪶' },
      { emoji: '🏜️👸🦆', text: 'Princesse d’un royaume désertique, voyage à dos de canard' },
      { emoji: '💙👑🏜️', text: "La princesse d'Alabasta, ancienne Miss Wednesday" }
    ],
    trivia: "Membre honoraire de l'équipage, elle a salué Luffy avec le bras levé."
  },
  {
    id: 'bon-clay',
    name: 'Bentham (Mr. 2 Bon Clay)',
    answers: ['bon clay', 'bon kurei', 'mr 2', 'mister 2', 'bentham'],
    difficulty: 4,
    clues: [
      { emoji: '🩰🦢💄' },
      { emoji: '🎭👥🤡' },
      { emoji: '🦢🩰🎭', text: 'Change de visage en touchant les gens, danseur de ballet' },
      { emoji: '🦢💃🕺', text: "L'okama au manteau de cygne, alias Mr. 2" }
    ],
    trivia: "Mane Mane no Mi. Il s'est sacrifié à Impel Down pour Luffy."
  },
  {
    id: 'lucci',
    name: 'Rob Lucci',
    answers: ['lucci', 'rob lucci'],
    difficulty: 4,
    clues: [
      { emoji: '🕊️🎩🤫' },
      { emoji: '🐆👊🚪' },
      { emoji: '🐆🕊️🏛️', text: 'Agent secret qui parle par la voix de son pigeon' },
      { emoji: '🐆🎩🕊️', text: "L'homme-léopard du CP9 affronté à Enies Lobby" }
    ],
    trivia: "Neko Neko no Mi modèle léopard. Rokushiki : Rokuogan."
  },

  // ------------------------------------------------------------------
  // NIVEAU 5 — Secondaires / obscurs
  // ------------------------------------------------------------------
  {
    id: 'kinemon',
    name: "Kin'emon",
    answers: ['kinemon', 'kin emon', 'kin', 'kinemon de foxfire'],
    difficulty: 5,
    clues: [
      { emoji: '🍢👘😳' },
      { emoji: '👘🎭🔥' },
      { emoji: '🗾⚔️👘', text: "Samouraï capable d'habiller n'importe qui avec une simple feuille" },
      { emoji: '🔥🗡️🗾', text: 'Le samouraï de Wano au fruit du Vêtement, chef des Neuf Fourreaux Rouges' }
    ],
    trivia: "Fuku Fuku no Mi. Retrouvé en morceaux à Punk Hazard."
  },
  {
    id: 'wapol',
    name: 'Wapol',
    answers: ['wapol', 'wapolu'],
    difficulty: 5,
    clues: [
      { emoji: '👑🍽️😋' },
      { emoji: '🍴🏰🔩' },
      { emoji: '❄️👑🍴', text: "Roi déchu d'un royaume enneigé, il dévore tout ce qu'il touche" },
      { emoji: '🦛👑🍽️', text: "L'ancien tyran de Drum, redevenu roi grâce à ses jouets Wapometal" }
    ],
    trivia: "Baku Baku no Mi. Chassé par Dalton et l'équipage de Luffy."
  },
  {
    id: 'foxy',
    name: 'Foxy le Renard Argenté',
    answers: ['foxy', 'foxy le renard argente', 'renard argente'],
    difficulty: 5,
    clues: [
      { emoji: '🦊🎪🎯' },
      { emoji: '🐌⏱️🎗️' },
      { emoji: '⏱️🎪🦊', text: 'Organise des jeux truqués pour voler les membres des autres équipages' },
      { emoji: '🦊🐌⏳', text: 'Le Renard Argenté au fruit du Ralenti, roi du Davy Back Fight' }
    ],
    trivia: "Noro Noro no Mi. Son menton est aussi long que sa malhonnêteté."
  },
  {
    id: 'hatchan',
    name: 'Hatchan',
    answers: ['hatchan', 'hachi', 'hachan', 'hatchi'],
    difficulty: 5,
    clues: [
      { emoji: '🐙🍜🐙' },
      { emoji: '🍜⚔️6️⃣' },
      { emoji: '🐙🍜🌊', text: 'Homme-poisson pieuvre reconverti en vendeur de takoyaki' },
      { emoji: '🐙🍢⚔️', text: "L'ancien officier d'Arlong devenu ami de l'équipage" }
    ],
    trivia: "Six sabres, six bras. Il a présenté Camie et Pappag à l'équipage."
  },
  {
    id: 'pell',
    name: 'Pell',
    answers: ['pell', 'pell le faucon', 'pel'],
    difficulty: 5,
    clues: [
      { emoji: '🦅🏜️🕊️' },
      { emoji: '🦅💣💥' },
      { emoji: '🦅🏜️👑', text: 'Garde royal capable de se changer en faucon' },
      { emoji: '🦅💣🏜️', text: "Le protecteur d'Alabasta qui a emporté une bombe dans le ciel" }
    ],
    trivia: "Tori Tori no Mi modèle faucon. Il a survécu à l'explosion."
  },
  {
    id: 'moria',
    name: 'Gecko Moria',
    answers: ['moria', 'gecko moria', 'gekko moria', 'gecko moriah'],
    difficulty: 5,
    clues: [
      { emoji: '🧟🌫️😈' },
      { emoji: '✂️👤🧟' },
      { emoji: '👤🧟🚢', text: 'Vole les ombres des vivants pour animer une armée de zombies' },
      { emoji: '🧟🌫️😆', text: "L'ancien Grand Corsaire de Thriller Bark, maître des ténèbres" }
    ],
    trivia: "Kage Kage no Mi. « Kishishishi ! »"
  },
  {
    id: 'hawkins',
    name: 'Basil Hawkins',
    answers: ['hawkins', 'basil hawkins'],
    difficulty: 5,
    clues: [
      { emoji: '🃏🔮😐' },
      { emoji: '🪆📌🃏' },
      { emoji: '🃏📊🎴', text: 'Annonce ses chances de survie en pourcentage avant chaque combat' },
      { emoji: '🎴🪆🧙', text: 'Le « Magicien » du Pire Génération, au fruit de la Paille' }
    ],
    trivia: "Wara Wara no Mi. Devenu Shinuchi au service de Kaido."
  },
  {
    id: 'kuro',
    name: 'Capitaine Kuro',
    answers: ['kuro', 'capitaine kuro', 'klahadore', 'kuro aux cent plans'],
    difficulty: 5,
    clues: [
      { emoji: '🐈‍⬛👓🤵' },
      { emoji: '🐾🔪💨' },
      { emoji: '🤵🐈‍⬛🏠', text: "S'est fait passer pour un majordome pendant trois ans" },
      { emoji: '👓🔪🐈‍⬛', text: 'Le capitaine aux Cent Plans, griffes de chat et lunettes remontées du poignet' }
    ],
    trivia: "Premier vrai adversaire de l'équipage, dans le village de Kaya."
  }
];

// Libellés des niveaux, réutilisés côté client
const DIFFICULTY_LABELS = {
  1: 'Très facile',
  2: 'Facile',
  3: 'Moyen',
  4: 'Difficile',
  5: 'Expert'
};

module.exports = { onePieceCharacters, DIFFICULTY_LABELS };
