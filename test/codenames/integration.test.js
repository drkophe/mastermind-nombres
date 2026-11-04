'use strict';

/**
 * Test de bout en bout avec un vrai serveur Socket.IO :
 * vérifie qu'aucun secret (clé, chat d'équipe) n'atteint un client non autorisé.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const { Server } = require('socket.io');
const { io: ioClient } = require('socket.io-client');
const { registerCodenames } = require('../../server/codenames');

const words = Array.from({ length: 200 }, (_, i) => `mot${i}x`);

async function startServer(options = {}) {
  const httpServer = http.createServer();
  const io = new Server(httpServer);
  const codenames = registerCodenames(io, { packs: new Map([['classique', { id: 'classique', label: 'Test', words }]]), ...options });
  await new Promise((resolve) => httpServer.listen(0, resolve));
  const url = `http://localhost:${httpServer.address().port}/codenames`;
  return { io, httpServer, codenames, url };
}

/** Client de test qui enregistre tout ce qu'il reçoit. */
function connectClient(url, name, token) {
  const socket = ioClient(url, { forceNew: true, transports: ['websocket'], auth: token ? { token } : {} });
  const client = { name, socket, received: [], state: null, session: null };
  socket.onAny((event, payload) => {
    client.received.push({ event, payload });
    if (event === 'room:state') client.state = payload;
    if (event === 'session') client.session = payload;
  });
  client.call = (event, payload) => new Promise((resolve) => socket.emit(event, payload || {}, resolve));
  client.ready = new Promise((resolve) => socket.once('session', resolve));
  return client;
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function setupGame(url) {
  const names = ['Rouge1', 'Rouge2', 'Bleu1', 'Bleu2'];
  const clients = names.map((n) => connectClient(url, n));
  await Promise.all(clients.map((c) => c.ready));
  const [r1, r2, b1, b2] = clients;
  const { roomId } = await r1.call('room:create', { playerName: 'Rouge1', settings: { classic: { startingTeam: 'rouge' } } });
  for (const c of [r2, b1, b2]) await c.call('room:join', { roomId, playerName: c.name });
  const spec = connectClient(url, 'Spectateur');
  await spec.ready;
  await spec.call('room:join', { roomId, playerName: 'Spectateur', asSpectator: true });
  await r1.call('room:assign', { team: 'rouge', role: 'capitaine' });
  await r1.call('room:assign', { playerId: r2.session.playerId, team: 'rouge', role: 'agent' });
  await r1.call('room:assign', { playerId: b1.session.playerId, team: 'bleu', role: 'capitaine' });
  await r1.call('room:assign', { playerId: b2.session.playerId, team: 'bleu', role: 'agent' });
  const res = await r1.call('game:start');
  assert.equal(res.ok, true, res.error);
  await wait(50);
  return { roomId, r1, r2, b1, b2, spec, all: [r1, r2, b1, b2, spec] };
}

test('intégration : la clé et le chat d\'équipe ne fuient jamais', async (t) => {
  const server = await startServer();
  t.after(() => { server.io.close(); server.httpServer.close(); });
  const { r1, r2, b1, b2, spec, all } = await setupGame(server.url);
  t.after(() => all.forEach((c) => c.socket.close()));

  // Clé : uniquement chez les capitaines
  assert.equal(r1.state.game.key.length, 25);
  assert.equal(b1.state.game.key.length, 25);
  const key = r1.state.game.key;
  for (const c of [r2, b2, spec]) {
    assert.equal(c.state.game.key, null, `clé envoyée à ${c.name}`);
  }

  // Chat d'équipe rouge
  const res = await r2.call('chat:send', { channel: 'equipe', text: 'SECRET-ROUGE' });
  assert.equal(res.ok, true);
  await r1.call('chat:send', { channel: 'general', text: 'bonjour à tous' });

  // Une partie : indice, carte neutre, etc.
  await r1.call('game:clue', { word: 'indice', count: 1 });
  await r2.call('game:guess', { index: key.indexOf('neutre') });
  await wait(80);

  const leaks = (client, needle) => client.received.some((r) => JSON.stringify(r.payload || '').includes(needle));
  assert.ok(leaks(r1, 'SECRET-ROUGE'));
  assert.ok(leaks(r2, 'SECRET-ROUGE'));
  for (const c of [b1, b2, spec]) assert.ok(!leaks(c, 'SECRET-ROUGE'), `chat d'équipe reçu par ${c.name}`);
  for (const c of all) assert.ok(leaks(c, 'bonjour à tous'));

  // Aucun message reçu par un agent ou un spectateur ne contient la clé complète
  const keyJson = JSON.stringify(key);
  for (const c of [r2, b2, spec]) {
    assert.ok(!c.received.some((r) => JSON.stringify(r.payload || '').includes(keyJson)), `clé dans un message reçu par ${c.name}`);
    assert.ok(!c.received.some((r) => r.event === 'room:state' && r.payload.game && JSON.stringify(r.payload.game).includes('assassin')),
      `position de l'assassin visible par ${c.name}`);
  }

  // Un agent ne peut pas tricher : actions refusées côté serveur
  assert.equal((await b2.call('game:guess', { index: 0 })).ok, false);
  assert.equal((await r2.call('game:clue', { word: 'triche', count: 2 })).ok, false);
  assert.equal((await spec.call('game:guess', { index: 0 })).ok, false);
  assert.equal((await spec.call('chat:send', { channel: 'equipe', text: 'x' })).ok, false);
});

test('intégration : reconnexion avec le même jeton, même place et même vue', async (t) => {
  const server = await startServer();
  t.after(() => { server.io.close(); server.httpServer.close(); });
  const { r1, r2, all } = await setupGame(server.url);
  const token = r1.session.token;
  const playerId = r1.session.playerId;
  r1.socket.close();
  await wait(50);
  const again = connectClient(server.url, 'Rouge1', token);
  t.after(() => [...all, again].forEach((c) => c.socket.close()));
  await again.ready;
  await wait(50);
  assert.equal(again.session.playerId, playerId);
  assert.equal(again.state.me.role, 'capitaine');
  assert.equal(again.state.me.team, 'rouge');
  assert.equal(again.state.game.key.length, 25, 'le capitaine retrouve sa clé');
  assert.ok(again.received.some((r) => r.event === 'chat:history'));
  // Un jeton inconnu donne une nouvelle identité, sans accès à la place de quelqu'un d'autre
  const intruder = connectClient(server.url, 'Intrus', 'jeton-invente');
  t.after(() => intruder.socket.close());
  await intruder.ready;
  assert.notEqual(intruder.session.playerId, playerId);
  assert.equal(intruder.state, null);
  assert.equal(r2.state.game.key, null);
});

test('intégration : définitions disponibles seulement en fin de manche', async (t) => {
  const lookups = [];
  const definitions = { lookup: async (w) => { lookups.push(w); return { word: w, definitions: [{ partOfSpeech: 'nom', text: 'déf' }] }; } };
  const server = await startServer({ definitions });
  t.after(() => { server.io.close(); server.httpServer.close(); });
  const { r1, r2, all } = await setupGame(server.url);
  t.after(() => all.forEach((c) => c.socket.close()));
  const during = await r2.call('definition:get', { index: 0 });
  assert.equal(during.ok, false);
  assert.equal(lookups.length, 0, 'aucun appel externe pendant la manche');
  const key = r1.state.game.key;
  await r1.call('game:clue', { word: 'indice', count: 1 });
  await r2.call('game:guess', { index: key.indexOf('assassin') });
  const after = await r2.call('definition:get', { index: 3 });
  assert.equal(after.ok, true);
  assert.equal(after.word, r1.state.game.words[3]);
  assert.equal(after.definition.definitions[0].text, 'déf');
  assert.equal((await r2.call('definition:get', { index: 99 })).ok, false);
});
