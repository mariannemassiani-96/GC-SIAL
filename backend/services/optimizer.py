"""Glass cutting optimizer — guillotine strip-packing for LISEC / Bottero."""

from schemas import (
    GlassPiece, PlacedPiece, OptimizedPlate, MaterialResult,
    Remnant, RemnantClass,
)
from config import (
    MIN_STRIP_WIDTH, MIN_REMNANT_SIZE,
    FORBIDDEN_REMNANT_MIN, FORBIDDEN_REMNANT_MAX,
)


def _classify_remnant(w: float, h: float) -> RemnantClass:
    min_dim = min(w, h)
    if min_dim < FORBIDDEN_REMNANT_MIN:
        return RemnantClass.DUST
    if min_dim < FORBIDDEN_REMNANT_MAX or max(w, h) < MIN_REMNANT_SIZE:
        return RemnantClass.FORBIDDEN
    if min_dim < MIN_REMNANT_SIZE:
        return RemnantClass.WATCH
    return RemnantClass.STOCKABLE


# ── Guillotine strip packer ──────────────────────────────────────────


def _piece_dims(p: GlassPiece, rotated: bool) -> tuple[float, float]:
    return (p.height, p.width) if rotated else (p.width, p.height)


def _can_rotate(p: GlassPiece, allow: bool) -> bool:
    return allow and not p.no_rotation and p.width != p.height


def _guillotine_pack_plate(
    pieces: list[GlassPiece],
    usable_w: float,
    usable_h: float,
    gap: float,
    can_rotate: bool,
) -> tuple[list[tuple[GlassPiece, float, float, bool]], list[GlassPiece]]:
    remaining = list(pieces)
    placed: list[tuple[GlassPiece, float, float, bool]] = []
    strip_y = 0.0

    while remaining and strip_y < usable_h - 1:
        avail_h = usable_h - strip_y
        strip_result = _fill_strip_greedy(remaining, usable_w, avail_h, gap, can_rotate)
        if not strip_result:
            break

        strip_pieces, strip_h = strip_result
        used_ids = set()
        for pc, rot, x_off in strip_pieces:
            placed.append((pc, x_off, strip_y, rot))
            used_ids.add(pc.id)

        strip_y += strip_h + gap
        remaining = [p for p in remaining if p.id not in used_ids]

    return placed, remaining


def _fill_strip_greedy(
    pieces: list[GlassPiece],
    strip_w: float,
    max_h: float,
    gap: float,
    can_rotate: bool,
) -> tuple[list[tuple[GlassPiece, bool, float]], float] | None:
    """Fill one strip by greedily maximizing width usage.

    For each slot, pick the piece that best fills the remaining width.
    """
    best_result = None
    best_area = 0.0

    candidates = []
    for p in pieces:
        if p.width <= strip_w and p.height <= max_h:
            candidates.append((p, False, p.width, p.height))
        if _can_rotate(p, can_rotate):
            if p.height <= strip_w and p.width <= max_h:
                candidates.append((p, True, p.height, p.width))

    if not candidates:
        return None

    seen_heights: set[float] = set()
    for _, _, _, ch in candidates:
        seen_heights.add(ch)

    for strip_h in sorted(seen_heights, reverse=True):
        result = _try_fill_at_height(pieces, strip_w, strip_h, gap, can_rotate)
        if result:
            area = sum(w * h for _, _, _, w, h in result)
            if area > best_area:
                best_area = area
                best_result = ([(pc, rot, x) for pc, rot, x, _, _ in result], strip_h)

    return best_result


def _try_fill_at_height(
    pieces: list[GlassPiece],
    strip_w: float,
    strip_h: float,
    gap: float,
    can_rotate: bool,
) -> list[tuple[GlassPiece, bool, float, float, float]] | None:
    """Try filling a strip of given height, picking pieces that maximize width coverage."""
    placed: list[tuple[GlassPiece, bool, float, float, float]] = []
    used_ids: set[str] = set()
    cursor_x = 0.0

    while cursor_x < strip_w - 1:
        remaining_w = strip_w - cursor_x
        best_piece = None
        best_pw = 0.0
        best_ph = 0.0
        best_rot = False
        best_waste = float('inf')

        for p in pieces:
            if p.id in used_ids:
                continue
            for rot in [False, True] if _can_rotate(p, can_rotate) else [False]:
                pw, ph = _piece_dims(p, rot)
                if pw > remaining_w + 0.1 or ph > strip_h + 0.1:
                    continue
                waste = remaining_w - pw
                if pw > best_pw or (pw == best_pw and ph > best_ph):
                    best_piece = p
                    best_pw = pw
                    best_ph = ph
                    best_rot = rot
                    best_waste = waste

        if not best_piece:
            break

        placed.append((best_piece, best_rot, cursor_x, best_pw, best_ph))
        used_ids.add(best_piece.id)
        cursor_x += best_pw + gap

    return placed if placed else None


# ── Sort strategies ──────────────────────────────────────────────────


def _sort_height_desc(pieces: list[GlassPiece], can_rotate: bool) -> list[GlassPiece]:
    def key(p: GlassPiece):
        if _can_rotate(p, can_rotate):
            return -min(p.width, p.height), -max(p.width, p.height)
        return -p.height, -p.width
    return sorted(pieces, key=key)


def _sort_area_desc(pieces: list[GlassPiece], _cr: bool) -> list[GlassPiece]:
    return sorted(pieces, key=lambda p: -(p.width * p.height))


def _sort_width_asc(pieces: list[GlassPiece], can_rotate: bool) -> list[GlassPiece]:
    def key(p: GlassPiece):
        w = min(p.width, p.height) if _can_rotate(p, can_rotate) else p.width
        return w, -p.height
    return sorted(pieces, key=key)


def _sort_width_desc(pieces: list[GlassPiece], can_rotate: bool) -> list[GlassPiece]:
    def key(p: GlassPiece):
        w = max(p.width, p.height) if _can_rotate(p, can_rotate) else p.width
        return -w, -p.height
    return sorted(pieces, key=key)


# ── Main optimizer ───────────────────────────────────────────────────


def optimize(
    pieces: list[GlassPiece],
    plate_w: float = 3210, plate_h: float = 2550,
    edge_margin: float = 15, cutting_gap: float = 5,
) -> list[MaterialResult]:
    if not pieces:
        return []

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
    edge_margin: float, gap: float,
) -> list[OptimizedPlate]:
    can_rotate = any(not p.no_rotation for p in group)
    sort_fns = [_sort_height_desc, _sort_area_desc, _sort_width_asc, _sort_width_desc]

    best_plates: list[OptimizedPlate] | None = None

    for sort_fn in sort_fns:
        for try_flip in [False, True]:
            w, h = (usable_h, usable_w) if try_flip else (usable_w, usable_h)
            sorted_pcs = sort_fn(list(group), can_rotate)
            plates = _run_packing(sorted_pcs, plate_w, plate_h, w, h,
                                  edge_margin, gap, can_rotate, try_flip)

            if best_plates is None or len(plates) < len(best_plates):
                best_plates = plates
            elif len(plates) == len(best_plates):
                if sum(p.utilisation for p in plates) > sum(p.utilisation for p in best_plates):
                    best_plates = plates

    for i, p in enumerate(best_plates):
        p.numero = i + 1
    return best_plates


def _run_packing(
    sorted_pcs: list[GlassPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float, gap: float,
    can_rotate: bool, flipped: bool,
) -> list[OptimizedPlate]:
    plates: list[OptimizedPlate] = []
    remaining = sorted_pcs

    while remaining:
        placed_raw, remaining = _guillotine_pack_plate(
            remaining, usable_w, usable_h, gap, can_rotate,
        )

        if not placed_raw:
            for pc in remaining:
                pp = PlacedPiece(
                    id=pc.id, vitrage_ref=pc.vitrage_ref,
                    width=pc.width, height=pc.height,
                    material=pc.material, face=pc.face,
                    no_rotation=pc.no_rotation, treatment=pc.treatment,
                    x=edge_margin, y=edge_margin, rotated=False,
                )
                real_uw = plate_w - 2 * edge_margin
                real_uh = plate_h - 2 * edge_margin
                plates.append(_build_plate(len(plates)+1, [pp], plate_w, plate_h,
                                           real_uw, real_uh, edge_margin))
            break

        placed_pieces = []
        for pc, x, y, rot in placed_raw:
            if flipped:
                x, y = y, x
            pw, ph = _piece_dims(pc, rot)
            placed_pieces.append(PlacedPiece(
                id=pc.id, vitrage_ref=pc.vitrage_ref,
                width=pw, height=ph,
                material=pc.material, face=pc.face,
                no_rotation=pc.no_rotation, treatment=pc.treatment,
                x=x + edge_margin, y=y + edge_margin,
                rotated=rot,
            ))

        real_uw = plate_w - 2 * edge_margin
        real_uh = plate_h - 2 * edge_margin
        plates.append(_build_plate(len(plates)+1, placed_pieces, plate_w, plate_h,
                                   real_uw, real_uh, edge_margin))

    return plates


def _build_plate(
    numero: int,
    placed: list[PlacedPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float,
) -> OptimizedPlate:
    local = [
        PlacedPiece(**{**p.model_dump(), "x": p.x - edge_margin, "y": p.y - edge_margin})
        for p in placed
    ]
    remnants = _compute_guillotine_remnants(usable_w, usable_h, local)

    has_forbidden = False
    for r in remnants:
        if 0 < min(r.w, r.h) < MIN_STRIP_WIDTH:
            r.classe = RemnantClass.FORBIDDEN
        if r.classe == RemnantClass.FORBIDDEN:
            has_forbidden = True

    used_area = sum(p.width * p.height for p in placed)
    plate_area = plate_w * plate_h

    return OptimizedPlate(
        numero=numero,
        material=placed[0].material if placed else "",
        plate_width=plate_w, plate_height=plate_h,
        pieces=placed, remnants=remnants,
        utilisation=round(used_area / plate_area * 100, 2) if plate_area else 0,
        has_forbidden=has_forbidden,
    )


def _compute_guillotine_remnants(
    usable_w: float, usable_h: float, pieces: list[PlacedPiece],
) -> list[Remnant]:
    if not pieces:
        return [Remnant(x=0, y=0, w=usable_w, h=usable_h,
                        classe=_classify_remnant(usable_w, usable_h))]

    strips: dict[float, list[PlacedPiece]] = {}
    for p in pieces:
        strips.setdefault(round(p.y, 1), []).append(p)

    remnants: list[Remnant] = []

    for strip_y in sorted(strips.keys()):
        strip_pcs = sorted(strips[strip_y], key=lambda p: p.x)
        strip_h = max(p.height for p in strip_pcs)

        cursor_x = 0.0
        for p in strip_pcs:
            if p.x > cursor_x + 0.5:
                remnants.append(Remnant(
                    x=cursor_x, y=strip_y, w=p.x - cursor_x, h=strip_h,
                    classe=_classify_remnant(p.x - cursor_x, strip_h),
                ))
            cursor_x = p.x + p.width

        if cursor_x < usable_w - 0.5:
            remnants.append(Remnant(
                x=cursor_x, y=strip_y, w=usable_w - cursor_x, h=strip_h,
                classe=_classify_remnant(usable_w - cursor_x, strip_h),
            ))

    max_y = max(p.y + p.height for p in pieces)
    if max_y < usable_h - 0.5:
        remnants.append(Remnant(
            x=0, y=max_y, w=usable_w, h=usable_h - max_y,
            classe=_classify_remnant(usable_w, usable_h - max_y),
        ))

    return [r for r in remnants if r.w > 1 and r.h > 1]
