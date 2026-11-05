'use strict';

const fs = require('fs');
const path = require('path');

const TEMPLATE = path.join(__dirname, 'views', 'home.html');
const NUMBER_WORDS = ['Zéro', 'Un', 'Deux', 'Trois', 'Quatre', 'Cinq', 'Six', 'Sept', 'Huit', 'Neuf', 'Dix', 'Onze', 'Douze'];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function svg(shapes, size = 32, viewBox = '0 0 32 32') {
  const inner = shapes
    .map(([tag, attrs]) => `<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${escapeHtml(v)}"`).join(' ')}></${tag}>`)
    .join('');
  return `<svg width="${size}" height="${size}" viewBox="${viewBox}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

const ARROW = svg([['path', { d: 'M2 7h10M8 3l4 4-4 4' }]], 14, '0 0 14 14');
const PLUS = svg([['path', { d: 'M16 7v18M7 16h18' }]]);

function gameCard(game, index, ctx) {
  const num = String(index + 1).padStart(2, '0');
  const facts = game.facts(ctx).join(' · ');
  return `
    <a class="ds-game-card" href="${escapeHtml(game.route)}" data-game="${escapeHtml(game.id)}" aria-label="${escapeHtml(`${game.title} — ${game.description} (${facts})`)}">
      <div class="ds-game-card__top">
        <span class="ds-game-card__icon">${svg(game.icon)}</span>
        <span class="home-card-meta">
          <span class="ds-game-card__live" data-live="${escapeHtml(game.id)}" hidden><span class="ds-live-dot"></span><span data-live-text></span></span>
          <span class="ds-game-card__num">${num}</span>
        </span>
      </div>
      <div class="ds-game-card__body">
        <h2 class="ds-game-card__title">${escapeHtml(game.title)}</h2>
        <p class="ds-game-card__desc">${escapeHtml(game.description)}</p>
      </div>
      <div class="ds-game-card__foot">
        <span>${escapeHtml(facts)}</span>
        <span class="ds-game-card__go">Jouer${ARROW}</span>
      </div>
    </a>`;
}

function soonCard(index) {
  const num = String(index + 1).padStart(2, '0');
  return `
    <div class="ds-game-card ds-game-card--soon">
      <div class="ds-game-card__top">
        <span>${PLUS}</span>
        <span class="ds-game-card__num">${num}</span>
      </div>
      <div class="ds-game-card__body">
        <h2 class="ds-game-card__title">Prochain jeu</h2>
        <p class="ds-game-card__desc">Une idée à proposer ? La place est libre.</p>
      </div>
      <div class="ds-game-card__foot"><span>Bientôt disponible</span></div>
    </div>`;
}

/**
 * Construit la page d'accueil à partir du registre des jeux.
 * Une carte « Prochain jeu » complète la dernière rangée de 4 si besoin.
 */
function renderHome(games, ctx) {
  const template = fs.readFileSync(TEMPLATE, 'utf8');
  const cards = games.map((g, i) => gameCard(g, i, ctx));
  if (games.length % 4 !== 0) cards.push(soonCard(games.length));
  const count = NUMBER_WORDS[games.length] || String(games.length);
  return template
    .replaceAll('{{GAME_COUNT}}', escapeHtml(count))
    .replace('{{GAME_CARDS}}', cards.join('\n'));
}

module.exports = { renderHome, escapeHtml };
