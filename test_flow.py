import sys, os
from playwright.sync_api import sync_playwright
url = 'file://' + os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'dist/index.html')
errs = []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('pageerror: %s' % e))
    pg.on('console', lambda m: errs.append('console.error: %s' % m.text) if m.type == 'error' and 'ERR_' not in m.text else None)
    pg.goto(url); pg.wait_for_timeout(300)
    view = lambda: pg.evaluate('document.body.dataset.view')
    for act in ['newgame', 'newfc']:
        pg.evaluate('location.hash=""'); pg.wait_for_timeout(80)
        pg.click('[data-act="%s"]' % act); pg.wait_for_timeout(200)
        print(act, '->', view())
    # Beerpong: find knap på forsiden
    pg.evaluate('location.hash=""'); pg.wait_for_timeout(80)
    pg.evaluate('location.hash="lege"'); pg.wait_for_timeout(150)
    print('lege-visning:', view(), '| newbp synlig:', pg.is_visible('[data-act="newbp"]'))
    if pg.is_visible('[data-act="newbp"]'):
        pg.click('[data-act="newbp"]'); pg.wait_for_timeout(200)
        print('newbp ->', view())
    # Mario Kart: spillere + start
    pg.evaluate('location.hash=""'); pg.wait_for_timeout(80)
    pg.click('[data-act="newgame"]'); pg.wait_for_timeout(200)
    pg.evaluate('["Anna","Bo","Cæcilie","Dan"].forEach(n=>addPlayer(n))'); pg.wait_for_timeout(100)
    start = pg.evaluate('[...document.querySelectorAll("[data-act]")].filter(b=>b.offsetParent).map(b=>b.dataset.act)')
    print('setup-knapper:', start)
    for a in start:
        if a in ('start', 'startgame', 'begin'):
            pg.click('[data-act="%s"]' % a); pg.wait_for_timeout(300); print('start ->', view()); break
    tot = pg.evaluate('JSON.stringify(store).length')
    ok = pg.evaluate('''() => { const a = JSON.stringify(store); store = JSON.parse(a); save(); renderHome(); return JSON.stringify(store) === a }''')
    print('store bytes', tot, '| rundtur', ok)
    pg.screenshot(path='/tmp/mk.png')
    b.close()
print('FEJL:', errs if errs else 'ingen')
