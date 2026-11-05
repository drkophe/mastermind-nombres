/*
 * Panneaux annexes de la partie : historique, définitions de fin de manche,
 * bandeaux (pause, capitaine absent avec promotion par l'hôte).
 */
import { el, ICONS } from '/assets/ds/dom.js';
import { state, notify, isHost } from '../state.js';
import { actions } from '../api.js';
import { mark, sideName, TEAM_LABEL, TEAM_PLURAL, TEAM_MARK } from './common.js';
import { isDrawerMode } from '../chat-state.js';

// ---------- Historique ----------

const END_TURN = {
  neutre: 'carte neutre, fin du tour',
  adverse: 'carte adverse, fin du tour',
  essais: 'plus d’essais, fin du tour',
  passe: 'passe son tour',
  'temps-indice': 'temps écoulé pendant l’indice',
  'temps-devinette': 'temps écoulé pendant la devinette',
  temps: 'temps écoulé',
  'face-terminee': 'plus d’agent à trouver sur cette face',
  'indice-complete': 'indice complété'
};
const COLOR_TEXT = { rouge: 'rouge', bleu: 'bleue', neutre: 'neutre', assassin: 'ASSASSIN', agent: 'agent' };
const COLOR_MARK = { rouge: 'red', bleu: 'blue', neutre: 'neutral', assassin: 'assassin', agent: 'green' };

function historyItem(h, mode) {
  const duo = mode === 'duo';
  if (h.type === 'indice') {
    return el('li', { class: 'cn-hist cn-hist--clue' }, [
      duo ? mark(h.side === 'A' ? 'red' : 'blue') : mark(TEAM_MARK[h.team]),
      el('span', { text: duo ? sideName(h.side) : TEAM_PLURAL[h.team] }),
      el('span', { class: 'cn-hist__clue', text: `${h.word} ${h.count}` })
    ]);
  }
  if (h.type === 'carte') {
    const who = duo ? sideName(h.guesser) : TEAM_PLURAL[h.team];
    const what = duo && h.color === 'neutre' ? 'passant'
      : h.color === 'assassin' ? 'ASSASSIN'
        : duo && h.color === 'agent' ? `agent de ${sideName(h.side)}`
          : `carte ${COLOR_TEXT[h.color]}`;
    // Duo : un agent trouvé prend la couleur du joueur dont c'est l'agent (le donneur).
    const kind = duo && h.color === 'agent' ? (h.side === 'A' ? 'red' : 'blue') : COLOR_MARK[h.color];
    return el('li', { class: 'cn-hist cn-hist--card' }, [mark(kind), `${who} révèle `, el('strong', { text: h.word.toUpperCase() }), ` → ${what}`]);
  }
  if (h.type === 'fin-tour') {
    const text = duo && h.reason === 'neutre' ? 'passant, fin du tour' : (END_TURN[h.reason] || h.reason);
    return el('li', { class: 'cn-hist cn-hist--end' }, [`↳ ${duo ? '' : `${TEAM_PLURAL[h.team]} : `}${text}${duo ? ' (−1 jeton)' : ''}`]);
  }
  if (h.type === 'promotion') return el('li', { class: 'cn-hist' }, [ICONS.hat(), `${h.name} devient capitaine (${TEAM_LABEL[h.team]})`]);
  if (h.type === 'info') return el('li', { class: 'cn-hist cn-hist--info', text: h.text });
  if (h.type === 'fin') return el('li', { class: 'cn-hist cn-hist--info', text: 'Fin de la manche' });
  return null;
}

export function historyPanel(room) {
  const g = room.game;
  const items = g.history.slice().reverse().map((h) => historyItem(h, g.mode)).filter(Boolean);
  const clues = g.history.filter((h) => h.type === 'indice').length;
  const existing = document.getElementById('cn-history');
  // Duo : replié par défaut pour laisser la place au chat (colonne à la hauteur de l'écran).
  const open = existing ? existing.open : !isDrawerMode() && g.mode !== 'duo';
  return el('details', { class: 'ds-panel ds-details cn-history', id: 'cn-history', open }, [
    el('summary', { class: 'ds-label' }, [`Historique · ${clues} indice${clues > 1 ? 's' : ''}`]),
    items.length
      ? el('ol', { class: 'cn-history__list', 'aria-label': 'Indices et résultats, du plus récent au plus ancien' }, items)
      : el('p', { class: 'ds-small ds-faint cn-history__empty', text: 'Aucun indice pour l’instant.' })
  ]);
}

// ---------- Définitions (fin de manche) ----------

export async function showDefinition(index) {
  const room = state.room;
  const word = room.game.words[index];
  state.ui.definition = { index, word, loading: true, definition: null, round: `${room.id}:${room.match.round}` };
  notify();
  const res = await actions.definition(index);
  if (!state.ui.definition || state.ui.definition.index !== index) return;
  state.ui.definition = { ...state.ui.definition, loading: false, definition: res.ok ? res.definition : null };
  notify();
  requestAnimationFrame(() => { const p = document.getElementById('cn-definition'); if (p) p.focus({ preventScroll: false }); });
}

export function definitionPanel(room) {
  const d = state.ui.definition;
  if (!d || room.status !== 'terminee' || d.round !== `${room.id}:${room.match.round}`) return null;
  const close = el('button', { class: 'ds-btn ds-btn--small ds-btn--square', type: 'button', 'aria-label': 'Fermer la définition', onclick: () => { state.ui.definition = null; notify(); } }, [ICONS.close()]);
  const head = el('div', { class: 'ds-panel__head' }, [
    el('h2', { class: 'cn-def__word', text: d.word }),
    close
  ]);
  const body = [];
  if (d.loading) {
    body.push(el('p', { class: 'ds-small ds-muted', role: 'status', text: 'Recherche de la définition…' }));
  } else if (!d.definition) {
    body.push(el('p', { class: 'ds-small ds-muted', text: 'Définition indisponible pour le moment.' }));
    body.push(el('a', { class: 'cn-def__link', href: `https://fr.wiktionary.org/wiki/${encodeURIComponent(d.word)}`, target: '_blank', rel: 'noopener noreferrer', text: `Chercher « ${d.word} » sur le Wiktionnaire` }));
  } else {
    body.push(el('ol', { class: 'cn-def__list' }, d.definition.definitions.map((x) => el('li', null, [x.partOfSpeech ? el('em', { class: 'ds-faint', text: `${x.partOfSpeech} — ` }) : null, x.text]))));
    body.push(el('p', { class: 'cn-def__attribution' }, [
      `${d.definition.attribution} — `,
      el('a', { href: d.definition.sourceUrl, target: '_blank', rel: 'noopener noreferrer', text: 'voir la page Wiktionary' })
    ]));
  }
  return el('section', { class: 'ds-panel ds-stack cn-def', id: 'cn-definition', tabindex: '-1', 'aria-label': `Définition de ${d.word}`, 'aria-busy': d.loading ? 'true' : 'false' }, [head, ...body]);
}

// ---------- Bandeaux ----------

export function noticeBanner(room) {
  if (!room.notice || room.status !== 'en_cours') return null;
  const n = room.notice;
  const tools = [];
  if (n.type === 'capitaine-absent' && isHost()) {
    for (const team of n.teams || []) {
      room.members
        .filter((m) => m.kind === 'joueur' && m.team === team && m.role === 'agent' && m.connected)
        .forEach((m) => tools.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.promote(m.id) }, [ICONS.hat(), `Nommer ${m.name} capitaine`])));
    }
  }
  return el('div', { class: `ds-banner ${room.paused ? 'ds-banner--warn' : 'ds-banner--info'} cn-notice`, role: 'alert' }, [
    el('span', { class: 'cn-notice__icon', 'aria-hidden': 'true', text: room.paused ? '⏸' : '!' }),
    el('div', { class: 'cn-notice__body' }, [
      el('strong', { text: room.paused ? 'Partie en pause' : 'Joueur déconnecté' }),
      el('span', { text: n.text }),
      tools.length ? el('div', { class: 'cn-notice__tools' }, tools) : null
    ])
  ]);
}
