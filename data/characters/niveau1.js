// ============================================================================
// NIVEAU 1 — Personnages incontournables (les 5 premiers mots d'une partie
// "progressive" sont toujours tirés dans ce groupe)
// ----------------------------------------------------------------------------
// Format documenté dans data/onePieceCharacters.js
// ============================================================================

module.exports = [
  {
    id: "luffy",
    name: "Monkey D. Luffy",
    answers: ["luffy", "monkey d luffy", "monkey luffy", "mugiwara", "chapeau de paille"],
    difficulty: 1,
    clues: [
      { emoji: "🍖😋🥩" },
      { emoji: "🫲🎈💥" },
      { emoji: "👒🌊🏴‍☠️", text: "Capitaine d'un équipage de 10 membres" },
      { emoji: "👒🫱🥊", text: "L'homme élastique au chapeau de paille, futur Roi des Pirates" }
    ],
    trivia: "Capitaine de l'équipage du Chapeau de Paille, il a mangé le Gomu Gomu no Mi."
  },
  {
    id: "zoro",
    name: "Roronoa Zoro",
    answers: ["zoro", "roronoa zoro", "roronoa", "zorro"],
    difficulty: 1,
    clues: [
      { emoji: "🧭❓😵‍💫" },
      { emoji: "⚔️⚔️⚔️" },
      { emoji: "🗡️👺🍶", text: "Trois sabres, dont un tenu entre les dents" },
      { emoji: "💚🩹👁️", text: "Le sabreur au bandana vert, second de l'équipage au Chapeau de Paille" }
    ],
    trivia: "Maître du Santoryu, il veut devenir le plus grand sabreur du monde."
  },
  {
    id: "nami",
    name: "Nami",
    answers: ["nami"],
    difficulty: 1,
    clues: [
      { emoji: "🍊🍊🍊" },
      { emoji: "🗺️🧭⛅" },
      { emoji: "⚡🌀🪄", text: "Manie un bâton qui contrôle la météo" },
      { emoji: "👩‍🦰💰🍊", text: "La navigatrice rousse, voleuse et obsédée par les berrys" }
    ],
    trivia: "Surnommée « la chatte cambrioleuse », elle rêve de cartographier le monde."
  },
  {
    id: "sanji",
    name: "Vinsmoke Sanji",
    answers: ["sanji", "vinsmoke sanji", "sandy"],
    difficulty: 1,
    clues: [
      { emoji: "🚬🌀🙄" },
      { emoji: "🍳🥘🔥" },
      { emoji: "🦵🔥❤️", text: "Se bat uniquement avec les jambes" },
      { emoji: "🥢🍽️😍", text: "Le cuisinier au sourcil en spirale, fou amoureux de toutes les femmes" }
    ],
    trivia: "Cuisinier de bord, il cherche All Blue, la mer où vivent tous les poissons."
  },
  {
    id: "chopper",
    name: "Tony Tony Chopper",
    answers: ["chopper", "tony tony chopper", "tony chopper"],
    difficulty: 1,
    clues: [
      { emoji: "❄️🌸🍬" },
      { emoji: "🦌💊🩺" },
      { emoji: "🎩🔵🐾", text: "Médecin de bord, capable de changer de forme" },
      { emoji: "🦌🎩🍬", text: "Le petit renne médecin qui a mangé le Fruit de l'Humain" }
    ],
    trivia: "Élève du Dr Hiluluk et de la Dr Kureha, sur l'île de Drum."
  },
  {
    id: "usopp",
    name: "Usopp",
    answers: ["usopp", "ussop", "pipo", "sogeking", "god usopp"],
    difficulty: 1,
    clues: [
      { emoji: "👃🤥😰" },
      { emoji: "🎯🪃💥" },
      { emoji: "🔴🥽🌟", text: "Tireur d'élite qui invente des histoires à longueur de journée" },
      { emoji: "👃🎯🐉", text: "Le menteur au long nez, alias Sogeking" }
    ],
    trivia: "Il veut devenir un brave guerrier des mers, comme son père Yasopp."
  },
  {
    id: "robin",
    name: "Nico Robin",
    answers: ["robin", "nico robin"],
    difficulty: 1,
    clues: [
      { emoji: "📚🏛️🕯️" },
      { emoji: "🌸🖐️🖐️" },
      { emoji: "🖐️🌺🧠", text: "Fait pousser des bras sur n'importe quelle surface" },
      { emoji: "📖🕵️‍♀️🌸", text: "L'archéologue, seule personne capable de lire les Ponéglyphes" }
    ],
    trivia: "Seule survivante d'Ohara, elle cherche l'Histoire du Siècle Oublié."
  },
  {
    id: "brook",
    name: "Brook",
    answers: ["brook", "brooke", "soul king"],
    difficulty: 1,
    clues: [
      { emoji: "☕💀😂" },
      { emoji: "🎻🎶🎤" },
      { emoji: "💀🎩🗡️", text: "Revenu à la vie grâce à un fruit du démon" },
      { emoji: "💀🎻🎩", text: "Le squelette musicien, alias le Soul King" }
    ],
    trivia: "Yohohoho ! Il a attendu 50 ans seul dans le Triangle Florian."
  },
  {
    id: "franky",
    name: "Franky",
    answers: ["franky", "cutty flam", "franki"],
    difficulty: 1,
    clues: [
      { emoji: "🥤🩲💪" },
      { emoji: "🔧🤖🔩" },
      { emoji: "🌟🦾🥤", text: "Cyborg charpentier qui carbure au cola" },
      { emoji: "🩲🕶️💇", text: "Le charpentier cyborg qui hurle SUPEEER" }
    ],
    trivia: "Élève de Tom, il a construit le Thousand Sunny."
  },
  {
    id: "jinbe",
    name: "Jinbe",
    answers: ["jinbe", "jinbei", "jimbei", "jimbe"],
    difficulty: 1,
    clues: [
      { emoji: "🌊🥋🫧" },
      { emoji: "🦈👘🥋" },
      { emoji: "🌊👊🥋", text: "Homme-poisson maître du karaté des hommes-poissons" },
      { emoji: "🦈🚢🧭", text: "L'ancien Grand Corsaire devenu timonier de l'équipage" }
    ],
    trivia: "Le « Chevalier des Mers », dernier membre à rejoindre l'équipage."
  },
  {
    id: "ace",
    name: "Portgas D. Ace",
    answers: ["ace", "portgas d ace", "portgas ace", "ace aux poings ardents"],
    difficulty: 1,
    clues: [
      { emoji: "😴🍳🎩" },
      { emoji: "🔥🔥🔥" },
      { emoji: "🔥🎩🧡", text: "Poings ardents et tatouage ASCE dans le dos" },
      { emoji: "🔥👒👦", text: "Le frère aîné de Luffy, commandant de la 2e flotte de Barbe Blanche" }
    ],
    trivia: "Fils de Gol D. Roger, mort à Marine Ford pour protéger son frère."
  },
  {
    id: "shanks",
    name: "Shanks le Roux",
    answers: ["shanks", "le roux", "shanks le roux", "shank"],
    difficulty: 1,
    clues: [
      { emoji: "🍶🦜😄" },
      { emoji: "🟥🦰🩸" },
      { emoji: "👒🎁🌊", text: "A offert son chapeau de paille à un enfant" },
      { emoji: "🦰🗡️🏴‍☠️", text: "L'Empereur roux qui a perdu un bras pour sauver un gamin" }
    ],
    trivia: "Ancien mousse de Gol D. Roger, il a déclenché le rêve de Luffy."
  }
];
