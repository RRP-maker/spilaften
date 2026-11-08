/* ---------- Cups ---------- */
function cupList() { return S.cfg.dlc ? CUPS_BASE.concat(CUPS_DLC) : CUPS_BASE.slice(); }
// Gives each Grand Prix that is not played a random cup, without repeats until every cup has been used
function assignCups(all) {
  if (S.cfg.cupMode !== 'random') return;
  const cups = cupList();
  const used = new Set(S.rounds.filter(r => Object.keys(r.g).length && r.c).map(r => r.c));
  let pool = [];
  const draw = () => {
    if (!pool.length) {
      pool = shuffle(cups.filter(c => !used.has(c)));
      if (!pool.length) { used.clear(); pool = shuffle([...cups]); }
    }
    const c = pool.pop();
    used.add(c);
    return c;
  };
  S.rounds.forEach(r => {
    if (Object.keys(r.g).length) return;
    if (all || !r.c || r.auto) { r.c = draw(); r.auto = true; }
    else used.add(r.c);
  });
  S.fc = S.fc.map((c, f) => {
    const started = Object.keys(S.fin[f] || {}).length > 0;
    if (started || (c && !all && !S.fcAuto)) return c;
    return draw();
  });
  S.fcAuto = true;
}

const openCats = new Set();
let finalKey = '', armedId = null, armTimer = null;

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function P(id) { return S.players.find(p => p.id === id); }
function active() { return S.players.filter(p => p.active).map(p => p.id); }
function nm(id) { const p = P(id); return ((p && p.name) || '').trim() || (p ? PC[p.color].label : '?'); }
function nmSpan(id) { return `<span data-nm="${id}"></span>`; }
function has(v) { return typeof v === 'number' && !isNaN(v); }
function roundDone(r) { return r.p.length > 0 && r.p.every(id => has(r.g[id])); }
function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }
// Only touch the DOM when the markup actually changes, so entrances don't replay on every keystroke
function setHTML(el, html) { if (el._html !== html) { el._html = html; el.innerHTML = html; } }
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
function gange(x) { return x === 1 ? 'én gang' : x + ' gange'; }

// Picks a character nobody in this game has yet, at random
function pickChar(g) {
  const used = new Set((g || S).players.map(p => p.ch));
  const free = CHARS.map((_, i) => i).filter(i => !used.has(i));
  const pool = free.length ? free : CHARS.map((_, i) => i);
  return pool[Math.floor(Math.random() * pool.length)];
}
function avatar(ch, color) {
  return `<img class="ava" src="${CHARS[ch]}" alt="" width="36" height="36" style="--pc:${color}">`;
}
function kart(id) {
  const p = P(id);
  if (p && typeof p.ch === 'number' && CHARS[p.ch]) return avatar(p.ch, PC[p.color].color);
  const c = p ? PC[p.color].color : '#999';
  return `<svg width="38" height="26" viewBox="0 0 40 28" aria-hidden="true">
    <rect x="3" y="10" width="32" height="10" rx="5" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
    <rect x="24" y="6" width="10" height="7" rx="3" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
    <circle cx="19" cy="7" r="5" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/>
    <path d="M15 6h8" stroke="#1a1a2e" stroke-opacity=".55" stroke-width="2" stroke-linecap="round"/>
    <circle cx="9" cy="22" r="4.5" fill="#1a1a2e"/><circle cx="9" cy="22" r="1.6" fill="#c9d1dc"/>
    <circle cx="29" cy="22" r="4.5" fill="#1a1a2e"/><circle cx="29" cy="22" r="1.6" fill="#c9d1dc"/>
  </svg>`;
}
const trophy = `<svg width="34" height="34" viewBox="0 0 28 28" aria-hidden="true"><path d="M7 3h14v7a7 7 0 0 1-14 0V3z" fill="#fff" stroke="#1a1a2e" stroke-width="2.5" stroke-linejoin="round"/><path d="M7 6H3c0 4 2 6 4 6M21 6h4c0 4-2 6-4 6" fill="none" stroke="#1a1a2e" stroke-width="2.5"/><rect x="11" y="16" width="6" height="5" fill="#fff" stroke="#1a1a2e" stroke-width="2.5"/><rect x="7" y="21" width="14" height="4" rx="1.5" fill="#e52521" stroke="#1a1a2e" stroke-width="2.5"/></svg>`;

/* ---------- Planning ---------- */
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function overlap(a, b) { return a.filter(x => b.includes(x)).length; }
function fval(m, x) { return m * m + (m < x ? 1000 * (x - m) : 0); }

// Orders rounds so the same player rarely races twice in a row
function orderRounds(list, prev) {
  if (list.length < 2) return list;
  if (!S.cfg.spread) return shuffle([...list]);
  let best = null, bestOv = Infinity;
  for (let t = 0; t < 40; t++) {
    const pool = shuffle([...list]);
    const out = [];
    let last = prev, ov = 0;
    while (pool.length) {
      let bi = 0, bc = Infinity;
      pool.forEach((r, i) => { const c = last ? overlap(last, r) : 0; if (c < bc) { bc = c; bi = i; } });
      const r = pool.splice(bi, 1)[0];
      ov += bc; out.push(r); last = r;
    }
    if (ov < bestOv) { bestOv = ov; best = out; }
    if (ov === 0) break;
  }
  return best;
}

// Builds rounds with the given sizes so player i plays rem0[i] times; x > 0 means every pair should meet x times
function searchPlan(n, rem0, sizes, M0, x) {
  const R = sizes.length;
  const attempts = 30, swaps = x ? 3000 : 600;
  let best = null, found = 0;
  for (let at = 0; at < attempts; at++) {
    const sz = shuffle([...sizes]);
    const rem = [...rem0];
    const M = M0.map(r => [...r]);
    const rounds = [];
    let ok = true;
    for (let k = 0; k < R && ok; k++) {
      const L = R - k, size = sz[k];
      const must = [];
      for (let i = 0; i < n; i++) if (rem[i] === L) must.push(i);
      if (must.length > size) { ok = false; break; }
      const cand = shuffle([...Array(n).keys()].filter(i => rem[i] > 0 && !must.includes(i)));
      const chosen = [...must];
      while (chosen.length < size) {
        if (!cand.length) { ok = false; break; }
        let bi = 0, bc = Infinity;
        cand.forEach((i, ci) => {
          let c = -rem[i] * 0.01;
          chosen.forEach(o => { c += M[i][o] - (M[i][o] < x ? 5 : 0); });
          if (c < bc) { bc = c; bi = ci; }
        });
        chosen.push(cand.splice(bi, 1)[0]);
      }
      if (!ok) break;
      chosen.forEach(i => { rem[i]--; });
      for (let a = 0; a < chosen.length; a++) for (let b = a + 1; b < chosen.length; b++) { M[chosen[a]][chosen[b]]++; M[chosen[b]][chosen[a]]++; }
      rounds.push(chosen);
    }
    if (!ok || rem.some(v => v !== 0)) continue;
    const bump = (a, b, d) => { const o = M[a][b], nn = o + d; M[a][b] = nn; M[b][a] = nn; return fval(nn, x) - fval(o, x); };
    const move = (ra, rc, p, q, s) => {
      let d = 0;
      ra.forEach(o => { if (o !== p) { d += bump(p, o, -s); d += bump(q, o, s); } });
      rc.forEach(o => { if (o !== q) { d += bump(q, o, -s); d += bump(p, o, s); } });
      return d;
    };
    for (let it = 0; it < swaps && R > 1; it++) {
      const a = Math.floor(Math.random() * R), c = Math.floor(Math.random() * R);
      if (a === c) continue;
      const ia = Math.floor(Math.random() * rounds[a].length), ic = Math.floor(Math.random() * rounds[c].length);
      const p = rounds[a][ia], q = rounds[c][ic];
      if (p === q || rounds[c].includes(p) || rounds[a].includes(q)) continue;
      const d = move(rounds[a], rounds[c], p, q, 1);
      if (d <= 0) { rounds[a][ia] = q; rounds[c][ic] = p; }
      else move(rounds[a], rounds[c], p, q, -1);
    }
    let sq = 0, def = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { sq += M[i][j] * M[i][j]; if (M[i][j] < x) def += x - M[i][j]; }
    if (!best || def < best.def || (def === best.def && sq < best.sq)) best = { rounds: rounds.map(r => [...r]), def, sq };
    if (best.def === 0 && ++found >= 4) break;
  }
  return best;
}

function schedCounts() {
  const c = {};
  active().forEach(id => { c[id] = 0; });
  S.rounds.forEach(r => r.p.forEach(id => { if (id in c) c[id]++; }));
  return c;
}

// Keeps Grand Prix that have points, and rebuilds the rest from the current settings
function replan(msg) {
  const cfg = S.cfg;
  const act = active();
  const actSet = new Set(act);
  let discarded = false;
  const keptSet = new Set();
  S.rounds.forEach(r => {
    if (!Object.keys(r.g).length) return;
    if (roundDone(r) || r.p.every(id => actSet.has(id))) keptSet.add(r);
    else discarded = true;
  });
  const kept = S.rounds.filter(r => keptSet.has(r));
  const n = act.length;
  const idx = {};
  act.forEach((id, i) => { idx[id] = i; });
  const cnt = Array(n).fill(0);
  const M = Array.from({ length: n }, () => Array(n).fill(0));
  kept.forEach(r => {
    const a = r.p.filter(id => actSet.has(id)).map(id => idx[id]);
    a.forEach(i => { cnt[i]++; });
    for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) { M[a[i]][a[j]]++; M[a[j]][a[i]]++; }
  });
  const liga = cfg.format === 'liga';
  const x = liga ? cfg.meets : 0;
  const k = Math.min(cfg.size, n);
  let planR = [], T = null, def = 0, target = 0;
  if (n >= 2) {
    const maxc = Math.max(...cnt);
    if (cfg.format === 'tur') target = 1;
    else if (cfg.format === 'kval') target = cfg.plays;
    let T0 = Math.max(target, maxc);
    if (liga) {
      for (let i = 0; i < n; i++) {
        let need = 0;
        for (let j = 0; j < n; j++) if (j !== i) need += Math.max(0, x - M[i][j]);
        T0 = Math.max(T0, cnt[i] + Math.ceil(need / (k - 1)));
      }
    }
    let fallback = null;
    for (let t = T0; t <= T0 + 8 && T === null; t++) {
      const rem = cnt.map(c => t - c);
      const sum = rem.reduce((a, b) => a + b, 0);
      if (sum === 0) {
        let d = 0;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) d += Math.max(0, x - M[i][j]);
        if (d === 0) { T = t; planR = []; }
        continue;
      }
      const R = Math.ceil(sum / k);
      if (sum < 2 * R || Math.max(...rem) > R) continue;
      const base = Math.floor(sum / R), extra = sum % R;
      const sizes = Array.from({ length: R }, (_, i) => i < extra ? base + 1 : base);
      const res = searchPlan(n, rem, sizes, M, x);
      if (!res) continue;
      if (res.def === 0) { T = t; planR = res.rounds; }
      else if (!fallback || res.def < fallback.res.def) fallback = { t, res };
    }
    if (T === null && fallback) { T = fallback.t; planR = fallback.res.rounds; def = fallback.res.def; }
  }
  const prev = kept.length ? kept[kept.length - 1].p : null;
  const newR = orderRounds(planR.map(r => r.map(i => act[i])), prev).map(p => ({ p, g: {}, c: '' }));
  const out = [];
  let ni = 0;
  S.rounds.forEach(r => {
    if (keptSet.has(r)) out.push(r);
    else if (ni < newR.length) out.push(newR[ni++]);
  });
  while (ni < newR.length) out.push(newR[ni++]);
  S.rounds = out;
  S.players = S.players.filter(p => p.active || S.rounds.some(r => r.p.includes(p.id)));
  S.x = S.x.filter(id => actSet.has(id));

  const parts = [];
  if (msg) parts.push(msg);
  if (kept.length) parts.push('Kørte Grand Prix er ikke ændret.');
  if (n < 2) {
    parts.push('Tilføj mindst 2 spillere, så laver siden en plan.');
  } else {
    const sc = schedCounts();
    const vals = act.map(id => sc[id]);
    const lo = Math.min(...vals), hi = Math.max(...vals);
    parts.push(`Planen har ${S.rounds.length} Grand Prix. ` + (lo === hi ? `Alle kører ${lo}.` : `Spillerne kører ${lo}-${hi}.`));
    if (liga) parts.push(def ? 'Ikke alle kunne nå at mødes lige mange gange.' : `Alle møder hinanden mindst ${gange(x)}.`);
    const small = newR.filter(r => r.p.length < k);
    if (small.length) {
      const szs = [...new Set(small.map(r => r.p.length))].join(' eller ');
      parts.push(`${small.length} Grand Prix har kun ${szs} spillere, så regnestykket går op.`);
    }
    if (!liga && T !== null && T > target && kept.length) parts.push('Der er lagt ekstra Grand Prix til, så alle kan køre lige mange.');
  }
  if (discarded) parts.push('Delvist indtastede point i et Grand Prix med en fjernet spiller er slettet.');
  S.info = msg === '' ? '' : parts.join(' ');
}

/* ---------- Standings ---------- */
function standings() {
  const cfg = S.cfg;
  const act = active();
  const T = {};
  act.forEach(n => { T[n] = { n, pts: 0, pl: 0, w: 0, beat: {}, h: 0 }; });
  let done = 0;
  S.rounds.forEach(rd => {
    if (!roundDone(rd)) return;
    done++;
    rd.p.forEach(a => {
      const t = T[a];
      if (!t) return;
      const sa = rd.g[a];
      t.pts += sa;
      t.pl++;
      const others = rd.p.filter(b => b !== a);
      if (others.every(b => sa > rd.g[b])) t.w++;
      others.forEach(b => { if (sa > rd.g[b]) t.beat[b] = 1; });
    });
  });
  const sched = schedCounts();
  const sv = act.map(id => sched[id]);
  const equal = !sv.length || Math.min(...sv) === Math.max(...sv);
  const useAvg = cfg.rank === 'avg' || (cfg.rank === 'auto' && !equal);
  Object.values(T).forEach(t => { t.val = useAvg ? (t.pl ? t.pts / t.pl : 0) : t.pts; t.vk = Math.round(t.val * 1000); });
  const arr = Object.values(T).sort((a, b) => b.vk - a.vk || b.w - a.w);
  const out = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j].vk === arr[i].vk && arr[j].w === arr[i].w) j++;
    const g = arr.slice(i, j);
    if (g.length > 1) {
      g.forEach(a => { a.h = g.filter(b => b !== a && a.beat[b.n]).length; });
      g.sort((a, b) => b.h - a.h);
    }
    out.push(...g);
    i = j;
  }
  const allDone = S.rounds.length > 0 && done === S.rounds.length;
  const cut = cfg.finale ? Math.min(cfg.finN, out.length) : 1;
  const pos = {};
  const tk = a => a.vk + '|' + a.w + '|' + a.h;
  out.forEach((a, k) => { (pos[tk(a)] = pos[tk(a)] || []).push(k); });
  out.forEach(a => {
    const p = pos[tk(a)];
    a.cutTie = allDone && cut < out.length && p.length > 1 && Math.min(...p) <= cut - 1 && Math.max(...p) >= cut;
  });
  // Extra race: players tapped in finishing order move up within their tie
  Object.values(pos).forEach(p => {
    if (p.length < 2 || !out[p[0]].cutTie) return;
    const grp = p.map(k => out[k]);
    const xi = a => { const k = S.x.indexOf(a.n); return k < 0 ? 99 : k; };
    grp.sort((a, b) => xi(a) - xi(b));
    p.forEach((k, j) => { out[k] = grp[j]; });
  });
  const tied = out.filter(r => r.cutTie).map(r => r.n);
  const tieOpen = tied.some(id => !S.x.includes(id));
  return { rows: out, done, allDone, sched, useAvg, cut, tied, tieOpen };
}

/* ---------- Settings ---------- */
function seg(key, opts, label) {
  return `<div class="field"><div class="flabel">${label}</div><div class="seg" role="group" aria-label="${label}">${opts.map(o => {
    const [v, l, dis] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" data-act="set" data-k="${key}" data-v="${v}" aria-pressed="${String(S.cfg[key]) === String(v)}"${dis ? ' disabled' : ''}>${l}</button>`;
  }).join('')}</div></div>`;
}
function stepper(key, label, min, max) {
  const v = S.cfg[key];
  return `<div class="field"><div class="flabel" id="lbl-${key}">${label}</div><div class="stepper" role="group" aria-labelledby="lbl-${key}">
    <button type="button" data-act="step" data-k="${key}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="Færre"${v <= min ? ' disabled' : ''}>−</button>
    <output>${v}</output>
    <button type="button" data-act="step" data-k="${key}" data-d="1" data-min="${min}" data-max="${max}" aria-label="Flere"${v >= max ? ' disabled' : ''}>+</button></div></div>`;
}
function help(t) { return `<p class="help">${t}</p>`; }
function confirmBtn(id, act, label, extra) {
  return `<button type="button" class="setbtn ${extra || ''}" id="${id}" data-act="${act}" data-label="${label}" data-confirm="Tryk igen for at bekræfte">${label}</button>`;
}

const CATS = [
  {
    id: 'names', title: 'Spillernavne',
    sum: () => plural(active().length, 'spiller', 'spillere'),
    body: () => active().length ? `<div class="namelist">${active().map(id => `<div class="addrow">${kart(id)}<span class="clabel">${PC[P(id).color].label}</span>
      <input class="nameinp" id="nm-${id}" data-nav="mkn" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Navn" data-kind="n" data-n="${id}" value="${esc(P(id).name || '')}"></div>`).join('')}</div>` : help('Ingen spillere.')
  },
  {
    id: 'format', title: 'Turneringsform',
    sum: c => MODE[c.format].name + (c.format === 'kval' ? ` · ${c.plays} GP hver` : c.format === 'liga' ? ` · ${c.meets}×` : ''),
    body: c => `<div class="modes" role="group" aria-label="Turneringsform">${MODES.map(m =>
      `<button type="button" class="mode" data-act="set" data-k="format" data-v="${m.id}" aria-pressed="${c.format === m.id}"><b>${m.name}</b><span>${m.desc}</span></button>`).join('')}</div>` +
      (c.format === 'kval' ? stepper('plays', 'Grand Prix pr. spiller', 1, 10) : '') +
      (c.format === 'liga' ? seg('meets', [[1, 'Én gang'], [2, 'To gange'], [3, 'Tre gange']], 'Hvor mange gange møder alle hinanden?') : '') +
      help('Skifter I form midt i turneringen, bliver kun de Grand Prix, der ikke er kørt, lavet om.')
  },
  {
    id: 'gp', title: 'Grand Prix',
    sum: c => `${c.size} spillere · ${c.tracks} baner`,
    body: c => seg('size', [2, 3, 4], 'Spillere pr. Grand Prix') +
      help('Mario Kart kan have op til 4 spillere på én skærm. Går antallet ikke op, får nogle Grand Prix en spiller mindre.') +
      seg('tracks', [4, 6, 8, 12, 16], 'Baner pr. Grand Prix')
  },
  {
    id: 'cups', title: 'Baner',
    sum: c => ({ free: 'Vælg selv', random: 'Tilfældige cups', none: 'Ingen faste baner' })[c.cupMode] + (c.cupMode !== 'none' ? (c.dlc ? ' · 24 cups' : ' · 12 cups') : ''),
    body: c => seg('cupMode', [['free', 'Vælg selv'], ['random', 'Tilfældige cups'], ['none', 'Ingen faste baner']], 'Hvordan vælges banerne?') +
      ({ free: help('Tryk på cuppen for at vælge fra listen, eller tryk på terningen for at få en tilfældig cup.'),
         random: help('Siden trækker en tilfældig cup til hvert Grand Prix, der ikke er kørt. Den samme cup kommer først igen, når alle er brugt. Terningen ved hvert Grand Prix trækker en ny.'),
         none: help('Der står ingen cup ved Grand Prix. I vælger selv baner i spillet.') })[c.cupMode] +
      (c.cupMode !== 'none' ? seg('dlc', [[false, 'Kun grundspillet (12)'], [true, 'Med Booster Course Pass (24)']], 'Hvilke cups er med?') : '') +
      (c.cupMode === 'random' ? '<button type="button" class="setbtn" data-act="reroll">Træk nye cups</button>' : '')
  },
  {
    id: 'finale', title: 'Finale',
    sum: c => c.finale ? `${c.finN} finalister · ${c.finGP} GP` : 'Uden finale',
    body: c => seg('finale', [[false, 'Uden finale'], [true, 'Med finale']], 'Skal turneringen slutte med en finale?') +
      (c.finale
        ? seg('finN', [2, 3, 4], 'Antal finalister') + seg('finGP', [1, 2, 3], 'Grand Prix i finalen') +
          help('Finalisternes point fra finalen lægges sammen. Højeste samlede point vinder.')
        : help('Uden finale vinder den, der står øverst, når alle Grand Prix er kørt.'))
  },
  {
    id: 'rank', title: 'Point og stilling',
    sum: c => ({ auto: 'Automatisk', sum: 'Samlede point', avg: 'Gennemsnit' })[c.rank],
    body: c => seg('rank', [['auto', 'Automatisk'], ['sum', 'Samlede point'], ['avg', 'Gennemsnit']], 'Hvordan regnes stillingen?') +
      help('Automatisk lægger point sammen, når alle kører lige mange Grand Prix, og bruger gennemsnit pr. Grand Prix, når de ikke gør. Ved pointlighed tæller flest sejre og så det indbyrdes opgør.')
  },
  {
    id: 'order', title: 'Rækkefølge',
    sum: c => c.spread ? 'Med pauser' : 'Tilfældig',
    body: c => seg('spread', [[true, 'Til'], [false, 'Fra']], 'Undgå at samme spiller kører to Grand Prix i træk') +
      `<button type="button" class="setbtn" data-act="shuffle">Bland de Grand Prix, der ikke er kørt</button>`
  },
  {
    id: 'reset', title: 'Nulstil',
    sum: () => '',
    body: () => `<div class="btnrow">${confirmBtn('resetpts', 'resetpts', 'Nulstil point')}${confirmBtn('delgame-cur', 'delgame', 'Slet spillet', 'danger')}</div>` +
      help('Nulstil point beholder spillerne. Slet spillet fjerner det fra forsiden.')
  }
];

function buildSettings() {
  const c = S.cfg;
  document.getElementById('sethint').textContent = view === 'play'
    ? 'Ændrer I noget her, bliver kun de Grand Prix, der ikke er kørt, lavet om.'
    : 'Tryk på en kategori for at åbne eller lukke den.';
  document.getElementById('settings').innerHTML = CATS.filter(c => view === 'play' || (c.id !== 'names' && c.id !== 'reset')).map(cat =>
    `<details class="panel cat" data-cat="${cat.id}"${openCats.has(cat.id) ? ' open' : ''}>
      <summary><span class="ct">${cat.title}</span><span class="cs">${esc(cat.sum(c))}</span>
      <svg class="chev" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <div class="cb">${cat.body(c)}</div>
    </details>`).join('');
}

/* ---------- Building the page ---------- */
function buildPlayers() {
  const act = S.players.filter(p => p.active);
  document.getElementById('players').innerHTML = act.length ? act.map(p => {
    const label = PC[p.color].label;
    return `<div class="prow"><label class="pname" for="name-${p.id}">${kart(p.id)}<span class="clabel">${label}</span></label>
      <input class="nameinp" id="name-${p.id}" data-nav="mkp" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Navn" data-kind="n" data-n="${p.id}" value="${esc(p.name || '')}">
      <button type="button" class="rm" id="rm-${p.id}" data-act="rm" data-n="${p.id}" data-label="Fjern" data-confirm="Sikker?" aria-label="Fjern ${label}">Fjern</button></div>`;
  }).join('') : '<p class="emptyp">Ingen spillere endnu. Tryk på Tilføj spiller for at komme i gang.</p>';
  const add = document.getElementById('add');
  add.disabled = act.length >= MAX_P;
  add.textContent = act.length >= MAX_P ? `Der kan højst være ${MAX_P} spillere` : 'Tilføj spiller';
}

function buildRounds() {
  const el = document.getElementById('rounds');
  if (!S.rounds.length) {
    el.innerHTML = '<div class="panel empty">Der er ingen Grand Prix endnu. Tilføj mindst 2 spillere, så laver siden en plan.</div>';
    return;
  }
  el.innerHTML = S.rounds.map((rd, i) => {
    const rows = rd.p.map(n => {
      const v = rd.g[n];
      const gone = !(P(n) && P(n).active);
      return `<label class="prow${gone ? ' gone' : ''}" for="g-${i}-${n}"><span class="pname">${kart(n)}${nmSpan(n)}${gone ? '<em class="goneTag">fratrådt</em>' : ''}</span>
        <input class="score" id="g-${i}-${n}" data-nav="sc" enterkeyhint="next" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="0" data-kind="g" data-r="${i}" data-n="${n}" value="${has(v) ? v : ''}"></label>`;
    }).join('');
    const odd = rd.p.length !== Math.min(S.cfg.size, Math.max(2, active().length));
    return `<article class="panel card" id="rc-${i}">
      <header><h3>Grand Prix ${i + 1}${odd ? ` <small class="four">${rd.p.length} spillere</small>` : ''}</h3><span class="lights s-open" id="lt-${i}"><i></i><i></i><i></i><b>Venter</b></span></header>
      ${cupPicker('cup-' + i, `Cup i Grand Prix ${i + 1}`, 'r-' + i, rd.c)}
      ${rows}
    </article>`;
  }).join('');
}

const diceSvg = `<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.2" cy="8.2" r="1.6" fill="currentColor"/><circle cx="15.8" cy="8.2" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="8.2" cy="15.8" r="1.6" fill="currentColor"/><circle cx="15.8" cy="15.8" r="1.6" fill="currentColor"/></svg>`;
let lastRolled = null;
let pendingCh = null;
// The cup is chosen from a list or rolled with the dice; it cannot be typed
function cupPicker(id, label, key, val) {
  if (S.cfg.cupMode === 'none') return '';
  const cups = cupList();
  if (val && !cups.includes(val)) cups.unshift(val);
  const img = val && CUP_IMG[val] ? `<img class="cupimg${lastRolled === key ? ' rolled' : ''}" src="${CUP_IMG[val]}" alt="" width="40" height="40">` : '<span class="cupimg none" aria-hidden="true"></span>';
  return `<div class="cuppick"><label class="cupsel" for="${id}">${img}<span class="cupname${val ? '' : ' empty'}">${val ? esc(val) : 'Vælg cup'}</span>
      <svg class="cupchev" width="14" height="14" viewBox="0 0 18 18" aria-hidden="true"><path d="M5 7l4 4 4-4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <select id="${id}" aria-label="${label}" data-kind="cupsel" data-k="${key}"><option value="">Ingen cup</option>${cups.map(c => `<option${c === val ? ' selected' : ''}>${esc(c)}</option>`).join('')}</select></label>
    <button type="button" class="dice" data-act="dice" data-k="${key}" aria-label="Tilfældig cup til ${label.toLowerCase()}">${diceSvg}</button></div>`;
}
function cupGet(key) { const [t, i] = key.split('-'); return t === 'r' ? (S.rounds[+i] || {}).c : S.fc[+i]; }
function cupSet(key, v) {
  const [t, i] = key.split('-');
  if (t === 'r') { S.rounds[+i].c = v; S.rounds[+i].auto = false; }
  else { S.fc[+i] = v; S.fcAuto = false; }
}
function cupRefresh() {
  save();
  buildRounds();
  finalKey = '';
  update();
  lastRolled = null;
}
function cupInput(id, label, attrs, val) {
  if (S.cfg.cupMode === 'none') return '';
  return `<input class="cup${S.cfg.cupMode === 'random' ? ' rnd' : ''}" id="${id}" data-nav="cup" enterkeyhint="next" type="text" list="cuplist" maxlength="30" autocomplete="off" placeholder="Cup (valgfri)" aria-label="${label}" ${attrs} value="${esc(val || '')}">`;
}
function buildCupList() {
  document.getElementById('cuplist').innerHTML = cupList().map(c => `<option value="${c}"></option>`).join('');
}
function buildFinal(finalists) {
  const nGP = S.cfg.finGP;
  finalKey = finalists.join(',') + '|' + nGP;
  let html = '';
  for (let f = 0; f < nGP; f++) {
    const rows = finalists.map(n => {
      const v = S.fin[f][n];
      return `<label class="prow" for="fp-${f}-${n}"><span class="pname">${kart(n)}${nmSpan(n)}</span>
        <input class="score" id="fp-${f}-${n}" data-nav="sc" enterkeyhint="next" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="0" data-kind="fp" data-f="${f}" data-n="${n}" value="${has(v) ? v : ''}"></label>`;
    }).join('');
    html += `<div class="panel card"><header><h3>${nGP > 1 ? 'Finale ' + (f + 1) : 'Finale-Grand Prix'}</h3></header>${cupPicker('fcup-' + f, 'Cup i finalen', 'f-' + f, S.fc[f])}${rows}</div>`;
  }
  document.getElementById('final').innerHTML =
    (nGP > 1 ? '<div class="panel tablebox"><table id="fintable"></table></div>' : '') +
    `<div class="rounds">${html}</div><div id="winner"></div>`;
}

function fill() {
  document.querySelectorAll('[data-nm]').forEach(el => { el.textContent = nm(el.dataset.nm); });
}
function update() { render(); fill(); }

function render() {
  const cfg = S.cfg;
  const { rows, done, allDone, sched, useAvg, cut, tied, tieOpen } = standings();
  const n = rows.length;
  const started = done > 0;
  const total = S.rounds.length;

  const title = view === 'setup' ? 'Nyt spil: Mario Kart' : 'Mario Kart-turnering';
  document.getElementById('gtitle').textContent = title;
  document.getElementById('navtitle').textContent = view === 'setup' ? 'Nyt spil' : 'Mario Kart';
  const sb = document.getElementById('startbtn');
  sb.disabled = n < 2;
  document.getElementById('startsum').textContent = n < 2
    ? 'Tilføj mindst 2 spillere for at starte.'
    : `${n} spillere · ${MODE[cfg.format].name} · ${total} Grand Prix${cfg.finale ? ' + finale' : ''}`;
  document.getElementById('sub').textContent = n === 0
    ? 'Tilføj spillere for at starte'
    : `${n} spiller${n === 1 ? '' : 'e'} · ${MODE[cfg.format].name}${cfg.format === 'liga' ? ' ' + cfg.meets + '×' : ''} · ${cfg.finale ? 'med finale' : 'uden finale'}`;
  setHTML(document.getElementById('planmsg'), S.info ? `<div class="panel note">${esc(S.info)}</div>` : '');
  document.getElementById('rules').innerHTML = `<span class="rchip">${cfg.tracks} baner pr. Grand Prix</span>` +
    (cfg.cupMode === 'none' ? '' : `<span class="rchip">${cfg.cupMode === 'random' ? 'Tilfældige cups' : 'Cups vælges selv'} · ${cfg.dlc ? 'med' : 'uden'} Booster Course Pass</span>`);

  document.getElementById('rankhint').textContent = n === 0 ? 'Stillingen vises, når der er spillere.' :
    (useAvg ? 'Stillingen regnes som gennemsnit pr. Grand Prix' + (cfg.rank === 'auto' ? ', fordi ikke alle kører lige mange.' : '.') : 'Point fra alle Grand Prix lægges sammen.') +
    (cfg.finale ? ` De ${cut} bedste kører finalen.` : ' Den øverste vinder.');

  // Tie banner
  setHTML(document.getElementById('banner'), tied.length
    ? `<div class="panel banner"><p>Uafgjort om ${cfg.finale ? 'finalepladserne' : 'sejren'}. Kør et ekstra løb, og tryk på navnene i den rækkefølge, de kom i mål.</p><div class="xrow">${tied.map(id => {
        const k = S.x.indexOf(id);
        return `<button type="button" class="xbtn" data-act="x" data-n="${id}" aria-pressed="${k >= 0}">${k >= 0 ? (k + 1) + '. ' : ''}${esc(nm(id))}</button>`;
      }).join('')}</div></div>`
    : '');

  // Standings
  const stand = document.getElementById('stand');
  if (!n) {
    setHTML(stand, '<tr><td class="emptycell">Ingen spillere endnu.</td></tr>');
  } else {
    let h = `<tr><th>#</th><th class="l">Spiller</th><th>GP</th><th>Sejre</th><th>Point</th>${useAvg ? '<th>Snit</th>' : ''}</tr>`;
    rows.forEach((r, k) => {
      const top = started && (cfg.finale ? k < cut : (k === 0 && allDone && !tieOpen));
      const medal = started && k < 3 ? `<span class="medal m${k + 1}">${k + 1}</span>` : `<span class="medal plain">${k + 1}</span>`;
      const chip = top ? `<span class="chip">${cfg.finale ? (allDone ? 'Finale' : 'Foreløbig') : 'Vinder'}</span>` : '';
      h += `<tr data-id="${r.n}" class="${top ? 'fin' : ''}"><td class="rank">${medal}</td><td class="l"><span class="pl">${kart(r.n)}${nmSpan(r.n)}</span> ${chip}</td><td>${r.pl}/${sched[r.n]}</td><td>${r.w}</td>` +
        (useAvg ? `<td>${r.pts}</td><td class="pts">${r.val.toFixed(1).replace('.', ',')}</td>` : `<td class="pts">${r.pts}</td>`) + '</tr>';
    });
    const before = {};
    stand.querySelectorAll('tr[data-id]').forEach(tr => { before[tr.dataset.id] = tr.getBoundingClientRect().top; });
    if (stand._html !== h) {
      setHTML(stand, h);
      // Rows that changed place glide to their new spot, so you can see who moved up
      if (!reduceMotion() && stand.animate) {
        stand.querySelectorAll('tr[data-id]').forEach(tr => {
          const b = before[tr.dataset.id];
          if (b === undefined) return;
          const d = b - tr.getBoundingClientRect().top;
          if (Math.abs(d) > 1) tr.animate([{ transform: `translateY(${d}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.77, 0, 0.175, 1)' });
        });
      }
    }
  }
  setHTML(document.getElementById('champ'), !cfg.finale && allDone && n > 0 && !tieOpen
    ? `<div class="panel winner">${trophy}<span>${esc(nm(rows[0].n))} vinder!</span></div>` : '');

  // Round status lights
  const nextIdx = S.rounds.findIndex(r => !roundDone(r));
  S.rounds.forEach((r, i) => {
    const el = document.getElementById('lt-' + i);
    if (!el) return;
    const d = roundDone(r);
    el.className = 'lights ' + (d ? 's-done' : (i === nextIdx ? 's-next' : 's-open'));
    el.querySelector('b').textContent = d ? 'Færdigt' : (i === nextIdx ? 'Næste' : 'Venter');
    document.getElementById('rc-' + i).classList.toggle('is-next', i === nextIdx);
  });

  // Final
  const sec = document.getElementById('finsec');
  sec.hidden = !cfg.finale;
  if (!cfg.finale) { finalKey = ''; return; }
  const fin = document.getElementById('final');
  const finalists = rows.slice(0, cut).map(r => r.n);
  if (!started || n < 2) {
    finalKey = '';
    document.getElementById('finhint').textContent = `De ${cfg.finN} bedste kører ${cfg.finGP > 1 ? cfg.finGP + ' Grand Prix' : 'et sidste Grand Prix'} til sidst.`;
    fin.innerHTML = '<div class="panel empty">Finalisterne dukker op, når det første Grand Prix er indtastet.</div>';
    return;
  }
  document.getElementById('finhint').textContent =
    (!allDone ? `Foreløbige finalister, indtil alle ${total} Grand Prix er kørt. ` : '') +
    'Skriv finalisternes point ind. Højeste samlede point vinder.';
  if (finalKey !== finalists.join(',') + '|' + cfg.finGP) buildFinal(finalists);

  const tot = {};
  finalists.forEach(id => { tot[id] = 0; });
  let fdone = 0;
  S.fin.forEach(f => {
    if (!finalists.every(id => has(f[id]))) return;
    fdone++;
    finalists.forEach(id => { tot[id] += f[id]; });
  });
  const ft = document.getElementById('fintable');
  if (ft) {
    const order = [...finalists].sort((a, b) => tot[b] - tot[a]);
    ft.innerHTML = `<tr><th class="l">Finalist</th><th>Finaler</th><th>Point</th></tr>` +
      order.map(id => `<tr><td class="l"><span class="pl">${kart(id)}${esc(nm(id))}</span></td><td>${fdone}/${cfg.finGP}</td><td class="pts">${tot[id]}</td></tr>`).join('');
  }
  const w = document.getElementById('winner');
  if (fdone === cfg.finGP) {
    const max = Math.max(...finalists.map(id => tot[id]));
    const top = finalists.filter(id => tot[id] === max);
    setHTML(w, top.length > 1
      ? `<div class="panel banner" style="margin-top:16px">Uafgjort mellem ${top.map(id => esc(nm(id))).join(' og ')}. Kør en ekstra bane.</div>`
      : `<div class="panel winner" style="margin-top:16px">${trophy}<span>${esc(nm(top[0]))} vinder!</span></div>`);
  } else {
    setHTML(w, '');
  }
}

/* ---------- Actions ---------- */
function afterStructure() {
  assignCups(false);
  buildCupList();
  renderPanels();
  save();
  finalKey = '';
  buildPlayers();
  buildSettings();
  buildRounds();
  update();
}
function nextColor() {
  const act = S.players.filter(p => p.active);
  if (act.length >= MAX_P) return null;
  const usedAll = new Set(S.players.map(p => p.color));
  const usedAct = new Set(act.map(p => p.color));
  return PALETTE.find(c => !usedAll.has(c.id)) || PALETTE.find(c => !usedAct.has(c.id));
}
function addPlayer(name) {
  const c = nextColor();
  if (!c) return;
  S.seq++;
  const id = 'p' + S.seq;
  const ch = pendingCh != null ? pendingCh : pickChar();
  pendingCh = null;
  S.players.push({ id, color: c.id, name: (name || '').trim(), active: true, ch });
  replan(((name || '').trim() || c.label) + (view === 'play' ? ' er kommet med.' : ' er tilføjet.'));
  addOpen = false;
  afterStructure();
  if (view === 'setup') {
    const inp = document.getElementById('name-' + id);
    if (inp) inp.focus();
  }
}
function removePlayer(id) {
  const label = nm(id);
  P(id).active = false;
  haptic(20);
  replan(label + (view === 'play' ? ' er fratrådt.' : ' er fjernet.'));
  wdOpen = false;
  afterStructure();
}
function kartColor(c) {
  return `<svg width="38" height="26" viewBox="0 0 40 28" aria-hidden="true"><rect x="3" y="10" width="32" height="10" rx="5" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/><rect x="24" y="6" width="10" height="7" rx="3" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/><circle cx="19" cy="7" r="5" fill="${c}" stroke="#1a1a2e" stroke-width="2.5"/><circle cx="9" cy="22" r="4.5" fill="#1a1a2e"/><circle cx="9" cy="22" r="1.6" fill="#c9d1dc"/><circle cx="29" cy="22" r="4.5" fill="#1a1a2e"/><circle cx="29" cy="22" r="1.6" fill="#c9d1dc"/></svg>`;
}
// Sheets rise from the bottom and leave the same way they came
function sheetOut(el) {
  const sh = el.querySelector('.sheet'), sc = el.querySelector('.scrim');
  if (!sh || reduceMotion() || !sh.animate) { el.innerHTML = ''; return; }
  const token = el._token = (el._token || 0) + 1;
  sh.animate([{ transform: getComputedStyle(sh).transform === 'none' ? 'none' : getComputedStyle(sh).transform }, { transform: 'translateY(100%)' }], { duration: 240, easing: 'cubic-bezier(0.32, 0.72, 0, 1)', fill: 'forwards' });
  if (sc) sc.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 240, easing: 'ease', fill: 'forwards' });
  setTimeout(() => { if (el._token === token) el.innerHTML = ''; }, 240);
}
function renderPanels() {
  const ba = document.getElementById('btn-add'), bw = document.getElementById('btn-wd');
  ba.setAttribute('aria-expanded', addOpen); bw.setAttribute('aria-expanded', wdOpen);
  const ap = document.getElementById('addpanel');
  if (addOpen) {
    ap._token = (ap._token || 0) + 1;
    const c = nextColor();
    ap.innerHTML = `<button type="button" class="scrim" data-act="closepanels" aria-label="Luk"></button>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="addh"><div class="grabber" aria-hidden="true"></div>
      <header><h3 id="addh">Ny spiller</h3></header>` + (c ? `
      <label class="addrow" for="newname">${avatar(pendingCh != null ? pendingCh : (pendingCh = pickChar()), c.color)}<span class="clabel">${c.label}</span>
      <input class="nameinp" id="newname" data-nav="mka" type="text" maxlength="16" autocomplete="off" enterkeyhint="done" placeholder="Navn"></label>
      ${help('Den nye spiller kommer med i de Grand Prix, der ikke er kørt. Kørte Grand Prix bliver ikke ændret, og der kommer ekstra Grand Prix til, hvis det er nødvendigt, så alle kører lige mange.')}
      <div class="btnrow"><button type="button" class="setbtn" data-act="closepanels">Annuller</button><button type="button" class="setbtn go" data-act="addconfirm">Tilføj</button></div>`
      : `${help(`Der kan højst være ${MAX_P} spillere.`)}<div class="btnrow"><button type="button" class="setbtn" data-act="closepanels">Luk</button></div>`) + '</div>';
  } else { pendingCh = null; if (ap.querySelector('.sheet')) sheetOut(ap); }
  const wp = document.getElementById('wdpanel');
  if (wdOpen) {
    wp._token = (wp._token || 0) + 1;
    const act = active();
    wp.innerHTML = `<button type="button" class="scrim" data-act="closepanels" aria-label="Luk"></button>
      <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="wdh"><div class="grabber" aria-hidden="true"></div>
      <header><h3 id="wdh">Hvem er fratrådt?</h3></header>
      <div>${act.map(id => `<div class="prow"><span class="pname">${kart(id)}${esc(nm(id))}</span>
        <button type="button" class="rm" id="wd-${id}" data-act="rm" data-n="${id}" data-label="Fratrådt" data-confirm="Tryk igen">Fratrådt</button></div>`).join('')}</div>
      ${help('En spiller, der er fratrådt, forsvinder fra stillingen. Kørte Grand Prix bliver ikke ændret. Resten af planen bliver lavet om, så det stadig er retfærdigt.')}
      <div class="btnrow"><button type="button" class="setbtn" data-act="closepanels">Annuller</button></div></div>`;
  } else if (wp.querySelector('.sheet')) sheetOut(wp);
  document.documentElement.style.overflow = addOpen || wdOpen ? 'hidden' : '';
}
// A short tick on meaningful moments, where the device supports it
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

