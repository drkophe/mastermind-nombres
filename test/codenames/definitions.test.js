'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { DefinitionService, parseEntry, ATTRIBUTION } = require('../../server/codenames/definitions');

const sample = {
  word: 'maison',
  entries: [
    { language: { code: 'fr', name: 'French' }, partOfSpeech: 'noun', senses: [{ definition: 'Bâtiment servant d\'habitation.' }, { definition: 'Famille.' }] },
    { language: { code: 'en', name: 'English' }, partOfSpeech: 'noun', senses: [{ definition: 'ignored' }] }
  ],
  source: { url: 'https://fr.wiktionary.org/wiki/maison', license: { name: 'CC BY-SA 4.0' } }
};

function fakeFetch(responses) {
  const calls = [];
  const fn = async (url) => {
    calls.push(url);
    const r = responses.shift();
    if (r instanceof Error) throw r;
    return {
      status: r.status,
      ok: r.status >= 200 && r.status < 300,
      headers: { get: (h) => (r.headers || {})[h.toLowerCase()] },
      json: async () => r.body
    };
  };
  fn.calls = calls;
  return fn;
}

test('analyse d\'une réponse : définitions françaises, nature, lien Wiktionary, attribution', () => {
  const parsed = parseEntry('maison', sample);
  assert.equal(parsed.definitions.length, 2);
  assert.deepEqual(parsed.definitions[0], { partOfSpeech: 'nom', text: 'Bâtiment servant d\'habitation.' });
  assert.equal(parsed.sourceUrl, 'https://fr.wiktionary.org/wiki/maison');
  assert.equal(parsed.attribution, ATTRIBUTION);
});

test('lien source non Wiktionary remplacé par la page du Wiktionnaire', () => {
  const parsed = parseEntry('chat', { entries: sample.entries, source: { url: 'javascript:alert(1)' } });
  assert.equal(parsed.sourceUrl, 'https://fr.wiktionary.org/wiki/chat');
});

test('réponse inattendue : null', () => {
  assert.equal(parseEntry('x', null), null);
  assert.equal(parseEntry('x', { entries: [] }), null);
  assert.equal(parseEntry('x', { entries: [{ senses: [{}] }] }), null);
});

test('cache : un seul appel pour plusieurs consultations', async () => {
  const fetchImpl = fakeFetch([{ status: 200, body: sample }]);
  const service = new DefinitionService({ fetchImpl });
  const a = await service.lookup('Maison');
  const b = await service.lookup('maison');
  assert.equal(a.definitions.length, 2);
  assert.equal(b, a);
  assert.equal(fetchImpl.calls.length, 1);
  assert.match(fetchImpl.calls[0], /\/entries\/fr\/maison$/);
});

test('429 : échec silencieux puis plus aucun appel jusqu\'à Retry-After', async () => {
  let now = 0;
  const fetchImpl = fakeFetch([{ status: 429, headers: { 'retry-after': '60' } }, { status: 200, body: sample }]);
  const service = new DefinitionService({ fetchImpl, now: () => now });
  assert.equal(await service.lookup('maison'), null);
  assert.equal(await service.lookup('chat'), null);
  assert.equal(fetchImpl.calls.length, 1, 'bloqué après le 429');
  now = 61_000;
  assert.ok(await service.lookup('maison'));
  assert.equal(fetchImpl.calls.length, 2);
});

test('API indisponible ou mot absent : null, sans exception', async () => {
  const fetchImpl = fakeFetch([new Error('ECONNREFUSED'), { status: 404 }, { status: 500 }]);
  const service = new DefinitionService({ fetchImpl });
  assert.equal(await service.lookup('a1'), null);
  assert.equal(await service.lookup('a2'), null);
  assert.equal(await service.lookup('a3'), null);
});

test('budget interne sous la limite de l\'API', async () => {
  const fetchImpl = fakeFetch(Array.from({ length: 5 }, () => ({ status: 404 })));
  const service = new DefinitionService({ fetchImpl, maxPerHour: 2 });
  for (const w of ['un', 'deux', 'trois', 'quatre']) await service.lookup(w);
  assert.equal(fetchImpl.calls.length, 2);
});
