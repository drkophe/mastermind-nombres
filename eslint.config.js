'use strict';

const js = require('@eslint/js');
const globals = require('globals');

const shared = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  eqeqeq: ['error', 'always'],
  'prefer-const': 'error'
};

module.exports = [
  {
    // Nouveau code client (design system, accueil, Codenames) : modules ES navigateur.
    files: ['public/assets/**/*.js', 'public/codenames/**/*.js', 'public/home/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, io: 'readonly' }
    },
    rules: shared
  },
  {
    // Le code historique (server.js, pages HTML) n'est pas soumis au lint.
    files: ['server/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    rules: shared
  }
];
