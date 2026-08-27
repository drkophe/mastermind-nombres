// ============================================================================
// DONNÉES — 4 IMAGES 1 MOT : ÉDITION ONE PIECE
// ----------------------------------------------------------------------------
// Le catalogue est découpé par niveau de difficulté dans data/characters/ :
//   niveau1.js  → personnages incontournables (les 5 premiers mots d'une
//                 partie "progressive" sont toujours tirés dans ce groupe)
//   niveau2.js  → très connus de tous les lecteurs
//   niveau3.js  → connus des lecteurs réguliers
//   niveau4.js  → personnages secondaires
//   niveau5.js  → pour les fans hardcore
//
// Pour ajouter un personnage : ouvrir le fichier du niveau voulu et copier
// le format ci-dessous. Rien d'autre à modifier.
//
// {
//   id:         identifiant unique (string, sans espace)
//   name:       nom affiché à la révélation
//   answers:    [string] toutes les réponses acceptées. La comparaison ignore
//               la casse, les accents, les espaces et la ponctuation, et
//               tolère les petites fautes de frappe (voir server.js).
//   difficulty: 1 (très connu) → 5 (obscur) — doit correspondre au fichier
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

const niveaux = [
  require('./characters/niveau1'),
  require('./characters/niveau2'),
  require('./characters/niveau3'),
  require('./characters/niveau4'),
  require('./characters/niveau5')
];

const onePieceCharacters = [];
const seenIds = new Set();

niveaux.forEach((liste, index) => {
  const expectedDifficulty = index + 1;

  liste.forEach(character => {
    // Garde-fous : une coquille dans les données ne doit pas casser une partie
    if (seenIds.has(character.id)) {
      console.warn(`[4Images] Personnage ignoré : id en double "${character.id}"`);
      return;
    }
    if (!Array.isArray(character.clues) || character.clues.length !== 4) {
      console.warn(`[4Images] Personnage ignoré : "${character.id}" n'a pas 4 indices`);
      return;
    }
    if (!Array.isArray(character.answers) || character.answers.length === 0) {
      console.warn(`[4Images] Personnage ignoré : "${character.id}" n'a aucune réponse`);
      return;
    }

    seenIds.add(character.id);
    onePieceCharacters.push({ ...character, difficulty: expectedDifficulty });
  });
});

// Libellés des niveaux, réutilisés côté client
const DIFFICULTY_LABELS = {
  1: 'Très facile',
  2: 'Facile',
  3: 'Moyen',
  4: 'Difficile',
  5: 'Expert'
};

module.exports = { onePieceCharacters, DIFFICULTY_LABELS };
