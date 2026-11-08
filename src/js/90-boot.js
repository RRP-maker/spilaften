// Return moves to the next field; at the end of a list it adds a new row or confirms
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' || e.isComposing) return;
  const t = e.target, nav = t.dataset && t.dataset.nav;
  if (!nav) return;
  e.preventDefault();
  if (nav === 'cup') {
    const f = t.closest('.card') && t.closest('.card').querySelector('[data-nav="sc"]');
    if (f) f.focus(); else t.blur();
    return;
  }
  const list = [...document.querySelectorAll(`[data-nav="${nav}"]`)].filter(el => el.getClientRects().length);
  const i = list.indexOf(t);
  if (i >= 0 && i < list.length - 1) {
    const nx = list[i + 1];
    nx.focus();
    try { nx.select(); } catch (err) {}
    return;
  }
  if (nav === 'mkp') {
    if (nextColor()) addPlayer(''); else t.blur();
  } else if (nav === 'mka') {
    addPlayer(t.value);
  } else if (nav === 'bps') {
    const id = bpAddTeam('', ['', '']);
    if (!id) { t.blur(); return; }
    bSave(); bBuildTeams(); bBuildSettings(); bRender();
    const inp = document.getElementById(`bm-${id}-0`);
    if (inp) inp.focus();
  } else if (nav === 'fcs') {
    const id = fAddEnt('', ['', '']);
    if (!id) { t.blur(); return; }
    save(); fBuildEnts(); fBuildSettings(); fRender();
    const inp = document.getElementById(`fe-${id}`);
    if (inp) inp.focus();
  } else if (nav === 'fca') {
    const btn = document.querySelector('[data-act="faddconfirm"]');
    if (btn) btn.click();
  } else if (nav === 'bpa') {
    const btn = document.querySelector('[data-act="baddconfirm"]');
    if (btn) btn.click();
  } else {
    t.blur();
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (!t.dataset || t.dataset.kind !== 'cupsel') return;
  cupSet(t.dataset.k, t.value);
  cupRefresh();
});
document.addEventListener('click', e => {
  const b = e.target.closest('button[data-act="dice"]');
  if (!b) return;
  const key = b.dataset.k, cur = cupGet(key);
  const used = new Set(S.rounds.map(r => r.c).concat(S.fc).filter(Boolean));
  let pool = cupList().filter(c => c !== cur && !used.has(c));
  if (!pool.length) pool = cupList().filter(c => c !== cur);
  if (!pool.length) return;
  cupSet(key, pool[Math.floor(Math.random() * pool.length)]);
  lastRolled = key;
  haptic(8);
  cupRefresh();
});

route();
