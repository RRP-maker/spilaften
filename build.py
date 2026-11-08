#!/usr/bin/env python3
"""Samler src/ til én dist/index.html (CSS, JS og billeder indlejret)."""
import base64, glob, os, re, sys
root = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(root, 'src')
def read(p): return open(p, encoding='utf-8', newline='').read()
def parts(sub, ext): return ''.join(read(p) for p in sorted(glob.glob(os.path.join(src, sub, '*.' + ext))))
html = read(os.path.join(src, 'index.template.html'))
html = html.replace('@@CSS@@', parts('css', 'css')).replace('@@JS@@', parts('js', 'js'))
def img(m):
    p = os.path.join(src, 'img', m.group(1) + '.webp')
    return 'data:image/webp;base64,' + base64.b64encode(open(p, 'rb').read()).decode()
html = re.sub(r'@@IMG:([a-z0-9/\-]+)@@', img, html)
assert '@@' not in html, 'ubrugt markør'
out = os.path.join(root, 'docs', 'index.html')
os.makedirs(os.path.dirname(out), exist_ok=True)
open(out, 'w', encoding='utf-8', newline='').write(html)
import shutil
for f in glob.glob(os.path.join(src, 'static', '*')):
    shutil.copy(f, os.path.dirname(out))
print(out, len(html.encode()))
