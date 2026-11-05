/*
 * PhaseTint : très léger dégradé de fond indiquant la phase de jeu.
 * Calque fixe sous le contenu (pointer-events: none), fondu enchaîné entre deux
 * calques quand la couleur change (pas de clignotement). Sans transition si
 * l'utilisateur préfère réduire les animations.
 *
 * Utilisation : setPhaseTint({ colors: ['#F5C451'], intensity: 0.1 }) ;
 *               setPhaseTint(null) pour l'effacer.
 * Plusieurs couleurs : dégradé horizontal (ex. mort subite rouge → bleu).
 */

let host = null;
let layers = [];
let active = 0;
let currentKey = null;

function ensureHost() {
  if (host) return;
  host = document.createElement('div');
  host.className = 'ds-phase-tint';
  host.setAttribute('aria-hidden', 'true');
  layers = [document.createElement('div'), document.createElement('div')];
  layers.forEach((l) => { l.className = 'ds-phase-tint__layer'; host.appendChild(l); });
  document.body.prepend(host);
  document.body.classList.add('ds-has-phase-tint');
}

function rgba(hex, alpha) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

function gradientFor(colors, intensity) {
  const glow = colors.length === 1
    ? `radial-gradient(130% 90% at 50% -10%, ${rgba(colors[0], intensity)} 0%, ${rgba(colors[0], intensity * 0.35)} 45%, transparent 75%)`
    : `linear-gradient(90deg, ${colors.map((c, i) => `${rgba(c, intensity)} ${Math.round((i / (colors.length - 1)) * 100)}%`).join(', ')})`;
  const floor = `linear-gradient(0deg, ${rgba(colors[colors.length - 1], intensity * 0.5)} 0%, transparent 35%)`;
  return `${glow}, ${floor}`;
}

/**
 * @param {{colors: string[], intensity?: number} | null} options
 * intensity : opacité maximale (bornée à 0,12 pour préserver le contraste du texte).
 */
export function setPhaseTint(options) {
  ensureHost();
  const intensity = options ? Math.min(0.12, Math.max(0, options.intensity ?? 0.1)) : 0;
  const key = options ? `${options.colors.join(',')}:${intensity}` : 'none';
  if (key === currentKey) return;
  currentKey = key;
  const next = layers[1 - active];
  const prev = layers[active];
  if (options) {
    next.style.backgroundImage = gradientFor(options.colors, intensity);
    next.classList.add('is-on');
  }
  prev.classList.remove('is-on');
  if (options) active = 1 - active;
}
