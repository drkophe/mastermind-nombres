'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'codenames');

/**
 * Charge les paquets de mots déclarés dans data/codenames/packs.json.
 * Ajouter un thème = déposer un JSON { meta, words } et l'ajouter au manifeste.
 */
function loadWordPacks(dir = DATA_DIR) {
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'packs.json'), 'utf8'));
  const packs = new Map();
  for (const entry of manifest) {
    const content = JSON.parse(fs.readFileSync(path.join(dir, entry.file), 'utf8'));
    const words = [...new Set((content.words || []).map((w) => String(w).trim().toLowerCase()).filter(Boolean))];
    if (words.length < 50) {
      console.warn(`[codenames] Paquet « ${entry.id} » ignoré : seulement ${words.length} mots.`);
      continue;
    }
    packs.set(entry.id, { id: entry.id, label: entry.label, words, meta: content.meta || {} });
  }
  if (packs.size === 0) throw new Error('Aucun paquet de mots Codenames utilisable.');
  return packs;
}

module.exports = { loadWordPacks, DATA_DIR };
