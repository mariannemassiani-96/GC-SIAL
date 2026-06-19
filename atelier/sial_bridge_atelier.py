#!/usr/bin/env python3
"""
SIAL Smart Assembly — Bridge Atelier

• Surveille un dossier de sortie PDF PRO F2
• Parse les fiches "Données d'atelier par prototype"
• Expose une API REST pour la tablette opérateur
• Commandes pick-to-light relayées au Raspberry Pi

Usage :
    python3 sial_bridge_atelier.py

Config (variables d'environnement) :
    PDF_WATCH_DIR   Dossier surveillé (défaut: ./pdf_pro_f2)
    PI_URL          URL du Raspberry Pi (défaut: http://192.168.1.20:8081)
    PORT            Port de l'API (défaut: 8080)

Installation :
    pip install flask pdfplumber watchdog requests flask-cors
"""

import os, re, json, time, logging, threading
from pathlib import Path
from datetime import datetime

import pdfplumber
from flask import Flask, jsonify, request
try:
    from flask_cors import CORS
except ImportError:
    CORS = None

# ── CONFIG ────────────────────────────────────────────────────────────

PDF_WATCH_DIR = os.environ.get('PDF_WATCH_DIR', './pdf_pro_f2')
PI_URL        = os.environ.get('PI_URL',        'http://192.168.1.20:8081')
PORT          = int(os.environ.get('PORT',       8080))

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s [%(levelname)s] %(message)s', datefmt='%H:%M:%S')
log = logging.getLogger('sial-bridge')

# Base de données en mémoire : {barcode: page_data}
DB = {}
DB_LOCK = threading.Lock()

# ── MAPPING CATÉGORIES → CASIERS + COULEURS LED ──────────────────────

REF_MAPPING = [
    (r'Crémone|cremone',              1,  '#c8a84b', 'Crémone',       1),
    (r'Renvoi d.angle',               2,  '#4b8fc8', 'Renvoi angle',  2),
    (r'Compas OF|Compas OB|Têtière',  3,  '#c84b7a', 'Compas',        3),
    (r'Bras de Compas',               3,  '#c84b7a', 'Bras compas',   3),
    (r'Verrouillage latéral',         4,  '#7a4bc8', 'Verrouillage',  4),
    (r'Verrouilleur anti',            5,  '#c87a4b', 'Anti-décr.',    5),
    (r'Palier de compas|Support d.angle|Axe Palier|Douille', 6, '#4bc87a', 'Palier/Support', 6),
    (r'Palier de Fiche|Pêne de Fiche', 7, '#4bc8c8', 'Fiche interm.', 7),
    (r'Sachet|Penture|Rotation UNI',  8,  '#4bc87a', 'Sachet rot.',   3),
    (r'Gâche Galet dormant|Gâche AD', 9,  '#c84b4b', 'Gâche galet',  8),
    (r'Gâche tringle|Gâche Batt',     10, '#c84b4b', 'Gâche tringle', 9),
    (r'Gâche Se|Gâche OB',            10, '#c84b4b', 'Gâche Se',      8),
    (r'Limiteur|Verrou à levier',     11, '#c8c84b', 'Limiteur',     10),
    (r'Poignée',                      12, '#888888', 'Poignée',      11),
    (r'Cache',                        13, '#444444', 'Cache',        12),
    (r'Anti.Fausse|AFM',              14, '#c8c84b', 'AFM',           7),
]

def get_casier_info(ref: str, desc: str) -> dict:
    text = f"{ref} {desc}"
    for pattern, casier, couleur, label, ordre in REF_MAPPING:
        if re.search(pattern, text, re.I):
            return {'casier': casier, 'couleur': couleur, 'label': label, 'ordre': ordre}
    return {'casier': 0, 'couleur': '#555555', 'label': 'Autre', 'ordre': 99}

# ── PARSER PDF PRO F2 ────────────────────────────────────────────────

def parse_pf2_page(page) -> dict:
    """Parser une page de fiche données d'atelier PRO F2.
    Gère le layout 2 colonnes via extraction par coordonnées."""
    words  = page.extract_words(x_tolerance=2, y_tolerance=2)
    mid_x  = page.width / 2

    rows = {}
    for w in words:
        y = round(w['top'] / 3) * 3
        if y not in rows:
            rows[y] = {'left': [], 'right': []}
        bucket = 'left' if w['x0'] < mid_x else 'right'
        rows[y][bucket].append(w['text'])

    lines = []
    for y in sorted(rows.keys()):
        for side in ('left', 'right'):
            txt = ' '.join(rows[y][side]).strip()
            if txt:
                lines.append(txt)
    full_text = '\n'.join(lines)

    data = {}

    # En-tête
    m = re.search(r'(L_[\w-]+)', full_text)
    if m: data['lot'] = m.group(1)
    m = re.search(r'(O_[\w-]+)\s*-\s*(\d+)', full_text)
    if m: data['commande'] = f"{m.group(1)}-{m.group(2)}"
    m = re.search(r'Production:\s*(w\d+)', full_text)
    if m: data['semaine'] = m.group(1)
    m = re.search(r'Création:\s*([\d/]+)', full_text)
    if m: data['creation'] = m.group(1)

    # Barcode (ligne purement numérique >= 18 chiffres)
    for line in lines:
        clean = line.replace(' ', '')
        if re.match(r'^\d{18,}$', clean):
            data['barcode'] = clean
            break

    # Position / type ouverture
    m = re.search(r'^(\d+)\s+(Ouvrant|Oscillo|Porte)', full_text, re.M)
    if m: data['pos'] = int(m.group(1))
    m = re.search(r'(Ouvrant à la française[^|\n]+?(?:Vantaux|Vantail)|Oscillo[^|\n]+?(?:Vantaux|Vantail))', full_text, re.I)
    if m: data['type_ouverture'] = m.group(1).strip()
    else:
        m = re.search(r'(Ouvrant à la française|Oscillo-battant)', full_text, re.I)
        if m: data['type_ouverture'] = m.group(1).strip()

    # Conf court
    t = data.get('type_ouverture', '')
    data['conf'] = 'OB' if 'oscillo' in t.lower() else ('OS' if 'soufflet' in t.lower() else 'OF')

    # Gamme / matière
    m = re.search(r'^Gamme\s+(.+)$', full_text, re.M)
    if m: data['gamme'] = m.group(1).strip()
    g = data.get('gamme', '')
    data['matiere'] = 'ALU' if any(k in g.upper() for k in ['KASSIO', 'KAWNEER', 'ALU']) else 'PVC'

    # Dimensions
    m = re.search(r'Dimensions \(LxH\)\s+([\d.]+)\s+x\s+([\d.]+)\s+mm', full_text)
    if m:
        data['lff_mm'] = int(float(m.group(1)))
        data['hff_mm'] = int(float(m.group(2)))
    m = re.search(r'HM\s+(\d+)\s+mm', full_text)
    if m: data['hm_mm'] = int(m.group(1))
    m = re.search(r'Ouverture\s+([\w-]+)', full_text)
    if m:
        ouv = m.group(1)
        data['ouverture'] = ouv
        data['sens'] = 'R' if 'Droite' in ouv else ('L' if 'Gauche' in ouv else '?')
    m = re.search(r'Teinte\s+(MASSE[^\n]+)', full_text)
    if m: data['teinte'] = m.group(1).strip()
    m = re.search(r'Poids\s+([\d,.]+)\s+Kg', full_text)
    if m: data['poids_kg'] = m.group(1)
    for kw in ['Salon','Chambre','Cuisine','Bureau','Séjour','Hall','WC','SDB','Entrée','Dressing']:
        if kw in full_text:
            data['local'] = kw
            break

    # Pièces Ferco
    ferco_items = []
    ferco_pat = re.compile(
        r'^(\d+)\s+x\s+([A-Z0-9][\w-]{6,})\s+-\s+(BRUT|GRZ|EV1)\s+-\s+FE-\s+(.+)$',
        re.MULTILINE
    )
    in_acc = False
    for line in lines:
        if 'Accessoires' in line:
            in_acc = True
        if not in_acc:
            continue
        mm = ferco_pat.match(line.strip())
        if mm:
            desc = re.sub(r'\s+\d+/\d+\s*$', '', mm.group(4)).strip()
            ref  = mm.group(2).strip()
            casier_info = get_casier_info(ref, desc)
            ferco_items.append({
                'qte': int(mm.group(1)), 'ref': ref,
                'finition': mm.group(3), 'desc': desc,
                **casier_info, 'fait': False,
            })

    ferco_items.sort(key=lambda x: (x['ordre'], x['ref']))
    data['ferco']         = ferco_items
    data['etape_courante'] = 0
    data['parsed_at']      = datetime.now().isoformat()
    return data

def parse_pf2_pdf(pdf_path: str) -> list:
    pages = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                d = parse_pf2_page(page)
                if d.get('barcode'):
                    pages.append(d)
    except Exception as e:
        log.error(f"Erreur parsing {pdf_path}: {e}")
    return pages

def ingest_pdf(pdf_path: str):
    log.info(f"-> Ingestion : {pdf_path}")
    pages = parse_pf2_pdf(pdf_path)
    with DB_LOCK:
        for p in pages:
            bc = p['barcode']
            DB[bc] = p
            log.info(f"  ok {bc} -> {p.get('lot')} pos{p.get('pos')} "
                      f"{p.get('lff_mm')}x{p.get('hff_mm')}mm "
                      f"-- {len(p['ferco'])} pieces")
    return pages

# ── SURVEILLANCE DOSSIER ─────────────────────────────────────────────

def watch_pdf_folder():
    watch_dir = Path(PDF_WATCH_DIR)
    watch_dir.mkdir(parents=True, exist_ok=True)
    seen = set()
    log.info(f"Surveillance PDF : {watch_dir.resolve()}")
    for f in watch_dir.glob('*.pdf'):
        ingest_pdf(str(f))
        seen.add(f.name)
    while True:
        time.sleep(2)
        for f in watch_dir.glob('*.pdf'):
            if f.name not in seen:
                time.sleep(0.5)
                ingest_pdf(str(f))
                seen.add(f.name)

# ── API FLASK ─────────────────────────────────────────────────────────

app = Flask(__name__)
if CORS:
    CORS(app)

@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'db_size': len(DB), 'pi_url': PI_URL})

@app.route('/api/scan/<barcode>')
def scan(barcode):
    with DB_LOCK:
        data = DB.get(barcode)
    if not data:
        return jsonify({'error': 'not_found', 'barcode': barcode}), 404
    return jsonify(data)

@app.route('/api/db')
def list_db():
    with DB_LOCK:
        summary = [{
            'barcode': bc, 'lot': d.get('lot'), 'commande': d.get('commande'),
            'pos': d.get('pos'), 'type': d.get('type_ouverture'),
            'gamme': d.get('gamme'), 'dims': f"{d.get('lff_mm')}x{d.get('hff_mm')}",
            'nb_pieces': len(d.get('ferco', [])), 'parsed_at': d.get('parsed_at'),
        } for bc, d in DB.items()]
    return jsonify(summary)

@app.route('/api/etape/<barcode>', methods=['POST'])
def valider_etape(barcode):
    with DB_LOCK:
        data = DB.get(barcode)
        if not data:
            return jsonify({'error': 'not_found'}), 404
        etape = data.get('etape_courante', 0)
        ferco = data.get('ferco', [])
        if etape < len(ferco):
            ferco[etape]['fait'] = True
            data['etape_courante'] = etape + 1
        _light_etape(data)
        return jsonify(dict(data))

@app.route('/api/reset/<barcode>', methods=['POST'])
def reset_montage(barcode):
    with DB_LOCK:
        data = DB.get(barcode)
        if not data:
            return jsonify({'error': 'not_found'}), 404
        for f in data.get('ferco', []):
            f['fait'] = False
        data['etape_courante'] = 0
    _light_all_off()
    return jsonify(dict(data))

@app.route('/api/ingest', methods=['POST'])
def ingest_manual():
    body = request.get_json(silent=True) or {}
    pdf_path = body.get('path')
    if pdf_path and Path(pdf_path).exists():
        pages = ingest_pdf(pdf_path)
        return jsonify({'ingested': len(pages), 'barcodes': [p['barcode'] for p in pages]})
    return jsonify({'error': 'invalid_path'}), 400

# ── PICK-TO-LIGHT ────────────────────────────────────────────────────

def _pi_post(endpoint: str, payload: dict):
    try:
        import requests as req
        req.post(f"{PI_URL}{endpoint}", json=payload, timeout=1)
    except Exception:
        pass

def _light_etape(data: dict):
    ferco = data.get('ferco', [])
    etape = data.get('etape_courante', 0)
    _pi_post('/light/all/off', {})
    if etape < len(ferco):
        p = ferco[etape]
        if p['casier'] > 0:
            _pi_post('/light/on', {'casier': p['casier'], 'color': p['couleur'],
                                    'label': p['label'], 'ref': p['ref'], 'qte': p['qte']})

def _light_all_off():
    _pi_post('/light/all/off', {})

if __name__ == '__main__':
    t = threading.Thread(target=watch_pdf_folder, daemon=True)
    t.start()
    log.info(f"SIAL Bridge Atelier -- http://0.0.0.0:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False)
