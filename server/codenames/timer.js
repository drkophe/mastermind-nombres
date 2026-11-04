'use strict';

/**
 * Timer de tour géré côté serveur (source de vérité).
 * Le client reçoit le temps restant et fait le décompte localement ;
 * l'expiration n'est décidée que par le serveur.
 *
 * Un timer est identifié par une « signature » (numéro de tour + phase) :
 * il n'est réarmé que lorsque la signature change.
 */
class TurnTimer {
  constructor(manager) {
    this.manager = manager;
  }

  now() {
    return this.manager.scheduler.now();
  }

  /** Arme (ou conserve) le timer pour la signature donnée. durationMs = 0 : pas de timer. */
  sync(room, signature, durationMs, onExpire) {
    const current = room.turnTimer;
    if (!durationMs) {
      this.stop(room);
      return;
    }
    if (current && current.signature === signature) return;
    this.stop(room);
    room.turnTimer = {
      signature,
      durationMs,
      endsAt: this.now() + durationMs,
      remainingMs: durationMs,
      paused: false,
      onExpire
    };
    this.schedule(room);
  }

  schedule(room) {
    const t = room.turnTimer;
    this.manager.setTimer(room, 'turn', t.remainingMs, () => {
      if (room.turnTimer !== t || t.paused) return;
      room.turnTimer = null;
      t.onExpire();
    });
  }

  stop(room) {
    this.manager.clearTimer(room, 'turn');
    room.turnTimer = null;
  }

  pause(room) {
    const t = room.turnTimer;
    if (!t || t.paused) return;
    t.remainingMs = Math.max(0, t.endsAt - this.now());
    t.paused = true;
    this.manager.clearTimer(room, 'turn');
  }

  resume(room) {
    const t = room.turnTimer;
    if (!t || !t.paused) return;
    t.paused = false;
    t.endsAt = this.now() + t.remainingMs;
    this.schedule(room);
  }

  /** Vue envoyée aux clients. */
  view(room) {
    const t = room.turnTimer;
    if (!t) return null;
    const remainingMs = t.paused ? t.remainingMs : Math.max(0, t.endsAt - this.now());
    return { remainingMs, durationMs: t.durationMs, paused: t.paused };
  }
}

module.exports = { TurnTimer };
