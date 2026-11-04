'use strict';

const { CodenamesError } = require('./errors');
const { cleanText, randomId } = require('./util');

const MAX_LENGTH = 300;
const HISTORY_SIZE = 100;
const RATE_WINDOW_MS = 10_000;
const RATE_MAX = 6; // messages par fenêtre
const MIN_INTERVAL_MS = 400;

/**
 * Chats d'un salon :
 * - « general » : tous les membres (joueurs et spectateurs) ;
 * - « equipe » : en Classique, les membres de l'équipe (capitaine inclus) ;
 *   en Duo, les deux joueurs. Jamais les spectateurs ni l'équipe adverse.
 * Le filtrage des destinataires est fait ici, côté serveur.
 */
class ChatService {
  constructor({ scheduler }) {
    this.scheduler = scheduler;
    this.rate = new Map(); // playerId -> horodatages récents
  }

  /** Clé du canal d'équipe d'un membre, ou null s'il n'en a pas. */
  teamKey(room, member) {
    if (!member || member.kind !== 'joueur') return null;
    if (room.settings.mode === 'duo') return 'duo';
    return member.team === 'rouge' || member.team === 'bleu' ? member.team : null;
  }

  /** Identifiant du flux d'équipe vu par un membre (change avec l'équipe ou la manche). */
  channelSignature(room, member) {
    return `${this.teamKey(room, member) || '-'}:${room.match.round}:${room.status === 'attente' ? 'lobby' : 'jeu'}`;
  }

  recipients(room, channel, teamKey) {
    const all = [...room.members.values()];
    if (channel === 'general') return all;
    return all.filter((m) => this.teamKey(room, m) === teamKey);
  }

  checkRate(playerId) {
    const now = this.scheduler.now();
    const recent = (this.rate.get(playerId) || []).filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length && now - recent[recent.length - 1] < MIN_INTERVAL_MS) {
      throw new CodenamesError('Doucement : un message à la fois.');
    }
    if (recent.length >= RATE_MAX) throw new CodenamesError('Trop de messages, patientez quelques secondes.');
    recent.push(now);
    this.rate.set(playerId, recent);
  }

  /** Publie un message et renvoie { message, recipients }. */
  post(room, member, channel, rawText) {
    if (!member) throw new CodenamesError('Vous n\'êtes pas dans ce salon.');
    if (channel !== 'general' && channel !== 'equipe') throw new CodenamesError('Canal inconnu.');
    const text = cleanText(rawText, MAX_LENGTH);
    if (!text) throw new CodenamesError('Message vide.');
    let teamKey = null;
    if (channel === 'equipe') {
      teamKey = this.teamKey(room, member);
      if (!teamKey) throw new CodenamesError('Vous n\'avez pas de chat d\'équipe.');
    }
    this.checkRate(member.id);
    const message = {
      id: randomId(6),
      channel,
      team: teamKey,
      authorId: member.id,
      authorName: member.name,
      authorTeam: member.kind === 'joueur' ? (member.team || member.side) : null,
      authorRole: member.kind === 'spectateur' ? 'spectateur' : member.role,
      text,
      at: this.scheduler.now()
    };
    const log = channel === 'general' ? room.chat.general : room.chat.teams[teamKey];
    log.push(message);
    if (log.length > HISTORY_SIZE) log.splice(0, log.length - HISTORY_SIZE);
    return { message, recipients: this.recipients(room, channel, teamKey) };
  }

  /** Historique visible par un membre (reconnexion, changement d'équipe). */
  historyFor(room, member) {
    const teamKey = this.teamKey(room, member);
    return {
      teamKey,
      general: room.chat.general.slice(),
      equipe: teamKey ? room.chat.teams[teamKey].slice() : []
    };
  }

  forget(playerId) {
    this.rate.delete(playerId);
  }
}

module.exports = { ChatService, MAX_LENGTH };
