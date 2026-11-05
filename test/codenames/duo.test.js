'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const duo = require('../../server/codenames/duo');
const { generateDuoKeys } = require('../../server/codenames/board');
const { RoomManager } = require('../../server/codenames/rooms');
const { MatchController } = require('../../server/codenames/match');
const { buildRoomView } = require('../../server/codenames/views');
const { FakeScheduler, seededRng } = require('./helpers');

const words = Array.from({ length: 25 }, (_, i) => `mot${String.fromCharCode(97 + i)}`);

function makeGame(options = {}) {
  const keys = generateDuoKeys(seededRng(options.seed || 9));
  return duo.createDuoGame({ words, keys, tokens: 9, suddenDeath: true, firstGiver: 'A', ...options });
}

const indexes = (key, color, exclude = []) => key.map((c, i) => (c === color && !exclude.includes(i) ? i : -1)).filter((i) => i >= 0);

test('15 agents distincts à trouver', () => {
  assert.equal(makeGame().agentsTotal, 15);
});

test('rôles : A donne l\'indice, B devine, puis les rôles alternent', () => {
  const g = makeGame();
  assert.throws(() => duo.giveClue(g, 'B', 'indice', 1), /pas à vous/);
  duo.giveClue(g, 'A', 'indice', 2);
  assert.throws(() => duo.guess(g, 'A', 0), /partenaire qui devine/);
  const neutral = indexes(g.keys.A, 'neutre')[0];
  duo.guess(g, 'B', neutral);
  assert.equal(g.giver, 'B');
  assert.equal(g.phase, 'indice');
  assert.equal(g.tokensLeft, 8);
});

test('le clic est jugé selon la face du capitaine du tour', () => {
  const g = makeGame();
  // Carte agent pour A mais passant pour B
  const i = g.keys.A.findIndex((c, k) => c === 'agent' && g.keys.B[k] === 'neutre');
  duo.giveClue(g, 'A', 'indice', 1);
  const r = duo.guess(g, 'B', i);
  assert.equal(r.color, 'agent');
  assert.equal(g.found[i], true);
  assert.equal(g.phase, 'devinette', 'on peut continuer après un agent');
});

test('passant : fin du tour, un jeton consommé, carte marquée pour ce capitaine seulement', () => {
  const g = makeGame();
  // Passant pour A mais agent pour B
  const i = g.keys.A.findIndex((c, k) => c === 'neutre' && g.keys.B[k] === 'agent');
  duo.giveClue(g, 'A', 'indice', 1);
  duo.guess(g, 'B', i);
  assert.equal(g.bystanders.A[i], true);
  assert.equal(g.bystanders.B[i], false);
  assert.equal(g.tokensLeft, 8);
  // Au tour de B : la carte reste devinable par A (c'est un agent pour B)
  duo.giveClue(g, 'B', 'autre', 1);
  assert.equal(duo.guess(g, 'A', i).color, 'agent');
});

test('une carte déjà marquée passant pour le capitaine ne peut pas être rejouée', () => {
  const g = makeGame();
  const [n1] = indexes(g.keys.A, 'neutre');
  duo.giveClue(g, 'A', 'indice', 1);
  duo.guess(g, 'B', n1);
  duo.giveClue(g, 'B', 'autre', 1);
  duo.guess(g, 'A', indexes(g.keys.B, 'neutre').find((i) => i !== n1));
  duo.giveClue(g, 'A', 'encore', 1);
  assert.throws(() => duo.guess(g, 'B', n1), /passant/);
});

test('assassin : défaite immédiate des deux joueurs', () => {
  const g = makeGame();
  duo.giveClue(g, 'A', 'indice', 1);
  duo.guess(g, 'B', g.keys.A.indexOf('assassin'));
  assert.equal(g.result, 'defaite');
  assert.equal(g.endReason, 'assassin');
  assert.throws(() => duo.guess(g, 'B', 0), /terminée/);
});

test('passer : après au moins une proposition, consomme un jeton', () => {
  const g = makeGame();
  duo.giveClue(g, 'A', 'indice', 1);
  assert.throws(() => duo.pass(g, 'B'), /au moins une proposition/);
  duo.guess(g, 'B', indexes(g.keys.A, 'agent')[0]);
  duo.pass(g, 'B');
  assert.equal(g.tokensLeft, 8);
  assert.equal(g.giver, 'B');
});

test('le timer consomme un jeton et passe la main', () => {
  const g = makeGame();
  duo.timeout(g);
  assert.equal(g.tokensLeft, 8);
  assert.equal(g.giver, 'B');
});

test('victoire : les 15 agents trouvés', () => {
  const g = makeGame({ tokens: 9 });
  // A fait trouver tous ses agents, puis B les siens.
  duo.giveClue(g, 'A', 'tout', 'illimite');
  for (const i of indexes(g.keys.A, 'agent')) duo.guess(g, 'B', i);
  assert.equal(g.giver, 'B', 'A n\'a plus d\'agents : le tour s\'arrête');
  duo.giveClue(g, 'B', 'reste', 'illimite');
  for (const i of indexes(g.keys.B, 'agent', g.found.map((f, k) => (f ? k : -1)))) duo.guess(g, 'A', i);
  assert.equal(g.result, 'victoire');
  assert.equal(g.endReason, 'agents');
});

test('un joueur sans agents restants ne donne plus d\'indice', () => {
  const g = makeGame();
  duo.giveClue(g, 'A', 'tout', 'illimite');
  for (const i of indexes(g.keys.A, 'agent')) duo.guess(g, 'B', i);
  duo.giveClue(g, 'B', 'xy', 1);
  duo.guess(g, 'A', indexes(g.keys.B, 'neutre').find((i) => !g.found[i]));
  assert.equal(g.giver, 'B', 'B redonne l\'indice car A n\'a plus rien à faire deviner');
});

test('jetons épuisés sans mort subite : défaite', () => {
  const g = makeGame({ tokens: 2, suddenDeath: false });
  duo.timeout(g);
  duo.timeout(g);
  assert.equal(g.result, 'defaite');
  assert.equal(g.endReason, 'temps');
});

test('mort subite : plus d\'indices, deviner selon la face du partenaire, toute erreur fait perdre', () => {
  const g = makeGame({ tokens: 1 });
  duo.timeout(g);
  assert.equal(g.phase, 'mort-subite');
  assert.throws(() => duo.giveClue(g, 'A', 'indice', 1), /Mort subite/);
  // A désigne un agent de la face de B : on continue
  const ok = indexes(g.keys.B, 'agent')[0];
  assert.equal(duo.guess(g, 'A', ok).color, 'agent');
  assert.equal(g.phase, 'mort-subite');
  // B désigne un passant de la face de A : défaite
  const bad = indexes(g.keys.A, 'neutre').find((i) => !g.found[i]);
  duo.guess(g, 'B', bad);
  assert.equal(g.result, 'defaite');
  assert.equal(g.endReason, 'mort-subite');
});

test('mort subite : victoire si tous les agents sont trouvés', () => {
  const g = makeGame({ tokens: 1 });
  duo.timeout(g);
  for (const i of indexes(g.keys.B, 'agent')) duo.guess(g, 'A', i);
  for (const i of indexes(g.keys.A, 'agent')) if (!g.found[i]) duo.guess(g, 'B', i);
  assert.equal(g.result, 'victoire');
});

// ---------- Orchestration et confidentialité ----------

function setupRoom(duoSettings = {}) {
  const scheduler = new FakeScheduler();
  const rng = seededRng(21);
  const manager = new RoomManager({ scheduler, rng });
  const pool = Array.from({ length: 100 }, (_, i) => `m${i}z`);
  const match = new MatchController({ manager, packs: new Map([['classique', { words: pool }]]), rng });
  const room = manager.createRoom({ playerId: 'a', name: 'Anna' }, { settings: { mode: 'duo', duo: duoSettings } });
  manager.join(room.id, { playerId: 'b', name: 'Basile' });
  manager.join(room.id, { playerId: 's', name: 'Spectateur' }, { asSpectator: true });
  return { scheduler, manager, match, room };
}

const view = (match, room, id) => buildRoomView(room, id, { gameView: (r, m) => match.gameView(r, m) });

test('Duo : chaque joueur ne reçoit que sa propre face, le spectateur aucune', () => {
  const { match, room } = setupRoom();
  match.start(room.id, 'a');
  const g = room.game;
  const va = view(match, room, 'a').game;
  const vb = view(match, room, 'b').game;
  const vs = view(match, room, 's').game;
  assert.deepEqual(va.myKey, g.keys.A);
  assert.deepEqual(vb.myKey, g.keys.B);
  assert.equal(vs.myKey, null);
  for (const v of [va, vb, vs]) assert.equal(v.keys, null);
  assert.ok(!JSON.stringify(va).includes(JSON.stringify(g.keys.B)), 'la face B ne doit pas fuiter vers A');
  assert.ok(!JSON.stringify(vb).includes(JSON.stringify(g.keys.A)), 'la face A ne doit pas fuiter vers B');
  assert.ok(!/"(assassin|agent|neutre)"/.test(JSON.stringify(vs)), 'aucune information de clé pour le spectateur');
});

test('Duo : les deux faces sont révélées à tous en fin de partie', () => {
  const { match, room } = setupRoom();
  match.start(room.id, 'a');
  const g = room.game;
  const giverId = g.giver === 'A' ? 'a' : 'b';
  const guesserId = giverId === 'a' ? 'b' : 'a';
  match.clue(room.id, giverId, 'indice', 1);
  match.guess(room.id, guesserId, g.keys[g.giver].indexOf('assassin'));
  assert.equal(room.status, 'terminee');
  const vs = view(match, room, 's').game;
  assert.deepEqual(vs.keys, { A: g.keys.A, B: g.keys.B });
  assert.equal(vs.result, 'defaite');
});

test('Duo : nombre de jetons et mort subite paramétrables, timer par tour', () => {
  const { match, room, scheduler } = setupRoom({ timeTokens: 2, suddenDeath: false, timerEnabled: true, turnSeconds: 60 });
  match.start(room.id, 'a');
  assert.equal(room.game.tokensLeft, 2);
  scheduler.advance(60_000);
  assert.equal(room.game.tokensLeft, 1);
  scheduler.advance(60_000);
  assert.equal(room.status, 'terminee');
  assert.equal(room.game.endReason, 'temps');
});

test('journal des révélations : qui, pour qui, résultat, indice', () => {
  const g = makeGame();
  duo.giveClue(g, 'A', 'indice', 2);
  const agent = indexes(g.keys.A, 'agent')[0];
  duo.guess(g, 'B', agent);
  assert.equal(g.clue.agentsFound, 1);
  const neutral = indexes(g.keys.A, 'neutre').find((i) => !g.found[i]);
  duo.guess(g, 'B', neutral);
  assert.deepEqual(g.reveals.map((r) => [r.index, r.guesser, r.giver, r.result, r.clue.word]), [
    [agent, 'B', 'A', 'agent', 'indice'],
    [neutral, 'B', 'A', 'passant', 'indice']
  ]);
});

test('journal des révélations : mort subite jugée sur la face du partenaire', () => {
  const g = makeGame({ tokens: 1 });
  duo.timeout(g);
  const ok = indexes(g.keys.B, 'agent')[0];
  duo.guess(g, 'A', ok);
  const r = g.reveals.at(-1);
  assert.deepEqual([r.guesser, r.giver, r.result, r.suddenDeath, r.clue], ['A', 'B', 'agent', true, null]);
});
