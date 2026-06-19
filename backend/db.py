import json
import psycopg2
from psycopg2.extras import RealDictCursor
from config import DATABASE_URL


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


# ── Commandes ─────────────────────────────────────────────────────────

def list_commandes():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM commandes ORDER BY date_creation DESC")
        return [dict(r) for r in cur.fetchall()]


def get_commande(cid: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM commandes WHERE id = %s", (cid,))
        row = cur.fetchone()
        return dict(row) if row else None


def insert_commande(data: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO commandes (id, reference, client, date_creation, semaine_fabrication,
                semaine_livraison, statut, vitrages, lot_fabrication, notes)
            VALUES (%(id)s, %(reference)s, %(client)s, %(date_creation)s, %(semaine_fabrication)s,
                %(semaine_livraison)s, %(statut)s, %(vitrages)s::jsonb, %(lot_fabrication)s::jsonb, %(notes)s)
        """, data)
        conn.commit()


def update_commande(cid: str, data: dict):
    sets = []
    vals = []
    for k, v in data.items():
        if k in ('vitrages', 'lot_fabrication'):
            sets.append(f"{k} = %s::jsonb")
            vals.append(json.dumps(v) if not isinstance(v, str) else v)
        else:
            sets.append(f"{k} = %s")
            vals.append(v)
    vals.append(cid)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"UPDATE commandes SET {', '.join(sets)} WHERE id = %s", vals)
        conn.commit()


def delete_commande(cid: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM commandes WHERE id = %s", (cid,))
        conn.commit()


# ── Settings ──────────────────────────────────────────────────────────

def get_settings():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM settings WHERE id = 1")
        row = cur.fetchone()
        return dict(row) if row else None


def update_settings(data: dict):
    sets = []
    vals = []
    for k, v in data.items():
        sets.append(f"{k} = %s::jsonb")
        vals.append(json.dumps(v) if not isinstance(v, str) else v)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"UPDATE settings SET {', '.join(sets)} WHERE id = 1", vals)
        conn.commit()


# ── Catalogue verres ──────────────────────────────────────────────────

def list_glass_products():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM glass_products ORDER BY code")
        return [dict(r) for r in cur.fetchall()]


def upsert_glass_product(data: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO glass_products (code, label, type, epaisseur, has_coating, coating_face, ug_default, fournisseur, notes)
            VALUES (%(code)s, %(label)s, %(type)s, %(epaisseur)s, %(has_coating)s, %(coating_face)s, %(ug_default)s, %(fournisseur)s, %(notes)s)
            ON CONFLICT (code) DO UPDATE SET
                label=EXCLUDED.label, type=EXCLUDED.type, epaisseur=EXCLUDED.epaisseur,
                has_coating=EXCLUDED.has_coating, coating_face=EXCLUDED.coating_face,
                ug_default=EXCLUDED.ug_default, fournisseur=EXCLUDED.fournisseur, notes=EXCLUDED.notes
        """, data)
        conn.commit()


def delete_glass_product(pid: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM glass_products WHERE id = %s", (pid,))
        conn.commit()


# ── Stock plaques ─────────────────────────────────────────────────────

def list_stock_plates():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM stock_plates ORDER BY glass_code")
        return [dict(r) for r in cur.fetchall()]


def upsert_stock_plate(data: dict):
    with get_conn() as conn, conn.cursor() as cur:
        if data.get('id'):
            cur.execute("""UPDATE stock_plates SET glass_code=%s, width=%s, height=%s, quantity=%s,
                emplacement=%s, fournisseur=%s, lot_fournisseur=%s WHERE id=%s""",
                (data['glass_code'], data['width'], data['height'], data['quantity'],
                 data.get('emplacement',''), data.get('fournisseur',''), data.get('lot_fournisseur',''), data['id']))
        else:
            cur.execute("""INSERT INTO stock_plates (glass_code, width, height, quantity, emplacement, fournisseur, lot_fournisseur)
                VALUES (%s,%s,%s,%s,%s,%s,%s)""",
                (data['glass_code'], data['width'], data['height'], data.get('quantity',0),
                 data.get('emplacement',''), data.get('fournisseur',''), data.get('lot_fournisseur','')))
        conn.commit()


def delete_stock_plate(pid: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM stock_plates WHERE id = %s", (pid,))
        conn.commit()


# ── Stock chutes ──────────────────────────────────────────────────────

def list_stock_remnants():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM stock_remnants ORDER BY glass_code")
        return [dict(r) for r in cur.fetchall()]


def insert_stock_remnant(data: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""INSERT INTO stock_remnants (glass_code, width, height, quantity, source_commande, emplacement)
            VALUES (%s,%s,%s,%s,%s,%s)""",
            (data['glass_code'], data['width'], data['height'], data.get('quantity',1),
             data.get('source_commande',''), data.get('emplacement','')))
        conn.commit()


def delete_stock_remnant(rid: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM stock_remnants WHERE id = %s", (rid,))
        conn.commit()
