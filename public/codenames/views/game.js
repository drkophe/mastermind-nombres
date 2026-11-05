/*
 * Écran de partie : en-tête (rôle, scores), ligne de statut, plateau,
 * panneaux latéraux. Le contenu dépend du mode et du rôle réel du joueur.
 */
import { el, replace, clear, ICONS } from '/assets/ds/dom.js';
import { state, notify, isHost } from '../state.js';
import { actions } from '../api.js';
import { renderBoard } from './board.js';
import { classicCards, classicStatus, classicActionPanel, classicHeader, setRerender } from './classic.js';
import { duoCards, duoStatus, duoActionPanel, duoHeader, setDuoRerender, DUO_END } from './duo.js';
import { mountSide } from './side.js';
import { MOBILE_QUERY } from '../chat-state.js';
import { TEAM_PLURAL, other } from './common.js';
import { renderTimer } from './timer.js';
import { historyPanel, definitionPanel, noticeBanner, showDefinition } from './extras.js';

setRerender(notify);
setDuoRerender(notify);

// Colonnes empilées (mobile et tablette) : le panneau d'action passe au-dessus du plateau.
const mobile = window.matchMedia('(max-width: 1000px)');
mobile.addEventListener('change', () => notify());
window.matchMedia(MOBILE_QUERY).addEventListener('change', () => notify());

let layout = null;

function build(view) {
  const notice = el('div', { class: 'cn-notices', id: 'cn-notices' });
  const status = el('div', { class: 'cn-status-slot' });
  const timer = el('div', { class: 'cn-timer-slot' });
  const actionTop = el('div', { class: 'cn-action-top' });
  const board = el('div', { class: 'cn-board' });
  const below = el('div', { class: 'cn-below-board' });
  const main = el('section', { class: 'cn-main', 'aria-label': 'Plateau de jeu' }, [status, timer, actionTop, board, below]);
  const live = el('p', { class: 'sr-only', id: 'cn-live', 'aria-live': 'polite' });
  const actionSide = el('div', { class: 'cn-action-side' });
  const endSlot = el('div', { class: 'cn-end-slot' });
  const sideExtra = el('div', { class: 'cn-side-extra' });
  const side = el('aside', { class: 'cn-side', 'aria-label': 'Indice et discussion' }, [endSlot, actionSide, sideExtra]);
  replace(view, [notice, live, el('div', { class: 'cn-columns cn-game' }, [main, side])]);
  layout = { view, notice, live, status, timer, actionTop, board, below, actionSide, endSlot, sideExtra, lastAnnounce: null };
}

/** Fin de manche : résultat, score cumulé, suite (hôte), invitation aux définitions. */
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
  } else {
    title = g.result === 'victoire' ? 'Mission réussie' : 'Mission échouée';
    reason = DUO_END[g.endReason] || '';
  }
  const rotation = g.mode === 'classique' && room.settings.classic.captainMode !== 'fixe';
  const multi = g.mode === 'classique' && room.match.totalRounds > 1;
  const score = multi ? el('div', { class: 'cn-end__score', 'aria-label': `Score : Rouges ${room.match.score.rouge}, Bleus ${room.match.score.bleu}` }, [
    el('span', { class: 'cn-end__team cn-end__team--rouge' }, ['Rouges', el('b', { text: String(room.match.score.rouge) })]),
    el('span', { class: 'ds-faint', text: '–' }),
    el('span', { class: 'cn-end__team cn-end__team--bleu' }, [el('b', { text: String(room.match.score.bleu) }), 'Bleus']),
    el('span', { class: 'ds-small ds-faint cn-end__round', text: room.match.over ? `Partie en ${room.match.totalRounds} manches terminée` : `Manche ${room.match.round} sur ${room.match.totalRounds}` })
  ]) : null;
  const buttons = isHost()
    ? [
      el('button', { class: 'ds-btn ds-btn--primary', id: 'cn-next', type: 'button', onclick: () => actions.next(), text: room.match.over ? (g.mode === 'duo' ? 'Rejouer' : 'Nouvelle partie') : 'Manche suivante' }),
      rotation ? el('span', { class: 'ds-small ds-faint', text: 'Les capitaines changeront à la prochaine manche.' }) : null,
      el('button', { class: 'ds-btn', id: 'cn-lobby', type: 'button', onclick: () => actions.toLobby(), text: 'Retour au lobby' })
    ]
    : [el('p', { class: 'ds-small ds-faint', text: 'En attente de l’hôte pour la suite…' })];
  return el('section', { class: 'ds-panel ds-stack cn-end', 'aria-live': 'polite' }, [
    el('span', { class: 'ds-label', text: room.match.over ? 'Partie terminée' : 'Manche terminée' }),
    el('h2', { class: `cn-end__title${g.winner ? ` cn-end__title--${g.winner}` : ''}${g.result ? ` cn-end__title--${g.result}` : ''}`, text: title }),
    reason ? el('p', { class: 'ds-small ds-muted cn-end__reason', text: reason }) : null,
    score,
    el('p', { class: 'ds-small ds-faint cn-end__hint' }, [ICON_BOOK(), 'Cliquez sur un mot du plateau pour voir sa définition.']),
    ...buttons
  ]);
}

const ICON_BOOK = () => ICONS.book();

/** Annonce les révélations aux lecteurs d'écran (dernier événement de l'historique). */
function announce(room) {
  const last = room.game.history[room.game.history.length - 1];
  const key = `${room.match.round}:${room.game.history.length}`;
  if (!last || layout.lastAnnounce === key) return;
  const first = layout.lastAnnounce === null;
  layout.lastAnnounce = key;
  if (first) return;
  let text = '';
  if (last.type === 'indice') text = `Nouvel indice : ${last.word} ${last.count}.`;
  else if (last.type === 'carte') text = `${last.word} révélé : ${last.color === 'neutre' && room.game.mode === 'duo' ? 'passant' : last.color}.`;
  else if (last.type === 'fin-tour') text = 'Fin du tour.';
  else if (last.type === 'fin') text = 'Fin de la manche.';
  if (text) layout.live.textContent = text;
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
    pills = duoHeader(room);
    replace(layout.status, duoStatus(room));
    renderBoard(layout.board, duoCards(room), `${room.id}:${room.match.round}:${g.words.join(',')}`, 'Plateau de 25 mots, vu depuis votre face de la clé');
    action = duoActionPanel(room);
  }
  // Fin de manche : chaque mot devient cliquable pour afficher sa définition.
  if (room.status === 'terminee') {
    layout.board.querySelectorAll('.cn-card').forEach((card) => {
      const index = Number(card.dataset.index);
      const button = el('button', { class: `${card.className.replace('is-static', '')} is-definable`, type: 'button', 'aria-label': `${card.getAttribute('aria-label')}. Voir la définition`, dataset: { index: String(index) }, onclick: () => showDefinition(index) });
      while (card.firstChild) button.appendChild(card.firstChild);
      card.replaceWith(button);
    });
  }
  replace(layout.notice, noticeBanner(room));
  renderTimer(layout.timer, room.timer, room.status === 'en_cours');
  announce(room);
  replace(header, pills);
  const end = room.status === 'terminee' ? endPanel(room) : null;

  // Mobile : le panneau d'action (ou de fin) passe au-dessus du plateau pour rester visible.
  if (mobile.matches) {
    clear(layout.actionSide);
    clear(layout.endSlot);
    replace(layout.actionTop, end || action);
  } else {
    clear(layout.actionTop);
    replace(layout.endSlot, end);
    replace(layout.actionSide, action);
  }

  mountSide(layout.sideExtra, { context: 'game', extra: [definitionPanel(room), historyPanel(room)] });
}
