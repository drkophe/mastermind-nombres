/*
 * Écran « Lobby » : composition des équipes, spectateurs, paramètres, lancement.
 */
import { el, replace, clear, ICONS } from '/assets/ds/dom.js';
import { state, me, isHost } from '../state.js';
import { actions } from '../api.js';
import { segmented, mark, memberName, roomBar, TEAM_LABEL, TEAM_MARK, other } from './common.js';
import { mountSide } from './side.js';

const ENUM_LABELS = {
  wordPack: { classique: 'Mots courants' },
  captainMode: { 'fixe': 'Fixes pour toute la session', 'rotation-tour': 'Rotation à tour de rôle', 'rotation-aleatoire': 'Rotation aléatoire' },
  startingTeam: { aleatoire: 'Aléatoire', alternee: 'Alternée', rouge: 'Rouges', bleu: 'Bleus' },
  teamAssignment: { manuelle: 'Manuelle (chacun choisit)', aleatoire: 'Aléatoire (tirage au lancement)' }
};
const DURATION_FIELDS = ['clueSeconds', 'guessSeconds', 'turnSeconds'];

let layout = null;
let settingsKey = null;

function build(view) {
  const main = el('section', { class: 'cn-lobby__main', 'aria-label': 'Composition du salon' });
  const side = el('aside', { class: 'cn-side', 'aria-label': 'Discussion' });
  const bar = el('div', { class: 'cn-lobby__bar' });
  replace(view, el('div', { class: 'cn-lobby' }, [bar, el('div', { class: 'cn-columns' }, [main, side])]));
  const teams = el('div', { class: 'cn-teams' });
  const spectators = el('div', { class: 'cn-spectators' });
  const settings = el('section', { class: 'ds-panel ds-stack cn-settings', 'aria-labelledby': 'cn-settings-title' });
  const footer = el('div', { class: 'cn-lobby__footer' });
  replace(main, [teams, spectators, settings, footer]);
  layout = { view, bar, teams, spectators, settings, footer, side };
  settingsKey = null;
}

function hostTools(m, mode) {
  if (!isHost() || m.id === state.playerId) return null;
  const tools = [];
  if (mode === 'classique') {
    tools.push(el('button', { class: 'ds-btn ds-btn--small ds-btn--square', type: 'button', title: 'Changer d’équipe', 'aria-label': `Mettre ${m.name} dans l’autre équipe`, onclick: () => actions.assign({ playerId: m.id, team: other(m.team) }) }, [ICONS.swap()]));
    if (m.role !== 'capitaine') {
      tools.push(el('button', { class: 'ds-btn ds-btn--small ds-btn--square', type: 'button', title: 'Nommer capitaine', 'aria-label': `Nommer ${m.name} capitaine`, onclick: () => actions.assign({ playerId: m.id, role: 'capitaine' }) }, [ICONS.hat()]));
    }
  }
  tools.push(el('button', { class: 'ds-btn ds-btn--small ds-btn--square', type: 'button', title: 'Passer spectateur', 'aria-label': `Passer ${m.name} en spectateur`, onclick: () => actions.assign({ playerId: m.id, kind: 'spectateur' }) }, [ICONS.eye()]));
  tools.push(el('button', { class: 'ds-btn ds-btn--small ds-btn--square', type: 'button', title: 'Donner le rôle d’hôte', 'aria-label': `Donner le rôle d’hôte à ${m.name}`, onclick: () => actions.transferHost(m.id) }, [ICONS.star()]));
  return el('span', { class: 'cn-member__tools' }, tools);
}

function memberRow(m, mode) {
  const roleText = mode === 'duo' ? '' : m.role === 'capitaine' ? 'Capitaine' : 'Agent';
  return el('li', { class: `cn-member${m.connected ? '' : ' is-offline'}${m.id === state.playerId ? ' is-me' : ''}` }, [
    el('span', { class: 'cn-member__id' }, [
      el('span', { class: `cn-presence${m.connected ? ' is-on' : ''}`, title: m.connected ? 'Connecté' : 'Déconnecté', 'aria-hidden': 'true' }),
      el('span', { class: 'cn-member__name', text: memberName(m) }),
      m.isHost ? el('span', { class: 'cn-host', title: 'Hôte du salon', 'aria-label': 'hôte' }, [ICONS.star()]) : null,
      roleText ? el('span', { class: `cn-role${m.role === 'capitaine' ? ' is-captain' : ''}` }, [m.role === 'capitaine' ? ICONS.hat() : null, roleText]) : null,
      m.connected ? null : el('span', { class: 'sr-only', text: '(déconnecté)' })
    ]),
    hostTools(m, mode)
  ]);
}

function renderTeams(room) {
  const mine = me();
  const mode = room.settings.mode;
  const players = room.members.filter((m) => m.kind === 'joueur');
  const manual = room.settings.classic.teamAssignment === 'manuelle';
  const boxes = [];

  if (mode === 'classique') {
    for (const team of ['rouge', 'bleu']) {
      const members = players.filter((m) => m.team === team)
        .sort((a, b) => (b.role === 'capitaine') - (a.role === 'capitaine'));
      const actionsRow = [];
      if (mine && (manual || isHost())) {
        if (mine.kind !== 'joueur' || mine.team !== team) {
          actionsRow.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.assign({ kind: 'joueur', team, role: 'agent' }), text: `Rejoindre les ${team === 'rouge' ? 'Rouges' : 'Bleus'}` }));
        } else if (mine.role !== 'capitaine') {
          actionsRow.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.assign({ role: 'capitaine' }) }, [ICONS.hat(), 'Devenir capitaine']));
        } else {
          actionsRow.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.assign({ role: 'agent' }), text: 'Redevenir agent' }));
        }
      }
      boxes.push(el('section', { class: `ds-panel cn-team cn-team--${team}`, 'aria-label': `Équipe ${TEAM_LABEL[team]}` }, [
        el('div', { class: 'ds-panel__head' }, [
          el('h3', { class: 'cn-team__title' }, [mark(TEAM_MARK[team]), `Équipe ${TEAM_LABEL[team]}`]),
          el('span', { class: 'ds-small ds-faint', text: `${members.length} joueur${members.length > 1 ? 's' : ''}` })
        ]),
        members.length
          ? el('ul', { class: 'cn-members' }, members.map((m) => memberRow(m, mode)))
          : el('p', { class: 'cn-team__empty ds-small ds-faint', text: 'Personne pour l’instant.' }),
        actionsRow.length ? el('div', { class: 'cn-team__actions' }, actionsRow) : null
      ]));
    }
  } else {
    for (const side of ['A', 'B']) {
      const m = players.find((p) => p.side === side);
      const canTake = mine && (!m || m.id !== state.playerId) && (mine.kind === 'joueur' || !m);
      boxes.push(el('section', { class: 'ds-panel cn-team cn-team--duo', 'aria-label': `Joueur ${side}` }, [
        el('div', { class: 'ds-panel__head' }, [
          el('h3', { class: 'cn-team__title' }, [mark('green'), `Joueur ${side}`]),
          el('span', { class: 'ds-small ds-faint', text: m ? 'Place prise' : 'Place libre' })
        ]),
        m ? el('ul', { class: 'cn-members' }, [memberRow(m, mode)]) : el('p', { class: 'cn-team__empty ds-small ds-faint', text: 'En attente d’un joueur.' }),
        canTake ? el('div', { class: 'cn-team__actions' }, [
          el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.assign({ kind: 'joueur', side }), text: m ? 'Échanger les places' : 'Prendre cette place' })
        ]) : null
      ]));
    }
  }
  replace(layout.teams, boxes);
}

function renderSpectators(room) {
  const mine = me();
  const spectators = room.members.filter((m) => m.kind === 'spectateur');
  const tools = [];
  if (mine && mine.kind === 'joueur' && (room.settings.spectatorsAllowed || isHost())) {
    tools.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.assign({ kind: 'spectateur' }) }, [ICONS.eye(), 'Devenir spectateur']));
  }
  if (isHost() && room.settings.mode === 'classique') {
    tools.push(el('button', { class: 'ds-btn ds-btn--small', type: 'button', onclick: () => actions.shuffle() }, [ICONS.dice(), 'Répartir au hasard']));
  }
  replace(layout.spectators, [
    el('div', { class: 'cn-spectators__list' }, [
      el('span', { class: 'ds-label', text: 'Spectateurs' }),
      spectators.length
        ? el('ul', { class: 'cn-chips' }, spectators.map((m) => el('li', { class: `cn-chip${m.connected ? '' : ' is-offline'}` }, [ICONS.eye(), memberName(m), m.isHost ? ICONS.star() : null])))
        : el('span', { class: 'ds-small ds-faint', text: room.settings.spectatorsAllowed ? 'Aucun pour l’instant.' : 'Non autorisés dans ce salon.' })
    ]),
    tools.length ? el('div', { class: 'cn-spectators__tools' }, tools) : null
  ]);
}

function field(path, def, value, editable) {
  const key = path[path.length - 1];
  const id = `set-${path.join('-')}`;
  const commit = (v) => {
    const patch = {};
    let cursor = patch;
    path.slice(0, -1).forEach((p) => { cursor[p] = {}; cursor = cursor[p]; });
    cursor[key] = v;
    actions.updateSettings(patch);
  };
  if (def.type === 'bool') {
    const input = el('input', { type: 'checkbox', id, checked: !!value, disabled: !editable, onchange: (e) => commit(e.target.checked) });
    return el('label', { class: 'ds-check cn-setting', for: id }, [input, def.label]);
  }
  if (key === 'mode') {
    return el('div', { class: 'ds-form-row cn-setting cn-setting--wide' }, [
      el('span', { id: `${id}-label`, text: def.label }),
      segmented({ labelledBy: `${id}-label`, options: [['classique', 'Classique'], ['duo', 'Duo']], value, disabled: !editable, onChange: commit, id })
    ]);
  }
  let input;
  if (def.type === 'enum') {
    input = el('select', { class: 'ds-field', id, disabled: !editable, onchange: (e) => commit(e.target.value) },
      def.values.map((v) => el('option', { value: v, selected: v === value, text: (ENUM_LABELS[key] && ENUM_LABELS[key][v]) || v })));
  } else {
    input = el('input', { class: 'ds-field', type: 'number', id, min: def.min, max: def.max, step: 1, value, inputmode: 'numeric', disabled: !editable, onchange: (e) => commit(parseInt(e.target.value, 10)) });
  }
  const hint = DURATION_FIELDS.includes(key) || key === 'rounds' || key === 'timeTokens' ? `${def.min} à ${def.max}` : null;
  return el('label', { class: 'ds-form-row cn-setting', for: id }, [
    el('span', { class: 'cn-setting__label' }, [def.label, hint ? el('span', { class: 'ds-faint', text: ` · ${hint}` }) : null]),
    input
  ]);
}

function renderSettings(room) {
  const editable = isHost() && room.status === 'attente';
  const key = JSON.stringify([room.settings, editable, !!state.schema]);
  if (key === settingsKey) return;
  settingsKey = key;
  const focusedId = layout.settings.contains(document.activeElement) ? document.activeElement.id : null;

  const fields = [];
  const schema = state.schema || {};
  const mode = room.settings.mode;
  for (const [k, def] of Object.entries(schema)) {
    if (def.type !== 'group') { fields.push(field([k], def, room.settings[k], editable)); continue; }
    if ((k === 'classic' && mode !== 'classique') || (k === 'duo' && mode !== 'duo')) continue;
    for (const [sub, subDef] of Object.entries(def.fields)) {
      if (DURATION_FIELDS.includes(sub) && !room.settings[k].timerEnabled) continue;
      fields.push(field([k, sub], subDef, room.settings[k][sub], editable));
    }
  }
  replace(layout.settings, [
    el('div', { class: 'ds-panel__head' }, [
      el('h2', { class: 'ds-label', id: 'cn-settings-title', text: 'Paramètres' }),
      editable
        ? el('span', { class: 'ds-small ds-faint', text: 'Modifiables jusqu’au lancement' })
        : el('span', { class: 'cn-locked ds-small ds-faint' }, [ICONS.lock(), 'Définis par l’hôte'])
    ]),
    el('div', { class: 'cn-settings__grid' }, fields)
  ]);
  if (focusedId) {
    const again = document.getElementById(focusedId);
    if (again) again.focus();
  }
}

function renderFooter(room) {
  const count = room.members.filter((m) => m.kind === 'joueur').length;
  const enough = count >= room.minPlayers;
  const info = isHost()
    ? (enough ? 'Tout le monde est prêt ? Lancez la partie.' : `En attente de joueurs : ${count} sur ${room.minPlayers} minimum.`)
    : 'En attente du lancement par l’hôte…';
  replace(layout.footer, [
    el('p', { class: 'ds-small ds-muted', role: 'status', text: info }),
    isHost() ? el('button', { class: 'ds-btn ds-btn--primary cn-start', type: 'button', disabled: !enough, onclick: () => actions.start(), text: 'Lancer la partie' }) : null
  ]);
}

export function renderLobby(view, header) {
  if (!layout || layout.view !== view || !view.contains(layout.teams)) build(view);
  clear(header);
  const room = state.room;
  replace(layout.bar, roomBar());
  renderTeams(room);
  renderSpectators(room);
  renderSettings(room);
  renderFooter(room);
  mountSide(layout.side, { context: 'lobby' });
}
