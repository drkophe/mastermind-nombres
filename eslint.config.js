'use strict';

const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    // Le code historique (server.js, pages HTML) n'est pas soumis au lint.
    files: ['server/**/*.js', 'scripts/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: { ...globals.node }
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error'
    }
  }
];
