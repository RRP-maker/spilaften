
const EMBLEM = '@@IMG:emblem@@';
const PALETTE = [
  { id: 'red', label: 'Rød', color: '#e52521' },
  { id: 'blue', label: 'Blå', color: '#0b8de0' },
  { id: 'green', label: 'Grøn', color: '#2e9e3e' },
  { id: 'yellow', label: 'Gul', color: '#ffcf1f' },
  { id: 'purple', label: 'Lilla', color: '#8e44ad' },
  { id: 'pink', label: 'Pink', color: '#ff6fae' },
  { id: 'orange', label: 'Orange', color: '#ff9800' },
  { id: 'teal', label: 'Turkis', color: '#14b8a6' },
  { id: 'lime', label: 'Lime', color: '#9bdc28' },
  { id: 'brown', label: 'Brun', color: '#8b5a2b' },
  { id: 'white', label: 'Hvid', color: '#f4f4f8' },
  { id: 'black', label: 'Sort', color: '#3a3a4c' }
];
const PC = {};
PALETTE.forEach(c => { PC[c.id] = c; });
const MAX_P = PALETTE.length;
const MODES = [
  { id: 'tur', name: 'Hurtig tur', desc: 'Alle kører ét Grand Prix. Godt, når tiden er knap.' },
  { id: 'kval', name: 'Kvalifikation', desc: 'Alle kører lige mange Grand Prix mod skiftende modstandere.' },
  { id: 'liga', name: 'Liga', desc: 'Alle møder alle. Du vælger, hvor mange gange.' }
];
const MODE = {};
MODES.forEach(m => { MODE[m.id] = m; });
const DEFCFG = {
  format: 'kval', plays: 3, meets: 1, size: 3, tracks: 4,
  finale: true, finN: 3, finGP: 1,
  rank: 'auto', spread: true,
  cupMode: 'free', dlc: true
};
const CUPS_BASE = ['Mushroom Cup', 'Flower Cup', 'Star Cup', 'Special Cup', 'Egg Cup', 'Crossing Cup',
  'Shell Cup', 'Banana Cup', 'Leaf Cup', 'Lightning Cup', 'Triforce Cup', 'Bell Cup'];
const CUPS_DLC = ['Golden Dash Cup', 'Lucky Cat Cup', 'Turnip Cup', 'Propeller Cup', 'Rock Cup', 'Moon Cup',
  'Fruit Cup', 'Boomerang Cup', 'Feather Cup', 'Cherry Cup', 'Acorn Cup', 'Spiny Cup'];
// Character icons for players (fan art supplied by the user)
const CHARS = ["@@IMG:chars/00@@", "@@IMG:chars/01@@", "@@IMG:chars/02@@", "@@IMG:chars/03@@", "@@IMG:chars/04@@", "@@IMG:chars/05@@", "@@IMG:chars/06@@", "@@IMG:chars/07@@", "@@IMG:chars/08@@", "@@IMG:chars/09@@", "@@IMG:chars/10@@", "@@IMG:chars/11@@", "@@IMG:chars/12@@", "@@IMG:chars/13@@", "@@IMG:chars/14@@", "@@IMG:chars/15@@", "@@IMG:chars/16@@", "@@IMG:chars/17@@", "@@IMG:chars/18@@", "@@IMG:chars/19@@", "@@IMG:chars/20@@", "@@IMG:chars/21@@", "@@IMG:chars/22@@", "@@IMG:chars/23@@", "@@IMG:chars/24@@", "@@IMG:chars/25@@", "@@IMG:chars/26@@", "@@IMG:chars/27@@", "@@IMG:chars/28@@", "@@IMG:chars/29@@", "@@IMG:chars/30@@", "@@IMG:chars/31@@", "@@IMG:chars/32@@", "@@IMG:chars/33@@", "@@IMG:chars/34@@", "@@IMG:chars/35@@", "@@IMG:chars/36@@", "@@IMG:chars/37@@", "@@IMG:chars/38@@", "@@IMG:chars/39@@", "@@IMG:chars/40@@", "@@IMG:chars/41@@", "@@IMG:chars/42@@", "@@IMG:chars/43@@", "@@IMG:chars/44@@", "@@IMG:chars/45@@", "@@IMG:chars/46@@"];
// Cup emblems, keyed by the exact cup name
const CUP_IMG = {"Mushroom Cup": "@@IMG:cups/mushroom-cup@@", "Flower Cup": "@@IMG:cups/flower-cup@@", "Star Cup": "@@IMG:cups/star-cup@@", "Special Cup": "@@IMG:cups/special-cup@@", "Egg Cup": "@@IMG:cups/egg-cup@@", "Crossing Cup": "@@IMG:cups/crossing-cup@@", "Shell Cup": "@@IMG:cups/shell-cup@@", "Banana Cup": "@@IMG:cups/banana-cup@@", "Leaf Cup": "@@IMG:cups/leaf-cup@@", "Lightning Cup": "@@IMG:cups/lightning-cup@@", "Triforce Cup": "@@IMG:cups/triforce-cup@@", "Bell Cup": "@@IMG:cups/bell-cup@@", "Golden Dash Cup": "@@IMG:cups/golden-dash-cup@@", "Lucky Cat Cup": "@@IMG:cups/lucky-cat-cup@@", "Turnip Cup": "@@IMG:cups/turnip-cup@@", "Propeller Cup": "@@IMG:cups/propeller-cup@@", "Rock Cup": "@@IMG:cups/rock-cup@@", "Moon Cup": "@@IMG:cups/moon-cup@@", "Fruit Cup": "@@IMG:cups/fruit-cup@@", "Boomerang Cup": "@@IMG:cups/boomerang-cup@@", "Feather Cup": "@@IMG:cups/feather-cup@@", "Cherry Cup": "@@IMG:cups/cherry-cup@@", "Acorn Cup": "@@IMG:cups/acorn-cup@@", "Spiny Cup": "@@IMG:cups/spiny-cup@@"};
const NUMK = new Set(['plays', 'meets', 'size', 'tracks', 'finN', 'finGP']);
const STRUCT = { format: 'Turneringsformen er ændret.', plays: 'Antal Grand Prix pr. spiller er ændret.', meets: 'Antal møder i ligaen er ændret.', size: 'Antal spillere pr. Grand Prix er ændret.', spread: 'Rækkefølgen er lavet om.' };
const KEY = 'mk-turnering-v6';

function fresh(cfg) {
  return { players: [], rounds: [], fin: [{}], fc: [''], x: [], seq: 0, info: '', cfg: Object.assign({}, DEFCFG, cfg || {}) };
}
function valid(x) {
  return x && Array.isArray(x.players) && Array.isArray(x.rounds) && Array.isArray(x.fin) && Array.isArray(x.x) && x.cfg &&
    x.rounds.every(r => r && Array.isArray(r.p) && r.g);
}
const STORE_KEY = 'spilaften-v1';
let S = fresh();
let view = 'home', addOpen = false, wdOpen = false;
let store = { party: { names: [] }, games: [], draft: null, lastCfg: null, draftBp: null, lastBpCfg: null, draftFc: null, lastFcCfg: null };
function withS(g, fn) { const o = S; S = g; try { return fn(); } finally { S = o; } }
function normalize(g) {
  g.cfg = Object.assign({}, DEFCFG, g.cfg);
  if (!Array.isArray(g.fc)) g.fc = [];
  g.players.forEach(p => { if (typeof p.ch !== 'number' || !CHARS[p.ch]) p.ch = pickChar(g); });
  withS(g, syncFin);
  return g;
}
try {
  const st = JSON.parse(localStorage.getItem(STORE_KEY));
  if (st && Array.isArray(st.games)) {
    store.games = st.games.filter(g => g && (g.type === 'bp' ? bpValid(g) : g.type === 'fc' ? fcValid(g) : valid(g))).map(g => g.type === 'bp' ? bpNormalize(g) : g.type === 'fc' ? fcNormalize(g) : normalize(g));
    store.draftFc = fcValid(st.draftFc) ? fcNormalize(st.draftFc) : null;
    store.lastFcCfg = st.lastFcCfg || null;
    store.draftBp = bpValid(st.draftBp) ? bpNormalize(st.draftBp) : null;
    store.lastBpCfg = st.lastBpCfg || null;
    store.draft = valid(st.draft) ? normalize(st.draft) : null;
    store.lastCfg = st.lastCfg || null;
    if (st.party && Array.isArray(st.party.names)) store.party = { names: st.party.names.filter(x => typeof x === 'string').slice(0, 24), boards: st.party.boards && typeof st.party.boards === 'object' ? st.party.boards : {} };
  } else {
    // Bring over the tournament from the earlier version as an ongoing game
    const old = JSON.parse(localStorage.getItem(KEY));
    if (valid(old) && old.players.length) {
      old.id = 'g' + Date.now().toString(36);
      old.type = 'mk';
      old.created = Date.now();
      store.games.push(normalize(old));
    }
  }
} catch (e) {}
function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (e) {} }
function syncFin() {
  while (S.fin.length < S.cfg.finGP) S.fin.push({});
  S.fin.length = S.cfg.finGP;
  while (S.fc.length < S.cfg.finGP) S.fc.push('');
  S.fc.length = S.cfg.finGP;
}

