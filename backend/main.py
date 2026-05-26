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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
