/*
 * Utilitaires DOM partagés (modules ES, sans dépendance).
 * Règle : aucune donnée n'est injectée via innerHTML ; le texte passe par textContent.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Crée un élément : el('div', { class: 'x', text: 'y', onclick: fn }, [enfants]). */
export function el(tag, attrs, children) {
  const node = document.createElement(tag);
  applyAttrs(node, attrs);
  append(node, children);
  return node;
}

function applyAttrs(node, attrs) {
  if (!attrs) return;
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'text') node.textContent = value;
    else if (key === 'class') node.setAttribute('class', value);
    else if (key === 'style' && typeof value === 'object') Object.assign(node.style, value);
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (value === true) node.setAttribute(key, '');
    else node.setAttribute(key, String(value));
  }
}

export function append(node, children) {
  (Array.isArray(children) ? children : [children]).forEach((child) => {
    if (child === null || child === undefined || child === false) return;
    node.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
  });
  return node;
}

export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
  return node;
}

export function replace(node, children) {
  clear(node);
  return append(node, children);
}

export const $ = (id) => document.getElementById(id);

/**
 * Icône SVG à trait fin (stroke 1.5), à partir d'une liste de formes :
 * [['path', { d: '…' }], ['circle', { cx, cy, r }], …].
 */
export function icon(shapes, size = 32, viewBox = '0 0 32 32') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const [tag, attrs] of shapes) {
    const shape = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) shape.setAttribute(k, v);
    svg.appendChild(shape);
  }
  return svg;
}

/** Icônes d'interface récurrentes. */
export const ICONS = {
  arrowRight: () => icon([['path', { d: 'M2 7h10M8 3l4 4-4 4' }]], 14, '0 0 14 14'),
  arrowLeft: () => icon([['path', { d: 'M12 7H2M6 3L2 7l4 4' }]], 14, '0 0 14 14'),
  send: () => icon([['path', { d: 'M2 8h12M9 3l5 5-5 5' }]], 16, '0 0 16 16'),
  lock: () => icon([['rect', { x: 3, y: 7, width: 10, height: 7, rx: 2 }], ['path', { d: 'M5 7V5a3 3 0 0 1 6 0v2' }]], 16, '0 0 16 16'),
  plus: () => icon([['path', { d: 'M16 7v18M7 16h18' }]], 32),
  close: () => icon([['path', { d: 'M4 4l8 8M12 4l-8 8' }]], 16, '0 0 16 16'),
  chat: () => icon([['path', { d: 'M3 4.5A1.5 1.5 0 0 1 4.5 3h11A1.5 1.5 0 0 1 17 4.5v8a1.5 1.5 0 0 1-1.5 1.5H8l-4 3v-3h0.5A1.5 1.5 0 0 1 3 12.5z' }]], 18, '0 0 20 20'),
  star: () => icon([['path', { d: 'M8 1.8l1.9 3.9 4.3.6-3.1 3 .7 4.3L8 11.6l-3.8 2 .7-4.3-3.1-3 4.3-.6z' }]], 14, '0 0 16 16'),
  eye: () => icon([['path', { d: 'M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z' }], ['circle', { cx: 8, cy: 8, r: 2 }]], 14, '0 0 16 16'),
  swap: () => icon([['path', { d: 'M3 5h10M10 2l3 3-3 3M13 11H3M6 8l-3 3 3 3' }]], 14, '0 0 16 16'),
  hat: () => icon([['path', { d: 'M5 10.5V3.5h6v7' }], ['path', { d: 'M2 10.5h12' }], ['path', { d: 'M5 8h6' }]], 14, '0 0 16 16'),
  link: () => icon([['path', { d: 'M6.5 9.5l3-3M7 4.5l1-1a2.8 2.8 0 0 1 4 4l-1 1M9 11.5l-1 1a2.8 2.8 0 0 1-4-4l1-1' }]], 14, '0 0 16 16'),
  exit: () => icon([['path', { d: 'M6 2.5H3.5v11H6M10 5l3 3-3 3M13 8H6' }]], 14, '0 0 16 16'),
  dice: () => icon([['rect', { x: 2.5, y: 2.5, width: 11, height: 11, rx: 2.5 }], ['circle', { cx: 5.5, cy: 5.5, r: .6 }], ['circle', { cx: 10.5, cy: 10.5, r: .6 }], ['circle', { cx: 8, cy: 8, r: .6 }]], 14, '0 0 16 16'),
  book: () => icon([['path', { d: 'M2.5 3.5h4A1.5 1.5 0 0 1 8 5v8a1.5 1.5 0 0 0-1.5-1.5h-4zM13.5 3.5h-4A1.5 1.5 0 0 0 8 5v8a1.5 1.5 0 0 1 1.5-1.5h4z' }]], 16, '0 0 16 16'),
  hourglass: () => icon([['path', { d: 'M4 2h8M4 14h8M5 2c0 3 6 3 6 6s-6 3-6 6M11 2c0 3-6 3-6 6s6 3 6 6' }]], 16, '0 0 16 16')
};

/** Toasts éphémères (erreurs, confirmations). */
export function toast(message, type = 'info', duration = 4200) {
  let host = document.getElementById('ds-toasts');
  if (!host) {
    host = el('div', { id: 'ds-toasts', class: 'ds-toasts', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(host);
  }
  const node = el('div', { class: `ds-toast ds-toast--${type}`, text: message });
  host.appendChild(node);
  setTimeout(() => node.remove(), duration);
  while (host.children.length > 3) host.firstChild.remove();
}

/** Stockage local tolérant aux navigateurs qui le bloquent. */
export const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch { /* indisponible */ } }
};

/**
 * Boîte de confirmation (élément <dialog> natif : focus piégé, Échap = annuler).
 * Renvoie une promesse résolue à true si l'action est confirmée.
 */
export function confirmDialog({ title, text, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const cancel = el('button', { type: 'button', class: 'ds-btn', value: 'cancel', text: cancelLabel });
    const ok = el('button', { type: 'button', class: `ds-btn ${danger ? 'ds-btn--danger-solid' : 'ds-btn--primary'}`, value: 'ok', text: confirmLabel });
    const dialog = el('dialog', { class: 'ds-dialog', 'aria-labelledby': 'ds-dialog-title', 'aria-describedby': 'ds-dialog-text' }, [
      el('h2', { class: 'ds-dialog__title', id: 'ds-dialog-title', text: title }),
      el('p', { class: 'ds-dialog__text', id: 'ds-dialog-text', text }),
      el('div', { class: 'ds-dialog__actions' }, [cancel, ok])
    ]);
    const previous = document.activeElement;
    let result = false;
    const close = (value) => { result = value; dialog.close(); };
    cancel.addEventListener('click', () => close(false));
    ok.addEventListener('click', () => close(true));
    dialog.addEventListener('click', (e) => { if (e.target === dialog) close(false); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (previous && previous.isConnected) previous.focus();
      resolve(result);
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    cancel.focus();
  });
}
