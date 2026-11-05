/*
 * Écran de partie — provisoire : le plateau arrive à l'étape suivante.
 */
import { el, replace } from '/assets/ds/dom.js';
import { roomBar } from './common.js';

export function renderGame(view) {
  replace(view, [roomBar(), el('p', { class: 'ds-muted', text: 'Partie en cours…' })]);
}
