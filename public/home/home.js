/*
 * Accueil : nombre de joueurs en direct (GET /api/live, toutes les 20 s).
 * Sans réponse du serveur, la page garde l'indicateur simple « Parties en direct ».
 */
const REFRESH_MS = 20000;

function plural(n, one, many) {
  return `${n} ${n > 1 ? many : one}`;
}

async function refresh() {
  try {
    const res = await fetch('/api/live', { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    const total = data.totalPlayers || 0;
    const rooms = data.games && data.games.codenames ? data.games.codenames.rooms || 0 : 0;
    const parts = [total ? plural(total, 'joueur en ligne', 'joueurs en ligne') : 'Aucun joueur en ligne'];
    if (rooms) parts.push(plural(rooms, 'salon Codenames', 'salons Codenames'));
    document.getElementById('live-text').textContent = parts.join(' · ');

    document.querySelectorAll('[data-live]').forEach((node) => {
      const stats = data.games && data.games[node.dataset.live];
      const players = stats ? stats.players || 0 : 0;
      node.hidden = players === 0;
      node.querySelector('[data-live-text]').textContent = plural(players, 'en ligne', 'en ligne');
    });
  } catch {
    /* hors ligne : on garde l'affichage statique */
  }
}

refresh();
setInterval(() => { if (!document.hidden) refresh(); }, REFRESH_MS);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
