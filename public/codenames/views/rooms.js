/*
 * Écran « Salons » : pseudo, création d'un salon, liste publique en temps réel.
 */
import { el, clear, replace, toast, storage, ICONS, icon } from '/assets/ds/dom.js';
import { state } from '../state.js';
import { actions } from '../api.js';
import { segmented, MODE_LABEL } from './common.js';

let built = null;
let createMode = 'classique';

function pseudo() {
  const value = built.pseudo.value.trim();
  if (!value) {
    toast('Choisissez d’abord un pseudo.', 'error');
    built.pseudo.focus();
    return null;
  }
  storage.set('cn-pseudo', value);
  return value;
}

function build(view) {
  const pseudoInput = el('input', { class: 'ds-field', id: 'cn-pseudo', type: 'text', maxlength: 20, autocomplete: 'nickname', placeholder: 'Votre pseudo', value: storage.get('cn-pseudo') || '' });
  const roomName = el('input', { class: 'ds-field', id: 'cn-room-name', type: 'text', maxlength: 40, placeholder: 'Salon de …' });
  const modeHost = el('div');
  const createBtn = el('button', { class: 'ds-btn ds-btn--primary ds-btn--block', type: 'submit', text: 'Créer un salon' });

  const form = el('form', { class: 'ds-panel ds-stack cn-create', 'aria-labelledby': 'cn-create-title', onsubmit: async (e) => {
    e.preventDefault();
    const name = pseudo();
    if (!name) return;
    createBtn.disabled = true;
    await actions.createRoom(name, roomName.value.trim(), createMode);
    createBtn.disabled = false;
  } }, [
    el('span', { class: 'ds-label', id: 'cn-create-title', text: 'Nouveau salon' }),
    el('label', { class: 'ds-form-row', for: 'cn-pseudo' }, ['Votre pseudo', pseudoInput]),
    el('label', { class: 'ds-form-row', for: 'cn-room-name' }, ['Nom du salon (facultatif)', roomName]),
    el('div', { class: 'ds-form-row' }, [el('span', { id: 'cn-mode-label', text: 'Mode' }), modeHost]),
    el('p', { class: 'ds-small ds-faint cn-mode-help', id: 'cn-mode-help' }),
    createBtn
  ]);

  const list = el('div', { class: 'cn-room-list', id: 'cn-room-list', 'aria-live': 'polite', 'aria-busy': 'true' });
  const counter = el('span', { class: 'ds-small ds-faint', id: 'cn-room-count' });
  const section = el('section', { class: 'cn-rooms', 'aria-labelledby': 'cn-rooms-title' }, [
    el('div', { class: 'cn-rooms__head' }, [
      el('h2', { class: 'ds-h2', id: 'cn-rooms-title', text: 'Salons publics' }),
      counter
    ]),
    list
  ]);

  replace(view, el('div', { class: 'cn-home' }, [form, section]));
  built = { view, pseudo: pseudoInput, modeHost, list, counter };
  renderMode();
}

function renderMode() {
  replace(built.modeHost, segmented({
    label: 'Mode du salon',
    labelledBy: 'cn-mode-label',
    options: [['classique', 'Classique'], ['duo', 'Duo']],
    value: createMode,
    block: true,
    onChange: (value) => { createMode = value; renderMode(); }
  }));
  document.getElementById('cn-mode-help').textContent = createMode === 'duo'
    ? 'Coopératif à 2 joueurs contre le jeu, avec jetons de temps.'
    : 'Deux équipes, Rouges contre Bleus, de 4 à 12 joueurs.';
}

function roomCard(room) {
  const full = room.players >= room.maxPlayers;
  const canPlay = room.status === 'attente' && !full;
  const statusText = room.status === 'attente' ? 'En attente' : 'En cours';
  const join = async (asSpectator) => {
    const name = pseudo();
    if (name) await actions.joinRoom(room.id, name, asSpectator);
  };
  return el('article', { class: 'cn-room', 'aria-label': `Salon ${room.name}` }, [
    el('div', { class: 'cn-room__main' }, [
      el('div', { class: 'cn-room__title' }, [
        el('h3', { class: 'cn-room__name', text: room.name }),
        el('span', { class: `cn-status cn-status--${room.status}` }, [el('span', { class: 'cn-status__dot', 'aria-hidden': 'true' }), statusText])
      ]),
      el('p', { class: 'cn-room__host ds-small ds-muted' }, [ICONS.star(), `Hôte : ${room.hostName}`]),
      el('div', { class: 'cn-room__facts' }, [
        el('span', { class: 'ds-pill', text: MODE_LABEL[room.mode] }),
        el('span', { class: 'ds-pill', 'aria-label': `${room.players} joueurs sur ${room.maxPlayers}` }, [el('span', { class: 'ds-pill__num', text: `${room.players}/${room.maxPlayers}` }), 'joueurs']),
        room.spectators ? el('span', { class: 'ds-pill' }, [ICONS.eye(), `${room.spectators} spectateur${room.spectators > 1 ? 's' : ''}`]) : null
      ]),
      el('p', { class: 'ds-small ds-faint cn-room__details', text: room.details.join(' · ') })
    ]),
    el('div', { class: 'cn-room__actions' }, [
      el('button', {
        class: 'ds-btn ds-btn--primary', disabled: !canPlay, onclick: () => join(false),
        title: canPlay ? '' : full ? 'Salon complet' : 'Partie en cours',
        text: canPlay ? 'Rejoindre' : full ? 'Complet' : 'En cours'
      }),
      room.spectatorsAllowed ? el('button', { class: 'ds-btn', onclick: () => join(true) }, [ICONS.eye(), 'Regarder']) : null
    ])
  ]);
}

function emptyState() {
  return el('div', { class: 'cn-empty' }, [
    el('span', { class: 'cn-empty__icon' }, [icon([['circle', { cx: 14, cy: 14, r: 8.5 }], ['path', { d: 'M20.5 20.5L28 28' }]], 40)]),
    el('p', { class: 'cn-empty__title ds-serif', text: 'Aucun salon ouvert pour l’instant' }),
    el('p', { class: 'ds-small ds-muted', text: 'Créez le premier : vos amis pourront le rejoindre depuis cette liste ou grâce au lien du salon.' }),
    el('button', { class: 'ds-btn', onclick: () => built.pseudo.focus(), text: 'Créer un salon' })
  ]);
}

export function renderRooms(view, header) {
  if (!built || built.view !== view || !view.contains(built.list)) build(view);
  clear(header);
  const rooms = state.rooms;
  if (rooms === null) {
    built.list.setAttribute('aria-busy', 'true');
    replace(built.list, [0, 1, 2].map(() => el('div', { class: 'ds-skeleton cn-room-skeleton', 'aria-hidden': 'true' })));
    built.counter.textContent = 'Chargement…';
    return;
  }
  built.list.setAttribute('aria-busy', 'false');
  built.counter.textContent = rooms.length ? `${rooms.length} salon${rooms.length > 1 ? 's' : ''} · mis à jour en direct` : '';
  replace(built.list, rooms.length ? rooms.map(roomCard) : emptyState());
}
