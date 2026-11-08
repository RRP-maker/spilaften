# Spilaften – kilde

Rediger i `src/`, kør `python3 build.py`, og publicér `dist/index.html` (én fil).

- `src/index.template.html` – side og markup (`@@CSS@@`, `@@JS@@`)
- `src/css/` og `src/js/` – samles i filnavnenes rækkefølge (samme globale scope, som før)
- `src/img/` – webp-billeder; `@@IMG:navn@@` bliver til base64 ved bygning
- `test_mobile.py`, `test_flow.py` – playwright på 390 px (kør med `python3 -I test_x.py dist/index.html`)
