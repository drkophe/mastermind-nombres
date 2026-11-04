'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../../server/codenames/rooms');
const { MatchController } = require('../../server/codenames/match');
const { buildRoomView } = require('../../server/codenames/views');
const { FakeScheduler, seededRng } = require('./helpers');

function packs() {
  const words = Array.from({ length: 300 }, (_, i) => `w${i}q${String.fromCharCode(97 + (i % 26))}`);
  return new Map([['classique', { id: 'classique', label: 'Test', words }]]);
}

function setupClassic(settings = {}) {
  const scheduler = new FakeScheduler();
  const rng = seededRng(11);
  const manager = new RoomManager({ scheduler, rng });
  const match = new MatchController({ manager, packs: packs(), rng, scheduler });
  const room = manager.createRoom({ playerId: 'p1', name: 'Alice' }, { settings });
  ['p2', 'p3', 'p4'].forEach((id, i) => manager.join(room.id, { playerId: id, name: `J${i + 2}` }));
  manager.assign(room.id, 'p1', 'p1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p2', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'p1', 'p3', { team: 'bleu', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p4', { team: 'bleu', role: 'agent' });
  manager.join(room.id, { playerId: 'spec', name: 'Spectateur' }, { asSpectator: true });
  return { manager, match, room, scheduler };
}

const view = (match, room, id) => buildRoomView(room, id, { gameView: (r, m) => match.gameView(r, m) });

test('seul l\'hôte lance la partie', () => {
  const { match, room } = setupClassic();
  assert.throws(() => match.start(room.id, 'p2'), /hôte/);
  match.start(room.id, 'p1');
  assert.equal(room.status, 'en_cours');
  assert.equal(room.game.words.length, 25);
});

test('la carte-clé n\'est envoyée qu\'aux capitaines', () => {
  const { match, room } = setupClassic();
  match.start(room.id, 'p1');
  assert.equal(view(match, room, 'p1').game.key.length, 25);
  assert.equal(view(match, room, 'p3').game.key.length, 25);
  for (const id of ['p2', 'p4', 'spec', 'inconnu']) {
    const v = view(match, room, id);
    assert.equal(v.game.key, null, `fuite de la clé vers ${id}`);
    assert.ok(v.game.revealed.every((c) => c === null));
    // Aucune couleur ne doit apparaître dans la vue sérialisée d'un agent
    const json = JSON.stringify(v.game);
    assert.ok(!/assassin/.test(json), `assassin visible pour ${id}`);
  }
});

test('les couleurs révélées sont visibles par tous, la clé complète en fin de manche', () => {
  const { match, room } = setupClassic({ classic: { startingTeam: 'rouge' } });
  match.start(room.id, 'p1');
  const g = room.game;
  match.clue(room.id, 'p1', 'indice', 1);
  const target = g.key.indexOf('neutre');
  match.guess(room.id, 'p2', target);
  assert.equal(view(match, room, 'spec').game.revealed[target], 'neutre');
  assert.equal(view(match, room, 'spec').game.key, null);

  const assassin = g.key.indexOf('assassin');
  match.clue(room.id, 'p3', 'autre', 1);
  match.guess(room.id, 'p4', assassin);
  assert.equal(room.status, 'terminee');
  assert.equal(room.match.score.rouge, 1);
  assert.equal(view(match, room, 'spec').game.key.length, 25);
});

test('un agent ne peut pas donner d\'indice, un spectateur ne peut pas jouer', () => {
  const { match, room } = setupClassic({ classic: { startingTeam: 'rouge' } });
  match.start(room.id, 'p1');
  assert.throws(() => match.clue(room.id, 'p2', 'indice', 1), /capitaine/);
  match.clue(room.id, 'p1', 'indice', 1);
  assert.throws(() => match.guess(room.id, 'spec', 0), /spectateurs/);
  assert.throws(() => match.guess(room.id, 'p4', 0), /pas le tour/);
});

test('plusieurs manches : score cumulé, rotation des capitaines, mots non réutilisés', () => {
  const { match, room } = setupClassic({ classic: { rounds: 2, captainMode: 'rotation-tour', startingTeam: 'alternee' } });
  match.start(room.id, 'p1');
  const firstWords = room.game.words.slice();
  const firstStart = room.game.startingTeam;
  const cap = room.game.currentTeam === 'rouge' ? 'p1' : 'p3';
  const agent = cap === 'p1' ? 'p2' : 'p4';
  match.clue(room.id, cap, 'indice', 1);
  match.guess(room.id, agent, room.game.key.indexOf('assassin'));
  assert.equal(room.match.over, false);

  match.next(room.id, 'p1');
  assert.equal(room.match.round, 2);
  assert.equal(room.game.startingTeam === firstStart, false, 'équipe de départ alternée');
  assert.equal(room.members.get('p2').role, 'capitaine');
  assert.equal(room.members.get('p4').role, 'capitaine');
  assert.equal(room.game.words.filter((w) => firstWords.includes(w)).length, 0);

  const cap2 = room.game.currentTeam === 'rouge' ? 'p2' : 'p4';
  const agent2 = cap2 === 'p2' ? 'p1' : 'p3';
  match.clue(room.id, cap2, 'indice', 1);
  match.guess(room.id, agent2, room.game.key.indexOf('assassin'));
  assert.equal(room.match.over, true);
  assert.equal(room.match.score.rouge + room.match.score.bleu, 2);

  match.next(room.id, 'p1');
  assert.equal(room.match.round, 1, 'nouvelle partie après la dernière manche');
});

test('retour au lobby par l\'hôte', () => {
  const { match, room } = setupClassic();
  match.start(room.id, 'p1');
  match.toLobby(room.id, 'p1');
  assert.equal(room.status, 'attente');
  assert.equal(room.game, null);
});
