'use strict';

/*
 * Projection des vues Duo (module ES du client, chargé via import()).
 * Vérifie les états validé / erreur / retirée / commune et l'absence de fuite de clé.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { pathToFileURL } = require('url');

let P;
test.before(async () => {
  P = await import(pathToFileURL(path.join(__dirname, '..', '..', 'public', 'codenames', 'duo-projection.mjs')).href);
});

// Faces : carte 0 = agent A seulement, 1 = agent B seulement, 2 = agent commun,
// 3 = passant A / agent B, 4 = agent A / passant B, 5 = assassin A, reste neutre.
const words = Array.from({ length: 25 }, (_, i) => `m${i}`);
const faceA = words.map((_, i) => ({ 0: 'agent', 2: 'agent', 4: 'agent', 5: 'assassin' }[i] || 'neutre'));
const faceB = words.map((_, i) => ({ 1: 'agent', 2: 'agent', 3: 'agent' }[i] || 'neutre'));
const names = { A: 'Lorenzo', B: 'Steph' };

const R = (index, guesser, giver, result) => ({ index, guesser, giver, result, turn: 1, clue: { word: 'x', count: '2' }, suddenDeath: false });

function project(viewer, view, reveals, extra = {}) {
  return P.projectDuoBoard({ viewer, view, words, myFace: viewer === 'A' ? faceA : viewer === 'B' ? faceB : null, reveals, names, ...extra });
}

test('Ma clé : couleurs de ma face pour les cartes non révélées', () => {
  const cards = project('A', 'cle', []);
  assert.equal(cards[0].kind, 'key');
  assert.equal(cards[0].keyColor, 'agent');
  assert.equal(cards[5].keyColor, 'assassin');
  assert.equal(cards[1].keyColor, 'neutre', 'l’agent de B est un passant sur ma face');
});

test('Ma clé : agent trouvé par l’autre sur mon indice = validé dans ma couleur', () => {
  const cards = project('A', 'cle', [R(0, 'B', 'A', 'agent')]);
  assert.equal(cards[0].kind, 'validated');
  assert.equal(cards[0].owner, 'A');
});

test('Ma clé : erreur de l’autre sur mon indice = état « erreur », distinct de validé', () => {
  const cards = project('A', 'cle', [R(3, 'B', 'A', 'passant')]);
  assert.equal(cards[3].kind, 'error');
  assert.deepEqual(cards[3].passantFor, ['A']);
});

test('Ma clé : agent de l’autre trouvé par moi = retirée (pas validée)', () => {
  const cards = project('A', 'cle', [R(1, 'A', 'B', 'agent')]);
  assert.equal(cards[1].kind, 'retired');
  assert.match(cards[1].label, /retirée du jeu/);
});

test('Ma clé : mon erreur en devinant laisse la carte en jeu avec une marque', () => {
  // Carte 4 : passant pour B, mais agent de MA face : B devra encore la trouver.
  const cards = project('A', 'cle', [R(4, 'A', 'B', 'passant')]);
  assert.equal(cards[4].kind, 'key');
  assert.equal(cards[4].keyColor, 'agent');
  assert.deepEqual(cards[4].passantFor, ['B']);
});

test('Plateau : aucune donnée de clé pour les cartes non révélées', () => {
  const cards = project('A', 'plateau', [R(0, 'B', 'A', 'agent')]);
  for (const c of cards) {
    assert.equal(c.keyColor, undefined, `couleur de clé exposée sur ${c.word}`);
    assert.ok(!/assassin|votre face/.test(c.label), `label révélateur : ${c.label}`);
  }
  const serialized = JSON.stringify(cards);
  assert.ok(!serialized.includes('"agent"') && !serialized.includes('"assassin"'), 'aucune valeur de clé dans la projection');
});

test('Plateau : agent trouvé par moi = plein de la couleur de l’autre ; trouvé par l’autre = retirée', () => {
  const cards = project('A', 'plateau', [R(1, 'A', 'B', 'agent'), R(0, 'B', 'A', 'agent')]);
  assert.equal(cards[1].kind, 'validated');
  assert.equal(cards[1].owner, 'B');
  assert.equal(cards[0].kind, 'retired');
  assert.equal(cards[0].selectable, undefined);
});

test('Plateau : mon erreur = beige ; l’erreur de l’autre sur mon indice reste proposable', () => {
  const canSelect = () => true;
  const cards = project('A', 'plateau', [R(4, 'A', 'B', 'passant'), R(3, 'B', 'A', 'passant')], { canSelect });
  assert.equal(cards[4].kind, 'error');
  assert.equal(cards[3].kind, 'hidden', 'la carte 3 est peut-être un agent de B : elle reste en jeu');
  assert.equal(cards[3].selectable, true);
  assert.deepEqual(cards[3].passantFor, ['A']);
});

test('Carte commune : double couleur seulement pour celui qui l’a révélée et l’a sur sa face', () => {
  const reveals = [R(2, 'A', 'B', 'agent')]; // A trouve l'agent commun sur l'indice de B
  assert.equal(project('A', 'plateau', reveals)[2].kind, 'common');
  assert.equal(project('A', 'cle', reveals)[2].kind, 'common');
  // Pour B (qui donnait l'indice), simplement validée dans sa couleur
  const forB = project('B', 'cle', reveals)[2];
  assert.equal(forB.kind, 'validated');
  assert.equal(forB.owner, 'B');
  assert.ok(!/commun/.test(forB.label));
  assert.notEqual(project('B', 'plateau', reveals)[2].kind, 'common');
});

test('Carte trouvée par A et qui n’est pas sur sa face : pas commune', () => {
  const cards = project('A', 'plateau', [R(1, 'A', 'B', 'agent')]);
  assert.equal(cards[1].kind, 'validated');
});

test('Spectateur : jamais de clé, agents trouvés dans la couleur du donneur', () => {
  const cards = P.projectDuoBoard({ viewer: null, view: 'cle', words, myFace: faceA, reveals: [R(0, 'B', 'A', 'agent'), R(3, 'B', 'A', 'passant')], names });
  assert.equal(cards[0].kind, 'validated');
  assert.equal(cards[0].owner, 'A');
  assert.equal(cards[3].kind, 'error');
  assert.ok(cards.every((c) => c.keyColor === undefined), 'aucune face pour un spectateur');
});

test('Fin de partie : les deux faces sont projetées', () => {
  const cards = P.projectDuoBoard({ viewer: 'A', view: 'plateau', words, myFace: faceA, reveals: [R(5, 'B', 'A', 'assassin')], ended: true, keys: { A: faceA, B: faceB }, assassinIndex: 5, names });
  assert.equal(cards[2].kind, 'end');
  assert.equal(cards[2].faceA, 'agent');
  assert.equal(cards[2].faceB, 'agent');
  assert.equal(cards[5].assassinHit, true);
});

test('Légendes : une par vue, avec les symboles utilisés', () => {
  assert.deepEqual(P.legendFor('cle', 'A').map((x) => x[0]), ['A', 'passant', 'assassin', 'check', 'retired']);
  assert.ok(!P.legendFor('plateau', 'A').some((x) => x[0] === 'assassin'), 'pas d’assassin dans la légende du plateau');
});
