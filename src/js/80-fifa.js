/* ======================= FIFA (EA Sports FC) ======================= */
const FC_FORMATS = [
  { id: 'rr', name: 'Liga', desc: 'Alle møder alle. 3 point for sejr, 1 for uafgjort.', min: 2 },
  { id: 'grp', name: 'Grupper og slutspil', desc: 'Som et VM: gruppekampe først, derefter knockout for de bedste.', min: 4 },
  { id: 'ko', name: 'Knockout', desc: 'Taber man, er man ude. Kan spilles med hjemme- og udekamp.', min: 2 },
  { id: 'de', name: 'Dobbelt knockout', desc: 'Som i FC Pro: man er først ude efter to nederlag.', min: 3 },
  { id: 'sw', name: 'Schweizisk', desc: 'Som i FC Pro: hver runde møder man en med samme antal point. Ingen møder den samme to gange.', min: 4 },
  { id: 'kot', name: 'Vinderen bliver', desc: 'Vinderen beholder controlleren. Taberen går bagerst i køen.', min: 2 }
];
const FCF = {};
FC_FORMATS.forEach(f => { FCF[f.id] = f; });
const FC_HOUSE = {
  classic: ['Klassisk', 'Almindelig kamp med alle regler.'],
  norules: ['Ingen regler', 'Ingen frispark, kort eller offside.'],
  survival: ['Survival', 'Hver gang et hold scorer, ryger en tilfældig markspiller fra det hold ud.'],
  longrange: ['Langskud', 'Mål uden for feltet tæller 2. Skriv det tal, spillet viser.'],
  headers: ['Hovedstød og volleyer', 'Kun mål på hovedstød, volleyer, frispark og straffe tæller.'],
  firstto: ['Først til …', 'Den første, der når det aftalte antal mål, vinder.'],
  mystery: ['Mystery Ball', 'Bolden giver tilfældige boosts, og nogle mål kan tælle mere.']
};
const FC_DEF = { size: 1, format: 'grp', meets: 1, groups: 0, adv: 2, legs: 1, finalKind: 'ko1', bronze: true, gfReset: true, swRounds: 0, swFinal: true, kotStreak: 0, kotDraw: 'stay', seed: 'random', half: 6, house: 'classic', tie: 'etpen', order: 'h2h', pick: 'free', ver: 'fc26', gen: 'm', smin: 4.5, smax: 5, cmode: 'match' };
const FC_NUM = new Set(['size', 'meets', 'groups', 'adv', 'legs', 'swRounds', 'kotStreak', 'half', 'smin', 'smax']);
const FC_MAX = PALETTE.length;

function fcFresh(cfg) {
  return { type: 'fc', ents: [], res: {}, order: [], groups: [], rr: [], sw: [], kq: [], klog: [], stars: {}, clubs: {}, tclub: {}, seq: 0, info: '', ended: false, cfg: Object.assign({}, FC_DEF, cfg || {}) };
}
function fcValid(x) { return x && x.type === 'fc' && Array.isArray(x.ents) && x.res && x.cfg; }
function fcNormalize(g) {
  g.cfg = Object.assign({}, FC_DEF, g.cfg);
  ['order', 'groups', 'rr', 'sw', 'kq', 'klog'].forEach(k => { if (!Array.isArray(g[k])) g[k] = []; });
  if (!g.stars) g.stars = {};
  if (!g.clubs) g.clubs = {};
  if (!g.tclub) g.tclub = {};
  if (g.cfg.pick === 'stars') g.cfg.pick = 'club';
  fcClamp(g.cfg);
  return g;
}
let F = fcFresh();
let fcPanel = null;
let fStarsDirty = false;
const fcEdit = new Set();
function withF(g, fn) { const o = F; F = g; try { return fn(); } finally { F = o; } }

/* ---------- Participants ---------- */
function E(id) { return F.ents.find(t => t.id === id); }
function fActive() { return F.ents.filter(t => !t.out).map(t => t.id); }
function eName(id) {
  if (id === 'BYE') return 'Fri runde';
  const t = E(id);
  if (!t) return '?';
  const n = (t.name || '').trim();
  if (n) return n;
  const ps = (F.cfg.size === 2 ? t.p : t.p.slice(0, 1)).map(x => (x || '').trim()).filter(Boolean);
  return ps.length ? ps.join(' & ') : (F.cfg.size === 2 ? 'Hold ' : 'Spiller ') + PC[t.color].label.toLowerCase();
}
function eSub(id) {
  const t = E(id);
  if (!t) return '';
  const bits = [];
  if ((t.name || '').trim() && F.cfg.size === 2) bits.push(t.p.map(x => (x || '').trim()).filter(Boolean).join(' & '));
  if (F.cfg.pick !== 'club' && (t.club || '').trim()) bits.push(t.club.trim());
  return bits.filter(Boolean).join(' · ');
}
function shirt(id, size) {
  const t = E(id);
  const c = t ? PC[t.color].color : '#8e8e93';
  const s = size || 26;
  return `<svg class="shirt" width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 3 4 5.2 2 9.5l3 1.6L6.5 9V21h11V9l1.5 2.1 3-1.6-2-4.3L15.5 3c-.6 1.3-1.9 2.1-3.5 2.1S9.1 4.3 8.5 3z" fill="${c}" stroke="rgba(0,0,0,.28)" stroke-width="1" stroke-linejoin="round"/></svg>`;
}
const fcEmblemSvg = `<svg class="bpemblem" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#1fa34a"/><g stroke="#fff" stroke-opacity=".75" stroke-width="2" fill="none"><rect x="8" y="10" width="48" height="44" rx="2"/><path d="M8 32h48"/><circle cx="32" cy="32" r="7"/><rect x="22" y="10" width="20" height="7"/><rect x="22" y="47" width="20" height="7"/></g><circle cx="44" cy="40" r="7.5" fill="#fff"/><path d="M44 35.6l2.6 1.9-1 3.1h-3.2l-1-3.1z" fill="#1c1c1e"/></svg>`;
function starText(v) { return '★'.repeat(Math.floor(v)) + (v % 1 ? '½' : ''); }
const CRESTS = {"rma":"@@IMG:crests/rma@@","fcb":"@@IMG:crests/fcb@@","psg":"@@IMG:crests/psg@@","liv":"@@IMG:crests/liv@@","mci":"@@IMG:crests/mci@@","ars":"@@IMG:crests/ars@@","fcbm":"@@IMG:crests/fcbm@@","atm":"@@IMG:crests/atm@@","new":"@@IMG:crests/new@@","nap":"@@IMG:crests/nap@@","bvb":"@@IMG:crests/bvb@@","tot":"@@IMG:crests/tot@@","che":"@@IMG:crests/che@@","avl":"@@IMG:crests/avl@@","mun":"@@IMG:crests/mun@@","b04":"@@IMG:crests/b04@@","rbl":"@@IMG:crests/rbl@@","juv":"@@IMG:crests/juv@@","int":"@@IMG:crests/int@@","mil":"@@IMG:crests/mil@@","sev":"@@IMG:crests/sev@@","vil":"@@IMG:crests/vil@@","lei":"@@IMG:crests/lei@@","bet":"@@IMG:crests/bet@@","rso":"@@IMG:crests/rso@@","slb":"@@IMG:crests/slb@@","bmg":"@@IMG:crests/bmg@@","ol":"@@IMG:crests/ol@@","rom":"@@IMG:crests/rom@@","whu":"@@IMG:crests/whu@@","pfc":"@@IMG:crests/pfc@@","wob":"@@IMG:crests/wob@@","sge":"@@IMG:crests/sge@@"};
/* ---------- Klubber (stjerner ved udgivelsen, kun bekræftede) ---------- */
const FC_BADGE = {
  pie: ['#111111', '#ffffff', 'PC'], rfc: ['#8e1f2f', '#f0bc42', 'RFC'], lat: ['#87c4ea', '#ffffff', 'LAT'], ber: ['#1d63b8', '#111111', 'BC'],
  atm2: ['#cb3524', '#ffffff', 'ATM'], oll: ['#1c3f94', '#e30613', 'OL'], kcc: ['#62cbc9', '#cf3339', 'KC'], wsp: ['#0b1f3a', '#c8102e', 'WS'],
  got: ['#111111', '#9dd2e6', 'NJ/NY'], orl: ['#5f3e8c', '#ffffff', 'OP'], por: ['#9e1b32', '#111111', 'PT']
};
const FC_VERS = [['f22', 'FIFA 22'], ['f23', 'FIFA 23'], ['fc24', 'FC 24'], ['fc25', 'FC 25'], ['fc26', 'FC 26']];
const FC_VNAME = { f22: 'FIFA 22', f23: 'FIFA 23', fc24: 'EA Sports FC 24', fc25: 'EA Sports FC 25', fc26: 'EA Sports FC 26' };
// Format: "stjerner:Navn=logo;Navn=logo"
const FC_RAW = {
  f22: {
    m: '5:Paris Saint-Germain=psg;Manchester City=mci;FC Bayern München=fcbm;Liverpool=liv;Manchester United=mun;Real Madrid=rma;Atlético de Madrid=atm;FC Barcelona=fcb;Chelsea=che;Piemonte Calcio=pie|' +
      '4.5:Tottenham Hotspur=tot;Inter=int;Milan=mil;Napoli=nap;Roma FC=rfc;Sevilla FC=sev;Real Sociedad=rso;Villarreal CF=vil;Real Betis=bet;Borussia Dortmund=bvb;RB Leipzig=rbl;Borussia Mönchengladbach=bmg;Leicester City=lei;SL Benfica=slb;Olympique Lyonnais=ol'
  },
  f23: {
    m: '5:Manchester City=mci;Liverpool=liv;Chelsea=che;Real Madrid=rma;FC Barcelona=fcb;FC Bayern München=fcbm;Inter=int;Paris Saint-Germain=psg|' +
      '4.5:Arsenal=ars;Aston Villa=avl;Leicester City=lei;Manchester United=mun;Tottenham Hotspur=tot;West Ham United=whu;Real Betis=bet;Real Sociedad=rso;Sevilla FC=sev;Villarreal CF=vil;Borussia Dortmund=bvb;Bayer 04 Leverkusen=b04;RB Leipzig=rbl;Bergamo Calcio=ber;Piemonte Calcio=pie;Latium=lat;Milan=mil;Napoli=nap;Roma FC=rfc',
    w: '5:Olympique Lyonnais=ol;Paris Saint-Germain=psg|4.5:Paris FC=pfc'
  },
  fc24: {
    m: '5:Manchester City=mci;Real Madrid=rma;FC Bayern München=fcbm;Paris Saint-Germain=psg;Liverpool=liv;FC Barcelona=fcb;Atlético de Madrid=atm|' +
      '4.5:Manchester United=mun;Borussia Dortmund=bvb;RB Leipzig=rbl;Arsenal=ars;Milan=mil;Sevilla FC=sev;Inter=int'
  },
  fc25: {
    m: '5:Real Madrid=rma;Manchester City=mci;FC Bayern München=fcbm;FC Barcelona=fcb;Liverpool=liv;Arsenal=ars;Bayer 04 Leverkusen=b04|' +
      '4.5:Paris Saint-Germain=psg;Atlético de Madrid=atm2;Tottenham Hotspur=tot;Borussia Dortmund=bvb;Newcastle United=new;RB Leipzig=rbl;Juventus=juv;Manchester United=mun;Chelsea=che',
    w: '5:FC Barcelona=fcb;Olympique Lyonnais=ol;Chelsea=che;Arsenal=ars|' +
      '4.5:FC Bayern München=fcbm;VfL Wolfsburg=wob;Manchester City=mci;Real Madrid=rma;Paris Saint-Germain=psg;NJ/NY Gotham FC=got;Juventus=juv;Manchester United=mun;Kansas City Current=kcc;Atlético de Madrid=atm2;Portland Thorns=por;Roma=rom'
  },
  fc26: {
    m: '5:Real Madrid=rma;FC Barcelona=fcb;Paris Saint-Germain=psg;Liverpool=liv;Manchester City=mci;Arsenal=ars;FC Bayern München=fcbm|' +
      '4.5:Atlético de Madrid=atm2;Newcastle United=new;Napoli=nap;Borussia Dortmund=bvb;Tottenham Hotspur=tot;Chelsea=che;Aston Villa=avl;Manchester United=mun;Bayer 04 Leverkusen=b04',
    w: '5:FC Barcelona=fcb;OL Lyonnes=oll;Chelsea=che;Arsenal=ars;FC Bayern München=fcbm|' +
      '4.5:Real Madrid=rma;Paris Saint-Germain=psg;Manchester City=mci;VfL Wolfsburg=wob;Manchester United=mun;Kansas City Current=kcc|' +
      '4:Washington Spirit=wsp;Eintracht Frankfurt=sge;NJ/NY Gotham FC=got;Juventus=juv;Orlando Pride=orl'
  }
};
const FC_CLUBS = {};
Object.keys(FC_RAW).forEach(v => {
  FC_CLUBS[v] = {};
  Object.keys(FC_RAW[v]).forEach(g => {
    FC_CLUBS[v][g] = FC_RAW[v][g].split('|').flatMap(part => {
      const [s, list] = part.split(':');
      return list.split(';').map(x => { const [n, k] = x.split('='); return { n, s: +s, k }; });
    });
  });
});
function fcGenOk(c) { return c.gen === 'w' && FC_CLUBS[c.ver] && FC_CLUBS[c.ver].w ? 'w' : 'm'; }
function fcAll(c) { return (FC_CLUBS[c.ver] || FC_CLUBS.fc26)[fcGenOk(c)]; }
function fcLevels(c) { return [...new Set(fcAll(c).map(r => r.s))].sort((a, b) => a - b); }
function fcClamp(c) {
  if (!FC_CLUBS[c.ver]) c.ver = 'fc26';
  c.gen = fcGenOk(c);
  const L = fcLevels(c), lo = L[0], hi = L[L.length - 1];
  if (!L.includes(c.smin)) c.smin = Math.min(hi, Math.max(lo, c.smin));
  if (!L.includes(c.smax)) c.smax = Math.min(hi, Math.max(lo, c.smax));
  if (!L.includes(c.smin)) c.smin = lo;
  if (!L.includes(c.smax)) c.smax = hi;
  if (c.smin > c.smax) c.smax = c.smin;
}
function fcPool(c) { return fcAll(c).filter(r => r.s >= c.smin && r.s <= c.smax); }
function fcRangeText(c) { return c.smin === c.smax ? `kun ${starText(c.smin)}` : `${starText(c.smin)} til ${starText(c.smax)}`; }
function fcDraw(exclude, must) {
  const pool = fcPool(F.cfg);
  if (!pool.length) return null;
  let cand = pool.filter(r => !exclude.includes(r.n));
  if (!cand.length && must) cand = pool.filter(r => !must.includes(r.n));
  if (!cand.length) cand = pool;
  const r = cand[Math.floor(Math.random() * cand.length)];
  return { n: r.n, s: r.s, k: r.k };
}
function crestImg(rec, size) {
  if (CRESTS[rec.k]) return `<img src="${CRESTS[rec.k]}" alt="" width="${size}" height="${size}">`;
  const b = FC_BADGE[rec.k] || ['#8e8e93', '#ffffff', rec.n.slice(0, 2).toUpperCase()];
  const fs = b[2].length > 3 ? 6.2 : b[2].length > 2 ? 7.6 : 9;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true"><path d="M12 1.6 3.4 4.4v6.9c0 5.3 3.7 9.4 8.6 11.1 4.9-1.7 8.6-5.8 8.6-11.1V4.4z" fill="${b[0]}" stroke="${b[1]}" stroke-width="1.4"/><text x="12" y="14.6" text-anchor="middle" font-size="${fs}" font-weight="800" fill="${b[1]}" font-family="system-ui,sans-serif">${esc(b[2])}</text></svg>`;
}
function crest(rec, color, size) {
  const s = size || 26;
  return `<span class="crest" style="--pc:${color || '#8e8e93'};width:${s + 4}px;height:${s + 4}px" title="${esc(rec.n)}">${crestImg(rec, Math.round(s * 0.8))}</span>`;
}
function fcTour() { return F.cfg.pick === 'club' && F.cfg.cmode === 'tour'; }
function fcPerMatch() { return F.cfg.pick === 'club' && F.cfg.cmode === 'match'; }
function tClub(id) {
  if (!fcTour() || !id || id === 'BYE' || !E(id)) return null;
  if (!F.tclub[id]) {
    const used = Object.keys(F.tclub).filter(e => e !== id && E(e) && !E(e).out).map(e => F.tclub[e].n);
    const r = fcDraw(used);
    if (!r) return null;
    F.tclub[id] = r;
    fStarsDirty = true;
  }
  return F.tclub[id];
}
function mClubs(id, o) {
  if (!fcPerMatch() || !o || !o.A || !o.B) return null;
  const r = F.clubs[id];
  if (r && r.A === o.A && r.B === o.B) return r;
  if (o.state === 'done' || o.state === 'wo') return null;
  const busy = [];
  Object.keys(F.clubs).forEach(m => { if (m !== id) { const x = F.clubs[m]; busy.push(x.a.n, x.b.n); } });
  const a = fcDraw(busy, []);
  if (!a) return null;
  const b = fcDraw([...busy, a.n], [a.n]);
  fStarsDirty = true;
  return (F.clubs[id] = { A: o.A, B: o.B, a, b });
}
function entIcon(id, size, rec) {
  const t = E(id);
  const r = rec || tClub(id);
  return r ? crest(r, t ? PC[t.color].color : null, size || 26) : shirt(id, size);
}
function fcPoolHtml(c) {
  const pool = fcPool(c);
  return `<div class="clubpool">${pool.map(r => `<span class="cp">${crest(r, '#d1d1d6', 20)}<span>${esc(r.n)}</span><b class="stars">${starText(r.s)}</b></span>`).join('')}</div>`;
}

/* ---------- Structure ---------- */
function fKoKind() { return F.cfg.legs === 2 ? 'ko2' : 'ko1'; }
function fSeed() {
  const ids = fActive();
  F.order = F.cfg.seed === 'random' ? shuffle([...ids]) : [...ids];
  F.groups = [];
  if (F.cfg.format === 'grp') {
    const n = F.order.length;
    let G = F.cfg.groups || Math.max(1, Math.round(n / 4));
    while (G > 1 && n / G < 3) G--;
    F.groups = Array.from({ length: G }, () => []);
    F.order.forEach((id, i) => {
      const r = Math.floor(i / G), c = i % G;
      F.groups[r % 2 ? G - 1 - c : c].push(id);
    });
  }
  F.rr = F.cfg.format === 'rr' ? rrBuild(F.order, F.cfg.meets, 'r') : [];
  F.sw = [];
  F.kq = [...F.order];
  F.res = {};
  F.klog = [];
  F.stars = {};
  F.clubs = {};
  F.ended = false;
  if (F.cfg.format === 'sw') fSwissNext();
}
function fHasResults() { return F.klog.length > 0 || Object.values(F.res).some(r => r.games && r.games.some(g => g.done)); }
function fSwRounds() { return F.cfg.swRounds || Math.max(3, Math.ceil(Math.log2(Math.max(2, fActive().length)))); }
// Pairs players with the same score who have not met; the lowest without a bye sits out
function fSwissNext() {
  const ids = fActive();
  const done = F.sw.length ? Math.max(...F.sw.map(m => m.round)) : 0;
  if (done >= fSwRounds()) return false;
  let order;
  if (!done) order = [...F.order].filter(id => ids.includes(id));
  else {
    const S2 = fStructure();
    order = S2.tables[0].rows.map(r => r.id).filter(id => ids.includes(id));
  }
  const met = new Set(F.sw.map(m => [m.a.t, m.b.t].sort().join('|')));
  const pool = [...order];
  const round = done + 1, out = [];
  if (pool.length % 2) {
    const hadBye = new Set(F.sw.filter(m => m.b.t === 'BYE').map(m => m.a.t));
    let k = pool.length - 1;
    while (k > 0 && hadBye.has(pool[k])) k--;
    const bye = pool.splice(k, 1)[0];
    out.push({ id: `s${round}-bye`, a: { t: bye }, b: { t: 'BYE' }, round, sec: `Runde ${round}` });
  }
  let i = 0;
  while (pool.length) {
    const a = pool.shift();
    let j = pool.findIndex(b => !met.has([a, b].sort().join('|')));
    if (j < 0) j = 0;
    const b = pool.splice(j, 1)[0];
    out.push({ id: `s${round}-${i++}`, a: { t: a }, b: { t: b }, round, sec: `Runde ${round}` });
  }
  F.sw.push(...out);
  return true;
}
function fGameWinner(g) {
  if (!g || !g.done) return null;
  if (g.ga > g.gb) return 'a';
  if (g.gb > g.ga) return 'b';
  return g.tb && g.tb.w ? g.tb.w : 'draw';
}
function fResolve(M) {
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
    const o = { m, A: a, B: b, ga: 0, gb: 0 };
    O[m.id] = o;
    if (a == null || b == null) { o.state = 'wait'; continue; }
    if (a === 'BYE' || b === 'BYE') { o.state = 'bye'; o.win = a === 'BYE' ? b : a; o.lose = a === 'BYE' ? a : b; continue; }
    if (F.res[m.id] && (F.res[m.id].a !== a || F.res[m.id].b !== b)) delete F.res[m.id];
    const r = F.res[m.id];
    const games = r ? r.games : [];
    o.games = games;
    games.forEach(g => { if (g.done) { o.ga += g.ga; o.gb += g.gb; } });
    const kind = m.kind;
    let dec = null, tie = false;
    if (kind === 'single') {
      if (games[0] && games[0].done) dec = games[0].ga > games[0].gb ? 'a' : games[0].gb > games[0].ga ? 'b' : 'draw';
    } else if (kind === 'ko1' || kind === 'ko2') {
      const n = kind === 'ko2' ? 2 : 1;
      if (games.length >= n && games.slice(0, n).every(g => g.done)) {
        if (o.ga !== o.gb) dec = o.ga > o.gb ? 'a' : 'b';
        else {
          const tb = games[n - 1].tb;
          if (tb && tb.w) dec = tb.w;
          else if (m.stay) dec = 'a';
          else tie = true;
        }
      }
    } else if (kind === 'bo3') {
      let wa = 0, wb = 0;
      games.forEach(g => { const w = fGameWinner(g); if (w === 'a') wa++; else if (w === 'b') wb++; else if (w === 'draw') tie = true; });
      o.wa = wa; o.wb = wb;
      if (wa >= 2 || wb >= 2) { dec = wa >= 2 ? 'a' : 'b'; tie = false; }
    }
    if (dec) {
      o.state = 'done';
      if (dec === 'draw') o.draw = true;
      else { o.win = dec === 'a' ? a : b; o.lose = dec === 'a' ? b : a; }
      continue;
    }
    const outA = E(a) && E(a).out, outB = E(b) && E(b).out;
    if (outA || outB) { o.state = 'wo'; o.win = outA && !outB ? b : a; o.lose = o.win === a ? b : a; continue; }
    o.tie = tie;
    o.state = games.some(g => g.done) ? 'live' : 'ready';
  }
  return O;
}
function fDecided(o) { return o && (o.state === 'done' || o.state === 'wo'); }

// League table: 3-1-0, with ties split by head-to-head first (World Cup 2026) or goal difference first
function fStand(ids, O, ms) {
  const R = {};
  ids.forEach(id => { R[id] = { id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, Pts: 0 }; });
  const res = [];
  ms.forEach(m => {
    const o = O[m.id];
    if (o.state === 'bye' && R[o.win]) { R[o.win].P++; R[o.win].W++; R[o.win].Pts += 3; return; }
    if (!fDecided(o) || !R[o.A] || !R[o.B]) return;
    const A = R[o.A], Bq = R[o.B];
    A.P++; Bq.P++;
    if (o.state === 'wo') { R[o.win].W++; R[o.win].Pts += 3; R[o.lose].L++; res.push({ a: o.A, b: o.B, ga: o.win === o.A ? 3 : 0, gb: o.win === o.A ? 0 : 3 }); return; }
    A.GF += o.ga; A.GA += o.gb; Bq.GF += o.gb; Bq.GA += o.ga;
    if (o.draw) { A.D++; Bq.D++; A.Pts++; Bq.Pts++; }
    else { R[o.win].W++; R[o.win].Pts += 3; R[o.lose].L++; }
    res.push({ a: o.A, b: o.B, ga: o.ga, gb: o.gb });
  });
  Object.values(R).forEach(r => { r.GD = r.GF - r.GA; });
  const h2h = (grp) => {
    const S3 = {};
    grp.forEach(r => { S3[r.id] = { p: 0, gd: 0, gf: 0 }; });
    res.forEach(x => {
      if (!S3[x.a] || !S3[x.b]) return;
      S3[x.a].gf += x.ga; S3[x.b].gf += x.gb; S3[x.a].gd += x.ga - x.gb; S3[x.b].gd += x.gb - x.ga;
      if (x.ga > x.gb) S3[x.a].p += 3; else if (x.gb > x.ga) S3[x.b].p += 3; else { S3[x.a].p++; S3[x.b].p++; }
    });
    return S3;
  };
  const arr = Object.values(R).sort((x, y) => y.Pts - x.Pts);
  const out = [];
  let i = 0;
  while (i < arr.length) {
    let j = i;
    while (j < arr.length && arr[j].Pts === arr[i].Pts) j++;
    const g = arr.slice(i, j);
    if (g.length > 1) {
      const H = h2h(g);
      const byH = (x, y) => H[y.id].p - H[x.id].p || H[y.id].gd - H[x.id].gd || H[y.id].gf - H[x.id].gf;
      const byGD = (x, y) => y.GD - x.GD || y.GF - x.GF;
      g.sort(F.cfg.order === 'h2h' ? (x, y) => byH(x, y) || byGD(x, y) : (x, y) => byGD(x, y) || byH(x, y));
    }
    out.push(...g);
    i = j;
  }
  return out;
}
function fKinds(M, koKind) {
  M.forEach(m => { if (!m.kind) m.kind = m.isFinal ? F.cfg.finalKind : m.bk === 'br' ? 'ko1' : koKind; });
  return M;
}
function fStructure() {
  const c = F.cfg, f = c.format;
  let M = [], tables = [], places = null, done = false;
  if (f === 'ko' || f === 'de') {
    M = fKinds(elimBuild(F.order, { prefix: 'e', double: f === 'de', bronze: c.bronze, finalBo: 1, gfReset: c.gfReset }), fKoKind());
  } else if (f === 'rr') {
    M = F.rr.map(m => Object.assign({}, m, { kind: 'single' }));
  } else if (f === 'sw') {
    M = F.sw.map(m => Object.assign({}, m, { kind: 'single' }));
  } else if (f === 'grp') {
    F.groups.forEach((g, gi) => {
      rrBuild(g, 1, `g${gi}-`).forEach(m => { m.sec = `Gruppe ${grpLetter(gi)} · ${m.sec.toLowerCase()}`; m.grp = gi; m.kind = 'single'; M.push(m); });
    });
  } else if (f === 'kot') {
    const q = F.kq.filter(id => E(id) && !E(id).out);
    let streak = 0;
    for (let i = F.klog.length - 1; i >= 0 && F.klog[i].win === (F.klog[F.klog.length - 1] || {}).win; i--) streak++;
    const hitNow = c.kotStreak && streak >= c.kotStreak;
    if (!F.ended && !hitNow && q.length >= 2) M = [{ id: 'kcur', a: { t: q[0] }, b: { t: q[1] }, sec: 'Ved skærmen', kind: 'ko1', stay: c.kotDraw === 'stay' }];
  }
  let O = fResolve(M);
  if (f === 'grp') {
    const groupDone = M.length && M.every(m => fDecided(O[m.id]));
    const st = F.groups.map((g, gi) => fStand(g, O, M.filter(m => m.grp === gi)));
    st.forEach((rows, gi) => tables.push({ title: `Gruppe ${grpLetter(gi)}`, rows, adv: Math.min(c.adv, rows.length) }));
    if (groupDone) {
      const adv = Math.min(c.adv, ...st.map(s => s.length));
      const seeds = [];
      for (let p = 0; p < adv; p++) st.forEach(s => { if (s[p]) seeds.push(s[p].id); });
      const KO = fKinds(elimBuild(seeds, { prefix: 'k', double: false, bronze: c.bronze, finalBo: 1 }), fKoKind());
      const first = KO.filter(m => m.r === 1 && m.a.t && m.b.t);
      const grpOf = id => F.groups.findIndex(g => g.includes(id));
      first.forEach((m, i) => {
        if (m.b.t === 'BYE' || grpOf(m.a.t) !== grpOf(m.b.t)) return;
        const other = first.find((x, j) => j !== i && x.b.t !== 'BYE' && grpOf(x.b.t) !== grpOf(m.a.t) && grpOf(m.b.t) !== grpOf(x.a.t));
        if (other) [m.b, other.b] = [other.b, m.b];
      });
      KO.forEach(m => { m.sec = 'Slutspil · ' + m.sec.toLowerCase(); });
      M = M.concat(KO);
      O = fResolve(M);
    }
  }
  if (f === 'rr' || f === 'sw') {
    const rows = fStand(fActive().concat(F.ents.filter(t => t.out).map(t => t.id)), O, M);
    tables.push({ title: '', rows, adv: f === 'sw' && c.swFinal ? 2 : 0 });
    const allDone = M.length > 0 && M.every(m => fDecided(O[m.id]) || O[m.id].state === 'bye');
    const roundsDone = f === 'rr' || (F.sw.length && Math.max(...F.sw.map(m => m.round)) >= fSwRounds());
    if (allDone && roundsDone) {
      const top = rows.filter(r => !E(r.id).out);
      if (f === 'sw' && c.swFinal && top.length >= 2) {
        const FM = { id: 'sfin', a: { t: top[0].id }, b: { t: top[1].id }, sec: 'Finale', kind: c.finalKind, isFinal: true };
        M = M.concat([FM]);
        O = fResolve(M);
        if (fDecided(O.sfin)) { done = true; places = [O.sfin.win, O.sfin.lose].concat(top.slice(2, 3).map(r => r.id)); }
      } else { done = true; places = top.slice(0, 3).map(r => r.id); }
    }
  }
  if (f === 'kot') {
    const R = {};
    F.ents.forEach(t => { R[t.id] = { id: t.id, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0, streak: 0, best: 0 }; });
    F.klog.forEach(e => {
      const w = R[e.win], l = R[e.lose];
      w.P++; l.P++; w.W++; l.L++; w.Pts += 3;
      w.streak++; w.best = Math.max(w.best, w.streak); l.streak = 0;
      const ga = e.ga, gb = e.gb;
      R[e.a].GF += ga; R[e.a].GA += gb; R[e.b].GF += gb; R[e.b].GA += ga;
    });
    Object.values(R).forEach(r => { r.GD = r.GF - r.GA; });
    const rows = Object.values(R).filter(r => !E(r.id).out || r.P).sort((x, y) => y.W - x.W || y.best - x.best || y.GD - x.GD);
    tables.push({ title: '', rows, adv: 0, kot: true });
    const hit = c.kotStreak && rows.find(r => r.streak >= c.kotStreak);
    done = !!(F.ended || hit) && F.klog.length > 0;
    if (done) places = (hit ? [hit, ...rows.filter(r => r !== hit)] : rows).slice(0, 3).map(r => r.id);
  }
  if (f === 'ko' || f === 'de' || f === 'grp') {
    const gf2 = M.find(m => m.bk === 'gf2');
    const finM = gf2 ? (O[gf2.id].state === 'skip' ? M.find(m => m.bk === 'gf') : gf2) : M.find(m => m.isFinal);
    const fo = finM ? O[finM.id] : null;
    if (fo && (fDecided(fo) || fo.state === 'bye' || fo.state === 'skip')) {
      done = true;
      places = [fo.win, fo.lose];
      if (f === 'de') {
        const lbs = M.filter(m => m.bk === 'l');
        const lbf = lbs[lbs.length - 1];
        if (lbf && O[lbf.id].lose && O[lbf.id].lose !== 'BYE') places.push(O[lbf.id].lose);
      } else {
        const br = M.find(m => m.bk === 'br');
        if (br && fDecided(O[br.id])) places.push(O[br.id].win);
      }
      places = places.filter(id => id && id !== 'BYE');
    }
  }
  const secMap = new Map();
  M.forEach(m => {
    const o = O[m.id];
    if (o.state === 'bye' || o.state === 'skip') return;
    if (!secMap.has(m.sec)) secMap.set(m.sec, []);
    secMap.get(m.sec).push(m.id);
  });
  const sections = [...secMap.entries()].map(([title, ids]) => ({ title, ids }));
  const num = {};
  let k = 0;
  sections.forEach(s => s.ids.forEach(id => { num[id] = ++k; }));
  const visible = sections.flatMap(s => s.ids);
  const played = visible.filter(id => fDecided(O[id])).length + (f === 'kot' ? F.klog.length : 0);
  const next = visible.find(id => O[id].state === 'live' || O[id].tie) || visible.find(id => O[id].state === 'ready');
  return { M, O, sections, tables, places, done, num, total: visible.length + (f === 'kot' ? F.klog.length : 0), played, next };
}
function fcStatus(g) {
  return withF(g, () => {
    const s = fStructure();
    if (s.done && s.places && s.places[0]) return { done: true, text: `Færdigt · ${eName(s.places[0])} vandt` };
    if (F.cfg.format === 'kot') return { done: false, text: `${plural(F.klog.length, 'kamp', 'kampe')} spillet` };
    return { done: false, text: `${s.played} af ${plural(s.total, 'kamp', 'kampe')} spillet` };
  });
}

/* ---------- Rules text ---------- */
function fcTieText(c) {
  return { etpen: 'forlænget spilletid og derefter straffespark', pen: 'straffespark med det samme', gg: 'golden goal i forlænget spilletid og derefter straffespark' }[c.tie];
}
function fcRuleLines(c) {
  const L = [];
  L.push(['Kampen', `${c.half} minutter pr. halvleg i Kick-Off. ${c.size === 2 ? '2 mod 2 på samme hold.' : '1 mod 1.'}`]);
  L.push(['Husregel', `${FC_HOUSE[c.house][0]}: ${FC_HOUSE[c.house][1]}${c.house !== 'classic' ? ' Hvilke husregler der findes, afhænger af udgaven, og om I spiller Kick-Off eller FUT Friendlies.' : ''}`]);
  L.push(['Holdvalg', c.pick === 'club' ? `Siden trækker en tilfældig klub fra ${FC_VNAME[c.ver]} (${c.gen === 'w' ? 'kvindehold' : 'herrehold'}, ${fcRangeText(c)}) ${c.cmode === 'tour' ? 'til hver deltager, og den beholder man hele turneringen' : 'til hver side i hver kamp'}. Find klubben i spillet, og spil med den.` : 'Alle vælger frit. Aftal, om man må tage det samme hold som modstanderen.']);
  if (['rr', 'grp', 'sw'].includes(c.format)) L.push(['Point', `3 point for sejr, 1 for uafgjort og 0 for nederlag. Ved pointlighed tæller ${c.order === 'h2h' ? 'først de indbyrdes kampe (point, målforskel, mål), derefter målforskel og mål i alle kampe. Sådan gør man ved VM 2026.' : 'først målforskel og scorede mål, derefter de indbyrdes kampe.'}`]);
  if (['ko', 'de', 'grp', 'sw', 'kot'].includes(c.format)) {
    if (c.format === 'kot' && c.kotDraw === 'stay') L.push(['Uafgjort', 'Ender kampen uafgjort, bliver den, der sad ved skærmen.']);
    else L.push(['Uafgjort i knockout', `Står det lige, afgøres kampen med ${fcTieText(c)}. I Kick-Off kan man slå forlænget spilletid og straffe til under kampindstillinger.`]);
  }
  if (c.legs === 2 && ['ko', 'de', 'grp'].includes(c.format)) L.push(['Hjemme og ude', 'Knockout-kampe er to kampe, hvor den samlede score tæller. Udebanemål tæller ikke ekstra, ligesom UEFA har gjort siden 2021. Står det lige samlet, afgøres det efter returkampen.']);
  if (c.finalKind === 'bo3' && c.format !== 'rr' && c.format !== 'kot') L.push(['Finalen', 'Bedst af 3 kampe. Ender en kamp uafgjort, afgøres den som en knockout-kamp.']);
  return L;
}

/* ---------- Settings ---------- */
function fseg(key, opts, label, dis) {
  return `<div class="field"><div class="flabel">${label}</div><div class="seg" role="group" aria-label="${esc(label)}">${opts.map(o => {
    const [v, l] = Array.isArray(o) ? o : [o, o];
    return `<button type="button" data-act="fset" data-k="${key}" data-v="${v}" aria-pressed="${String(F.cfg[key]) === String(v)}"${dis ? ' disabled' : ''}>${l}</button>`;
  }).join('')}</div></div>`;
}
const FCATS = [
  {
    id: 'fnames', title: 'Navne', only: 'play',
    sum: () => plural(fActive().length, 'deltager', 'deltagere'),
    body: () => `<div class="namelist">${F.ents.filter(t => !t.out).map(t => `<div class="bteamedit">${entIcon(t.id, 26)}
      <input class="nameinp" data-nav="fcn" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="${F.cfg.size === 2 ? 'Holdnavn' : 'Navn'}" data-kind="${F.cfg.size === 2 ? 'ft' : 'fm'}" data-n="${t.id}"${F.cfg.size === 2 ? '' : ' data-i="0"'} value="${esc(F.cfg.size === 2 ? t.name || '' : t.p[0] || '')}" aria-label="Navn">
      ${F.cfg.size === 2 ? [0, 1].map(i => `<input class="nameinp" data-nav="fcn" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${i + 1}" data-kind="fm" data-n="${t.id}" data-i="${i}" value="${esc(t.p[i] || '')}">`).join('') : ''}
      ${F.cfg.pick === 'club' ? (fcTour() && tClub(t.id) ? `<span class="tclub small"><span>${esc(tClub(t.id).n)} <b class="stars">${starText(tClub(t.id).s)}</b></span>${diceBtn('ftclub', t.id)}</span>` : '') : `<input class="nameinp" data-nav="fcn" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="Hold i spillet (valgfrit)" data-kind="fk" data-n="${t.id}" value="${esc(t.club || '')}">`}</div>`).join('')}</div>`
  },
  {
    id: 'fformat', title: 'Turneringsform',
    sum: c => FCF[c.format].name,
    body: c => {
      const locked = view === 'fcplay' && fHasResults();
      return `<div class="modes" role="group" aria-label="Turneringsform">${FC_FORMATS.map(m =>
        `<button type="button" class="mode" data-act="fset" data-k="format" data-v="${m.id}" aria-pressed="${c.format === m.id}"${locked ? ' disabled' : ''}><b>${m.name}</b><span>${m.desc}</span></button>`).join('')}</div>` +
        (c.format === 'rr' ? fseg('meets', [[1, 'Én gang'], [2, 'Hjemme og ude']], 'Hvor mange gange mødes man?', locked) : '') +
        (c.format === 'grp' ? fseg('groups', [[0, 'Automatisk'], [2, '2'], [3, '3'], [4, '4']], 'Antal grupper', locked) + fseg('adv', [[1, 'Nummer 1'], [2, 'Nummer 1 og 2']], 'Hvem går videre fra hver gruppe?', locked) : '') +
        (c.format === 'sw' ? fseg('swRounds', [[0, 'Automatisk'], [3, '3'], [4, '4'], [5, '5']], 'Antal runder', locked) + fseg('swFinal', [[true, 'Ja'], [false, 'Nej']], 'Finale mellem de to bedste?') : '') +
        (c.format === 'kot' ? fseg('kotStreak', [[0, 'Når I stopper'], [3, '3 sejre i træk'], [5, '5 sejre i træk']], 'Hvornår er der en vinder?') + fseg('kotDraw', [['stay', 'Vinderen bliver'], ['tb', 'Forlænget og straffe']], 'Ved uafgjort') : '') +
        (['ko', 'de', 'grp'].includes(c.format) ? fseg('legs', [[1, 'Én kamp'], [2, 'Hjemme og ude']], 'Knockout-kampe', locked) : '') +
        (locked ? help('Formen kan ikke ændres, når der er spillet kampe. Nulstil resultaterne eller start et nyt spil for at skifte.') : '');
    }
  },
  {
    id: 'fmatch', title: 'Kampen',
    sum: c => `${c.half} min. halvlege · ${FC_HOUSE[c.house][0]}`,
    body: c => fseg('half', [4, 6, 8, 10].map(v => [v, v + ' min']), 'Halvlegens længde') +
      `<div class="field"><div class="flabel">Husregel</div><div class="modes" role="group" aria-label="Husregel">${Object.entries(FC_HOUSE).map(([id, [n, d]]) =>
        `<button type="button" class="mode" data-act="fset" data-k="house" data-v="${id}" aria-pressed="${c.house === id}"><b>${n}</b><span>${d}</span></button>`).join('')}</div></div>` +
      help('Husreglerne vælges i spillet under Kick-Off. Hvilke der findes, afhænger af udgaven. Siden viser bare, hvad I har aftalt.')
  },
  {
    id: 'fpick', title: 'Holdvalg',
    sum: c => c.pick === 'club' ? `Tilfældig klub · ${FC_VERS.find(v => v[0] === c.ver)[1]}` : 'Frit valg',
    body: c => {
      let h = fseg('pick', [['free', 'Frit valg'], ['club', 'Tilfældig klub']], 'Hvordan vælges hold i spillet?');
      if (c.pick !== 'club') return h + help('Hver deltager kan skrive sit faste hold i spillet ved navnet.');
      const L = fcLevels(c).map(v => [v, starText(v)]);
      h += fseg('ver', FC_VERS, 'Hvilken udgave har I?').replace('class="seg"', 'class="seg vers"');
      if (FC_CLUBS[c.ver].w) h += fseg('gen', [['m', 'Herrehold'], ['w', 'Kvindehold']], 'Hold');
      h += fseg('smin', L, 'Fra') + fseg('smax', L, 'Til');
      h += fseg('cmode', [['match', 'Ny klub hver kamp'], ['tour', 'Samme hele turneringen']], 'Hvor tit trækkes der?');
      if (c.cmode === 'tour' && view === 'fcplay') h += `<div class="btnrow"><button type="button" class="setbtn" data-act="ftall">Træk alle klubber igen</button></div>`;
      const n = fcPool(c).length;
      h += `<div class="flabel">${plural(n, 'klub', 'klubber')} i puljen</div>` + fcPoolHtml(c);
      h += help(`Stjernerne er dem, holdene havde, da ${FC_VNAME[c.ver]} udkom. EA kan ændre dem med opdateringer, så spillet kan vise noget andet i dag. Kun klubber, hvor stjernerne er bekræftet, er med, så listen holder sig til de bedste hold.${c.cmode === 'tour' ? ' Den samme klub bliver ikke givet til to, så længe der er nok klubber.' : ' De to sider får aldrig den samme klub.'}`);
      return h;
    }
  },
  {
    id: 'frules', title: 'Uafgjort og point',
    sum: c => ({ etpen: 'Forlænget + straffe', pen: 'Straffe', gg: 'Golden goal + straffe' })[c.tie],
    body: c => fseg('tie', [['etpen', 'Forlænget + straffe'], ['pen', 'Straffe'], ['gg', 'Golden goal + straffe']], 'Når en knockout-kamp står lige') +
      fseg('order', [['h2h', 'Indbyrdes først'], ['gd', 'Målforskel først']], 'Ved pointlighed i ligaer og grupper') +
      help('"Indbyrdes først" er reglen ved VM 2026. "Målforskel først" er den klassiske regel, som fx Premier League bruger.')
  },
  {
    id: 'ffinal', title: 'Finale og placeringer',
    sum: c => (c.finalKind === 'bo3' ? 'Bedst af 3' : 'Én kamp') + (c.format === 'ko' || c.format === 'grp' ? (c.bronze ? ' · bronzekamp' : '') : ''),
    body: c => (c.format === 'rr' || c.format === 'kot' ? help('I denne form er der ingen finale. Stillingen afgør.') :
      fseg('finalKind', [['ko1', 'Én kamp'], ['bo3', 'Bedst af 3']], 'Finalen') +
      (c.format === 'de' ? fseg('gfReset', [[true, 'Ja'], [false, 'Nej']], 'Ekstra finale, hvis vinderen af taberbanen vinder den første?') : '') +
      (c.format === 'ko' || c.format === 'grp' ? fseg('bronze', [[true, 'Ja'], [false, 'Nej']], 'Kamp om 3.-pladsen') : ''))
  },
  {
    id: 'fteams', title: 'Deltagere og lodtrækning', only: 'setup',
    sum: c => (c.size === 1 ? '1 mod 1' : '2 mod 2') + ' · ' + (c.seed === 'random' ? 'tilfældig' : 'som listen'),
    body: c => fseg('size', [[1, '1 mod 1'], [2, '2 mod 2']], 'Spillere pr. hold') + fseg('seed', [['random', 'Tilfældig'], ['list', 'Som listen']], 'Lodtrækning')
  },
  {
    id: 'freset', title: 'Nulstil', only: 'play',
    sum: () => '',
    body: () => `<div class="btnrow">${confirmBtn('fresetres', 'fresetres', 'Nulstil resultater')}${confirmBtn('fdelgame', 'fdelgame', 'Slet spillet', 'danger')}</div>` + help('Nulstil resultater beholder deltagerne og laver en ny lodtrækning.')
  }
];
function fBuildSettings() {
  const ctx = view === 'fcplay' ? 'play' : 'setup';
  document.getElementById('fcsettings').innerHTML = FCATS.filter(c => !c.only || c.only === ctx).map(cat =>
    `<details class="panel cat" data-cat="${cat.id}"${openCats.has(cat.id) ? ' open' : ''}>
      <summary><span class="ct">${cat.title}</span><span class="cs">${esc(cat.sum(F.cfg))}</span>
      <svg class="chev" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
      <div class="cb">${cat.body(F.cfg)}</div>
    </details>`).join('');
}

/* ---------- Setup ---------- */
function fBuildEnts() {
  const two = F.cfg.size === 2;
  document.getElementById('fcents').innerHTML = F.ents.length ? F.ents.map((t, i) => `<div class="bteam">
      <div class="bteam-top">${fcTour() ? entIcon(t.id, 28) : shirt(t.id, 28)}<input class="nameinp" id="fe-${t.id}" data-nav="fcs" enterkeyhint="next" type="text" maxlength="${two ? 24 : 16}" autocomplete="off" placeholder="${two ? 'Holdnavn (valgfrit)' : 'Navn'}" data-kind="${two ? 'ft' : 'fm'}" data-n="${t.id}"${two ? '' : ' data-i="0"'} value="${esc(two ? t.name || '' : t.p[0] || '')}" aria-label="${two ? 'Holdnavn' : 'Navn'} ${i + 1}">
      <button type="button" class="rm" id="frm-${t.id}" data-act="frm" data-n="${t.id}" data-label="Fjern" data-confirm="Sikker?" aria-label="Fjern ${i + 1}">Fjern</button></div>
      <div class="bteam-ps">${two ? [0, 1].map(j => `<input class="nameinp" id="fm-${t.id}-${j}" data-nav="fcs" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${j + 1}" data-kind="fm" data-n="${t.id}" data-i="${j}" value="${esc(t.p[j] || '')}">`).join('') : ''}
      ${F.cfg.pick === 'club' ? (fcTour() && tClub(t.id) ? `<span class="tclub small"><span>${esc(tClub(t.id).n)} <b class="stars">${starText(tClub(t.id).s)}</b></span>${diceBtn('ftclub', t.id)}</span>` : '') : `<input class="nameinp clubinp" id="fk-${t.id}" data-nav="fcs" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="Hold i spillet (valgfrit)" data-kind="fk" data-n="${t.id}" value="${esc(t.club || '')}">`}</div>
    </div>`).join('') : `<p class="emptyp">Ingen deltagere endnu. Tryk på Tilføj for at komme i gang.</p>`;
  const add = document.getElementById('fcadd');
  add.disabled = F.ents.length >= FC_MAX;
  add.textContent = F.ents.length >= FC_MAX ? `Der kan højst være ${FC_MAX}` : (two ? 'Tilføj hold' : 'Tilføj spiller');
  const hint = document.getElementById('fcenthint');
  if (hint) hint.textContent = F.cfg.pick !== 'club' ? 'Skriv navnene. Hold i spillet er valgfrit, fx hvis alle har et fast hold.' : fcTour() ? 'Skriv navnene. Hver deltager har fået en tilfældig klub. Terningen trækker en ny.' : 'Skriv navnene. Klubberne trækkes til hver kamp, når turneringen er startet.';
  if (fStarsDirty) { fStarsDirty = false; save(); }
}
function fNextColor() { const used = new Set(F.ents.map(t => t.color)); return PALETTE.find(c => !used.has(c.id)); }
function fAddEnt(name, players, club) {
  const c = fNextColor();
  if (!c) return null;
  F.seq++;
  const id = 'f' + F.seq;
  F.ents.push({ id, color: c.id, name: (name || '').trim(), p: players || ['', ''], club: (club || '').trim(), out: false });
  return id;
}
function fUpdateSetupSummary() {
  const n = F.ents.length, f = FCF[F.cfg.format];
  const ok = n >= f.min;
  document.getElementById('fcstart').disabled = !ok;
  const unit = F.cfg.size === 2 ? ['hold', 'hold'] : ['spiller', 'spillere'];
  document.getElementById('fcsum').textContent = ok ? `${plural(n, ...unit)} · ${f.name} · ${F.cfg.half} min. halvlege` : `${f.name} kræver mindst ${f.min} ${F.cfg.size === 2 ? 'hold' : 'spillere'}.`;
  document.getElementById('fcsub').textContent = n ? `${plural(n, ...unit)} · ${f.name}` : 'Tilføj deltagere for at starte';
}

/* ---------- Play ---------- */
function entLine(id, extra, rec) {
  if (id === 'BYE') return '<span class="tl muted">Fri runde</span>';
  const out = E(id) && E(id).out;
  const r = rec || tClub(id);
  const sub = esc([eSub(id), r ? r.n : ''].filter(Boolean).join(' · ')) + (r ? ` <b class="stars sstars">${starText(r.s)}</b>` : '');
  return `<span class="tl">${entIcon(id, 26, r)}<span class="tl-txt"><span class="tl-name">${esc(eName(id))}${out ? ' <em class="goneTag">trukket sig</em>' : ''}</span>${sub ? `<small>${sub}</small>` : ''}</span>${extra || ''}</span>`;
}
function fSrc(s, S2) {
  if (!s) return '';
  if (s.t) return eName(s.t);
  const id = s.w || s.l, o = S2.O[id];
  if (o && o.state === 'bye') return eName(s.w ? o.win : o.lose);
  return `${s.w ? 'Vinder' : 'Taber'} af kamp ${S2.num[id] || '?'}`;
}
function fNeededGames(o) {
  const k = o.m.kind, gs = o.games || [];
  if (k === 'ko2') return gs[0] && gs[0].done ? 2 : 1;
  if (k === 'bo3') {
    if (o.state === 'done') return gs.length;
    let n = 0;
    for (const g of gs) { n++; if (!g.done || fGameWinner(g) === 'draw') return n; }
    return n + 1;
  }
  return 1;
}
function diceBtn(act, id, label) { return `<button type="button" class="dice" data-act="${act}" data-m="${id}" data-n="${id}" aria-label="${label || 'Træk ny klub'}">${diceSvg}</button>`; }
function fClubRow(id, o, cl) {
  if (!cl || o.state === 'done' || o.state === 'wo') return '';
  return `<div class="starrow"><span>Spil med de trukne klubber</span>${diceBtn('fclub', id, 'Træk nye klubber')}</div>`;
}
function fMatchCard(id, S2, opts) {
  const o = S2.O[id], m = o.m, c = F.cfg;
  const isNext = S2.next === id;
  const tag = m.kind === 'ko2' ? 'hjemme og ude' : m.kind === 'bo3' ? 'bedst af 3' : '';
  const st = o.tie ? ['Står lige', 's-next'] : ({ wait: ['Venter', 's-open'], ready: [isNext ? 'Næste' : 'Klar', isNext ? 's-next' : 's-open'], live: ['I gang', 's-next'], done: ['Færdig', 's-done'], wo: ['Walkover', 's-done'] }[o.state] || ['', '']);
  const head = `<header><h3>${m.id === 'kcur' ? 'Kampen ved skærmen' : m.id === 'sfin' ? 'Finalen' : `Kamp ${S2.num[id]}`}${tag ? ` <small class="four">${tag}</small>` : ''}</h3><span class="lights ${st[1]}"><i></i><i></i><i></i><b>${st[0]}</b></span></header>`;
  if (o.state === 'wait') {
    return `<article class="panel card bmatch wait">${head}<div class="mrow">${o.A ? entLine(o.A) : `<span class="tl muted">${esc(fSrc(m.a, S2))}</span>`}</div><div class="vs">mod</div><div class="mrow">${o.B ? entLine(o.B) : `<span class="tl muted">${esc(fSrc(m.b || {}, S2))}</span>`}</div></article>`;
  }
  const showScore = (o.games || []).some(g => g.done);
  const sc = side => m.kind === 'bo3' && showScore ? `<b class="mscore">${side === 'a' ? o.wa || 0 : o.wb || 0}</b>` : showScore ? `<b class="mscore">${side === 'a' ? o.ga : o.gb}</b>` : '';
  const won = side => o.win && (side === 'a' ? o.win === o.A : o.win === o.B);
  const cl = mClubs(id, o);
  let body = `<div class="mrow${won('a') ? ' won' : ''}">${entLine(o.A, sc('a'), cl && cl.a)}</div><div class="vs">${m.kind === 'ko2' && showScore ? 'samlet' : 'mod'}</div><div class="mrow${won('b') ? ' won' : ''}">${entLine(o.B, sc('b'), cl && cl.b)}</div>`;
  if (o.state === 'wo') return `<article class="panel card bmatch">${head}${body}<p class="help">${esc(eName(o.win))} går videre, fordi ${esc(eName(o.lose))} har trukket sig.</p></article>`;
  body += fClubRow(id, o, cl);
  const editing = o.state !== 'done' || fcEdit.has(id) || (opts && opts.open && o.state !== 'done');
  if (!editing) {
    const tb = (o.games || []).map(g => g.tb).filter(Boolean).pop();
    const how = tb ? { et: ' efter forlænget spilletid', pen: ' efter straffe', gg: ' på golden goal', stay: '' }[tb.how] || '' : (m.stay && o.ga === o.gb ? ' (uafgjort, bliver ved skærmen)' : '');
    const txt = o.draw ? `Uafgjort ${o.ga}–${o.gb}` : `${esc(eName(o.win))} vandt${how}${m.kind === 'bo3' ? ` ${Math.max(o.wa, o.wb)}–${Math.min(o.wa, o.wb)} i kampe` : ` ${Math.max(o.ga, o.gb)}–${Math.min(o.ga, o.gb)}`}`;
    return `<article class="panel card bmatch done">${head}${body}<div class="mdone"><span>${txt}</span><button type="button" class="setbtn" data-act="fedit" data-m="${id}">Ret</button></div></article>`;
  }
  const res = F.res[id] || { games: [] };
  const n = fNeededGames(o);
  const short = x => esc(eName(x));
  for (let g = 0; g < n; g++) {
    const gm = res.games[g] || { ga: 0, gb: 0, done: false };
    const label = m.kind === 'ko2' ? (g ? 'Returkamp' : '1. kamp') : m.kind === 'bo3' ? `Kamp ${g + 1}` : 'Resultat';
    const stepper = (side) => {
      const v = side === 'a' ? gm.ga : gm.gb;
      return `<div class="goalrow"><span class="gname">${short(side === 'a' ? o.A : o.B)}</span><div class="stepper goal"><button type="button" data-act="fgoal" data-m="${id}" data-g="${g}" data-s="${side}" data-d="-1" aria-label="Et mål mindre"${v <= 0 ? ' disabled' : ''}>−</button><output>${v}</output><button type="button" data-act="fgoal" data-m="${id}" data-g="${g}" data-s="${side}" data-d="1" aria-label="Et mål mere">+</button></div></div>`;
    };
    body += `<div class="game"><div class="flabel">${label}${m.kind === 'ko2' && g ? ` <span class="muted">(${short(o.B)} hjemme)</span>` : m.kind === 'ko2' ? ` <span class="muted">(${short(o.A)} hjemme)</span>` : ''}</div>${stepper('a')}${stepper('b')}
      <div class="btnrow">${gm.done ? '<span class="saved">Gemt</span>' : `<button type="button" class="setbtn go" data-act="fsave" data-m="${id}" data-g="${g}">Gem resultat</button>`}</div>`;
    const lastNeeded = m.kind === 'ko2' ? g === 1 : true;
    const level = m.kind === 'ko2' ? (res.games[0] && res.games[1] && res.games[0].done && gm.done && (res.games[0].ga + gm.ga) === (res.games[0].gb + gm.gb)) : gm.done && gm.ga === gm.gb;
    if (m.kind !== 'single' && lastNeeded && level && !m.stay) {
      const hows = { etpen: [['et', 'Forlænget'], ['pen', 'Straffe']], pen: [['pen', 'Straffe']], gg: [['gg', 'Golden goal'], ['pen', 'Straffe']] }[c.tie];
      const tb = gm.tb || {};
      body += `<div class="tiebox"><div class="flabel">Det står lige. Hvem vandt?</div>
        <div class="seg wins" role="group" aria-label="Vinder">${['a', 'b'].map(s => `<button type="button" data-act="ftb" data-m="${id}" data-g="${g}" data-s="${s}" aria-pressed="${tb.w === s}">${short(s === 'a' ? o.A : o.B)}</button>`).join('')}</div>
        ${hows.length > 1 ? `<div class="seg" role="group" aria-label="Hvordan">${hows.map(([v, l]) => `<button type="button" data-act="fhow" data-m="${id}" data-g="${g}" data-v="${v}" aria-pressed="${(tb.how || hows[hows.length - 1][0]) === v}">${l}</button>`).join('')}</div>` : ''}</div>`;
    }
    body += '</div>';
  }
  if (o.state === 'done' && fcEdit.has(id)) body += `<div class="mdone"><span>${o.draw ? 'Uafgjort' : esc(eName(o.win)) + ' vandt'}</span><button type="button" class="setbtn" data-act="fedit" data-m="${id}">Færdig</button></div>`;
  return `<article class="panel card bmatch${isNext ? ' is-next' : ''}">${head}${body}</article>`;
}
function fStandTable(tb) {
  const kot = tb.kot;
  let h = kot ? `<tr><th>#</th><th class="l">Deltager</th><th>K</th><th>V</th><th>T</th><th>I træk</th><th>Mål</th></tr>`
    : `<tr><th>#</th><th class="l">Deltager</th><th>K</th><th>V</th><th>U</th><th>T</th><th>Mål</th><th>Point</th></tr>`;
  tb.rows.forEach((r, k) => {
    const adv = tb.adv && k < tb.adv;
    h += `<tr class="${adv ? 'fin' : ''}"><td class="rank"><span class="medal ${k < 3 && r.P ? 'm' + (k + 1) : 'plain'}">${k + 1}</span></td><td class="l">${entLine(r.id)}</td><td>${r.P}</td><td>${r.W}</td>` +
      (kot ? `<td>${r.L}</td><td class="pts">${r.best}</td>` : `<td>${r.D}</td><td>${r.L}</td>`) +
      `<td class="gd">${r.GF}–${r.GA}</td>${kot ? '' : `<td class="pts">${r.Pts}</td>`}</tr>`;
  });
  return `${tb.title ? `<h3 class="tbtitle">${tb.title}</h3>` : ''}<div class="panel tablebox"><table>${h}</table></div>`;
}
function fRender() {
  const c = F.cfg, f = c.format;
  document.getElementById('navtitle').textContent = view === 'fcsetup' ? 'Nyt spil' : 'FIFA';
  document.getElementById('fctitle').textContent = view === 'fcsetup' ? 'Nyt spil: FIFA' : 'FIFA-turnering';
  if (view === 'fcsetup') { fUpdateSetupSummary(); return; }
  const S2 = fStructure();
  const nAct = fActive().length;
  document.getElementById('fcsub').textContent = `${plural(nAct, c.size === 2 ? 'hold' : 'spiller', c.size === 2 ? 'hold' : 'spillere')} · ${FCF[f].name} · ${c.half} min. halvlege`;
  setHTML(document.getElementById('fcinfo'), F.info ? `<div class="panel note">${esc(F.info)}</div>` : '');
  let win = '';
  if (S2.done && S2.places && S2.places[0]) {
    win = `<div class="panel winner bpwin">${trophy}<span>${esc(eName(S2.places[0]))} vinder!</span></div>` +
      (S2.places.length > 1 ? `<div class="panel places">${S2.places.slice(1, 3).map((id, i) => `<div class="prow"><span class="medal m${i + 2}">${i + 2}</span>${entLine(id)}</div>`).join('')}</div>` : '');
  }
  setHTML(document.getElementById('fcwinner'), win);
  const nx = S2.next;
  document.getElementById('fcnextsec').hidden = !nx || f === 'kot';
  document.getElementById('fcnext').innerHTML = nx && f !== 'kot' ? fMatchCard(nx, S2, { open: true }) : '';
  const rl = fcRuleLines(c);
  document.getElementById('fcrules').innerHTML = `<details class="panel cat rulecard"${openCats.has('fcrulecard') ? ' open' : ''} data-cat="fcrulecard"><summary><span class="ct">Aftalte regler</span><span class="cs">${esc(FC_HOUSE[c.house][0])}</span><svg class="chev" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M4 7l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></summary>
    <div class="cb"><dl class="rules-dl">${rl.map(([t, d]) => `<div><dt>${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl></div></details>`;
  document.getElementById('fcstandsec').hidden = !S2.tables.length;
  document.getElementById('fcstandhint').textContent = f === 'kot'
    ? 'K er kampe, V sejre og T nederlag. "I træk" er den længste stime af sejre.'
    : 'K er kampe, V sejre, U uafgjorte og T nederlag.' + (f === 'grp' ? ' De markerede går videre til slutspillet.' : f === 'sw' && c.swFinal ? ' De to øverste spiller finale.' : '');
  document.getElementById('fcstand').innerHTML = S2.tables.map(fStandTable).join('');
  let list = '';
  if (f === 'kot') {
    const q = F.kq.filter(id => E(id) && !E(id).out);
    list += S2.M.length ? fMatchCard('kcur', S2, { open: true }) : '';
    if (q.length > 2) list += `<div class="panel queue"><div class="flabel">I køen</div>${q.slice(2).map((id, i) => `<div class="prow"><span class="medal plain">${i + 1}</span>${entLine(id)}</div>`).join('')}</div>`;
    if (F.klog.length) list += `<div class="panel queue"><div class="flabel">Spillede kampe</div>${F.klog.map((e, i) => `<div class="prow"><span class="klog"><b>${esc(eName(e.win))}</b> slog ${esc(eName(e.lose))} ${Math.max(e.ga, e.gb)}–${Math.min(e.ga, e.gb)}</span>${i === F.klog.length - 1 ? '<button type="button" class="setbtn" data-act="fundo">Fortryd</button>' : ''}</div>`).reverse().join('')}</div>`;
    if (!S2.done) list += `<div class="btnrow">${confirmBtn('fend', 'fend', 'Afslut turneringen')}</div>`;
  } else {
    const sit = {};
    S2.M.forEach(m => { if (m.sec && m.kind === 'single') (sit[m.sec] = sit[m.sec] || new Set()).add(m.a.t).add(m.b.t); });
    const sitText = title => {
      if (!sit[title] || f === 'sw') return '';
      const mm = S2.M.find(m => m.sec === title);
      const pool = f === 'grp' ? (F.groups[mm.grp] || []) : F.order;
      const out = pool.filter(id => !sit[title].has(id) && E(id) && !E(id).out);
      return out.length ? `<small class="sit">${esc(out.map(eName).join(', '))} sidder over</small>` : '';
    };
    const swBye = title => {
      if (f !== 'sw') return '';
      const by = S2.M.find(m => m.sec === title && m.b.t === 'BYE');
      return by ? `<small class="sit">${esc(eName(by.a.t))} har fri runde og får 3 point</small>` : '';
    };
    list = S2.sections.map(s => `<h3 class="sechead">${esc(s.title)}${sitText(s.title)}${swBye(s.title)}</h3><div class="rounds">${s.ids.map(id => fMatchCard(id, S2)).join('')}</div>`).join('');
    if (f === 'grp' && !S2.M.some(m => m.id.startsWith('k'))) list += '<div class="panel empty">Slutspillet bliver lavet, når alle gruppekampe er spillet.</div>';
    if (f === 'sw' && !S2.done) {
      const cur = F.sw.length ? Math.max(...F.sw.map(m => m.round)) : 0;
      if (cur < fSwRounds()) list += `<div class="panel empty">Runde ${cur + 1} af ${fSwRounds()} bliver parret, når runde ${cur} er spillet.</div>`;
    }
  }
  document.getElementById('fcmatches').innerHTML = list || '<div class="panel empty">Der er ingen kampe endnu.</div>';
  document.getElementById('fcmatchtitle').textContent = f === 'kot' ? 'Ved skærmen' : f === 'rr' ? 'Kampprogram' : 'Kampe';
  document.getElementById('fc-add').disabled = nAct >= FC_MAX;
  if (fStarsDirty) { fStarsDirty = false; save(); }
}
function fRenderPanel() {
  const el = document.getElementById('fcpanel');
  if (!fcPanel) { if (el.querySelector('.sheet')) sheetOut(el); document.documentElement.style.overflow = ''; return; }
  el._token = (el._token || 0) + 1;
  const two = F.cfg.size === 2;
  let inner = '';
  if (fcPanel === 'add') {
    const canAdd = !fHasResults() || ['rr', 'kot'].includes(F.cfg.format);
    const c = fNextColor();
    inner = `<header><h3 id="fch">${two ? 'Nyt hold' : 'Ny spiller'}</h3></header>` + (!c ? help(`Der kan højst være ${FC_MAX}.`) : !canAdd
      ? help(`I ${FCF[F.cfg.format].name.toLowerCase()} kan der ikke komme nye deltagere ind, når der er spillet kampe. Det ville gøre lodtrækningen uretfærdig. Nulstil resultaterne for at lave en ny lodtrækning.`)
      : `<label class="addrow" for="fcn-name">${shirt(null, 28).replace('#8e8e93', c.color)}<span class="clabel">${c.label}</span><input class="nameinp" id="fcn-name" data-nav="fca" enterkeyhint="next" type="text" maxlength="24" autocomplete="off" placeholder="${two ? 'Holdnavn (valgfrit)' : 'Navn'}"></label>
        ${two ? [0, 1].map(i => `<input class="nameinp" id="fcn-p${i}" data-nav="fca" enterkeyhint="next" type="text" maxlength="16" autocomplete="off" placeholder="Spiller ${i + 1}">`).join('') : ''}
        ${F.cfg.pick === 'club' ? '' : '<input class="nameinp" id="fcn-club" data-nav="fca" enterkeyhint="done" type="text" maxlength="24" autocomplete="off" placeholder="Hold i spillet (valgfrit)">'}
        ${help(F.cfg.format === 'kot' ? 'Den nye stiller sig bagerst i køen.' : fHasResults() ? 'Den nye får kampe mod alle de andre, og de lægges ind, hvor der er plads i programmet.' : 'Lodtrækningen bliver lavet om.')}`) +
      `<div class="btnrow"><button type="button" class="setbtn" data-act="fclose">${c && canAdd ? 'Annuller' : 'Luk'}</button>${c && canAdd ? '<button type="button" class="setbtn go" data-act="faddconfirm">Tilføj</button>' : ''}</div>`;
  } else {
    inner = `<header><h3 id="fch">Hvem trækker sig?</h3></header><div>${fActive().map(id => `<div class="prow">${entLine(id)}<button type="button" class="rm" id="fwd-${id}" data-act="fwd" data-n="${id}" data-label="Trækker sig" data-confirm="Tryk igen">Trækker sig</button></div>`).join('')}</div>
      ${help('De resterende kampe bliver givet som walkover. I ligaer og grupper tæller en walkover som 3–0. Spillede kampe bliver ikke ændret.')}
      <div class="btnrow"><button type="button" class="setbtn" data-act="fclose">Annuller</button></div>`;
  }
  el.innerHTML = `<button type="button" class="scrim" data-act="fclose" aria-label="Luk"></button><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="fch"><div class="grabber" aria-hidden="true"></div>${inner}</div>`;
  document.documentElement.style.overflow = 'hidden';
  const fi = document.getElementById('fcn-name');
  if (fi) fi.focus();
}
function fAll() {
  if (view === 'fcsetup') fBuildEnts();
  fBuildSettings();
  fRender();
}

/* ---------- Actions ---------- */
function fSetCfg(k, v) {
  if (F.cfg[k] === v) return;
  F.cfg[k] = v;
  if (view === 'fcplay' && ['format', 'meets', 'groups', 'adv', 'swRounds'].includes(k) && !fHasResults()) { fSeed(); F.info = 'Lodtrækningen er lavet om.'; }
  if (['ver', 'gen', 'smin', 'smax', 'cmode', 'pick'].includes(k)) {
    if (k === 'smin' && F.cfg.smax < v) F.cfg.smax = v;
    if (k === 'smax' && F.cfg.smin > v) F.cfg.smin = v;
    if (k === 'ver' || k === 'gen') { const L0 = F.cfg.smin, H0 = F.cfg.smax; fcClamp(F.cfg); if (!fcPool(F.cfg).length) { const L = fcLevels(F.cfg); F.cfg.smin = L[0]; F.cfg.smax = L[L.length - 1]; } void L0; void H0; }
    fcClamp(F.cfg);
    F.tclub = {};
    const S2 = view === 'fcplay' ? fStructure() : null;
    Object.keys(F.clubs).forEach(m => { if (!S2 || !S2.O[m] || S2.O[m].state !== 'done') delete F.clubs[m]; });
  }
  if (view === 'fcsetup' && k === 'size') fBuildEnts();
  save();
  fAll();
}
function fAfterResult(mid) {
  F.info = '';
  const S2 = fStructure();
  const o = S2.O[mid];
  if (mid === 'kcur' && o && o.state === 'done') {
    F.klog.push({ a: o.A, b: o.B, win: o.win, lose: o.lose, ga: o.ga, gb: o.gb, games: JSON.parse(JSON.stringify(o.games)), prevQ: [...F.kq] });
    F.kq = [o.win, ...F.kq.filter(x => x !== o.win && x !== o.lose), o.lose];
    delete F.res.kcur;
    delete F.stars.kcur;
    if (F.clubs.kcur) { F.klog[F.klog.length - 1].clubs = F.clubs.kcur; delete F.clubs.kcur; }
    haptic(12);
  } else if (o && o.state === 'done') haptic(12);
  if (F.cfg.format === 'sw') {
    const cur = F.sw.length ? Math.max(...F.sw.map(m => m.round)) : 0;
    const S3 = fStructure();
    const roundDone = S3.M.filter(m => m.round === cur).every(m => fDecided(S3.O[m.id]) || S3.O[m.id].state === 'bye');
    if (roundDone && fSwissNext()) F.info = `Runde ${cur + 1} er parret.`;
  }
  save();
  fRender();
}
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'newfc') { go('ny-fc'); return; }
  if (!act.startsWith('f')) return;
  if (act === 'fset') {
    const k = b.dataset.k;
    let v = b.dataset.v;
    if (FC_NUM.has(k)) v = +v; else if (v === 'true' || v === 'false') v = v === 'true';
    fSetCfg(k, v);
  } else if (act === 'faddent') {
    const id = fAddEnt('', ['', '']);
    save(); fBuildEnts(); fBuildSettings(); fRender();
    const inp = id && document.getElementById(`fe-${id}`);
    if (inp) inp.focus();
  } else if (act === 'frm') {
    if (!confirmed(b)) return;
    F.ents = F.ents.filter(t => t.id !== b.dataset.n);
    save(); fBuildEnts(); fRender();
  } else if (act === 'fstart') {
    if (F.ents.length < FCF[F.cfg.format].min) return;
    const g = F;
    g.id = 'g' + Date.now().toString(36);
    g.created = Date.now();
    withF(g, fSeed);
    g.info = '';
    store.games.unshift(g);
    store.lastFcCfg = Object.assign({}, g.cfg);
    store.draftFc = null;
    save();
    go('spil-' + g.id);
  } else if (['fgoal', 'fsave', 'ftb', 'fhow'].includes(act)) {
    const mid = b.dataset.m, gi = +b.dataset.g;
    const o = fStructure().O[mid];
    if (!o || !o.A || !o.B) return;
    const r = F.res[mid] && F.res[mid].a === o.A && F.res[mid].b === o.B ? F.res[mid] : (F.res[mid] = { a: o.A, b: o.B, games: [] });
    const gm = r.games[gi] || (r.games[gi] = { ga: 0, gb: 0, done: false });
    if (act === 'fgoal') {
      const k = b.dataset.s === 'a' ? 'ga' : 'gb';
      gm[k] = Math.max(0, Math.min(99, gm[k] + +b.dataset.d));
      if (gm.tb) delete gm.tb;
    } else if (act === 'fsave') {
      gm.done = true;
      r.games.length = gi + 1;
    } else if (act === 'ftb') {
      const defHow = { etpen: 'pen', pen: 'pen', gg: 'pen' }[F.cfg.tie];
      gm.tb = gm.tb && gm.tb.w === b.dataset.s ? null : { w: b.dataset.s, how: (gm.tb && gm.tb.how) || defHow };
      if (!gm.tb) delete gm.tb;
    } else if (act === 'fhow') {
      gm.tb = Object.assign({ w: null }, gm.tb || {}, { how: b.dataset.v });
    }
    fAfterResult(mid);
  } else if (act === 'fclub') {
    delete F.clubs[b.dataset.m];
    haptic(8);
    save(); fRender();
  } else if (act === 'ftclub') {
    const id = b.dataset.n, old = F.tclub[id];
    delete F.tclub[id];
    const used = Object.keys(F.tclub).filter(e => E(e) && !E(e).out).map(e => F.tclub[e].n);
    const r = fcDraw(old ? [...used, old.n] : used) || old;
    if (r) F.tclub[id] = r;
    haptic(8);
    save(); fAll();
  } else if (act === 'ftall') {
    F.tclub = {};
    haptic(8);
    save(); fAll();
  } else if (act === 'fedit') {
    const id = b.dataset.m;
    if (fcEdit.has(id)) fcEdit.delete(id); else fcEdit.add(id);
    fRender();
  } else if (act === 'fundo') {
    const e2 = F.klog.pop();
    if (!e2) return;
    F.kq = e2.prevQ;
    F.res.kcur = { a: e2.a, b: e2.b, games: e2.games };
    F.ended = false;
    save(); fRender();
  } else if (act === 'fend') {
    if (!confirmed(b)) return;
    F.ended = true;
    save(); fRender();
  } else if (act === 'fopenadd') {
    fcPanel = fcPanel === 'add' ? null : 'add'; fRenderPanel();
  } else if (act === 'fopenwd') {
    fcPanel = fcPanel === 'wd' ? null : 'wd'; fRenderPanel();
  } else if (act === 'fclose') {
    fcPanel = null; disarm(); fRenderPanel();
  } else if (act === 'faddconfirm') {
    const v = id2 => (document.getElementById(id2) || {}).value || '';
    const two = F.cfg.size === 2;
    const had = fHasResults();
    const id = fAddEnt(two ? v('fcn-name') : '', two ? [v('fcn-p0'), v('fcn-p1')] : [v('fcn-name'), ''], v('fcn-club'));
    if (!id) return;
    if (!had) { fSeed(); F.info = `${eName(id)} er med. Lodtrækningen er lavet om.`; }
    else if (F.cfg.format === 'kot') { F.kq.push(id); F.info = `${eName(id)} står bagerst i køen.`; }
    else if (F.cfg.format === 'rr') {
      const others = fActive().filter(x => x !== id);
      const occ = {};
      F.rr.forEach(m => { (occ[m.round] = occ[m.round] || new Set()).add(m.a.t).add(m.b.t); });
      const S2 = fStructure();
      const open = F.rr.filter(m => !fDecided(S2.O[m.id])).map(m => m.round);
      const start = open.length ? Math.min(...open) : Math.max(0, ...F.rr.map(m => m.round)) + 1;
      for (let leg = 0; leg < F.cfg.meets; leg++) {
        others.forEach(ot => {
          let r = start;
          while (occ[r] && (occ[r].has(ot) || occ[r].has(id))) r++;
          (occ[r] = occ[r] || new Set()).add(ot).add(id);
          F.seq++;
          F.rr.push({ id: 'x' + F.seq, a: leg % 2 ? { t: id } : { t: ot }, b: leg % 2 ? { t: ot } : { t: id }, round: r, sec: `Runde ${r}` });
        });
      }
      F.rr.sort((x, y) => x.round - y.round);
      F.info = `${eName(id)} er med og har fået ${plural(others.length * F.cfg.meets, 'kamp', 'kampe')} i programmet.`;
    }
    fcPanel = null;
    save(); fRenderPanel(); fBuildSettings(); fRender();
  } else if (act === 'fwd') {
    if (!confirmed(b)) return;
    const t = E(b.dataset.n);
    t.out = true;
    if (F.res.kcur && (F.res.kcur.a === t.id || F.res.kcur.b === t.id)) delete F.res.kcur;
    F.info = `${eName(t.id)} har trukket sig. De resterende kampe er givet som walkover.`;
    haptic(20);
    fcPanel = null;
    save(); fRenderPanel(); fBuildSettings(); fRender();
  } else if (act === 'fresetres') {
    if (!confirmed(b)) return;
    F.ents.forEach(t => { t.out = false; });
    fSeed();
    F.info = 'Resultaterne er nulstillet, og der er lavet en ny lodtrækning.';
    fcEdit.clear();
    save(); fAll();
  } else if (act === 'fdelgame') {
    if (!confirmed(b)) return;
    store.games = store.games.filter(x => x.id !== F.id);
    save();
    go('');
  }
});
document.addEventListener('input', e => {
  const t = e.target, kind = t.dataset && t.dataset.kind;
  if (!['ft', 'fm', 'fk'].includes(kind)) return;
  const ent = E(t.dataset.n);
  if (!ent) return;
  if (kind === 'ft') ent.name = t.value; else if (kind === 'fk') ent.club = t.value; else ent.p[+t.dataset.i] = t.value;
  save();
  if (view === 'fcsetup') fUpdateSetupSummary(); else fRender();
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && fcPanel) { fcPanel = null; fRenderPanel(); }
});

