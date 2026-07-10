from pydantic import BaseModel
from enum import Enum

class PieceFace(str, Enum):
    EXT = "EXT"
    INT = "INT"

class GlassPiece(BaseModel):
    id: str
    vitrage_ref: str
    width: float
    height: float
    material: str
    face: PieceFace
    no_rotation: bool = False
    treatment: str = ""

class PlacedPiece(GlassPiece):
    x: float
    y: float
    rotated: bool

class RemnantClass(str, Enum):
    DUST = "poussiere"
    FORBIDDEN = "interdit"
    WATCH = "surveiller"
    STOCKABLE = "stockable"

class Remnant(BaseModel):
    x: float
    y: float
    w: float
    h: float
    classe: RemnantClass

class OptimizedPlate(BaseModel):
    numero: int
    material: str
    plate_width: float
    plate_height: float
    pieces: list[PlacedPiece]
    remnants: list[Remnant]
    utilisation: float
    has_forbidden: bool

class MaterialResult(BaseModel):
    material: str
    plates: list[OptimizedPlate]
    total_plates: int
    total_pieces: int
    utilisation: float

class OptimizeRequest(BaseModel):
    pieces: list[GlassPiece]
    plate_width: float = 3210
    plate_height: float = 2550
    edge_margin: float = 15
    cutting_gap: float = 0
    algorithm: str = "staged_dp"
    machine: str = "lisec"

class OptimizeResponse(BaseModel):
    results: list[MaterialResult]
    job_id: str | None = None

class ExportFormat(str, Enum):
    DXF = "dxf"
    OPT = "opt"

class MachineExportRequest(BaseModel):
    plates: list[OptimizedPlate]
    format: ExportFormat = ExportFormat.DXF
    machine: str = "bottero"

class LabelFormat(str, Enum):
    ZPL = "zpl"
    PDF = "pdf"

class VitrageLabel(BaseModel):
    vitrage_id: str
    reference: str
    composition: str
    width: float
    height: float
    ug: str = ""
    gaz: str = "Argon"
    commande_ref: str = ""
    client: str = ""
    face: PieceFace | None = None

class ZPLRequest(BaseModel):
    labels: list[VitrageLabel]
    label_type: str = "ce"
    dpi: int = 203
