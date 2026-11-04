'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager, CodenamesError } = require('../../server/codenames/rooms');
const { FakeScheduler, seededRng } = require('./helpers');

function setup() {
  const scheduler = new FakeScheduler();
  const events = { list: 0, deleted: [] };
  const manager = new RoomManager({
    scheduler,
    rng: seededRng(1),
    onListChange: () => { events.list++; },
    onRoomDeleted: (room) => events.deleted.push(room.id)
  });
  return { manager, scheduler, events };
}

const id = (n) => ({ playerId: `p${n}`, name: `Joueur${n}` });

test('le créateur devient hôte et joueur ; le salon apparaît dans la liste', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1), { name: 'Mon salon' });
  assert.equal(room.hostId, 'p1');
  const list = manager.listPublic();
  assert.equal(list.length, 1);
  assert.equal(list[0].name, 'Mon salon');
  assert.equal(list[0].hostName, 'Joueur1');
  assert.equal(list[0].players, 1);
  assert.equal(list[0].maxPlayers, 12);
  assert.equal(list[0].status, 'attente');
});

test('les nouveaux joueurs sont répartis dans l\'équipe la moins remplie', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  [2, 3, 4].forEach((n) => manager.join(room.id, id(n)));
  const teams = manager.players(room).map((p) => p.team);
  assert.deepEqual(teams.sort(), ['bleu', 'bleu', 'rouge', 'rouge']);
});

test('pseudos dupliqués rendus uniques', () => {
  const { manager } = setup();
  const room = manager.createRoom({ playerId: 'a', name: 'Alice' });
  const { member } = manager.join(room.id, { playerId: 'b', name: 'alice' });
  assert.equal(member.name, 'alice 2');
});

test('spectateurs refusés si l\'hôte les interdit', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1), { settings: { spectatorsAllowed: false } });
  assert.throws(() => manager.join(room.id, id(2), { asSpectator: true }), CodenamesError);
  manager.join(room.id, id(3));
  assert.equal(room.members.get('p3').kind, 'joueur');
});

test('en Duo, le salon est complet à 2 joueurs ; le 3e devient spectateur', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1), { settings: { mode: 'duo' } });
  manager.join(room.id, id(2));
  const { member } = manager.join(room.id, id(3));
  assert.equal(member.kind, 'spectateur');
  assert.deepEqual(manager.players(room).map((p) => p.side), ['A', 'B']);
});

test('passer en Duo transforme les joueurs en trop en spectateurs', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  [2, 3, 4].forEach((n) => manager.join(room.id, id(n)));
  manager.updateSettings(room.id, 'p1', { mode: 'duo' });
  assert.equal(manager.players(room).length, 2);
  assert.equal(manager.spectators(room).length, 2);
});

test('seul l\'hôte modifie les paramètres, et seulement avant le lancement', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  assert.throws(() => manager.updateSettings(room.id, 'p2', { mode: 'duo' }), /hôte/);
  room.status = 'en_cours';
  assert.throws(() => manager.updateSettings(room.id, 'p1', { mode: 'duo' }), /avant le lancement/);
});

test('un seul capitaine par équipe', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  [2, 3, 4].forEach((n) => manager.join(room.id, id(n)));
  manager.assign(room.id, 'p1', 'p1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'p2', 'p2', { team: 'rouge', role: 'capitaine' });
  const captains = manager.players(room).filter((p) => p.team === 'rouge' && p.role === 'capitaine');
  assert.deepEqual(captains.map((p) => p.id), ['p2']);
});

test('un joueur ne peut pas déplacer un autre joueur, l\'hôte si', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  manager.join(room.id, id(3));
  assert.throws(() => manager.assign(room.id, 'p2', 'p3', { team: 'rouge' }), /hôte/);
  manager.assign(room.id, 'p1', 'p3', { team: 'bleu' });
  assert.equal(room.members.get('p3').team, 'bleu');
});

test('validation de la composition : minimum 2 par équipe, capitaine nommé automatiquement', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  manager.join(room.id, id(3));
  assert.throws(() => manager.validateLineup(room), /au moins 4/);
  manager.join(room.id, id(4));
  manager.validateLineup(room);
  for (const team of ['rouge', 'bleu']) {
    assert.equal(manager.players(room).filter((p) => p.team === team && p.role === 'capitaine').length, 1);
  }
});

test('mélange aléatoire : équipes équilibrées avec un capitaine chacune', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  [2, 3, 4, 5].forEach((n) => manager.join(room.id, id(n)));
  manager.shuffleTeams(room.id, 'p1');
  const red = manager.players(room).filter((p) => p.team === 'rouge');
  const blue = manager.players(room).filter((p) => p.team === 'bleu');
  assert.ok(Math.abs(red.length - blue.length) <= 1);
  assert.equal(red.filter((p) => p.role === 'capitaine').length, 1);
  assert.equal(blue.filter((p) => p.role === 'capitaine').length, 1);
});

test('transfert de l\'hôte quand il quitte le salon', () => {
  const { manager } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  manager.leave(room.id, 'p1');
  assert.equal(room.hostId, 'p2');
});

test('transfert de l\'hôte après un délai de déconnexion', () => {
  const { manager, scheduler } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  room.status = 'en_cours';
  manager.disconnect('p1');
  assert.equal(room.hostId, 'p1');
  scheduler.advance(25_000);
  assert.equal(room.hostId, 'p2');
});

test('reconnexion dans le délai de grâce : le joueur garde sa place', () => {
  const { manager, scheduler } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  manager.assign(room.id, 'p2', 'p2', { team: 'bleu', role: 'capitaine' });
  manager.disconnect('p2');
  scheduler.advance(10_000);
  const { rejoined, member } = manager.join(room.id, id(2));
  assert.equal(rejoined, true);
  assert.equal(member.team, 'bleu');
  assert.equal(member.role, 'capitaine');
  scheduler.advance(60_000);
  assert.ok(room.members.has('p2'));
});

test('un joueur déconnecté du lobby est retiré après le délai de grâce', () => {
  const { manager, scheduler } = setup();
  const room = manager.createRoom(id(1));
  manager.join(room.id, id(2));
  manager.disconnect('p2');
  scheduler.advance(31_000);
  assert.ok(!room.members.has('p2'));
});

test('nettoyage automatique d\'un salon vide ou abandonné', () => {
  const { manager, scheduler, events } = setup();
  const room = manager.createRoom(id(1));
  manager.leave(room.id, 'p1');
  assert.deepEqual(events.deleted, [room.id]);

  const room2 = manager.createRoom(id(2));
  room2.status = 'en_cours';
  manager.disconnect('p2');
  scheduler.advance(2 * 60_000 + 1);
  assert.equal(manager.getRoom(room2.id), null);
});

test('rejoindre un autre salon quitte le précédent', () => {
  const { manager } = setup();
  const a = manager.createRoom(id(1));
  manager.join(a.id, id(2));
  const b = manager.createRoom(id(3));
  manager.join(b.id, id(2));
  assert.ok(!a.members.has('p2'));
  assert.equal(manager.roomOf('p2').id, b.id);
});
