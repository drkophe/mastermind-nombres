/*
 * Écran de partie : en-tête (rôle, scores), ligne de statut, plateau,
 * panneaux latéraux. Le contenu dépend du mode et du rôle réel du joueur.
 */
import { el, replace, clear } from '/assets/ds/dom.js';
import { state, notify, isHost } from '../state.js';
import { actions } from '../api.js';
import { renderBoard } from './board.js';
import { classicCards, classicStatus, classicActionPanel, classicHeader, setRerender } from './classic.js';
import { mountSide } from './side.js';
import { MOBILE_QUERY } from '../chat-state.js';
import { TEAM_PLURAL, other } from './common.js';

setRerender(notify);

const mobile = window.matchMedia(MOBILE_QUERY);
mobile.addEventListener('change', () => notify());

let layout = null;

function build(view) {
  const notice = el('div', { class: 'cn-notices', id: 'cn-notices' });
  const status = el('div', { class: 'cn-status-slot' });
  const timer = el('div', { class: 'cn-timer-slot' });
  const actionTop = el('div', { class: 'cn-action-top' });
  const board = el('div', { class: 'cn-board' });
  const below = el('div', { class: 'cn-below-board' });
  const main = el('section', { class: 'cn-main', 'aria-label': 'Plateau de jeu' }, [status, timer, actionTop, board, below]);
  const actionSide = el('div', { class: 'cn-action-side' });
  const endSlot = el('div', { class: 'cn-end-slot' });
  const sideExtra = el('div', { class: 'cn-side-extra' });
  const side = el('aside', { class: 'cn-side', 'aria-label': 'Indice et discussion' }, [endSlot, actionSide, sideExtra]);
  replace(view, [notice, el('div', { class: 'cn-columns cn-game' }, [main, side])]);
  layout = { view, notice, status, timer, actionTop, board, below, actionSide, endSlot, sideExtra };
}

/** Fin de manche (version simple, enrichie avec l'historique et les définitions). */
function endPanel(room) {
  const g = room.game;
  let title = 'Manche terminée';
  let reason = '';
  if (g.mode === 'classique') {
    if (g.winner) {
      title = `Les ${TEAM_PLURAL[g.winner]} gagnent`;
      reason = g.endReason === 'assassin'
        ? `Les ${TEAM_PLURAL[other(g.winner)]} ont révélé l’assassin.`
        : `Tous les agents ${g.winner === 'rouge' ? 'rouges' : 'bleus'} ont été retrouvés.`;
    } else {
      reason = 'La manche a été interrompue.';
    }
  }
  const buttons = isHost()
    ? [
      el('button', { class: 'ds-btn ds-btn--primary', id: 'cn-next', type: 'button', onclick: () => actions.next(), text: room.match.over ? 'Nouvelle partie' : 'Manche suivante' }),
      el('button', { class: 'ds-btn', id: 'cn-lobby', type: 'button', onclick: () => actions.toLobby(), text: 'Retour au lobby' })
    ]
    : [el('p', { class: 'ds-small ds-faint', text: 'En attente de l’hôte pour la suite…' })];
  return el('section', { class: 'ds-panel ds-stack cn-end', 'aria-live': 'polite' }, [
    el('span', { class: 'ds-label', text: room.match.over ? 'Partie terminée' : 'Manche terminée' }),
    el('h2', { class: `cn-end__title${g.winner ? ` cn-end__title--${g.winner}` : ''}`, text: title }),
    reason ? el('p', { class: 'ds-small ds-muted cn-end__reason', text: reason }) : null,
    ...buttons
  ]);
}

export function renderGame(view, header) {
  if (!layout || layout.view !== view || !view.contains(layout.board)) build(view);
  const room = state.room;
  const g = room.game;
  if (!g) return;

  let pills = [];
  let action = null;
  if (g.mode === 'classique') {
    pills = classicHeader(room);
    replace(layout.status, classicStatus(room));
    renderBoard(layout.board, classicCards(room), `${room.id}:${room.match.round}:${g.words.join(',')}`, 'Plateau de 25 mots');
    action = classicActionPanel(room);
  } else {
    replace(layout.status, el('p', { class: 'ds-muted', text: 'Mode Duo en cours…' }));
    clear(layout.board);
  }
  replace(header, pills);
  replace(layout.endSlot, room.status === 'terminee' ? endPanel(room) : null);

  // Mobile : le panneau d'action passe au-dessus du plateau pour rester visible.
  const target = mobile.matches ? layout.actionTop : layout.actionSide;
  const otherSlot = mobile.matches ? layout.actionSide : layout.actionTop;
  clear(otherSlot);
  replace(target, action);

  mountSide(layout.sideExtra, { context: 'game' });
}
