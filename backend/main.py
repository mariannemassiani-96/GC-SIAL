import uuid
import json
from fastapi import FastAPI, Response, Body
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from schemas import (
    OptimizeRequest, OptimizeResponse, MachineExportRequest,
    ZPLRequest, ExportFormat,
)
from services.optimizer import optimize
from services.machine_export import export_dxf, export_opt
from services.labels_zpl import generate_zpl_batch
import db
import db_production as dbp

app = FastAPI(title="ISULA VITRAGE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "service": "isula-vitrage"}


@app.post("/api/optimize", response_model=OptimizeResponse)
def api_optimize(req: OptimizeRequest):
    results = optimize(
        req.pieces, req.plate_width, req.plate_height,
        req.edge_margin, req.cutting_gap,
        algorithm=req.algorithm,
        machine=req.machine,
    )
    return OptimizeResponse(results=results)


@app.post("/api/optimize/async")
def api_optimize_async(req: OptimizeRequest):
    from tasks.optimize_task import optimize_glass_task
    job_id = str(uuid.uuid4())
    optimize_glass_task.apply_async(
        args=[[p.model_dump() for p in req.pieces],
              req.plate_width, req.plate_height,
              req.edge_margin, req.cutting_gap],
        task_id=job_id,
    )
    return {"job_id": job_id, "status": "queued"}


@app.get("/api/optimize/status/{job_id}")
def api_optimize_status(job_id: str):
    from tasks.optimize_task import optimize_glass_task
    result = optimize_glass_task.AsyncResult(job_id)
    if result.state == "PENDING":
        return {"status": "pending"}
    elif result.state == "PROGRESS":
        return {"status": "progress", "meta": result.info}
    elif result.state == "SUCCESS":
        return {"status": "done", "results": result.result.get("results", [])}
    else:
        return {"status": "failed", "error": str(result.info)}


@app.post("/api/export-machine")
def api_export_machine(req: MachineExportRequest):
    if req.format == ExportFormat.DXF:
        data = export_dxf(req.plates, req.machine)
        return Response(
            content=data,
            media_type="application/dxf",
            headers={"Content-Disposition": f"attachment; filename=cutting_plan_{req.machine}.dxf"},
        )
    else:
        data = export_opt(req.plates)
        return Response(
            content=data.encode("utf-8"),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename=cutting_plan_{req.machine}.opt"},
        )


@app.post("/api/labels-zpl")
def api_labels_zpl(req: ZPLRequest):
    zpl = generate_zpl_batch(req.labels, req.label_type, req.dpi)
    return Response(
        content=zpl.encode("utf-8"),
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=labels.zpl"},
    )




# ── CRUD Commandes ────────────────────────────────────────────────────

@app.get("/api/commandes")
def api_list_commandes():
    rows = db.list_commandes()
    for r in rows:
        for k in list(r.keys()):
            if hasattr(r[k], 'isoformat'):
                r[k] = r[k].isoformat()
    return rows


@app.get("/api/commandes/{cid}")
def api_get_commande(cid: str):
    row = db.get_commande(cid)
    if not row:
        return Response(status_code=404)
    for k in list(row.keys()):
        if hasattr(row[k], 'isoformat'):
            row[k] = row[k].isoformat()
    return row


@app.post("/api/commandes")
def api_create_commande(data: dict = Body(...)):
    if 'vitrages' in data and not isinstance(data['vitrages'], str):
        data['vitrages'] = json.dumps(data['vitrages'])
    if 'lot_fabrication' in data and not isinstance(data['lot_fabrication'], str):
        data['lot_fabrication'] = json.dumps(data['lot_fabrication'])
    db.insert_commande(data)
    return {"ok": True}


@app.patch("/api/commandes/{cid}")
def api_update_commande(cid: str, data: dict = Body(...)):
    db.update_commande(cid, data)
    return {"ok": True}


@app.delete("/api/commandes/{cid}")
def api_delete_commande(cid: str):
    db.delete_commande(cid)
    return {"ok": True}


# ── Settings ──────────────────────────────────────────────────────────

@app.get("/api/settings")
def api_get_settings():
    return db.get_settings() or {}


@app.patch("/api/settings")
def api_update_settings(data: dict = Body(...)):
    db.update_settings(data)
    return {"ok": True}


# ── Catalogue verres ──────────────────────────────────────────────────

@app.get("/api/glass-products")
def api_list_glass():
    return db.list_glass_products()


@app.post("/api/glass-products")
def api_upsert_glass(data: dict = Body(...)):
    db.upsert_glass_product(data)
    return {"ok": True}


@app.delete("/api/glass-products/{pid}")
def api_delete_glass(pid: str):
    db.delete_glass_product(pid)
    return {"ok": True}


# ── Stock plaques ─────────────────────────────────────────────────────

@app.get("/api/stock-plates")
def api_list_plates():
    return db.list_stock_plates()


@app.post("/api/stock-plates")
def api_upsert_plate(data: dict = Body(...)):
    db.upsert_stock_plate(data)
    return {"ok": True}


@app.delete("/api/stock-plates/{pid}")
def api_delete_plate(pid: str):
    db.delete_stock_plate(pid)
    return {"ok": True}


# ── Stock chutes ──────────────────────────────────────────────────────

@app.get("/api/stock-remnants")
def api_list_remnants():
    return db.list_stock_remnants()


@app.post("/api/stock-remnants")
def api_create_remnant(data: dict = Body(...)):
    db.insert_stock_remnant(data)
    return {"ok": True}


@app.delete("/api/stock-remnants/{rid}")
def api_delete_remnant(rid: str):
    db.delete_stock_remnant(rid)
    return {"ok": True}


# ── Production ─────────────────────────────────────────────────────────

@app.get("/api/production/lots")
def api_list_lots(semaine: str | None = None):
    rows = dbp.list_lots(semaine)
    for r in rows:
        for k in list(r.keys()):
            if hasattr(r[k], 'isoformat'):
                r[k] = r[k].isoformat()
    return rows


@app.get("/api/production/lots/{lot_id}")
def api_get_lot(lot_id: str):
    lot = dbp.get_lot(lot_id)
    if not lot:
        return Response(status_code=404)
    for k in list(lot.keys()):
        if hasattr(lot[k], 'isoformat'):
            lot[k] = lot[k].isoformat()
    lot['pieces'] = dbp.get_pieces(lot_id)
    lot['we_pieces'] = dbp.get_we_pieces(lot_id)
    for p in lot['pieces'] + lot['we_pieces']:
        for k in list(p.keys()):
            if hasattr(p[k], 'isoformat'):
                p[k] = p[k].isoformat()
    return lot


@app.post("/api/production/lots")
def api_create_lot(data: dict = Body(...)):
    dbp.create_lot(data)
    if 'pieces' in data:
        dbp.insert_pieces(data['pieces'])
    if 'we_pieces' in data:
        dbp.insert_we_pieces(data['we_pieces'])
    return {"ok": True}


@app.delete("/api/production/lots/{lot_id}")
def api_delete_lot(lot_id: str):
    dbp.delete_lot(lot_id)
    return {"ok": True}


@app.patch("/api/production/pieces/{piece_id}")
def api_update_piece(piece_id: str, data: dict = Body(...)):
    if 'material' in data:
        dbp.update_piece_material(piece_id, data['material'], data.get('composition', ''), data.get('notes', ''))
    if 'statut' in data:
        dbp.update_piece_statut(piece_id, data['statut'], data.get('operateur', ''))
    return {"ok": True}


@app.patch("/api/production/we/{piece_id}")
def api_update_we(piece_id: str, data: dict = Body(...)):
    dbp.update_we_statut(piece_id, data.get('statut', ''), data.get('operateur', ''))
    return {"ok": True}


@app.patch("/api/production/lots/{lot_id}/lot-verre")
def api_update_lot_verre(lot_id: str, data: dict = Body(...)):
    dbp.update_lot_verre(lot_id, data.get('plaque_nos', []), data.get('lot_verre', ''))
    return {"ok": True}


@app.patch("/api/production/lots/{lot_id}/lot-matieres")
def api_update_lot_matieres(lot_id: str, data: dict = Body(...)):
    dbp.update_lot_matieres(lot_id, data.get('matieres', {}))
    return {"ok": True}


@app.patch("/api/production/lots/{lot_id}/preparation")
def api_update_preparation(lot_id: str, data: dict = Body(...)):
    dbp.update_preparation(lot_id, data.get('preparation', {}))
    return {"ok": True}


@app.patch("/api/production/lots/{lot_id}/statut")
def api_update_lot_statut(lot_id: str, data: dict = Body(...)):
    dbp.update_lot_statut(lot_id, data.get('statut', ''))
    return {"ok": True}


@app.get("/api/production/pieces/by-commande/{commande_ref}")
def api_pieces_by_commande(commande_ref: str):
    rows = dbp.get_pieces_by_commande(commande_ref)
    for r in rows:
        for k in list(r.keys()):
            if hasattr(r[k], 'isoformat'):
                r[k] = r[k].isoformat()
    return rows


@app.get("/api/production/stats")
def api_production_stats(lot_id: str | None = None, semaine: str | None = None):
    return dbp.get_stats(lot_id, semaine)


# ── Odoo 18 Connector ─────────────────────────────────────────────────

@app.get("/api/odoo/test")
def api_odoo_test():
    from services.odoo_connector import test_connection, OdooError
    try:
        return test_connection()
    except OdooError as e:
        return {"status": "error", "error": str(e)}


@app.get("/api/odoo/products")
def api_odoo_products(q: str = "", limit: int = 100, offset: int = 0):
    from services.odoo_connector import search_products, OdooError
    try:
        domain = []
        if q:
            domain = ["|", "|",
                      ["name", "ilike", q],
                      ["default_code", "ilike", q],
                      ["barcode", "ilike", q]]
        return search_products(domain, limit=limit, offset=offset)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/products/{product_id}")
def api_odoo_product(product_id: int):
    from services.odoo_connector import get_product, OdooError
    try:
        return get_product(product_id)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.post("/api/odoo/products")
def api_odoo_create_product(data: dict = Body(...)):
    from services.odoo_connector import create_product, OdooError
    try:
        pid = create_product(data)
        return {"id": pid}
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/stock")
def api_odoo_stock(product_id: int | None = None, location_id: int | None = None):
    from services.odoo_connector import get_stock_quants, OdooError
    try:
        domain = [["location_id.usage", "=", "internal"]]
        if product_id:
            domain.append(["product_id", "=", product_id])
        if location_id:
            domain.append(["location_id", "=", location_id])
        return get_stock_quants(domain)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/locations")
def api_odoo_locations():
    from services.odoo_connector import get_stock_locations, OdooError
    try:
        return get_stock_locations()
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.patch("/api/odoo/stock/{product_id}")
def api_odoo_adjust_stock(product_id: int, data: dict = Body(...)):
    from services.odoo_connector import adjust_stock, OdooError
    try:
        result = adjust_stock(product_id, data["location_id"], data["quantity"])
        return {"ok": True, "result": result}
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/suppliers")
def api_odoo_suppliers(q: str = ""):
    from services.odoo_connector import search_partners, OdooError
    try:
        domain = [["supplier_rank", ">", 0]]
        if q:
            domain.append(["name", "ilike", q])
        return search_partners(domain)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/purchases")
def api_odoo_purchases(state: str = "", limit: int = 50):
    from services.odoo_connector import search_purchase_orders, OdooError
    try:
        domain = []
        if state:
            domain.append(["state", "=", state])
        return search_purchase_orders(domain, limit=limit)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/purchases/{po_id}")
def api_odoo_purchase(po_id: int):
    from services.odoo_connector import get_purchase_order, OdooError
    try:
        return get_purchase_order(po_id)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.post("/api/odoo/purchases")
def api_odoo_create_purchase(data: dict = Body(...)):
    from services.odoo_connector import create_purchase_order, OdooError
    try:
        po_id = create_purchase_order(data["partner_id"], data["lines"])
        return {"id": po_id}
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


@app.get("/api/odoo/invoices")
def api_odoo_invoices(move_type: str = "", limit: int = 50):
    from services.odoo_connector import search_invoices, OdooError
    try:
        domain = []
        if move_type:
            domain.append(["move_type", "=", move_type])
        else:
            domain.append(["move_type", "in", ["in_invoice", "out_invoice"]])
        return search_invoices(domain, limit=limit)
    except OdooError as e:
        return Response(status_code=502, content=json.dumps({"error": str(e)}),
                        media_type="application/json")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
