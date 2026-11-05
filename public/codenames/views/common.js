/*
 * Éléments partagés entre les écrans Codenames.
 */
import { el, toast, ICONS } from '/assets/ds/dom.js';
import { state } from '../state.js';
import { actions } from '../api.js';

export const MODE_LABEL = { classique: 'Classique', duo: 'Duo' };
export const TEAM_LABEL = { rouge: 'Rouge', bleu: 'Bleue' };
export const TEAM_PLURAL = { rouge: 'Rouges', bleu: 'Bleus' };
export const TEAM_ADJ = { rouge: 'rouge', bleu: 'bleu' }; // « capitaine bleu »
export const other = (team) => (team === 'rouge' ? 'bleu' : 'rouge');

/**
 * SegmentedControl : groupe de boutons exclusifs (aria-pressed).
 * options : [[valeur, libellé, contenuSupplémentaire?]]
 */
export function segmented({ label, labelledBy, options, value, onChange, disabled = false, block = false, id }) {
  return el('div', { class: `ds-seg${block ? ' ds-seg--block' : ''}`, role: 'group', 'aria-label': labelledBy ? undefined : label, 'aria-labelledby': labelledBy, id },
    options.map(([v, text, extra]) => el('button', {
      type: 'button',
      class: 'ds-seg__item',
      'aria-pressed': v === value ? 'true' : 'false',
      disabled: disabled && v !== value,
      onclick: () => { if (v !== value && !disabled) onChange(v); }
    }, [text, extra || null])));
}

/** Marqueur de type (second signal que la couleur). */
export function mark(kind) {
  return el('span', { class: `ds-mark ds-mark--${kind}`, 'aria-hidden': 'true' });
}

export const TEAM_MARK = { rouge: 'red', bleu: 'blue' };

export function memberName(member) {
  return member.name + (member.id === state.playerId ? ' (vous)' : '');
}

export function sideName(side) {
  const m = state.room && state.room.members.find((p) => p.kind === 'joueur' && p.side === side);
  return m ? m.name : `Joueur ${side}`;
}

export function copyRoomLink() {
  const link = `${location.origin}/codenames?salon=${encodeURIComponent(state.room.id)}`;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link).then(() => toast('Lien du salon copié.'), () => toast(link));
  } else {
    toast(link, 'info', 8000);
  }
}

/** Barre du salon : nom, mode, lien et sortie. */
export function roomBar() {
  const room = state.room;
  const players = room.members.filter((m) => m.kind === 'joueur').length;
  return el('div', { class: 'cn-roombar' }, [
    el('div', { class: 'cn-roombar__info' }, [
      el('span', { class: 'ds-label', text: 'Salon' }),
      el('h2', { class: 'cn-roombar__name ds-serif', text: room.name }),
      el('span', { class: 'ds-small ds-muted', text: `${MODE_LABEL[room.settings.mode]} · ${players}/${room.maxPlayers} joueurs` })
    ]),
    el('div', { class: 'cn-roombar__actions' }, [
      el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: copyRoomLink }, [ICONS.link(), 'Copier le lien']),
      el('button', { class: 'ds-btn ds-btn--small ds-btn--danger', type: 'button', onclick: () => actions.leaveRoom() }, [ICONS.exit(), 'Quitter'])
    ])
  ]);
}
