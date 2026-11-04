'use strict';

const { randomId, cleanText, shuffle, defaultRng } = require('./util');
const { CodenamesError } = require('./errors');
const {
  defaultSettings,
  sanitizeSettings,
  maxPlayersFor,
  CLASSIC_MIN_PLAYERS
} = require('./settings');

const TEAMS = ['rouge', 'bleu'];
const MAX_SPECTATORS = 30;
const MAX_ROOMS = 200;

const DEFAULT_TIMINGS = {
  lobbyGraceMs: 30 * 1000, // un joueur déconnecté du lobby est retiré après ce délai
  hostGraceMs: 20 * 1000, // délai avant transfert de l'hôte déconnecté
  emptyRoomMs: 2 * 60 * 1000, // salon sans personne de connecté : supprimé
  idleRoomMs: 3 * 60 * 60 * 1000 // salon sans aucune activité : supprimé
};

const realScheduler = {
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle),
  now: () => Date.now()
};

/**
 * Gestion des salons : création, membres, hôte, nettoyage.
 * Ne connaît rien de Socket.IO : il notifie via des callbacks.
 */
class RoomManager {
  constructor(options = {}) {
    this.rooms = new Map();
    this.scheduler = options.scheduler || realScheduler;
    this.rng = options.rng || defaultRng;
    this.timings = { ...DEFAULT_TIMINGS, ...(options.timings || {}) };
    this.onRoomChange = options.onRoomChange || (() => {});
    this.onListChange = options.onListChange || (() => {});
    this.onRoomDeleted = options.onRoomDeleted || (() => {});
    this.onMemberRemoved = options.onMemberRemoved || (() => {});
    this.onMemberDisconnected = options.onMemberDisconnected || (() => {});
    this.onMemberReconnected = options.onMemberReconnected || (() => {});
    this.memberRoom = new Map(); // playerId -> roomId
  }

  // ---------- Lecture ----------

  getRoom(roomId) {
    return this.rooms.get(roomId) || null;
  }

  requireRoom(roomId) {
    const room = this.getRoom(roomId);
    if (!room) throw new CodenamesError('Ce salon n\'existe plus.');
    return room;
  }

  roomOf(playerId) {
    const roomId = this.memberRoom.get(playerId);
    return roomId ? this.getRoom(roomId) : null;
  }

  players(room) {
    return [...room.members.values()].filter((m) => m.kind === 'joueur');
  }

  spectators(room) {
    return [...room.members.values()].filter((m) => m.kind === 'spectateur');
  }

  listPublic() {
    return [...this.rooms.values()]
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((room) => this.summary(room));
  }

  summary(room) {
    const host = room.members.get(room.hostId);
    const s = room.settings;
    const details = [];
    if (s.mode === 'classique') {
      details.push(s.classic.rounds > 1 ? `${s.classic.rounds} manches` : 'Manche unique');
      details.push(s.classic.timerEnabled ? `Timer ${s.classic.clueSeconds}s / ${s.classic.guessSeconds}s` : 'Sans timer');
      if (s.classic.captainMode !== 'fixe') details.push('Rotation des capitaines');
    } else {
      details.push(`${s.duo.timeTokens} jetons`);
      details.push(s.duo.suddenDeath ? 'Mort subite' : 'Sans mort subite');
      if (s.duo.timerEnabled) details.push(`Timer ${s.duo.turnSeconds}s`);
    }
    return {
      id: room.id,
      name: room.name,
      hostName: host ? host.name : '—',
      mode: s.mode,
      players: this.players(room).length,
      maxPlayers: maxPlayersFor(s),
      spectators: this.spectators(room).length,
      spectatorsAllowed: s.spectatorsAllowed,
      status: room.status === 'attente' ? 'attente' : 'en_cours',
      details
    };
  }

  // ---------- Création / entrée / sortie ----------

  createRoom(identity, options = {}) {
    if (this.rooms.size >= MAX_ROOMS) throw new CodenamesError('Trop de salons ouverts, réessayez plus tard.');
    const id = randomId(6);
    const name = cleanText(options.name, 40) || `Salon de ${identity.name}`;
    const room = {
      id,
      name,
      hostId: null,
      createdAt: this.scheduler.now(),
      lastActivity: this.scheduler.now(),
      settings: sanitizeSettings(options.settings, defaultSettings()),
      status: 'attente',
      members: new Map(),
      game: null,
      match: { round: 0, score: { rouge: 0, bleu: 0 }, lastStartingTeam: null, over: false },
      usedWords: new Set(),
      chat: { general: [], teams: { rouge: [], bleu: [], duo: [] } },
      timers: new Map() // clé -> handle
    };
    this.rooms.set(id, room);
    this.join(id, identity, {});
    this.armIdleTimer(room);
    return room;
  }

  /**
   * Ajoute (ou retrouve) un membre. Un joueur déjà présent retrouve sa place.
   * identity : { playerId, name }
   */
  join(roomId, identity, { asSpectator = false } = {}) {
    const room = this.requireRoom(roomId);
    const name = cleanText(identity.name, 20);
    if (!name) throw new CodenamesError('Pseudo invalide.');

    const existing = room.members.get(identity.playerId);
    if (existing) {
      existing.name = name;
      this.markConnected(room, existing);
      return { room, member: existing, rejoined: true };
    }

    // Un joueur ne peut être que dans un salon à la fois.
    const previous = this.roomOf(identity.playerId);
    if (previous && previous.id !== roomId) this.leave(previous.id, identity.playerId);

    const playerCount = this.players(room).length;
    const full = playerCount >= maxPlayersFor(room.settings);
    let kind = 'joueur';
    if (asSpectator || room.status !== 'attente' || full) {
      if (!room.settings.spectatorsAllowed && room.members.size > 0) {
        if (room.status !== 'attente') throw new CodenamesError('Partie en cours et spectateurs non autorisés.');
        if (full) throw new CodenamesError('Le salon est complet.');
        throw new CodenamesError('Les spectateurs ne sont pas autorisés dans ce salon.');
      }
      if (this.spectators(room).length >= MAX_SPECTATORS) throw new CodenamesError('Trop de spectateurs.');
      kind = room.members.size === 0 ? 'joueur' : 'spectateur';
    }

    const member = {
      id: identity.playerId,
      name: this.uniqueName(room, name),
      kind,
      team: null,
      role: 'agent',
      side: null,
      connected: true,
      joinedAt: this.scheduler.now(),
      lastSeen: this.scheduler.now()
    };
    room.members.set(member.id, member);
    this.memberRoom.set(member.id, room.id);
    if (kind === 'joueur') this.placeNewPlayer(room, member);
    if (!room.hostId) room.hostId = member.id;
    this.touch(room);
    this.changed(room, true);
    return { room, member, rejoined: false };
  }

  uniqueName(room, name) {
    const taken = new Set([...room.members.values()].map((m) => m.name.toLowerCase()));
    if (!taken.has(name.toLowerCase())) return name;
    for (let i = 2; ; i++) {
      const candidate = `${name.slice(0, 17)} ${i}`;
      if (!taken.has(candidate.toLowerCase())) return candidate;
    }
  }

  /** Place un nouveau joueur : équipe la moins remplie (Classique) ou côté libre (Duo). */
  placeNewPlayer(room, member) {
    member.role = 'agent';
    if (room.settings.mode === 'duo') {
      const used = new Set(this.players(room).filter((p) => p !== member).map((p) => p.side));
      member.side = used.has('A') ? 'B' : 'A';
      member.team = null;
    } else {
      const counts = this.teamCounts(room, member);
      member.team = counts.rouge <= counts.bleu ? 'rouge' : 'bleu';
      member.side = null;
    }
  }

  teamCounts(room, exclude) {
    const counts = { rouge: 0, bleu: 0 };
    for (const p of this.players(room)) if (p !== exclude && p.team) counts[p.team]++;
    return counts;
  }

  leave(roomId, playerId) {
    const room = this.getRoom(roomId);
    if (!room) return;
    const member = room.members.get(playerId);
    if (!member) return;
    room.members.delete(playerId);
    if (this.memberRoom.get(playerId) === roomId) this.memberRoom.delete(playerId);
    this.clearTimer(room, `lobby:${playerId}`);
    this.onMemberRemoved(room, member);
    if (room.members.size === 0) {
      this.deleteRoom(room);
      return;
    }
    if (room.hostId === playerId) this.transferHost(room);
    this.touch(room);
    this.changed(room, true);
  }

  deleteRoom(room) {
    for (const handle of room.timers.values()) this.scheduler.clearTimeout(handle);
    room.timers.clear();
    for (const id of room.members.keys()) {
      if (this.memberRoom.get(id) === room.id) this.memberRoom.delete(id);
    }
    this.rooms.delete(room.id);
    this.onRoomDeleted(room);
    this.onListChange();
  }

  transferHost(room) {
    const candidates = [...room.members.values()]
      .filter((m) => m.connected && m.id !== room.hostId)
      .sort((a, b) => (a.kind === b.kind ? a.joinedAt - b.joinedAt : a.kind === 'joueur' ? -1 : 1));
    if (candidates.length > 0) room.hostId = candidates[0].id;
    else if (!room.members.has(room.hostId)) room.hostId = [...room.members.keys()][0] || null;
  }

  // ---------- Connexion / déconnexion ----------

  markConnected(room, member) {
    const wasDisconnected = !member.connected;
    member.connected = true;
    member.lastSeen = this.scheduler.now();
    this.clearTimer(room, `lobby:${member.id}`);
    this.clearTimer(room, 'empty');
    if (room.hostId === member.id) this.clearTimer(room, 'host');
    if (wasDisconnected) this.onMemberReconnected(room, member);
    this.touch(room);
    this.changed(room, false);
  }

  disconnect(playerId) {
    const room = this.roomOf(playerId);
    if (!room) return;
    const member = room.members.get(playerId);
    if (!member || !member.connected) return;
    member.connected = false;
    member.lastSeen = this.scheduler.now();

    if (room.status === 'attente') this.disconnectInLobby(room, member);
    if (room.hostId === playerId) {
      this.setTimer(room, 'host', this.timings.hostGraceMs, () => {
        const host = room.members.get(room.hostId);
        if (!host || !host.connected) {
          this.transferHost(room);
          this.changed(room, true);
        }
      });
    }
    if (![...room.members.values()].some((m) => m.connected)) {
      this.setTimer(room, 'empty', this.timings.emptyRoomMs, () => {
        if (this.rooms.has(room.id) && ![...room.members.values()].some((m) => m.connected)) this.deleteRoom(room);
      });
    }
    this.onMemberDisconnected(room, member);
    this.changed(room, false);
  }

  /** Un joueur absent du lobby libère sa place après le délai de grâce. */
  disconnectInLobby(room, member) {
    const playerId = member.id;
    this.setTimer(room, `lobby:${playerId}`, this.timings.lobbyGraceMs, () => {
      const m = room.members.get(playerId);
      if (m && !m.connected && room.status === 'attente') this.leave(room.id, playerId);
    });
  }

  // ---------- Actions de lobby ----------

  requireHost(room, playerId) {
    if (room.hostId !== playerId) throw new CodenamesError('Seul l\'hôte peut faire cela.');
  }

  requireLobby(room) {
    if (room.status === 'en_cours') throw new CodenamesError('Impossible pendant une manche.');
  }

  updateSettings(roomId, playerId, input) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, playerId);
    if (room.status !== 'attente') throw new CodenamesError('Les paramètres ne sont modifiables qu\'avant le lancement.');
    const before = room.settings.mode;
    room.settings = sanitizeSettings(input, room.settings);
    if (input && input.name !== undefined) {
      const name = cleanText(input.name, 40);
      if (name) room.name = name;
    }
    if (room.settings.mode !== before) this.reseatForMode(room);
    this.touch(room);
    this.changed(room, true);
    return room;
  }

  /** Après un changement de mode : réattribue équipes/côtés, excédent en spectateurs. */
  reseatForMode(room) {
    const max = maxPlayersFor(room.settings);
    const players = this.players(room).sort((a, b) => a.joinedAt - b.joinedAt);
    players.forEach((p, index) => {
      p.team = null;
      p.side = null;
      p.role = 'agent';
      if (index >= max) p.kind = 'spectateur';
    });
    for (const p of this.players(room)) this.placeNewPlayer(room, p);
  }

  /**
   * Choix d'une place : un joueur pour lui-même (répartition manuelle),
   * ou l'hôte pour n'importe qui. target : { kind, team, role, side }
   */
  assign(roomId, actorId, targetId, target = {}) {
    const room = this.requireRoom(roomId);
    this.requireLobby(room);
    const isHost = room.hostId === actorId;
    if (targetId !== actorId && !isHost) throw new CodenamesError('Seul l\'hôte peut déplacer les autres joueurs.');
    const member = room.members.get(targetId);
    if (!member) throw new CodenamesError('Joueur introuvable.');
    const s = room.settings;

    if (target.kind === 'spectateur') {
      if (!s.spectatorsAllowed && !isHost) throw new CodenamesError('Les spectateurs ne sont pas autorisés.');
      member.kind = 'spectateur';
      member.team = null;
      member.side = null;
      member.role = 'agent';
    } else {
      if (member.kind !== 'joueur') {
        if (this.players(room).length >= maxPlayersFor(s)) throw new CodenamesError('Il n\'y a plus de place de joueur.');
        member.kind = 'joueur';
        this.placeNewPlayer(room, member);
      }
      if (s.mode === 'classique') {
        if (s.classic.teamAssignment === 'aleatoire' && !isHost && target.team && target.team !== member.team) {
          throw new CodenamesError('Les équipes sont tirées au sort par l\'hôte.');
        }
        if (TEAMS.includes(target.team)) member.team = target.team;
        if (target.role === 'capitaine' || target.role === 'agent') {
          if (target.role === 'capitaine') {
            for (const p of this.players(room)) {
              if (p !== member && p.team === member.team && p.role === 'capitaine') p.role = 'agent';
            }
          }
          member.role = target.role;
        }
      } else if (target.side === 'A' || target.side === 'B') {
        const other = this.players(room).find((p) => p !== member && p.side === target.side);
        if (other) other.side = target.side === 'A' ? 'B' : 'A'; // échange des côtés
        member.side = target.side;
      }
    }
    this.touch(room);
    this.changed(room, true);
    return room;
  }

  /** Répartition aléatoire équilibrée des équipes et des capitaines (Classique). */
  shuffleTeams(roomId, actorId) {
    const room = this.requireRoom(roomId);
    this.requireHost(room, actorId);
    this.requireLobby(room);
    this.randomizeTeams(room);
    this.touch(room);
    this.changed(room, true);
  }

  randomizeTeams(room) {
    const players = shuffle(this.players(room), this.rng);
    const firstTeam = this.rng() < 0.5 ? 'rouge' : 'bleu';
    const secondTeam = firstTeam === 'rouge' ? 'bleu' : 'rouge';
    players.forEach((p, i) => {
      p.team = i % 2 === 0 ? firstTeam : secondTeam;
      p.role = 'agent';
    });
    for (const team of TEAMS) {
      const first = players.find((p) => p.team === team);
      if (first) first.role = 'capitaine';
    }
  }

  /** Vérifie la composition avant lancement, et nomme des capitaines si besoin. */
  validateLineup(room) {
    const s = room.settings;
    const players = this.players(room);
    if (s.mode === 'duo') {
      if (players.length !== 2) throw new CodenamesError('Le mode Duo se joue à exactement 2 joueurs.');
      const sides = new Set(players.map((p) => p.side));
      if (!sides.has('A') || !sides.has('B')) {
        players[0].side = 'A';
        players[1].side = 'B';
      }
      return;
    }
    if (players.length < CLASSIC_MIN_PLAYERS) {
      throw new CodenamesError(`Il faut au moins ${CLASSIC_MIN_PLAYERS} joueurs (2 par équipe).`);
    }
    for (const team of TEAMS) {
      const members = players.filter((p) => p.team === team);
      if (members.length < 2) throw new CodenamesError(`L'équipe ${team} doit compter au moins 2 joueurs.`);
      const captains = members.filter((p) => p.role === 'capitaine');
      if (captains.length === 0) {
        const chosen = members.find((p) => p.connected) || members[0];
        chosen.role = 'capitaine';
      }
      captains.slice(1).forEach((p) => { p.role = 'agent'; });
    }
  }

  // ---------- Timers ----------

  setTimer(room, key, ms, fn) {
    this.clearTimer(room, key);
    const handle = this.scheduler.setTimeout(() => {
      room.timers.delete(key);
      if (this.rooms.has(room.id)) fn();
    }, ms);
    room.timers.set(key, handle);
  }

  clearTimer(room, key) {
    const handle = room.timers.get(key);
    if (handle !== undefined) {
      this.scheduler.clearTimeout(handle);
      room.timers.delete(key);
    }
  }

  touch(room) {
    room.lastActivity = this.scheduler.now();
    this.armIdleTimer(room);
  }

  armIdleTimer(room) {
    this.setTimer(room, 'idle', this.timings.idleRoomMs, () => this.deleteRoom(room));
  }

  changed(room, listChanged) {
    this.onRoomChange(room);
    if (listChanged) this.onListChange();
  }
}

module.exports = { RoomManager, CodenamesError, TEAMS, realScheduler };
