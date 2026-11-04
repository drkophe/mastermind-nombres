'use strict';

const { shuffle, defaultRng, normalizeWord } = require('./util');
const { CodenamesError } = require('./errors');

const BOARD_SIZE = 25;

/** Classique : 9 cartes pour l'équipe qui commence, 8 pour l'autre, 7 neutres, 1 assassin. */
function generateClassicKey(startingTeam, rng = defaultRng) {
  const other = startingTeam === 'rouge' ? 'bleu' : 'rouge';
  const cards = [
    ...Array(9).fill(startingTeam),
    ...Array(8).fill(other),
    ...Array(7).fill('neutre'),
    'assassin'
  ];
  return shuffle(cards, rng);
}

/**
 * Duo : répartition des clés officielles (vue A / vue B), 25 cartes.
 * Chaque face : 9 agents, 3 assassins, 13 passants ; 3 agents communs ;
 * 15 agents distincts au total.
 */
const DUO_DISTRIBUTION = [
  ['agent', 'agent', 3],
  ['agent', 'neutre', 5],
  ['neutre', 'agent', 5],
  ['agent', 'assassin', 1],
  ['assassin', 'agent', 1],
  ['assassin', 'assassin', 1],
  ['assassin', 'neutre', 1],
  ['neutre', 'assassin', 1],
  ['neutre', 'neutre', 7]
];

function generateDuoKeys(rng = defaultRng) {
  const pairs = [];
  for (const [a, b, n] of DUO_DISTRIBUTION) {
    for (let i = 0; i < n; i++) pairs.push([a, b]);
  }
  const shuffled = shuffle(pairs, rng);
  return { A: shuffled.map((p) => p[0]), B: shuffled.map((p) => p[1]) };
}

function countDuoAgents(keys) {
  let n = 0;
  for (let i = 0; i < keys.A.length; i++) if (keys.A[i] === 'agent' || keys.B[i] === 'agent') n++;
  return n;
}

/** Forme sans marque de pluriel (s, x, aux → al), sans accents. */
function pluralStem(word) {
  const w = normalizeWord(word);
  if (w.length > 4 && w.endsWith('aux')) return `${w.slice(0, -3)}al`;
  if (w.length > 3) return w.replace(/(s|x)$/, '');
  return w;
}

/** Deux mots trop proches pour un même plateau (chat / chaton, cheval / chevaux…). */
function tooClose(a, b) {
  const sa = pluralStem(a);
  const sb = pluralStem(b);
  if (sa === sb) return true;
  const [short, long] = sa.length <= sb.length ? [sa, sb] : [sb, sa];
  if (short.length >= 4 && long.startsWith(short)) return true;
  let prefix = 0;
  while (prefix < short.length && short[prefix] === long[prefix]) prefix++;
  return prefix >= 6;
}

/**
 * Tire 25 mots sans doublon, en évitant les mots déjà joués dans la session
 * (usedWords) et les paires trop proches. Si le paquet est épuisé, l'historique
 * est oublié pour pouvoir continuer.
 */
function drawWords(pool, usedWords = new Set(), rng = defaultRng, count = BOARD_SIZE) {
  const unique = [...new Set(pool)];
  if (unique.length < count) throw new CodenamesError('Le paquet de mots est trop petit.');
  let candidates = unique.filter((w) => !usedWords.has(w));
  if (candidates.length < count * 2) {
    usedWords.clear();
    candidates = unique;
  }
  const chosen = [];
  const skipped = [];
  for (const word of shuffle(candidates, rng)) {
    if (chosen.length === count) break;
    if (chosen.some((c) => tooClose(c, word))) skipped.push(word);
    else chosen.push(word);
  }
  // Paquet trop homogène : on complète sans la contrainte de proximité.
  while (chosen.length < count) chosen.push(skipped.shift());
  chosen.forEach((w) => usedWords.add(w));
  return chosen;
}

module.exports = {
  BOARD_SIZE,
  DUO_DISTRIBUTION,
  generateClassicKey,
  generateDuoKeys,
  countDuoAgents,
  drawWords,
  tooClose
};
