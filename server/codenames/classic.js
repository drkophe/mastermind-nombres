'use strict';

const { CodenamesError } = require('./errors');
const { validateClue, maxGuessesFor, displayCount } = require('./clue');

/**
 * Logique pure du mode Classique. Les fonctions modifient l'état reçu
 * et lèvent une CodenamesError si l'action est invalide.
 * actor : { team: 'rouge'|'bleu', role: 'capitaine'|'agent' }
 */

const otherTeam = (team) => (team === 'rouge' ? 'bleu' : 'rouge');

function createClassicGame({ words, key, startingTeam }) {
  if (words.length !== 25 || key.length !== 25) throw new Error('Plateau invalide');
  return {
    mode: 'classique',
    words,
    key,
    revealed: Array(25).fill(false),
    startingTeam,
    currentTeam: startingTeam,
    phase: 'indice', // indice | devinette | fin
    clue: null,
    history: [],
    winner: null,
    endReason: null, // cartes | assassin | abandon
    turnNumber: 1
  };
}

function remaining(game, team) {
  let n = 0;
  game.key.forEach((color, i) => { if (color === team && !game.revealed[i]) n++; });
  return n;
}

function requireTurn(game, actor, role, phase) {
  if (game.phase === 'fin') throw new CodenamesError('La manche est terminée.');
  if (!actor || (actor.team !== 'rouge' && actor.team !== 'bleu')) throw new CodenamesError('Vous ne jouez pas dans cette manche.');
  if (actor.team !== game.currentTeam) throw new CodenamesError('Ce n\'est pas le tour de votre équipe.');
  if (actor.role !== role) {
    throw new CodenamesError(role === 'capitaine' ? 'Seul le capitaine donne l\'indice.' : 'Seuls les agents peuvent deviner.');
  }
  if (game.phase !== phase) {
    throw new CodenamesError(phase === 'indice' ? 'L\'indice a déjà été donné.' : 'Attendez l\'indice de votre capitaine.');
  }
}

function giveClue(game, actor, rawWord, rawCount) {
  requireTurn(game, actor, 'capitaine', 'indice');
  const clue = validateClue(rawWord, rawCount, game.words, game.revealed);
  game.clue = {
    team: actor.team,
    word: clue.word,
    count: clue.count,
    unlimited: clue.unlimited,
    display: displayCount(clue),
    guessesLeft: maxGuessesFor(clue), // null = illimité
    guessesMade: 0
  };
  game.phase = 'devinette';
  game.history.push({ type: 'indice', team: actor.team, word: clue.word, count: game.clue.display, turn: game.turnNumber });
  return game.clue;
}

function finish(game, winner, reason) {
  game.winner = winner;
  game.endReason = reason;
  game.phase = 'fin';
  game.clue = null;
  game.history.push({ type: 'fin', winner, reason });
}

function endTurn(game, reason) {
  game.history.push({ type: 'fin-tour', team: game.currentTeam, reason, turn: game.turnNumber });
  game.currentTeam = otherTeam(game.currentTeam);
  game.phase = 'indice';
  game.clue = null;
  game.turnNumber++;
}

/**
 * Révélation d'une carte par un agent.
 * Renvoie { color, turnEnded, winner }.
 */
function guess(game, actor, index) {
  requireTurn(game, actor, 'agent', 'devinette');
  if (!Number.isInteger(index) || index < 0 || index >= 25) throw new CodenamesError('Carte invalide.');
  if (game.revealed[index]) throw new CodenamesError('Cette carte est déjà révélée.');

  const team = actor.team;
  const color = game.key[index];
  game.revealed[index] = true;
  game.clue.guessesMade++;
  if (game.clue.guessesLeft !== null) game.clue.guessesLeft--;
  game.history.push({ type: 'carte', team, index, word: game.words[index], color, turn: game.turnNumber });

  if (color === 'assassin') {
    finish(game, otherTeam(team), 'assassin');
  } else if ((color === 'rouge' || color === 'bleu') && remaining(game, color) === 0) {
    // Révéler la dernière carte adverse fait gagner l'adversaire.
    finish(game, color, 'cartes');
  } else if (color !== team) {
    endTurn(game, color === 'neutre' ? 'neutre' : 'adverse');
  } else if (game.clue.guessesLeft === 0) {
    endTurn(game, 'essais');
  }
  return { color, turnEnded: game.phase !== 'devinette' || game.currentTeam !== team, winner: game.winner };
}

/** Les agents passent volontairement, après au moins une proposition. */
function pass(game, actor) {
  requireTurn(game, actor, 'agent', 'devinette');
  if (game.clue.guessesMade < 1) throw new CodenamesError('Faites au moins une proposition avant de passer.');
  endTurn(game, 'passe');
}

/** Expiration du timer : l'équipe en cours passe son tour, quelle que soit la phase. */
function timeout(game) {
  if (game.phase === 'fin') return;
  endTurn(game, game.phase === 'indice' ? 'temps-indice' : 'temps-devinette');
}

function abort(game) {
  if (game.phase !== 'fin') finish(game, null, 'abandon');
}

module.exports = { createClassicGame, giveClue, guess, pass, timeout, abort, remaining, otherTeam };
