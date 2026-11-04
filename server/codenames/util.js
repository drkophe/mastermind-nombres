'use strict';

const crypto = require('crypto');

/** Générateur aléatoire par défaut : cryptographique, renvoie un réel dans [0, 1). */
function defaultRng() {
  return crypto.randomInt(0, 0x100000000) / 0x100000000;
}

/** Mélange de Fisher-Yates (copie). */
function shuffle(array, rng = defaultRng) {
  const copy = array.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pick(array, rng = defaultRng) {
  return array[Math.floor(rng() * array.length)];
}

/** Normalisation pour les comparaisons : minuscules, sans accents ni ligatures. */
function normalizeWord(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function randomId(bytes = 6) {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** Nettoie un texte libre saisi par un utilisateur (pseudo, nom de salon, message). */
function cleanText(value, maxLength) {
  if (typeof value !== 'string') return '';
  return value
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

module.exports = { defaultRng, shuffle, pick, normalizeWord, randomId, cleanText };
