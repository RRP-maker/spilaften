import sys, json
from playwright.sync_api import sync_playwright
path = sys.argv[1] if len(sys.argv) > 1 else 'docs/index.html'
import os
url = 'file://' + os.path.abspath(path)
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: %s' % e))
    pg.on('console', lambda m: errs.append('console.error: %s' % m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
    pg.goto(url); pg.wait_for_timeout(300)
    ids = pg.evaluate('LG.map(g=>g.id)')
    print('lege-spil:', len(ids), '| billeder: chars', pg.evaluate('CHARS.length'), 'cups', pg.evaluate('Object.keys(CUP_IMG).length'), 'crests', pg.evaluate('Object.keys(CRESTS).length'))
    bad = pg.evaluate('[...CHARS, ...Object.values(CUP_IMG), ...Object.values(CRESTS), EMBLEM].filter(x=>!x.startsWith("data:image/webp;base64,UklGR")).length')
    print('ugyldige billeder:', bad)
    routes = ['', 'setup', 'play', 'bpsetup', 'bpplay', 'fcsetup', 'fcplay', 'tidligere', 'lege'] + ['lege-' + i for i in ids]
    seen = {}
    for r in routes:
        pg.evaluate('h => { location.hash = h }', r); pg.wait_for_timeout(40)
        v = pg.evaluate('document.body.dataset.view')
        h = pg.evaluate('document.documentElement.scrollWidth <= innerWidth + 1')
        seen[r] = (v, h)
    views = sorted({v for v, _ in seen.values()})
    print('visninger:', views, '| vandret overløb:', [r for r, (_, ok) in seen.items() if not ok])
    # moduler: tilføj data og kør JSON-rundtur
    pg.evaluate('location.hash="setup"'); pg.wait_for_timeout(100)
    pg.evaluate('["Anna","Bo","Cæcilie","Dan"].forEach(n=>addPlayer(n))')
    pg.evaluate('location.hash="bpsetup"'); pg.wait_for_timeout(100)
    pg.evaluate('location.hash="fcsetup"'); pg.wait_for_timeout(100)
    pg.evaluate('location.hash=""'); pg.wait_for_timeout(100)
    n0 = pg.evaluate('JSON.stringify(store).length')
    ok = pg.evaluate('''() => { const a = JSON.stringify(store); const b = JSON.parse(a); store = b; save(); renderHome();
        return JSON.stringify(store) === a && localStorage.getItem("spilaften-v1") === a }''')
    print('JSON-rundtur ok:', ok, '| store bytes:', n0)
    # knapper på forsiden
    btns = pg.evaluate('[...document.querySelectorAll("[data-act]")].filter(b=>b.offsetParent).map(b=>b.dataset.act)')
    print('synlige knapper på forsiden:', btns[:12])
    pg.screenshot(path='/tmp/home.png')
    b.close()
print('FEJL:', errs if errs else 'ingen')
