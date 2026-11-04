#!/usr/bin/env node
'use strict';

/**
 * Construit la liste de mots Codenames à partir de Lexique 3.83
 * (New, Pallier et al. — http://www.lexique.org — licence CC BY-SA 4.0).
 *
 * Utilisation :
 *   1. Télécharger http://www.lexique.org/databases/Lexique383/Lexique383.zip
 *      et extraire Lexique383.tsv (ou utiliser --download).
 *   2. npm run build-wordlist -- --input chemin/vers/Lexique383.tsv
 *
 * Options :
 *   --input <fichier>      TSV Lexique 3.83 (défaut : scripts/data/Lexique383.tsv)
 *   --download             télécharge le TSV depuis lexique.org
 *   --out <fichier>        sortie JSON (défaut : data/codenames/mots-communs.json)
 *   --max <n>              nombre maximal de mots (défaut : 2500)
 *   --min-freq <f>         fréquence minimale du lemme, par million (défaut : 3)
 *   --min-noun-share <r>   part minimale de l'usage nominal de la forme (défaut : 0.5)
 *   --exclusions <fichier> mots à exclure (défaut : data/codenames/exclusions.txt)
 *
 * Filtres appliqués :
 *   - noms communs uniquement (cgram = NOM), pas de noms propres ;
 *   - forme de base uniquement (ortho = lemme, nombre ≠ pluriel) : ni pluriels
 *     ni formes fléchies (féminins dérivés compris) ;
 *   - 3 à 12 lettres, lettres françaises seulement (pas d'espace, de trait
 *     d'union, d'apostrophe ni de chiffre) ;
 *   - la forme doit être majoritairement employée comme nom (écarte « été »,
 *     « pas », « point »…) ;
 *   - fréquence du lemme (films + livres) au-dessus du seuil, puis on garde
 *     les plus fréquents ;
 *   - liste d'exclusion (vulgaire, offensant, sensible, trop vague) ;
 *   - sans doublon.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DEFAULTS = {
  input: path.join(__dirname, 'data', 'Lexique383.tsv'),
  out: path.join(ROOT, 'data', 'codenames', 'mots-communs.json'),
  exclusions: path.join(ROOT, 'data', 'codenames', 'exclusions.txt'),
  max: 2500,
  minFreq: 3,
  minNounShare: 0.5
};
const DOWNLOAD_URL = 'http://www.lexique.org/databases/Lexique383/Lexique383.tsv';
const LETTERS = /^[a-zàâäçéèêëîïôöùûüÿœæ]+$/;

function parseNumber(value) {
  const n = parseFloat(String(value || '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}

/** Lit un TSV Lexique (avec en-tête) en objets. */
function parseLexique(tsv) {
  const lines = tsv.split(/\r?\n/).filter((l) => l.length > 0);
  const header = lines[0].split('\t');
  const required = ['ortho', 'lemme', 'cgram', 'nombre', 'freqfilms2', 'freqlivres', 'freqlemfilms2', 'freqlemlivres'];
  for (const col of required) {
    if (!header.includes(col)) throw new Error(`Colonne « ${col} » absente : est-ce bien Lexique 3.83 ?`);
  }
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    const row = {};
    header.forEach((col, i) => { row[col] = cells[i]; });
    return row;
  });
}

function parseExclusions(text) {
  return new Set(
    text.split(/\r?\n/)
      .map((l) => l.replace(/#.*/, '').trim().toLowerCase())
      .filter(Boolean)
  );
}

/**
 * Cœur du filtrage (pur, testé) : lignes Lexique → liste de mots triée.
 */
function buildWordList(rows, options = {}) {
  const opts = { ...DEFAULTS, ...options };
  const exclusions = opts.exclusionSet || new Set();
  const stats = { rows: rows.length, nouns: 0, kept: 0 };

  // Fréquence totale de chaque forme, toutes catégories confondues (homographes).
  const formTotal = new Map();
  for (const r of rows) {
    const freq = parseNumber(r.freqfilms2) + parseNumber(r.freqlivres);
    formTotal.set(r.ortho, (formTotal.get(r.ortho) || 0) + freq);
  }

  const candidates = new Map(); // mot -> { score, nounFreq }
  for (const r of rows) {
    if (r.cgram !== 'NOM') continue;
    stats.nouns++;
    const word = r.ortho;
    if (!word || word !== word.toLowerCase()) continue; // nom propre ou sigle
    if (word !== r.lemme) continue; // forme fléchie
    if (r.nombre === 'p') continue; // pluriel
    const length = [...word].length;
    if (length < 3 || length > 12) continue;
    if (!LETTERS.test(word)) continue;
    if (exclusions.has(word)) continue;
    const entry = candidates.get(word) || { lemmaFreq: 0, nounFreq: 0 };
    entry.lemmaFreq = Math.max(entry.lemmaFreq, (parseNumber(r.freqlemfilms2) + parseNumber(r.freqlemlivres)) / 2);
    entry.nounFreq += parseNumber(r.freqfilms2) + parseNumber(r.freqlivres);
    candidates.set(word, entry);
  }

  const kept = [];
  for (const [word, entry] of candidates) {
    const total = formTotal.get(word) || 0;
    const share = total > 0 ? entry.nounFreq / total : 0;
    if (share < opts.minNounShare) continue;
    if (entry.lemmaFreq < opts.minFreq) continue;
    kept.push({ word, score: entry.lemmaFreq });
  }
  kept.sort((a, b) => b.score - a.score || a.word.localeCompare(b.word, 'fr'));
  const words = kept.slice(0, opts.max).map((k) => k.word).sort((a, b) => a.localeCompare(b, 'fr'));
  stats.kept = words.length;
  return { words, stats };
}

function parseArgs(argv) {
  const args = { ...DEFAULTS, download: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--input') args.input = path.resolve(next());
    else if (a === '--out') args.out = path.resolve(next());
    else if (a === '--exclusions') args.exclusions = path.resolve(next());
    else if (a === '--max') args.max = parseInt(next(), 10);
    else if (a === '--min-freq') args.minFreq = parseFloat(next());
    else if (a === '--min-noun-share') args.minNounShare = parseFloat(next());
    else if (a === '--download') args.download = true;
    else if (a === '--help' || a === '-h') args.help = true;
    else throw new Error(`Option inconnue : ${a}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]);
    return;
  }
  if (args.download) {
    console.log(`Téléchargement de ${DOWNLOAD_URL}…`);
    const res = await fetch(DOWNLOAD_URL);
    if (!res.ok) throw new Error(`Téléchargement impossible (HTTP ${res.status}). Téléchargez Lexique383.zip à la main.`);
    fs.mkdirSync(path.dirname(args.input), { recursive: true });
    fs.writeFileSync(args.input, Buffer.from(await res.arrayBuffer()));
  }
  if (!fs.existsSync(args.input)) {
    throw new Error(`Fichier introuvable : ${args.input}\nTéléchargez Lexique383.zip sur http://www.lexique.org et passez --input, ou utilisez --download.`);
  }

  const rows = parseLexique(fs.readFileSync(args.input, 'utf8'));
  const exclusionSet = fs.existsSync(args.exclusions) ? parseExclusions(fs.readFileSync(args.exclusions, 'utf8')) : new Set();
  const { words, stats } = buildWordList(rows, { ...args, exclusionSet });

  const output = {
    meta: {
      id: 'classique',
      label: 'Mots courants',
      source: 'Lexique 3.83 — Boris New, Christophe Pallier et al., http://www.lexique.org',
      license: 'CC BY-SA 4.0 (https://creativecommons.org/licenses/by-sa/4.0/) — liste dérivée',
      generatedBy: 'scripts/build-wordlist.js',
      generatedAt: new Date().toISOString().slice(0, 10),
      filters: { max: args.max, minFreq: args.minFreq, minNounShare: args.minNounShare, lengths: '3-12' },
      count: words.length
    },
    words
  };
  fs.writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`${stats.rows} lignes lues, ${stats.nouns} noms, ${words.length} mots retenus → ${path.relative(ROOT, args.out)}`);
  if (words.length < 1500) console.warn('Attention : moins de 1 500 mots. Baissez --min-freq pour en garder davantage.');
  console.log('Pensez à relire la liste avant de la versionner (git diff).');
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { parseLexique, parseExclusions, buildWordList };
