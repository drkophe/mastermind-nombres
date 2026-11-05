'use strict';

const { CodenamesError } = require('./errors');
const { defaultRng, shuffle } = require('./util');
const { generateClassicKey, generateDuoKeys, drawWords } = require('./board');
const classic = require('./classic');
const duo = require('./duo');
const { TEAMS } = require('./rooms');
const { TurnTimer } = require('./timer');

/**
 * Orchestration des manches : lancement, actions des joueurs, fin de manche,
 * manches suivantes. S'appuie sur la logique pure (classic.js / duo.js).
 */
const CAPTAIN_GRACE_MS = 60 * 1000; // capitaine absent : l'hôte peut nommer un remplaçant
const CAPTAIN_AUTO_MS = 60 * 1000; // puis promotion automatique après ce délai supplémentaire

class MatchController {
  constructor({ manager, packs, rng = defaultRng, timings = {} }) {
    this.captainGraceMs = timings.captainGraceMs || CAPTAIN_GRACE_MS;
    this.captainAutoMs = timings.captainAutoMs || CAPTAIN_AUTO_MS;
    this.manager = manager;
    this.packs = packs;
    this.rng = rng;
    this.timer = new TurnTimer(manager);
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
    if (room.paused) throw new CodenamesError('Partie en pause : un joueur est déconnecté.');
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
    else this.startDuoRound(room);
    room.status = 'en_cours';
    room.paused = false;
    this.refreshPresence(room);
    this.syncTimer(room);
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

  startDuoRound(room) {
    const s = room.settings.duo;
    room.game = duo.createDuoGame({
      words: this.wordsFor(room),
      keys: generateDuoKeys(this.rng),
      tokens: s.timeTokens,
      suddenDeath: s.suddenDeath,
      clueEnd: s.clueEnd || 'strict', // salons créés avant l'option : « Strict » par défaut
      firstGiver: this.rng() < 0.5 ? 'A' : 'B'
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
    this.updatePause(room);
    room.notice = this.buildNotice(room);
    this.syncTimer(room);
    this.manager.touch(room);
    this.manager.changed(room, room.status !== 'en_cours');
  }

  endRound(room) {
    const game = room.game;
    room.status = 'terminee';
    room.paused = false;
    room.notice = null;
    this.clearCaptainWatch(room);
    this.timer.stop(room);
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
      else duo.abort(room.game);
    }
    this.timer.stop(room);
    this.clearCaptainWatch(room);
    room.paused = false;
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

  // ---------- Présence : déconnexions, reconnexions, départs ----------

  /**
   * La partie est en pause quand le joueur qui doit agir manque :
   * - Duo : l'un des deux joueurs est déconnecté ;
   * - Classique : le capitaine de l'équipe en cours est absent pendant la phase d'indice.
   */
  shouldPause(room) {
    const game = room.game;
    if (room.status !== 'en_cours' || !game || game.phase === 'fin') return false;
    const players = this.manager.players(room);
    if (game.mode === 'duo') return players.some((p) => !p.connected);
    if (game.phase !== 'indice') return false;
    const captain = players.find((p) => p.team === game.currentTeam && p.role === 'capitaine');
    return !captain || !captain.connected;
  }

  updatePause(room) {
    const paused = this.shouldPause(room);
    if (paused === !!room.paused) return;
    room.paused = paused;
    if (paused) this.timer.pause(room);
    else this.timer.resume(room);
  }

  /** Recalcule pause et surveillance des capitaines après un changement de présence. */
  refreshPresence(room) {
    if (room.status !== 'en_cours' || !room.game) return;
    if (room.game.mode === 'classique') {
      for (const team of TEAMS) {
        const captain = this.manager.players(room).find((p) => p.team === team && p.role === 'capitaine');
        if (!captain || !captain.connected) this.watchCaptain(room, team);
        else this.clearCaptainWatch(room, team);
      }
    }
    this.updatePause(room);
    room.notice = this.buildNotice(room);
  }

  buildNotice(room) {
    if (room.status !== 'en_cours' || !room.game) return null;
    if (room.game.mode === 'duo') {
      const missing = this.manager.players(room).filter((p) => !p.connected);
      return missing.length ? { type: 'pause', text: `${missing.map((p) => p.name).join(' et ')} est déconnecté(e) : partie en pause en attendant son retour.` } : null;
    }
    const players = this.manager.players(room);
    const absent = TEAMS.filter((t) => {
      const captain = players.find((p) => p.team === t && p.role === 'capitaine');
      return !captain || !captain.connected;
    });
    if (!absent.length) return null;
    const total = Math.round((this.captainGraceMs + this.captainAutoMs) / 60000);
    return {
      type: 'capitaine-absent',
      teams: absent,
      text: absent.map((t) => `Le capitaine de l'équipe ${t === 'rouge' ? 'Rouge' : 'Bleue'} est déconnecté.`).join(' ') +
        (room.paused ? ' Partie en pause.' : '') +
        ` L'hôte peut nommer un agent capitaine ; sinon un agent sera promu automatiquement après ${total} min.`
    };
  }

  watchCaptain(room, team) {
    const graceKey = `capitaine:${team}`;
    if (room.timers.has(graceKey) || room.timers.has(`capitaine-auto:${team}`)) return;
    if ((room.absentCaptains || []).includes(team)) {
      // Délais écoulés sans agent disponible : on retente dès qu'un agent est là.
      this.autoPromote(room, team);
      return;
    }
    this.manager.setTimer(room, graceKey, this.captainGraceMs, () => {
      room.absentCaptains = [...new Set([...(room.absentCaptains || []), team])];
      room.notice = this.buildNotice(room);
      this.manager.changed(room, false);
      this.manager.setTimer(room, `capitaine-auto:${team}`, this.captainAutoMs, () => this.autoPromote(room, team));
    });
  }

  clearCaptainWatch(room, team) {
    for (const t of team ? [team] : TEAMS) {
      this.manager.clearTimer(room, `capitaine:${t}`);
      this.manager.clearTimer(room, `capitaine-auto:${t}`);
      room.absentCaptains = (room.absentCaptains || []).filter((x) => x !== t);
    }
  }

  autoPromote(room, team) {
    if (room.status !== 'en_cours') return;
    const candidates = this.manager.players(room)
      .filter((p) => p.team === team && p.role === 'agent' && p.connected)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    if (candidates.length) this.promote(room, candidates[0], 'automatique');
  }

  promote(room, member, how) {
    for (const p of this.manager.players(room)) {
      if (p.team === member.team && p.role === 'capitaine') p.role = 'agent';
    }
    member.role = 'capitaine';
    this.clearCaptainWatch(room, member.team);
    if (room.game && room.game.mode === 'classique') {
      room.game.history.push({ type: 'promotion', team: member.team, name: member.name, how });
    }
    this.refreshPresence(room);
    this.syncTimer(room);
    this.manager.changed(room, false);
  }

  /** L'hôte nomme un agent capitaine quand le capitaine de son équipe est absent. */
  hostPromote(roomId, actorId, targetId) {
    const { room } = this.context(roomId, actorId);
    this.manager.requireHost(room, actorId);
    if (room.status !== 'en_cours' || !room.game || room.game.mode !== 'classique') throw new CodenamesError('Aucune manche Classique en cours.');
    const target = room.members.get(targetId);
    if (!target || target.kind !== 'joueur' || target.role !== 'agent') throw new CodenamesError('Choisissez un agent.');
    if (!target.connected) throw new CodenamesError('Ce joueur est déconnecté.');
    const captain = this.manager.players(room).find((p) => p.team === target.team && p.role === 'capitaine');
    if (captain && captain.connected) throw new CodenamesError('Le capitaine de cette équipe est présent.');
    this.promote(room, target, 'hôte');
  }

  onMemberDisconnected(room, member) {
    if (member.kind !== 'joueur') return;
    this.refreshPresence(room);
  }

  onMemberReconnected(room, member) {
    if (member.kind !== 'joueur') return;
    this.refreshPresence(room);
  }

  /** Arrivée d'un joueur en cours de partie : peut débloquer une promotion de capitaine. */
  onMemberJoined(room, member) {
    if (member.kind === 'joueur' && room.status === 'en_cours') this.refreshPresence(room);
  }

  /**
   * Un joueur se retire de la manche en restant dans le salon (il devient spectateur).
   * Classique : un capitaine est remplacé par un agent. Duo : la partie s'arrête.
   */
  withdraw(roomId, actorId) {
    const { room, member } = this.context(roomId, actorId);
    if (room.status === 'attente') throw new CodenamesError('Utilisez le lobby pour devenir spectateur.');
    if (member.kind !== 'joueur') throw new CodenamesError('Vous êtes déjà spectateur.');
    const wasCaptain = member.role === 'capitaine';
    const team = member.team;
    const playing = room.status === 'en_cours' && room.game;
    member.kind = 'spectateur';
    member.team = null;
    member.side = null;
    member.role = 'agent';
    if (playing && room.game.mode === 'duo') {
      duo.abort(room.game);
      room.game.history.push({ type: 'info', text: `${member.name} s’est retiré(e) de la partie.` });
      this.endRound(room);
    } else if (playing) {
      room.game.history.push({ type: 'info', text: `${member.name} s’est retiré(e) de la manche.` });
      if (wasCaptain) this.autoPromote(room, team);
      this.refreshPresence(room);
      this.syncTimer(room);
    }
    this.manager.touch(room);
    this.manager.changed(room, true);
  }

  /** Départ définitif (bouton « Quitter » ou délai dépassé). */
  onMemberRemoved(room, member) {
    if (member.kind !== 'joueur' || room.status !== 'en_cours' || !room.game) return;
    if (room.game.mode === 'duo') {
      duo.abort(room.game);
      room.game.history.push({ type: 'info', text: `${member.name} a quitté la partie.` });
      this.endRound(room);
      return;
    }
    if (member.role === 'capitaine') this.autoPromote(room, member.team);
    this.refreshPresence(room);
  }

  // ---------- Timer ----------

  /** (Ré)arme le timer selon la phase en cours ; ne fait rien si la phase n'a pas changé. */
  syncTimer(room) {
    const game = room.game;
    if (room.status !== 'en_cours' || !game || game.phase === 'fin') {
      this.timer.stop(room);
      return;
    }
    let signature;
    let seconds = 0;
    if (game.mode === 'classique') {
      const s = room.settings.classic;
      signature = `${room.match.round}:${game.turnNumber}:${game.phase}`;
      if (s.timerEnabled) seconds = game.phase === 'indice' ? s.clueSeconds : s.guessSeconds;
    } else {
      const s = room.settings.duo;
      signature = `${room.match.round}:${game.turnNumber}:${game.phase === 'mort-subite' ? 'ms' : 'tour'}`;
      if (s.timerEnabled && game.phase !== 'mort-subite') seconds = s.turnSeconds;
    }
    this.timer.sync(room, signature, seconds * 1000, () => this.onTimeout(room));
    if (room.paused) this.timer.pause(room);
  }

  /** Expiration : l'équipe (ou le duo) passe son tour. */
  onTimeout(room) {
    const game = room.game;
    if (!game || room.status !== 'en_cours' || room.paused) return;
    if (game.mode === 'classique') classic.timeout(game);
    else this.duoTimeout(room);
    this.afterAction(room);
  }

  // ---------- Vue ----------

  /** Ce que voit un membre de la manche en cours. */
  gameView(room, member) {
    const game = room.game;
    if (!game) return null;
    if (game.mode === 'classique') return classicView(game, member);
    return this.duoView(room, member);
  }

  // ---------- Duo ----------

  duoSide(member) {
    if (member.kind !== 'joueur' || !member.side) throw new CodenamesError('Les spectateurs ne peuvent pas jouer.');
    return member.side;
  }

  duoClue(room, member, word, count) {
    duo.giveClue(room.game, this.duoSide(member), word, count);
    this.afterAction(room);
  }

  duoGuess(room, member, index) {
    duo.guess(room.game, this.duoSide(member), index);
    this.afterAction(room);
  }

  duoPass(room, member) {
    duo.pass(room.game, this.duoSide(member));
    this.afterAction(room);
  }

  duoTimeout(room) {
    duo.timeout(room.game);
  }

  /**
   * Vue Duo : chaque joueur ne reçoit QUE sa face de la clé.
   * Les spectateurs ne voient aucune face avant la fin de la partie.
   */
  duoView(room, member) {
    const g = room.game;
    const ended = g.phase === 'fin';
    const side = member && member.kind === 'joueur' ? member.side : null;
    return {
      mode: 'duo',
      words: g.words,
      found: g.found.slice(),
      bystanders: { A: g.bystanders.A.slice(), B: g.bystanders.B.slice() },
      myKey: side && !ended ? g.keys[side].slice() : null,
      keys: ended ? { A: g.keys.A.slice(), B: g.keys.B.slice() } : null,
      mySide: side,
      myAgentsLeft: side ? duo.agentsLeft(g, side) : null,
      giver: g.giver,
      phase: g.phase,
      clue: g.clue ? {
        giver: g.clue.giver, word: g.clue.word, display: g.clue.display, count: g.clue.count,
        unlimited: g.clue.unlimited, guessesMade: g.clue.guessesMade, agentsFound: g.clue.agentsFound
      } : null,
      reveals: g.reveals.map((r) => ({ ...r, clue: r.clue ? { ...r.clue } : null })),
      tokensLeft: g.tokensLeft,
      tokensTotal: g.tokensTotal,
      suddenDeathEnabled: g.suddenDeathEnabled,
      clueEnd: g.clueEnd,
      agentsFound: duo.foundCount(g),
      agentsTotal: g.agentsTotal,
      history: g.history.slice(-200),
      result: g.result,
      endReason: g.endReason,
      assassinIndex: ended ? g.assassinIndex : null,
      turnNumber: g.turnNumber
    };
  }
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
