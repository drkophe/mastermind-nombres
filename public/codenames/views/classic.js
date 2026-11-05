/*
 * Mode Classique : construction des cartes et des panneaux d'action selon le
 * rôle réel du joueur (capitaine, agent, spectateur), tel que décidé par le serveur.
 */
import { el, ICONS } from '/assets/ds/dom.js';
import { state, me } from '../state.js';
import { actions } from '../api.js';
import { KEY_LABEL } from './board.js';
import { mark, TEAM_LABEL, TEAM_PLURAL, TEAM_ADJ, TEAM_MARK } from './common.js';
import { clueForm, selectionKeyFor } from './clue-form.js';

export function classicRole(_room) {
  const m = me();
  if (!m || m.kind !== 'joueur' || !m.team) return { kind: 'spectateur' };
  return { kind: m.role === 'capitaine' ? 'capitaine' : 'agent', team: m.team };
}

/** L'agent peut-il proposer une carte maintenant ? */
function canGuess(room, role) {
  const g = room.game;
  return room.status === 'en_cours' && !room.paused && role.kind === 'agent' &&
    g.phase === 'devinette' && g.currentTeam === role.team;
}

export function classicCards(room) {
  const g = room.game;
  const role = classicRole(room);
  const ended = room.status === 'terminee';
  const guessing = canGuess(room, role);
  const selKey = selectionKeyFor(room);
  if (state.ui.selectionKey !== selKey || !guessing) {
    state.ui.selectionKey = selKey;
    if (!guessing) state.ui.selected = null;
  }
  if (state.ui.selected !== null && g.revealed[state.ui.selected]) state.ui.selected = null;

  return g.words.map((word, i) => {
    const revealedColor = g.revealed[i];
    const keyColor = g.key ? g.key[i] : null;
    if (revealedColor) {
      return {
        word,
        key: revealedColor,
        revealed: !(role.kind === 'capitaine' && !ended),
        done: role.kind === 'capitaine' && !ended,
        label: `${word}, ${KEY_LABEL[revealedColor]}, ${role.kind === 'capitaine' && !ended ? 'déjà devinée' : 'révélée'}`
      };
    }
    if (keyColor) {
      return {
        word,
        key: keyColor,
        focusable: true,
        label: `${word}, ${KEY_LABEL[keyColor]}${ended ? ', non révélée' : ', non révélée (clé secrète)'}`
      };
    }
    const selected = state.ui.selected === i;
    return {
      word,
      key: null,
      selected,
      interactive: guessing,
      focusable: !guessing,
      onclick: () => {
        state.ui.selected = state.ui.selected === i ? null : i;
        rerender();
      },
      label: `${word}, non révélée${selected ? ', sélectionnée' : ''}`
    };
  });
}

let rerender = () => {};
export function setRerender(fn) { rerender = fn; }

/** Ligne au-dessus du plateau. */
export function classicStatus(room) {
  const g = room.game;
  const role = classicRole(room);
  if (room.status === 'terminee') {
    return el('div', { class: 'cn-statusline' }, [el('span', { class: 'cn-statusline__main' }, ['Manche terminée — clé complète révélée'])]);
  }
  if (role.kind === 'capitaine') {
    return el('div', { class: 'cn-statusline' }, [
      el('span', { class: 'cn-statusline__main' }, [el('span', { class: 'cn-lock' }, [ICONS.lock()]), 'Clé secrète : ne montrez pas cet écran à vos agents']),
      legend([['red', 'Rouge'], ['blue', 'Bleu'], ['neutral', 'Neutre'], ['assassin', 'Assassin']])
    ]);
  }
  const team = g.currentTeam;
  const hint = canGuess(room, role)
    ? 'Cliquez une carte pour la choisir, puis validez'
    : g.phase === 'indice'
      ? `Le capitaine des ${TEAM_PLURAL[team]} cherche un indice`
      : `Les agents ${TEAM_PLURAL[team].toLowerCase()} devinent`;
  return el('div', { class: 'cn-statusline' }, [
    el('span', { class: 'cn-statusline__main' }, [mark(TEAM_MARK[team]), `Tour des ${TEAM_PLURAL[team]}`]),
    el('span', { class: 'cn-statusline__hint', text: hint })
  ]);
}

export function legend(items) {
  return el('span', { class: 'cn-legend', 'aria-label': 'Légende des symboles' }, items.map(([kind, text]) => el('span', { class: 'cn-legend__item' }, [mark(kind), text])));
}

function essaisText(clue) {
  if (clue.guessesLeft === null) return 'Essais illimités';
  return `${clue.guessesLeft} essai${clue.guessesLeft > 1 ? 's' : ''} restant${clue.guessesLeft > 1 ? 's' : ''}`;
}

function clueDisplay(clue, size = 'lg') {
  return el('div', { class: `cn-clue cn-clue--${size}` }, [
    el('span', { class: 'cn-clue__word', text: clue.word }),
    el('span', { class: 'cn-clue__num', text: clue.display })
  ]);
}

function teamTag(team) {
  return el('span', { class: `cn-team-tag cn-team-tag--${team}`, text: `Équipe ${TEAM_ADJ[team] === 'bleu' ? 'bleue' : 'rouge'}` });
}

/** Panneau d'action selon le rôle (null pour les spectateurs sans indice à afficher). */
export function classicActionPanel(room) {
  const g = room.game;
  if (room.status !== 'en_cours') return null;
  const role = classicRole(room);
  const team = g.currentTeam;

  if (role.kind === 'capitaine') {
    const myTurn = team === role.team;
    if (myTurn && g.phase === 'indice') {
      return clueForm({ teamTagNode: teamTag(role.team), disabled: room.paused });
    }
    const head = el('div', { class: 'ds-panel__head' }, [el('span', { class: 'ds-label', text: myTurn ? 'Indice envoyé' : 'Tour adverse' }), teamTag(role.team)]);
    const body = [];
    if (g.clue) {
      body.push(clueDisplay(g.clue, myTurn ? 'md' : 'sm'));
      body.push(el('span', { class: 'ds-small ds-muted', text: `${essaisText(g.clue)} · ${g.clue.guessesMade} proposition${g.clue.guessesMade > 1 ? 's' : ''}` }));
    } else {
      body.push(el('p', { class: 'cn-waiting', text: `Le capitaine des ${TEAM_PLURAL[team]} cherche un indice…` }));
    }
    if (myTurn) body.push(el('p', { class: 'ds-small ds-faint', text: 'Vos agents devinent. Vous ne pouvez plus rien dire jusqu’à la fin du tour.' }));
    return el('section', { class: 'ds-panel ds-stack cn-action', 'aria-label': 'Indice' }, [head, ...body]);
  }

  // Agents et spectateurs
  const guessing = canGuess(room, role);
  const head = el('div', { class: 'ds-panel__head' }, [
    el('span', { class: 'ds-label', text: 'Indice du capitaine' }),
    el('span', { class: `cn-team-tag cn-team-tag--${team}`, text: `Équipe ${team === 'bleu' ? 'bleue' : 'rouge'}` })
  ]);
  const body = [head];
  if (g.clue) {
    body.push(clueDisplay(g.clue, 'lg'));
    body.push(el('span', { class: 'ds-small ds-muted', role: 'status', text: essaisText(g.clue) }));
  } else {
    body.push(el('p', { class: 'cn-waiting', text: `En attente de l’indice du capitaine des ${TEAM_PLURAL[team]}…` }));
  }
  if (guessing) {
    const sel = state.ui.selected;
    body.push(el('button', {
      class: 'ds-btn ds-btn--primary', id: 'cn-validate', type: 'button', disabled: sel === null,
      onclick: async () => {
        const index = state.ui.selected;
        if (index === null) return;
        state.ui.selected = null;
        await actions.guess(index);
      },
      text: sel === null ? 'Choisissez une carte' : `Valider « ${g.words[sel].toUpperCase()} »`
    }));
    const canPass = g.clue.guessesMade >= 1;
    body.push(el('button', {
      class: 'ds-btn', id: 'cn-pass', type: 'button', disabled: !canPass,
      'aria-describedby': canPass ? undefined : 'cn-pass-hint',
      onclick: () => actions.pass(), text: 'Passer le tour'
    }));
    if (!canPass) body.push(el('span', { class: 'ds-small ds-faint', id: 'cn-pass-hint', text: 'Possible après au moins une proposition.' }));
  } else if (role.kind === 'agent' && team !== role.team) {
    body.push(el('p', { class: 'ds-small ds-faint', text: `Au tour des ${TEAM_PLURAL[team]}. Concertez-vous dans le chat d’équipe.` }));
  } else if (role.kind === 'spectateur') {
    body.push(el('p', { class: 'ds-small ds-faint', text: 'Vous regardez la partie en spectateur.' }));
  }
  return el('section', { class: 'ds-panel ds-stack cn-action', 'aria-label': 'Indice du capitaine' }, body);
}

/** Pills de l'en-tête : rôle + cartes restantes par équipe. */
export function classicHeader(room) {
  const g = room.game;
  const role = classicRole(room);
  const playing = room.status === 'en_cours';
  const rolePill = role.kind === 'spectateur'
    ? el('span', { class: 'ds-pill cn-role-pill' }, [ICONS.eye(), 'Spectateur'])
    : el('span', { class: 'ds-pill cn-role-pill ds-pill--strong', 'aria-label': `Votre rôle : ${role.kind} de l’équipe ${TEAM_LABEL[role.team]}` }, [
      mark(TEAM_MARK[role.team]), role.kind === 'capitaine' ? 'Capitaine' : 'Agent', el('span', { class: 'ds-faint', text: `· ${TEAM_PLURAL[role.team]}` })
    ]);
  const scorePill = (team) => el('span', {
    class: `ds-pill${playing && g.currentTeam === team ? ' ds-pill--on' : ''}`,
    'aria-label': `${TEAM_PLURAL[team]} : ${g.remaining[team]} cartes restantes${playing && g.currentTeam === team ? ', équipe qui joue' : ''}`,
    'aria-current': playing && g.currentTeam === team ? 'true' : undefined
  }, [mark(TEAM_MARK[team]), TEAM_PLURAL[team], el('b', { text: String(g.remaining[team]) })]);
  const pills = [rolePill, scorePill('rouge'), scorePill('bleu')];
  if (room.match.totalRounds > 1) {
    pills.push(el('span', { class: 'ds-pill', 'aria-label': `Manche ${room.match.round} sur ${room.match.totalRounds}, score ${room.match.score.rouge} à ${room.match.score.bleu}` }, [
      `Manche ${room.match.round}/${room.match.totalRounds}`,
      el('b', { text: `${room.match.score.rouge}–${room.match.score.bleu}` })
    ]));
  }
  return pills;
}
