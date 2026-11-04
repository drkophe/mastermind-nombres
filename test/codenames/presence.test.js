'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../../server/codenames/rooms');
const { MatchController } = require('../../server/codenames/match');
const { FakeScheduler, seededRng } = require('./helpers');

function wire(mode, extraSettings = {}) {
  const scheduler = new FakeScheduler();
  const rng = seededRng(13);
  const ref = {};
  const manager = new RoomManager({
    scheduler,
    rng,
    onMemberDisconnected: (room, m) => ref.match.onMemberDisconnected(room, m),
    onMemberReconnected: (room, m) => ref.match.onMemberReconnected(room, m),
    onMemberRemoved: (room, m) => ref.match.onMemberRemoved(room, m)
  });
  const words = Array.from({ length: 100 }, (_, i) => `w${i}k`);
  const match = new MatchController({ manager, packs: new Map([['classique', { words }]]), rng });
  ref.match = match;
  const room = manager.createRoom({ playerId: 'p1', name: 'P1' }, { settings: { mode, ...extraSettings } });
  return { scheduler, manager, match, room };
}

function classicRoom(settings) {
  const ctx = wire('classique', { classic: { startingTeam: 'rouge', ...settings } });
  const { manager, room } = ctx;
  ['p2', 'p3', 'p4', 'p5'].forEach((id) => manager.join(room.id, { playerId: id, name: id.toUpperCase() }));
  manager.assign(room.id, 'p1', 'p1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p2', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'p1', 'p5', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'p1', 'p3', { team: 'bleu', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p4', { team: 'bleu', role: 'agent' });
  ctx.match.start(room.id, 'p1');
  return ctx;
}

test('reconnexion en cours de partie : le joueur retrouve son rôle et son équipe', () => {
  const { manager, room, scheduler } = classicRoom();
  manager.disconnect('p4');
  scheduler.advance(5 * 60_000);
  assert.ok(room.members.has('p4'), 'un joueur déconnecté en partie garde sa place');
  const { member, rejoined } = manager.join(room.id, { playerId: 'p4', name: 'P4' });
  assert.equal(rejoined, true);
  assert.equal(member.team, 'bleu');
  assert.equal(member.role, 'agent');
});

test('capitaine absent pendant sa phase : pause du timer, puis promotion automatique d\'un agent', () => {
  const { manager, match, room, scheduler } = classicRoom({ timerEnabled: true, clueSeconds: 30 });
  manager.disconnect('p1');
  assert.equal(room.paused, true);
  assert.equal(match.timer.view(room).paused, true);
  scheduler.advance(30_000);
  assert.equal(room.game.currentTeam, 'rouge', 'le timer ne tourne pas pendant la pause');
  scheduler.advance(31_000);
  assert.equal(room.notice.type, 'capitaine-absent');
  scheduler.advance(60_000);
  assert.equal(room.members.get('p2').role, 'capitaine', 'l\'agent arrivé le premier est promu');
  assert.equal(room.members.get('p1').role, 'agent');
  assert.equal(room.paused, false);
  assert.equal(room.notice, null);
  assert.equal(room.game.history.at(-1).type, 'promotion');
  // Le capitaine historique revient : il est désormais agent
  manager.join(room.id, { playerId: 'p1', name: 'P1' });
  assert.equal(room.members.get('p1').role, 'agent');
});

test('l\'hôte peut nommer un capitaine de remplacement', () => {
  const { manager, match, room } = classicRoom();
  assert.throws(() => match.hostPromote(room.id, 'p1', 'p4'), /présent/);
  manager.disconnect('p3');
  assert.throws(() => match.hostPromote(room.id, 'p2', 'p4'), /hôte/);
  match.hostPromote(room.id, 'p1', 'p4');
  assert.equal(room.members.get('p4').role, 'capitaine');
});

test('capitaine qui revient à temps : rien ne change', () => {
  const { manager, room, scheduler } = classicRoom();
  manager.disconnect('p1');
  scheduler.advance(40_000);
  manager.join(room.id, { playerId: 'p1', name: 'P1' });
  scheduler.advance(5 * 60_000);
  assert.equal(room.members.get('p1').role, 'capitaine');
  assert.equal(room.paused, false);
});

test('pas de pause si le capitaine absent n\'a pas à jouer', () => {
  const { manager, room } = classicRoom();
  manager.disconnect('p3'); // capitaine bleu, c'est le tour des rouges
  assert.equal(room.paused, false);
});

test('capitaine qui quitte la partie : remplacé immédiatement', () => {
  const { manager, room } = classicRoom();
  manager.leave(room.id, 'p3');
  assert.equal(room.members.get('p4').role, 'capitaine');
});

test('Duo : partie en pause si un joueur se déconnecte, reprise à son retour', () => {
  const { manager, match, room, scheduler } = wire('duo', { duo: { timerEnabled: true, turnSeconds: 60 } });
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  match.start(room.id, 'p1');
  scheduler.advance(10_000);
  manager.disconnect('p2');
  assert.equal(room.paused, true);
  assert.equal(room.notice.type, 'pause');
  const giver = room.game.giver === 'A' ? 'p1' : 'p2';
  assert.throws(() => match.clue(room.id, giver, 'indice', 1), /pause/);
  scheduler.advance(10 * 60_000);
  assert.equal(room.game.tokensLeft, 9, 'le timer est figé');
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  assert.equal(room.paused, false);
  assert.equal(match.timer.view(room).remainingMs, 50_000);
});

test('Duo : un joueur qui quitte met fin à la partie', () => {
  const { manager, match, room } = wire('duo');
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  match.start(room.id, 'p1');
  manager.leave(room.id, 'p2');
  assert.equal(room.status, 'terminee');
  assert.equal(room.game.endReason, 'abandon');
});

test('salon abandonné en pleine partie : supprimé quand plus personne n\'est connecté', () => {
  const { manager, room, scheduler } = classicRoom();
  ['p1', 'p2', 'p3', 'p4', 'p5'].forEach((id) => manager.disconnect(id));
  scheduler.advance(2 * 60_000 + 1);
  assert.equal(manager.getRoom(room.id), null);
});
