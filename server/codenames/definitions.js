'use strict';

const { normalizeWord } = require('./util');

const API_BASE = 'https://freedictionaryapi.com/api/v1/entries/fr/';
const ATTRIBUTION = 'Données Wiktionary via FreeDictionaryAPI.com (CC BY-SA 4.0)';

/**
 * Définitions affichées en fin de manche, récupérées côté serveur auprès de
 * FreeDictionaryAPI.com (données Wiktionary, CC BY-SA 4.0).
 * - cache en mémoire (succès 24 h, absence 24 h, erreur 10 min) ;
 * - respect de la limite (1 000 requêtes/h/IP) : budget interne de 900/h,
 *   et blocage temporaire après un 429 (Retry-After) ;
 * - échec silencieux : null si l'API est indisponible.
 */
class DefinitionService {
  constructor(options = {}) {
    this.fetch = options.fetchImpl || (typeof fetch === 'function' ? fetch : null);
    this.now = options.now || Date.now;
    this.timeoutMs = options.timeoutMs || 4000;
    this.maxPerHour = options.maxPerHour || 900;
    this.maxCache = options.maxCache || 2000;
    this.cache = new Map(); // mot normalisé -> { value, expires }
    this.inflight = new Map();
    this.requests = []; // horodatages de la dernière heure
    this.blockedUntil = 0;
  }

  cached(key) {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (hit.expires < this.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value;
  }

  store(key, value, ttlMs) {
    if (this.cache.size >= this.maxCache) this.cache.delete(this.cache.keys().next().value);
    this.cache.set(key, { value, expires: this.now() + ttlMs });
  }

  canRequest() {
    const now = this.now();
    if (now < this.blockedUntil) return false;
    this.requests = this.requests.filter((t) => now - t < 3600 * 1000);
    return this.requests.length < this.maxPerHour;
  }

  async lookup(word) {
    const key = normalizeWord(word);
    if (!key || !this.fetch) return null;
    const hit = this.cached(key);
    if (hit !== undefined) return hit;
    if (this.inflight.has(key)) return this.inflight.get(key);
    if (!this.canRequest()) return null;
    const promise = this.request(word, key).finally(() => this.inflight.delete(key));
    this.inflight.set(key, promise);
    return promise;
  }

  async request(word, key) {
    this.requests.push(this.now());
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.fetch(API_BASE + encodeURIComponent(word.toLowerCase()), {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });
      if (res.status === 429) {
        const retry = parseInt(res.headers && res.headers.get ? res.headers.get('retry-after') : '', 10);
        this.blockedUntil = this.now() + (Number.isFinite(retry) ? retry * 1000 : 15 * 60 * 1000);
        return null;
      }
      if (res.status === 404) {
        this.store(key, null, 24 * 3600 * 1000);
        return null;
      }
      if (!res.ok) {
        this.store(key, null, 10 * 60 * 1000);
        return null;
      }
      const value = parseEntry(word, await res.json());
      this.store(key, value, (value ? 24 : 1) * 3600 * 1000);
      return value;
    } catch {
      this.store(key, null, 10 * 60 * 1000);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
}

const POS_LABELS = {
  noun: 'nom', verb: 'verbe', adjective: 'adjectif', adverb: 'adverbe', pronoun: 'pronom',
  preposition: 'préposition', conjunction: 'conjonction', interjection: 'interjection', name: 'nom propre'
};

/** Extrait au plus 3 définitions d'une réponse de l'API, de façon défensive. */
function parseEntry(word, data) {
  if (!data || !Array.isArray(data.entries)) return null;
  const definitions = [];
  for (const entry of data.entries) {
    if (entry.language && entry.language.code && entry.language.code !== 'fr') continue;
    const pos = POS_LABELS[entry.partOfSpeech] || entry.partOfSpeech || '';
    for (const sense of entry.senses || []) {
      if (definitions.length >= 3) break;
      if (typeof sense.definition === 'string' && sense.definition.trim()) {
        definitions.push({ partOfSpeech: String(pos).slice(0, 30), text: sense.definition.trim().slice(0, 300) });
      }
    }
  }
  if (!definitions.length) return null;
  const source = data.source || {};
  const sourceUrl = typeof source.url === 'string' && /^https:\/\/[a-z]+\.wiktionary\.org\//.test(source.url)
    ? source.url
    : `https://fr.wiktionary.org/wiki/${encodeURIComponent(word.toLowerCase())}`;
  return { word: data.word || word, definitions, sourceUrl, attribution: ATTRIBUTION };
}

module.exports = { DefinitionService, parseEntry, ATTRIBUTION, API_BASE };
