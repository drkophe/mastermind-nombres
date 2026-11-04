'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { defaultSettings, sanitizeSettings } = require('../../server/codenames/settings');

test('les paramètres par défaut sont complets', () => {
  const s = defaultSettings();
  assert.equal(s.mode, 'classique');
  assert.equal(s.duo.timeTokens, 9);
  assert.equal(s.duo.suddenDeath, true);
  assert.equal(s.classic.timerEnabled, false);
});

test('la saisie est assainie : valeurs inconnues ignorées, bornes appliquées', () => {
  const s = sanitizeSettings({
    mode: 'pirate',
    spectatorsAllowed: 'oui',
    classic: { clueSeconds: 99999, rounds: '3', captainMode: 'rotation-tour', inconnu: 1 },
    duo: { timeTokens: -4 },
    __proto__pollution: true
  });
  assert.equal(s.mode, 'classique');
  assert.equal(s.spectatorsAllowed, true);
  assert.equal(s.classic.clueSeconds, 600);
  assert.equal(s.classic.rounds, 3);
  assert.equal(s.classic.captainMode, 'rotation-tour');
  assert.equal(s.classic.inconnu, undefined);
  assert.equal(s.duo.timeTokens, 1);
});

test('une mise à jour partielle conserve les autres valeurs', () => {
  const base = sanitizeSettings({ mode: 'duo', duo: { suddenDeath: false } });
  const next = sanitizeSettings({ duo: { timeTokens: 11 } }, base);
  assert.equal(next.mode, 'duo');
  assert.equal(next.duo.suddenDeath, false);
  assert.equal(next.duo.timeTokens, 11);
});
