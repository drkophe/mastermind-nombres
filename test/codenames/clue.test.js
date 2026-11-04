'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { validateClue, maxGuessesFor } = require('../../server/codenames/clue');

const words = ['château', 'chat', 'Pomme', 'œuf', ...Array(21).fill('mot')];
const covered = Array(25).fill(false);

test('indice valide : un mot et un nombre', () => {
  assert.deepEqual(validateClue('  Animal ', 2, words, covered), { word: 'Animal', count: 2, unlimited: false });
  assert.deepEqual(validateClue('arc-en-ciel', '0', words, covered), { word: 'arc-en-ciel', count: 0, unlimited: false });
  assert.deepEqual(validateClue("aujourd'hui", 1, words, covered).word, "aujourd'hui");
});

test('« illimité » accepté', () => {
  const clue = validateClue('ferme', 'illimite', words, covered);
  assert.equal(clue.unlimited, true);
  assert.equal(maxGuessesFor(clue), null);
});

test('plusieurs mots, chiffres ou ponctuation refusés', () => {
  assert.throws(() => validateClue('deux mots', 1, words, covered), /un seul mot/);
  assert.throws(() => validateClue('r2d2', 1, words, covered), /lettres/);
  assert.throws(() => validateClue('mot!', 1, words, covered), /lettres/);
  assert.throws(() => validateClue('', 1, words, covered), /vide/);
  assert.throws(() => validateClue('a', 1, words, covered), /entre 2 et 30/);
});

test('mot visible du plateau refusé, insensible à la casse, aux accents et au pluriel', () => {
  assert.throws(() => validateClue('CHATEAU', 1, words, covered), /plateau/);
  assert.throws(() => validateClue('pomme', 1, words, covered), /plateau/);
  assert.throws(() => validateClue('chats', 1, words, covered), /plateau/);
  assert.throws(() => validateClue('oeuf', 1, words, covered), /plateau/);
});

test('un mot du plateau déjà révélé redevient utilisable', () => {
  const c = covered.slice();
  c[1] = true;
  assert.equal(validateClue('chat', 1, words, c).word, 'chat');
});

test('nombre invalide refusé', () => {
  for (const bad of [-1, 10, 1.5, 'abc', null, undefined]) {
    assert.throws(() => validateClue('animal', bad, words, covered), /nombre/);
  }
});

test('essais autorisés : nombre + 1, illimité pour 0', () => {
  assert.equal(maxGuessesFor({ count: 2, unlimited: false }), 3);
  assert.equal(maxGuessesFor({ count: 0, unlimited: false }), null);
});
