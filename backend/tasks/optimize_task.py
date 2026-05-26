from tasks.celery_app import app
from services.optimizer import optimize
from schemas import GlassPiece


@app.task(bind=True, name="optimize_glass")
def optimize_glass_task(self, pieces_data: list[dict], plate_w: float, plate_h: float,
                        edge_margin: float, cutting_gap: float) -> dict:
    self.update_state(state="PROGRESS", meta={"step": "parsing"})
    pieces = [GlassPiece(**p) for p in pieces_data]

    self.update_state(state="PROGRESS", meta={"step": "optimizing", "total": len(pieces)})
    results = optimize(pieces, plate_w, plate_h, edge_margin, cutting_gap)

    return {"results": [r.model_dump() for r in results]}
