function gameInfo(g) {
  let when = '';
  const fmt = (t, o) => { try { return new Date(t).toLocaleString('da-DK', o); } catch (e) { return ''; } };
  when = fmt(g.created, { weekday: 'long', hour: '2-digit', minute: '2-digit' });
  const date = fmt(g.archived || g.created, { day: 'numeric', month: 'long', year: 'numeric' });
  if (g.type === 'fc') {
    const n = g.ents.filter(t => !t.out).length;
    return { emblem: `<span class="gemblem">${fcEmblemSvg}</span>`, title: 'FIFA', sub: `${plural(n, 'deltager', 'deltagere')} · ${FCF[g.cfg.format].name}`, st: fcStatus(g), when, date };
  }
  if (g.type === 'bp') {
    const n = g.teams.filter(t => !t.out).length;
    return { emblem: `<span class="gemblem">${bpEmblemSvg}</span>`, title: 'Beerpong', sub: `${plural(n, 'hold', 'hold')} · ${BPF[g.cfg.format].name}`, st: bpStatus(g), when, date };
  }
  const n = g.players.filter(p => p.active).length;
  return { emblem: `<img class="emblem gemblem" src="${EMBLEM}" alt="" width="44" height="44">`, title: 'Mario Kart', sub: `${plural(n, 'spiller', 'spillere')} · ${MODE[g.cfg.format].name}`, st: gameStatus(g), when, date };
}
function renderHistory() {
  document.getElementById('navtitle').textContent = 'Tidligere spil';
  const list = store.games.filter(g => g.archived).sort((a, b) => b.archived - a.archived);
  document.getElementById('histsub').textContent = list.length ? `${plural(list.length, 'afsluttet turnering', 'afsluttede turneringer')}. De kan ses, men ikke ændres.` : 'Her lander turneringer, når I trykker Afslut.';
  document.getElementById('histlist').innerHTML = list.map(g => {
    const I = gameInfo(g);
    const time = (() => { try { return new Date(g.created).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } })();
    return `<div class="panel gitem"><div class="gi-main">${I.emblem}<div class="gi-text"><b>${I.title} <span class="when">· ${esc(I.date)}</span></b>
      <small>${I.sub}${time ? ' · startet kl. ' + esc(time) : ''}</small><span class="gstat">${esc(I.st.done ? I.st.text : 'Ikke spillet færdig · ' + I.st.text)}</span></div></div>
      <div class="gi-btns"><button type="button" class="gobtn" data-act="open" data-id="${g.id}">Se turneringen</button>
      <button type="button" class="rm" id="hrm-${g.id}" data-act="histrm" data-id="${g.id}" data-label="Fjern" data-confirm="Sikker?">Fjern</button></div></div>`;
  }).join('') || '<div class="panel empty histempty"><b>Ingen tidligere spil</b><span class="muted">Når en turnering er slut, kan du trykke Afslut på forsiden. Så bliver den gemt her.</span></div>';
  document.getElementById('histfoot').innerHTML = list.length > 1 ? `<div class="btnrow">${confirmBtn('histclear', 'histclear', 'Fjern alle tidligere spil', 'danger')}</div>` : '';
}
function roBanner(g) {
  const I = gameInfo(g);
  const el = document.getElementById('robanner');
  const hdr = document.querySelector(`main > header.top.v${view}`);
  if (hdr) hdr.after(el);
  el.innerHTML = `<p><b>Afsluttet ${esc(I.date)}</b><small>Kan ikke ændres. Genoptag den for at rette noget.</small></p><button type="button" class="setbtn" data-act="unarchive" data-id="${g.id}">Genoptag</button>`;
}
const RO_OK = new Set(['home', 'unarchive', 'closepanels']);
function roUnlock() {
  document.querySelectorAll('[data-rolock]').forEach(x => { x.disabled = false; delete x.dataset.rolock; });
  document.querySelectorAll('.rohide').forEach(x => x.classList.remove('rohide'));
}
function roLock() {
  if (!document.body.dataset.ro) return;
  document.querySelectorAll('main input:not(:disabled), main select:not(:disabled), main textarea:not(:disabled)').forEach(x => { x.disabled = true; x.dataset.rolock = '1'; });
  document.querySelectorAll('main button[data-act]').forEach(x => {
    if (!RO_OK.has(x.dataset.act) && !x.closest('.toolbar')) x.classList.add('rohide');
  });
}
new MutationObserver(() => roLock()).observe(document.querySelector('main'), { childList: true, subtree: true });
document.addEventListener('click', e => {
  if (!document.body.dataset.ro) return;
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  if (b.dataset.act === 'home') { e.stopImmediatePropagation(); go('tidligere'); return; }
  if (!RO_OK.has(b.dataset.act)) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'history') { go('tidligere'); return; }
  if (!['archive', 'unarchive', 'histrm', 'histclear'].includes(act)) return;
  if (act !== 'unarchive' && !confirmed(b)) return;
  const g = store.games.find(x => x.id === b.dataset.id);
  if (act === 'archive' && g) { g.archived = Date.now(); haptic(12); }
  else if (act === 'unarchive' && g) { delete g.archived; save(); haptic(12); go('spil-' + g.id); return; }
  else if (act === 'histrm') store.games = store.games.filter(x => x.id !== b.dataset.id);
  else if (act === 'histclear') store.games = store.games.filter(x => !x.archived);
  save();
  if (view === 'home') renderHome(); else renderHistory();
});
function renderHome() {
  const el = document.getElementById('ongoing');
  let html = '';
  const d = store.draft;
  if (d && d.players.length) {
    const n = d.players.filter(p => p.active).length;
    html += `<div class="panel gitem"><div class="gi-main"><img class="emblem gemblem draft" src="${EMBLEM}" alt="" width="44" height="44"><div class="gi-text"><b>Mario Kart</b><small>${n} spiller${n === 1 ? '' : 'e'} · ${MODE[d.cfg.format].name}</small><span class="gstat">Ikke startet endnu</span></div></div>
      <div class="gi-btns"><button type="button" class="gobtn" data-act="newgame">Fortsæt opsætning</button></div></div>`;
  }
  const db = store.draftBp;
  if (db && db.teams.length) {
    html += `<div class="panel gitem"><div class="gi-main"><span class="gemblem draft">${bpEmblemSvg}</span><div class="gi-text"><b>Beerpong</b><small>${plural(db.teams.length, 'hold', 'hold')} · ${BPF[db.cfg.format].name}</small><span class="gstat">Ikke startet endnu</span></div></div>
      <div class="gi-btns"><button type="button" class="gobtn" data-act="newbp">Fortsæt opsætning</button></div></div>`;
  }
  const dfc = store.draftFc;
  if (dfc && dfc.ents.length) {
    html += `<div class="panel gitem"><div class="gi-main"><span class="gemblem draft">${fcEmblemSvg}</span><div class="gi-text"><b>FIFA</b><small>${plural(dfc.ents.length, 'deltager', 'deltagere')} · ${FCF[dfc.cfg.format].name}</small><span class="gstat">Ikke startet endnu</span></div></div>
      <div class="gi-btns"><button type="button" class="gobtn" data-act="newfc">Fortsæt opsætning</button></div></div>`;
  }
  const live = store.games.filter(g => !g.archived);
  html += live.map(g => {
    const I = gameInfo(g);
    return `<div class="panel gitem${I.st.done ? ' isdone' : ''}"><div class="gi-main">${I.emblem}<div class="gi-text"><b>${I.title}</b>
      <small>${I.sub}${I.when ? ' · startet ' + esc(I.when) : ''}</small><span class="gstat">${esc(I.st.text)}</span></div></div>
      <div class="gi-btns"><button type="button" class="gobtn" data-act="open" data-id="${g.id}">${I.st.done ? 'Se resultat' : 'Fortsæt'}</button>
      <button type="button" class="rm" id="arc-${g.id}" data-act="archive" data-id="${g.id}" data-label="Afslut" data-confirm="Tryk igen">Afslut</button>
      <button type="button" class="rm" id="del-${g.id}" data-act="delgame" data-id="${g.id}" data-label="Slet" data-confirm="Sikker?">Slet</button></div></div>`;
  }).join('');
  const nh = store.games.length - live.length;
  document.getElementById('histcount').textContent = nh ? `${plural(nh, 'afsluttet turnering', 'afsluttede turneringer')}` : 'Ingen afsluttede turneringer endnu';
  el.innerHTML = html || '<div class="panel empty">Ingen spil i gang. Vælg et spil nedenfor for at starte.</div>';
}
function go(h) {
  if (location.hash.replace('#', '') === h) route();
  else location.hash = h;
}
function route() {
  const h = location.hash.replace('#', '');
  addOpen = false; wdOpen = false; armedId = null; finalKey = '';
  ['addpanel', 'wdpanel'].forEach(id => { document.getElementById(id).innerHTML = ''; });
  document.documentElement.style.overflow = '';
  let g = h.startsWith('spil-') ? store.games.find(x => x.id === h.slice(5)) : null;
  const ro = !!(g && g.archived);
  if (ro) {
    g = JSON.parse(JSON.stringify(g));
    if (g.type === 'fc') fcNormalize(g); else if (g.type === 'bp' && typeof bpNormalize === 'function') bpNormalize(g);
  }
  if (ro) document.body.dataset.ro = '1'; else if (document.body.dataset.ro) { delete document.body.dataset.ro; roUnlock(); }
  document.getElementById('backlbl').textContent = ro ? 'Tidligere spil' : h.startsWith('lege-') ? 'Alle lege' : h === 'ny-bp' ? 'Drukspil' : 'Forside';
  lgStop();
  if (h === 'ny') {
    view = 'setup';
    if (!store.draft) store.draft = fresh(store.lastCfg);
    S = store.draft;
  } else if (h === 'ny-bp') {
    view = 'bpsetup';
    if (!store.draftBp) store.draftBp = bpFresh(store.lastBpCfg);
    B = store.draftBp;
  } else if (h === 'tidligere') {
    view = 'history';
  } else if (h === 'lege') {
    view = 'party';
  } else if (h.startsWith('lege-')) {
    view = 'pg';
  } else if (h === 'ny-fc') {
    view = 'fcsetup';
    if (!store.draftFc) store.draftFc = fcFresh(store.lastFcCfg);
    F = store.draftFc;
  } else if (g && g.type === 'fc') {
    view = 'fcplay';
    F = g;
  } else if (g && g.type === 'bp') {
    view = 'bpplay';
    B = g;
  } else if (g) {
    view = 'play';
    S = g;
  } else {
    view = 'home';
  }
  document.body.dataset.view = view;
  bpPanel = null; bpEdit.clear(); fcPanel = null; fcEdit.clear();
  document.getElementById('bppanel').innerHTML = '';
  document.getElementById('fcpanel').innerHTML = '';
  if (ro) roBanner(g);
  if (view === 'home') renderHome();
  else if (view === 'history') renderHistory();
  else if (view === 'party') lgRenderCatalog();
  else if (view === 'pg') lgRenderGame(h.slice(5));
  else if (view.startsWith('bp')) bAll();
  else if (view.startsWith('fc')) fAll();
  else {
    assignCups(false);
    buildCupList();
    buildPlayers();
    buildSettings();
    buildRounds();
    renderPanels();
    update();
  }
  roLock();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
document.body.insertAdjacentHTML('afterbegin', '<svg id="lgdefs" width="0" height="0" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs><linearGradient id="dv-edge" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="#ebe6dc"/><stop offset="1" stop-color="#b3a995"/></linearGradient><radialGradient id="dv-face" cx=".32" cy=".28" r=".9"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#f7f4ed"/><stop offset="1" stop-color="#e4ddcf"/></radialGradient><radialGradient id="dv-pip" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#000"/><stop offset=".6" stop-color="#17171c"/><stop offset="1" stop-color="#4a4a52"/></radialGradient><radialGradient id="dv-pipr" cx=".36" cy=".32" r=".75"><stop offset="0" stop-color="#5e0904"/><stop offset=".6" stop-color="#b41b12"/><stop offset="1" stop-color="#e8564a"/></radialGradient><linearGradient id="cp-body" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2a1207"/><stop offset=".12" stop-color="#5f2c13"/><stop offset=".27" stop-color="#a35a2b"/><stop offset=".34" stop-color="#d08a52"/><stop offset=".42" stop-color="#9a5228"/><stop offset=".72" stop-color="#5c2a12"/><stop offset="1" stop-color="#220e05"/></linearGradient><linearGradient id="cp-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c0a03"/><stop offset=".3" stop-color="#7a3a18"/><stop offset=".36" stop-color="#b06a37"/><stop offset=".5" stop-color="#6a3115"/><stop offset="1" stop-color="#180802"/></linearGradient><radialGradient id="cp-top" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#7c3c1a"/><stop offset="1" stop-color="#2c1307"/></radialGradient><filter id="lg-grain" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="1.2" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 0"/><feComposite operator="in" in2="SourceGraphic"/></filter><radialGradient id="bm-body" cx=".36" cy=".3" r=".8"><stop offset="0" stop-color="#6a6f7c"/><stop offset=".35" stop-color="#2b2e37"/><stop offset=".8" stop-color="#0c0d11"/><stop offset="1" stop-color="#050506"/></radialGradient><linearGradient id="bm-cap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5d6068"/><stop offset=".35" stop-color="#d9dce2"/><stop offset=".55" stop-color="#9a9ea8"/><stop offset="1" stop-color="#3c3f46"/></linearGradient><radialGradient id="bm-glow"><stop offset="0" stop-color="#fff6c2"/><stop offset=".35" stop-color="#ffc53a" stop-opacity=".9"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></radialGradient><linearGradient id="bt-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a3a1c"/><stop offset=".18" stop-color="#1f7a3c"/><stop offset=".3" stop-color="#9fe8b5"/><stop offset=".38" stop-color="#2e9450"/><stop offset=".75" stop-color="#16602f"/><stop offset="1" stop-color="#06260f"/></linearGradient><linearGradient id="bt-label" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9cfb8"/><stop offset=".3" stop-color="#fbf6ea"/><stop offset="1" stop-color="#cfc3a8"/></linearGradient></defs></svg>');
function setCfg(key, v) {
  if (S.cfg[key] === v) return;
  S.cfg[key] = v;
  if (key in STRUCT) {
    replan(STRUCT[key]);
    afterStructure();
    return;
  }
  if (key === 'cupMode' || key === 'dlc') {
    if (key === 'dlc' || v === 'random') {
      const ok = new Set(cupList());
      S.rounds.forEach(r => { if (!Object.keys(r.g).length && r.c && (r.auto || !ok.has(r.c))) { r.c = ''; r.auto = false; } });
      S.fcAuto = true;
    }
    afterStructure();
    return;
  }
  if (key === 'finGP') { syncFin(); assignCups(false); }
  if (key === 'finale' || key === 'finN' || key === 'finGP') finalKey = '';
  save();
  buildSettings();
  update();
}
function shuffleOpen() {
  const slots = [];
  S.rounds.forEach((r, i) => { if (!Object.keys(r.g).length) slots.push(i); });
  if (slots.length < 2) return;
  const before = slots[0] > 0 ? S.rounds[slots[0] - 1].p : null;
  const list = slots.map(i => S.rounds[i]);
  const ord2 = orderRounds(list.map(r => r.p), before).map(p => list.find(r => r.p === p));
  slots.forEach((i, k) => { S.rounds[i] = ord2[k]; });
  S.info = 'De Grand Prix, der ikke er kørt, har fået en ny rækkefølge.';
  afterStructure();
}
function disarm() {
  if (!armedId) return;
  const b = document.getElementById(armedId);
  if (b) { b.textContent = b.dataset.label; b.classList.remove('armed'); }
  armedId = null;
  clearTimeout(armTimer);
}
// Destructive buttons need two taps
function confirmed(b) {
  if (armedId === b.id) { disarm(); return true; }
  disarm();
  armedId = b.id;
  b.textContent = b.dataset.confirm;
  b.classList.add('armed');
  armTimer = setTimeout(disarm, 3500);
  return false;
}

document.addEventListener('toggle', e => {
  const d = e.target;
  if (!d.matches || !d.matches('details.cat')) return;
  if (d.open) openCats.add(d.dataset.cat); else openCats.delete(d.dataset.cat);
}, true);

document.addEventListener('click', e => {
  const sm = e.target.closest('details.cat > summary');
  if (sm && !sm.parentElement.open) sm.parentElement.classList.add('anim');
});

window.addEventListener('scroll', () => { document.body.classList.toggle('scrolled', window.scrollY > 8); }, { passive: true });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && (addOpen || wdOpen)) { addOpen = false; wdOpen = false; disarm(); renderPanels(); }
});

document.addEventListener('keydown', e => {
});

document.addEventListener('input', e => {
  const t = e.target;
  const kind = t.dataset && t.dataset.kind;
  if (!kind || !['c', 'fc', 'n', 'g', 'fp'].includes(kind)) return;
  if (kind === 'c') { const r = S.rounds[+t.dataset.r]; r.c = t.value; r.auto = false; save(); return; }
  if (kind === 'fc') { S.fc[+t.dataset.f] = t.value; S.fcAuto = false; save(); return; }
  if (kind === 'n') { P(t.dataset.n).name = t.value; save(); update(); return; }
  const clean = t.value.replace(/\D/g, '');
  if (clean !== t.value) t.value = clean;
  const v = clean === '' ? undefined : parseInt(clean, 10);
  const store = kind === 'g' ? S.rounds[+t.dataset.r].g : S.fin[+t.dataset.f];
  const wasDone = kind === 'g' && roundDone(S.rounds[+t.dataset.r]);
  if (v === undefined) delete store[t.dataset.n]; else store[t.dataset.n] = v;
  if (kind === 'g' && !wasDone && roundDone(S.rounds[+t.dataset.r])) haptic(12);
  S.info = '';
  save();
  update();
});

document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act]');
  if (!b || b.disabled) return;
  const act = b.dataset.act;
  if (act === 'x') {
    const k = S.x.indexOf(b.dataset.n);
    if (k >= 0) S.x.splice(k, 1); else S.x.push(b.dataset.n);
    save(); update();
  } else if (act === 'add') {
    disarm(); addPlayer('');
  } else if (act === 'newgame') {
    go('ny');
  } else if (act === 'open') {
    go('spil-' + b.dataset.id);
  } else if (act === 'home') {
    go('');
  } else if (act === 'start') {
    if (active().length < 2) return;
    const g = S;
    g.id = 'g' + Date.now().toString(36);
    g.type = 'mk';
    g.created = Date.now();
    g.info = '';
    store.games.unshift(g);
    store.lastCfg = Object.assign({}, g.cfg);
    store.draft = null;
    save();
    go('spil-' + g.id);
  } else if (act === 'openadd') {
    addOpen = !addOpen; wdOpen = false; disarm(); renderPanels();
    const inp = document.getElementById('newname');
    if (inp) inp.focus();
  } else if (act === 'openwd') {
    wdOpen = !wdOpen; addOpen = false; disarm(); renderPanels();
  } else if (act === 'closepanels') {
    addOpen = false; wdOpen = false; disarm(); renderPanels();
  } else if (act === 'addconfirm') {
    addPlayer(document.getElementById('newname').value);
  } else if (act === 'delgame') {
    if (!confirmed(b)) return;
    const id = b.dataset.id || S.id;
    store.games = store.games.filter(x => x.id !== id);
    save();
    if (view === 'home') renderHome(); else go('');
  } else if (act === 'rm') {
    if (confirmed(b)) removePlayer(b.dataset.n);
  } else if (act === 'set') {
    const k = b.dataset.k;
    let v = b.dataset.v;
    if (NUMK.has(k)) v = +v; else if (v === 'true' || v === 'false') v = v === 'true';
    setCfg(k, v);
  } else if (act === 'step') {
    const k = b.dataset.k;
    const v = Math.min(+b.dataset.max, Math.max(+b.dataset.min, S.cfg[k] + +b.dataset.d));
    setCfg(k, v);
  } else if (act === 'reroll') {
    assignCups(true);
    S.info = 'Der er trukket nye cups til de Grand Prix, der ikke er kørt.';
    afterStructure();
  } else if (act === 'shuffle') {
    shuffleOpen();
  } else if (act === 'resetpts') {
    if (!confirmed(b)) return;
    S.rounds.forEach(r => { r.g = {}; r.c = ''; r.auto = false; });
    S.fc = [];
    S.fin = [];
    syncFin();
    S.x = [];
    const ids = active();
    if (!S.rounds.every(r => r.p.every(id => ids.includes(id)))) replan('');
    S.players = S.players.filter(p => p.active);
    S.info = 'Alle point er nulstillet.';
    afterStructure();
  }
});


