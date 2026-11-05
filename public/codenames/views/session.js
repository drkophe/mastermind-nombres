/*
 * Contrôles de session, disponibles à tout moment pendant une partie :
 * retour au lobby (hôte), se retirer de la manche (devenir spectateur),
 * quitter le salon, et rejoindre une équipe en cours de partie (Classique).
 */
import { el, ICONS, icon, confirmDialog } from '/assets/ds/dom.js';
import { me, isHost } from '../state.js';
import { actions } from '../api.js';
import { mark, TEAM_PLURAL, TEAM_MARK } from './common.js';

const lobbyIcon = () => icon([['path', { d: 'M2.5 7.5L8 3l5.5 4.5V13a.5.5 0 0 1-.5.5H3a.5.5 0 0 1-.5-.5z' }], ['path', { d: 'M6.5 13.5v-4h3v4' }]], 14, '0 0 16 16');

function toolButton({ id, label, short, iconNode, onclick, danger }) {
  return el('button', {
    type: 'button', id,
    class: `ds-btn ds-btn--small cn-tool${danger ? ' ds-btn--danger' : ''}`,
    title: label, 'aria-label': label, onclick
  }, [iconNode, el('span', { class: 'cn-tool__label', text: short })]);
}

async function goLobby(room) {
  if (room.status === 'en_cours') {
    const ok = await confirmDialog({
      title: 'Revenir au lobby ?',
      text: 'La manche en cours sera interrompue pour tout le monde. Les équipes et les paramètres redeviendront modifiables.',
      confirmLabel: 'Revenir au lobby',
      danger: true
    });
    if (!ok) return;
  }
  actions.toLobby();
}

async function withdraw(room) {
  const m = me();
  const duo = room.settings.mode === 'duo';
  const playing = room.status === 'en_cours';
  let text = 'Vous deviendrez spectateur et resterez dans le salon, avec accès au chat général.';
  if (duo && playing) text = 'La partie s’arrêtera pour vous deux. Vous resterez dans le salon comme spectateur.';
  else if (m.role === 'capitaine' && playing) text += ' Un agent de votre équipe deviendra capitaine.';
  if (!duo) text += ' Vous pourrez rejoindre une équipe à tout moment.';
  const ok = await confirmDialog({ title: 'Se retirer de la partie ?', text, confirmLabel: 'Devenir spectateur', danger: duo && playing });
  if (ok) actions.withdraw();
}

async function leave(room) {
  const m = me();
  if (m && m.kind === 'joueur' && room.status === 'en_cours') {
    const duo = room.settings.mode === 'duo';
    const ok = await confirmDialog({
      title: 'Quitter le salon ?',
      text: duo
        ? 'La partie s’arrêtera pour vous deux et vous quitterez le salon.'
        : `Vous quitterez la partie et le salon.${m.role === 'capitaine' ? ' Un agent de votre équipe deviendra capitaine.' : ''}`,
      confirmLabel: 'Quitter',
      danger: true
    });
    if (!ok) return;
  }
  actions.leaveRoom();
}

/** Boutons de l'en-tête de partie. */
export function sessionTools(room) {
  const m = me();
  const tools = [];
  if (isHost()) {
    tools.push(toolButton({ id: 'cn-tool-lobby', label: 'Revenir au lobby', short: 'Lobby', iconNode: lobbyIcon(), onclick: () => goLobby(room) }));
  }
  if (m && m.kind === 'joueur') {
    tools.push(toolButton({ id: 'cn-tool-withdraw', label: 'Se retirer de la partie (devenir spectateur)', short: 'Spectateur', iconNode: ICONS.eye(), onclick: () => withdraw(room) }));
  }
  tools.push(toolButton({ id: 'cn-tool-leave', label: 'Quitter le salon', short: 'Quitter', iconNode: ICONS.exit(), onclick: () => leave(room), danger: true }));
  return el('div', { class: 'cn-tools', role: 'group', 'aria-label': 'Session' }, tools);
}

/** Spectateur en Classique : rejoindre une équipe pendant la partie. */
export function joinPanel(room) {
  const m = me();
  if (!m || m.kind !== 'spectateur' || room.settings.mode !== 'classique' || room.status === 'attente') return null;
  const players = room.members.filter((p) => p.kind === 'joueur');
  const full = players.length >= room.maxPlayers;
  const count = (team) => players.filter((p) => p.team === team).length;
  return el('section', { class: 'ds-panel ds-stack cn-join', 'aria-labelledby': 'cn-join-title' }, [
    el('div', { class: 'ds-panel__head' }, [
      el('h2', { class: 'ds-label', id: 'cn-join-title', text: 'Rejoindre la partie' }),
      el('span', { class: 'ds-small ds-faint', text: `${players.length}/${room.maxPlayers} joueurs` })
    ]),
    full
      ? el('p', { class: 'ds-small ds-muted', text: 'La partie est complète : vous pouvez continuer à regarder.' })
      : el('p', { class: 'ds-small ds-muted', text: 'Entrez dans une équipe comme agent, même en pleine manche.' }),
    full ? null : el('div', { class: 'cn-join__buttons' }, ['rouge', 'bleu'].map((team) => el('button', {
      type: 'button', class: 'ds-btn', id: `cn-join-${team}`,
      onclick: () => actions.joinTeam(team)
    }, [mark(TEAM_MARK[team]), `Rejoindre les ${TEAM_PLURAL[team]}`, el('span', { class: 'ds-faint', text: `(${count(team)})` })])))
  ]);
}
