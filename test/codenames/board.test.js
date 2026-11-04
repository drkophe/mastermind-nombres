'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { generateClassicKey, generateDuoKeys, countDuoAgents, drawWords, tooClose } = require('../../server/codenames/board');
const { seededRng } = require('./helpers');

const count = (arr, v) => arr.filter((x) => x === v).length;

test('clé Classique : 9 / 8 / 7 neutres / 1 assassin', () => {
  for (let seed = 1; seed <= 50; seed++) {
    const key = generateClassicKey('bleu', seededRng(seed));
    assert.equal(key.length, 25);
    assert.equal(count(key, 'bleu'), 9);
    assert.equal(count(key, 'rouge'), 8);
    assert.equal(count(key, 'neutre'), 7);
    assert.equal(count(key, 'assassin'), 1);
  }
});

test('clés Duo : répartition officielle sur chaque face', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const keys = generateDuoKeys(seededRng(seed));
    for (const side of ['A', 'B']) {
      assert.equal(keys[side].length, 25);
      assert.equal(count(keys[side], 'agent'), 9);
      assert.equal(count(keys[side], 'assassin'), 3);
      assert.equal(count(keys[side], 'neutre'), 13);
    }
    let common = 0;
    let assassinBoth = 0;
    let assassinVsAgent = 0;
    for (let i = 0; i < 25; i++) {
      if (keys.A[i] === 'agent' && keys.B[i] === 'agent') common++;
      if (keys.A[i] === 'assassin' && keys.B[i] === 'assassin') assassinBoth++;
      if ((keys.A[i] === 'assassin' && keys.B[i] === 'agent') || (keys.A[i] === 'agent' && keys.B[i] === 'assassin')) assassinVsAgent++;
    }
    assert.equal(common, 3);
    assert.equal(assassinBoth, 1);
    assert.equal(assassinVsAgent, 2);
    assert.equal(countDuoAgents(keys), 15);
  }
});

test('tirage : 25 mots distincts, pas de réutilisation dans la session', () => {
  const pool = Array.from({ length: 200 }, (_, i) => `mot${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26))}`);
  const used = new Set();
  const rng = seededRng(7);
  const first = drawWords(pool, used, rng);
  const second = drawWords(pool, used, rng);
  assert.equal(new Set(first).size, 25);
  assert.equal(first.filter((w) => second.includes(w)).length, 0);
});

test('tirage : historique oublié quand le paquet est épuisé', () => {
  const pool = Array.from({ length: 60 }, (_, i) => `x${i}y`);
  const used = new Set();
  const rng = seededRng(3);
  for (let i = 0; i < 5; i++) assert.equal(new Set(drawWords(pool, used, rng)).size, 25);
});

test('paires trop proches détectées', () => {
  assert.ok(tooClose('chat', 'chaton'));
  assert.ok(tooClose('cheval', 'chevaux'));
  assert.ok(tooClose('chevalier', 'cheval'));
  assert.ok(tooClose('pomme', 'pommes'));
  assert.ok(!tooClose('carte', 'carton'));
  assert.ok(!tooClose('lion', 'lune'));
});

test('tirage : évite les paires trop proches quand c\'est possible', () => {
  const pool = ['chat', 'chaton', 'chats', ...Array.from({ length: 80 }, (_, i) => `z${i}q`)];
  for (let seed = 1; seed <= 30; seed++) {
    const words = drawWords(pool, new Set(), seededRng(seed));
    const cats = words.filter((w) => w.startsWith('chat'));
    assert.ok(cats.length <= 1, words.join(','));
  }
});
