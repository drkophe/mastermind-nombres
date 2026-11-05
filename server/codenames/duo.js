'use strict';

const { CodenamesError } = require('./errors');
const { validateClue, displayCount } = require('./clue');
const { countDuoAgents } = require('./board');

/**
 * Logique pure du mode Duo (coopératif, règles officielles de Codenames Duo).
 * Chaque joueur (côté A ou B) a sa face de la clé : 9 agents, 3 assassins, 13 passants.
 * À chaque tour, le capitaine donne un indice d'après SA face ; l'autre devine.
 * Une révélation est jugée d'après la face du capitaine du tour.
 */

const otherSide = (side) => (side === 'A' ? 'B' : 'A');

function createDuoGame({ words, keys, tokens = 9, suddenDeath = true, firstGiver = 'A' }) {
  if (words.length !== 25 || keys.A.length !== 25 || keys.B.length !== 25) throw new Error('Plateau invalide');
  const game = {
    mode: 'duo',
    words,
    keys,
    found: Array(25).fill(false),
    // bystanders[X][i] : carte identifiée comme passant sur la face de X
    bystanders: { A: Array(25).fill(false), B: Array(25).fill(false) },
    agentsTotal: countDuoAgents(keys),
    tokensTotal: tokens,
    tokensLeft: tokens,
    suddenDeathEnabled: suddenDeath,
    giver: firstGiver,
    phase: 'indice', // indice | devinette | mort-subite | fin
    clue: null,
    history: [],
    // Journal public des révélations : qui a deviné, pour quel indice, avec quel résultat
    // (jugé sur la face du donneur). Ne contient rien que les joueurs ne voient déjà.
    reveals: [],
    result: null, // victoire | defaite
    endReason: null, // agents | assassin | temps | mort-subite | abandon
    assassinIndex: null,
    turnNumber: 1
  };
  game.giver = chooseGiver(game, firstGiver);
  return game;
}

function agentsLeft(game, side) {
  let n = 0;
  game.keys[side].forEach((c, i) => { if (c === 'agent' && !game.found[i]) n++; });
  return n;
}

function foundCount(game) {
  return game.found.filter(Boolean).length;
}

/** Le capitaine doit encore avoir des agents à faire deviner sur sa face. */
function chooseGiver(game, preferred) {
  if (agentsLeft(game, preferred) > 0) return preferred;
  return otherSide(preferred);
}

function requireSide(side) {
  if (side !== 'A' && side !== 'B') throw new CodenamesError('Vous ne jouez pas dans cette partie.');
}

function finish(game, result, reason) {
  game.result = result;
  game.endReason = reason;
  game.phase = 'fin';
  game.clue = null;
  game.history.push({ type: 'fin', result, reason });
}

function giveClue(game, side, rawWord, rawCount) {
  requireSide(side);
  if (game.phase === 'fin') throw new CodenamesError('La partie est terminée.');
  if (game.phase === 'mort-subite') throw new CodenamesError('Mort subite : plus d\'indices, il faut deviner.');
  if (side !== game.giver) throw new CodenamesError('Ce n\'est pas à vous de donner l\'indice.');
  if (game.phase !== 'indice') throw new CodenamesError('L\'indice a déjà été donné.');
  const clue = validateClue(rawWord, rawCount, game.words, game.found);
  game.clue = {
    giver: side,
    word: clue.word,
    count: clue.count,
    unlimited: clue.unlimited,
    display: displayCount(clue),
    guessesMade: 0,
    agentsFound: 0
  };
  game.phase = 'devinette';
  game.history.push({ type: 'indice', side, word: clue.word, count: game.clue.display, turn: game.turnNumber });
  return game.clue;
}

function endTurn(game, reason) {
  game.history.push({ type: 'fin-tour', side: game.giver, reason, turn: game.turnNumber });
  game.clue = null;
  game.tokensLeft = Math.max(0, game.tokensLeft - 1);
  game.turnNumber++;
  if (game.tokensLeft === 0) {
    if (game.suddenDeathEnabled) {
      game.phase = 'mort-subite';
      game.history.push({ type: 'info', text: 'Plus de jetons : mort subite ! Toute erreur fait perdre.' });
    } else {
      finish(game, 'defaite', 'temps');
    }
    return;
  }
  game.giver = chooseGiver(game, otherSide(game.giver));
  game.phase = 'indice';
}

const RESULT = { agent: 'agent', neutre: 'passant', assassin: 'assassin' };

function logReveal(game, { index, guesser, giver, color, suddenDeath }) {
  game.reveals.push({
    index,
    guesser,
    giver,
    result: RESULT[color],
    turn: suddenDeath ? null : game.turnNumber,
    clue: !suddenDeath && game.clue ? { word: game.clue.word, count: game.clue.display } : null,
    suddenDeath: !!suddenDeath
  });
}

function checkIndex(game, index) {
  if (!Number.isInteger(index) || index < 0 || index >= 25) throw new CodenamesError('Carte invalide.');
  if (game.found[index]) throw new CodenamesError('Cet agent a déjà été trouvé.');
}

/**
 * Révélation par le joueur qui devine (ou par n'importe quel joueur en mort subite).
 * Renvoie { color, turnEnded, result }.
 */
function guess(game, side, index) {
  requireSide(side);
  if (game.phase === 'fin') throw new CodenamesError('La partie est terminée.');

  if (game.phase === 'mort-subite') {
    // Chaque joueur désigne un agent de la face de son partenaire ; toute erreur est fatale.
    checkIndex(game, index);
    const judge = otherSide(side);
    const color = game.keys[judge][index];
    game.history.push({ type: 'carte', side: judge, guesser: side, index, word: game.words[index], color, suddenDeath: true });
    logReveal(game, { index, guesser: side, giver: judge, color, suddenDeath: true });
    if (color === 'agent') {
      game.found[index] = true;
      if (foundCount(game) === game.agentsTotal) finish(game, 'victoire', 'agents');
    } else {
      if (color === 'assassin') game.assassinIndex = index;
      if (color === 'neutre') game.bystanders[judge][index] = true;
      finish(game, 'defaite', color === 'assassin' ? 'assassin' : 'mort-subite');
    }
    return { color, turnEnded: true, result: game.result };
  }

  if (side === game.giver) throw new CodenamesError('C\'est votre partenaire qui devine ce tour-ci.');
  if (game.phase !== 'devinette') throw new CodenamesError('Attendez l\'indice de votre partenaire.');
  checkIndex(game, index);
  if (game.bystanders[game.giver][index]) throw new CodenamesError('Cette carte est déjà identifiée comme passant pour votre partenaire.');

  const giver = game.giver;
  const color = game.keys[giver][index];
  game.clue.guessesMade++;
  game.history.push({ type: 'carte', side: giver, guesser: side, index, word: game.words[index], color, turn: game.turnNumber });
  logReveal(game, { index, guesser: side, giver, color, suddenDeath: false });

  if (color === 'agent') {
    game.found[index] = true;
    game.clue.agentsFound++;
    if (foundCount(game) === game.agentsTotal) {
      finish(game, 'victoire', 'agents');
    } else if (agentsLeft(game, giver) === 0) {
      // Plus rien à faire deviner sur cette face : le tour s'arrête.
      endTurn(game, 'face-terminee');
    }
  } else if (color === 'neutre') {
    game.bystanders[giver][index] = true;
    endTurn(game, 'neutre');
  } else {
    game.assassinIndex = index;
    finish(game, 'defaite', 'assassin');
  }
  return { color, turnEnded: game.phase !== 'devinette', result: game.result };
}

/** Passer volontairement après au moins une proposition (consomme un jeton). */
function pass(game, side) {
  requireSide(side);
  if (game.phase !== 'devinette') throw new CodenamesError('Vous ne pouvez pas passer maintenant.');
  if (side === game.giver) throw new CodenamesError('C\'est votre partenaire qui devine ce tour-ci.');
  if (game.clue.guessesMade < 1) throw new CodenamesError('Faites au moins une proposition avant de passer.');
  endTurn(game, 'passe');
}

/** Expiration du timer de tour : le tour se termine et consomme un jeton. */
function timeout(game) {
  if (game.phase === 'indice' || game.phase === 'devinette') endTurn(game, 'temps');
}

function abort(game) {
  if (game.phase !== 'fin') finish(game, 'defaite', 'abandon');
}

module.exports = { createDuoGame, giveClue, guess, pass, timeout, abort, agentsLeft, foundCount, otherSide };
