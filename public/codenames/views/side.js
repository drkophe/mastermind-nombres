/*
 * Colonne latérale : chats à onglets (Général / Équipe ou Duo), liste des joueurs.
 * Sur mobile (≤ 700 px), le chat passe dans un tiroir ouvert par un bouton flottant.
 */
import { el, replace, clear, ICONS } from '/assets/ds/dom.js';
import { state, notify } from '../state.js';
import { actions } from '../api.js';
import { setActiveChannel, totalUnread, isDrawerMode } from '../chat-state.js';
import { mark, memberName, copyRoomLink, TEAM_LABEL, TEAM_MARK } from './common.js';

let chat = null; // panneau de chat persistant (conserve la saisie)
let drawer = null;
let fab = null;
let renderedSignature = null;

// ---------- Chat ----------

function channelLabel(key) {
  if (key === 'general') return 'Général';
  if (state.chat.teamKey === 'duo') return 'Duo';
  return 'Équipe';
}

function buildChat() {
  const input = el('input', { class: 'ds-field', id: 'cn-chat-input', type: 'text', maxlength: 300, autocomplete: 'off', placeholder: 'Écrire un message', 'aria-label': 'Message' });
  const tabs = el('div', { class: 'ds-seg ds-seg--block cn-chat__tabs', role: 'tablist', 'aria-label': 'Canaux de discussion' });
  const hint = el('p', { class: 'cn-chat__hint ds-small ds-faint', id: 'cn-chat-hint' });
  const msgs = el('div', { class: 'ds-chat__msgs', id: 'cn-chat-msgs', role: 'tabpanel', 'aria-live': 'polite', 'aria-relevant': 'additions', tabindex: '0' });
  const form = el('form', { class: 'ds-chat__form', onsubmit: async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const res = await actions.sendChat(state.chat.active, text);
    if (res.ok) input.value = '';
  } }, [input, el('button', { type: 'submit', class: 'ds-btn ds-btn--square', 'aria-label': 'Envoyer le message' }, [ICONS.send()])]);
  const head = el('div', { class: 'ds-panel__head' }, [el('h2', { class: 'ds-label', id: 'cn-chat-title', text: 'Discussion' }), null]);
  const closeBtn = el('button', { class: 'ds-btn ds-btn--small ds-btn--square cn-drawer-close', type: 'button', 'aria-label': 'Fermer la discussion', onclick: () => setDrawer(false) }, [ICONS.close()]);
  head.appendChild(closeBtn);
  const panel = el('section', { class: 'ds-panel ds-chat cn-chat', 'aria-labelledby': 'cn-chat-title' }, [head, tabs, hint, msgs, form]);
  chat = { panel, input, tabs, hint, msgs };
}

function renderTabs() {
  const c = state.chat;
  const keys = c.teamKey ? ['general', 'equipe'] : ['general'];
  replace(chat.tabs, keys.map((key) => {
    const unread = c.unread[key];
    return el('button', {
      type: 'button', class: 'ds-seg__item', role: 'tab', id: `cn-tab-${key}`,
      'aria-selected': c.active === key ? 'true' : 'false', 'aria-controls': 'cn-chat-msgs',
      tabindex: c.active === key ? '0' : '-1',
      onclick: () => { setActiveChannel(key); renderedSignature = null; notify(); },
      onkeydown: (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const next = keys[(keys.indexOf(key) + 1) % keys.length];
          setActiveChannel(next);
          renderedSignature = null;
          notify();
          requestAnimationFrame(() => { const t = document.getElementById(`cn-tab-${next}`); if (t) t.focus(); });
        }
      }
    }, [channelLabel(key), unread ? el('span', { class: 'ds-badge', 'aria-label': `${unread} non lu${unread > 1 ? 's' : ''}`, text: String(unread) }) : null]);
  }));
  chat.msgs.setAttribute('aria-labelledby', `cn-tab-${c.active}`);
  chat.hint.textContent = c.active === 'general'
    ? 'Visible par tous, spectateurs compris.'
    : c.teamKey === 'duo' ? 'Privé : visible uniquement par vous deux.' : `Visible uniquement par l’équipe ${TEAM_LABEL[c.teamKey]} (capitaine compris).`;
  chat.input.placeholder = c.active === 'general' ? 'Écrire à tout le salon' : c.teamKey === 'duo' ? 'Écrire à votre partenaire' : 'Écrire à l’équipe';
}

function authorClass(m) {
  if (m.authorRole === 'spectateur') return 'ds-msg__author--spectator';
  if (m.authorTeam === 'rouge') return 'ds-msg__author--red';
  if (m.authorTeam === 'bleu') return 'ds-msg__author--blue';
  if (m.authorTeam === 'A' || m.authorTeam === 'B') return 'ds-msg__author--green';
  return '';
}

function time(ts) {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function renderMessages() {
  const c = state.chat;
  const list = c.messages[c.active];
  const signature = `${c.active}:${list.length}:${list.length ? list[list.length - 1].id : ''}`;
  if (signature === renderedSignature) return;
  renderedSignature = signature;
  const box = chat.msgs;
  const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  if (!list.length) {
    replace(box, el('p', { class: 'ds-chat__empty', text: 'Aucun message pour l’instant.' }));
    return;
  }
  replace(box, list.map((m) => {
    const mine = m.authorId === state.playerId;
    return el('div', { class: `ds-msg${mine ? ' ds-msg--mine' : ''}` }, [
      el('span', { class: `ds-msg__author ${mine ? '' : authorClass(m)}`, text: mine ? 'Vous' : m.authorName }),
      m.authorRole === 'capitaine' ? el('span', { class: 'ds-faint', text: ' (capitaine)' }) : null,
      ' · ',
      m.text,
      el('span', { class: 'ds-msg__time', text: time(m.at) })
    ]);
  }));
  if (nearBottom || list[list.length - 1].authorId === state.playerId) box.scrollTop = box.scrollHeight;
}

// ---------- Tiroir mobile ----------

function ensureDrawer() {
  if (drawer) return;
  const backdrop = el('div', { class: 'ds-drawer-backdrop', hidden: true, onclick: () => setDrawer(false) });
  const sheet = el('div', { class: 'cn-drawer', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Discussion', hidden: true, onkeydown: (e) => { if (e.key === 'Escape') setDrawer(false); } });
  fab = el('button', { class: 'ds-fab cn-fab', type: 'button', 'aria-haspopup': 'dialog', hidden: true, onclick: () => setDrawer(true) });
  document.body.append(backdrop, sheet, fab);
  drawer = { backdrop, sheet };
}

function setDrawer(open) {
  state.ui.drawerOpen = open;
  if (open) setActiveChannel(state.chat.active);
  renderedSignature = null;
  notify();
  // Le rendu a lieu à la frame suivante : on déplace le focus juste après.
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (open) chat.input.focus();
    else if (fab && !fab.hidden) fab.focus();
  }));
}

function renderFab() {
  const unread = totalUnread();
  replace(fab, [ICONS.chat(), 'Discussion', unread ? el('span', { class: 'ds-badge', text: String(unread) }) : null]);
  fab.setAttribute('aria-label', unread ? `Ouvrir la discussion, ${unread} message${unread > 1 ? 's' : ''} non lu${unread > 1 ? 's' : ''}` : 'Ouvrir la discussion');
}

// ---------- Joueurs ----------

function rosterPanel() {
  const room = state.room;
  const players = room.members.filter((m) => m.kind === 'joueur');
  const spectators = room.members.filter((m) => m.kind === 'spectateur');
  const row = (m, extra) => el('li', { class: `cn-roster__row${m.connected ? '' : ' is-offline'}` }, [
    el('span', { class: `cn-presence${m.connected ? ' is-on' : ''}`, 'aria-hidden': 'true' }),
    el('span', { class: 'cn-member__name', text: memberName(m) }),
    m.isHost ? el('span', { class: 'cn-host', 'aria-label': 'hôte' }, [ICONS.star()]) : null,
    extra ? el('span', { class: 'cn-role is-captain' }, extra) : null,
    m.connected ? null : el('span', { class: 'ds-small ds-faint', text: 'déconnecté' })
  ]);
  const groups = [];
  if (room.settings.mode === 'classique') {
    for (const team of ['rouge', 'bleu']) {
      const members = players.filter((m) => m.team === team).sort((a, b) => (b.role === 'capitaine') - (a.role === 'capitaine'));
      groups.push(el('div', { class: 'cn-roster__group' }, [
        el('span', { class: 'cn-roster__title' }, [mark(TEAM_MARK[team]), `Équipe ${TEAM_LABEL[team]}`]),
        el('ul', { class: 'cn-roster__list' }, members.map((m) => row(m, m.role === 'capitaine' ? [ICONS.hat(), 'Capitaine'] : null)))
      ]));
    }
  } else {
    groups.push(el('div', { class: 'cn-roster__group' }, [
      el('span', { class: 'cn-roster__title' }, [mark('green'), 'Joueurs']),
      el('ul', { class: 'cn-roster__list' }, players.sort((a, b) => (a.side || '').localeCompare(b.side || '')).map((m) => row(m, [`Joueur ${m.side}`])))
    ]));
  }
  if (spectators.length) {
    groups.push(el('div', { class: 'cn-roster__group' }, [
      el('span', { class: 'cn-roster__title' }, [ICONS.eye(), 'Spectateurs']),
      el('ul', { class: 'cn-roster__list' }, spectators.map((m) => row(m)))
    ]));
  }
  const wasOpen = document.getElementById('cn-roster') ? document.getElementById('cn-roster').open : false;
  return el('details', { class: 'ds-panel ds-details cn-roster', id: 'cn-roster', open: wasOpen }, [
    el('summary', { class: 'ds-label' }, [`Joueurs · ${players.length}${spectators.length ? ` + ${spectators.length} spectateur${spectators.length > 1 ? 's' : ''}` : ''}`]),
    el('div', { class: 'cn-roster__body' }, [
      ...groups,
      el('div', { class: 'cn-roster__actions' }, [
        el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: copyRoomLink }, [ICONS.link(), 'Copier le lien du salon'])
      ])
    ])
  ]);
}

/**
 * Monte la colonne latérale dans `host`.
 * options.context : 'lobby' | 'game' ; options.before : nœuds à placer avant le chat (historique…).
 */
export function mountSide(host, options = {}) {
  if (!chat) buildChat();
  ensureDrawer();
  const drawerMode = isDrawerMode();
  if (!drawerMode && state.ui.drawerOpen) state.ui.drawerOpen = false;

  renderTabs();
  renderMessages();

  const nodes = [];
  (options.extra || []).forEach((n) => { if (n) nodes.push(n); });
  if (options.context === 'game') nodes.push(rosterPanel());

  // Seule la zone « extra » est remplacée : le chat n'est jamais réinséré inutilement
  // (sinon le défilement des messages serait perdu).
  let extra = host.querySelector(':scope > .cn-side-extra-box');
  if (!extra) {
    extra = el('div', { class: 'cn-side-extra-box' });
    replace(host, extra);
  }
  replace(extra, nodes);

  if (drawerMode) {
    if (chat.panel.parentNode !== drawer.sheet) replace(drawer.sheet, chat.panel);
    const open = state.ui.drawerOpen;
    drawer.sheet.hidden = !open;
    drawer.backdrop.hidden = !open;
    fab.hidden = open;
    document.body.classList.toggle('cn-drawer-open', open);
    renderFab();
  } else {
    if (chat.panel.parentNode !== host) host.appendChild(chat.panel);
    drawer.sheet.hidden = true;
    drawer.backdrop.hidden = true;
    fab.hidden = true;
    clear(drawer.sheet);
    document.body.classList.remove('cn-drawer-open');
  }
}

/** Retire le tiroir (écran des salons). */
export function unmountSide() {
  if (!drawer) return;
  drawer.sheet.hidden = true;
  drawer.backdrop.hidden = true;
  fab.hidden = true;
  state.ui.drawerOpen = false;
  document.body.classList.remove('cn-drawer-open');
}
