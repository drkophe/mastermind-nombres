/*
 * Envoi des actions au serveur. Les noms d'événements et les charges utiles
 * sont exactement ceux attendus par server/codenames/index.js.
 */
import { toast } from '/assets/ds/dom.js';
import { state } from './state.js';

export function emit(event, payload) {
  return new Promise((resolve) => {
    if (!state.socket) {
      resolve({ ok: false });
      return;
    }
    state.socket.emit(event, payload || {}, (res) => {
      if (res && !res.ok && res.error) toast(res.error, 'error');
      resolve(res || { ok: false });
    });
  });
}

export const actions = {
  createRoom: (playerName, roomName, mode) => emit('room:create', { playerName, roomName, settings: { mode } }),
  joinRoom: (roomId, playerName, asSpectator) => emit('room:join', { roomId, playerName, asSpectator }),
  leaveRoom: () => emit('room:leave'),
  updateSettings: (settings) => emit('room:settings', { settings }),
  assign: (target) => emit('room:assign', target),
  shuffle: () => emit('room:shuffle'),
  transferHost: (playerId) => emit('room:transfer-host', { playerId }),
  start: () => emit('game:start'),
  clue: (word, count) => emit('game:clue', { word, count }),
  guess: (index) => emit('game:guess', { index }),
  pass: () => emit('game:pass'),
  next: () => emit('game:next'),
  toLobby: () => emit('game:lobby'),
  promote: (playerId) => emit('game:promote', { playerId }),
  sendChat: (channel, text) => emit('chat:send', { channel, text }),
  definition: (index) => emit('definition:get', { index })
};
