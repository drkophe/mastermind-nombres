'use strict';

const { normalizeWord, cleanText } = require('./util');
const { CodenamesError } = require('./errors');

const UNLIMITED = 'illimite';
const MAX_COUNT = 9;
const WORD_PATTERN = /^\p{L}+(?:['’-]\p{L}+)*$/u;

/** Forme « singulier approximatif » pour attraper chat/chats, bijou/bijoux. */
function singularForm(normalized) {
  if (normalized.length > 3 && /[sx]$/.test(normalized)) return normalized.slice(0, -1);
  return normalized;
}

function sameWord(a, b) {
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  return na === nb || singularForm(na) === singularForm(nb);
}

/**
 * Valide un indice côté serveur.
 * - un seul mot (lettres, avec éventuellement trait d'union ou apostrophe internes) ;
 * - interdit s'il correspond à un mot visible non couvert du plateau
 *   (insensible à la casse, aux accents et au pluriel simple) ;
 * - nombre entier entre 0 et 9, ou « illimité ».
 * covered[i] vaut true si la carte i est couverte (révélée) et ne bloque plus l'indice.
 */
function validateClue(rawWord, rawCount, words, covered) {
  const word = cleanText(rawWord, 40);
  if (!word) throw new CodenamesError('L\'indice ne peut pas être vide.');
  if (/\s/.test(word)) throw new CodenamesError('L\'indice doit être un seul mot.');
  if (!WORD_PATTERN.test(word)) {
    throw new CodenamesError('L\'indice ne doit contenir que des lettres (trait d\'union ou apostrophe autorisés).');
  }
  if (word.length < 2 || word.length > 30) throw new CodenamesError('L\'indice doit faire entre 2 et 30 lettres.');

  words.forEach((boardWord, i) => {
    if (!covered[i] && sameWord(word, boardWord)) {
      throw new CodenamesError(`« ${word} » est un mot visible du plateau : indice interdit.`);
    }
  });

  let count;
  let unlimited = false;
  if (rawCount === UNLIMITED || rawCount === '∞') {
    unlimited = true;
    count = null;
  } else {
    const n = typeof rawCount === 'number' ? rawCount : Number(String(rawCount).trim());
    if (!Number.isInteger(n) || n < 0 || n > MAX_COUNT) {
      throw new CodenamesError(`Le nombre doit être entre 0 et ${MAX_COUNT}, ou « illimité ».`);
    }
    count = n;
  }
  return { word, count, unlimited };
}

/**
 * Essais autorisés (règle officielle Classique) : nombre + 1.
 * 0 ou « illimité » : pas de limite (au moins une proposition reste obligatoire).
 */
function maxGuessesFor(clue) {
  if (clue.unlimited || clue.count === 0) return null;
  return clue.count + 1;
}

function displayCount(clue) {
  return clue.unlimited ? '∞' : String(clue.count);
}

module.exports = { validateClue, maxGuessesFor, displayCount, sameWord, UNLIMITED, MAX_COUNT };
