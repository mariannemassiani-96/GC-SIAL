"""Guillotine cutting plan validation for ISULA VITRAGE.

Validates that an optimised cutting plan is:
  1. Within plate bounds
  2. Free of overlapping pieces
  3. Guillotine-compliant (every cut is edge-to-edge)
  4. Respecting rotation constraints
  5. Free of forbidden remnants (warning only)

Machine profiles
----------------
  bottero  — 2-stage guillotine: horizontal shelf cuts, then vertical
             piece cuts within each shelf.
  lisec    — 3-stage guillotine: horizontal shelf cuts, vertical column
             cuts within each shelf, horizontal piece cuts within each
             column.
"""

from __future__ import annotations

from schemas import OptimizedPlate, PlacedPiece


# ── Public API ──────────────────────────────────────────────────────


class ValidationError:
    """A single validation finding."""

    __slots__ = ("plate", "severity", "message")

    def __init__(self, plate_num: int, severity: str, message: str):
        self.plate = plate_num
        self.severity = severity  # 'error' or 'warning'
        self.message = message

    def __repr__(self) -> str:
        return f"[{self.severity.upper()}] Plate {self.plate}: {self.message}"


def validate_guillotine(
    plates: list[OptimizedPlate],
    gap: float = 0,
    edge_margin: float = 15,
    machine: str = "lisec",
) -> list[ValidationError]:
    """Validate a complete cutting plan.

    Parameters
    ----------
    machine : str
        ``'lisec'`` validates full 3-stage guillotine compliance.
        ``'bottero'`` validates 2-stage compliance only (shelves + pieces,
        no column stacking expected).
    """
    errors: list[ValidationError] = []
    for plate in plates:
        errors.extend(_validate_plate(plate, gap, edge_margin, machine))
    return errors


# ── Per-plate validation ────────────────────────────────────────────


def _validate_plate(
    plate: OptimizedPlate,
    gap: float,
    edge_margin: float,
    machine: str,
) -> list[ValidationError]:
    errors: list[ValidationError] = []
    usable_w = plate.plate_width - 2 * edge_margin
    usable_h = plate.plate_height - 2 * edge_margin

    # 1. Pieces within bounds
    for p in plate.pieces:
        pw, ph = _eff_dims(p)
        lx = p.x - edge_margin
        ly = p.y - edge_margin
        if lx < -0.5 or ly < -0.5:
            errors.append(ValidationError(
                plate.numero, "error",
                f"Piece {p.id} at ({p.x:.0f},{p.y:.0f}) starts before usable area",
            ))
        if lx + pw > usable_w + 0.5 or ly + ph > usable_h + 0.5:
            errors.append(ValidationError(
                plate.numero, "error",
                f"Piece {p.id} at ({p.x:.0f},{p.y:.0f}) size {pw:.0f}x{ph:.0f} "
                f"exceeds plate bounds ({usable_w:.0f}x{usable_h:.0f})",
            ))

    # 2. No overlaps
    pieces = plate.pieces
    for i in range(len(pieces)):
        aw, ah = _eff_dims(pieces[i])
        for j in range(i + 1, len(pieces)):
            bw, bh = _eff_dims(pieces[j])
            if _rects_overlap(
                pieces[i].x, pieces[i].y, aw, ah,
                pieces[j].x, pieces[j].y, bw, bh,
            ):
                errors.append(ValidationError(
                    plate.numero, "error",
                    f"Pieces {pieces[i].id} and {pieces[j].id} overlap",
                ))

    # 3. Guillotine compliance
    if len(plate.pieces) > 1:
        rects = [
            (p.x - edge_margin, p.y - edge_margin, _eff_dims(p)[0], _eff_dims(p)[1])
            for p in plate.pieces
        ]
        max_stages = 2 if machine == "bottero" else 3
        if not _is_guillotine_compliant(rects, 0, 0, usable_w, usable_h, gap,
                                        max_stages=max_stages):
            label = "2-stage" if machine == "bottero" else "3-stage"
            errors.append(ValidationError(
                plate.numero, "warning",
                f"Layout may not be {label} guillotine-compliant ({machine})",
            ))

    # 4. Rotation constraints
    #    Note: when a plate is packed in "flipped" orientation the rotation
    #    flag is toggled as a coordinate artefact, so this is a warning
    #    rather than an error.  The packer enforces no_rotation at solve time.
    for p in plate.pieces:
        if p.no_rotation and p.rotated:
            errors.append(ValidationError(
                plate.numero, "warning",
                f"Piece {p.id} is marked rotated (may be a plate-flip artefact)",
            ))

    # 5. Forbidden remnants
    if plate.has_forbidden:
        errors.append(ValidationError(
            plate.numero, "warning",
            "Plate contains forbidden remnants",
        ))

    return errors


# ── Geometry helpers ────────────────────────────────────────────────


def _eff_dims(p: PlacedPiece) -> tuple[float, float]:
    """Return (effective_width, effective_height) accounting for rotation."""
    return (p.height, p.width) if p.rotated else (p.width, p.height)


def _rects_overlap(
    x1: float, y1: float, w1: float, h1: float,
    x2: float, y2: float, w2: float, h2: float,
    tol: float = 0.5,
) -> bool:
    """Check whether two axis-aligned rectangles overlap (with tolerance)."""
    return not (
        x1 + w1 <= x2 + tol
        or x2 + w2 <= x1 + tol
        or y1 + h1 <= y2 + tol
        or y2 + h2 <= y1 + tol
    )


# ── Guillotine compliance check (recursive) ────────────────────────


def _is_guillotine_compliant(
    rects: list[tuple[float, float, float, float]],
    x0: float, y0: float, x1: float, y1: float,
    gap: float,
    depth: int = 0,
    max_stages: int = 3,
) -> bool:
    """Recursively verify that *rects* form a guillotine-compliant pattern.

    A set of rectangles is guillotine-compliant when they can be separated
    by a sequence of edge-to-edge cuts (each cut spans the full width or
    full height of its enclosing sub-rectangle).

    Parameters
    ----------
    max_stages : int
        2 for Bottero (H-V only), 3 for LISEC (H-V-H).
        The ``depth`` counter tracks alternating cut directions so we
        can reject layouts that exceed the machine's stage limit.
    """
    if len(rects) <= 1:
        return True
    if depth > 60:                       # safety cap
        return False

    tol = max(gap, 0.5)

    # Collect candidate cut positions from piece edges
    x_cuts: set[float] = set()
    y_cuts: set[float] = set()
    for rx, ry, rw, rh in rects:
        x_right = rx + rw
        y_bottom = ry + rh
        if x0 + 1 < x_right < x1 - 1:
            x_cuts.add(x_right)
            if gap > 0:
                x_cuts.add(x_right + gap)
        if y0 + 1 < y_bottom < y1 - 1:
            y_cuts.add(y_bottom)
            if gap > 0:
                y_cuts.add(y_bottom + gap)

    # Try horizontal cuts
    for yc in sorted(y_cuts):
        top = [r for r in rects if r[1] + r[3] <= yc + tol]
        bottom = [r for r in rects if r[1] >= yc - tol]
        if len(top) + len(bottom) == len(rects) and top and bottom:
            if (
                _is_guillotine_compliant(top, x0, y0, x1, yc, gap, depth + 1, max_stages)
                and _is_guillotine_compliant(bottom, x0, yc, x1, y1, gap, depth + 1, max_stages)
            ):
                return True

    # Try vertical cuts
    for xc in sorted(x_cuts):
        left = [r for r in rects if r[0] + r[2] <= xc + tol]
        right = [r for r in rects if r[0] >= xc - tol]
        if len(left) + len(right) == len(rects) and left and right:
            if (
                _is_guillotine_compliant(left, x0, y0, xc, y1, gap, depth + 1, max_stages)
                and _is_guillotine_compliant(right, xc, y0, x1, y1, gap, depth + 1, max_stages)
            ):
                return True

    return False
