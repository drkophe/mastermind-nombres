'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../../server/codenames/rooms');
const { MatchController } = require('../../server/codenames/match');
const { buildRoomView } = require('../../server/codenames/views');
const { FakeScheduler, seededRng } = require('./helpers');

function setup(mode = 'classique', settings = {}) {
  const scheduler = new FakeScheduler();
  const rng = seededRng(17);
  const ref = {};
  const manager = new RoomManager({
    scheduler,
    rng,
    onMemberDisconnected: (r, m) => ref.match.onMemberDisconnected(r, m),
    onMemberReconnected: (r, m) => ref.match.onMemberReconnected(r, m),
    onMemberRemoved: (r, m) => ref.match.onMemberRemoved(r, m),
    onMemberJoined: (r, m) => ref.match.onMemberJoined(r, m)
  });
  const words = Array.from({ length: 100 }, (_, i) => `w${i}s`);
  const match = new MatchController({ manager, packs: new Map([['classique', { words }]]), rng });
  ref.match = match;
  const room = manager.createRoom({ playerId: 'p1', name: 'P1' }, { settings: { mode, ...settings } });
  return { scheduler, manager, match, room };
}

function classicGame(settings) {
  const ctx = setup('classique', { classic: { startingTeam: 'rouge' }, ...settings });
  const { manager, room } = ctx;
  ['p2', 'p3', 'p4'].forEach((id) => manager.join(room.id, { playerId: id, name: id.toUpperCase() }));
  manager.assign(room.id, 'p1', 'p1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p2', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'p1', 'p3', { team: 'bleu', role: 'capitaine' });
  manager.assign(room.id, 'p1', 'p4', { team: 'bleu', role: 'agent' });
  ctx.match.start(room.id, 'p1');
  return ctx;
}

// ---------- Rejoindre en cours de partie ----------

test('Classique : un nouveau venu rejoint la partie en cours comme agent', () => {
  const { manager, room } = classicGame();
  const { member } = manager.join(room.id, { playerId: 'p5', name: 'P5' });
  assert.equal(member.kind, 'joueur');
  assert.equal(member.role, 'agent');
  assert.ok(['rouge', 'bleu'].includes(member.team));
  assert.equal(manager.summary(room).canJoinAsPlayer, true);
});

test('le nouvel agent ne reçoit pas la clé', () => {
  const { manager, match, room } = classicGame();
  manager.join(room.id, { playerId: 'p5', name: 'P5' });
  const view = buildRoomView(room, 'p5', { gameView: (r, m) => match.gameView(r, m) });
  assert.equal(view.game.key, null);
});

test('« Regarder » reste possible ; un spectateur peut ensuite rejoindre une équipe', () => {
  const { manager, match, room } = classicGame();
  manager.join(room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  assert.equal(room.members.get('s').kind, 'spectateur');
  manager.joinTeamMidGame(room.id, 's', 'bleu');
  const s = room.members.get('s');
  assert.equal(s.kind, 'joueur');
  assert.equal(s.team, 'bleu');
  assert.equal(s.role, 'agent');
  // Il peut jouer au tour de son équipe
  match.clue(room.id, 'p1', 'indice', 1);
  match.guess(room.id, 'p2', room.game.key.indexOf('neutre'));
  match.clue(room.id, 'p3', 'autre', 1);
  match.guess(room.id, 's', room.game.key.indexOf('bleu'));
  assert.equal(room.game.revealed.filter(Boolean).length, 2);
});

test('rejoindre une équipe en cours : refusé si complet, en Duo, ou déjà joueur', () => {
  const { manager, room } = classicGame();
  assert.throws(() => manager.joinTeamMidGame(room.id, 'p2', 'bleu'), /déjà/);
  assert.throws(() => manager.joinTeamMidGame(room.id, 'p2', 'vert'), /inconnue/);
  for (let i = 5; i <= 12; i++) manager.join(room.id, { playerId: `p${i}`, name: `P${i}` });
  assert.equal(manager.players(room).length, 12);
  const { member } = manager.join(room.id, { playerId: 'p13', name: 'P13' });
  assert.equal(member.kind, 'spectateur', 'salon complet : spectateur');
  assert.throws(() => manager.joinTeamMidGame(room.id, 'p13', 'rouge'), /plus de place/);
  assert.equal(manager.summary(room).canJoinAsPlayer, false);
});

test('Duo en cours : un nouveau venu ne peut être que spectateur', () => {
  const { manager, match, room } = setup('duo');
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  match.start(room.id, 'p1');
  const { member } = manager.join(room.id, { playerId: 'p3', name: 'P3' });
  assert.equal(member.kind, 'spectateur');
  assert.throws(() => manager.joinTeamMidGame(room.id, 'p3', 'rouge'), /Duo/);
  assert.equal(manager.summary(room).canJoinAsPlayer, false);
});

test('un agent arrivé en cours de partie débloque la promotion d’un capitaine absent', () => {
  const { manager, room, scheduler } = classicGame();
  manager.leave(room.id, 'p4'); // l'équipe bleue n'a plus d'agent
  manager.disconnect('p3'); // et son capitaine part
  scheduler.advance(3 * 60_000);
  assert.equal(room.members.get('p3').role, 'capitaine', 'personne à promouvoir');
  manager.join(room.id, { playerId: 'p6', name: 'P6' });
  const p6 = room.members.get('p6');
  assert.equal(p6.team, 'bleu');
  assert.equal(p6.role, 'capitaine', 'le nouvel agent est promu');
});

// ---------- Se retirer sans quitter le salon ----------

test('un agent se retire : il devient spectateur et reste dans le salon', () => {
  const { match, room } = classicGame();
  match.withdraw(room.id, 'p2');
  const p2 = room.members.get('p2');
  assert.equal(p2.kind, 'spectateur');
  assert.equal(p2.team, null);
  assert.equal(room.status, 'en_cours');
  assert.equal(room.game.history.at(-1).type, 'info');
});

test('un capitaine se retire : un agent de son équipe est promu', () => {
  const { match, room } = classicGame();
  match.withdraw(room.id, 'p3');
  assert.equal(room.members.get('p4').role, 'capitaine');
  assert.equal(room.members.get('p3').kind, 'spectateur');
});

test('le capitaine qui joue se retire : plus de pause, le remplaçant peut jouer', () => {
  const { match, room } = classicGame();
  match.withdraw(room.id, 'p1');
  assert.equal(room.members.get('p2').role, 'capitaine');
  assert.equal(room.paused, false);
  match.clue(room.id, 'p2', 'indice', 1);
  assert.equal(room.game.phase, 'devinette');
});

test('Duo : se retirer met fin à la partie, le joueur reste dans le salon', () => {
  const { manager, match, room } = setup('duo');
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  match.start(room.id, 'p1');
  match.withdraw(room.id, 'p2');
  assert.equal(room.status, 'terminee');
  assert.equal(room.game.endReason, 'abandon');
  assert.ok(room.members.has('p2'));
  assert.equal(room.members.get('p2').kind, 'spectateur');
});

test('se retirer : refusé dans le lobby ou pour un spectateur', () => {
  const { manager, match, room } = setup();
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  assert.throws(() => match.withdraw(room.id, 'p2'), /lobby/);
  const ctx = classicGame();
  ctx.manager.join(ctx.room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  assert.throws(() => ctx.match.withdraw(ctx.room.id, 's'), /déjà spectateur/);
});

// ---------- Retour au lobby à tout moment ----------

test('l’hôte peut revenir au lobby en pleine manche ; un joueur non', () => {
  const { match, room } = classicGame();
  assert.throws(() => match.toLobby(room.id, 'p2'), /hôte/);
  match.toLobby(room.id, 'p1');
  assert.equal(room.status, 'attente');
  assert.equal(room.game, null);
  assert.equal(room.members.size, 4);
});

test('Duo : la règle « Fin d’un indice » du salon est appliquée et affichée dans la liste', () => {
  const { manager, match, room } = setup('duo', { duo: { clueEnd: 'bonus' } });
  manager.join(room.id, { playerId: 'p2', name: 'P2' });
  assert.ok(manager.summary(room).details.includes('Indice + 1 essai'));
  match.start(room.id, 'p1');
  assert.equal(room.game.clueEnd, 'bonus');
  assert.throws(() => manager.updateSettings(room.id, 'p1', { duo: { clueEnd: 'strict' } }), /avant le lancement/);
});
