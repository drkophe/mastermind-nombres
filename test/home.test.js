'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { GAMES } = require('../data/games');
const { renderHome, escapeHtml } = require('../server/home');

const ctx = { mastermindMaxAttempts: 10, quizQuestions: 100, quizLevels: 3, penduCategories: 5, onePieceCharacters: 44, loupRoles: 5, le10000Target: 10000 };

test('registre : chaque jeu a une route unique et une page existante', () => {
  const routes = new Set();
  for (const game of GAMES) {
    assert.ok(game.route.startsWith('/'), game.id);
    assert.ok(!routes.has(game.route), `route en double : ${game.route}`);
    routes.add(game.route);
    assert.ok(fs.existsSync(path.join(__dirname, '..', 'public', game.file)), `${game.file} absent`);
    assert.ok(game.title && game.description && game.icon.length > 0);
    assert.ok(game.facts(ctx).every((f) => typeof f === 'string' && !f.includes('undefined')));
  }
});

test('accueil : une carte par jeu, liens réels, nombre de jeux réel, sans gabarit restant', () => {
  const html = renderHome(GAMES, ctx);
  assert.equal((html.match(/class="ds-game-card"/g) || []).length, GAMES.length);
  for (const game of GAMES) assert.ok(html.includes(`href="${game.route}"`));
  assert.ok(!html.includes('{{'), 'marqueur de gabarit non remplacé');
  assert.ok(html.includes('Sept jeux'));
  assert.ok(!/Scores persistants/.test(html), 'affirmation fausse : les scores ne sont pas persistants');
});

test('accueil : le contenu est échappé', () => {
  assert.equal(escapeHtml('<b>"x" & \'y\'</b>'), '&lt;b&gt;&quot;x&quot; &amp; &#39;y&#39;&lt;/b&gt;');
  const html = renderHome([{ ...GAMES[0], title: '<script>alert(1)</script>' }], ctx);
  assert.ok(!html.includes('<script>alert(1)'));
});
