/*
 * Codenames — point d'entrée client.
 * Connexion Socket.IO (namespace /codenames, jeton de session), réception des
 * vues personnalisées envoyées par le serveur, et aiguillage entre les écrans.
 */
import { $, clear, toast, storage } from '/assets/ds/dom.js';
import { state, subscribe, notify } from './state.js';
import { actions } from './api.js';
import { renderRooms } from './views/rooms.js';
import { renderLobby } from './views/lobby.js';
import { renderGame } from './views/game.js';
import { onChatHistory, onChatMessage, resetChat } from './chat-state.js';
import { unmountSide } from './views/side.js';
import { setPhaseTint } from '/assets/ds/phase-tint.js';
import { duoPhaseInfo } from './views/duo.js';

let currentView = null;

function connect() {
  const token = storage.get('cn-token') || undefined;
  const socket = io('/codenames', { auth: { token } });
  state.socket = socket;

  socket.on('session', (data) => {
    // Nouvelle identité alors qu'on était dans un salon : le serveur a redémarré
    // (tout est en mémoire), la partie n'existe plus.
    if (state.playerId && data.playerId !== state.playerId && state.room) {
      state.room = null;
      resetChat();
      const url = new URL(location.href);
      url.searchParams.delete('salon');
      history.replaceState(null, '', url);
      toast('Le serveur a redémarré : la partie en cours a été perdue.', 'error', 7000);
    }
    storage.set('cn-token', data.token);
    socket.auth = { token: data.token };
    state.playerId = data.playerId;
    state.schema = data.schema;
    state.connection = 'online';
    if (!state.room) {
      socket.emit('rooms:subscribe', {});
      autoJoinFromUrl();
    }
    notify();
  });

  socket.on('rooms:list', (list) => {
    state.rooms = list;
    notify();
  });

  socket.on('room:state', (view) => {
    if (view.timer) view.timer.receivedAt = Date.now();
    const entering = !state.room || state.room.id !== view.id;
    state.room = view;
    if (entering) onEnterRoom(view);
    notify();
  });

  socket.on('room:left', () => {
    resetChat();
    state.room = null;
    state.ui.selected = null;
    const url = new URL(location.href);
    url.searchParams.delete('salon');
    history.replaceState(null, '', url);
    socket.emit('rooms:subscribe', {});
    notify();
  });

  socket.on('chat:history', (data) => { onChatHistory(data); notify(); });
  socket.on('chat:message', (msg) => { onChatMessage(msg); notify(); });

  socket.on('disconnect', () => {
    state.connection = 'offline';
    notify();
  });
  socket.io.on('reconnect', () => {
    state.connection = 'online';
    toast('Reconnecté.');
    notify();
  });
  socket.on('connect_error', () => {
    state.connection = 'offline';
    notify();
  });
}

function onEnterRoom(view) {
  state.socket.emit('rooms:unsubscribe', {});
  const url = new URL(location.href);
  url.searchParams.set('salon', view.id);
  history.replaceState(null, '', url);
  $('view').focus({ preventScroll: true });
}

/** Lien partagé (?salon=ID) : rejoint automatiquement si un pseudo est connu. */
export function autoJoinFromUrl() {
  const roomId = new URLSearchParams(location.search).get('salon');
  const name = storage.get('cn-pseudo');
  if (roomId && name && !state.room) actions.joinRoom(roomId, name, false);
}

function renderConnection() {
  const banner = $('conn-banner');
  if (state.connection === 'offline') {
    banner.hidden = false;
    banner.textContent = 'Connexion perdue — reconnexion en cours… Votre place est conservée.';
  } else {
    banner.hidden = true;
  }
}

function render() {
  // Les panneaux sont reconstruits à chaque état : on restaure le focus clavier par id.
  const focusedId = document.activeElement && document.activeElement !== document.body ? document.activeElement.id : null;
  renderConnection();
  const room = state.room;
  const name = !room ? 'rooms' : room.status === 'attente' ? 'lobby' : 'game';
  const view = $('view');
  const header = $('header-extra');
  if (name !== currentView) {
    clear(view);
    clear(header);
    view.dataset.view = name;
    document.body.dataset.view = name;
    currentView = name;
  }
  if (name !== 'game') setPhaseTint(null);
  if (name === 'rooms') { unmountSide(); renderRooms(view, header); }
  else if (name === 'lobby') renderLobby(view, header);
  else renderGame(view, header);
  // Onglet : « (À vous) » quand c'est à moi d'agir en Duo.
  const myTurn = room && room.game && room.game.mode === 'duo' && duoPhaseInfo(room).myTurn;
  document.title = room ? `${myTurn ? '(À vous) ' : ''}Codenames — ${room.name}` : 'Codenames — Jeux Multijoueurs';
  if (focusedId) {
    const again = document.getElementById(focusedId);
    if (again && again !== document.activeElement && !again.disabled) again.focus({ preventScroll: true });
  }
}

subscribe(render);
connect();
notify();
