/*
 * Projection pure du plateau Duo : calcule l'état d'affichage de chaque carte
 * pour UN joueur et UNE vue, à partir de sa propre face et du journal public.
 * Aucune dépendance au DOM : testée par node:test (test/codenames/duo-projection.test.js).
 *
 * Vues :
 * - « cle » (je fais deviner) : couleurs de MA face, validations de l'autre en direct ;
 * - « plateau » (je devine) : plateau neutre, AUCUNE information tirée de ma face
 *   en dehors des cartes communes que j'ai moi-même révélées (§ cartes communes).
 *
 * États de carte (kind) :
 *   hidden     non révélée, sans couleur
 *   key        non révélée, couleur de ma face (keyColor : agent | neutre | assassin)
 *   validated  agent trouvé, plein de la couleur du propriétaire de la clé (owner) + ✓
 *   common     agent commun aux deux faces, révélé par moi : diagonale A/B + ✓
 *   error      passant touché (beige + tiret)
 *   retired    sorti du jeu pour cette vue (grisé, pointillé, non cliquable)
 *   end        fin de partie : les deux faces (faceA, faceB) révélées
 */

export const otherSide = (side) => (side === 'A' ? 'B' : 'A');

const FACE_WORD = { agent: 'agent', neutre: 'passant', assassin: 'assassin' };
const PLAYER_WORD = { A: 'joueur A', B: 'joueur B' };

/** Dernière révélation « agent » d'une carte, ou null. */
function agentReveal(reveals, index) {
  for (let k = reveals.length - 1; k >= 0; k--) {
    if (reveals[k].index === index && reveals[k].result === 'agent') return reveals[k];
  }
  return null;
}

function passantReveals(reveals, index) {
  return reveals.filter((r) => r.index === index && r.result === 'passant');
}

/**
 * @param {object} p
 * @param {'A'|'B'|null} p.viewer  siège du joueur (null = spectateur)
 * @param {'cle'|'plateau'} p.view
 * @param {string[]} p.words
 * @param {string[]|null} p.myFace  ma face de la clé (jamais celle de l'autre)
 * @param {object[]} p.reveals       journal public
 * @param {boolean} p.ended
 * @param {{A:string[],B:string[]}|null} p.keys  les deux faces (fin de partie uniquement)
 * @param {number|null} p.assassinIndex
 * @param {(i:number)=>boolean} [p.canSelect]  carte proposable maintenant ?
 * @param {{A:string,B:string}} [p.names]
 */
export function projectDuoBoard(p) {
  const { viewer, words, reveals = [], ended = false } = p;
  const names = p.names || { A: 'joueur A', B: 'joueur B' };
  const canSelect = p.canSelect || (() => false);
  const view = viewer ? p.view : 'plateau';
  const myFace = viewer && view === 'cle' ? p.myFace : null;
  const other = viewer ? otherSide(viewer) : null;

  return words.map((word, i) => {
    const base = { index: i, word };

    // ---------- Fin de partie : les deux faces ----------
    if (ended && p.keys) {
      const a = p.keys.A[i];
      const b = p.keys.B[i];
      const found = !!agentReveal(reveals, i);
      return {
        ...base,
        kind: 'end',
        faceA: a,
        faceB: b,
        found,
        assassinHit: p.assassinIndex === i,
        label: `${word}, face A : ${FACE_WORD[a]}, face B : ${FACE_WORD[b]}${found ? ', agent trouvé' : ''}${p.assassinIndex === i ? ', assassin touché' : ''}`
      };
    }

    const agent = agentReveal(reveals, i);
    const passants = passantReveals(reveals, i);

    // ---------- Spectateur : aucune face ----------
    if (!viewer) {
      if (agent) return { ...base, kind: 'validated', owner: agent.giver, label: `${word}, agent de ${names[agent.giver]} trouvé` };
      if (passants.length) {
        const sides = [...new Set(passants.map((r) => r.giver))];
        return { ...base, kind: 'error', passantFor: sides, label: `${word}, passant pour ${sides.map((s) => names[s]).join(' et ')}` };
      }
      return { ...base, kind: 'hidden', label: `${word}, non révélée` };
    }

    // ---------- Vue « Ma clé » ----------
    if (view === 'cle') {
      const mine = myFace ? myFace[i] : null;
      if (agent) {
        if (agent.giver === viewer) {
          return { ...base, kind: 'validated', owner: viewer, live: true, label: `${word}, votre agent, trouvé par ${names[other]}` };
        }
        // Agent de l'autre, trouvé par moi.
        if (mine === 'agent') return { ...base, kind: 'common', label: `${word}, agent commun aux deux faces, trouvé par vous` };
        return { ...base, kind: 'retired', keyColor: mine, label: `${word}, retirée du jeu (agent de ${names[other]} trouvé par vous)` };
      }
      // Erreur de l'autre sur MON indice : il a touché un passant de ma face.
      if (passants.some((r) => r.giver === viewer)) {
        return { ...base, kind: 'error', passantFor: [viewer], label: `${word}, passant de votre face touché par ${names[other]}` };
      }
      // Toujours en jeu ; marque discrète si j'ai fait une erreur dessus en devinant.
      const mark = passants.some((r) => r.giver === other) ? [other] : [];
      return {
        ...base,
        kind: 'key',
        keyColor: mine,
        passantFor: mark,
        selectable: canSelect(i),
        label: `${word}, votre face : ${FACE_WORD[mine] || 'inconnue'}${mark.length ? `, passant pour ${names[other]}` : ''}`
      };
    }

    // ---------- Vue « Plateau » : aucune donnée de clé ----------
    if (agent) {
      if (agent.giver === other) {
        // Je l'ai trouvé sur l'indice de l'autre. Commune seulement si c'est aussi un agent de ma face.
        const common = Array.isArray(p.myFace) && p.myFace[i] === 'agent';
        if (common) return { ...base, kind: 'common', label: `${word}, agent commun aux deux faces, trouvé par vous` };
        return { ...base, kind: 'validated', owner: other, label: `${word}, agent de ${names[other]} trouvé par vous` };
      }
      return { ...base, kind: 'retired', label: `${word}, retirée du jeu` };
    }
    if (passants.some((r) => r.giver === other)) {
      // Mon erreur en devinant : passant de la face de l'autre (plus proposable sur ses indices).
      return { ...base, kind: 'error', passantFor: [other], label: `${word}, passant pour ${names[other]} (votre erreur)` };
    }
    const mark = passants.some((r) => r.giver === viewer) ? [viewer] : [];
    return {
      ...base,
      kind: 'hidden',
      passantFor: mark,
      selectable: canSelect(i),
      label: `${word}, non révélée${mark.length ? `, passant pour ${names[viewer]}` : ''}`
    };
  });
}

/**
 * Légende : symboles réellement utilisés dans une vue.
 * « Agent commun » n'apparaît que si une carte commune est affichée (cards = projection).
 */
export function legendFor(view, viewer, cards = []) {
  const hasCommon = cards.some((c) => c.kind === 'common');
  const common = hasCommon ? [['common', 'Agent commun']] : [];
  if (!viewer) {
    return [['A', 'Agent de A trouvé'], ['B', 'Agent de B trouvé'], ['passant', 'Passant'], ['retired', 'Hors jeu']];
  }
  if (view === 'cle') {
    return [[viewer, 'Mes agents'], ['passant', 'Passant'], ['assassin', 'Assassin'], ['check', 'Trouvé'], ...common, ['retired', 'Hors jeu']];
  }
  return [[otherSide(viewer), 'Agent trouvé'], ...common, ['passant', 'Erreur'], ['retired', 'Hors jeu']];
}

export const PLAYER_LABEL = PLAYER_WORD;
