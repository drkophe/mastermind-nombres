# Sources et licences des données Codenames

## Liste de mots (`mots-communs.json`)

La liste est générée par `scripts/build-wordlist.js` à partir de **Lexique 3.83** :

> New, B., Pallier, C., Brysbaert, M., Ferrand, L. (2004). *Lexique 2 : A New French Lexical Database.*
> Behavior Research Methods, Instruments, & Computers, 36(3), 516-524.
> Base Lexique 3.83 — Boris New, Christophe Pallier et contributeurs — http://www.lexique.org

Lexique est distribué sous licence **CC BY-SA 4.0** (https://creativecommons.org/licenses/by-sa/4.0/).
La liste de mots dérivée (`mots-communs.json`) est donc elle aussi sous **CC BY-SA 4.0**.

Tant que le script n'a pas été lancé, le fichier contient une liste provisoire établie à la main
(champ `meta.source`).

### Régénérer la liste

```bash
# 1. Télécharger Lexique383.zip sur http://www.lexique.org et en extraire Lexique383.tsv
npm run build-wordlist -- --input chemin/vers/Lexique383.tsv
# 2. Relire le résultat (git diff), compléter exclusions.txt si besoin, relancer.
```

Options utiles : `--max 2500`, `--min-freq 3`, `--min-noun-share 0.5`, `--download`.

### Ajouter un paquet thématique

Déposer un fichier `{ "meta": {...}, "words": [...] }` dans ce dossier et le déclarer dans
`packs.json` (`id`, `label`, `file`). Il apparaît automatiquement dans les paramètres du salon.

## Définitions

Les définitions affichées en fin de manche proviennent du Wiktionnaire via
**FreeDictionaryAPI.com** (https://freedictionaryapi.com), sous licence **CC BY-SA 4.0**.
L'attribution est affichée dans l'interface avec un lien vers la page Wiktionary d'origine.
