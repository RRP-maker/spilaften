/* ======================= Beer pong ======================= */
const BP_FORMATS = [
  { id: 'ko', name: 'Knockout', desc: 'Taber man, er man ude. Hurtigst, og hver kamp tæller.', min: 2 },
  { id: 'de', name: 'Dobbelt knockout', desc: 'Man er først ude efter to nederlag. Tabere spiller videre i taberbanen.', min: 3 },
  { id: 'rr', name: 'Liga', desc: 'Alle hold møder alle. Sejre og cup-differens afgør stillingen.', min: 2 },
  { id: 'grp', name: 'Grupper og slutspil', desc: 'Puljekampe først, så knockout for de bedste fra hver gruppe.', min: 4 },
  { id: 'kot', name: 'Bordets konge', desc: 'Vinderen bliver ved bordet. Taberen stiller sig bagerst i køen.', min: 2 }
];
const BPF = {};
BP_FORMATS.forEach(f => { BPF[f.id] = f; });
const RULES = {
  cups: { label: 'Kopper pr. hold', opts: [[6, '6 kopper'], [10, '10 kopper']] },
  rerack: { label: 'Re-racks', opts: [['0', 'Ingen'], ['1', '1 pr. kamp'], ['2', '2 pr. kamp'], ['auto', 'Ved 6, 3 og 1']] },
  bounce: { label: 'Bounce-skud', opts: [['no', 'Tæller ikke'], ['1', '1 kop'], ['2', '2 kopper']] },
  swat: { label: 'Må forsvaret slå en bounce væk?', opts: [[true, 'Ja'], [false, 'Nej']], when: c => c.bounce !== 'no' },
  ballsback: { label: 'Når begge rammer i samme tur', opts: [['no', 'Intet ekstra'], ['one', 'Én bold tilbage'], ['both', 'Begge bolde tilbage']] },
  elbow: { label: 'Kast', opts: [['off', 'Frit'], ['elbow', 'Albue bag kanten'], ['wrist', 'Håndled bag kanten']] },
  rebuttal: { label: 'Rebuttal', opts: [[true, 'Til'], [false, 'Fra']] },
  overtime: { label: 'Overtid', opts: [[true, '3 kopper'], [false, 'Fra']], when: c => c.rebuttal },
  island: { label: 'Ø-kop', opts: [[true, 'Til'], [false, 'Fra']] },
  death: { label: 'Dødskop', opts: [[true, 'Til'], [false, 'Fra']] },
  fire: { label: 'Heating up og on fire', opts: [[true, 'Til'], [false, 'Fra']] },
  finger: { label: 'Fiske eller puste bolden op', opts: [[true, 'Tilladt'], [false, 'Ikke tilladt']] }
};
const PRESETS = {
  house: { name: 'Husregler', desc: 'BPONGs festregler, som de fleste kender fra fester.',
    v: { cups: 10, rerack: '2', bounce: '2', swat: true, ballsback: 'both', elbow: 'elbow', rebuttal: true, overtime: true, island: true, death: true, fire: true, finger: false } },
  official: { name: 'Turneringsregler', desc: 'Bygger på World Series of Beer Pong: automatiske re-racks, én bold tilbage og ingen festregler.',
    v: { cups: 10, rerack: 'auto', bounce: '2', swat: true, ballsback: 'one', elbow: 'elbow', rebuttal: true, overtime: true, island: false, death: false, fire: false, finger: false } },
  quick: { name: 'Hurtige kampe', desc: 'Sidens egen kombination: 6 kopper og få regler. Godt med mange hold og lidt tid.',
    v: { cups: 6, rerack: '1', bounce: '1', swat: false, ballsback: 'both', elbow: 'elbow', rebuttal: false, overtime: false, island: false, death: false, fire: false, finger: false } }
};
const BP_DEF = Object.assign({ size: 2, format: 'ko', meets: 1, groups: 0, adv: 2, kotStreak: 0, bronze: true, finalBo: 1, gfReset: true, seed: 'random', preset: 'house' }, PRESETS.house.v);
const BP_NUM = new Set(['size', 'meets', 'groups', 'adv', 'kotStreak', 'finalBo', 'cups']);
const BP_MAX = PALETTE.length;

function bpFresh(cfg) {
  return { type: 'bp', teams: [], res: {}, order: [], groups: [], rr: [], kq: [], klog: [], seq: 0, info: '', ended: false, cfg: Object.assign({}, BP_DEF, cfg || {}) };
}
function bpValid(x) { return x && x.type === 'bp' && Array.isArray(x.teams) && x.res && x.cfg; }
function bpNormalize(g) {
  g.cfg = Object.assign({}, BP_DEF, g.cfg);
  ['order', 'groups', 'rr', 'kq', 'klog'].forEach(k => { if (!Array.isArray(g[k])) g[k] = []; });
  return g;
}
let B = bpFresh();
let bpPanel = null;
const bpEdit = new Set();
function withB(g, fn) { const o = B; B = g; try { return fn(); } finally { B = o; } }

/* ---------- Teams ---------- */
function T(id) { return B.teams.find(t => t.id === id); }
function bActive() { return B.teams.filter(t => !t.out).map(t => t.id); }
function tName(id) {
  if (id === 'BYE') return 'Fri';
  const t = T(id);
  if (!t) return '?';
  const n = (t.name || '').trim();
  if (n) return n;
  const ps = t.p.slice(0, B.cfg.size).map(x => (x || '').trim()).filter(Boolean);
  return ps.length ? ps.join(' & ') : 'Hold ' + PC[t.color].label.toLowerCase();
}
function tMembers(id) {
  const t = T(id);
  if (!t || !(t.name || '').trim()) return '';
  return t.p.slice(0, B.cfg.size).map(x => (x || '').trim()).filter(Boolean).join(' & ');
}
function cupIcon(id, size) {
  const t = T(id);
  const c = t ? PC[t.color].color : '#8e8e93';
  const s = size || 22;
  return `<svg class="cupi" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 5h15l-2 15.2a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z" fill="${c}"/><path d="M4 4.5h16" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 5h15l-2 15.2a2 2 0 0 1-2 1.8h-7a2 2 0 0 1-2-1.8z" fill="none" stroke="rgba(0,0,0,.18)" stroke-width="1"/></svg>`;
}
const bpEmblemSvg = `<svg class="bpemblem" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#0a7cff"/><g fill="#ff3b30" stroke="#fff" stroke-width="2.2">${[[14, 16], [25, 16], [36, 16], [47, 16], [19.5, 26.5], [30.5, 26.5], [41.5, 26.5], [25, 37], [36, 37], [30.5, 47.5]].map(([x, y]) => `<circle cx="${x + 1.5}" cy="${y}" r="5.4"/>`).join('')}</g><circle cx="50" cy="48" r="5" fill="#fff"/><circle cx="48.4" cy="46.4" r="1.4" fill="#fff" opacity=".6"/></svg>`;

/* ---------- Structure ---------- */
function rrBuild(ids, meets, prefix) {
  const list = [...ids];
  if (list.length % 2) list.push('BYE');
  const n = list.length, out = [];
  if (n < 2) return out;
  let rnd = 0;
  for (let leg = 0; leg < meets; leg++) {
    let arr = [...list];
    for (let r = 0; r < n - 1; r++) {
      rnd++;
      for (let i = 0; i < n / 2; i++) {
        let a = arr[i], b = arr[n - 1 - i];
        if (leg % 2) [a, b] = [b, a];
        if (a !== 'BYE' && b !== 'BYE') out.push({ id: `${prefix}${rnd}-${i}`, a: { t: a }, b: { t: b }, round: rnd, sec: `Runde ${rnd}` });
      }
      arr = [arr[0], arr[n - 1], ...arr.slice(1, n - 1)];
    }
  }
  return out;
}
function seedOrder(P) {
  let s = [1, 2];
  while (s.length < P) { const m = s.length * 2; s = s.flatMap(x => [x, m + 1 - x]); }
  return s;
}
function koName(fromEnd, r) {
  return ['Finale', 'Semifinale', 'Kvartfinale', 'Ottendedelsfinale'][fromEnd] || `Runde ${r}`;
}
// Builds a single or double elimination bracket; byes go to the top seeds
function elimBuild(seeds, o) {
  const n = seeds.length;
  if (n < 2) return [];
  let P = 2;
  while (P < n) P *= 2;
  const so = seedOrder(P);
  const slot = so.map(k => k <= n ? seeds[k - 1] : 'BYE');
  const k = Math.log2(P), p = o.prefix, M = [], WB = {};
  const dbl = o.double && P >= 4;
  let prev = [];
  for (let r = 1; r <= k; r++) {
    const cur = [];
    for (let i = 0; i < P / 2 ** r; i++) {
      const id = `${p}w${r}-${i}`;
      M.push({
        id, a: r === 1 ? { t: slot[2 * i] } : { w: prev[2 * i] }, b: r === 1 ? { t: slot[2 * i + 1] } : { w: prev[2 * i + 1] },
        stage: dbl ? 3 * r - 2 : r, bk: 'w', r,
        sec: dbl ? (r === k ? 'Vinderbanens finale' : `Vinderbanen · runde ${r}`) : koName(k - r, r),
        bo: !dbl && r === k ? o.finalBo : 1, isFinal: !dbl && r === k
      });
      cur.push(id);
    }
    WB[r] = cur;
    prev = cur;
  }
  if (dbl) {
    const lbm = [];
    let lb = [], lr = 1;
    const w1 = WB[1];
    for (let i = 0; i < w1.length / 2; i++) {
      const id = `${p}l1-${i}`;
      lbm.push({ id, a: { l: w1[2 * i] }, b: { l: w1[2 * i + 1] }, stage: 2, bk: 'l', lr: 1 });
      lb.push(id);
    }
    for (let r = 2; r <= k; r++) {
      lr++;
      const wl = WB[r], nl = [];
      for (let i = 0; i < lb.length; i++) {
        const id = `${p}l${lr}-${i}`;
        lbm.push({ id, a: { w: lb[i] }, b: { l: wl[wl.length - 1 - i] }, stage: 3 * r - 1, bk: 'l', lr });
        nl.push(id);
      }
      lb = nl;
      if (r < k) {
        lr++;
        const nl2 = [];
        for (let i = 0; i < lb.length / 2; i++) {
          const id = `${p}l${lr}-${i}`;
          lbm.push({ id, a: { w: lb[2 * i] }, b: { w: lb[2 * i + 1] }, stage: 3 * r, bk: 'l', lr });
          nl2.push(id);
        }
        lb = nl2;
      }
    }
    lbm.forEach(m => { m.sec = m.lr === lr ? 'Taberbanens finale' : `Taberbanen · runde ${m.lr}`; });
    M.push(...lbm);
    M.push({ id: `${p}gf`, a: { w: WB[k][0] }, b: { w: lb[0] }, stage: 3 * k + 1, bk: 'gf', sec: 'Finale', bo: o.finalBo, isFinal: true });
    if (o.gfReset) M.push({ id: `${p}gf2`, reset: `${p}gf`, stage: 3 * k + 2, bk: 'gf2', sec: 'Afgørende finale', bo: o.finalBo, isFinal: true });
  } else if (o.bronze && k >= 2) {
    M.push({ id: `${p}br`, a: { l: WB[k - 1][0] }, b: { l: WB[k - 1][1] }, stage: k - 0.5, bk: 'br', sec: 'Bronzekamp' });
  }
  M.sort((x, y) => x.stage - y.stage);
  return M;
}
function need(bo) { return Math.floor((bo || 1) / 2) + 1; }
function gameLeft(g) { return g.ot ? 1 : (g.left || 0); }
function bResolve(M) {
  const O = {};
  const val = s => {
    if (!s) return null;
    if (s.t) return s.t;
    const o = O[s.w || s.l];
    if (!o || !o.win) return null;
    return s.w ? o.win : o.lose;
  };
  for (const m of M) {
    let a, b;
    if (m.reset) {
      const g = O[m.reset];
      if (!g || !g.win) { O[m.id] = { m, A: null, B: null, state: 'wait' }; continue; }
      if (g.win === g.A) { O[m.id] = { m, A: g.A, B: g.B, win: g.win, lose: g.lose, state: 'skip' }; continue; }
      a = g.A; b = g.B;
    } else { a = val(m.a); b = val(m.b); }
    const o = { m, A: a, B: b };
    O[m.id] = o;
    if (a == null || b == null) { o.state = 'wait'; continue; }
    if (a === 'BYE' || b === 'BYE') {
      o.state = 'bye';
      o.win = a === 'BYE' ? b : a;
      o.lose = a === 'BYE' ? a : b;
      continue;
    }
    if (B.res[m.id] && (B.res[m.id].a !== a || B.res[m.id].b !== b)) delete B.res[m.id];
    const r = B.res[m.id];
    if (r) {
      o.games = r.games;
      let wa = 0, wb = 0;
      r.games.forEach(g => { if (g.w === 'a') wa++; else if (g.w === 'b') wb++; });
      o.wa = wa; o.wb = wb;
      const nd = need(m.bo);
      if (wa >= nd || wb >= nd) {
        o.state = 'done';
        o.incomplete = r.games.some(g => !g.ot && !g.left);
        o.win = wa >= nd ? a : b;
        o.lose = o.win === a ? b : a;
        continue;
      }
    }
    const outA = T(a) && T(a).out, outB = T(b) && T(b).out;
    if (outA || outB) {
      o.state = 'wo';
      o.win = outA && !outB ? b : a;
      o.lose = o.win === a ? b : a;
      continue;
    }
    o.state = r && r.games.length ? 'live' : 'ready';
  }
  return O;
}
function decided(o) { return o && (o.state === 'done' || o.state === 'wo'); }

function bStand(ids, O, ms) {
  const R = {};
  ids.forEach(id => { R[id] = { id, P: 0, W: 0, L: 0, diff: 0, beat: {}, h: 0 }; });
  ms.forEach(m => {
    const o = O[m.id];
    if (!decided(o) || !R[o.win] || !R[o.lose]) return;
    R[o.win].P++; R[o.lose].P++;
    R[o.win].W++; R[o.lose].L++;
    R[o.win].beat[o.lose] = 1;
    if (o.state === 'done') {
      o.games.forEach(g => {
        const w = g.w === 'a' ? o.A : o.B, l = w === o.A ? o.B : o.A;
        R[w].diff += gameLeft(g); R[l].diff -= gameLeft(g);
      });
    }
  });
  const arr = Object.values(R).sort((x, y) => y.W - x.W || y.diff - x.diff);
  const out = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j].W === arr[i].W && arr[j].diff === arr[i].diff) j++;
    const g = arr.slice(i, j);
    if (g.length > 1) {
      g.forEach(a => { a.h = g.filter(b => b !== a && a.beat[b.id]).length; });
      g.sort((x, y) => y.h - x.h);
    }
    out.push(...g);
    i = j;
  }
  return out;
}

// Puts teams in play: draw order, groups and league schedule
function bpSeed() {
  const ids = bActive();
  B.order = B.cfg.seed === 'random' ? shuffle([...ids]) : [...ids];
  B.groups = [];
  if (B.cfg.format === 'grp') {
    const n = B.order.length;
    let G = B.cfg.groups || Math.max(1, Math.round(n / 4));
    while (G > 1 && n / G < 3) G--;
    B.groups = Array.from({ length: G }, () => []);
    B.order.forEach((id, i) => {
      const r = Math.floor(i / G), c = i % G;
      B.groups[r % 2 ? G - 1 - c : c].push(id);
    });
  }
  B.rr = B.cfg.format === 'rr' ? rrBuild(B.order, B.cfg.meets, 'r') : [];
  B.kq = [...B.order];
  B.res = {};
  B.klog = [];
  B.ended = false;
}
function bpHasResults() { return B.klog.length > 0 || Object.values(B.res).some(r => r.games && r.games.length); }

function grpLetter(i) { return String.fromCharCode(65 + i); }
// Everything the play view needs: matches in order, outcomes, sections, standings and the final result
function bStructure() {
  const c = B.cfg, f = c.format;
  let M = [], sections = [], tables = [], places = null, done = false;
  if (f === 'ko' || f === 'de') {
    M = elimBuild(B.order, { prefix: 'e', double: f === 'de', bronze: c.bronze, finalBo: c.finalBo, gfReset: c.gfReset });
  } else if (f === 'rr') {
    M = B.rr.map(m => Object.assign({}, m, { bo: 1 }));
  } else if (f === 'grp') {
    B.groups.forEach((g, gi) => {
      rrBuild(g, 1, `g${gi}-`).forEach(m => { m.sec = `Gruppe ${grpLetter(gi)} · ${m.sec.toLowerCase()}`; m.grp = gi; M.push(m); });
    });
  } else if (f === 'kot') {
    const q = B.kq.filter(id => T(id) && !T(id).out);
    let streak = 0;
    for (let i = B.klog.length - 1; i >= 0 && B.klog[i].win === (B.klog[B.klog.length - 1] || {}).win; i--) streak++;
    const hitNow = c.kotStreak && streak >= c.kotStreak;
    if (!B.ended && !hitNow && q.length >= 2) M = [{ id: 'kcur', a: { t: q[0] }, b: { t: q[1] }, sec: 'Ved bordet', bo: 1 }];
  }
  let O = bResolve(M);
  if (f === 'grp') {
    const groupDone = M.every(m => decided(O[m.id]));
    const st = B.groups.map((g, gi) => bStand(g, O, M.filter(m => m.grp === gi)));
    st.forEach((rows, gi) => tables.push({ title: `Gruppe ${grpLetter(gi)}`, rows, adv: Math.min(c.adv, rows.length) }));
    if (groupDone && M.length) {
      const adv = Math.min(c.adv, ...st.map(s => s.length));
      const seeds = [];
      for (let p = 0; p < adv; p++) st.forEach(s => { if (s[p]) seeds.push(s[p].id); });
      const KO = elimBuild(seeds, { prefix: 'k', double: false, bronze: c.bronze, finalBo: c.finalBo });
      // Teams from the same group should not meet in the first round
      const first = KO.filter(m => m.r === 1 && m.a.t && m.b.t);
      const grpOf = id => B.groups.findIndex(g => g.includes(id));
      first.forEach((m, i) => {
        if (m.b.t === 'BYE' || grpOf(m.a.t) !== grpOf(m.b.t)) return;
        const other = first.find((x, j) => j !== i && x.b.t !== 'BYE' && grpOf(x.b.t) !== grpOf(m.a.t) && grpOf(m.b.t) !== grpOf(x.a.t));
        if (other) [m.b, other.b] = [other.b, m.b];
      });
      KO.forEach(m => { m.sec = 'Slutspil · ' + m.sec.toLowerCase(); });
      M = M.concat(KO);
      O = bResolve(M);
    }
  }
  if (f === 'rr') {
    const rows = bStand(bActive().concat(B.teams.filter(t => t.out).map(t => t.id)), O, M);
    tables.push({ title: '', rows, adv: 0 });
    done = M.length > 0 && M.every(m => decided(O[m.id]));
    if (done) places = rows.filter(r => !T(r.id).out).slice(0, 3).map(r => r.id);
  }
  if (f === 'kot') {
    const R = {};
    B.teams.forEach(t => { R[t.id] = { id: t.id, P: 0, W: 0, L: 0, diff: 0, streak: 0, best: 0, h: 0 }; });
    B.klog.forEach(e => {
      const w = e.win, l = e.lose;
      R[w].P++; R[l].P++; R[w].W++; R[l].L++;
      R[w].streak++; R[w].best = Math.max(R[w].best, R[w].streak); R[l].streak = 0;
      e.games.forEach(g => { R[w].diff += gameLeft(g); R[l].diff -= gameLeft(g); });
    });
    const rows = Object.values(R).filter(r => !T(r.id).out || r.P).sort((x, y) => y.W - x.W || y.best - x.best || y.diff - x.diff);
    tables.push({ title: '', rows, adv: 0, kot: true });
    const hit = c.kotStreak && rows.find(r => r.streak >= c.kotStreak);
    done = !!(B.ended || hit) && B.klog.length > 0;
    if (done) places = (hit ? [hit, ...rows.filter(r => r !== hit)] : rows).slice(0, 3).map(r => r.id);
  }
  if (f === 'ko' || f === 'de' || f === 'grp') {
    const gf2 = M.find(m => m.bk === 'gf2');
    const finM = gf2 ? (O[gf2.id].state === 'skip' ? M.find(m => m.bk === 'gf') : gf2) : M.find(m => m.isFinal);
    const fo = finM ? O[finM.id] : null;
    if (fo && (decided(fo) || fo.state === 'bye' || fo.state === 'skip')) {
      done = true;
      places = [fo.win, fo.lose];
      if (f === 'de') {
        const lbs = M.filter(m => m.bk === 'l');
        const lbf = lbs[lbs.length - 1];
        if (lbf && O[lbf.id].lose && O[lbf.id].lose !== 'BYE') places.push(O[lbf.id].lose);
      } else {
        const br = M.find(m => m.bk === 'br');
        if (br && decided(O[br.id])) places.push(O[br.id].win);
      }
      places = places.filter(id => id && id !== 'BYE');
    }
  }
  // Sections in display order, without matches decided by a bye
  const secMap = new Map();
  M.forEach(m => {
    const o = O[m.id];
    if (o.state === 'bye' || o.state === 'skip') return;
    if (!secMap.has(m.sec)) secMap.set(m.sec, []);
    secMap.get(m.sec).push(m.id);
  });
  sections = [...secMap.entries()].map(([title, ids]) => ({ title, ids }));
  const num = {};
  let k = 0;
  sections.forEach(s => s.ids.forEach(id => { num[id] = ++k; }));
  const visible = sections.flatMap(s => s.ids);
  const played = visible.filter(id => decided(O[id])).length + (f === 'kot' ? B.klog.length : 0);
  const next = visible.find(id => O[id].incomplete) || visible.find(id => O[id].state === 'ready' || O[id].state === 'live');
  return { M, O, sections, tables, places, done, num, total: visible.length + (f === 'kot' ? B.klog.length : 0), played, next };
}
function bpStatus(g) {
  return withB(g, () => {
    const s = bStructure();
    if (s.done && s.places && s.places[0]) return { done: true, text: `Færdigt · ${tName(s.places[0])} vandt` };
    if (B.cfg.format === 'kot') return { done: false, text: `${plural(B.klog.length, 'kamp', 'kampe')} spillet` };
    return { done: false, text: `${s.played} af ${plural(s.total, 'kamp', 'kampe')} spillet` };
  });
}

/* ---------- Rules text ---------- */
function ruleLines(c) {
  const L = [];
  L.push(['Opstilling', c.cups === 10 ? '10 kopper i trekant (4-3-2-1) i hver ende af bordet.' : '6 kopper i trekant (3-2-1) i hver ende af bordet.']);
  L.push(['Hvem starter', 'Første kamp: "Eyes". Én fra hvert hold kaster samtidig med øjenkontakt, og holdet, der rammer alene, starter. Derefter starter vinderen af forrige kamp.']);
  L.push(['Turen', 'Hvert hold kaster to bolde pr. tur, én pr. spiller. En ramt kop fjernes.']);
  L.push(['Re-racks', { '0': 'Ingen re-racks. Den sidste kop må dog trækkes tilbage til midten.', '1': 'Hvert hold kan bede om ét re-rack pr. kamp, i starten af sin tur.', '2': 'Hvert hold kan bede om 2 re-racks pr. kamp, i starten af sin tur, når der er 6, 4, 3 eller 2 kopper tilbage. Den sidste kop må altid trækkes tilbage til midten.', auto: 'Kopperne stilles automatisk op igen, når der er 6, 3 og 1 kop tilbage, centreret ved bagkanten.' }[c.rerack]]);
  L.push(['Bounce', { no: 'En bold, der hopper på bordet, tæller ikke.', '1': 'En bold, der hopper på bordet og lander i en kop, tæller som én kop.', '2': 'En bold, der hopper på bordet og lander i en kop, tæller 2 kopper. Forsvaret vælger den anden. Med 2 kopper tilbage tæller den kun 1.' }[c.bounce] + (c.bounce !== 'no' && c.swat ? ' Forsvaret må slå bolden væk, når den har ramt bordet.' : '')]);
  L.push(['Begge rammer', { no: 'Ingen bonus, når begge rammer i samme tur.', one: 'Rammer begge i samme tur, får holdet én bold tilbage. Højst 2 gange i træk.', both: 'Rammer begge i samme tur, får holdet begge bolde tilbage. Man må ikke re-racke på de bolde.' }[c.ballsback]]);
  if (c.elbow !== 'off') L.push([c.elbow === 'elbow' ? 'Albue-reglen' : 'Håndleds-reglen', `${c.elbow === 'elbow' ? 'Albuen' : 'Håndleddet'} skal være bag bordkanten, når man kaster. Ellers tæller skuddet ikke, men man må kaste om.`]);
  if (c.island) L.push(['Ø-kop', 'Én gang pr. spiller pr. kamp må man melde en kop, der ikke rører andre kopper. Rammer man den, fjernes den plus én kop efter forsvarets valg. Rammer man en anden kop, tæller den ikke.']);
  if (c.fire) L.push(['Heating up og on fire', 'Har man ramt to i træk, kan man sige "heating up". Rammer man den næste og siger "on fire", kaster man, til man misser.']);
  if (c.death) L.push(['Dødskop', 'Løfter man en ramt kop, før den er tømt, og modstanderen rammer den, har modstanderen vundet. Lander begge bolde i en kop, der står på bordet, tæller den 3 kopper.']);
  L.push(['Bolden i koppen', c.finger ? 'Man må fiske eller puste en bold op af koppen, mens den stadig snurrer.' : 'En bold i en kop må ikke røres. En bold, der ligger oven på kopperne, er en forbier.']);
  if (c.rebuttal) L.push(['Rebuttal', 'Når den sidste kop rammes, får taberholdet en sidste chance. Spillerne kaster på skift, til de misser.' + (c.overtime ? ' Rydder de alle deres kopper, går kampen i overtid.' : ' Rydder de alle kopper, vinder ingen, og den sidste kop afgør.')]);
  if (c.rebuttal && c.overtime) L.push(['Overtid', '3 kopper i trekant til hvert hold uden re-racks. Holdet, der ville have vundet, starter. Den sidste kop må trækkes til midten.']);
  return L;
}

/* ---------- Settings for beer pong ---------- */
function bseg(key, opts, label, dis) {
  return `<div class="field"><div class="flabel">${label}</div><div class="seg" role="group" aria-label="${esc(label)}">${opts.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" data-act="bset" data-k="${key}" data-v="${v}" aria-pressed="${String(B.cfg[key]) === String(v)}"${dis ? ' disabled' : ''}>${l}</button>`;
  }).join('')}</div></div>`;
}
const BCATS = [
  {
    id: 'bnames', title: 'Holdnavne', only: 'play',
    sum: () => plural(bActive().length, 'hold', 'hold'),
    body: () => `<div class="namelist">${B.teams.filter(t => !t.out).map(t => `<div class="bteamedit">${cupIcon(t.id)}
      <input class="nameinp" data-nav="bpn" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="${esc('Holdnavn')}" data-kind="bt" data-n="${t.id}" value="${esc(t.name || '')}" aria-label="Holdnavn">
      ${t.p.slice(0, B.cfg.size).map((x, i) => `<input class="nameinp" data-nav="bpn" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${i + 1}" data-kind="bm" data-n="${t.id}" data-i="${i}" value="${esc(x || '')}" aria-label="Spiller ${i + 1}">`).join('')}</div>`).join('')}</div>`
  },
  {
    id: 'bformat', title: 'Turneringsform',
    sum: c => BPF[c.format].name,
    body: c => {
      const locked = view === 'bpplay' && bpHasResults();
      return `<div class="modes" role="group" aria-label="Turneringsform">${BP_FORMATS.map(m =>
        `<button type="button" class="mode" data-act="bset" data-k="format" data-v="${m.id}" aria-pressed="${c.format === m.id}"${locked ? ' disabled' : ''}><b>${m.name}</b><span>${m.desc}</span></button>`).join('')}</div>` +
        (c.format === 'rr' ? bseg('meets', [[1, 'Én gang'], [2, 'To gange']], 'Hvor mange gange møder holdene hinanden?', locked) : '') +
        (c.format === 'grp' ? bseg('groups', [[0, 'Automatisk'], [2, '2'], [3, '3'], [4, '4']], 'Antal grupper', locked) + bseg('adv', [[1, 'Nummer 1'], [2, 'Nummer 1 og 2']], 'Hvem går videre fra hver gruppe?', locked) : '') +
        (c.format === 'kot' ? bseg('kotStreak', [[0, 'Når I stopper'], [3, '3 sejre i træk'], [5, '5 sejre i træk']], 'Hvornår er der en vinder?') : '') +
        (c.format === 'de' ? help('Taber man i vinderbanen, fortsætter man i taberbanen. Vinderen af taberbanen møder vinderen af vinderbanen i finalen.') : '') +
        (locked ? help('Formen kan ikke ændres, når der er spillet kampe. Start et nyt spil for at skifte.') : help('Ved lige mange sejre tæller cup-differens. Vinderen af en kamp får plus så mange kopper, som vinderen havde tilbage, og taberen får det samme i minus. En sejr i overtid tæller ±1. Derefter tæller indbyrdes kamp.'));
    }
  },
  {
    id: 'brules', title: 'Regler',
    sum: c => c.preset === 'custom' ? 'Egne regler' : PRESETS[c.preset].name,
    body: c => `<div class="modes" role="group" aria-label="Regelsæt">${Object.entries(PRESETS).map(([id, p]) =>
      `<button type="button" class="mode" data-act="bpreset" data-v="${id}" aria-pressed="${c.preset === id}"><b>${p.name}</b><span>${p.desc}</span></button>`).join('')}
      <button type="button" class="mode" data-act="bpreset" data-v="custom" aria-pressed="${c.preset === 'custom'}"><b>Egne regler</b><span>Vælges automatisk, når du ændrer en regel herunder.</span></button></div>` +
      Object.entries(RULES).filter(([, r]) => !r.when || r.when(c)).map(([k, r]) => bseg(k, r.opts, r.label)).join('') +
      help('Aftal reglerne, før første bold bliver kastet. De fleste diskussioner ved bordet handler om regler, der ikke blev aftalt.')
  },
  {
    id: 'bteams', title: 'Hold og lodtrækning', only: 'setup',
    sum: c => (c.size === 1 ? '1 mod 1' : '2 mod 2') + ' · ' + (c.seed === 'random' ? 'tilfældig' : 'som listen'),
    body: c => bseg('size', [[1, '1 mod 1'], [2, '2 mod 2']], 'Spillere pr. hold') +
      bseg('seed', [['random', 'Tilfældig'], ['list', 'Som listen']], 'Lodtrækning') +
      help('Med "Som listen" er det øverste hold seedet som nummer 1 og får en fri runde først, hvis antallet ikke går op.')
  },
  {
    id: 'bfinal', title: 'Finale og placeringer',
    sum: c => (c.finalBo === 3 ? 'Bedst af 3' : 'Én kamp') + (c.format === 'de' ? '' : c.bronze ? ' · bronzekamp' : ''),
    body: c => bseg('finalBo', [[1, 'Én kamp'], [3, 'Bedst af 3']], 'Finalen') +
      (c.format === 'de' ? bseg('gfReset', [[true, 'Ja'], [false, 'Nej']], 'Ekstra finale, hvis vinderen af taberbanen vinder den første?') +
        help('Med ekstra finale skal begge hold have tabt to gange, før det er afgjort.')
        : c.format === 'ko' || c.format === 'grp' ? bseg('bronze', [[true, 'Ja'], [false, 'Nej']], 'Kamp om 3.-pladsen') : help('I denne form er der ingen finale. Stillingen afgør.'))
  },
  {
    id: 'breset', title: 'Nulstil', only: 'play',
    sum: () => '',
    body: () => `<div class="btnrow">${confirmBtn('bresetres', 'bresetres', 'Nulstil resultater')}${confirmBtn('bdelgame', 'bdelgame', 'Slet spillet', 'danger')}</div>` +
      help('Nulstil resultater beholder holdene og laver en ny lodtrækning.')
  }
];
function bBuildSettings() {
  const ctx = view === 'bpplay' ? 'play' : 'setup';
  document.getElementById('bpsettings').innerHTML = BCATS.filter(c => !c.only || c.only === ctx).map(cat =>
    `<details class="panel cat" data-cat="${cat.id}"${openCats.has(cat.id) ? ' open' : ''}>
      <summary><span class="ct">${cat.title}</span><span class="cs">${esc(cat.sum(B.cfg))}</span>
      <svg class="chev" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <div class="cb">${cat.body(B.cfg)}</div>
    </details>`).join('');
}

/* ---------- Setup view ---------- */
function bBuildTeams() {
  const act = B.teams;
  document.getElementById('bpteams').innerHTML = act.length ? act.map((t, i) => `<div class="bteam">
      <div class="bteam-top">${cupIcon(t.id, 26)}<input class="nameinp" id="bt-${t.id}" data-nav="bps" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="Holdnavn (valgfrit)" data-kind="bt" data-n="${t.id}" value="${esc(t.name || '')}" aria-label="Navn på hold ${i + 1}">
      <button type="button" class="rm" id="brm-${t.id}" data-act="brm" data-n="${t.id}" data-label="Fjern" data-confirm="Sikker?" aria-label="Fjern hold ${i + 1}">Fjern</button></div>
      <div class="bteam-ps">${t.p.slice(0, B.cfg.size).map((x, j) => `<input class="nameinp" id="bm-${t.id}-${j}" data-nav="bps" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${j + 1}" data-kind="bm" data-n="${t.id}" data-i="${j}" value="${esc(x || '')}">`).join('')}</div>
    </div>`).join('') : '<p class="emptyp">Ingen hold endnu. Tryk på Tilføj hold for at komme i gang.</p>';
  const add = document.getElementById('bpadd');
  add.disabled = act.length >= BP_MAX;
  add.textContent = act.length >= BP_MAX ? `Der kan højst være ${BP_MAX} hold` : 'Tilføj hold';
  document.getElementById('bpmix').hidden = !(B.cfg.size === 2 && act.length >= 2);
}
function bpNextColor() {
  const used = new Set(B.teams.map(t => t.color));
  return PALETTE.find(c => !used.has(c.id));
}
function bpAddTeam(name, players) {
  const c = bpNextColor();
  if (!c) return null;
  B.seq++;
  const id = 't' + B.seq;
  B.teams.push({ id, color: c.id, name: (name || '').trim(), p: players || ['', ''], out: false });
  return id;
}
function bUpdateSetupSummary() {
  const n = B.teams.length, f = BPF[B.cfg.format];
  const ok = n >= f.min;
  document.getElementById('bpstart').disabled = !ok;
  document.getElementById('bpsum').textContent = ok
    ? `${plural(n, 'hold', 'hold')} · ${f.name} · ${B.cfg.preset === 'custom' ? 'Egne regler' : PRESETS[B.cfg.preset].name}`
    : `${f.name} kræver mindst ${f.min} hold.`;
  document.getElementById('bpsub').textContent = n ? `${plural(n, 'hold', 'hold')} · ${f.name}` : 'Tilføj hold for at starte';
}

/* ---------- Play view ---------- */
function teamLine(id, extra) {
  if (id === 'BYE') return '<span class="tl muted">Fri runde</span>';
  const mem = tMembers(id);
  const out = T(id) && T(id).out;
  return `<span class="tl">${cupIcon(id)}<span class="tl-txt"><span class="tl-name">${esc(tName(id))}${out ? ' <em class="goneTag">trukket sig</em>' : ''}</span>${mem ? `<small>${esc(mem)}</small>` : ''}</span>${extra || ''}</span>`;
}
function srcText(s, S2) {
  if (!s) return '';
  if (s.t) return tName(s.t);
  const id = s.w || s.l, o = S2.O[id];
  if (o && o.state === 'bye') return tName(s.w ? o.win : o.lose);
  return `${s.w ? 'Vinder' : 'Taber'} af kamp ${S2.num[id] || '?'}`;
}
function matchCard(id, S2, opts) {
  const o = S2.O[id], m = o.m, c = B.cfg;
  const n = S2.num[id];
  const isNext = S2.next === id;
  const st = o.incomplete ? ['Mangler kopper', 's-next'] : { wait: ['Venter', 's-open'], ready: [isNext ? 'Næste' : 'Klar', isNext ? 's-next' : 's-open'], live: ['I gang', 's-next'], done: ['Færdig', 's-done'], wo: ['Walkover', 's-done'] }[o.state] || ['', ''];
  const head = `<header><h3>${m.id === 'kcur' ? 'Kampen ved bordet' : `Kamp ${n}`}${m.bo > 1 ? ` <small class="four">bedst af ${m.bo}</small>` : ''}</h3><span class="lights ${st[1]}"><i></i><i></i><i></i><b>${st[0]}</b></span></header>`;
  if (o.state === 'wait') {
    return `<article class="panel card bmatch wait">${head}<div class="mrow">${o.A ? teamLine(o.A) : `<span class="tl muted">${esc(srcText(m.a, S2))}</span>`}</div>
      <div class="vs">mod</div><div class="mrow">${o.B ? teamLine(o.B) : `<span class="tl muted">${esc(srcText(m.b || {}, S2))}</span>`}</div></article>`;
  }
  const showW = (side) => o.win && (side === 'a' ? o.win === o.A : o.win === o.B);
  const score = side => m.bo > 1 && o.games ? `<b class="mscore">${side === 'a' ? o.wa || 0 : o.wb || 0}</b>` : '';
  let body = `<div class="mrow${showW('a') ? ' won' : ''}">${teamLine(o.A, score('a'))}</div><div class="vs">mod</div><div class="mrow${showW('b') ? ' won' : ''}">${teamLine(o.B, score('b'))}</div>`;
  if (o.state === 'wo') {
    body += `<p class="help">${esc(tName(o.win))} går videre, fordi ${esc(tName(o.lose))} har trukket sig.</p>`;
    return `<article class="panel card bmatch">${head}${body}</article>`;
  }
  const editing = o.state !== 'done' || o.incomplete || bpEdit.has(id) || (opts && opts.open);
  if (o.state === 'done' && !editing) {
    const d = (o.games || []).reduce((s, g) => s + (g.w === (o.win === o.A ? 'a' : 'b') ? gameLeft(g) : -gameLeft(g)), 0);
    const ot = (o.games || []).some(g => g.ot);
    body += `<div class="mdone"><span>${esc(tName(o.win))} vandt${ot ? ' i overtid' : ''} · ${d >= 0 ? '+' : ''}${d} ${Math.abs(d) === 1 ? 'kop' : 'kopper'}</span><button type="button" class="setbtn" data-act="bedit" data-m="${id}">Ret</button></div>`;
    return `<article class="panel card bmatch done">${head}${body}</article>`;
  }
  const res = B.res[id] || { games: [] };
  const slots = Math.min(m.bo || 1, (res.games.length) + (o.state === 'done' ? 0 : 1));
  for (let g = 0; g < slots; g++) {
    const gm = res.games[g];
    body += `<div class="game">${(m.bo || 1) > 1 ? `<div class="flabel">Kamp ${g + 1}</div>` : '<div class="flabel">Hvem vandt?</div>'}
      <div class="seg wins" role="group" aria-label="Vinder">${['a', 'b'].map(s => `<button type="button" data-act="bwin" data-m="${id}" data-g="${g}" data-s="${s}" aria-pressed="${!!gm && gm.w === s}">${esc(tName(s === 'a' ? o.A : o.B))}</button>`).join('')}</div>
      ${gm ? `<div class="flabel">Kopper tilbage hos vinderen</div><div class="cups" role="group" aria-label="Kopper tilbage">${Array.from({ length: c.cups }, (_, i) => i + 1).map(v =>
        `<button type="button" data-act="bleft" data-m="${id}" data-g="${g}" data-v="${v}" aria-pressed="${!gm.ot && gm.left === v}">${v}</button>`).join('')}
        <button type="button" class="otbtn" data-act="bot" data-m="${id}" data-g="${g}" aria-pressed="${!!gm.ot}">Overtid</button></div>` : ''}
    </div>`;
  }
  if (o.state === 'done' && !o.incomplete && bpEdit.has(id)) body += `<div class="mdone"><span>${esc(tName(o.win))} vandt</span><button type="button" class="setbtn" data-act="bedit" data-m="${id}">Færdig</button></div>`;
  return `<article class="panel card bmatch${isNext ? ' is-next' : ''}">${head}${body}</article>`;
}
function standTable(tb) {
  const kot = tb.kot;
  let h = `<tr><th>#</th><th class="l">Hold</th><th>K</th><th>V</th><th>T</th>${kot ? '<th>I træk</th>' : ''}<th>Kopper</th></tr>`;
  tb.rows.forEach((r, k) => {
    const adv = tb.adv && k < tb.adv;
    h += `<tr class="${adv ? 'fin' : ''}"><td class="rank"><span class="medal ${k < 3 && r.P ? 'm' + (k + 1) : 'plain'}">${k + 1}</span></td><td class="l">${teamLine(r.id)}</td><td>${r.P}</td><td class="pts">${r.W}</td><td>${r.L}</td>${kot ? `<td>${r.best}</td>` : ''}<td>${r.diff > 0 ? '+' : ''}${r.diff}</td></tr>`;
  });
  return `${tb.title ? `<h3 class="tbtitle">${tb.title}</h3>` : ''}<div class="panel tablebox"><table>${h}</table></div>`;
}
function bRender() {
  const S2 = bStructure();
  const c = B.cfg, f = c.format;
  const nAct = bActive().length;
  document.getElementById('navtitle').textContent = view === 'bpsetup' ? 'Nyt spil' : 'Beerpong';
  document.getElementById('bptitle').textContent = view === 'bpsetup' ? 'Nyt spil: Beerpong' : 'Beerpong-turnering';
  if (view === 'bpsetup') { bUpdateSetupSummary(); return; }
  document.getElementById('bpsub').textContent = `${plural(nAct, 'hold', 'hold')} · ${BPF[f].name} · ${c.preset === 'custom' ? 'Egne regler' : PRESETS[c.preset].name}`;
  setHTML(document.getElementById('bpinfo'), B.info ? `<div class="panel note">${esc(B.info)}</div>` : '');
  // Winner
  let win = '';
  if (S2.done && S2.places && S2.places[0]) {
    win = `<div class="panel winner bpwin">${trophy}<span>${esc(tName(S2.places[0]))} vinder!</span></div>` +
      (S2.places.length > 1 ? `<div class="panel places">${S2.places.slice(1, 3).map((id, i) => `<div class="prow"><span class="medal m${i + 2}">${i + 2}</span>${teamLine(id)}</div>`).join('')}</div>` : '');
  }
  setHTML(document.getElementById('bpwinner'), win);
  // Next match up top
  const nx = S2.next;
  document.getElementById('bpnextsec').hidden = !nx || f === 'kot';
  document.getElementById('bpnext').innerHTML = nx && f !== 'kot' ? matchCard(nx, S2, { open: true }) : '';
  // Rules summary
  const rl = ruleLines(c);
  document.getElementById('bprules').innerHTML = `<details class="panel cat rulecard"${openCats.has('rulecard') ? ' open' : ''} data-cat="rulecard"><summary><span class="ct">Aftalte regler</span><span class="cs">${esc(c.preset === 'custom' ? 'Egne regler' : PRESETS[c.preset].name)}</span><svg class="chev" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
    <div class="cb"><dl class="rules-dl">${rl.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></div></details>`;
  // Standings
  const showTables = S2.tables.length && (f !== 'grp' || true);
  document.getElementById('bpstandsec').hidden = !showTables;
  document.getElementById('bpstandhint').textContent = f === 'kot'
    ? 'K er kampe, V sejre, T nederlag. "I træk" er den længste stime af sejre. Kopper er cup-differens.'
    : 'K er kampe, V sejre, T nederlag og Kopper cup-differens.' + (f === 'grp' ? ` De markerede går videre til slutspillet.` : '');
  document.getElementById('bpstand').innerHTML = S2.tables.map(standTable).join('');
  // King of the table: queue and log
  let kot = '';
  if (f === 'kot') {
    const q = B.kq.filter(id => T(id) && !T(id).out);
    kot += S2.M.length ? matchCard('kcur', S2, { open: true }) : '';
    if (q.length > 2) kot += `<div class="panel queue"><div class="flabel">I køen</div>${q.slice(2).map((id, i) => `<div class="prow"><span class="medal plain">${i + 1}</span>${teamLine(id)}</div>`).join('')}</div>`;
    if (B.klog.length) {
      kot += `<div class="panel queue"><div class="flabel">Spillede kampe</div>${B.klog.map((e, i) => `<div class="prow"><span class="klog"><b>${esc(tName(e.win))}</b> slog ${esc(tName(e.lose))}</span>${i === B.klog.length - 1 ? '<button type="button" class="setbtn" data-act="bundo">Fortryd</button>' : ''}</div>`).reverse().join('')}</div>`;
    }
    if (!S2.done) kot += `<div class="btnrow">${confirmBtn('bend', 'bend', 'Afslut turneringen')}</div>`;
  }
  // Match list
  const sit = {};
  if (f === 'rr' || f === 'grp') {
    S2.M.forEach(m => { if (m.sec) (sit[m.sec] = sit[m.sec] || new Set()).add(m.a.t).add(m.b.t); });
  }
  const sitText = title => {
    if (!sit[title]) return '';
    const pool = f === 'grp' ? (B.groups[S2.M.find(m => m.sec === title).grp] || []) : B.order;
    const out = pool.filter(id => !sit[title].has(id) && T(id) && !T(id).out);
    return out.length ? `<small class="sit">${esc(out.map(tName).join(', '))} sidder over</small>` : '';
  };
  const list = f === 'kot' ? kot : S2.sections.map(s => `<h3 class="sechead">${esc(s.title)}${sitText(s.title)}</h3><div class="rounds">${s.ids.map(id => matchCard(id, S2)).join('')}</div>`).join('');
  let extra = '';
  if (f === 'grp' && !S2.M.some(m => m.id.startsWith('k'))) extra = '<div class="panel empty">Slutspillet bliver lavet, når alle gruppekampe er spillet.</div>';
  document.getElementById('bpmatches').innerHTML = (list || '<div class="panel empty">Der er ingen kampe endnu.</div>') + extra;
  document.getElementById('bpmatchtitle').textContent = f === 'kot' ? 'Bordet' : f === 'rr' ? 'Kampprogram' : 'Kampe';
  // Header buttons
  document.getElementById('bp-add').disabled = nAct >= BP_MAX;
}
function bRenderPanel() {
  const el = document.getElementById('bppanel');
  if (!bpPanel) { if (el.querySelector('.sheet')) sheetOut(el); document.documentElement.style.overflow = addOpen || wdOpen ? 'hidden' : ''; return; }
  el._token = (el._token || 0) + 1;
  let inner = '';
  if (bpPanel === 'add') {
    const canAdd = !bpHasResults() || B.cfg.format === 'rr' || B.cfg.format === 'kot';
    const c = bpNextColor();
    inner = `<header><h3 id="bph">Nyt hold</h3></header>` + (!c ? help(`Der kan højst være ${BP_MAX} hold.`) : !canAdd
      ? help(`I ${BPF[B.cfg.format].name.toLowerCase()} kan der ikke komme nye hold ind, når der er spillet kampe. Det ville gøre lodtrækningen uretfærdig. Nulstil resultaterne for at lave en ny lodtrækning med det nye hold.`)
      : `<label class="addrow" for="bpn-name">${cupIcon(null, 26).replace('#8e8e93', c.color)}<span class="clabel">${c.label}</span><input class="nameinp" id="bpn-name" data-nav="bpa" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="Holdnavn (valgfrit)"></label>
        ${Array.from({ length: B.cfg.size }, (_, i) => `<input class="nameinp" id="bpn-p${i}" data-nav="bpa" enterkeyhint="${i === B.cfg.size - 1 ? 'done' : 'next'}" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${i + 1}">`).join('')}
        ${help(B.cfg.format === 'kot' ? 'Holdet stiller sig bagerst i køen.' : bpHasResults() ? 'Holdet får kampe mod alle de andre hold. Kampene lægges ind, hvor der er plads i programmet.' : 'Lodtrækningen bliver lavet om med det nye hold.')}`) +
      `<div class="btnrow"><button type="button" class="setbtn" data-act="bclose">${c && canAdd ? 'Annuller' : 'Luk'}</button>${c && canAdd ? '<button type="button" class="setbtn go" data-act="baddconfirm">Tilføj</button>' : ''}</div>`;
  } else {
    inner = `<header><h3 id="bph">Hvilket hold trækker sig?</h3></header><div>${bActive().map(id => `<div class="prow">${teamLine(id)}<button type="button" class="rm" id="bwd-${id}" data-act="bwd" data-n="${id}" data-label="Trækker sig" data-confirm="Tryk igen">Trækker sig</button></div>`).join('')}</div>
      ${help('Holdets resterende kampe bliver givet som walkover til modstanderne. Spillede kampe bliver ikke ændret.')}
      <div class="btnrow"><button type="button" class="setbtn" data-act="bclose">Annuller</button></div>`;
  }
  el.innerHTML = `<button type="button" class="scrim" data-act="bclose" aria-label="Luk"></button><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="bph"><div class="grabber" aria-hidden="true"></div>${inner}</div>`;
  document.documentElement.style.overflow = 'hidden';
  const f = document.getElementById('bpn-name');
  if (f) f.focus();
}
function bAll() {
  if (view === 'bpsetup') { bBuildTeams(); }
  bBuildSettings();
  bRender();
}
function bSave() { save(); }

/* ---------- Actions ---------- */
function bSetCfg(k, v) {
  if (B.cfg[k] === v) return;
  B.cfg[k] = v;
  if (k in RULES) B.cfg.preset = 'custom';
  if (view === 'bpplay' && ['format', 'meets', 'groups', 'adv'].includes(k) && !bpHasResults()) { bpSeed(); B.info = 'Lodtrækningen er lavet om.'; }
  if (view === 'bpsetup' && k === 'size') bBuildTeams();
  bSave();
  bAll();
}
function bDecideKot() {
  const S2 = bStructure();
  const o = S2.O.kcur;
  if (!o || o.state !== 'done') return;
  B.klog.push({ a: o.A, b: o.B, win: o.win, lose: o.lose, games: o.games.map(g => Object.assign({}, g)), prevQ: [...B.kq] });
  B.kq = [o.win, ...B.kq.filter(x => x !== o.win && x !== o.lose), o.lose];
  delete B.res.kcur;
  haptic(12);
}
function bResultChanged(mid) {
  B.info = '';
  if (mid === 'kcur') {
    const o = bStructure().O.kcur;
    if (o && o.state === 'done' && o.games.every(g => g.ot || g.left)) bDecideKot();
  } else {
    const o = bStructure().O[mid];
    if (o && o.state === 'done') { haptic(12); }
  }
  bSave();
  bRender();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'newbp') { go('ny-bp'); return; }
  if (!act.startsWith('b')) return;
  if (act === 'bset') {
    const k = b.dataset.k;
    let v = b.dataset.v;
    if (BP_NUM.has(k)) v = +v; else if (v === 'true' || v === 'false') v = v === 'true';
    bSetCfg(k, v);
  } else if (act === 'bpreset') {
    const v = b.dataset.v;
    B.cfg.preset = v;
    if (PRESETS[v]) Object.assign(B.cfg, PRESETS[v].v);
    bSave(); bAll();
  } else if (act === 'baddteam') {
    const id = bpAddTeam('', ['', '']);
    bSave(); bBuildTeams(); bBuildSettings(); bRender();
    const inp = id && document.getElementById(`bm-${id}-0`);
    if (inp) inp.focus();
  } else if (act === 'brm') {
    if (!confirmed(b)) return;
    B.teams = B.teams.filter(t => t.id !== b.dataset.n);
    bSave(); bBuildTeams(); bRender();
  } else if (act === 'bmix') {
    const all = shuffle(B.teams.flatMap(t => t.p.slice(0, 2)));
    B.teams.forEach((t, i) => { t.p = [all[2 * i] || '', all[2 * i + 1] || '']; });
    bSave(); bBuildTeams(); bRender();
  } else if (act === 'bstart') {
    if (B.teams.length < BPF[B.cfg.format].min) return;
    const g = B;
    g.id = 'g' + Date.now().toString(36);
    g.created = Date.now();
    withB(g, bpSeed);
    g.info = '';
    store.games.unshift(g);
    store.lastBpCfg = Object.assign({}, g.cfg);
    store.draftBp = null;
    save();
    go('spil-' + g.id);
  } else if (act === 'bwin' || act === 'bleft' || act === 'bot') {
    const mid = b.dataset.m, gi = +b.dataset.g;
    const o = bStructure().O[mid];
    if (!o || !o.A || !o.B) return;
    const r = B.res[mid] && B.res[mid].a === o.A && B.res[mid].b === o.B ? B.res[mid] : (B.res[mid] = { a: o.A, b: o.B, games: [] });
    if (act === 'bwin') {
      const s = b.dataset.s;
      if (r.games[gi] && r.games[gi].w === s) r.games.length = gi;
      else { r.games[gi] = { w: s, left: null, ot: false }; r.games.length = gi + 1; }
    } else if (act === 'bleft') {
      if (!r.games[gi]) return;
      r.games[gi].left = +b.dataset.v; r.games[gi].ot = false;
    } else {
      if (!r.games[gi]) return;
      r.games[gi].ot = !r.games[gi].ot;
      if (r.games[gi].ot) r.games[gi].left = 1;
    }
    if (!r.games.length) delete B.res[mid];
    bResultChanged(mid);
  } else if (act === 'bedit') {
    const id = b.dataset.m;
    if (bpEdit.has(id)) bpEdit.delete(id); else bpEdit.add(id);
    bRender();
  } else if (act === 'bundo') {
    const e2 = B.klog.pop();
    if (!e2) return;
    B.kq = e2.prevQ;
    B.res.kcur = { a: e2.a, b: e2.b, games: e2.games };
    B.ended = false;
    bSave(); bRender();
  } else if (act === 'bend') {
    if (!confirmed(b)) return;
    B.ended = true;
    bSave(); bRender();
  } else if (act === 'bopenadd') {
    bpPanel = bpPanel === 'add' ? null : 'add'; bRenderPanel();
  } else if (act === 'bopenwd') {
    bpPanel = bpPanel === 'wd' ? null : 'wd'; bRenderPanel();
  } else if (act === 'bclose') {
    bpPanel = null; disarm(); bRenderPanel();
  } else if (act === 'baddconfirm') {
    const name = document.getElementById('bpn-name').value;
    const ps = Array.from({ length: B.cfg.size }, (_, i) => (document.getElementById('bpn-p' + i) || {}).value || '');
    const had = bpHasResults();
    const id = bpAddTeam(name, ps.concat(['', '']).slice(0, 2));
    if (!id) return;
    if (!had) { bpSeed(); B.info = `${tName(id)} er med. Lodtrækningen er lavet om.`; }
    else if (B.cfg.format === 'kot') { B.kq.push(id); B.info = `${tName(id)} står bagerst i køen.`; }
    else if (B.cfg.format === 'rr') {
      const others = bActive().filter(x => x !== id);
      const occ = {};
      B.rr.forEach(m => { (occ[m.round] = occ[m.round] || new Set()).add(m.a.t).add(m.b.t); });
      const firstOpen = Math.min(...B.rr.filter(m => !decided(bStructure().O[m.id])).map(m => m.round).concat([Infinity]));
      let start = isFinite(firstOpen) ? firstOpen : Math.max(0, ...B.rr.map(m => m.round)) + 1;
      for (let leg = 0; leg < B.cfg.meets; leg++) {
        others.forEach(ot => {
          let r = start;
          while (occ[r] && (occ[r].has(ot) || occ[r].has(id))) r++;
          (occ[r] = occ[r] || new Set()).add(ot).add(id);
          B.seq++;
          B.rr.push({ id: 'x' + B.seq, a: leg % 2 ? { t: id } : { t: ot }, b: leg % 2 ? { t: ot } : { t: id }, round: r, sec: `Runde ${r}` });
        });
      }
      B.rr.sort((x, y) => x.round - y.round);
      B.info = `${tName(id)} er med og har fået ${plural(others.length * B.cfg.meets, 'kamp', 'kampe')} i programmet.`;
    }
    bpPanel = null;
    bSave(); bRenderPanel(); bBuildSettings(); bRender();
  } else if (act === 'bwd') {
    if (!confirmed(b)) return;
    const t = T(b.dataset.n);
    t.out = true;
    if (B.res.kcur && (B.res.kcur.a === t.id || B.res.kcur.b === t.id)) delete B.res.kcur;
    B.info = `${tName(t.id)} har trukket sig. Deres resterende kampe er givet som walkover.`;
    haptic(20);
    bpPanel = null;
    bSave(); bRenderPanel(); bBuildSettings(); bRender();
  } else if (act === 'bresetres') {
    if (!confirmed(b)) return;
    B.teams.forEach(t => { t.out = false; });
    bpSeed();
    B.info = 'Resultaterne er nulstillet, og der er lavet en ny lodtrækning.';
    bpEdit.clear();
    bSave(); bAll();
  } else if (act === 'bdelgame') {
    if (!confirmed(b)) return;
    store.games = store.games.filter(x => x.id !== B.id);
    save();
    go('');
  }
});
document.addEventListener('input', e => {
  const t = e.target, kind = t.dataset && t.dataset.kind;
  if (kind !== 'bt' && kind !== 'bm') return;
  const team = T(t.dataset.n);
  if (!team) return;
  if (kind === 'bt') team.name = t.value; else team.p[+t.dataset.i] = t.value;
  bSave();
  if (view === 'bpsetup') bUpdateSetupSummary(); else bRender();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && bpPanel) { bpPanel = null; bRenderPanel(); }
});


