/*
 * Mode Duo : vues « Ma clé » (je fais deviner) et « Plateau » (je devine),
 * construites par la projection pure duo-projection.mjs.
 * Couleurs par joueur : A = rouge (rond), B = bleu (losange).
 * Chaque joueur ne reçoit du serveur que SA face de la clé.
 */
import { el, ICONS } from '/assets/ds/dom.js';
import { state, me } from '../state.js';
import { actions } from '../api.js';
import { mark, sideName, segmented } from './common.js';
import { clueForm, selectionKeyFor } from './clue-form.js';
import { projectDuoBoard, legendFor, otherSide } from '../duo-projection.mjs';

export const SIDE_MARK = { A: 'red', B: 'blue' };
export const SIDE_CLASS = { A: 'own-A', B: 'own-B' };
const FACE_SYMBOL = { agent: '✓', assassin: '×', neutre: '–' };

let rerender = () => {};
export function setDuoRerender(fn) { rerender = fn; }

/** Pastille de joueur : couleur + second signal (rond A / losange B). */
export function sideMark(side) {
  return mark(SIDE_MARK[side]);
}

function names() {
  return { A: sideName('A'), B: sideName('B') };
}

// ---------- Phase : texte explicite + couleur du dégradé ----------

export const PHASE_COLORS = { indice: '#F5C451', A: '#F0766B', B: '#6FA8FF' };

/**
 * Phase du point de vue du joueur : texte (ne repose pas sur la couleur),
 * couleurs du dégradé (null = pas de dégradé), et « à moi d'agir ».
 */
export function duoPhaseInfo(room) {
  const g = room.game;
  const role = duoRole(room);
  const me_ = role.side || null;
  if (room.status !== 'en_cours' || !g) return { text: 'Partie terminée', colors: null, myTurn: false };
  if (room.paused) return { text: 'Partie en pause', colors: null, myTurn: false };
  if (g.phase === 'mort-subite') {
    return { text: me_ ? 'Mort subite : à vous deux de deviner' : 'Mort subite : les deux joueurs devinent', colors: [PHASE_COLORS.A, PHASE_COLORS.B], myTurn: !!me_ };
  }
  if (g.phase === 'indice') {
    const mine = me_ === g.giver;
    return { text: mine ? 'Vous cherchez un indice' : `${sideName(g.giver)} cherche un indice`, colors: [PHASE_COLORS.indice], myTurn: mine };
  }
  const guesser = otherSide(g.giver);
  const mine = me_ === guesser;
  return { text: mine ? 'À vous de deviner' : `${sideName(guesser)} devine`, colors: [PHASE_COLORS[guesser]], myTurn: mine };
}

// ---------- Rôle et vue ----------

export function duoRole(room) {
  const m = me();
  const g = room.game;
  if (!m || m.kind !== 'joueur' || !g.mySide) return { kind: 'spectateur' };
  const sudden = g.phase === 'mort-subite';
  return { kind: sudden ? 'mort-subite' : g.giver === g.mySide ? 'indice' : 'devine', side: g.mySide };
}

/**
 * Vue affichée. Par défaut selon mon rôle dans le tour : je donne l'indice → « Ma clé »
 * (je vois les validations en direct), je devine → « Plateau ». Un choix manuel est
 * conservé jusqu'au tour suivant (pas de rebascule automatique pendant le tour).
 */
export function duoView(room) {
  const g = room.game;
  const role = duoRole(room);
  if (!role.side) return 'plateau';
  const turnKey = `${room.id}:${room.match.round}:${g.turnNumber}:${role.kind}`;
  if (state.ui.duoViewTurn !== turnKey) {
    state.ui.duoViewTurn = turnKey;
    state.ui.duoView = role.kind === 'indice' ? 'cle' : 'plateau';
  }
  return state.ui.duoView;
}

function setView(view) {
  state.ui.duoView = view; // valable jusqu'au prochain changement de tour
  rerender();
}

function viewToggle(room) {
  return segmented({
    label: 'Affichage du plateau',
    id: 'cn-duo-toggle',
    options: [['cle', 'Ma clé'], ['plateau', 'Plateau']],
    value: duoView(room),
    onChange: setView
  });
}

function canSelect(room, role) {
  const g = room.game;
  if (room.status !== 'en_cours' || room.paused) return false;
  if (role.kind === 'mort-subite') return true;
  return role.kind === 'devine' && g.phase === 'devinette';
}

// ---------- Cartes ----------

/** Traduit l'état projeté d'une carte en carte du plateau (classes, marqueur, badges). */
function toBoardCard(pc, viewer) {
  const card = { word: pc.word, label: pc.label, classes: [`d-${pc.kind}`], badges: [] };
  (pc.passantFor || []).forEach((s) => card.badges.push({ text: `${s} –`, cls: SIDE_CLASS[s] }));

  switch (pc.kind) {
    case 'key':
      card.classes.push(`d-face-${pc.keyColor}`);
      if (pc.keyColor === 'agent') { card.classes.push(SIDE_CLASS[viewer]); card.mark = `mk-${viewer}`; }
      else card.mark = pc.keyColor === 'neutre' ? 'mk-n' : 'mk-x';
      break;
    case 'validated':
      card.classes.push(SIDE_CLASS[pc.owner]);
      card.mark = `mk-${pc.owner}`;
      card.check = true;
      card.revealed = true;
      break;
    case 'common':
      card.mark = 'mk-AB';
      card.check = true;
      card.revealed = true;
      break;
    case 'error':
      card.mark = 'mk-n';
      card.revealed = true;
      break;
    case 'retired':
      if (pc.keyColor) {
        card.classes.push(`d-face-${pc.keyColor}`);
        card.mark = pc.keyColor === 'agent' ? `mk-${viewer}` : pc.keyColor === 'neutre' ? 'mk-n' : 'mk-x';
      }
      break;
    case 'end': {
      const a = pc.faceA;
      const b = pc.faceB;
      const agentA = a === 'agent';
      const agentB = b === 'agent';
      if (pc.assassinHit) { card.classes.push('d-face-assassin', 'd-hit'); card.mark = 'mk-x'; card.revealed = true; }
      else if (agentA && agentB) { card.classes.push(pc.found ? 'd-common' : 'd-common-tint'); card.mark = 'mk-AB'; card.check = pc.found; card.revealed = pc.found; }
      else if (agentA || agentB) {
        const owner = agentA ? 'A' : 'B';
        card.classes.push(pc.found ? 'd-validated' : 'd-face-agent', SIDE_CLASS[owner]);
        card.mark = `mk-${owner}`;
        card.check = pc.found;
        card.revealed = pc.found;
      } else if (a === 'assassin' || b === 'assassin') { card.classes.push('d-face-assassin'); card.mark = 'mk-x'; }
      else { card.classes.push('d-face-neutre'); card.mark = 'mk-n'; }
      card.badges = [
        { text: `A${FACE_SYMBOL[a]}`, cls: 'own-A' },
        { text: `B${FACE_SYMBOL[b]}`, cls: 'own-B' }
      ];
      break;
    }
    default:
      break;
  }
  return card;
}

let lastProjection = [];

export function duoCards(room) {
  const g = room.game;
  const role = duoRole(room);
  const ended = room.status === 'terminee';
  const selecting = canSelect(room, role);
  const selKey = selectionKeyFor(room);
  if (state.ui.selectionKey !== selKey || !selecting) {
    state.ui.selectionKey = selKey;
    if (!selecting) state.ui.selected = null;
  }
  if (state.ui.selected !== null && g.found[state.ui.selected]) state.ui.selected = null;

  const viewer = role.side || null;
  const projected = projectDuoBoard({
    viewer,
    view: duoView(room),
    words: g.words,
    myFace: g.myKey,
    reveals: g.reveals || [],
    ended: ended && !!g.keys,
    keys: g.keys,
    assassinIndex: g.assassinIndex,
    names: names(),
    canSelect: (i) => selecting && !g.found[i] && !(role.kind === 'devine' && g.bystanders[g.giver][i])
  });

  lastProjection = projected;
  return projected.map((pc, i) => {
    const card = toBoardCard(pc, viewer);
    if (pc.selectable) {
      const selected = state.ui.selected === i;
      card.interactive = true;
      card.selected = selected;
      card.onclick = () => { state.ui.selected = state.ui.selected === i ? null : i; rerender(); };
      if (selected) card.label += ', sélectionnée';
    }
    return card;
  });
}

// ---------- Bandeau « indice en cours » ----------

/** Progression de l'indice selon la règle « Fin d'un indice ». */
export function clueProgress(g) {
  const c = g.clue;
  if (!c) return null;
  const found = c.agentsFound || 0;
  const plural = (n) => (n > 1 ? 's' : '');
  if (c.unlimited || c.count === 0 || g.clueEnd === 'illimite') {
    return { text: `${found} trouvé${plural(found)}`, detail: 'jusqu’à une erreur ou une passe', ratio: null };
  }
  if (g.clueEnd === 'bonus') {
    return { text: `${found}/${c.count} trouvé${plural(found)}`, detail: found >= c.count ? 'essai bonus disponible' : `+ 1 essai bonus`, ratio: Math.min(1, found / c.count) };
  }
  return { text: `${found}/${c.count} trouvé${plural(found)}`, detail: 'le tour s’arrête à ' + c.count, ratio: Math.min(1, found / c.count) };
}

/** Bandeau au-dessus du plateau, visible dans les deux vues et pour tous. */
export function duoClueBanner(room) {
  const g = room.game;
  if (room.status !== 'en_cours' || !g.clue || g.phase !== 'devinette') return null;
  const guesser = otherSide(g.clue.giver);
  const role = duoRole(room);
  const progress = clueProgress(g);
  const who = role.side === guesser ? 'Vous devinez' : `${sideName(guesser)} devine`;
  return el('div', { class: `cn-cluebar cn-cluebar--${guesser}`, role: 'status', 'aria-label': `Indice en cours : ${g.clue.word} ${g.clue.display}, ${progress.text}, ${who}` }, [
    el('span', { class: 'cn-cluebar__label ds-label', text: 'Indice' }),
    el('span', { class: 'cn-cluebar__word', text: g.clue.word }),
    el('span', { class: 'cn-cluebar__num', text: g.clue.display }),
    el('span', { class: 'cn-cluebar__progress' }, [
      el('strong', { text: progress.text }),
      el('span', { class: 'ds-faint', text: ` · ${progress.detail}` })
    ]),
    progress.ratio !== null ? el('span', { class: 'cn-cluebar__meter', 'aria-hidden': 'true' }, [el('span', { style: `transform: scaleX(${progress.ratio})` })]) : null,
    el('span', { class: 'cn-cluebar__who' }, [sideMark(guesser), who])
  ]);
}

// ---------- Légende et ligne de statut ----------

function legendSwatch(kind) {
  if (kind === 'A' || kind === 'B') return sideMark(kind);
  if (kind === 'passant') return mark('neutral');
  if (kind === 'assassin') return mark('assassin');
  if (kind === 'check') return el('span', { class: 'cn-legend__check', 'aria-hidden': 'true', text: '✓' });
  if (kind === 'common') return el('span', { class: 'cn-legend__common', 'aria-hidden': 'true' });
  return el('span', { class: 'cn-legend__retired', 'aria-hidden': 'true' });
}

function duoLegend(room) {
  const role = duoRole(room);
  const items = legendFor(duoView(room), role.side || null, lastProjection);
  return el('span', { class: 'cn-legend', 'aria-label': 'Légende des symboles' },
    items.map(([kind, text]) => el('span', { class: 'cn-legend__item' }, [legendSwatch(kind), text])));
}

export function duoStatus(room) {
  const g = room.game;
  const role = duoRole(room);
  if (room.status === 'terminee') {
    return el('div', { class: 'cn-statusline' }, [
      el('span', { class: 'cn-statusline__main', text: 'Partie terminée — les deux faces de la clé sont révélées' }),
      el('span', { class: 'cn-legend' }, [
        el('span', { class: 'cn-legend__item' }, [sideMark('A'), `Agents de ${sideName('A')}`]),
        el('span', { class: 'cn-legend__item' }, [sideMark('B'), `Agents de ${sideName('B')}`]),
        el('span', { class: 'cn-legend__item' }, [legendSwatch('common'), 'Commun']),
        el('span', { class: 'cn-legend__item ds-faint', text: 'A✓ / B× / A– : face de chaque joueur' })
      ])
    ]);
  }
  const info = duoPhaseInfo(room);
  const dot = g.phase === 'mort-subite' ? el('span', { class: 'cn-sudden-dot', 'aria-hidden': 'true' })
    : g.phase === 'indice' ? el('span', { class: 'cn-phase-dot', 'aria-hidden': 'true' })
      : sideMark(otherSide(g.giver));
  const main = [dot, el('strong', { class: `cn-phase-text${info.myTurn ? ' is-mine' : ''}`, text: info.text }),
    el('span', { class: 'ds-faint', text: g.phase === 'mort-subite' ? '· toute erreur est fatale' : `· tour ${g.turnNumber}` })];
  return el('div', { class: 'cn-statusline' }, [
    el('span', { class: 'cn-statusline__main' }, main),
    el('span', { class: 'cn-statusline__keyinfo' }, [
      role.side && duoView(room) === 'cle' ? el('span', { class: 'cn-lock' }, [ICONS.lock()]) : null,
      duoLegend(room),
      role.side ? viewToggle(room) : null
    ])
  ]);
}

// ---------- Panneaux ----------

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

export function sideTag(side) {
  return el('span', { class: `cn-team-tag cn-team-tag--${side}` }, [sideMark(side), sideName(side)]);
}

function clueWord(g, size) {
  return el('div', { class: `cn-clue cn-clue--${size}` }, [el('span', { class: 'cn-clue__word', text: g.clue.word }), el('span', { class: 'cn-clue__num', text: g.clue.display })]);
}

export function duoActionPanel(room) {
  const g = room.game;
  if (room.status !== 'en_cours') return null;
  const role = duoRole(room);
  const partner = role.side ? sideName(otherSide(role.side)) : null;
  const tokensRow = el('div', { class: 'cn-tokens-row' }, [el('span', { class: 'ds-small ds-muted', text: `Jetons de temps : ${g.tokensLeft}/${g.tokensTotal}` }), tokensStrip(g)]);

  if (role.kind === 'mort-subite') {
    return el('section', { class: 'ds-panel ds-stack cn-action cn-action--sudden', 'aria-label': 'Mort subite' }, [
      el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: 'Mort subite' }), sideTag(role.side)]),
      el('p', { class: 'cn-waiting', text: `Plus de jetons : désignez un agent de la face de ${partner}.` }),
      el('p', { class: 'ds-small ds-muted', text: 'Une seule erreur (passant ou assassin) et la mission échoue.' }),
      validateButton(room)
    ]);
  }

  if (role.kind === 'indice') {
    if (g.phase === 'indice') {
      const form = clueForm({ teamTagNode: sideTag(role.side), disabled: room.paused });
      form.insertBefore(el('p', { class: 'ds-small ds-muted cn-duo-hint' }, [
        'Faites deviner vos agents ', sideMark(role.side), ` à ${partner}. ${g.myAgentsLeft} restant${g.myAgentsLeft > 1 ? 's' : ''} sur votre face.`
      ]), form.children[1]);
      form.appendChild(tokensRow);
      return form;
    }
    return el('section', { class: 'ds-panel ds-stack cn-action', 'aria-label': 'Indice envoyé' }, [
      el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: 'Indice envoyé' }), sideTag(role.side)]),
      clueWord(g, 'md'),
      el('span', { class: 'ds-small ds-muted', text: `${partner} devine · ${g.clue.guessesMade} proposition${g.clue.guessesMade > 1 ? 's' : ''}` }),
      tokensRow
    ]);
  }

  // Joueur qui devine, ou spectateur
  const body = [el('div', { class: 'ds-panel__head' }, [
    el('span', { class: 'ds-label', text: g.clue ? 'Indice' : 'En attente' }),
    g.clue ? sideTag(g.clue.giver) : (role.side ? sideTag(role.side) : el('span', { class: 'cn-team-tag', text: 'Spectateur' }))
  ])];
  if (g.clue) {
    body.push(clueWord(g, 'lg'));
    const progress = clueProgress(g);
    body.push(el('span', { class: 'ds-small ds-muted', text: `${progress.text} · ${progress.detail}` }));
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
  const role = duoRole(room);
  const roleText = role.kind === 'indice' ? (g.phase === 'indice' ? 'cherche un indice' : 'a donné l’indice')
    : role.kind === 'devine' ? (g.phase === 'devinette' ? 'devine' : 'attend l’indice')
      : 'mort subite';
  const rolePill = role.side
    ? el('span', { class: `ds-pill ds-pill--strong cn-role-pill cn-role-pill--${role.side}`, 'aria-label': `Vous : ${sideName(role.side)}, joueur ${role.side}, ${roleText}` }, [
      sideMark(role.side), sideName(role.side), el('span', { class: 'ds-faint', text: `· ${roleText}` })
    ])
    : el('span', { class: 'ds-pill cn-role-pill' }, [ICONS.eye(), 'Spectateur']);
  const low = g.tokensLeft <= 2 && room.status === 'en_cours';
  return [
    rolePill,
    el('span', { class: `ds-pill${low ? ' ds-pill--on cn-pill-alert' : ''}`, 'aria-label': `${g.tokensLeft} jetons de temps restants sur ${g.tokensTotal}` }, [ICONS.hourglass(), 'Jetons', el('b', { text: String(g.tokensLeft) })]),
    el('span', { class: 'ds-pill', 'aria-label': `${g.agentsFound} agents trouvés sur ${g.agentsTotal}` }, [el('span', { class: 'cn-legend__common', 'aria-hidden': 'true' }), 'Agents', el('b', { text: `${g.agentsFound}/${g.agentsTotal}` })])
  ];
}

export const DUO_END = {
  agents: 'Les 15 agents ont été retrouvés.',
  assassin: 'Un assassin a été touché.',
  temps: 'Les jetons de temps sont épuisés.',
  'mort-subite': 'Erreur pendant la mort subite.',
  abandon: 'Un joueur a quitté la partie.'
};
