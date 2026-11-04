'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../../server/codenames/rooms');
const { MatchController } = require('../../server/codenames/match');
const { FakeScheduler, seededRng } = require('./helpers');

function setup(classicSettings) {
  const scheduler = new FakeScheduler();
  const rng = seededRng(5);
  const manager = new RoomManager({ scheduler, rng });
  const words = Array.from({ length: 100 }, (_, i) => `m${i}t`);
  const match = new MatchController({ manager, packs: new Map([['classique', { words }]]), rng });
  const room = manager.createRoom({ playerId: 'p1', name: 'A' }, {
    settings: { classic: { startingTeam: 'rouge', timerEnabled: true, clueSeconds: 60, guessSeconds: 30, ...classicSettings } }
  });
  ['p2', 'p3', 'p4'].forEach((id) => manager.join(room.id, { playerId: id, name: id }));
  manager.assign(room.id, 'p1', 'p1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p2', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'p1', 'p3', { team: 'bleu', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p4', { team: 'bleu', role: 'agent' });
  match.start(room.id, 'p1');
  return { scheduler, match, room };
}

test('timer désactivé : aucun minuteur', () => {
  const { match, room, scheduler } = setup({ timerEnabled: false });
  assert.equal(match.timer.view(room), null);
  scheduler.advance(10 * 60_000);
  assert.equal(room.game.currentTeam, 'rouge');
});

test('expiration pendant l\'indice : l\'équipe passe son tour', () => {
  const { match, room, scheduler } = setup();
  assert.equal(match.timer.view(room).remainingMs, 60_000);
  scheduler.advance(59_000);
  assert.equal(room.game.currentTeam, 'rouge');
  assert.equal(match.timer.view(room).remainingMs, 1_000);
  scheduler.advance(1_000);
  assert.equal(room.game.currentTeam, 'bleu');
  assert.equal(room.game.history.at(-1).reason, 'temps-indice');
  assert.equal(match.timer.view(room).remainingMs, 60_000, 'nouveau timer pour l\'équipe suivante');
});

test('durée séparée pour la devinette, réarmée à chaque phase', () => {
  const { match, room, scheduler } = setup();
  scheduler.advance(20_000);
  match.clue(room.id, 'p1', 'indice', 2);
  assert.equal(match.timer.view(room).remainingMs, 30_000);
  const own = room.game.key.indexOf('rouge');
  match.guess(room.id, 'p2', own);
  assert.equal(match.timer.view(room).remainingMs, 30_000, 'une bonne réponse ne relance pas le timer');
  scheduler.advance(30_000);
  assert.equal(room.game.currentTeam, 'bleu');
  assert.equal(room.game.history.at(-1).reason, 'temps-devinette');
});

test('pause et reprise conservent le temps restant', () => {
  const { match, room, scheduler } = setup();
  scheduler.advance(15_000);
  match.timer.pause(room);
  scheduler.advance(10 * 60_000);
  assert.equal(room.game.currentTeam, 'rouge');
  assert.deepEqual(match.timer.view(room), { remainingMs: 45_000, durationMs: 60_000, paused: true });
  match.timer.resume(room);
  scheduler.advance(44_999);
  assert.equal(room.game.currentTeam, 'rouge');
  scheduler.advance(1);
  assert.equal(room.game.currentTeam, 'bleu');
});

test('fin de manche : le timer s\'arrête', () => {
  const { match, room, scheduler } = setup();
  match.clue(room.id, 'p1', 'indice', 1);
  match.guess(room.id, 'p2', room.game.key.indexOf('assassin'));
  assert.equal(match.timer.view(room), null);
  scheduler.advance(10 * 60_000);
  assert.equal(room.status, 'terminee');
});
