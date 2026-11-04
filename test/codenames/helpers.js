'use strict';

/** Horloge et minuteurs manuels pour tester sans attendre. */
class FakeScheduler {
  constructor() {
    this.time = 1_000_000;
    this.nextId = 1;
    this.tasks = new Map();
  }

  now() {
    return this.time;
  }

  setTimeout(fn, ms) {
    const id = this.nextId++;
    this.tasks.set(id, { fn, at: this.time + ms });
    return id;
  }

  clearTimeout(id) {
    this.tasks.delete(id);
  }

  /** Avance le temps et exécute les minuteurs échus, dans l'ordre. */
  advance(ms) {
    const target = this.time + ms;
    for (;;) {
      let nextId = null;
      let next = null;
      for (const [id, task] of this.tasks) {
        if (task.at <= target && (!next || task.at < next.at)) {
          next = task;
          nextId = id;
        }
      }
      if (!next) break;
      this.tasks.delete(nextId);
      this.time = next.at;
      next.fn();
    }
    this.time = target;
  }
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
function seededRng(seed = 42) {
  let a = seed >>> 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

module.exports = { FakeScheduler, seededRng };
