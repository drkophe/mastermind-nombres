/*
 * Plateau 5x5 (3 colonnes sous 700 px).
 * Chaque carte porte un second signal que la couleur (rond, losange, tiret, ×, carré vert)
 * et un aria-label complet (mot + type + état).
 */
import { el, replace } from '/assets/ds/dom.js';
import { state } from '../state.js';

export const KEY_CLASS = { rouge: 'k-r', bleu: 'k-b', neutre: 'k-n', assassin: 'k-a', agent: 'k-g' };
export const KEY_LABEL = { rouge: 'carte rouge', bleu: 'carte bleue', neutre: 'carte neutre', assassin: 'assassin', agent: 'agent' };

/**
 * cards : [{ word, key (rouge|bleu|neutre|assassin|agent|null), revealed, done,
 *            selected, interactive, onclick, label, badges: [texte] }]
 * boardKey : identifiant du plateau (pour n'animer que les cartes nouvellement révélées).
 */
export function renderBoard(host, cards, boardKey, ariaLabel) {
  const ui = state.ui;
  if (ui.boardKey !== boardKey) {
    ui.boardKey = boardKey;
    ui.prevRevealed = null;
  }
  const prev = ui.prevRevealed;
  const active = document.activeElement;
  const focusedIndex = host.contains(active) && active.dataset.index !== undefined ? active.dataset.index : null;

  host.className = 'cn-board';
  host.setAttribute('role', 'group');
  host.setAttribute('aria-label', ariaLabel || 'Plateau de 25 mots');

  const nodes = cards.map((c, i) => {
    const classes = ['cn-card'];
    if (c.key) classes.push(KEY_CLASS[c.key]);
    if (c.revealed) classes.push('rev');
    if (c.revealed && prev && !prev[i]) classes.push('pop');
    if (c.done) classes.push('done');
    if (c.selected) classes.push('sel');
    if (c.word.length > 10) classes.push('is-long');
    if (!c.interactive) classes.push('is-static');
    const attrs = {
      class: classes.join(' '),
      'aria-label': c.label,
      dataset: { index: String(i) }
    };
    let node;
    if (c.interactive) {
      node = el('button', { ...attrs, type: 'button', 'aria-pressed': c.selected ? 'true' : 'false', onclick: c.onclick });
    } else {
      node = el('div', { ...attrs, role: 'img', tabindex: c.focusable ? '0' : undefined });
    }
    node.appendChild(el('span', { class: 'mk', 'aria-hidden': 'true' }));
    node.appendChild(el('span', { class: 'cn-card__word', text: c.word, 'aria-hidden': 'true' }));
    if (c.badges && c.badges.length) {
      node.appendChild(el('span', { class: 'cn-card__badges', 'aria-hidden': 'true' }, c.badges.map((b) => el('span', { class: 'cn-card__badge', text: b }))));
    }
    return node;
  });
  replace(host, nodes);
  ui.prevRevealed = cards.map((c) => !!c.revealed);
  if (focusedIndex !== null && nodes[focusedIndex]) nodes[focusedIndex].focus({ preventScroll: true });
}
