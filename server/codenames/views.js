'use strict';

const { maxPlayersFor, SETTINGS_SCHEMA, CLASSIC_MIN_PLAYERS } = require('./settings');

/**
 * Projection de l'état d'un salon pour UN spectateur/joueur donné.
 * C'est le seul endroit qui décide de ce qu'un client a le droit de voir :
 * aucune autre fonction n'envoie d'état de jeu aux clients.
 */
function buildRoomView(room, viewerId, extras = {}) {
  const me = room.members.get(viewerId) || null;
  const members = [...room.members.values()]
    .sort((a, b) => a.joinedAt - b.joinedAt)
    .map((m) => ({
      id: m.id,
      name: m.name,
      kind: m.kind,
      team: m.team,
      role: m.role,
      side: m.side,
      connected: m.connected,
      isHost: m.id === room.hostId
    }));

  return {
    id: room.id,
    name: room.name,
    hostId: room.hostId,
    status: room.status,
    settings: room.settings,
    maxPlayers: maxPlayersFor(room.settings),
    minPlayers: room.settings.mode === 'duo' ? 2 : CLASSIC_MIN_PLAYERS,
    members,
    me: me ? { id: me.id, kind: me.kind, team: me.team, role: me.role, side: me.side, isHost: me.id === room.hostId } : null,
    match: { round: room.match.round, totalRounds: room.settings.classic.rounds, score: room.match.score, over: room.match.over },
    game: extras.gameView ? extras.gameView(room, me) : null,
    timer: extras.timerView ? extras.timerView(room) : null,
    notice: room.notice || null,
    paused: !!room.paused
  };
}

function schemaForClient() {
  return SETTINGS_SCHEMA;
}

module.exports = { buildRoomView, schemaForClient };
