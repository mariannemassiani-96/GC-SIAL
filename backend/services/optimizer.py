"""Glass cutting optimizer — guillotine strip-packing for LISEC / Bottero.

Provides two algorithms:
  - 'greedy' : original horizontal-strip greedy heuristic (2-stage)
  - 'staged_dp' : group-knapsack DP with column stacking (up to 3-stage)

Machine profiles:
  - 'bottero' : single-axis cuts only → 2-stage plans (shelves + pieces)
  - 'lisec'   : both axes → 3-stage plans (shelves + columns + stacking)

The staged_dp algorithm always tries the greedy fallback too and keeps
whichever result uses fewer plates (or better utilisation on ties).
"""

from __future__ import annotations

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


# ── Guillotine strip packer (original greedy — 2-stage) ─────────────


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
    """Fill one strip, picking the height that maximizes density (area / strip_area).

    This prevents tall strips that waste vertical space when pieces are short.
    """
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

    best_result = None
    best_score = 0.0

    for strip_h in sorted(seen_heights):
        result = _try_fill_at_height(pieces, strip_w, strip_h, gap, can_rotate)
        if not result:
            continue
        n_pieces = len(result)
        piece_area = sum(w * h for _, _, _, w, h in result)
        strip_area = strip_w * strip_h
        density = piece_area / strip_area if strip_area > 0 else 0
        score = n_pieces * 1000 + density * 100

        if score > best_score:
            best_score = score
            best_result = ([(pc, rot, x) for pc, rot, x, _, _ in result], strip_h)

    return best_result


def _try_fill_at_height(
    pieces: list[GlassPiece],
    strip_w: float,
    strip_h: float,
    gap: float,
    can_rotate: bool,
) -> list[tuple[GlassPiece, bool, float, float, float]] | None:
    """Try filling a strip, preferring narrower orientations to fit more pieces."""
    best_placed: list[tuple[GlassPiece, bool, float, float, float]] | None = None

    for prefer_narrow in [True, False]:
        placed: list[tuple[GlassPiece, bool, float, float, float]] = []
        used_ids: set[str] = set()
        cursor_x = 0.0

        while cursor_x < strip_w - 1:
            remaining_w = strip_w - cursor_x
            best_piece = None
            best_pw = 0.0
            best_ph = 0.0
            best_rot = False

            for p in pieces:
                if p.id in used_ids:
                    continue
                for rot in [False, True] if _can_rotate(p, can_rotate) else [False]:
                    pw, ph = _piece_dims(p, rot)
                    if pw > remaining_w + 0.1 or ph > strip_h + 0.1:
                        continue
                    if best_piece is None:
                        best_piece, best_pw, best_ph, best_rot = p, pw, ph, rot
                    elif prefer_narrow:
                        if pw < best_pw or (pw == best_pw and ph > best_ph):
                            best_piece, best_pw, best_ph, best_rot = p, pw, ph, rot
                    else:
                        if pw > best_pw or (pw == best_pw and ph > best_ph):
                            best_piece, best_pw, best_ph, best_rot = p, pw, ph, rot

            if not best_piece:
                break

            placed.append((best_piece, best_rot, cursor_x, best_pw, best_ph))
            used_ids.add(best_piece.id)
            cursor_x += best_pw + gap

        if placed:
            if best_placed is None or len(placed) > len(best_placed):
                best_placed = placed
            elif len(placed) == len(best_placed):
                area_new = sum(w * h for _, _, _, w, h in placed)
                area_old = sum(w * h for _, _, _, w, h in best_placed)
                if area_new > area_old:
                    best_placed = placed

    return best_placed


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


# ── 3-Stage Guillotine DP Optimizer ─────────────────────────────────
#
# Stage 1 : horizontal guillotine cuts → shelves (full plate width)
# Stage 2 : group-knapsack DP selects and places pieces within each shelf
# Stage 3 : column-gap filling stacks additional pieces vertically
#            (only when machine='lisec'; Bottero is 2-stage only)


def _get_candidate_heights(
    pieces: list[GlassPiece],
    max_h: float,
    gap: float,
    can_rotate: bool,
) -> list[float]:
    """Generate candidate shelf heights from piece dimensions.

    Includes individual piece heights/widths and selected pair sums
    (for vertical stacking within columns).
    """
    heights: set[float] = set()
    dims: list[float] = []
    for p in pieces:
        if p.height <= max_h + 0.1:
            heights.add(p.height)
            dims.append(p.height)
        if _can_rotate(p, can_rotate) and p.width != p.height:
            if p.width <= max_h + 0.1:
                heights.add(p.width)
                dims.append(p.width)
    # Pair sums for 2-piece column stacking
    unique_dims = sorted(set(dims))[:15]
    for i, d1 in enumerate(unique_dims):
        for d2 in unique_dims[i:]:
            s = d1 + gap + d2
            if s <= max_h + 0.1:
                heights.add(round(s, 1))
    return sorted(h for h in heights if h > 1)[:40]


def _group_knapsack_fill(
    pieces: list[GlassPiece],
    shelf_w: float,
    shelf_h: float,
    gap: float,
    can_rotate: bool,
) -> list[tuple[GlassPiece, bool, float, float, float]]:
    """Select pieces for a shelf using group knapsack DP.

    Each piece is a *group* with up to 2 items (original and rotated).
    At most one orientation per piece is selected.  The DP maximises
    total area packed into the shelf width.

    Returns
    -------
    list of (piece, rotated, x_pos, eff_width, eff_height)
    """
    # Build item groups ------------------------------------------------
    groups: list[list[tuple[int, bool, float, float, int, float]]] = []
    for i, p in enumerate(pieces):
        group: list[tuple[int, bool, float, float, int, float]] = []
        for rot in [False, True] if _can_rotate(p, can_rotate) else [False]:
            pw, ph = _piece_dims(p, rot)
            if ph > shelf_h + 0.1 or pw > shelf_w + 0.1:
                continue
            w_int = max(1, int(round(pw + gap)))
            area = pw * ph
            group.append((i, rot, pw, ph, w_int, area))
        if group:
            groups.append(group)

    if not groups:
        return []

    n_groups = len(groups)
    # +gap on capacity: the last placed piece does not need a trailing gap
    cap = max(1, int(round(shelf_w + gap)))

    # 2-D DP table  (group x capacity) --------------------------------
    dp = [[0.0] * (cap + 1) for _ in range(n_groups + 1)]
    choice = [[-1] * (cap + 1) for _ in range(n_groups)]

    for g in range(n_groups):
        row_prev = dp[g]
        row_curr = dp[g + 1]
        row_curr[:] = row_prev          # option: take nothing from this group
        for item_idx, (_, _, _, _, w_int, area) in enumerate(groups[g]):
            for j in range(cap, w_int - 1, -1):
                val = row_prev[j - w_int] + area
                if val > row_curr[j]:
                    row_curr[j] = val
                    choice[g][j] = item_idx

    # Best capacity value ----------------------------------------------
    final_row = dp[n_groups]
    best_j = 0
    best_val = 0.0
    for j in range(cap + 1):
        if final_row[j] > best_val:
            best_val = final_row[j]
            best_j = j

    if best_val <= 0:
        return []

    # Backtrack ---------------------------------------------------------
    selected: list[tuple[int, bool, float, float]] = []
    j = best_j
    for g in range(n_groups - 1, -1, -1):
        c = choice[g][j]
        if c >= 0:
            i, rot, pw, ph, w_int, _area = groups[g][c]
            selected.append((i, rot, pw, ph))
            j -= w_int
    selected.reverse()

    # Assign x positions -----------------------------------------------
    result: list[tuple[GlassPiece, bool, float, float, float]] = []
    x = 0.0
    for idx, rot, pw, ph in selected:
        result.append((pieces[idx], rot, x, pw, ph))
        x += pw + gap

    return result


def _fill_column_gaps(
    primary: list[tuple[GlassPiece, bool, float, float, float]],
    remaining: list[GlassPiece],
    shelf_h: float,
    gap: float,
    can_rotate: bool,
) -> list[tuple[GlassPiece, bool, float, float]]:
    """Stage 3: stack additional pieces vertically in column gaps.

    After primary pieces are placed, each column has a vertical gap
    of ``shelf_h - piece_h`` above the piece.  This function greedily
    fills those gaps with remaining pieces (largest-area first).

    Returns
    -------
    list of (piece, rotated, x_pos, y_offset_within_shelf)
    """
    if not remaining:
        return []

    additional: list[tuple[GlassPiece, bool, float, float]] = []
    avail = sorted(remaining, key=lambda p: -(p.width * p.height))

    for _, _, col_x, col_pw, col_ph in primary:
        space_h = shelf_h - col_ph
        if space_h < gap + 5:
            continue
        y_cursor = col_ph + gap
        space_h -= gap

        i = 0
        while i < len(avail) and space_h > 0:
            p = avail[i]
            placed = False
            for rot in [False, True] if _can_rotate(p, can_rotate) else [False]:
                pw, ph = _piece_dims(p, rot)
                if pw <= col_pw + 0.1 and ph <= space_h + 0.1:
                    additional.append((p, rot, col_x, y_cursor))
                    y_cursor += ph + gap
                    space_h -= ph + gap
                    avail.pop(i)
                    placed = True
                    break
            if not placed:
                i += 1

    return additional


def _dp_find_best_shelf(
    pieces: list[GlassPiece],
    shelf_w: float,
    max_h: float,
    gap: float,
    can_rotate: bool,
    allow_stacking: bool = True,
) -> tuple[list[tuple[GlassPiece, float, float, bool]], float] | None:
    """Find the best shelf height and piece arrangement using DP.

    Parameters
    ----------
    allow_stacking : bool
        If True (LISEC), use 3-stage column-gap stacking.
        If False (Bottero), keep 2-stage only.
    """
    heights = _get_candidate_heights(pieces, max_h, gap, can_rotate)

    best_result = None
    best_score = -1.0

    for h in heights:
        primary = _group_knapsack_fill(pieces, shelf_w, h, gap, can_rotate)
        if not primary:
            continue

        # Actual shelf height = tallest placed piece
        actual_h = max(ph for _, _, _, _, ph in primary)

        placements: list[tuple[GlassPiece, float, float, bool]] = []
        used_ids: set[str] = set()

        for p, rot, x, pw, ph in primary:
            placements.append((p, x, 0.0, rot))
            used_ids.add(p.id)

        # Column gap filling (Stage 3) — only for LISEC / 3-stage
        if allow_stacking:
            avail = [p for p in pieces if p.id not in used_ids]
            if avail:
                extra = _fill_column_gaps(primary, avail, actual_h, gap, can_rotate)
                for p, rot, x, y_off in extra:
                    placements.append((p, x, y_off, rot))
                    used_ids.add(p.id)

        total_area = sum(
            _piece_dims(p, rot)[0] * _piece_dims(p, rot)[1]
            for p, _, _, rot in placements
        )
        shelf_area = shelf_w * actual_h
        density = total_area / shelf_area if shelf_area > 0 else 0
        score = density * 1000 + len(placements)

        if score > best_score:
            best_score = score
            best_result = (placements, actual_h)

    return best_result


def _staged_dp_pack_plate(
    pieces: list[GlassPiece],
    usable_w: float,
    usable_h: float,
    gap: float,
    can_rotate: bool,
    allow_stacking: bool = True,
) -> tuple[list[tuple[GlassPiece, float, float, bool]], list[GlassPiece]]:
    """Pack pieces into a plate using staged guillotine DP.

    Same interface as ``_guillotine_pack_plate`` so callers can swap
    freely between algorithms.

    Parameters
    ----------
    allow_stacking : bool
        Forwarded to ``_dp_find_best_shelf``.  True = 3-stage (LISEC),
        False = 2-stage (Bottero).
    """
    remaining = list(pieces)
    placed: list[tuple[GlassPiece, float, float, bool]] = []
    shelf_y = 0.0

    while remaining and shelf_y < usable_h - 1:
        avail_h = usable_h - shelf_y
        shelf_result = _dp_find_best_shelf(
            remaining, usable_w, avail_h, gap, can_rotate,
            allow_stacking=allow_stacking,
        )
        if not shelf_result:
            break

        shelf_placements, shelf_h = shelf_result
        used_ids: set[str] = set()
        for p, x, y_off, rot in shelf_placements:
            placed.append((p, x, shelf_y + y_off, rot))
            used_ids.add(p.id)

        shelf_y += shelf_h + gap
        remaining = [p for p in remaining if p.id not in used_ids]

    return placed, remaining


# ── Generic packing runner ──────────────────────────────────────────


def _run_packing_generic(
    sorted_pcs: list[GlassPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float, gap: float,
    can_rotate: bool, flipped: bool,
    pack_fn,
    *,
    pack_fn_kwargs: dict | None = None,
) -> list[OptimizedPlate]:
    """Run packing with a pluggable packing function.

    ``pack_fn`` must follow the same interface as
    ``_guillotine_pack_plate``: (pieces, uw, uh, gap, can_rot, **kw) →
    (placed, remaining).
    """
    plates: list[OptimizedPlate] = []
    remaining = sorted_pcs
    kw = pack_fn_kwargs or {}

    while remaining:
        placed_raw, remaining = pack_fn(
            remaining, usable_w, usable_h, gap, can_rotate, **kw,
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
                plates.append(_build_plate(len(plates) + 1, [pp], plate_w, plate_h,
                                           real_uw, real_uh, edge_margin))
            break

        placed_pieces = []
        for pc, x, y, rot in placed_raw:
            if flipped:
                x, y = y, x
                rot = not rot       # swap effective dims to match new axes
            placed_pieces.append(PlacedPiece(
                id=pc.id, vitrage_ref=pc.vitrage_ref,
                width=pc.width, height=pc.height,
                material=pc.material, face=pc.face,
                no_rotation=pc.no_rotation, treatment=pc.treatment,
                x=x + edge_margin, y=y + edge_margin,
                rotated=rot,
            ))

        real_uw = plate_w - 2 * edge_margin
        real_uh = plate_h - 2 * edge_margin
        plates.append(_build_plate(len(plates) + 1, placed_pieces, plate_w, plate_h,
                                   real_uw, real_uh, edge_margin))

    return plates


# ── Material-level DP packer ────────────────────────────────────────


def _pack_material_dp(
    group: list[GlassPiece],
    plate_w: float, plate_h: float,
    usable_w: float, usable_h: float,
    edge_margin: float, gap: float,
    machine: str = "lisec",
) -> list[OptimizedPlate]:
    """Pack material using staged DP *and* greedy, keep the winner.

    Parameters
    ----------
    machine : str
        'lisec' → 3-stage (column stacking enabled).
        'bottero' → 2-stage (column stacking disabled).
    """
    can_rotate = any(not p.no_rotation for p in group)
    sort_fns = [_sort_height_desc, _sort_area_desc, _sort_width_asc, _sort_width_desc]

    allow_stacking = machine != "bottero"

    # packers: (function, extra kwargs)
    packers: list[tuple] = [
        (_staged_dp_pack_plate, {"allow_stacking": allow_stacking}),
        (_guillotine_pack_plate, {}),
    ]

    best_plates: list[OptimizedPlate] | None = None

    for pack_fn, kw in packers:
        for sort_fn in sort_fns:
            for try_flip in [False, True]:
                w, h = (usable_h, usable_w) if try_flip else (usable_w, usable_h)
                sorted_pcs = sort_fn(list(group), can_rotate)
                plates = _run_packing_generic(
                    sorted_pcs, plate_w, plate_h, w, h,
                    edge_margin, gap, can_rotate, try_flip, pack_fn,
                    pack_fn_kwargs=kw,
                )

                if best_plates is None or len(plates) < len(best_plates):
                    best_plates = plates
                elif len(plates) == len(best_plates):
                    if sum(p.utilisation for p in plates) > sum(
                        p.utilisation for p in best_plates
                    ):
                        best_plates = plates

    assert best_plates is not None
    for i, p in enumerate(best_plates):
        p.numero = i + 1
    return best_plates


# ── Main optimizer ───────────────────────────────────────────────────


def optimize(
    pieces: list[GlassPiece],
    plate_w: float = 3210, plate_h: float = 2550,
    edge_margin: float = 15, cutting_gap: float = 5,
    algorithm: str = "staged_dp",
    machine: str = "lisec",
    plate_sizes: list[tuple[float, float]] | None = None,
) -> list[MaterialResult]:
    """Run the glass-cutting optimiser.

    Parameters
    ----------
    algorithm : str
        ``'staged_dp'`` (default, improved) or ``'greedy'`` (original).
    machine : str
        ``'lisec'`` (3-stage, column stacking) or ``'bottero'``
        (2-stage, no stacking).
    plate_sizes : list of (width, height) tuples, optional
        When supplied, each plate size is tried per material and the
        one requiring fewest plates is kept.  Falls back to
        ``(plate_w, plate_h)`` if omitted.
    """
    if not pieces:
        return []

    groups: dict[str, list[GlassPiece]] = {}
    for p in pieces:
        groups.setdefault(p.material, []).append(p)

    sizes = plate_sizes or [(plate_w, plate_h)]
    results: list[MaterialResult] = []

    pack_material_fn = _pack_material_dp if algorithm == "staged_dp" else _pack_material

    for material, group in groups.items():
        best_plates: list[OptimizedPlate] | None = None

        for pw, ph in sizes:
            uw = pw - 2 * edge_margin
            uh = ph - 2 * edge_margin
            if algorithm == "staged_dp":
                plates = _pack_material_dp(
                    group, pw, ph, uw, uh, edge_margin, cutting_gap,
                    machine=machine,
                )
            else:
                plates = _pack_material(
                    group, pw, ph, uw, uh, edge_margin, cutting_gap,
                )
            if best_plates is None or len(plates) < len(best_plates):
                best_plates = plates
            elif len(plates) == len(best_plates):
                new_util = sum(p.utilisation for p in plates)
                old_util = sum(p.utilisation for p in best_plates)
                if new_util > old_util:
                    best_plates = plates

        assert best_plates is not None
        total_used = sum(
            pl.utilisation / 100 * pl.plate_width * pl.plate_height
            for pl in best_plates
        )
        total_area = sum(pl.plate_width * pl.plate_height for pl in best_plates)
        results.append(MaterialResult(
            material=material,
            plates=best_plates,
            total_plates=len(best_plates),
            total_pieces=len(group),
            utilisation=round(total_used / total_area * 100, 2) if total_area else 0,
        ))

    return results


# ── Original greedy material packer (kept as fallback) ──────────────


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
                rot = not rot       # swap effective dims to match new axes
            placed_pieces.append(PlacedPiece(
                id=pc.id, vitrage_ref=pc.vitrage_ref,
                width=pc.width, height=pc.height,
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


# ── Plate building & remnants ───────────────────────────────────────


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

    def _eff_w(p: PlacedPiece) -> float:
        return p.height if p.rotated else p.width

    def _eff_h(p: PlacedPiece) -> float:
        return p.width if p.rotated else p.height

    strips: dict[float, list[PlacedPiece]] = {}
    for p in pieces:
        strips.setdefault(round(p.y, 1), []).append(p)

    remnants: list[Remnant] = []

    for strip_y in sorted(strips.keys()):
        strip_pcs = sorted(strips[strip_y], key=lambda p: p.x)
        strip_h = max(_eff_h(p) for p in strip_pcs)

        cursor_x = 0.0
        for p in strip_pcs:
            if p.x > cursor_x + 0.5:
                remnants.append(Remnant(
                    x=cursor_x, y=strip_y, w=p.x - cursor_x, h=strip_h,
                    classe=_classify_remnant(p.x - cursor_x, strip_h),
                ))
            cursor_x = p.x + _eff_w(p)

        if cursor_x < usable_w - 0.5:
            remnants.append(Remnant(
                x=cursor_x, y=strip_y, w=usable_w - cursor_x, h=strip_h,
                classe=_classify_remnant(usable_w - cursor_x, strip_h),
            ))

    max_y = max(p.y + _eff_h(p) for p in pieces)
    if max_y < usable_h - 0.5:
        remnants.append(Remnant(
            x=0, y=max_y, w=usable_w, h=usable_h - max_y,
            classe=_classify_remnant(usable_w, usable_h - max_y),
        ))

    return [r for r in remnants if r.w > 1 and r.h > 1]
