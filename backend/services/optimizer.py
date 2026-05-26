"""Glass cutting optimizer using rectpack with industrial constraints."""

import rectpack
from schemas import (
    GlassPiece, PlacedPiece, OptimizedPlate, MaterialResult,
    Remnant, RemnantClass, PieceFace,
)
from config import (
    MIN_STRIP_WIDTH, MIN_REMNANT_SIZE,
    FORBIDDEN_REMNANT_MIN, FORBIDDEN_REMNANT_MAX,
)


# ---------------------------------------------------------------------------
# Remnant helpers
# ---------------------------------------------------------------------------

def _classify_remnant(w: float, h: float) -> RemnantClass:
    """Classify a remnant rectangle by its smallest dimension."""
    min_dim = min(w, h)
    if min_dim < FORBIDDEN_REMNANT_MIN:
        return RemnantClass.DUST
    if min_dim < FORBIDDEN_REMNANT_MAX or max(w, h) < MIN_REMNANT_SIZE:
        return RemnantClass.FORBIDDEN
    if min_dim < MIN_REMNANT_SIZE:
        return RemnantClass.WATCH
    return RemnantClass.STOCKABLE


def _compute_remnants(
    usable_w: float, usable_h: float, pieces: list[PlacedPiece],
) -> list[Remnant]:
    """Compute free-space remnants on a plate.

    Uses a practical heuristic: top strip above all pieces, plus per-piece
    right-side gaps.  Coordinates are in usable-area local space (0,0 is the
    top-left of the usable zone after edge margins).
    """
    if not pieces:
        return [Remnant(
            x=0, y=0, w=usable_w, h=usable_h,
            classe=_classify_remnant(usable_w, usable_h),
        )]

    # Find the maximum y extent of all placed pieces.
    max_y = 0.0
    for p in pieces:
        ph = p.height if not p.rotated else p.width
        max_y = max(max_y, p.y + ph)

    remnants: list[Remnant] = []

    # Top strip: everything above the tallest column of pieces.
    if max_y < usable_h:
        rh = usable_h - max_y
        remnants.append(Remnant(
            x=0, y=max_y, w=usable_w, h=rh,
            classe=_classify_remnant(usable_w, rh),
        ))

    # Per-piece right-side gap: space between piece right edge and plate edge.
    for p in sorted(pieces, key=lambda p: (p.y, p.x)):
        pw = p.width if not p.rotated else p.height
        ph = p.height if not p.rotated else p.width
        gap = usable_w - (p.x + pw)
        if gap > 1:
            remnants.append(Remnant(
                x=p.x + pw, y=p.y, w=gap, h=ph,
                classe=_classify_remnant(gap, ph),
            ))

    return [r for r in remnants if r.w > 1 and r.h > 1]


# ---------------------------------------------------------------------------
# Core optimizer
# ---------------------------------------------------------------------------

def optimize(
    pieces: list[GlassPiece],
    plate_w: float = 3210, plate_h: float = 2550,
    edge_margin: float = 15, cutting_gap: float = 0,
) -> list[MaterialResult]:
    """Pack *pieces* onto standard glass plates and return per-material results.

    Parameters
    ----------
    pieces:
        All glass pieces to cut (mixed materials).
    plate_w, plate_h:
        Raw plate dimensions in mm.
    edge_margin:
        Unusable border around each plate edge, in mm.
    cutting_gap:
        Blade kerf / spacing between pieces, in mm.

    Returns
    -------
    One :class:`MaterialResult` per distinct material found in *pieces*.
    """
    if not pieces:
        return []

    # Group by material.
    groups: dict[str, list[GlassPiece]] = {}
    for p in pieces:
        groups.setdefault(p.material, []).append(p)

    usable_w = plate_w - 2 * edge_margin
    usable_h = plate_h - 2 * edge_margin
    results: list[MaterialResult] = []

    for material, group in groups.items():
        plates = _pack_material(
            group, plate_w, plate_h, usable_w, usable_h,
            edge_margin, cutting_gap,
        )

        total_used = sum(pl.utilisation / 100 * plate_w * plate_h for pl in plates)
        total_area = len(plates) * plate_w * plate_h
        results.append(MaterialResult(
            material=material,
            plates=plates,
            total_plates=len(plates),
            total_pieces=len(group),
            utilisation=round(total_used / total_area * 100, 2) if total_area else 0,
        ))

    return results


def _pack_material(
    group: list[GlassPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float, cutting_gap: float,
) -> list[OptimizedPlate]:
    """Run bin-packing for a single material group."""

    # Sort pieces largest-first for better packing.
    sorted_pcs = sorted(group, key=lambda p: max(p.width, p.height), reverse=True)

    packer = rectpack.newPacker(
        mode=rectpack.PackingMode.Offline,
        pack_algo=rectpack.MaxRectsBssf,
        rotation=False,  # We handle rotation manually.
    )

    # Provide enough bins (worst case: one bin per piece).
    for _ in range(len(sorted_pcs)):
        packer.add_bin(int(usable_w), int(usable_h))

    # Build a lookup and track which pieces we pre-rotated.
    piece_map: dict[str, GlassPiece] = {}
    rotated_ids: set[str] = set()

    for p in sorted_pcs:
        w, h = int(p.width + cutting_gap), int(p.height + cutting_gap)
        if not p.no_rotation and h > w:
            w, h = h, w
            rotated_ids.add(p.id)
        packer.add_rect(w, h, rid=p.id)
        piece_map[p.id] = p

    packer.pack()

    # Collect placed rectangles per bin.
    # rect_list() -> list of (bin_index, x, y, w, h, rid)
    bins: dict[int, list[PlacedPiece]] = {}
    for b_idx, x, y, w, h, rid in packer.rect_list():
        pc = piece_map.get(rid)
        if not pc:
            continue
        rotated = rid in rotated_ids
        # Use original piece dimensions (not the gap-inflated rect dims).
        pw = pc.width
        ph = pc.height
        if rotated:
            pw, ph = ph, pw
        bins.setdefault(b_idx, []).append(PlacedPiece(
            id=pc.id, vitrage_ref=pc.vitrage_ref,
            width=pw, height=ph,
            material=pc.material, face=pc.face,
            no_rotation=pc.no_rotation, treatment=pc.treatment,
            x=x + edge_margin, y=y + edge_margin,
            rotated=rotated,
        ))

    # Build OptimizedPlate objects.
    plates: list[OptimizedPlate] = []
    for b_idx in sorted(bins.keys()):
        placed = bins[b_idx]
        plates.append(_build_plate(
            len(plates) + 1, placed, plate_w, plate_h,
            usable_w, usable_h, edge_margin,
        ))

    # Handle any pieces that could not be placed.
    placed_ids = {rid for _, _, _, _, _, rid in packer.rect_list()}
    unplaced = [p for p in group if p.id not in placed_ids]
    for pc in unplaced:
        pp = PlacedPiece(
            id=pc.id, vitrage_ref=pc.vitrage_ref,
            width=pc.width, height=pc.height,
            material=pc.material, face=pc.face,
            no_rotation=pc.no_rotation, treatment=pc.treatment,
            x=edge_margin, y=edge_margin, rotated=False,
        )
        plates.append(_build_plate(
            len(plates) + 1, [pp], plate_w, plate_h,
            usable_w, usable_h, edge_margin,
        ))

    return plates


def _build_plate(
    numero: int,
    placed: list[PlacedPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float,
) -> OptimizedPlate:
    """Assemble an OptimizedPlate from placed pieces."""

    # Shift to usable-area local coords for remnant computation.
    local = [
        PlacedPiece(**{**p.model_dump(), "x": p.x - edge_margin, "y": p.y - edge_margin})
        for p in placed
    ]
    remnants = _compute_remnants(usable_w, usable_h, local)

    # Validate min strip width: flag too-narrow remnants as forbidden.
    has_forbidden = False
    for r in remnants:
        min_dim = min(r.w, r.h)
        if 0 < min_dim < MIN_STRIP_WIDTH:
            r.classe = RemnantClass.FORBIDDEN
        if r.classe == RemnantClass.FORBIDDEN:
            has_forbidden = True

    used_area = sum(p.width * p.height for p in placed)
    plate_area = plate_w * plate_h
    utilisation = round(used_area / plate_area * 100, 2) if plate_area else 0

    return OptimizedPlate(
        numero=numero,
        material=placed[0].material if placed else "",
        plate_width=plate_w, plate_height=plate_h,
        pieces=placed, remnants=remnants,
        utilisation=utilisation,
        has_forbidden=has_forbidden,
    )
