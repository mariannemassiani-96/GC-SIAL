"""
Service de generation de plans de decoupe DXF et OPT
pour machines Bottero 520 LAMe et LISEC.
"""

from __future__ import annotations

from io import StringIO
from typing import TYPE_CHECKING

import ezdxf

if TYPE_CHECKING:
    pass

from schemas import OptimizedPlate, PlacedPiece, ExportFormat
from config import DEFAULT_EDGE_MARGIN


# ---------------------------------------------------------------------------
# Layer definitions
# ---------------------------------------------------------------------------

_LAYERS = {
    "PLATE_OUTLINE": {"color": 7},    # white
    "MARGIN": {"color": 2},            # yellow
    "PIECES": {"color": 4},            # cyan
    "TEXT": {"color": 3},              # green
    "CUTTING_ORDER": {"color": 1},     # red
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _setup_layers(doc: ezdxf.document.Drawing) -> None:
    """Create the standard layer set in *doc*."""
    for name, props in _LAYERS.items():
        layer = doc.layers.new(name)
        layer.color = props["color"]
        if name == "MARGIN":
            layer.dxf.linetype = "DASHED"


def _closed_rect(msp, x: float, y: float, w: float, h: float,
                 layer: str, dxfattribs: dict | None = None) -> None:
    """Add a closed LWPOLYLINE rectangle to *msp*."""
    attrs = {"layer": layer}
    if dxfattribs:
        attrs.update(dxfattribs)
    msp.add_lwpolyline(
        [(x, y), (x + w, y), (x + w, y + h), (x, y + h)],
        close=True,
        dxfattribs=attrs,
    )


def _add_text(msp, text: str, x: float, y: float, height: float,
              layer: str) -> None:
    """Add a single-line TEXT entity centred at (*x*, *y*)."""
    msp.add_text(
        text,
        dxfattribs={
            "layer": layer,
            "height": height,
            "insert": (x, y),
            "halign": ezdxf.enums.TextHAlign.CENTER,
            "valign": ezdxf.enums.TextVAlign.MIDDLE,
        },
    ).set_placement((x, y), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)


def _sort_cutting_order(pieces: list[PlacedPiece]) -> list[PlacedPiece]:
    """Return pieces sorted bottom-to-top then left-to-right (Bottero order)."""
    return sorted(pieces, key=lambda p: (p.y, p.x))


# ---------------------------------------------------------------------------
# DXF generation
# ---------------------------------------------------------------------------

def _draw_plate(msp, plate: OptimizedPlate, origin_x: float, origin_y: float,
                margin: float, machine: str) -> None:
    """Draw a single plate starting at *origin_x*, *origin_y*."""

    pw = plate.plate_width
    ph = plate.plate_height

    # -- plate outline -------------------------------------------------------
    _closed_rect(msp, origin_x, origin_y, pw, ph, "PLATE_OUTLINE")

    # -- edge margin zone (dashed) -------------------------------------------
    _closed_rect(
        msp,
        origin_x + margin,
        origin_y + margin,
        pw - 2 * margin,
        ph - 2 * margin,
        "MARGIN",
        {"linetype": "DASHED"},
    )

    # -- title block ---------------------------------------------------------
    title = f"Plaque {plate.numero} — {plate.material} — {int(pw)}x{int(ph)}"
    _add_text(
        msp, title,
        origin_x + pw / 2,
        origin_y + ph + 30,
        height=20,
        layer="TEXT",
    )

    # -- pieces --------------------------------------------------------------
    ordered = _sort_cutting_order(plate.pieces)
    for idx, piece in enumerate(ordered, start=1):
        px = origin_x + piece.x
        py = origin_y + piece.y

        # effective dimensions after potential rotation
        if piece.rotated:
            pw_piece = piece.height
            ph_piece = piece.width
        else:
            pw_piece = piece.width
            ph_piece = piece.height

        # piece outline
        _closed_rect(msp, px, py, pw_piece, ph_piece, "PIECES")

        # reference label centred in piece
        cx = px + pw_piece / 2
        cy = py + ph_piece / 2

        ref_label = f"{piece.vitrage_ref} [{piece.face.value}]"
        text_h = min(14, ph_piece / 6, pw_piece / (len(ref_label) * 0.7 + 1))
        text_h = max(text_h, 4)

        _add_text(msp, ref_label, cx, cy + text_h * 0.7, text_h, "TEXT")

        # dimensions below reference
        dim_label = f"{int(pw_piece)}x{int(ph_piece)}"
        _add_text(msp, dim_label, cx, cy - text_h * 0.7, text_h * 0.8, "TEXT")

        # cutting-order label (Bottero specific)
        if machine == "bottero":
            _add_text(
                msp,
                str(idx),
                px + 12,
                py + 12,
                height=10,
                layer="CUTTING_ORDER",
            )


def export_dxf(plates: list[OptimizedPlate], machine: str = "bottero") -> bytes:
    """Generate a DXF cutting plan and return the file content as bytes.

    Parameters
    ----------
    plates:
        Optimized plates with placed pieces.
    machine:
        Target machine identifier (``"bottero"`` or ``"lisec"``).

    Returns
    -------
    bytes
        Raw DXF file content ready for writing to disk or HTTP response.
    """
    doc = ezdxf.new("R2010")
    doc.units = ezdxf.units.MM

    # ensure DASHED linetype is available
    if "DASHED" not in doc.linetypes:
        doc.linetypes.add(
            "DASHED",
            pattern=[0.6, 0.5, -0.1],
            description="- - - - -",
        )

    _setup_layers(doc)
    msp = doc.modelspace()

    margin = DEFAULT_EDGE_MARGIN

    # space plates vertically with a gap
    plate_gap = 200
    y_offset = 0.0

    for plate in plates:
        _draw_plate(msp, plate, origin_x=0, origin_y=y_offset,
                    margin=margin, machine=machine)
        y_offset += plate.plate_height + plate_gap

    stream = StringIO()
    doc.write(stream)
    return doc.encode(stream.getvalue())


# ---------------------------------------------------------------------------
# OPT text format generation
# ---------------------------------------------------------------------------

def export_opt(plates: list[OptimizedPlate]) -> str:
    """Generate a Bottero 520 LAMe OPT cutting plan as plain text.

    The format lists one ``PLATE`` header per plate followed by ``CUT`` lines
    for each piece, sorted in the Bottero cutting order (bottom-to-top, then
    left-to-right).

    Returns
    -------
    str
        Complete OPT file content.
    """
    lines: list[str] = [
        "# Bottero 520 LAMe Cutting Plan",
    ]

    for plate in plates:
        pw = int(plate.plate_width)
        ph = int(plate.plate_height)

        lines.append(
            f"# Plate {plate.numero}: {plate.material} — {pw}x{ph}"
        )
        lines.append(f"PLATE {plate.numero} {pw} {ph}")

        ordered = _sort_cutting_order(plate.pieces)
        for idx, piece in enumerate(ordered, start=1):
            if piece.rotated:
                ew = int(piece.height)
                eh = int(piece.width)
            else:
                ew = int(piece.width)
                eh = int(piece.height)

            ref = f"{piece.vitrage_ref} [{piece.face.value}]"
            lines.append(
                f'CUT {idx} {int(piece.x)} {int(piece.y)} {ew} {eh} "{ref}"'
            )

        # blank line between plates
        lines.append("")

    return "\n".join(lines)
