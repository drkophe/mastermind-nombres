/*
 * Barre de temps synchronisée. Le serveur décide de l'expiration ; le client
 * affiche un décompte local recalé sur le temps restant reçu à chaque état.
 */
import { el, replace } from '/assets/ds/dom.js';

const timer = { deadline: null, remainingMs: 0, durationMs: 1, paused: false, interval: null, node: null, fill: null, value: null, lastSecond: null };

function ensureNode() {
  if (timer.node) return timer.node;
  timer.fill = el('div', { class: 'ds-timer__fill' });
  timer.value = el('span', { class: 'ds-timer__value', 'aria-hidden': 'true' });
  timer.label = el('span', { class: 'sr-only', role: 'timer', 'aria-live': 'off' });
  timer.node = el('div', { class: 'ds-timer cn-timer' }, [
    el('span', { class: 'ds-label', text: 'Temps' }),
    el('div', { class: 'ds-timer__track', 'aria-hidden': 'true' }, [timer.fill]),
    timer.value,
    timer.label
  ]);
  return timer.node;
}

function tick() {
  if (!timer.node || timer.deadline === null) return;
  const ms = timer.paused ? timer.remainingMs : Math.max(0, timer.deadline - Date.now());
  const secs = Math.ceil(ms / 1000);
  timer.fill.style.transform = `scaleX(${Math.max(0, Math.min(1, ms / timer.durationMs))})`;
  const text = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  timer.value.textContent = timer.paused ? `${text} ⏸` : text;
  // Lecteurs d'écran : libellé mis à jour sans annonce à chaque seconde.
  if (secs !== timer.lastSecond) {
    timer.lastSecond = secs;
    timer.label.textContent = timer.paused ? `Temps en pause : ${secs} secondes restantes` : `${secs} secondes restantes`;
  }
  timer.node.classList.toggle('ds-timer--urgent', !timer.paused && secs <= 10);
  timer.node.classList.toggle('ds-timer--paused', timer.paused);
}

/** Met à jour (ou masque) la barre de temps dans `host` à partir de room.timer. */
export function renderTimer(host, data, active) {
  if (!data || !active) {
    timer.deadline = null;
    replace(host, null);
    return;
  }
  const node = ensureNode();
  if (node.parentNode !== host) replace(host, node);
  timer.paused = data.paused;
  timer.remainingMs = data.remainingMs;
  timer.durationMs = Math.max(1, data.durationMs);
  // L'échéance part de l'instant de réception de l'état (pas de l'instant du rendu).
  timer.deadline = (data.receivedAt || Date.now()) + data.remainingMs;
  if (!timer.interval) timer.interval = setInterval(tick, 250);
  tick();
}
