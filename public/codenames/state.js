/*
 * État client de Codenames. Le serveur reste la source de vérité :
 * `room` est la dernière vue personnalisée reçue (room:state).
 * `ui` ne contient que des préférences d'affichage locales (sélection d'une carte…).
 */
export const state = {
  socket: null,
  playerId: null,
  schema: null,
  rooms: null, // null = chargement en cours
  room: null,
  connection: 'connecting', // connecting | online | offline
  chat: {
    active: 'general',
    teamKey: null,
    messages: { general: [], equipe: [] },
    unread: { general: 0, equipe: 0 }
  },
  ui: {
    selected: null, // index de la carte sélectionnée (validation en deux temps)
    selectionKey: null,
    clueCount: 1,
    definition: null, // { index, loading, word, definition }
    drawerOpen: false,
    prevRevealed: null,
    boardKey: null
  }
};

const listeners = new Set();

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

let scheduled = false;
/** Demande un nouveau rendu (regroupé à la frame suivante). */
export function notify() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    listeners.forEach((fn) => fn(state));
  });
}

export const me = () => (state.room && state.room.me) || null;
export const isHost = () => !!(me() && me().isHost);
