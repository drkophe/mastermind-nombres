'use strict';

const { RoomManager, CodenamesError } = require('./rooms');
const { buildRoomView, schemaForClient } = require('./views');
const { randomId, cleanText } = require('./util');
const { MatchController } = require('./match');
const { ChatService } = require('./chat');
const { DefinitionService } = require('./definitions');
const { loadWordPacks } = require('./words');
const { setAvailablePacks } = require('./settings');

const ACTION_BURST = 25; // actions max par fenêtre
const ACTION_WINDOW_MS = 5000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // jeton inutilisé : oublié après 24 h
const SESSION_SWEEP_MS = 60 * 60 * 1000;

/**
 * Branche Codenames sur le serveur Socket.IO existant, dans le namespace /codenames.
 * Renvoie le gestionnaire (utile pour les tests).
 */
function registerCodenames(io, options = {}) {
  const nsp = io.of('/codenames');
  const sessions = new Map(); // token secret -> { playerId public, lastSeen }
  const socketsOf = new Map(); // playerId -> Set<socket>
  const dirtyRooms = new Set();
  let listDirty = false;
  let flushScheduled = false;

  const hooks = { gameView: null, timerView: null, onMemberDisconnected: [], onMemberReconnected: [], onMemberRemoved: [] };

  const manager = new RoomManager({
    ...options,
    onRoomChange: (room) => { dirtyRooms.add(room.id); scheduleFlush(); },
    onListChange: () => { listDirty = true; scheduleFlush(); },
    onRoomDeleted: (room) => { dirtyRooms.delete(room.id); },
    onMemberRemoved: (room, member) => {
      chatSignatures.delete(member.id);
      chat.forget(member.id);
      hooks.onMemberRemoved.forEach((fn) => fn(room, member));
      emitTo(member.id, 'room:left', { roomId: room.id });
    },
    onMemberDisconnected: (room, member) => hooks.onMemberDisconnected.forEach((fn) => fn(room, member)),
    onMemberReconnected: (room, member) => hooks.onMemberReconnected.forEach((fn) => fn(room, member))
  });

  const packs = options.packs || loadWordPacks();
  setAvailablePacks([...packs.keys()]);
  const match = new MatchController({ manager, packs, rng: options.rng });
  hooks.gameView = (room, member) => match.gameView(room, member);
  hooks.timerView = (room) => match.timer.view(room);
  hooks.onMemberDisconnected.push((room, member) => match.onMemberDisconnected(room, member));
  hooks.onMemberReconnected.push((room, member) => match.onMemberReconnected(room, member));
  hooks.onMemberRemoved.push((room, member) => match.onMemberRemoved(room, member));
  const chat = new ChatService({ scheduler: manager.scheduler });
  const definitions = options.definitions || new DefinitionService();
  const chatSignatures = new Map(); // playerId -> signature du flux d'équipe déjà envoyé

  // ---------- Émission ----------

  function scheduleFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    setImmediate(flush);
  }

  function flush() {
    flushScheduled = false;
    for (const roomId of dirtyRooms) {
      const room = manager.getRoom(roomId);
      if (room) emitRoomState(room);
    }
    dirtyRooms.clear();
    if (listDirty) {
      listDirty = false;
      nsp.to('liste-salons').emit('rooms:list', manager.listPublic());
    }
  }

  function viewFor(room, playerId) {
    return buildRoomView(room, playerId, { gameView: hooks.gameView, timerView: hooks.timerView });
  }

  function emitRoomState(room) {
    for (const member of room.members.values()) {
      emitTo(member.id, 'room:state', viewFor(room, member.id));
      // Changement d'équipe ou de manche : le flux du chat d'équipe change aussi.
      const signature = `${room.id}:${chat.channelSignature(room, member)}`;
      if (chatSignatures.get(member.id) !== signature && socketsOf.has(member.id)) {
        chatSignatures.set(member.id, signature);
        emitTo(member.id, 'chat:history', chat.historyFor(room, member));
      }
    }
  }

  function emitTo(playerId, event, payload) {
    const set = socketsOf.get(playerId);
    if (!set) return;
    for (const s of set) s.emit(event, payload);
  }

  // ---------- Connexion ----------

  nsp.on('connection', (socket) => {
    const auth = socket.handshake.auth || {};
    const known = typeof auth.token === 'string' ? sessions.get(auth.token) : undefined;
    let token = auth.token;
    let playerId;
    if (known) {
      playerId = known.playerId;
      known.lastSeen = Date.now();
    } else {
      token = randomId(18);
      playerId = randomId(8);
      sessions.set(token, { playerId, lastSeen: Date.now() });
    }
    socket.data.playerId = playerId;
    if (!socketsOf.has(playerId)) socketsOf.set(playerId, new Set());
    socketsOf.get(playerId).add(socket);
    socket.emit('session', { token, playerId, schema: schemaForClient() });

    // Reconnexion : le joueur retrouve automatiquement son salon et sa place.
    const current = manager.roomOf(playerId);
    if (current) {
      const member = current.members.get(playerId);
      manager.markConnected(current, member);
      socket.emit('room:state', viewFor(current, playerId));
      socket.emit('chat:history', chat.historyFor(current, member));
    }

    const bucket = { count: 0, windowStart: Date.now() };
    function allowAction() {
      const now = Date.now();
      if (now - bucket.windowStart > ACTION_WINDOW_MS) {
        bucket.windowStart = now;
        bucket.count = 0;
      }
      bucket.count++;
      return bucket.count <= ACTION_BURST;
    }

    /** Enveloppe commune : limite de débit, erreurs métier renvoyées au client. */
    function on(event, handler) {
      socket.on(event, (payload, ack) => {
        const reply = typeof ack === 'function' ? ack : () => {};
        if (!allowAction()) {
          reply({ ok: false, error: 'Trop d\'actions, ralentissez.' });
          return;
        }
        const fail = (err) => {
          if (err instanceof CodenamesError) {
            reply({ ok: false, error: err.message });
            socket.emit('cn:error', err.message);
          } else {
            console.error('[codenames]', event, err);
            reply({ ok: false, error: 'Erreur interne.' });
          }
        };
        try {
          const result = handler(payload && typeof payload === 'object' ? payload : {});
          if (result && typeof result.then === 'function') {
            result.then((value) => reply({ ok: true, ...(value || {}) }), fail);
          } else {
            reply({ ok: true, ...(result || {}) });
          }
        } catch (err) {
          fail(err);
        }
      });
    }

    function myRoom() {
      const room = manager.roomOf(playerId);
      if (!room) throw new CodenamesError('Vous n\'êtes dans aucun salon.');
      return room;
    }

    socket.data.on = on;
    socket.data.myRoom = myRoom;

    on('rooms:subscribe', () => {
      socket.join('liste-salons');
      socket.emit('rooms:list', manager.listPublic());
    });

    on('rooms:unsubscribe', () => {
      socket.leave('liste-salons');
    });

    on('room:create', (p) => {
      const name = cleanText(p.playerName, 20);
      if (!name) throw new CodenamesError('Choisissez un pseudo.');
      const room = manager.createRoom({ playerId, name }, { name: p.roomName, settings: p.settings });
      return { roomId: room.id };
    });

    on('room:join', (p) => {
      const name = cleanText(p.playerName, 20);
      if (!name) throw new CodenamesError('Choisissez un pseudo.');
      const { room } = manager.join(String(p.roomId || ''), { playerId, name }, { asSpectator: !!p.asSpectator });
      return { roomId: room.id };
    });

    on('room:leave', () => {
      const room = manager.roomOf(playerId);
      if (room) manager.leave(room.id, playerId);
    });

    on('room:settings', (p) => {
      manager.updateSettings(myRoom().id, playerId, p.settings || {});
    });

    on('room:assign', (p) => {
      const target = typeof p.playerId === 'string' ? p.playerId : playerId;
      manager.assign(myRoom().id, playerId, target, { kind: p.kind, team: p.team, role: p.role, side: p.side });
    });

    on('room:shuffle', () => {
      manager.shuffleTeams(myRoom().id, playerId);
    });

    on('room:transfer-host', (p) => {
      const room = myRoom();
      manager.requireHost(room, playerId);
      const target = room.members.get(p.playerId);
      if (!target) throw new CodenamesError('Joueur introuvable.');
      room.hostId = target.id;
      manager.changed(room, true);
    });

    // ---------- Chat ----------
    on('chat:send', (p) => {
      const room = myRoom();
      const { message, recipients } = chat.post(room, room.members.get(playerId), p.channel, p.text);
      for (const m of recipients) emitTo(m.id, 'chat:message', message);
    });

    // ---------- Définitions (fin de manche uniquement) ----------
    on('definition:get', async (p) => {
      const room = myRoom();
      if (room.status !== 'terminee' || !room.game) throw new CodenamesError('Les définitions sont disponibles en fin de manche.');
      const word = room.game.words[p.index];
      if (typeof word !== 'string') throw new CodenamesError('Carte invalide.');
      const definition = await definitions.lookup(word);
      return { word, definition };
    });

    // ---------- Partie ----------
    on('game:start', () => match.start(myRoom().id, playerId));
    on('game:clue', (p) => match.clue(myRoom().id, playerId, p.word, p.count));
    on('game:guess', (p) => match.guess(myRoom().id, playerId, p.index));
    on('game:pass', () => match.pass(myRoom().id, playerId));
    on('game:next', () => match.next(myRoom().id, playerId));
    on('game:lobby', () => match.toLobby(myRoom().id, playerId));
    on('game:promote', (p) => match.hostPromote(myRoom().id, playerId, p.playerId));

    if (options.extendSocket) options.extendSocket(socket, { on, myRoom, playerId });

    socket.on('disconnect', () => {
      const set = socketsOf.get(playerId);
      const session = sessions.get(token);
      if (session) session.lastSeen = Date.now();
      if (set) {
        set.delete(socket);
        if (set.size === 0) {
          socketsOf.delete(playerId);
          manager.disconnect(playerId);
        }
      }
    });
  });

  // Purge des jetons de session inutilisés (joueurs partis depuis longtemps).
  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) {
      if (socketsOf.has(session.playerId) || manager.roomOf(session.playerId)) continue;
      if (now - session.lastSeen > SESSION_TTL_MS) sessions.delete(token);
    }
  }, SESSION_SWEEP_MS);
  if (sweep.unref) sweep.unref();

  /** Statistiques publiques pour l'accueil : joueurs connectés et salons ouverts. */
  function liveStats() {
    let players = 0;
    for (const room of manager.rooms.values()) {
      for (const m of room.members.values()) if (m.connected) players++;
    }
    return { players, rooms: manager.rooms.size };
  }

  return { nsp, manager, match, chat, definitions, hooks, liveStats, emitTo, viewFor, isOnline: (id) => socketsOf.has(id) };
}

module.exports = { registerCodenames };
