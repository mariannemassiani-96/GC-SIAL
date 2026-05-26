import uuid
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware

from config import CORS_ORIGINS
from schemas import (
    OptimizeRequest, OptimizeResponse, MachineExportRequest,
    ZPLRequest, ExportFormat,
)
from services.optimizer import optimize
from services.machine_export import export_dxf, export_opt
from services.labels_zpl import generate_zpl_batch

app = FastAPI(title="ISULA VITRAGE API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
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


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8100, reload=True)
