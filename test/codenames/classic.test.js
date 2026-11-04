'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const classic = require('../../server/codenames/classic');

// Plateau déterministe : 0-8 rouge (commence), 9-16 bleu, 17-23 neutre, 24 assassin.
function makeGame() {
  const key = [...Array(9).fill('rouge'), ...Array(8).fill('bleu'), ...Array(7).fill('neutre'), 'assassin'];
  const words = key.map((_, i) => `mot${String.fromCharCode(97 + i)}`);
  return classic.createClassicGame({ words, key, startingTeam: 'rouge' });
}

const redCap = { team: 'rouge', role: 'capitaine' };
const redAgent = { team: 'rouge', role: 'agent' };
const blueCap = { team: 'bleu', role: 'capitaine' };
const blueAgent = { team: 'bleu', role: 'agent' };

test('seul le capitaine de l\'équipe en cours peut donner l\'indice', () => {
  const g = makeGame();
  assert.throws(() => classic.giveClue(g, redAgent, 'animal', 2), /capitaine/);
  assert.throws(() => classic.giveClue(g, blueCap, 'animal', 2), /pas le tour/);
  classic.giveClue(g, redCap, 'animal', 2);
  assert.equal(g.phase, 'devinette');
  assert.throws(() => classic.giveClue(g, redCap, 'autre', 1), /déjà été donné/);
});

test('les agents ne devinent pas avant l\'indice, ni hors de leur tour', () => {
  const g = makeGame();
  assert.throws(() => classic.guess(g, redAgent, 0), /Attendez/);
  classic.giveClue(g, redCap, 'animal', 2);
  assert.throws(() => classic.guess(g, blueAgent, 0), /pas le tour/);
  assert.throws(() => classic.guess(g, redCap, 0), /agents/);
  assert.throws(() => classic.guess(g, redAgent, 25), /invalide/);
});

test('carte de son équipe : on continue ; nombre + 1 essais au maximum', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 2);
  classic.guess(g, redAgent, 0);
  classic.guess(g, redAgent, 1);
  assert.equal(g.currentTeam, 'rouge');
  assert.throws(() => classic.guess(g, redAgent, 1), /déjà révélée/);
  classic.guess(g, redAgent, 2);
  assert.equal(g.currentTeam, 'bleu', 'le 3e essai (2 + 1) termine le tour');
  assert.equal(g.history.at(-1).reason, 'essais');
});

test('carte neutre : fin du tour', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 3);
  const r = classic.guess(g, redAgent, 17);
  assert.equal(r.color, 'neutre');
  assert.equal(r.turnEnded, true);
  assert.equal(g.currentTeam, 'bleu');
  assert.equal(g.phase, 'indice');
});

test('carte adverse : fin du tour et elle compte pour l\'adversaire', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 3);
  classic.guess(g, redAgent, 9);
  assert.equal(g.currentTeam, 'bleu');
  assert.equal(classic.remaining(g, 'bleu'), 7);
});

test('assassin : défaite immédiate de l\'équipe', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 3);
  classic.guess(g, redAgent, 24);
  assert.equal(g.phase, 'fin');
  assert.equal(g.winner, 'bleu');
  assert.equal(g.endReason, 'assassin');
  assert.throws(() => classic.guess(g, redAgent, 0), /terminée/);
});

test('victoire quand une équipe a révélé toutes ses cartes', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'tout', 'illimite');
  for (let i = 0; i < 9; i++) classic.guess(g, redAgent, i);
  assert.equal(g.winner, 'rouge');
  assert.equal(g.endReason, 'cartes');
});

test('révéler la dernière carte adverse fait gagner l\'adversaire', () => {
  const g = makeGame();
  g.revealed.fill(true, 9, 16); // bleu n'a plus que la carte 16
  classic.giveClue(g, redCap, 'animal', 1);
  classic.guess(g, redAgent, 16);
  assert.equal(g.winner, 'bleu');
});

test('passer : seulement après au moins une proposition', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 0);
  assert.throws(() => classic.pass(g, redAgent), /au moins une proposition/);
  classic.guess(g, redAgent, 0);
  classic.guess(g, redAgent, 1);
  classic.guess(g, redAgent, 2);
  assert.equal(g.currentTeam, 'rouge', 'indice 0 : essais illimités');
  classic.pass(g, redAgent);
  assert.equal(g.currentTeam, 'bleu');
});

test('enchaînement des tours et historique', () => {
  const g = makeGame();
  classic.giveClue(g, redCap, 'animal', 1);
  classic.guess(g, redAgent, 17);
  classic.giveClue(g, blueCap, 'océan', 2);
  classic.guess(g, blueAgent, 9);
  classic.pass(g, blueAgent);
  assert.equal(g.currentTeam, 'rouge');
  assert.equal(g.turnNumber, 3);
  assert.deepEqual(g.history.map((h) => h.type), ['indice', 'carte', 'fin-tour', 'indice', 'carte', 'fin-tour']);
});

test('expiration du timer : l\'équipe passe son tour quelle que soit la phase', () => {
  const g = makeGame();
  classic.timeout(g);
  assert.equal(g.currentTeam, 'bleu');
  assert.equal(g.history.at(-1).reason, 'temps-indice');
  classic.giveClue(g, blueCap, 'océan', 2);
  classic.timeout(g);
  assert.equal(g.currentTeam, 'rouge');
  assert.equal(g.history.at(-1).reason, 'temps-devinette');
});
