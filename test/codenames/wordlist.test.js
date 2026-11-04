'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { parseLexique, parseExclusions, buildWordList } = require('../../scripts/build-wordlist');
const { loadWordPacks } = require('../../server/codenames/words');

const rows = parseLexique(fs.readFileSync(path.join(__dirname, '..', 'fixtures', 'lexique-extrait.tsv'), 'utf8'));
const exclusionSet = parseExclusions('# commentaire\nmerde\n');

test('filtres Lexique : noms communs courants, forme de base, 3-12 lettres', () => {
  const { words } = buildWordList(rows, { exclusionSet, minFreq: 3, minNounShare: 0.5 });
  assert.deepEqual(words, ['boulanger', 'chat', 'livre', 'lune']);
});

test('détail des exclusions', () => {
  const { words } = buildWordList(rows, { exclusionSet });
  const absent = {
    chats: 'pluriel',
    chatte: 'forme fléchie',
    'été': 'majoritairement verbe',
    'pomme-de-terre': 'trait d\'union',
    Paris: 'nom propre',
    merde: 'liste d\'exclusion',
    ox: 'trop court',
    abscisse: 'trop rare',
    'boulangère': 'féminin dérivé',
    anticonstitutionnel: 'trop long',
    gens: 'pluriel seulement',
    marche: 'surtout verbe'
  };
  for (const [word, reason] of Object.entries(absent)) assert.ok(!words.includes(word), `${word} devrait être exclu (${reason})`);
  assert.equal(words.filter((w) => w === 'livre').length, 1, 'pas de doublon');
});

test('limite du nombre de mots : on garde les plus fréquents', () => {
  const { words } = buildWordList(rows, { exclusionSet, max: 2 });
  assert.deepEqual(words, ['livre', 'lune']); // livre 250, lune 55, chat 50
});

test('TSV qui n\'est pas Lexique : erreur claire', () => {
  assert.throws(() => parseLexique('a\tb\n1\t2\n'), /Colonne/);
});

test('le paquet versionné est valide et exploitable', () => {
  const packs = loadWordPacks();
  const pack = packs.get('classique');
  assert.ok(pack.words.length >= 500);
  const exclusions = parseExclusions(fs.readFileSync(path.join(__dirname, '..', '..', 'data', 'codenames', 'exclusions.txt'), 'utf8'));
  for (const w of pack.words) {
    assert.match(w, /^[a-zàâäçéèêëîïôöùûüÿœæ]{3,12}$/, w);
    assert.ok(!exclusions.has(w), `${w} est exclu`);
  }
  assert.equal(new Set(pack.words).size, pack.words.length);
});
