'use strict';

const { CodenamesError } = require('./errors');
const { defaultRng, shuffle } = require('./util');
const { generateClassicKey, drawWords } = require('./board');
const classic = require('./classic');
const { TEAMS } = require('./rooms');

/**
 * Orchestration des manches : lancement, actions des joueurs, fin de manche,
 * manches suivantes. S'appuie sur la logique pure (classic.js / duo.js).
 */
class MatchController {
  constructor({ manager, packs, rng = defaultRng }) {
    this.manager = manager;
    this.packs = packs;
    this.rng = rng;
  }

  // ---------- Utilitaires ----------

  context(roomId, actorId) {
    const room = this.manager.requireRoom(roomId);
    const member = room.members.get(actorId);
    if (!member) throw new CodenamesError('Vous n\'êtes pas dans ce salon.');
    return { room, member };
  }

  requireGame(room) {
    if (!room.game || room.status !== 'en_cours') throw new CodenamesError('Aucune manche en cours.');
    return room.game;
  }

  classicActor(member) {
    if (member.kind !== 'joueur') throw new CodenamesError('Les spectateurs ne peuvent pas jouer.');
    return { team: member.team, role: member.role };
  }

  wordsFor(room) {
    const pack = this.packs.get(room.settings.wordPack) || this.packs.values().next().value;
    return drawWords(pack.words, room.usedWords, this.rng);
  }

  // ---------- Lancement ----------

  start(roomId, actorId) {
    const { room } = this.context(roomId, actorId);
    this.manager.requireHost(room, actorId);
    if (room.status !== 'attente') throw new CodenamesError('La partie est déjà lancée.');
    if (room.settings.mode === 'classique' && room.settings.classic.teamAssignment === 'aleatoire') {
      this.manager.randomizeTeams(room);
    }
    this.manager.validateLineup(room);
    room.match = { round: 0, score: { rouge: 0, bleu: 0 }, lastStartingTeam: null, over: false };
    this.startRound(room);
  }

  startRound(room) {
    room.match.round++;
    room.notice = null;
    room.chat.teams = { rouge: [], bleu: [], duo: [] }; // le chat d'équipe repart à zéro à chaque manche
    if (room.settings.mode === 'classique') this.startClassicRound(room);
    room.status = 'en_cours';
    this.manager.touch(room);
    this.manager.changed(room, true);
  }

  pickStartingTeam(room) {
    const setting = room.settings.classic.startingTeam;
    const last = room.match.lastStartingTeam;
    if (setting === 'rouge' || setting === 'bleu') return setting;
    if (setting === 'alternee' && last) return classic.otherTeam(last);
    return this.rng() < 0.5 ? 'rouge' : 'bleu';
  }

  startClassicRound(room) {
    const startingTeam = this.pickStartingTeam(room);
    room.match.lastStartingTeam = startingTeam;
    room.game = classic.createClassicGame({
      words: this.wordsFor(room),
      key: generateClassicKey(startingTeam, this.rng),
      startingTeam
    });
  }

  /** Rotation des capitaines entre deux manches, selon le paramètre. */
  rotateCaptains(room) {
    const mode = room.settings.classic.captainMode;
    if (mode === 'fixe') return;
    for (const team of TEAMS) {
      const members = this.manager.players(room)
        .filter((p) => p.team === team)
        .sort((a, b) => a.joinedAt - b.joinedAt);
      if (members.length < 2) continue;
      const currentIndex = members.findIndex((p) => p.role === 'capitaine');
      let next;
      if (mode === 'rotation-tour') {
        next = members[(currentIndex + 1) % members.length];
      } else {
        next = shuffle(members.filter((_, i) => i !== currentIndex), this.rng)[0];
      }
      members.forEach((p) => { p.role = p === next ? 'capitaine' : 'agent'; });
    }
  }

  // ---------- Actions Classique ----------

  clue(roomId, actorId, word, count) {
    const { room, member } = this.context(roomId, actorId);
    const game = this.requireGame(room);
    if (game.mode !== 'classique') return this.duoClue(room, member, word, count);
    classic.giveClue(game, this.classicActor(member), word, count);
    this.afterAction(room);
  }

  guess(roomId, actorId, index) {
    const { room, member } = this.context(roomId, actorId);
    const game = this.requireGame(room);
    if (game.mode !== 'classique') return this.duoGuess(room, member, index);
    classic.guess(game, this.classicActor(member), index);
    this.afterAction(room);
  }

  pass(roomId, actorId) {
    const { room, member } = this.context(roomId, actorId);
    const game = this.requireGame(room);
    if (game.mode !== 'classique') return this.duoPass(room, member);
    classic.pass(game, this.classicActor(member));
    this.afterAction(room);
  }

  /** Après chaque action : fin de manche éventuelle, puis diffusion. */
  afterAction(room) {
    if (room.game.phase === 'fin') this.endRound(room);
    this.manager.touch(room);
    this.manager.changed(room, room.status !== 'en_cours');
  }

  endRound(room) {
    const game = room.game;
    room.status = 'terminee';
    if (game.mode === 'classique' && game.winner) room.match.score[game.winner]++;
    const rounds = room.settings.mode === 'classique' ? room.settings.classic.rounds : 1;
    room.match.over = room.match.round >= rounds;
  }

  /** Manche suivante, ou nouvelle partie si toutes les manches ont été jouées. */
  next(roomId, actorId) {
    const { room } = this.context(roomId, actorId);
    this.manager.requireHost(room, actorId);
    if (room.status !== 'terminee') throw new CodenamesError('La manche n\'est pas terminée.');
    if (room.match.over) {
      room.match = { round: 0, score: { rouge: 0, bleu: 0 }, lastStartingTeam: room.match.lastStartingTeam, over: false };
    }
    if (room.settings.mode === 'classique') {
      this.rotateCaptains(room);
      this.manager.validateLineup(room);
    } else {
      this.manager.validateLineup(room);
    }
    this.startRound(room);
  }

  /** Retour au lobby (changer les équipes ou les paramètres). */
  toLobby(roomId, actorId) {
    const { room } = this.context(roomId, actorId);
    this.manager.requireHost(room, actorId);
    if (room.game && room.game.phase !== 'fin') {
      if (room.game.mode === 'classique') classic.abort(room.game);
    }
    room.game = null;
    room.status = 'attente';
    room.notice = null;
    room.match = { round: 0, score: { rouge: 0, bleu: 0 }, lastStartingTeam: null, over: false };
    // Les joueurs déconnectés pendant la partie libèrent leur place dans le lobby.
    for (const m of room.members.values()) {
      if (!m.connected) this.manager.disconnectInLobby(room, m);
    }
    this.manager.touch(room);
    this.manager.changed(room, true);
  }

  // ---------- Vue ----------

  /** Ce que voit un membre de la manche en cours. */
  gameView(room, member) {
    const game = room.game;
    if (!game) return null;
    if (game.mode === 'classique') return classicView(game, member);
    return this.duoView(room, member);
  }

  // Implémentés par le mode Duo (étape 7).
  duoClue() { throw new CodenamesError('Mode non disponible.'); }
  duoGuess() { throw new CodenamesError('Mode non disponible.'); }
  duoPass() { throw new CodenamesError('Mode non disponible.'); }
  duoView() { return null; }
}

/**
 * Vue Classique : la clé complète n'est envoyée qu'aux capitaines, et à tous en fin de manche.
 * Les autres ne reçoivent que la couleur des cartes déjà révélées.
 */
function classicView(game, member) {
  const ended = game.phase === 'fin';
  const isCaptain = !!member && member.kind === 'joueur' && member.role === 'capitaine';
  return {
    mode: 'classique',
    words: game.words,
    revealed: game.revealed.map((r, i) => (r ? game.key[i] : null)),
    key: ended || isCaptain ? game.key.slice() : null,
    startingTeam: game.startingTeam,
    currentTeam: game.currentTeam,
    phase: game.phase,
    clue: game.clue
      ? { team: game.clue.team, word: game.clue.word, display: game.clue.display, guessesLeft: game.clue.guessesLeft, guessesMade: game.clue.guessesMade }
      : null,
    remaining: { rouge: classic.remaining(game, 'rouge'), bleu: classic.remaining(game, 'bleu') },
    history: game.history.slice(-200),
    winner: game.winner,
    endReason: game.endReason,
    turnNumber: game.turnNumber
  };
}

module.exports = { MatchController, classicView };
