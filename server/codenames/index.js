'use strict';

const { RoomManager, CodenamesError } = require('./rooms');
const { buildRoomView, schemaForClient } = require('./views');
const { randomId, cleanText } = require('./util');
const { MatchController } = require('./match');
const { loadWordPacks } = require('./words');
const { setAvailablePacks } = require('./settings');

const ACTION_BURST = 25; // actions max par fenêtre
const ACTION_WINDOW_MS = 5000;

/**
 * Branche Codenames sur le serveur Socket.IO existant, dans le namespace /codenames.
 * Renvoie le gestionnaire (utile pour les tests).
 */
function registerCodenames(io, options = {}) {
  const nsp = io.of('/codenames');
  const sessions = new Map(); // token secret -> playerId public
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
    let playerId = typeof auth.token === 'string' ? sessions.get(auth.token) : undefined;
    let token = auth.token;
    if (!playerId) {
      token = randomId(18);
      playerId = randomId(8);
      sessions.set(token, playerId);
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
        try {
          const result = handler(payload && typeof payload === 'object' ? payload : {});
          reply({ ok: true, ...(result || {}) });
        } catch (err) {
          if (err instanceof CodenamesError) {
            reply({ ok: false, error: err.message });
            socket.emit('cn:error', err.message);
          } else {
            console.error('[codenames]', event, err);
            reply({ ok: false, error: 'Erreur interne.' });
          }
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

    // ---------- Partie ----------
    on('game:start', () => match.start(myRoom().id, playerId));
    on('game:clue', (p) => match.clue(myRoom().id, playerId, p.word, p.count));
    on('game:guess', (p) => match.guess(myRoom().id, playerId, p.index));
    on('game:pass', () => match.pass(myRoom().id, playerId));
    on('game:next', () => match.next(myRoom().id, playerId));
    on('game:lobby', () => match.toLobby(myRoom().id, playerId));

    if (options.extendSocket) options.extendSocket(socket, { on, myRoom, playerId });

    socket.on('disconnect', () => {
      const set = socketsOf.get(playerId);
      if (set) {
        set.delete(socket);
        if (set.size === 0) {
          socketsOf.delete(playerId);
          manager.disconnect(playerId);
        }
      }
    });
  });

  return { nsp, manager, match, hooks, emitTo, viewFor, isOnline: (id) => socketsOf.has(id) };
}

module.exports = { registerCodenames };
