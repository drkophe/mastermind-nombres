/*
 * Formulaire d'indice (capitaine en Classique, joueur qui donne l'indice en Duo).
 * Un seul mot + nombre 0 à 9 ou « illimité » (règles du serveur, qui reste juge).
 * Le champ est conservé entre deux rendus pour ne pas perdre la saisie.
 */
import { el } from '/assets/ds/dom.js';
import { state } from '../state.js';
import { actions } from '../api.js';

export const COUNT_VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'illimite'];
const display = (v) => (v === 'illimite' ? '∞' : v);

let input = null;

function wordInput() {
  if (!input) {
    input = el('input', {
      class: 'ds-field', id: 'cn-clue-word', type: 'text', maxlength: 30, autocomplete: 'off',
      autocapitalize: 'off', spellcheck: 'false', placeholder: 'Votre indice', 'aria-describedby': 'cn-clue-help'
    });
  }
  return input;
}

export function selectionKeyFor(room) {
  const g = room.game;
  return `${room.id}:${room.match.round}:${g.turnNumber}:${g.phase}`;
}

export function clueForm({ teamTagNode, disabled, title = 'Votre indice' }) {
  const ui = state.ui;
  const idx = () => Math.max(0, COUNT_VALUES.indexOf(String(ui.clueCount)));
  const valueNode = el('span', { class: 'cn-stepper__value', id: 'cn-clue-count', 'aria-live': 'polite', text: display(COUNT_VALUES[idx()]) });
  const setIndex = (i) => {
    const clamped = Math.max(0, Math.min(COUNT_VALUES.length - 1, i));
    ui.clueCount = COUNT_VALUES[clamped];
    valueNode.textContent = display(ui.clueCount);
    down.disabled = clamped === 0;
    up.disabled = clamped === COUNT_VALUES.length - 1;
  };
  const down = el('button', { type: 'button', class: 'ds-btn ds-btn--square', id: 'cn-count-down', 'aria-label': 'Diminuer le nombre', 'aria-controls': 'cn-clue-count', onclick: () => setIndex(idx() - 1), text: '−' });
  const up = el('button', { type: 'button', class: 'ds-btn ds-btn--square', id: 'cn-count-up', 'aria-label': 'Augmenter le nombre', 'aria-controls': 'cn-clue-count', onclick: () => setIndex(idx() + 1), text: '+' });
  down.disabled = idx() === 0;
  up.disabled = idx() === COUNT_VALUES.length - 1;
  const submit = el('button', { type: 'submit', class: 'ds-btn ds-btn--primary', id: 'cn-clue-submit', disabled, text: 'Donner l’indice' });
  const field = wordInput();
  field.disabled = !!disabled;

  return el('form', {
    class: 'ds-panel ds-stack cn-action', 'aria-label': title,
    onsubmit: async (e) => {
      e.preventDefault();
      const word = field.value.trim();
      if (!word) { field.focus(); return; }
      submit.disabled = true;
      const res = await actions.clue(word, ui.clueCount);
      submit.disabled = false;
      if (res.ok) field.value = '';
      else field.focus();
    }
  }, [
    el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: title }), teamTagNode]),
    el('label', { class: 'ds-form-row', for: 'cn-clue-word' }, ['Un seul mot', field]),
    el('span', { class: 'ds-small ds-faint', id: 'cn-clue-help', text: 'Pas un mot visible du plateau. Trait d’union et apostrophe acceptés.' }),
    el('div', { class: 'cn-stepper' }, [
      el('span', { class: 'ds-small ds-muted', id: 'cn-count-label', text: 'Nombre de cartes' }),
      el('div', { class: 'cn-stepper__ctrl', role: 'group', 'aria-labelledby': 'cn-count-label' }, [down, valueNode, up])
    ]),
    submit
  ]);
}
