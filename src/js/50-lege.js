/* ================= Drukspil og lege ================= */
const LG_CAT = Object.fromEntries(LG_CATS.map(([id, label, color]) => [id, { label, color }]));
const LG_GLYPH = {
  kort: '<rect x="18" y="14" width="22" height="32" rx="4" fill="none" stroke="#fff" stroke-width="3.2" transform="rotate(-10 29 30)"/><rect x="25" y="17" width="22" height="32" rx="4" fill="#fff" fill-opacity=".25" stroke="#fff" stroke-width="3.2" transform="rotate(10 36 33)"/>',
  terning: '<rect x="16" y="16" width="32" height="32" rx="8" fill="none" stroke="#fff" stroke-width="3.4"/><circle cx="25" cy="25" r="3" fill="#fff"/><circle cx="32" cy="32" r="3" fill="#fff"/><circle cx="39" cy="39" r="3" fill="#fff"/>',
  kop: '<path d="M20 18h24l-3 30H23z" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><circle cx="44" cy="17" r="5" fill="#fff"/>',
  snak: '<path d="M16 20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v13a6 6 0 0 1-6 6H30l-8 7v-7a6 6 0 0 1-6-6z" fill="none" stroke="#fff" stroke-width="3.4" stroke-linejoin="round"/><circle cx="25" cy="27" r="2.4" fill="#fff"/><circle cx="32" cy="27" r="2.4" fill="#fff"/><circle cx="39" cy="27" r="2.4" fill="#fff"/>',
  hurtig: '<path d="M35 12 20 35h11l-3 17 16-24H33z" fill="#fff"/>',
  timer: '<circle cx="32" cy="35" r="15" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M32 27v9l6 4M27 14h10" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/>',
  leg: '<circle cx="24" cy="24" r="6" fill="none" stroke="#fff" stroke-width="3.2"/><circle cx="41" cy="24" r="6" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M14 46c1-7 5-11 10-11s9 4 10 11M31 46c1-7 5-11 10-11s9 4 10 11" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round"/>'
};
function lgIcon(cat, size) {
  const c = LG_CAT[cat];
  return `<svg class="lgicon" width="${size || 40}" height="${size || 40}" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="${c.color}"/>${LG_GLYPH[cat]}</svg>`;
}
const lgEmblemSvg = `<svg class="bpemblem" viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#e8346a"/><path d="M14 20h18l-2.4 28H16.4z" fill="none" stroke="#fff" stroke-width="3.2" stroke-linejoin="round"/><path d="M15 28h16" stroke="#fff" stroke-width="3.2"/><rect x="34" y="26" width="18" height="18" rx="4.5" fill="#fff" transform="rotate(12 43 35)"/><circle cx="39.6" cy="31.4" r="1.9" fill="#e8346a"/><circle cx="46" cy="38.8" r="1.9" fill="#e8346a"/><circle cx="42.8" cy="35.1" r="1.9" fill="#e8346a"/></svg>`;
const LG_TOOLNAME = { pig: 'Terning og point', kings: 'Kortbunke med regler', deck: 'Kortbunke', meyer: 'Meyer-bæger', dice: 'Terninger', bp: 'Turnering', 'timer:hour': 'Timer', 'timer:60': 'Timer', bomb: 'Bombe', spin: 'Tilfældig person', roles: 'Rollefordeler', spy: 'Rollefordeler', words: 'Ord og timer' };
function lgToolName(t) { return !t ? '' : t.startsWith('deck:') ? 'Kort med spørgsmål' : LG_TOOLNAME[t] || ''; }
function lgPlayers(p) { return p[1] ? (p[0] === p[1] ? `${p[0]} spillere` : `${p[0]}–${p[1]} spillere`) : `${p[0]}+ spillere`; }

const lgS = { cat: 'alle', q: '' };
let lgT = {};
let lgTick = null;
let lgAudio = null;
function lgStop() { if (lgTick) { clearInterval(lgTick); lgTick = null; } }
function lgBeep(freq, ms, vol) {
  try {
    lgAudio = lgAudio || new (window.AudioContext || window.webkitAudioContext)();
    const o = lgAudio.createOscillator(), g = lgAudio.createGain();
    o.frequency.value = freq || 880; o.type = 'sine';
    g.gain.value = vol || 0.2;
    o.connect(g); g.connect(lgAudio.destination);
    const t = lgAudio.currentTime;
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (ms || 200) / 1000);
    o.start(t); o.stop(t + (ms || 200) / 1000);
  } catch (e) {}
}
function lgParty() { if (!store.party) store.party = { names: [] }; if (!Array.isArray(store.party.names)) store.party.names = []; return store.party; }

/* ---------- Katalog ---------- */
function lgList() {
  const q = lgS.q.trim().toLowerCase();
  const np = lgNames().length;
  return LG.filter(g => (!lgS.fit || np < 2 || (g.p[0] <= np && (!g.p[1] || np <= g.p[1]))) && (lgS.cat === 'alle' || g.c === lgS.cat) && (!q || (g.n + ' ' + g.d + ' ' + g.u).toLowerCase().includes(q)));
}
function lgRow(g) {
  const tn = lgToolName(g.tool);
  return `<button type="button" class="panel lgrow" data-act="lgopen" data-id="${g.id}">${lgIcon(g.c, 40)}
    <span class="lgr-text"><b>${esc(g.n)}</b><small>${esc(g.d)}</small><span class="lgmeta">${lgPlayers(g.p)} · ${esc(g.t)}${tn ? ` · <em>${tn}</em>` : ''}</span></span>
    <svg class="gc-arrow" width="20" height="20" viewBox="0 0 18 18" aria-hidden="true"><path d="M7 4l5 5-5 5" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`;
}
function lgRenderList() {
  const L = lgList();
  const box = document.getElementById('lglist');
  if (!L.length) { box.innerHTML = `<div class="panel empty">Ingen spil passer på søgningen.</div>`; return; }
  if (lgS.cat === 'alle' && !lgS.q.trim() && !lgS.fit) {
    box.innerHTML = LG_CATS.map(([id, label]) => {
      const gs = L.filter(g => g.c === id);
      return gs.length ? `<h2 class="lgh">${label} <span class="muted">${gs.length}</span></h2><div class="glist">${gs.map(lgRow).join('')}</div>` : '';
    }).join('');
  } else box.innerHTML = `<div class="glist">${L.map(lgRow).join('')}</div>`;
}
function lgRenderCatalog() {
  document.getElementById('navtitle').textContent = 'Drukspil og lege';
  document.getElementById('lgsub').textContent = `${LG.length} spil og lege med regler. Mange har kort, terninger eller timer med.`;
  const np = lgNames().length;
  document.getElementById('lgplayers').innerHTML = lgPlayersPanel();
  document.getElementById('lgcats').innerHTML = (np > 1 ? `<button type="button" class="lgchip fit${lgS.fit ? ' on' : ''}" data-act="lgfit" aria-pressed="${!!lgS.fit}">Passer til ${np}</button>` : '') + [['alle', 'Alle']].concat(LG_CATS.map(([id, l]) => [id, l])).map(([id, l]) =>
    `<button type="button" class="lgchip${lgS.cat === id ? ' on' : ''}" data-act="lgcat" data-v="${id}" aria-pressed="${lgS.cat === id}">${l}</button>`).join('');
  const q = document.getElementById('lgq');
  if (q.value !== lgS.q) q.value = lgS.q;
  lgRenderList();
}

/* ---------- Spilside ---------- */
function lgGame(id) { return LG.find(g => g.id === id); }
function lgRenderGame(id) {
  const g = lgGame(id);
  if (!g) { go('lege'); return; }
  document.getElementById('navtitle').textContent = g.n;
  document.getElementById('lgplayers').innerHTML = '';
  document.getElementById('pghead').innerHTML = `<span class="emblem bpem">${lgIcon(g.c, 64).replace('class="lgicon"', 'class="bpemblem"')}</span><h1>${esc(g.n)}</h1><p class="sub">${lgPlayers(g.p)} · ${esc(g.u)} · ${esc(g.t)}</p>`;
  const tool = g.tool ? `<section class="lgtoolsec"><h2>${g.tool === 'bp' ? 'Turnering' : 'Til spillet'}</h2><div id="pgtool"></div></section>` : '';
  document.getElementById('pgbody').innerHTML = `<p class="lgdesc">${esc(g.d)}</p><div id="pgboard"></div>${tool}
    <section><h2>Sådan spiller I</h2><ol class="panel lgrules">${g.r.map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
    ${g.v && g.v.length ? `<section><h2>Varianter</h2><ul class="panel lgrules lgvar">${g.v.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
    <p class="help lgnote">Drik i jeres eget tempo. Alle spil virker også med sodavand eller vand, og ingen skal presses til noget.</p>
    <div class="btnrow lgbottom"><button type="button" class="setbtn" data-act="lgrandom">Prøv en tilfældig leg</button></div>`;
  lgT = { id: g.id, tool: g.tool };
  lgBoardRender();
  lgToolRender();
}

/* ---------- Kortspil ---------- */
const LG_RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const LG_RNAME = { A: 'Es', J: 'Knægt', Q: 'Dame', K: 'Konge' };
const LG_SUITS = [['♠', 'spar'], ['♥', 'hjerter'], ['♦', 'ruder'], ['♣', 'klør']];
function lgNewCards() { const d = []; LG_SUITS.forEach((s, si) => LG_RANKS.forEach(r => d.push({ r, s: si }))); return shuffle(d); }
function lgCardFace(c, big, drawn) {
  const red = c.s === 1 || c.s === 2, su = LG_SUITS[c.s][0], court = 'JQK'.includes(c.r);
  return `<div class="pcard${red ? ' red' : ''}${big ? ' big' : ''}${court ? ' court' : ''}${c.r === 'A' ? ' ace' : ''}${drawn ? ' drawn' : ''}" role="img" aria-label="${LG_RNAME[c.r] || c.r} i ${LG_SUITS[c.s][1]}"><span class="pc-tl">${c.r}<i>${su}</i></span><span class="pc-mid">${court ? `<b>${c.r}</b><i>${su}</i>` : su}</span><span class="pc-br">${c.r}<i>${su}</i></span></div>`;
}
function lgCardBack(n) { return `<div class="pcard back big" style="--d:${Math.min(1, (n || 52) / 52).toFixed(2)}" aria-label="Bunken"><span class="pc-emb">♠</span></div>`; }

/* ---------- Terninger ---------- */
const LG_PIPS = { 1: [[50, 50]], 2: [[28, 28], [72, 72]], 3: [[28, 28], [50, 50], [72, 72]], 4: [[28, 28], [72, 28], [28, 72], [72, 72]], 5: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]], 6: [[28, 26], [72, 26], [28, 50], [72, 50], [28, 74], [72, 74]] };
// A die is drawn like a small rendered object: a bevelled ivory cube with a soft light from the top left,
// concave pips that catch light on their lower lip, and one hard highlight. Fresh rolls tumble in.
let lgRolledAt = 0, lgDieSeq = 0;
function lgDie(v, rot) {
  const fresh = Date.now() - lgRolledAt < 200, i = fresh ? lgDieSeq++ : 0, one = v === 1, r = one ? 12.5 : 8.6, k = r * 0.7;
  return `<svg class="die${fresh ? ' roll' : ''}" viewBox="0 0 100 100" style="--r:${rot || 0}deg;--i:${i}" role="img" aria-label="${v}"><rect x="3" y="3" width="94" height="94" rx="25" fill="url(#dv-edge)"/><rect x="8.5" y="7.5" width="82" height="82" rx="20" fill="url(#dv-face)"/><path d="M24 9.5h46" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/><ellipse cx="30" cy="22" rx="15" ry="6" fill="#fff" opacity=".55" transform="rotate(-24 30 22)"/>${LG_PIPS[v].map(([x, y]) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="url(#dv-pip${one ? 'r' : ''})"/><path d="M${-k} ${k}A${r} ${r} 0 0 0 ${k} ${-k}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/></g>`).join('')}</svg>`;
}
function lgRoll(n) { lgRolledAt = Date.now(); lgDieSeq = 0; return Array.from({ length: n }, () => 1 + Math.floor(Math.random() * 6)); }
const LG_CUP = '<svg viewBox="0 0 120 134" aria-hidden="true"><path d="M21 22 8 112a52 12 0 0 0 104 0L99 22z" fill="url(#cp-body)"/><path d="M21 22 8 112a52 12 0 0 0 104 0L99 22z" fill="#000" filter="url(#lg-grain)" opacity=".5"/><path d="M89 26l9 80" stroke="#f0cf9e" stroke-width="1.3" stroke-dasharray="3 3" opacity=".55"/><path d="M35 28c-2 26-5 56-7 82" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".12"/><path d="M9.6 101a52 12 0 0 0 100.8 0L112 112a52 12 0 0 1-104 0z" fill="url(#cp-rim)"/><path d="M10 107a50 11 0 0 0 100 0" fill="none" stroke="#f3d3a3" stroke-width="1.4" stroke-dasharray="3.2 3" opacity=".75"/><path d="M8 112a52 12 0 0 0 104 0" fill="none" stroke="#d99a62" stroke-width="1" opacity=".5"/><ellipse cx="60" cy="22" rx="39" ry="10" fill="url(#cp-top)"/><ellipse cx="60" cy="22" rx="33" ry="7.4" fill="none" stroke="#e9c08a" stroke-width="1.2" stroke-dasharray="3 2.6" opacity=".7"/><path d="M24 20a36 9 0 0 1 40-6.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" fill="none" opacity=".3"/></svg>';
const LG_BOMB = '<svg class="lgbombobj" viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="56" cy="109" rx="32" ry="5.5" fill="#000" opacity=".2"/><circle cx="56" cy="68" r="38" fill="url(#bm-body)"/><path d="M27 88a38 38 0 0 0 58 2" fill="none" stroke="#ff9e5e" stroke-width="3" stroke-linecap="round" opacity=".35"/><ellipse cx="41" cy="50" rx="11" ry="6" fill="#fff" opacity=".8" transform="rotate(-38 41 50)"/><ellipse cx="34" cy="64" rx="3" ry="2" fill="#fff" opacity=".35"/><g transform="rotate(38 77 33)"><rect x="66" y="24" width="22" height="17" rx="3.5" fill="url(#bm-cap)"/><rect x="64" y="22" width="26" height="5" rx="2.5" fill="#c9ccd3"/></g><path d="M80 23c5-10 14-12 19-6s10 2 12-6" fill="none" stroke="#9b7448" stroke-width="3.6" stroke-linecap="round"/><path d="M80 23c5-10 14-12 19-6s10 2 12-6" fill="none" stroke="#5a3d1e" stroke-width="3.6" stroke-linecap="round" stroke-dasharray="1.5 3.5"/><g class="lgspark" transform="translate(111 11)"><circle r="14" fill="url(#bm-glow)"/><path d="M0-9 2 -2 9 0 2 2 0 9-2 2-9 0-2-2z" fill="#fffbe0"/><circle class="lgsp1" r="1.6" fill="#ffd34d"/><circle class="lgsp2" r="1.3" fill="#fff2a8"/><circle class="lgsp3" r="1.2" fill="#ff9d2e"/></g></svg>';
const LG_BURST = '<svg class="lgburst" viewBox="0 0 160 160" aria-hidden="true"><path d="M80 6l12 38 34-22-16 37 40 4-36 18 30 27-40-6 4 40-28-29-20 35-6-40-38 14 24-32L4 74l40-10L24 30l36 14z" fill="#ffd23f"/><path d="M80 32l8 26 23-14-10 25 27 4-24 12 19 18-27-4 2 27-18-19-14 23-4-27-26 9 17-21-24-12 27-6-13-23 24 9z" fill="#ff8a1f"/><circle cx="80" cy="80" r="16" fill="#fff4c4"/>' + [[-58, -40], [62, -46], [70, 34], [-66, 30], [8, -70], [-10, 72], [40, 64], [-44, -66]].map(([x, y], i) => `<circle class="lgbits" cx="80" cy="80" r="${3 + (i % 3)}" fill="${i % 2 ? '#ffd23f' : '#2b2e37'}" style="--dx:${x}px;--dy:${y}px"/>`).join('') + '</svg>';
const LG_BOTTLE = '<svg viewBox="0 0 200 64" aria-hidden="true"><path d="M14 8h108c10 0 16 4 26 12 6 5 10 6 18 6h20c3 0 4 2 4 6s-1 6-4 6h-20c-8 0-12 1-18 6-10 8-16 12-26 12H14C8 56 4 50 4 32S8 8 14 8z" fill="url(#bt-glass)"/><path d="M14 8h108c10 0 16 4 26 12 6 5 10 6 18 6h20c3 0 4 2 4 6s-1 6-4 6h-20c-8 0-12 1-18 6-10 8-16 12-26 12H14C8 56 4 50 4 32S8 8 14 8z" fill="none" stroke="#04200c" stroke-opacity=".5" stroke-width="1.2"/><rect x="38" y="8" width="62" height="48" fill="url(#bt-label)"/><rect x="38" y="25" width="62" height="14" fill="#c8202f"/><rect x="38" y="27" width="62" height="1.2" fill="#f2d48a"/><rect x="38" y="35.8" width="62" height="1.2" fill="#f2d48a"/><rect x="186" y="25" width="10" height="14" rx="2.5" fill="#d9b44a"/><rect x="186" y="27" width="10" height="3" fill="#fff3c0" opacity=".7"/><path d="M12 16h104" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/><path d="M128 20c8 4 14 9 22 10" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".4" fill="none"/></svg>';
function lgMeyer(v) {
  const hi = Math.max(v[0], v[1]), lo = Math.min(v[0], v[1]);
  if (hi === 2 && lo === 1) return ['Meyer', 'Det højeste slag.'];
  if (hi === 3 && lo === 1) return ['Lille Meyer', 'Næsthøjeste slag.'];
  if (hi === 3 && lo === 2) return ['32', 'Vælg fællesskål eller bluf.'];
  if (hi === lo) return [`Par ${hi}`, hi === 6 ? 'Højeste par.' : 'Par slår alle almindelige slag.'];
  return [`${hi}${lo}`, ''];
}
const LG_DICE_N = { snyd: 5, skib: 5, tremand: 2, syvelleve: 2, grisen: 1, terningbord: 1 };
const LG_MEYER_ORDER = ['21', '31', '66', '55', '44', '33', '22', '11', '65', '64', '63', '62', '61', '54', '53', '52', '51', '43', '42', '41', '32'];
function lgMeyerKey(v) { return `${Math.max(v[0], v[1])}${Math.min(v[0], v[1])}`; }
function lgMeyerRank(v) { return LG_MEYER_ORDER.indexOf(lgMeyerKey(v)) + 1; }
function lgMeyerName(k) { return k === '21' ? 'Meyer' : k === '31' ? 'Lille Meyer' : k[0] === k[1] ? `Par ${k[0]}` : k; }
function lgMeyerJudge(T, ok, loss, why) {
  const tr = LG_TRACK.meyer, B = lgBoard('meyer'), lifter = lgDiceTurn(), loser = ok ? lifter : T.roller;
  if (!loser || lgNames().length < 2) { T.res = null; return false; }
  B.v[loser] = Math.max(0, lgVal(tr, B, loser) - loss);
  const out = !lgInGame(tr, B, loser);
  B.turn = out ? (loser === lifter ? T.roller : lifter) : loser;
  T.res = { ok, loser, out, loss, why }; save(); lgBoardRender();
  return true;
}
const LG_TB = { 1: ['Drik', 'Du tager en slurk.'], 2: ['Del 2 ud', 'Giv 2 slurke til en eller flere.'], 3: ['Venstre drikker', 'Den til venstre for dig tager en slurk.'], 4: ['Alle drikker', 'Skål med hele bordet.'], 5: ['Ny regel', 'Find på en regel, der gælder resten af spillet.'], 6: ['Slå igen', 'Det, du slår nu, deler du dobbelt ud.'] };
function lgDiceTurn() { const tr = LG_TRACK[lgT.id]; return tr && lgNames().length > 1 ? lgTurnName(tr, lgBoard(lgT.id)) : null; }
function lgPeekNext(id) {
  const tr = LG_TRACK[id];
  if (!tr || lgNames().length < 2) return null;
  const B = lgBoard(id), names = lgNames(), cur = lgTurnName(tr, B);
  if (!cur) return null;
  let i = names.indexOf(cur);
  for (let k = 0; k < names.length; k++) { i = (i + 1) % names.length; if (lgInGame(tr, B, names[i])) return names[i]; }
  return null;
}
function lgDiceReset() { const T = lgT; T.v = null; T.out = null; T.ph = null; T.tries = 0; T.dbl = false; T.sk = null; }
function lgDiceOut(T, who) {
  const v = T.v, s = v.reduce((a, b) => a + b, 0), two = v.length === 2 && v[0] === v[1];
  if (T.id === 'tremand') {
    const B = lgBoard('tremand'), lines = [];
    const threes = v.filter(x => x === 3).length + (s === 3 ? 1 : 0);
    let big = '';
    if (threes) {
      if (who && B.trem === who && v.includes(3)) { B.trem = null; big = 'Fri!'; lines.push(`${who} slog en 3'er og er ikke tremand mere.`); }
      else if (who && !B.trem) { B.trem = who; big = 'Ny tremand'; lines.push(`${who} er tremand og tager ${plural(threes, 'slurk', 'slurke')}.`); }
      else { big = 'Tremanden drikker'; lines.push(`${B.trem ? B.trem : 'Tremanden'} tager ${plural(threes, 'slurk', 'slurke')}.${!B.trem ? ' Er der ingen tremand, er det dig nu.' : ''}`); }
    }
    if (s === 7) { big = big || 'Sum 7'; lines.push('Den til højre drikker.'); }
    if (s === 11) { big = big || 'Sum 11'; lines.push('Den til venstre drikker.'); }
    if (two) { big = big || 'To ens'; lines.push(`Del ${plural(v[0], 'slurk', 'slurke')} ud.`); }
    if (!lines.length) return { big: 'Ingenting', lines: ['Ingen 3\'er, 7, 11 eller to ens.'], again: false };
    return { big, lines, again: true };
  }
  if (T.id === 'syvelleve') {
    const hit = s === 7 || s === 11 || two, why = two ? `To ${v[0]}'ere` : String(s);
    if (!T.ph) {
      if (!hit) return { big: 'Ingen', lines: ['Hverken 7, 11 eller to ens.'], again: false };
      T.ph = 'chase'; T.tries = 0;
      return { big: `${why}!`, lines: ['Peg på en, der skal drikke.', 'Slå igen. Hver gang du ikke rammer, tager de en slurk.'], again: true };
    }
    T.tries++;
    if (hit) { T.ph = null; return { big: `${why}! Ramt`, lines: ['Den udpegede slipper.'], again: false }; }
    if (T.tries >= 3) { T.ph = null; return { big: 'Forbi', lines: ['Den udpegede tager en slurk.', 'Alle 3 forsøg er brugt.'], again: false }; }
    return { big: 'Forbi', lines: ['Den udpegede tager en slurk.'], again: true };
  }
  if (T.id === 'terningbord') {
    if (T.dbl) { T.dbl = false; return { big: `Del ${v[0] * 2} ud`, lines: [`Du slog ${v[0]}. Dobbelt er ${plural(v[0] * 2, 'slurk', 'slurke')}.`], again: false }; }
    const [b, l] = LG_TB[v[0]];
    if (v[0] === 6) T.dbl = true;
    return { big: b, lines: [l], again: v[0] === 6 };
  }
  return null;
}
function lgSkibRoll(S) {
  const r = lgRoll(S.held.length < 3 ? 5 - S.held.length : 2);
  for (let k = S.held.length; k < 3; k++) { const i = r.indexOf([6, 5, 4][k]); if (i < 0) break; S.held.push([6, 5, 4][k]); r.splice(i, 1); }
  S.dice = r; S.left--;
  S.score = S.held.length === 3 ? r[0] + r[1] : 0;
  if (!S.left || (S.held.length === 3 && S.score === 12)) lgSkibDone(S);
}
function lgSkibDone(S) {
  const T = lgT, who = lgDiceTurn();
  S.done = true;
  if (!who) return;
  if (!T.res) T.res = {};
  T.res[who] = S.score;
  const names = lgNames();
  if (names.every(n => typeof T.res[n] === 'number')) {
    const sc = names.map(n => T.res[n]), lo = Math.min(...sc), hi = Math.max(...sc);
    T.round = { lo: names.filter(n => T.res[n] === lo), hi: hi > 0 ? names.filter(n => T.res[n] === hi) : [] };
    const B = lgBoard('skib');
    T.round.hi.forEach(n => { B.v[n] = lgVal(LG_TRACK.skib, B, n) + 1; });
  }
}
function lgList2(a) { return a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' og ' + a[a.length - 1]; }


/* ---------- Værktøjer ---------- */
function lgSecs(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }
function lgPass(list, labelFn, revealFn, doneHtml, showLabel) {
  // Telefonen sendes rundt: én ad gangen ser sin rolle
  const T = lgT;
  if (T.pi >= list.length) return doneHtml;
  const who = labelFn(T.pi);
  if (!T.shown) return `<div class="lgpass"><p class="lgwho">${esc(who)}</p><p class="muted">Tag telefonen, så kun du kan se skærmen.</p><button type="button" class="gobtn" data-act="lgreveal">${showLabel || 'Vis min rolle'}</button></div>`;
  return `<div class="lgpass shown">${revealFn(T.pi)}<button type="button" class="gobtn" data-act="lghide">${T.pi + 1 < list.length ? 'Skjul og giv videre' : 'Skjul'}</button></div>`;
}
function lgNames() { return lgParty().names.filter(Boolean); }
function lgToolRender() {
  const el = document.getElementById('pgtool');
  if (!el) return;
  const T = lgT, t = T.tool || '';
  let h = '';
  if (t.startsWith('deck:')) {
    const key = t.slice(5);
    const decks = key === 'sandhed' ? ['sandhed', 'konsekvens'] : [key];
    if (!T.decks) { T.decks = {}; decks.forEach(k => { T.decks[k] = { order: shuffle(LG_DECKS[k].cards.map((_, i) => i)), i: -1 }; }); T.cur = key === 'sandhed' ? null : key; }
    const cur = T.cur && T.decks[T.cur];
    const text = cur && cur.i >= 0 ? LG_DECKS[T.cur].cards[cur.order[cur.i]] : null;
    const dk = T.cur + ':' + (cur ? cur.i : -1), dealt = T._fxd !== undefined && T._fxd !== dk && !!text; T._fxd = dk;
    h += `<div class="panel lgcard${text ? '' : ' empty'}${dealt ? ' dealt' : ''}">${text ? `<span class="lgcard-k">${esc(LG_DECKS[T.cur].name)}${T.by ? ` · ${esc(T.by)} læser op` : ''}</span><p>${esc(text)}</p><span class="lgcount">${cur.i + 1} af ${cur.order.length}</span>` : `<p class="muted">${key === 'sandhed' ? 'Vælg sandhed eller konsekvens.' : 'Tryk for at trække det første kort.'}</p>`}</div>`;
    h += `<div class="btnrow lgbtns">${decks.length > 1 ? decks.map(k => `<button type="button" class="gobtn${k === 'konsekvens' ? ' alt' : ''}" data-act="lgdraw" data-k="${k}">${LG_DECKS[k].name}</button>`).join('') : `<button type="button" class="gobtn" data-act="lgdraw" data-k="${key}">${text ? 'Næste kort' : 'Træk et kort'}</button>`}</div>`;
    if (T.reshuffled) h += help('Alle kort er brugt. Bunken er blandet igen.');
  } else if (t === 'kings' || t === 'deck') {
    if (!T.cards) { T.cards = lgNewCards(); T.drawn = []; }
    const last = T.drawn[T.drawn.length - 1];
    const kings = T.drawn.filter(c => c.r === 'K').length;
    const fresh = T._fxc !== undefined && T._fxc !== T.drawn.length && T.drawn.length > 0; T._fxc = T.drawn.length;
    h += `<div class="lgtable">${T.cards.length ? `<button type="button" class="lgdeckbtn" data-act="lgcard" aria-label="Træk et kort">${lgCardBack(T.cards.length)}<span class="lgleft">${T.cards.length} tilbage</span></button>` : '<div class="pcard big ghost"><span>Tom</span></div>'}${last ? lgCardFace(last, true, fresh) : '<div class="pcard big ghost"><span>Tryk på bunken</span></div>'}</div>`;
    if (t === 'kings' && last) {
      const rule = LG_KINGS[last.r];
      const fourth = last.r === 'K' && kings === 4;
      h += `<div class="panel lgrule${fourth ? ' hot' : ''}">${T.by ? `<span class="lgcard-k">${esc(T.by)} trak</span>` : ''}<b>${fourth ? 'Fjerde konge!' : esc(rule[0])}</b><p>${fourth ? 'Du drikker kongens kop. Bland bunken for at starte forfra.' : esc(rule[1])}</p></div>`;
    }
    if (t === 'kings') h += `<p class="lgkings">Konger: ${'<i class="on">♔</i>'.repeat(kings)}${'<i>♔</i>'.repeat(4 - kings)}</p>`;
    if (T.drawn.length > 1) h += `<div class="lghist">${T.drawn.slice(-8, -1).reverse().map(c => lgCardFace(c)).join('')}</div>`;
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgcard"${T.cards.length ? '' : ' disabled'}>Træk et kort</button><button type="button" class="setbtn" data-act="lgshuffle">Bland igen</button></div>`;
    if (t === 'kings') h += `<details class="panel lgkey"><summary>Hvad betyder kortene?</summary><dl>${LG_RANKS.map(r => `<dt>${LG_RNAME[r] || r}</dt><dd><b>${esc(LG_KINGS[r][0])}</b> ${esc(LG_KINGS[r][1])}</dd>`).join('')}</dl></details>`;
  } else if (t === 'meyer') {
    if (!T.v) { T.st = 'start'; T.prev = null; T.blind = false; T.res = null; }
    const mWho = lgDiceTurn(), mTr = LG_TRACK.meyer, mB = lgBoard('meyer'), mAlive = lgNames().filter(n => lgInGame(mTr, mB, n));
    // The cup moves between three poses: down over the dice, tipped up for a peek, and pushed aside.
    // Each render knows the pose it came from, so only a real change animates.
    const MP = { down: [0, 0, 0, 1, 1], peek: [112, -30, 24, 0.74, 0.45], aside: [128, 0, 0, 1, 1] };
    const fx = T._fx || {}, vKey = T.v ? T.v.join('') : '';
    const pose = !T.v || T.st === 'start' || T.st === 'hidden' ? 'down' : T.st === 'shown' ? 'peek' : 'aside';
    let anim = '';
    if (fx.pose) {
      if (T.st === 'shown' && (fx.st !== 'shown' || fx.v !== vKey)) anim = 'roll';
      else if (T.st === 'hidden' && T.blind && fx.v !== vKey) anim = 'blind';
      else if (fx.pose !== pose) anim = 'move';
    }
    const fp = MP[fx.pose || pose], tp = MP[pose];
    const seen = pose !== 'down' ? T.v : (anim && fx.seen ? fx.seen : null);
    T._fx = { pose, st: T.st, v: vKey, seen: pose !== 'down' ? T.v : null };
    const stage = `<div class="lgstage p-${pose}${anim ? ' a-' + anim : ''}" style="--fx:${fp[0]}px;--fy:${fp[1]}px;--fr:${fp[2]}deg;--fs:${fp[3]};--fo:${fp[4]};--tx:${tp[0]}px;--ty:${tp[1]}px;--tr:${tp[2]}deg;--ts:${tp[3]};--to:${tp[4]}">` +
      `<div class="lgsdice${pose === 'down' ? ' keep' : ''}"${pose === 'down' ? ' aria-hidden="true"' : ''}>${seen ? seen.map((x, i) => lgDie(x, i ? 8 : -6)).join('') : ''}</div>` +
      `<div class="lgcupw"><span class="lgcupsh"></span><div class="lgcupo">${LG_CUP}</div></div></div>`;
    if (anim) haptic(anim === 'move' ? 8 : 12);
    const diceBox = (v, cls, top) => { const [nm, sub] = lgMeyer(v), rk = lgMeyerRank(v); return `<div class="panel lgcup lgmey${cls}">${top || ''}${stage}<p class="lgbig">${nm}</p>${sub ? `<p class="muted">${sub}</p>` : ''}${rk ? `<p class="lgrank">Nr. ${rk} af 21 fra toppen</p>` : ''}</div>`; };
    if (lgNames().length > 1 && mAlive.length < 2) h += `<div class="panel lgcup lgdone"><p class="lgbig">${mAlive.length ? esc(mAlive[0]) + ' vandt' : 'Slut'}</p><p class="muted">Tryk Start forfra for et nyt spil.</p></div>`;
    else if (T.st === 'start') h += `<div class="panel lgcup lgmey">${stage}<p class="lgbig">${mWho ? esc(mWho) + ' rafler' : 'Klar'}</p><p class="muted">Ny runde. Kun du må se slaget.</p></div>`;
    else if (T.st === 'hidden') h += `<div class="panel lgcup lgmey hidden">${stage}<p><b>Bægeret er nede</b></p>${T.blind ? `<p class="lgrank">${T.roller ? esc(T.roller) + ' raflede' : 'Raflet'} uden at kigge: dét eller derover</p>` : ''}<p class="muted">${mWho ? esc(mWho) + ': ' : ''}Tro på meldingen og rafl selv, eller løft bægeret.</p></div>`;
    else if (T.st === 'shown') {
      const is32 = lgMeyerKey(T.v) === '32';
      h += diceBox(T.v, '') + (is32 ? `<p class="lgres">Fællesskål: Alle drikker, runden starter forfra, og du slår igen. Eller bluf og send videre. Løfter den næste, er det fællesskål.</p>` : `<p class="lgres">Meld højt, og send bægeret videre.</p>`);
    } else if (T.st === 'lifted') {
      if (T.res) h += diceBox(T.v, ' lglift') + `<p class="lgask">${T.res.ok ? 'Meldingen passede' : 'Det var bluf'}</p>${T.res.why ? `<p class="lgres">${T.res.why}</p>` : ''}<p class="lgres"><b>${esc(T.res.loser)} mister ${T.res.loss === 2 ? '2 liv' : 'et liv'}${T.res.out ? ' og er ude' : ''}.</b></p>`;
      else if (lgMeyerKey(T.v) === '32') h += diceBox(T.v, ' lglift', '<span class="lgcard-k">Der lå 32 under bægeret</span>') + `<p class="lgask">Fællesskål!</p><p class="lgres">Alle drikker, og ingen taber. Runden starter forfra, og ${T.roller ? esc(T.roller) : 'den samme spiller'} slår igen.</p>`;
      else {
        const liar = T.roller, lifter = mWho;
        h += diceBox(T.v, ' lglift', T.blind ? '<span class="lgcard-k">Raflet uden at kigge: dét eller derover</span>' : '') + (T.prev ? `<p class="lgres">Før det slog ${T.prev.who ? esc(T.prev.who) : 'den forrige'} ${esc(lgMeyer(T.prev.v)[0])}.</p>` : '');
        h += `<p class="lgask">Var meldingen løgn eller rigtig?</p>${liar && lifter ? `<p class="lgres">Løgn: ${esc(liar)} taber. Rigtigt: ${esc(lifter)} taber.</p>` : ''}<div class="btnrow lgbtns"><button type="button" class="setbtn lgchoice lgjudge danger" data-act="lgmjudge" data-v="lie">Løgn</button><button type="button" class="setbtn lgchoice lgjudge" data-act="lgmjudge" data-v="true">Rigtigt</button></div><div class="btnrow lgbtns"><button type="button" class="setbtn lgchoice lgjudge danger" data-act="lgmjudge" data-v="liem">Løgn om Meyer (2 liv)</button></div>`;
      }
    }
    if (lgNames().length > 1 && mAlive.length < 2) { /* slut */ }
    else if (T.st === 'lifted' && T.res) h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmnew">Næste runde</button></div><div class="btnrow lgbtns"><button type="button" class="setbtn" data-act="lgmundo">Fortryd: ingen taber</button></div>`;
    else if (T.st === 'lifted' && lgMeyerKey(T.v) === '32') h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmskaal">Skål og slå igen</button></div>`;
    else if (T.st === 'lifted') h += `<div class="btnrow lgbtns"><button type="button" class="setbtn" data-act="lgmnew">Ny runde uden at nogen taber</button></div>`;
    else if (T.st === 'shown') h += lgMeyerKey(T.v) === '32' ? `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmskaal">Fællesskål</button><button type="button" class="setbtn lgchoice" data-act="lgmhide">Bluf og send videre</button></div>` : `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmhide">Skjul og send videre</button>${T.prev && !T.blind ? `<button type="button" class="setbtn lgchoice" data-act="lgmblind">Rafl igen uden at kigge: dét eller derover</button>` : ''}</div>`;
    else if (T.st === 'start') h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmroll">Rafl</button></div>`;
    else if (T.st === 'hidden') h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgmroll">Tro på det og rafl</button><button type="button" class="setbtn lgchoice" data-act="lgmlift">Løft bægeret</button></div>`;
    h += `<details class="panel lgkey"><summary>Rækkefølgen fra højest</summary><p>Meyer (21) · Lille Meyer (31) · Par 6, 5, 4, 3, 2, 1 · 65, 64, 63, 62, 61, 54, 53, 52, 51, 43, 42, 41, 32. Husregel: Løftes der på 32, er det fællesskål.</p></details>`;
  } else if (t === 'dice' && T.id === 'snyd' && lgNames().length > 1) {
    const tr = LG_TRACK.snyd, B = lgBoard('snyd'), alive = lgNames().filter(n => lgInGame(tr, B, n));
    if (alive.length < 2) h += `<div class="panel lgcup"><p class="lgbig">${alive.length ? esc(alive[0]) + ' vandt' : 'Slut'}</p><p class="muted">Tryk Start forfra for et nyt spil.</p></div>`;
    else if (!T.hands) {
      const st = lgTurnName(tr, B);
      h += `<div class="panel lgcup"><p class="lgbig">Ny runde</p><p class="muted">Telefonen slår for alle. Send den rundt, så hver ser sine egne terninger. ${esc(st)} starter.</p></div>`;
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgsnyddeal">Slå for alle</button></div>`;
    } else if (!T.call) {
      const total = T.order.reduce((a, n) => a + T.hands[n].length, 0);
      h += `<div class="panel lgpassbox">${lgPass(T.order, i => `${T.order[i]} (${i + 1} af ${T.order.length})`, i => `<p class="muted">${esc(T.order[i])}, dine terninger</p><div class="lgdice sm">${T.hands[T.order[i]].map((v, k) => lgDie(v, ((k * 37) % 21) - 10)).join('')}</div>`,
        `<p class="lgbig">Byd løs</p><p class="muted">${esc(T.order[0])} starter. Der ligger ${plural(total, 'terning', 'terninger')} på bordet.</p>`, 'Vis mine terninger')}</div>`;
      if (T.pi >= T.order.length) h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgsnydcall">Snyd! Løft alle</button></div>`;
    } else {
      if (!T.face) h += `<div class="panel lgcup"><p class="lgbig">Hvilket tal?</p><p class="muted">Tryk på det tal, der blev budt på.</p></div>`;
      h += `<div class="lgfaces" role="group" aria-label="Budt tal">${[1, 2, 3, 4, 5, 6].map(f => `<button type="button" data-act="lgsnydface" data-v="${f}" aria-label="${f}'ere" aria-pressed="${T.face === f}">${lgDie(f, 0)}</button>`).join('')}</div>`;
      if (T.face) {
        const f = T.face, hit = x => x === f || (f !== 1 && x === 1);
        const cnt = T.order.reduce((a, n) => a + T.hands[n].filter(hit).length, 0), ones = f === 1 ? 0 : T.order.reduce((a, n) => a + T.hands[n].filter(x => x === 1).length, 0);
        h += `<div class="panel lgcup"><p class="lgbig">${cnt} × ${f}'ere</p><p class="muted">${ones ? `Heraf ${plural(ones, 'ener', 'enere')} som joker. ` : ''}Blev der budt mere end ${cnt}, taber den, der bød. Ellers taber den, der sagde snyd.</p></div>`;
        h += `<div class="panel lghands">${T.order.map(n => `<div class="lghand"><b>${esc(n)}</b><span class="lgdice sm">${T.hands[n].map(x => `<span class="lgdh${hit(x) ? ' on' : ''}">${lgDie(x, 0)}</span>`).join('')}</span></div>`).join('')}</div>`;
        if (T.lost) h += `<div class="panel lgcup"><p class="lgbig">${esc(T.lost)} mister en terning</p><p class="muted">${lgInGame(tr, B, T.lost) ? 'Tag en slurk og start næste runde.' : 'Det var den sidste. Tag en slurk, du er ude.'}</p></div><div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgsnydnew">Næste runde</button></div>`;
        else h += `<p class="lgask">Hvem mister en terning?</p><div class="btnrow lgbtns lgwrap">${T.order.map(n => `<button type="button" class="setbtn lgchoice" data-act="lgsnydlose" data-n="${esc(n)}">${esc(n)}</button>`).join('')}</div>`;
      }
    }
  } else if (t === 'dice' && T.id === 'skib') {
    if (!T.sk) T.sk = { left: 3, held: [], dice: [], score: 0, done: false };
    const S = T.sk, who = lgDiceTurn(), nxt = who ? lgPeekNext('skib') : null;
    h += `<div class="panel lgcup"><div class="lgslots">${[['Skib', 6], ['Kaptajn', 5], ['Besætning', 4]].map(([l], i) => `<div class="lgslot${S.held[i] ? ' on' : ''}">${S.held[i] ? lgDie(S.held[i], 0) : '<i class="lgempty"></i>'}<span>${l}</span></div>`).join('')}</div>`;
    if (S.dice.length) h += `<p class="lgslbl">${S.held.length === 3 ? 'Last' : 'Resten af slaget'}</p><div class="lgdice sm">${S.dice.map((v, i) => lgDie(v, ((i * 37) % 21) - 10)).join('')}</div>`;
    if (S.done) h += `<p class="lgbig">${S.held.length === 3 ? plural(S.score, 'point', 'point') : 'Intet skib: 0 point'}</p>`;
    else if (!S.dice.length) h += `<p class="lgbig">${who ? esc(who) + ' slår' : 'Klar'}</p><p class="muted">Find en 6'er, så en 5'er, så en 4'er.</p>`;
    else if (S.held.length === 3) h += `<p class="lgbig">Last: ${plural(S.score, 'point', 'point')}</p><p class="muted">Behold den, eller slå lasten om.</p>`;
    else h += `<p class="muted">Mangler ${['skib (6)', 'kaptajn (5)', 'besætning (4)'][S.held.length]}.</p>`;
    h += `</div>`;
    if (T.res && Object.keys(T.res).length) h += `<p class="lgres">Runden: ${lgNames().filter(n => typeof T.res[n] === 'number').map(n => `${esc(n)} ${T.res[n]}`).join(' · ')}</p>`;
    if (T.round) {
      h += `<div class="panel lgcup lgdone"><p class="lgbig">Runden er slut</p><p>${esc(lgList2(T.round.lo))} tager en slurk.</p>${T.round.hi.length ? `<p>${esc(lgList2(T.round.hi))} deler 2 slurke ud og får en sejr.</p>` : '<p class="muted">Ingen fik skib, så ingen får en sejr.</p>'}</div>`;
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgskibnew">Ny runde</button></div>`;
    } else if (S.done) h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgdpass">${nxt ? `Giv videre til ${esc(nxt)}` : 'Ny tur'}</button></div>`;
    else h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgskibroll">${S.held.length === 3 && S.dice.length ? 'Slå lasten om' : 'Slå'} · ${plural(S.left, 'slag', 'slag')} tilbage</button>${S.held.length === 3 && S.dice.length ? `<button type="button" class="setbtn lgchoice" data-act="lgskibkeep">Behold</button>` : ''}</div>`;
  } else if (t === 'dice') {
    if (!T.n) { T.n = LG_DICE_N[T.id] || 2; T.v = null; T.hide = false; }
    const who = lgDiceTurn(), nxt = who ? lgPeekNext(T.id) : null, O = T.out;
    if (T.id === 'tremand' && who) { const tm = lgBoard('tremand').trem; h += `<p class="lgtrem">${tm ? `Tremand: <b>${esc(tm)}</b>` : 'Ingen tremand endnu'}</p>`; }
    if (T.v && T.hide) h += `<div class="panel lgcup hidden"><p><b>Skjult</b></p><p class="muted">Tryk Vis for at se slaget.</p></div>`;
    else if (T.v) h += `<div class="panel lgcup${O && O.again ? '' : O ? ' lgdone' : ''}"><div class="lgdice">${T.v.map((v, i) => lgDie(v, ((i * 37) % 21) - 10)).join('')}</div>${O ? `<p class="lgbig">${esc(O.big)}</p>${O.lines.map(l => `<p>${esc(l)}</p>`).join('')}` : `<p class="lgsum">Sum ${T.v.reduce((a, b) => a + b, 0)}</p>`}</div>`;
    else h += `<div class="panel lgcup"><p class="lgbig">${who ? esc(who) + ' slår' : 'Klar'}</p><p class="muted">${T.ph ? `Forsøg ${T.tries + 1} af 3` : T.dbl ? 'Det, du slår, deler du dobbelt ud.' : `Tryk Slå.`}</p></div>`;
    const again = !T.v || !O || O.again;
    const rl = T.id === 'syvelleve' && T.ph ? `Slå igen · forsøg ${T.tries + 1} af 3` : T.v && O && O.again ? 'Slå igen' : 'Slå';
    h += `<div class="btnrow lgbtns">${again ? `<button type="button" class="gobtn" data-act="lgdroll">${rl}</button>` : `<button type="button" class="gobtn" data-act="lgdpass">${nxt ? `Giv videre til ${esc(nxt)}` : 'Giv terningerne videre'}</button>`}${T.v && !O ? `<button type="button" class="setbtn lgchoice" data-act="lgdhide">${T.hide ? 'Vis' : 'Skjul'}</button>` : ''}</div>`;
    if (T.id === 'snyd') h += help('Skriv mindst to navne, så slår telefonen for hver spiller og tæller op, når nogen siger snyd.');
  } else if (t === 'pig') {
    const tr = LG_TRACK.grisen, B = lgBoard('grisen'), n = lgNames().length > 1 ? lgTurnName(tr, B) : null;
    h += `<div class="panel lgcup">${T.pv ? `<div class="lgdice">${lgDie(T.pv, -6)}</div>` : ''}${T.bust ? `<p class="lgbig role-wolf">En 1'er!</p><p>${esc(T.bust)} mister rundens point og tager en slurk.${n ? ` Nu er det ${esc(lgGen(n))} tur.` : ''}</p>` : `<p class="lgbig">${T.pt || 0} point</p><p class="muted">${n ? `i ${esc(lgGen(n))} tur` : 'i denne tur'}</p>`}</div>`;
    if (n && T.pt && !T.bust && lgVal(tr, B, n) + T.pt >= tr.target) h += `<p class="lgask">Gem nu, så vinder ${esc(n)}!</p>`;
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgpigroll">Slå</button><button type="button" class="setbtn lgchoice" data-act="lgpigsave"${T.pt ? '' : ' disabled'}>Gem ${T.pt || 0} point</button></div>`;
    if (!n) h += help('Tilføj spillere for at få point og tur med.');
  } else if (t === 'bp') {
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="newbp">Start en beerpong-turnering</button></div>`;
  } else if (t === 'timer:hour') {
    if (!T.mins) { T.mins = 60; T.start = 0; T.paused = 0; }
    const run = !!T.start;
    h += `<div class="field"><div class="flabel">Længde</div><div class="seg" role="group" aria-label="Længde">${[[30, '30 min'], [60, 'Power hour'], [100, 'Centurion']].map(([v, l]) => `<button type="button" data-act="lgmins" data-v="${v}" aria-pressed="${T.mins === v}"${run ? ' disabled' : ''}>${l}</button>`).join('')}</div></div>`;
    h += `<div class="panel lgclock"><span class="lgclock-k" id="lgmin">Minut 0 af ${T.mins}</span><b id="lgsec">1:00</b><span class="muted" id="lgnext">til næste slurk</span><div class="lgbar"><i id="lgbar"></i></div></div>`;
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lghstart">${run ? 'Pause' : T.paused ? 'Fortsæt' : 'Start'}</button>${run || T.paused ? `<button type="button" class="setbtn danger" data-act="lghreset">Nulstil</button>` : ''}</div>`;
    h += help('Telefonen bipper og vibrerer hvert minut. Lad skærmen være tændt, ellers kan telefonen sætte timeren på pause.');
  } else if (t === 'timer:60') {
    if (!T.len) { T.len = 60; T.end = 0; T.left = 0; }
    const run = !!T.end;
    h += `<div class="field"><div class="flabel">Tid</div><div class="seg" role="group" aria-label="Tid">${[30, 60, 90, 120].map(v => `<button type="button" data-act="lglen" data-v="${v}" aria-pressed="${T.len === v}"${run ? ' disabled' : ''}>${v < 60 ? v + ' sek' : v / 60 + ' min'}</button>`).join('')}</div></div>`;
    h += `<div class="panel lgclock"><b id="lgsec">${lgSecs((T.left || T.len) * 1000)}</b><span class="muted" id="lgnext">${run ? 'Tiden løber' : T.left ? 'På pause' : 'Klar'}</span></div>`;
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgcstart">${run ? 'Pause' : T.left ? 'Fortsæt' : 'Start'}</button>${run || T.left ? `<button type="button" class="setbtn danger" data-act="lgcreset">Nulstil</button>` : ''}</div>`;
  } else if (t === 'bomb') {
    if (!T.cat) { T.order = shuffle(LG_DECKS.kategorier.cards.map((_, i) => i)); T.ci = 0; T.cat = LG_DECKS.kategorier.cards[T.order[0]]; T.st = 'ready'; }
    h += `<div class="panel lgbomb ${T.st}">${T.st === 'boom' ? LG_BURST : LG_BOMB}<span class="lgcard-k">Kategori</span><p class="lgbig">${esc(T.cat)}</p>${T.st === 'run' ? '<p class="lgtick" id="lgtick">Tik … tak …</p>' : T.st === 'boom' ? '<p class="lgboom">BUM!</p><p>Den, der holder telefonen, har tabt.</p>' : '<p class="muted">Ingen ved, hvornår den springer.</p>'}</div>`;
    h += `<div class="btnrow lgbtns">${T.st === 'run' ? '' : `<button type="button" class="gobtn" data-act="lgbstart">Start bomben</button>`}<button type="button" class="setbtn" data-act="lgbcat">Ny kategori</button></div>`;
  } else if (t === 'spin') {
    const names = lgNames();
    h += `<div class="panel lgspin${T.pick != null ? ' done' : ''}"><div class="lgbottle" style="--a:${T.bang || 0}deg">${LG_BOTTLE}</div><p class="lgbig" id="lgspinname">${T.pick != null ? esc(names[T.pick] || '') : names.length >= 2 ? 'Klar' : 'Skriv navne ind'}</p></div>`;
    h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgspin"${names.length >= 2 ? '' : ' disabled'}>Vælg en tilfældig</button></div>`;
    h += lgNamesEditor();
  } else if (t === 'words') {
    if (!T.wc) { T.wc = 'alle'; T.len = 60; T.st = 'ready'; T.ok = []; T.skip = []; }
    if (T.st !== 'run') {
      h += `<div class="field"><div class="flabel">Kategori</div><div class="seg segwrap" role="group" aria-label="Kategori">${LG_WORDCATS.map(([v, l]) => `<button type="button" data-act="lgwc" data-v="${v}" aria-pressed="${T.wc === v}">${l}</button>`).join('')}</div></div>`;
      h += `<div class="field"><div class="flabel">Tid</div><div class="seg" role="group" aria-label="Tid">${[30, 60, 90].map(v => `<button type="button" data-act="lgwlen" data-v="${v}" aria-pressed="${T.len === v}">${v} sek</button>`).join('')}</div></div>`;
    }
    if (T.st === 'run') {
      h += `<div class="panel lgword"><span class="lgclock-k" id="lgsec">${lgSecs(T.end - Date.now())}</span><p class="lgword-w">${esc(T.word)}</p></div>`;
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn ok" data-act="lgwok">Rigtigt</button><button type="button" class="gobtn alt" data-act="lgwskip">Spring over</button></div>`;
    } else if (T.st === 'done') {
      h += `<div class="panel lgword"><span class="lgclock-k">Tiden er gået</span><p class="lgbig">${plural(T.ok.length, 'rigtigt', 'rigtige')}</p>${T.ok.length ? `<p class="lgwlist">${T.ok.map(esc).join(' · ')}</p>` : ''}${T.skip.length ? `<p class="muted">Sprunget over: ${T.skip.map(esc).join(' · ')}</p>` : ''}</div>`;
      const wtr = LG_TRACK[T.id];
      if (wtr && lgNames().length > 1 && !T.given && T.ok.length) {
        if (wtr.m === 'teams') h += `<div class="btnrow lgbtns">${[0, 1].map(i => `<button type="button" class="setbtn go" data-act="lgwgive" data-i="${i}">Giv ${T.ok.length} til Hold ${i + 1}</button>`).join('')}</div>`;
        else { const wn = lgTurnName(wtr, lgBoard(T.id)); if (wn) h += `<div class="btnrow lgbtns"><button type="button" class="setbtn go" data-act="lgwgive">Giv ${T.ok.length} point til ${esc(wn)}</button></div>`; }
      }
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgwstart">Ny runde</button></div>`;
    } else h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgwstart">Start runden</button></div>`;
  } else if (t === 'roles') {
    if (!T.cfg) { const n = Math.max(6, Math.min(20, lgNames().length || 8)); T.cfg = { n, wolves: Math.max(1, Math.round(n / 4)), seer: true, witch: false, hunter: false }; T.roles = null; }
    const c = T.cfg;
    if (!T.roles) {
      h += `<div class="field"><div class="flabel">Spillere (fortælleren tæller ikke med)</div><div class="stepper lgstep"><button type="button" data-act="lgrn" data-d="-1"${c.n <= 4 ? ' disabled' : ''}>−</button><b>${c.n}</b><button type="button" data-act="lgrn" data-d="1"${c.n >= 20 ? ' disabled' : ''}>+</button></div></div>`;
      h += `<div class="field"><div class="flabel">Varulve</div><div class="stepper lgstep"><button type="button" data-act="lgrw" data-d="-1"${c.wolves <= 1 ? ' disabled' : ''}>−</button><b>${c.wolves}</b><button type="button" data-act="lgrw" data-d="1"${c.wolves >= Math.floor((c.n - 1) / 2) ? ' disabled' : ''}>+</button></div></div>`;
      h += `<div class="field"><div class="flabel">Særlige roller</div><div class="seg segwrap" role="group" aria-label="Særlige roller">${[['seer', 'Seer'], ['witch', 'Heks'], ['hunter', 'Jæger']].map(([k, l]) => `<button type="button" data-act="lgrt" data-k="${k}" aria-pressed="${!!c[k]}">${l}</button>`).join('')}</div></div>`;
      h += lgNamesEditor('Navne er valgfrie. Så står der, hvis tur det er.');
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgrdeal">Del rollerne ud</button></div>`;
    } else {
      const names = lgNames();
      const lab = i => names[i] ? `${names[i]}` : `Spiller ${i + 1}`;
      const RD = { wolf: ['Varulv', 'Om natten vælger du og de andre varulve et offer. Om dagen lader du som ingenting.'], seer: ['Seer', 'Hver nat må du pege på en og få at vide, om de er varulv.'], witch: ['Heks', 'Du har én livsdrik og én giftdrik. Hver kan bruges én gang.'], hunter: ['Jæger', 'Når du dør, tager du en anden med dig.'], villager: ['Borger', 'Find varulvene og stem dem ud om dagen.'] };
      h += `<div class="panel lgpassbox">${lgPass(T.roles, i => `${lab(i)} (${i + 1} af ${T.roles.length})`, i => `<p class="muted">${esc(lab(i))}, du er</p><p class="lgbig role-${T.roles[i]}">${RD[T.roles[i]][0]}</p><p>${RD[T.roles[i]][1]}</p>`,
        `<p class="lgbig">Alle har set deres rolle</p><p class="muted">Giv telefonen til fortælleren.</p>${T.showAll ? `<ol class="lgall">${T.roles.map((r, i) => `<li><b>${esc(lab(i))}</b> ${RD[r][0]}</li>`).join('')}</ol>` : `<button type="button" class="setbtn" id="lgshowall" data-act="lgrall" data-label="Vis alle roller (kun fortælleren)" data-confirm="Tryk igen for at vise">Vis alle roller (kun fortælleren)</button>`}`)}</div>`;
      h += `<div class="btnrow lgbtns"><button type="button" class="setbtn" data-act="lgrnew">Ny runde</button></div>`;
    }
  } else if (t === 'spy') {
    if (!T.n) { T.n = Math.max(3, Math.min(12, lgNames().length || 5)); T.place = null; }
    if (!T.place) {
      h += `<div class="field"><div class="flabel">Spillere</div><div class="stepper lgstep"><button type="button" data-act="lgsn" data-d="-1"${T.n <= 3 ? ' disabled' : ''}>−</button><b>${T.n}</b><button type="button" data-act="lgsn" data-d="1"${T.n >= 12 ? ' disabled' : ''}>+</button></div></div>`;
      h += lgNamesEditor('Navne er valgfrie.');
      h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgsdeal">Start runden</button></div>`;
    } else {
      const names = lgNames();
      const lab = i => names[i] || `Spiller ${i + 1}`;
      const list = Array.from({ length: T.n });
      const done = T.pi >= T.n;
      h += `<div class="panel lgpassbox">${lgPass(list, i => `${lab(i)} (${i + 1} af ${T.n})`, i => i === T.spy ? `<p class="lgbig role-wolf">Du er spionen</p><p>Lyt godt efter, og prøv at gætte stedet.</p>` : `<p class="muted">Stedet er</p><p class="lgbig">${esc(T.place)}</p><p>Én af de andre er spion.</p>`,
        `<p class="lgbig">Alle har set deres kort</p>${T.reveal ? `<p>Stedet var <b>${esc(T.place)}</b>, og spionen var <b>${esc(lab(T.spy))}</b>.</p>` : '<p class="muted">Start timeren og begynd at spørge.</p>'}`)}</div>`;
      if (done) {
        if (!T.len) { T.len = 480; T.end = 0; T.left = 0; }
        h += `<div class="panel lgclock"><b id="lgsec">${lgSecs((T.left || T.len) * 1000)}</b><span class="muted" id="lgnext">${T.end ? 'Tiden løber' : T.left ? 'På pause' : '8 minutter'}</span></div>`;
        h += `<div class="btnrow lgbtns"><button type="button" class="gobtn" data-act="lgcstart">${T.end ? 'Pause' : T.left ? 'Fortsæt' : 'Start timeren'}</button>${T.reveal ? '' : `<button type="button" class="setbtn" data-act="lgsreveal">Afslør</button>`}<button type="button" class="setbtn" data-act="lgsnew">Ny runde</button></div>`;
      }
      h += `<details class="panel lgkey"><summary>Alle mulige steder</summary><p>${LG_SPY.map(esc).join(' · ')}</p></details>`;
    }
  }
  el.innerHTML = h;
  lgTickUpdate();
}
function lgNamesEditor(note) {
  const names = lgParty().names;
  return `<div class="field lgnames"><div class="flabel">Navne</div>
    <div class="lgnamechips">${names.map((n, i) => `<span class="lgname">${esc(n)}<button type="button" data-act="lgnrm" data-i="${i}" aria-label="Fjern ${esc(n)}">×</button></span>`).join('')}</div>
    <div class="lgnameadd"><input class="nameinp lgnamein" type="text" maxlength="16" autocomplete="off" enterkeyhint="done" placeholder="Tilføj navn"><button type="button" class="setbtn" data-act="lgnadd">Tilføj</button></div>
    ${note ? help(note) : ''}</div>`;
}
function lgTickUpdate() {
  lgStop();
  const T = lgT, t = T.tool || '';
  const sec = () => document.getElementById('lgsec');
  if (t === 'timer:hour' && T.start) {
    let lastMin = Math.floor((Date.now() - T.start) / 60000);
    const upd = () => {
      const el = sec(); if (!el) return lgStop();
      const ms = Date.now() - T.start, m = Math.floor(ms / 60000);
      if (m > lastMin) { lastMin = m; lgBeep(988, 350, 0.3); setTimeout(() => lgBeep(1319, 300, 0.3), 180); haptic(300); }
      if (m >= T.mins) { el.textContent = 'Færdig!'; document.getElementById('lgmin').textContent = `Alle ${T.mins} minutter er klaret`; document.getElementById('lgbar').style.width = '100%'; T.start = 0; T.paused = 0; lgStop(); return; }
      el.textContent = lgSecs(60000 - (ms % 60000));
      document.getElementById('lgmin').textContent = `Minut ${m + 1} af ${T.mins}`;
      document.getElementById('lgbar').style.width = `${(ms / (T.mins * 60000)) * 100}%`;
    };
    upd(); lgTick = setInterval(upd, 250);
  } else if (t === 'timer:hour') {
    const el = sec();
    if (el && T.paused) { const ms = T.paused; el.textContent = lgSecs(60000 - (ms % 60000)); document.getElementById('lgmin').textContent = `Minut ${Math.floor(ms / 60000) + 1} af ${T.mins}`; document.getElementById('lgbar').style.width = `${(ms / (T.mins * 60000)) * 100}%`; }
  } else if ((t === 'timer:60' || t === 'spy') && T.end) {
    const upd = () => {
      const el = sec(); if (!el) return lgStop();
      const left = T.end - Date.now();
      if (left <= 0) { el.textContent = '0:00'; document.getElementById('lgnext').textContent = 'Tiden er gået!'; T.end = 0; T.left = 0; lgBeep(660, 700, 0.35); haptic(500); lgStop(); const b = document.querySelector('[data-act=lgcstart]'); if (b) b.textContent = 'Start igen'; return; }
      el.textContent = lgSecs(left);
    };
    upd(); lgTick = setInterval(upd, 250);
  } else if (t === 'bomb' && T.st === 'run') {
    let next = Date.now();
    const upd = () => {
      if (!document.getElementById('pgtool')) return lgStop();
      const now = Date.now(), left = T.boom - now;
      if (left <= 0) { T.st = 'boom'; lgBeep(90, 900, 0.5); lgBeep(140, 600, 0.4); haptic(800); lgStop(); lgToolRender(); return; }
      if (now >= next) { lgBeep(left < 5000 ? 1400 : 1000, 60, 0.15); next = now + (left < 5000 ? 300 : left < 12000 ? 550 : 900); const tk = document.getElementById('lgtick'); if (tk) tk.classList.toggle('alt'); }
    };
    upd(); lgTick = setInterval(upd, 50);
  } else if (t === 'words' && T.st === 'run') {
    const upd = () => {
      const el = sec(); if (!el) return lgStop();
      const left = T.end - Date.now();
      if (left <= 0) { T.st = 'done'; lgBeep(660, 700, 0.35); haptic(500); lgStop(); lgToolRender(); return; }
      el.textContent = lgSecs(left);
    };
    upd(); lgTick = setInterval(upd, 250);
  }
}
function lgWordNext() {
  const T = lgT;
  if (!T.pool || !T.pool.length) T.pool = shuffle((T.wc === 'alle' ? Object.values(LG_WORDS).flat() : LG_WORDS[T.wc]).slice());
  T.word = T.pool.pop();
}

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'newlg') { go('lege'); return; }
  if (!act.startsWith('lg')) return;
  const T = lgT;
  const atr = LG_TRACK[T.id];
  if (atr && (atr.auto === act || (T.id === 'meyer' && (act === 'lgmhide' || act === 'lgmblind'))) && lgNames().length > 1 && !(act === 'lgcard' && !T.cards.length)) {
    T.by = lgTurnName(atr, lgBoard(T.id)); if (T.id !== 'meyer') lgAdvance(T.id); else { T.by = null; lgAdvance(T.id); } save(); lgBoardRender();
  }
  if (act === 'lgcat') { lgS.cat = b.dataset.v; lgRenderCatalog(); }
  else if (act === 'lgopen') go('lege-' + b.dataset.id);
  else if (act === 'lgrandom') { const L = view === 'party' && lgList().length ? lgList() : LG; let g; do { g = L[Math.floor(Math.random() * L.length)]; } while (L.length > 1 && g.id === lgT.id); go('lege-' + g.id); }
  else if (act === 'lgdraw') {
    const k = b.dataset.k, d = T.decks[k];
    T.cur = k; T.reshuffled = false;
    d.i++;
    if (d.i >= d.order.length) { d.order = shuffle(d.order); d.i = 0; T.reshuffled = true; }
    haptic(8); lgToolRender();
  } else if (act === 'lgcard') {
    if (!T.cards.length) return;
    T.drawn.push(T.cards.pop()); haptic(8); lgToolRender();
  } else if (act === 'lgshuffle') { T.cards = lgNewCards(); T.drawn = []; haptic(12); lgToolRender(); }
  else if (act === 'lgmroll') {
    if (lgNames().length > 1 && lgNames().filter(n => lgInGame(LG_TRACK.meyer, lgBoard('meyer'), n)).length < 2) return;
    if (T.st === 'hidden') T.prev = { who: T.roller, v: T.v };
    T.v = lgRoll(2); T.st = 'shown'; T.blind = false; T.res = null; T.roller = lgDiceTurn(); haptic(15); lgToolRender();
  }
  else if (act === 'lgmhide') { T.st = 'hidden'; haptic(8); lgToolRender(); }
  else if (act === 'lgmblind') { T.v = lgRoll(2); T.blind = true; T.st = 'hidden'; haptic(15); lgToolRender(); }
  else if (act === 'lgmlift') {
    T.st = 'lifted'; T.res = null;
    const ak = lgMeyerKey(T.v), aI = LG_MEYER_ORDER.indexOf(ak), pI = T.prev ? LG_MEYER_ORDER.indexOf(lgMeyerKey(T.prev.v)) : -1;
    if (ak !== '32') {
      if (ak === '21') lgMeyerJudge(T, true, 2, 'Der lå en ægte Meyer, så meldingen passede.');
      else if (T.prev && aI > pI) lgMeyerJudge(T, false, pI === 0 ? 2 : 1, `${T.prev.who ? esc(T.prev.who) : 'Den forrige'} slog ${esc(lgMeyer(T.prev.v)[0])}, så meldingen skulle være mindst ${esc(lgMeyer(T.prev.v)[0])}. ${esc(lgMeyer(T.v)[0])} er lavere.`);
    }
    haptic(T.res ? 40 : 25); lgToolRender();
  }
  else if (act === 'lgmskaal') {
    const B = lgBoard('meyer');
    if (T.roller && lgNames().length > 1) { B.turn = T.roller; save(); lgBoardRender(); }
    T.v = null; T.st = 'start'; T.roller = null; haptic(30); lgToolRender();
  }
  else if (act === 'lgmjudge') {
    if (!lgMeyerJudge(T, b.dataset.v === 'true', b.dataset.v === 'liem' ? 2 : 1, '')) { T.v = null; T.st = 'start'; T.roller = null; }
    haptic(40); lgToolRender();
  }
  else if (act === 'lgmundo') {
    const tr = LG_TRACK.meyer, B = lgBoard('meyer'), n = T.res && T.res.loser;
    if (n) { B.v[n] = Math.min(B.start || tr.start, lgVal(tr, B, n) + (T.res.loss || 1)); B.turn = n; save(); lgBoardRender(); }
    T.v = null; T.st = 'start'; T.roller = null; lgToolRender();
  }
  else if (act === 'lgmnew') { T.v = null; T.st = 'start'; T.roller = null; lgToolRender(); }
  else if (act === 'lgdn') { T.n = +b.dataset.v; T.v = null; lgToolRender(); }
  else if (act === 'lgdroll') { T.v = lgRoll(LG_DICE_N[T.id] || T.n || 2); T.hide = false; T.out = lgDiceOut(T, lgDiceTurn()); haptic(T.out && !T.out.again ? 25 : 15); save(); lgBoardRender(); lgToolRender(); }
  else if (act === 'lgdpass') { if (lgNames().length > 1) lgAdvance(T.id); lgDiceReset(); haptic(8); save(); lgBoardRender(); lgToolRender(); }
  else if (act === 'lgskibroll') { lgSkibRoll(T.sk); haptic(T.sk.done ? 25 : 15); save(); lgBoardRender(); lgToolRender(); }
  else if (act === 'lgskibkeep') { lgSkibDone(T.sk); haptic(20); save(); lgBoardRender(); lgToolRender(); }
  else if (act === 'lgskibnew') { T.res = {}; T.round = null; if (lgNames().length > 1) lgAdvance(T.id); lgDiceReset(); haptic(8); save(); lgBoardRender(); lgToolRender(); }
  else if (act === 'lgsnyddeal' || act === 'lgsnydnew') {
    const tr = LG_TRACK.snyd, B = lgBoard('snyd'), names = lgNames(), st = lgTurnName(tr, B);
    const alive = names.filter(n => lgInGame(tr, B, n)), i0 = Math.max(0, alive.indexOf(st));
    T.order = alive.slice(i0).concat(alive.slice(0, i0));
    T.hands = {}; T.order.forEach(n => { T.hands[n] = lgRoll(lgVal(tr, B, n)); });
    T.pi = 0; T.shown = false; T.call = false; T.face = null; T.lost = null;
    if (T.order.length < 2) T.hands = null;
    haptic(15); lgToolRender();
  }
  else if (act === 'lgsnydcall') { T.call = true; T.face = null; haptic(30); lgToolRender(); }
  else if (act === 'lgsnydface') { T.face = +b.dataset.v; haptic(8); lgToolRender(); }
  else if (act === 'lgsnydlose') {
    const tr = LG_TRACK.snyd, B = lgBoard('snyd'), n = b.dataset.n;
    B.v[n] = Math.max(0, lgVal(tr, B, n) - 1); T.lost = n;
    if (lgInGame(tr, B, n)) B.turn = n; else { const nm = lgNames(); let i = nm.indexOf(n); for (let k = 0; k < nm.length; k++) { i = (i + 1) % nm.length; if (lgInGame(tr, B, nm[i])) { B.turn = nm[i]; break; } } }
    haptic(40); save(); lgBoardRender(); lgToolRender();
  }
  else if (act === 'lgdhide') { T.hide = !T.hide; lgToolRender(); }
  else if (act === 'lgmins') { T.mins = +b.dataset.v; T.paused = 0; lgToolRender(); }
  else if (act === 'lghstart') {
    if (T.start) { T.paused = Date.now() - T.start; T.start = 0; }
    else { T.start = Date.now() - (T.paused || 0); T.paused = 0; lgBeep(880, 120, 0.2); }
    lgToolRender();
  } else if (act === 'lghreset') { T.start = 0; T.paused = 0; lgToolRender(); }
  else if (act === 'lglen') { T.len = +b.dataset.v; T.left = 0; lgToolRender(); }
  else if (act === 'lgcstart') {
    if (T.end) { T.left = Math.max(1, Math.ceil((T.end - Date.now()) / 1000)); T.end = 0; }
    else { T.end = Date.now() + (T.left || T.len) * 1000; T.left = 0; lgBeep(880, 120, 0.2); }
    lgToolRender();
  } else if (act === 'lgcreset') { T.end = 0; T.left = 0; lgToolRender(); }
  else if (act === 'lgbstart') { T.st = 'run'; T.boom = Date.now() + 15000 + Math.random() * 40000; lgBeep(1000, 60, 0.15); lgToolRender(); }
  else if (act === 'lgbcat') { T.ci = (T.ci + 1) % T.order.length; T.cat = LG_DECKS.kategorier.cards[T.order[T.ci]]; T.st = 'ready'; lgToolRender(); }
  else if (act === 'lgspin') {
    const names = lgNames();
    if (names.length < 2) return;
    const target = Math.floor(Math.random() * names.length);
    let i = 0, steps = 18 + Math.floor(Math.random() * names.length);
    T.pick = null;
    b.disabled = true;
    const box = document.querySelector('.lgspin');
    if (box) box.classList.remove('done');
    // The bottle spins for exactly as long as the names flick past, and slows down with them
    const btl = document.querySelector('.lgbottle'), from = T.bang || 0, dur = 40 * steps + 9 * steps * (steps + 1) / 2;
    T.bang = from + 360 * (3 + Math.floor(Math.random() * 2)) + Math.floor(Math.random() * 360);
    if (btl && btl.animate && !reduceMotion()) btl.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${T.bang}deg)` }], { duration: dur, easing: 'cubic-bezier(0.15, 0.7, 0.2, 1)', fill: 'forwards' });
    const spin = () => {
      const el = document.getElementById('lgspinname'); if (!el) return;
      const idx = (target - steps + names.length * 100) % names.length;
      el.textContent = names[idx];
      lgBeep(500 + (i % 2) * 150, 30, 0.08);
      if (steps-- > 0) { i++; setTimeout(spin, 40 + i * 9); }
      else { T.pick = target; haptic(30); lgToolRender(); }
    };
    spin();
  } else if (act === 'lgnadd') { lgAddName(b.closest('.lgnameadd').querySelector('input')); }
  else if (act === 'lgnrm') { lgParty().names.splice(+b.dataset.i, 1); save(); if (T.tool === 'spin') T.pick = null; lgRefreshNames(); }
  else if (act === 'lgfit') { lgS.fit = !lgS.fit; lgRenderCatalog(); }
  else if (act === 'lgwc') { T.wc = b.dataset.v; T.pool = null; lgToolRender(); }
  else if (act === 'lgwlen') { T.len = +b.dataset.v; lgToolRender(); }
  else if (act === 'lgwstart') { T.given = false; T.ok = []; T.skip = []; T.st = 'run'; T.end = Date.now() + T.len * 1000; lgWordNext(); lgBeep(880, 120, 0.2); lgToolRender(); }
  else if (act === 'lgwok' || act === 'lgwskip') { (act === 'lgwok' ? T.ok : T.skip).push(T.word); haptic(act === 'lgwok' ? 15 : 6); if (act === 'lgwok') lgBeep(1175, 90, 0.15); lgWordNext(); lgToolRender(); }
  else if (act === 'lgrn') { T.cfg.n = Math.max(4, Math.min(20, T.cfg.n + +b.dataset.d)); T.cfg.wolves = Math.min(T.cfg.wolves, Math.max(1, Math.floor((T.cfg.n - 1) / 2))); lgToolRender(); }
  else if (act === 'lgrw') { T.cfg.wolves = Math.max(1, T.cfg.wolves + +b.dataset.d); lgToolRender(); }
  else if (act === 'lgrt') { T.cfg[b.dataset.k] = !T.cfg[b.dataset.k]; lgToolRender(); }
  else if (act === 'lgrdeal') {
    const c = T.cfg, r = Array(c.wolves).fill('wolf');
    ['seer', 'witch', 'hunter'].forEach(k => { if (c[k] && r.length < c.n) r.push(k); });
    while (r.length < c.n) r.push('villager');
    T.roles = shuffle(r); T.pi = 0; T.shown = false; T.showAll = false; lgToolRender();
  } else if (act === 'lgreveal') { T.shown = true; haptic(10); lgToolRender(); }
  else if (act === 'lghide') { T.shown = false; T.pi++; lgToolRender(); }
  else if (act === 'lgrall') { if (!confirmed(b)) return; T.showAll = true; lgToolRender(); }
  else if (act === 'lgrnew') { T.roles = null; lgToolRender(); }
  else if (act === 'lgsn') { T.n = Math.max(3, Math.min(12, T.n + +b.dataset.d)); lgToolRender(); }
  else if (act === 'lgsdeal') { T.place = LG_SPY[Math.floor(Math.random() * LG_SPY.length)]; T.spy = Math.floor(Math.random() * T.n); T.pi = 0; T.shown = false; T.reveal = false; T.end = 0; T.left = 0; T.len = 0; lgToolRender(); }
  else if (act === 'lgsreveal') { T.reveal = true; lgToolRender(); }
  else if (act === 'lgsnew') { lgStop(); T.place = null; T.end = 0; T.left = 0; lgToolRender(); }
});
function lgAddName(inp) {
  if (!inp) return;
  const v = inp.value.trim();
  if (!v) return;
  const P = lgParty();
  if (P.names.length >= 24) return;
  P.names.push(v);
  save();
  if (lgT.tool === 'roles' && lgT.cfg && !lgT.roles) lgT.cfg.n = Math.max(lgT.cfg.n, Math.min(20, P.names.length));
  if (lgT.tool === 'spy' && !lgT.place) lgT.n = Math.max(lgT.n, Math.min(12, P.names.length));
  const box = inp.closest('#lgplayers, #pgboard, #pgtool');
  lgRefreshNames();
  const n = box && document.querySelector(`#${box.id} .lgnamein`);
  if (n) n.focus();
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target && e.target.classList && e.target.classList.contains('lgnamein')) { e.preventDefault(); lgAddName(e.target); }
});
document.addEventListener('input', e => {
  if (e.target && e.target.id === 'lgq') { lgS.q = e.target.value; lgRenderList(); }
});
document.addEventListener('click', e => {
  if (view !== 'pg' && view !== 'bpsetup') return;
  const b = e.target.closest('button[data-act="home"]');
  if (b) { e.stopImmediatePropagation(); go('lege'); }
}, true);

/* ---------- Spillere, tur, liv og point ---------- */
const LG_TRACK = {
  meyer: { m: 'lives', start: 6, u: ['liv', 'liv'], turn: 1, die: 1, max: 6 },
  snyd: { m: 'lives', start: 5, u: ['terning', 'terninger'], turn: 1, dice: 1 },
  kategorier: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  rim: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  bum: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  ordkaede: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  kuffert: { m: 'lives', start: 1, u: ['liv', 'liv'], turn: 1 },
  til21: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  bomben: { m: 'lives', start: 3, u: ['liv', 'liv'], turn: 1 },
  kunsporgsmal: { m: 'lives', start: 3, u: ['liv', 'liv'] },
  grisen: { m: 'points', target: 50, turn: 1 },
  tosandheder: { m: 'points', turn: 1 },
  hvemerjeg: { m: 'points', turn: 1 },
  monten: { m: 'points', turn: 1 },
  olbrik: { m: 'points', turn: 1, u: ['brik', 'brikker'], label: 'Rekord' },
  janej: { m: 'points', turn: 1, u: ['minut', 'minutter'] },
  skib: { m: 'points', turn: 1, u: ['sejr', 'sejre'] },
  indianer: { m: 'points', u: ['sejr', 'sejre'] },
  praesident: { m: 'points', u: ['gang præsident', 'gange præsident'] },
  krig: { m: 'points', u: ['stik', 'stik'] },
  mime: { m: 'teams' }, tegn: { m: 'teams' }, fiskeskal: { m: 'teams' }, flipcup: { m: 'teams', u: ['sejr', 'sejre'] }, olstafet: { m: 'teams', u: ['sejr', 'sejre'] }, sangdruk: { m: 'teams' },
  varulv: { m: 'alive' }, blinkemorder: { m: 'alive' }, stoleleg: { m: 'alive' }, sardiner: { m: 'turn' },
  kongenskop: { m: 'turn', auto: 'lgcard' }, hojlav: { m: 'turn' }, fuckdealer: { m: 'turn', label: 'Gætter' }, bussen: { m: 'turn' }, pyramiden: { m: 'turn' },
  aldrig: { m: 'turn', auto: 'lgdraw' }, mest: { m: 'turn', auto: 'lgdraw' }, hellere: { m: 'turn', auto: 'lgdraw' }, sandhed: { m: 'turn', auto: 'lgdraw' }, paranoia: { m: 'turn', auto: 'lgdraw' },
  varmestol: { m: 'turn' }, tremand: { m: 'turn' }, syvelleve: { m: 'turn' }, terningbord: { m: 'turn' }, jenga: { m: 'turn' }, olsen: { m: 'turn' }, hestelob: { m: 'turn' },
  tyve: { m: 'turn' }, kontakt: { m: 'turn', label: 'Ordmester' }, gaetsangen: { m: 'points', turn: 1 }, kims: { m: 'points' }, psykiater: { m: 'turn', label: 'Psykiater' }
};
function lgGen(n) { return /[sxz]$/i.test(n) ? n + "'" : n + 's'; }
function lgBoard(id) {
  const P = lgParty();
  if (!P.boards || typeof P.boards !== 'object') P.boards = {};
  if (!P.boards[id]) P.boards[id] = { v: {} };
  const B = P.boards[id];
  if (!B.v) B.v = {};
  return B;
}
function lgVal(tr, B, n) { return typeof B.v[n] === 'number' ? B.v[n] : tr.m === 'lives' ? (B.start || tr.start) : tr.m === 'alive' ? 1 : 0; }
function lgInGame(tr, B, n) { return !(tr.m === 'lives' || tr.m === 'alive') || lgVal(tr, B, n) > 0; }
function lgTurnName(tr, B) {
  const names = lgNames();
  if (!names.length) return null;
  const alive = names.filter(n => lgInGame(tr, B, n));
  if (!alive.length) return null;
  if (!alive.includes(B.turn)) B.turn = alive[0];
  return B.turn;
}
function lgAdvance(id) {
  const tr = LG_TRACK[id];
  if (!tr) return;
  const B = lgBoard(id);
  if (tr.m === 'teams') { B.tt = B.tt ? 0 : 1; return; }
  const names = lgNames();
  const cur = lgTurnName(tr, B);
  if (!cur) return;
  let i = names.indexOf(cur);
  for (let k = 0; k < names.length; k++) {
    i = (i + 1) % names.length;
    if (lgInGame(tr, B, names[i])) { B.turn = names[i]; return; }
  }
}
function lgTeams(B) {
  const names = lgNames();
  const flat = (B.teams || []).flat();
  if (!B.teams || names.some(n => !flat.includes(n)) || flat.some(n => !names.includes(n))) {
    const s = shuffle(names.slice());
    B.teams = [s.filter((_, i) => i % 2 === 0), s.filter((_, i) => i % 2 === 1)];
  }
  if (!Array.isArray(B.tp)) B.tp = [0, 0];
  return B.teams;
}
function lgUnit(tr, v) { const u = tr.u || (tr.m === 'lives' ? ['liv', 'liv'] : ['point', 'point']); return v === 1 ? u[0] : u[1]; }
function lgPips(tr, v, start) {
  if (tr.die && v > 6) return `<b>${v}</b>`;
  if (tr.die) return `<span class="lglifedie">${v > 0 && v <= 6 ? lgDie(v) : '<svg class="die" viewBox="0 0 100 100" aria-label="0"><rect x="4" y="4" width="92" height="92" rx="20" fill="none" stroke="rgba(128,128,128,.4)" stroke-width="4" stroke-dasharray="10 8"/></svg>'}</span>`;
  if (start > 8) return `<b>${v}</b>`;
  const sym = tr.dice ? '■' : '♥';
  return `<span class="lgpips${tr.dice ? ' sq' : ''}">${Array.from({ length: start }, (_, i) => `<i class="${i < v ? 'on' : ''}">${sym}</i>`).join('')}</span>`;
}
function lgBoardHtml(id) {
  const tr = LG_TRACK[id];
  if (!tr) return '';
  const names = lgNames();
  if (names.length < 2) {
    return `<section class="lgboardsec"><h2>Spillere</h2><div class="panel lgboard empty"><p>Tilføj mindst to spillere, så holder siden styr på ${tr.m === 'lives' ? 'liv og tur' : tr.m === 'points' ? 'point' : tr.m === 'teams' ? 'hold og point' : tr.m === 'alive' ? 'hvem der er ude' : 'hvis tur det er'}.</p>${lgNamesEditor()}</div></section>`;
  }
  const B = lgBoard(id);
  let h = '';
  if (tr.m === 'teams') {
    const T = lgTeams(B);
    h += `<div class="lgteams">${T.map((tm, i) => `<div class="panel lgteam${B.tt === i ? ' on' : ''}"><div class="lgteam-h"><b>Hold ${i + 1}</b>${B.tt === i ? '<span class="lgtag">Tur</span>' : ''}</div><p>${tm.map(esc).join(', ') || '–'}</p>
      <div class="lgscore"><button type="button" class="lgmini" data-act="lgtp" data-i="${i}" data-d="-1" aria-label="Et point mindre"${B.tp[i] <= 0 ? ' disabled' : ''}>−</button><b>${B.tp[i]}</b><button type="button" class="lgmini plus" data-act="lgtp" data-i="${i}" data-d="1" aria-label="Et point mere">+</button></div></div>`).join('')}</div>
      <div class="btnrow"><button type="button" class="setbtn" data-act="lgnext">Næste hold</button><button type="button" class="setbtn" data-act="lgmix">Bland holdene</button><button type="button" class="setbtn danger" id="lgbreset" data-act="lgbreset" data-label="Nulstil point" data-confirm="Tryk igen">Nulstil point</button></div>`;
    return `<section class="lgboardsec"><h2>Hold</h2>${h}</section>`;
  }
  const turn = (tr.turn || tr.m === 'turn') ? lgTurnName(tr, B) : null;
  if (turn) h += `<div class="panel lgturn"><span class="lgturn-k">${tr.label && tr.m === 'turn' ? esc(tr.label) : 'Tur'}</span><b>${esc(turn)}</b><button type="button" class="setbtn go" data-act="lgnext">Næste</button></div>`;
  if (tr.m === 'turn') return `<section class="lgboardsec">${h}</section>`;
  const alive = names.filter(n => lgInGame(tr, B, n));
  let win = null;
  if ((tr.m === 'lives' || tr.m === 'alive') && alive.length === 1 && names.length > 1) win = alive[0];
  const lost = tr.firstOut ? names.find(n => lgVal(tr, B, n) <= 0) : null;
  if (lost) { win = null; h = `<div class="panel lgwin"><span>Har tabt</span><b>${esc(lost)}</b></div>` + h; }
  if (tr.m === 'points' && tr.target) win = names.find(n => lgVal(tr, B, n) >= tr.target) || null;
  if (win) h = `<div class="panel lgwin"><span>${tr.m === 'alive' ? 'Sidst tilbage' : 'Vinder'}</span><b>${esc(win)}</b></div>` + h;
  const start = B.start || tr.start || 1;
  h += `<div class="panel lgboard">${names.map(n => {
    const v = lgVal(tr, B, n), out = (tr.m === 'lives' || tr.m === 'alive') && v <= 0;
    let right = '';
    if (tr.m === 'lives') right = `${lgPips(tr, v, start)}<span class="lgv">${v} ${lgUnit(tr, v)}</span><button type="button" class="lgmini" data-act="lgbv" data-n="${esc(n)}" data-d="-1" aria-label="${esc(n)} mister et liv"${v <= 0 ? ' disabled' : ''}>−</button><button type="button" class="lgmini plus" data-act="lgbv" data-n="${esc(n)}" data-d="1" aria-label="${esc(n)} får et liv"${v >= start ? ' disabled' : ''}>+</button>`;
    else if (tr.m === 'alive') right = `<button type="button" class="lgalive${out ? ' out' : ''}" data-act="lgbv" data-n="${esc(n)}" data-d="${out ? 1 : -1}">${out ? 'Ude' : 'Med'}</button>`;
    else right = `<b class="lgpts">${v}${tr.target ? `<small>/${tr.target}</small>` : ''}</b><button type="button" class="lgmini" data-act="lgbv" data-n="${esc(n)}" data-d="-1" aria-label="Et point mindre"${v <= 0 ? ' disabled' : ''}>−</button><button type="button" class="lgmini plus" data-act="lgbv" data-n="${esc(n)}" data-d="1" aria-label="Et point mere">+</button>`;
    return `<div class="lgprow${out ? ' out' : ''}${n === turn ? ' turn' : ''}"><span class="lgpn">${esc(n)}${out && tr.m === 'lives' ? ' <em>ude</em>' : ''}</span><span class="lgpr">${right}</span></div>`;
  }).join('')}</div>`;
  h += `<div class="btnrow">${tr.m === 'lives' ? `<span class="lgstartlbl">Start med</span><div class="stepper lgstep sm"><button type="button" data-act="lgbstartn" data-d="-1"${start <= 1 ? ' disabled' : ''}>−</button><b>${start}</b><button type="button" data-act="lgbstartn" data-d="1"${start >= (tr.max || 10) ? ' disabled' : ''}>+</button></div>` : ''}<button type="button" class="setbtn danger" id="lgbreset" data-act="lgbreset" data-label="Start forfra" data-confirm="Tryk igen">Start forfra</button></div>`;
  return `<section class="lgboardsec"><h2>${tr.m === 'alive' ? 'Hvem er med' : tr.label || (tr.m === 'lives' ? (tr.dice ? 'Terninger tilbage' : 'Liv') : 'Point')}</h2>${h}</section>`;
}
function lgBoardRender() {
  const el = document.getElementById('pgboard');
  if (el) el.innerHTML = lgBoardHtml(lgT.id);
}
function lgSuggest() {
  const have = new Set(lgParty().names.map(n => n.toLowerCase()));
  const out = [];
  const add = n => { n = (n || '').trim(); if (n && !have.has(n.toLowerCase()) && !out.some(x => x.toLowerCase() === n.toLowerCase())) out.push(n); };
  const gs = [store.draft, store.draftBp, store.draftFc].concat(store.games).filter(Boolean);
  gs.forEach(g => {
    if (g.type === 'bp') (g.teams || []).forEach(t => (t.p || []).forEach(add));
    else if (g.type === 'fc') (g.ents || []).forEach(t => (t.p || []).forEach(add));
    else (g.players || []).forEach(p => add(p.name));
  });
  return out.slice(0, 10);
}
function lgPlayersPanel() {
  const names = lgParty().names;
  const sug = lgSuggest();
  return `<div class="panel lgplayers"><div class="lgpl-h"><b>Spillere</b><span class="muted">${names.length ? plural(names.length, 'spiller', 'spillere') : 'Ingen endnu'}</span></div>
    ${lgNamesEditor(names.length ? '' : 'Skriv hvem der er med. Navnene bruges til tur, liv og point i spillene.')}
    ${sug.length ? `<div class="lgsug"><span class="muted">Fra jeres andre spil:</span>${sug.map(n => `<button type="button" class="lgsugbtn" data-act="lgsug" data-n="${esc(n)}">+ ${esc(n)}</button>`).join('')}</div>` : ''}
    ${names.length > 1 ? `<div class="btnrow"><button type="button" class="setbtn danger" id="lgclearnames" data-act="lgclearnames" data-label="Fjern alle" data-confirm="Tryk igen">Fjern alle</button></div>` : ''}</div>`;
}
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (!['lgnext', 'lgmix', 'lgtp', 'lgbv', 'lgbreset', 'lgbstartn', 'lgsug', 'lgclearnames', 'lgpigroll', 'lgpigsave', 'lgwgive'].includes(act)) return;
  e.stopImmediatePropagation();
  const id = lgT.id, tr = LG_TRACK[id], B = id ? lgBoard(id) : null;
  if (act === 'lgsug') { lgParty().names.push(b.dataset.n); save(); lgRefreshNames(); return; }
  if (act === 'lgclearnames') { if (!confirmed(b)) return; lgParty().names = []; save(); lgRefreshNames(); return; }
  if (!tr) return;
  if (act === 'lgnext') { lgAdvance(id); haptic(8); if (lgT.tool === 'dice' && lgT.id === id && id !== 'snyd') lgDiceReset(); }
  else if (act === 'lgmix') { B.teams = null; lgTeams(B); haptic(10); }
  else if (act === 'lgtp') { lgTeams(B); B.tp[+b.dataset.i] = Math.max(0, B.tp[+b.dataset.i] + +b.dataset.d); haptic(8); }
  else if (act === 'lgbv') {
    const n = b.dataset.n, start = B.start || tr.start || 1;
    let v = lgVal(tr, B, n) + +b.dataset.d;
    if (tr.m === 'lives' || tr.m === 'alive') v = Math.max(0, Math.min(tr.m === 'alive' ? 1 : start, v)); else v = Math.max(0, v);
    B.v[n] = v;
    haptic(v <= 0 ? 40 : 8);
    if (B.turn === n && !lgInGame(tr, B, n)) lgAdvance(id);
  } else if (act === 'lgbreset') { if (!confirmed(b)) return; B.v = {}; B.tp = [0, 0]; B.turn = null; B.trem = null; if (lgT.id === id && (lgT.tool === 'dice' || lgT.tool === 'meyer')) { lgDiceReset(); lgT.res = {}; lgT.round = null; lgT.hands = null; lgT.st = 'start'; } }
  else if (act === 'lgbstartn') { B.start = Math.max(1, Math.min(tr.max || 10, (B.start || tr.start) + +b.dataset.d)); B.v = {}; }
  else if (act === 'lgpigroll') {
    const T = lgT, d = lgRoll(1)[0];
    T.pv = d; haptic(15);
    if (d === 1) { T.pt = 0; T.bust = lgTurnName(tr, B); lgAdvance(id); } else { T.pt = (T.pt || 0) + d; T.bust = null; }
  } else if (act === 'lgpigsave') {
    const T = lgT, n = lgTurnName(tr, B);
    if (n && T.pt) { B.v[n] = lgVal(tr, B, n) + T.pt; }
    T.pt = 0; T.pv = null; T.bust = null; T.saved = n; lgAdvance(id); haptic(15);
  } else if (act === 'lgwgive') {
    const T = lgT, k = T.ok.length;
    if (tr.m === 'teams') { lgTeams(B); B.tp[+b.dataset.i] += k; B.tt = +b.dataset.i ? 0 : 1; }
    else { const n = lgTurnName(tr, B); if (n) B.v[n] = lgVal(tr, B, n) + k; lgAdvance(id); }
    T.given = true; haptic(15);
  }
  save();
  lgBoardRender();
  if (['lgpigroll', 'lgpigsave', 'lgwgive', 'lgbreset', 'lgnext', 'lgbv', 'lgbstartn'].includes(act)) lgToolRender();
}, true);
function lgRefreshNames() {
  if (view === 'party') lgRenderCatalog();
  else { lgBoardRender(); lgToolRender(); }
}

