'use strict';

/**
 * Schéma déclaratif des paramètres d'un salon.
 * Pour ajouter une option : ajouter une entrée ici (type, défaut, bornes).
 * Elle est automatiquement assainie côté serveur et exposée au client
 * (qui génère le formulaire à partir de SETTINGS_SCHEMA).
 */
const SETTINGS_SCHEMA = {
  mode: { type: 'enum', values: ['classique', 'duo'], default: 'classique', label: 'Mode' },
  spectatorsAllowed: { type: 'bool', default: true, label: 'Spectateurs autorisés' },
  wordPack: { type: 'enum', values: ['classique'], default: 'classique', label: 'Paquet de mots' },
  classic: {
    type: 'group',
    fields: {
      captainMode: {
        type: 'enum',
        values: ['fixe', 'rotation-tour', 'rotation-aleatoire'],
        default: 'fixe',
        label: 'Capitaines'
      },
      startingTeam: {
        type: 'enum',
        values: ['aleatoire', 'alternee', 'rouge', 'bleu'],
        default: 'aleatoire',
        label: 'Équipe qui commence'
      },
      teamAssignment: { type: 'enum', values: ['manuelle', 'aleatoire'], default: 'manuelle', label: 'Répartition des équipes' },
      rounds: { type: 'int', min: 1, max: 10, default: 1, label: 'Nombre de manches' },
      timerEnabled: { type: 'bool', default: false, label: 'Timer' },
      clueSeconds: { type: 'int', min: 15, max: 600, default: 120, label: 'Durée indice (s)' },
      guessSeconds: { type: 'int', min: 15, max: 600, default: 90, label: 'Durée devinette (s)' }
    }
  },
  duo: {
    type: 'group',
    fields: {
      timeTokens: { type: 'int', min: 1, max: 15, default: 9, label: 'Jetons de temps' },
      suddenDeath: { type: 'bool', default: true, label: 'Mort subite' },
      timerEnabled: { type: 'bool', default: false, label: 'Timer par tour' },
      turnSeconds: { type: 'int', min: 30, max: 900, default: 180, label: 'Durée d\'un tour (s)' }
    }
  }
};

const CLASSIC_MIN_PLAYERS = 4;
const CLASSIC_MAX_PLAYERS = 12;
const DUO_PLAYERS = 2;

function defaultsOf(schema) {
  const out = {};
  for (const [key, def] of Object.entries(schema)) {
    out[key] = def.type === 'group' ? defaultsOf(def.fields) : def.default;
  }
  return out;
}

function sanitizeWith(schema, input, current) {
  const out = {};
  const src = input && typeof input === 'object' ? input : {};
  for (const [key, def] of Object.entries(schema)) {
    const prev = current[key];
    const value = src[key];
    if (def.type === 'group') {
      out[key] = sanitizeWith(def.fields, value, prev);
    } else if (value === undefined) {
      out[key] = prev;
    } else if (def.type === 'enum') {
      out[key] = def.values.includes(value) ? value : prev;
    } else if (def.type === 'bool') {
      out[key] = typeof value === 'boolean' ? value : prev;
    } else if (def.type === 'int') {
      const n = parseInt(value, 10);
      out[key] = Number.isNaN(n) ? prev : Math.max(def.min, Math.min(def.max, n));
    }
  }
  return out;
}

function defaultSettings() {
  return defaultsOf(SETTINGS_SCHEMA);
}

/** Fusionne une saisie (partielle, non fiable) avec les paramètres courants. */
function sanitizeSettings(input, current = defaultSettings()) {
  return sanitizeWith(SETTINGS_SCHEMA, input, current);
}

/** Met à jour la liste des paquets de mots disponibles (chargés au démarrage). */
function setAvailablePacks(packIds) {
  if (Array.isArray(packIds) && packIds.length > 0) {
    SETTINGS_SCHEMA.wordPack.values = packIds.slice();
    if (!packIds.includes(SETTINGS_SCHEMA.wordPack.default)) SETTINGS_SCHEMA.wordPack.default = packIds[0];
  }
}

function maxPlayersFor(settings) {
  return settings.mode === 'duo' ? DUO_PLAYERS : CLASSIC_MAX_PLAYERS;
}

module.exports = {
  SETTINGS_SCHEMA,
  CLASSIC_MIN_PLAYERS,
  CLASSIC_MAX_PLAYERS,
  DUO_PLAYERS,
  defaultSettings,
  sanitizeSettings,
  setAvailablePacks,
  maxPlayersFor
};
