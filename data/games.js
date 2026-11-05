'use strict';

/**
 * Registre unique des jeux du site.
 * Ajouter un jeu = ajouter une entrée ici : la route Express et la carte
 * de l'accueil sont générées à partir de ce fichier.
 *
 * - facts(ctx) : infos courtes affichées en bas de carte, calculées à partir
 *   des vraies données (ctx est fourni par server.js) ;
 * - icon : formes SVG à trait fin (viewBox 32x32, stroke 1.5) ;
 * - live : clé utilisée par /api/live pour le nombre de joueurs connectés.
 */
const GAMES = [
  {
    id: 'mastermind',
    route: '/mastermind',
    file: 'mastermind.html',
    title: 'Mastermind Nombres',
    description: 'Devinez le nombre secret à 4 chiffres grâce aux indices de chaque tentative.',
    facts: (ctx) => ['4 chiffres', `${ctx.mastermindMaxAttempts} tentatives`],
    icon: [
      ['circle', { cx: 7, cy: 16, r: 3.5 }],
      ['circle', { cx: 14.5, cy: 16, r: 3.5 }],
      ['circle', { cx: 22, cy: 16, r: 3.5 }],
      ['circle', { cx: 29, cy: 16, r: 1.5 }]
    ]
  },
  {
    id: 'quiz',
    route: '/quiz',
    file: 'quiz.html',
    title: 'Quiz ERP & PPR',
    description: 'Testez vos connaissances sur les États des Risques et Pollutions et les Plans de Prévention.',
    facts: (ctx) => [`${ctx.quizQuestions} questions`, `${ctx.quizLevels} niveaux`],
    icon: [
      ['rect', { x: 6, y: 4, width: 20, height: 24, rx: 3 }],
      ['path', { d: 'M11 12h10M11 17h10M11 22h5' }]
    ]
  },
  {
    id: 'pendu',
    route: '/pendu',
    file: 'pendu.html',
    title: 'Le Pendu Coopératif',
    description: 'Trouvez le mot secret en équipe avant que le pendu soit complet.',
    facts: (ctx) => ['2 modes', `${ctx.penduCategories} catégories`],
    icon: [
      ['path', { d: 'M5 28h14M10 28V5h12v5' }],
      ['circle', { cx: 22, cy: 13, r: 3 }],
      ['path', { d: 'M22 16v7' }]
    ]
  },
  {
    id: 'quatre-images',
    route: '/quatre-images',
    file: 'quatre-images.html',
    title: '4 Images 1 Mot · One Piece',
    description: 'Identifiez le personnage caché : moins vous révélez d’indices, plus vous marquez.',
    facts: (ctx) => [`${ctx.onePieceCharacters} personnages`, '4 indices'],
    icon: [
      ['rect', { x: 4, y: 4, width: 10.5, height: 10.5, rx: 2 }],
      ['rect', { x: 17.5, y: 4, width: 10.5, height: 10.5, rx: 2 }],
      ['rect', { x: 4, y: 17.5, width: 10.5, height: 10.5, rx: 2 }],
      ['rect', { x: 17.5, y: 17.5, width: 10.5, height: 10.5, rx: 2 }]
    ]
  },
  {
    id: 'loup-garou',
    route: '/loup-garou',
    file: 'loup-garou.html',
    title: 'Loup-Garou',
    description: 'Loups contre Villageois : déduction sociale, ruse et stratégie, de nuit comme de jour.',
    facts: (ctx) => ['3 joueurs minimum', `${ctx.loupRoles} rôles`],
    icon: [
      ['path', { d: 'M24 20.5A11 11 0 0 1 11.5 8a11 11 0 1 0 12.5 12.5z' }]
    ]
  },
  {
    id: 'codenames',
    route: '/codenames',
    file: 'codenames.html',
    title: 'Codenames',
    description: 'Retrouvez vos agents grâce aux indices du capitaine, sans toucher l’assassin.',
    facts: () => ['Classique ou Duo', '25 mots'],
    icon: [
      ['circle', { cx: 14, cy: 14, r: 8.5 }],
      ['path', { d: 'M20.5 20.5L28 28' }]
    ]
  },
  {
    id: 'le10000',
    route: '/le10000',
    file: 'le10000.html',
    title: 'Le 10 000',
    description: 'Lancez les dés, mettez vos points à l’abri et soyez le premier à atteindre l’objectif.',
    facts: (ctx) => ['5 dés', `objectif ${ctx.le10000Target.toLocaleString('fr-FR')} points`],
    icon: [
      ['rect', { x: 5, y: 5, width: 22, height: 22, rx: 5 }],
      ['circle', { cx: 11, cy: 11, r: 1.2 }],
      ['circle', { cx: 21, cy: 11, r: 1.2 }],
      ['circle', { cx: 16, cy: 16, r: 1.2 }],
      ['circle', { cx: 11, cy: 21, r: 1.2 }],
      ['circle', { cx: 21, cy: 21, r: 1.2 }]
    ]
  }
];

module.exports = { GAMES };
