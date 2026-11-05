/*
 * Mode Duo : plateau vu depuis SA face de la clé (envoyée par le serveur au seul joueur
 * concerné), jetons de temps, alternance des rôles, mort subite.
 */
import { el, ICONS, storage } from '/assets/ds/dom.js';
import { state, me } from '../state.js';
import { actions } from '../api.js';
import { mark, sideName, segmented } from './common.js';
import { legend } from './classic.js';
import { clueForm, selectionKeyFor } from './clue-form.js';

const SYMBOL = { agent: '✓', assassin: '×', neutre: '–' };
const WORD = { agent: 'agent', assassin: 'assassin', neutre: 'passant' };

let rerender = () => {};
export function setDuoRerender(fn) { rerender = fn; }

/**
 * Affichage de SA face de la clé (« Ma clé ») ou du plateau neutre (« Plateau »),
 * comme celui des agents en Classique : pratique pour retrouver ses mots sans
 * confondre les couleurs. Préférence locale, mémorisée dans le navigateur.
 */
function keyVisible() {
  if (state.ui.duoShowKey === undefined) state.ui.duoShowKey = storage.get('cn-duo-cle') !== 'masquee';
  return state.ui.duoShowKey;
}

function setKeyVisible(visible) {
  state.ui.duoShowKey = visible;
  storage.set('cn-duo-cle', visible ? 'visible' : 'masquee');
  rerender();
}

function keyToggle() {
  const visible = keyVisible();
  return segmented({
    label: 'Affichage du plateau',
    id: 'cn-duo-toggle',
    options: [['cle', 'Ma clé'], ['plateau', 'Plateau']],
    value: visible ? 'cle' : 'plateau',
    onChange: (v) => setKeyVisible(v === 'cle')
  });
}

function roleOf(room) {
  const m = me();
  const g = room.game;
  if (!m || m.kind !== 'joueur' || !g.mySide) return { kind: 'spectateur' };
  const sudden = g.phase === 'mort-subite';
  return { kind: sudden ? 'mort-subite' : g.giver === g.mySide ? 'indice' : 'devine', side: g.mySide };
}

function canSelect(room, role) {
  const g = room.game;
  if (room.status !== 'en_cours' || room.paused) return false;
  if (role.kind === 'mort-subite') return true;
  return role.kind === 'devine' && g.phase === 'devinette';
}

export function duoCards(room) {
  const g = room.game;
  const role = roleOf(room);
  const ended = room.status === 'terminee';
  const selecting = canSelect(room, role);
  const selKey = selectionKeyFor(room);
  if (state.ui.selectionKey !== selKey || !selecting) {
    state.ui.selectionKey = selKey;
    if (!selecting) state.ui.selected = null;
  }
  if (state.ui.selected !== null && g.found[state.ui.selected]) state.ui.selected = null;

  return g.words.map((word, i) => {
    const badges = [];
    const marksText = [];
    if (g.bystanders.A[i]) { badges.push('A'); marksText.push('passant identifié pour la face de A'); }
    if (g.bystanders.B[i]) { badges.push('B'); marksText.push('passant identifié pour la face de B'); }

    if (ended && g.keys) {
      const a = g.keys.A[i];
      const b = g.keys.B[i];
      const key = g.assassinIndex === i ? 'assassin' : (a === 'agent' || b === 'agent') ? 'agent' : (a === 'assassin' || b === 'assassin') ? 'assassin' : 'neutre';
      return {
        word,
        key,
        revealed: g.found[i] || g.assassinIndex === i,
        badges: [`A${SYMBOL[a]}`, `B${SYMBOL[b]}`],
        label: `${word}, face A : ${WORD[a]}, face B : ${WORD[b]}${g.found[i] ? ', agent trouvé' : ''}${g.assassinIndex === i ? ', assassin touché' : ''}`
      };
    }
    if (g.found[i]) {
      return { word, key: 'agent', revealed: true, label: `${word}, agent trouvé` };
    }
    const myColor = g.myKey && keyVisible() ? g.myKey[i] : null;
    const blockedForGiver = role.kind === 'devine' && g.bystanders[g.giver][i];
    const interactive = selecting && !blockedForGiver;
    const selected = state.ui.selected === i;
    return {
      word,
      key: myColor,
      badges,
      selected,
      interactive,
      focusable: !interactive,
      onclick: () => { state.ui.selected = state.ui.selected === i ? null : i; rerender(); },
      label: [word, myColor ? `votre face : ${WORD[myColor]}` : 'non révélée', ...marksText, selected ? 'sélectionnée' : null].filter(Boolean).join(', ')
    };
  });
}

export function duoStatus(room) {
  const g = room.game;
  const role = roleOf(room);
  if (room.status === 'terminee') {
    return el('div', { class: 'cn-statusline' }, [
      el('span', { class: 'cn-statusline__main', text: 'Partie terminée — les deux faces de la clé sont révélées' }),
      el('span', { class: 'cn-statusline__hint', text: 'A✓ / B× : agent, assassin ou passant (–) sur chaque face' })
    ]);
  }
  const main = g.phase === 'mort-subite'
    ? [el('span', { class: 'cn-sudden-dot', 'aria-hidden': 'true' }), 'Mort subite : plus d’indices, toute erreur est fatale']
    : [mark('green'), `Tour ${g.turnNumber} · ${g.phase === 'indice' ? `${sideName(g.giver)} cherche un indice` : `${sideName(g.giver === 'A' ? 'B' : 'A')} devine`}`];
  return el('div', { class: 'cn-statusline' }, [
    el('span', { class: 'cn-statusline__main' }, main),
    role.kind === 'spectateur'
      ? el('span', { class: 'cn-statusline__hint', text: 'Les faces de la clé restent secrètes jusqu’à la fin.' })
      : el('span', { class: 'cn-statusline__keyinfo' }, [
        keyVisible()
          ? el('span', { class: 'cn-statusline__keyinfo' }, [
            el('span', { class: 'cn-lock' }, [ICONS.lock()]),
            legend([['green', 'Agent'], ['neutral', 'Passant'], ['assassin', 'Assassin']])
          ])
          : el('span', { class: 'ds-small ds-faint', text: 'Clé masquée : plateau neutre' }),
        keyToggle()
      ])
  ]);
}

function tokensStrip(g) {
  return el('div', { class: 'cn-tokens', role: 'img', 'aria-label': `${g.tokensLeft} jeton${g.tokensLeft > 1 ? 's' : ''} de temps sur ${g.tokensTotal}` },
    Array.from({ length: g.tokensTotal }, (_, i) => el('span', { class: `cn-token${i < g.tokensLeft ? ' is-on' : ''}` })));
}

function validateButton(room) {
  const g = room.game;
  const sel = state.ui.selected;
  return el('button', {
    class: 'ds-btn ds-btn--primary', id: 'cn-validate', type: 'button', disabled: sel === null,
    onclick: async () => {
      const index = state.ui.selected;
      if (index === null) return;
      state.ui.selected = null;
      await actions.guess(index);
    },
    text: sel === null ? 'Choisissez une carte' : `Valider « ${g.words[sel].toUpperCase()} »`
  });
}

function sideTag(side) {
  return el('span', { class: 'cn-team-tag cn-team-tag--duo', text: `Joueur ${side}` });
}

export function duoActionPanel(room) {
  const g = room.game;
  if (room.status !== 'en_cours') return null;
  const role = roleOf(room);
  const partner = role.side ? sideName(role.side === 'A' ? 'B' : 'A') : null;
  const tokensRow = el('div', { class: 'cn-tokens-row' }, [el('span', { class: 'ds-small ds-muted', text: `Jetons de temps : ${g.tokensLeft}/${g.tokensTotal}` }), tokensStrip(g)]);

  if (role.kind === 'mort-subite') {
    return el('section', { class: 'ds-panel ds-stack cn-action cn-action--sudden', 'aria-label': 'Mort subite' }, [
      el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: 'Mort subite' }), sideTag(role.side)]),
      el('p', { class: 'cn-waiting', text: 'Plus de jetons : désignez un agent de la face de votre partenaire.' }),
      el('p', { class: 'ds-small ds-muted', text: 'Une seule erreur (passant ou assassin) et la mission échoue.' }),
      validateButton(room)
    ]);
  }

  if (role.kind === 'indice') {
    if (g.phase === 'indice') {
      const form = clueForm({ teamTagNode: sideTag(role.side), disabled: room.paused });
      form.insertBefore(el('p', { class: 'ds-small ds-muted cn-duo-hint', text: `Faites deviner les agents verts de votre face à ${partner}. ${g.myAgentsLeft} restant${g.myAgentsLeft > 1 ? 's' : ''} sur votre face.` }), form.children[1]);
      form.appendChild(tokensRow);
      return form;
    }
    return el('section', { class: 'ds-panel ds-stack cn-action', 'aria-label': 'Indice envoyé' }, [
      el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: 'Indice envoyé' }), sideTag(role.side)]),
      el('div', { class: 'cn-clue cn-clue--md' }, [el('span', { class: 'cn-clue__word', text: g.clue.word }), el('span', { class: 'cn-clue__num', text: g.clue.display })]),
      el('span', { class: 'ds-small ds-muted', text: `${partner} devine · ${g.clue.guessesMade} proposition${g.clue.guessesMade > 1 ? 's' : ''}` }),
      tokensRow
    ]);
  }

  // Joueur qui devine, ou spectateur
  const body = [el('div', { class: 'ds-panel__head' }, [
    el('span', { class: 'ds-label', text: g.clue ? `Indice de ${sideName(g.clue.giver)}` : 'Indice' }),
    role.side ? sideTag(role.side) : el('span', { class: 'cn-team-tag', text: 'Spectateur' })
  ])];
  if (g.clue) {
    body.push(el('div', { class: 'cn-clue cn-clue--lg' }, [el('span', { class: 'cn-clue__word', text: g.clue.word }), el('span', { class: 'cn-clue__num', text: g.clue.display })]));
    body.push(el('span', { class: 'ds-small ds-muted', role: 'status', text: `${g.clue.guessesMade} proposition${g.clue.guessesMade > 1 ? 's' : ''} · continuez tant que vous trouvez des agents` }));
  } else {
    body.push(el('p', { class: 'cn-waiting', text: `${sideName(g.giver)} cherche un indice…` }));
  }
  if (role.kind === 'devine' && g.phase === 'devinette') {
    body.push(validateButton(room));
    const canPass = g.clue.guessesMade >= 1;
    body.push(el('button', { class: 'ds-btn', id: 'cn-pass', type: 'button', disabled: !canPass, 'aria-describedby': canPass ? undefined : 'cn-pass-hint', onclick: () => actions.pass(), text: 'Passer (−1 jeton)' }));
    if (!canPass) body.push(el('span', { class: 'ds-small ds-faint', id: 'cn-pass-hint', text: 'Possible après au moins une proposition.' }));
  }
  body.push(tokensRow);
  return el('section', { class: 'ds-panel ds-stack cn-action', 'aria-label': 'Indice' }, body);
}

export function duoHeader(room) {
  const g = room.game;
  const role = roleOf(room);
  const rolePill = role.side
    ? el('span', { class: 'ds-pill ds-pill--strong cn-role-pill' }, [mark('green'), `Joueur ${role.side}`,
      el('span', { class: 'ds-faint', text: role.kind === 'indice' ? '· donne l’indice' : role.kind === 'devine' ? '· devine' : '· mort subite' })])
    : el('span', { class: 'ds-pill cn-role-pill' }, [ICONS.eye(), 'Spectateur']);
  const low = g.tokensLeft <= 2 && room.status === 'en_cours';
  return [
    rolePill,
    el('span', { class: `ds-pill${low ? ' ds-pill--on cn-pill-alert' : ''}`, 'aria-label': `${g.tokensLeft} jetons de temps restants sur ${g.tokensTotal}` }, [ICONS.hourglass(), 'Jetons', el('b', { text: String(g.tokensLeft) })]),
    el('span', { class: 'ds-pill', 'aria-label': `${g.agentsFound} agents trouvés sur ${g.agentsTotal}` }, [mark('green'), 'Agents', el('b', { text: `${g.agentsFound}/${g.agentsTotal}` })])
  ];
}

export const DUO_END = {
  agents: 'Les 15 agents ont été retrouvés.',
  assassin: 'Un assassin a été touché.',
  temps: 'Les jetons de temps sont épuisés.',
  'mort-subite': 'Erreur pendant la mort subite.',
  abandon: 'Un joueur a quitté la partie.'
};
