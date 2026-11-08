/* ---------- Home and navigation ---------- */
function finaleWinner(rows) {
  const fin = rows.slice(0, Math.min(S.cfg.finN, rows.length)).map(r => r.n);
  const tot = {};
  fin.forEach(id => { tot[id] = 0; });
  let fd = 0;
  S.fin.forEach(f => { if (fin.every(id => has(f[id]))) { fd++; fin.forEach(id => { tot[id] += f[id]; }); } });
  if (fd < S.cfg.finGP || !fin.length) return null;
  const max = Math.max(...fin.map(id => tot[id]));
  const top = fin.filter(id => tot[id] === max);
  return top.length === 1 ? top[0] : null;
}
function gameStatus(g) {
  return withS(g, () => {
    const st = standings();
    const total = S.rounds.length;
    let w = null;
    if (st.allDone && st.rows.length) {
      if (S.cfg.finale) { if (!st.tieOpen) w = finaleWinner(st.rows); }
      else if (!st.tieOpen) w = st.rows[0].n;
    }
    if (w) return { done: true, text: `Færdigt · ${nm(w)} vandt` };
    if (st.allDone && S.cfg.finale) return { done: false, text: 'Klar til finale' };
    return { done: false, text: `${st.done} af ${total} Grand Prix kørt` };
  });
}
