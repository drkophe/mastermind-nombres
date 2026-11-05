/*
 * État des chats. Le filtrage (qui reçoit quoi) est fait côté serveur ;
 * le client ne fait que stocker ce qu'il reçoit et compter les non-lus.
 */
import { state } from './state.js';

const MAX_KEPT = 200;

export function onChatHistory(data) {
  const c = state.chat;
  c.teamKey = data.teamKey;
  c.messages.general = data.general || [];
  c.messages.equipe = data.equipe || [];
  c.unread = { general: 0, equipe: 0 };
  if (!c.teamKey && c.active === 'equipe') c.active = 'general';
}

export function onChatMessage(message) {
  const c = state.chat;
  const channel = message.channel === 'equipe' ? 'equipe' : 'general';
  c.messages[channel].push(message);
  if (c.messages[channel].length > MAX_KEPT) c.messages[channel].shift();
  const visible = c.active === channel && (!isDrawerMode() || state.ui.drawerOpen);
  if (!visible && message.authorId !== state.playerId) c.unread[channel]++;
}

export function setActiveChannel(channel) {
  state.chat.active = channel;
  state.chat.unread[channel] = 0;
}

export function totalUnread() {
  return state.chat.unread.general + state.chat.unread.equipe;
}

export function resetChat() {
  state.chat.active = 'general';
  state.chat.teamKey = null;
  state.chat.messages = { general: [], equipe: [] };
  state.chat.unread = { general: 0, equipe: 0 };
}

export const MOBILE_QUERY = '(max-width: 700px)';
export function isDrawerMode() {
  return window.matchMedia(MOBILE_QUERY).matches;
}
