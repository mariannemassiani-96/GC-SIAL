import json
from db import get_conn


def create_lot(data: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO production_lots (id, reference, semaine, commande_ids, commande_refs,
                total_pieces, total_we, notes, glass_optim, we_optim)
            VALUES (%(id)s, %(reference)s, %(semaine)s, %(commande_ids)s::jsonb, %(commande_refs)s::jsonb,
                    %(total_pieces)s, %(total_we)s, %(notes)s, %(glass_optim)s::jsonb, %(we_optim)s::jsonb)
        """, {**data,
              'commande_ids': json.dumps(data.get('commande_ids', [])),
              'commande_refs': json.dumps(data.get('commande_refs', [])),
              'glass_optim': json.dumps(data.get('glass_optim', [])),
              'we_optim': json.dumps(data.get('we_optim', []))})
        conn.commit()


def list_lots(semaine: str | None = None):
    with get_conn() as conn, conn.cursor() as cur:
        if semaine:
            cur.execute("SELECT * FROM production_lots WHERE semaine = %s ORDER BY date_creation DESC", (semaine,))
        else:
            cur.execute("SELECT * FROM production_lots ORDER BY date_creation DESC")
        return [dict(r) for r in cur.fetchall()]


def get_lot(lot_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM production_lots WHERE id = %s", (lot_id,))
        row = cur.fetchone()
        return dict(row) if row else None


def update_lot(lot_id: str, data: dict):
    sets, vals = [], []
    for k, v in data.items():
        sets.append(f"{k} = %s")
        vals.append(v)
    vals.append(lot_id)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(f"UPDATE production_lots SET {', '.join(sets)} WHERE id = %s", vals)
        conn.commit()


def delete_lot(lot_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("DELETE FROM production_lots WHERE id = %s", (lot_id,))
        conn.commit()


def insert_pieces(pieces: list[dict]):
    if not pieces:
        return
    with get_conn() as conn, conn.cursor() as cur:
        for p in pieces:
            cur.execute("""
                INSERT INTO production_pieces (lot_id, commande_ref, vitrage_ref, vitrage_id,
                    largeur, hauteur, composition, face, material, machine, plaque_no)
                VALUES (%(lot_id)s, %(commande_ref)s, %(vitrage_ref)s, %(vitrage_id)s,
                    %(largeur)s, %(hauteur)s, %(composition)s, %(face)s, %(material)s, %(machine)s, %(plaque_no)s)
            """, p)
        conn.commit()


def insert_we_pieces(pieces: list[dict]):
    if not pieces:
        return
    with get_conn() as conn, conn.cursor() as cur:
        for p in pieces:
            cur.execute("""
                INSERT INTO production_we (lot_id, barre_no, longueur, orig_dim, cote, vitrage_ref, epaisseur, couleur)
                VALUES (%(lot_id)s, %(barre_no)s, %(longueur)s, %(orig_dim)s, %(cote)s, %(vitrage_ref)s, %(epaisseur)s, %(couleur)s)
            """, p)
        conn.commit()


def get_pieces(lot_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM production_pieces WHERE lot_id = %s ORDER BY plaque_no, commande_ref", (lot_id,))
        return [dict(r) for r in cur.fetchall()]


def get_we_pieces(lot_id: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT * FROM production_we WHERE lot_id = %s ORDER BY barre_no", (lot_id,))
        return [dict(r) for r in cur.fetchall()]


def update_piece_statut(piece_id: str, statut: str, operateur: str = ''):
    with get_conn() as conn, conn.cursor() as cur:
        extra = ""
        if statut == 'coupe':
            extra = ", date_coupe = NOW()"
        elif statut == 'assemble':
            extra = ", date_assemblage = NOW()"
        cur.execute(f"UPDATE production_pieces SET statut = %s, operateur = %s{extra} WHERE id = %s",
                    (statut, operateur, piece_id))
        conn.commit()


def update_piece_material(piece_id: str, material: str, composition: str, notes: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE production_pieces SET material = %s, composition = %s, notes = %s WHERE id = %s",
            (material, composition, notes, piece_id))
        conn.commit()


def update_we_statut(piece_id: str, statut: str, operateur: str = ''):
    with get_conn() as conn, conn.cursor() as cur:
        extra = ", date_coupe = NOW()" if statut == 'coupe' else ""
        cur.execute(f"UPDATE production_we SET statut = %s, operateur = %s{extra} WHERE id = %s",
                    (statut, operateur, piece_id))
        conn.commit()


def update_lot_verre(lot_id: str, plaque_nos: list[int], lot_verre: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "UPDATE production_pieces SET lot_verre = %s WHERE lot_id = %s AND plaque_no = ANY(%s)",
            (lot_verre, lot_id, plaque_nos))
        conn.commit()


def update_lot_matieres(lot_id: str, matieres: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("UPDATE production_lots SET lot_matieres = %s::jsonb WHERE id = %s",
                    (json.dumps(matieres), lot_id))
        conn.commit()


def update_preparation(lot_id: str, preparation: dict):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("UPDATE production_lots SET preparation = %s::jsonb WHERE id = %s",
                    (json.dumps(preparation), lot_id))
        conn.commit()


def get_pieces_by_commande(commande_ref: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT p.*, l.reference as lot_reference, l.lot_matieres
            FROM production_pieces p
            JOIN production_lots l ON p.lot_id = l.id
            WHERE p.commande_ref = %s
            ORDER BY p.vitrage_ref, p.face
        """, (commande_ref,))
        return [dict(r) for r in cur.fetchall()]


def update_piece_notes(piece_id: str, notes: str):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("UPDATE production_pieces SET notes = %s WHERE id = %s", (notes, piece_id))
        conn.commit()


def get_stats(lot_id: str | None = None, semaine: str | None = None):
    with get_conn() as conn, conn.cursor() as cur:
        where = ""
        params: list = []
        if lot_id:
            where = "WHERE lot_id = %s"
            params = [lot_id]
        elif semaine:
            where = "WHERE lot_id IN (SELECT id FROM production_lots WHERE semaine = %s)"
            params = [semaine]

        cur.execute(f"SELECT statut, COUNT(*) as nb FROM production_pieces {where} GROUP BY statut", params)
        piece_stats = {r['statut']: r['nb'] for r in cur.fetchall()}

        cur.execute(f"SELECT statut, COUNT(*) as nb FROM production_we {where} GROUP BY statut", params)
        we_stats = {r['statut']: r['nb'] for r in cur.fetchall()}

        cur.execute(f"""
            SELECT DATE(date_coupe) as jour, COUNT(*) as nb
            FROM production_pieces {where} AND date_coupe IS NOT NULL
            GROUP BY DATE(date_coupe) ORDER BY jour
        """.replace("AND", "WHERE" if not where else "AND"), params)
        daily = [dict(r) for r in cur.fetchall()]

        # Daily assemblies
        cur.execute(f"""
            SELECT DATE(date_assemblage) as jour, COUNT(*) as nb
            FROM production_pieces {where} AND date_assemblage IS NOT NULL
            GROUP BY DATE(date_assemblage) ORDER BY jour
        """.replace("AND", "WHERE" if not where else "AND"), params)
        daily_assemblies = [dict(r) for r in cur.fetchall()]

        # Per-lot progress
        lot_progress = []
        lot_where = ""
        lot_params: list = []
        if semaine:
            lot_where = "WHERE semaine = %s"
            lot_params = [semaine]
        elif lot_id:
            lot_where = "WHERE id = %s"
            lot_params = [lot_id]
        cur.execute(f"SELECT id, reference, total_pieces, total_we FROM production_lots {lot_where} ORDER BY date_creation DESC", lot_params)
        for lot_row in cur.fetchall():
            lid = lot_row['id']
            cur.execute("SELECT statut, COUNT(*) as nb FROM production_pieces WHERE lot_id = %s GROUP BY statut", (lid,))
            p_stats = {r['statut']: r['nb'] for r in cur.fetchall()}
            cur.execute("SELECT statut, COUNT(*) as nb FROM production_we WHERE lot_id = %s GROUP BY statut", (lid,))
            w_stats = {r['statut']: r['nb'] for r in cur.fetchall()}
            lot_progress.append({
                'id': lid,
                'reference': lot_row['reference'],
                'total_pieces': lot_row['total_pieces'],
                'total_we': lot_row['total_we'],
                'pieces': p_stats,
                'we': w_stats,
            })

        return {"pieces": piece_stats, "we": we_stats, "daily_cuts": daily, "daily_assemblies": daily_assemblies, "lot_progress": lot_progress}
