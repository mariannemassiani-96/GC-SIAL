"""Glass cutting optimizer using rectpack with industrial constraints."""

import rectpack
from schemas import (
    GlassPiece, PlacedPiece, OptimizedPlate, MaterialResult,
    Remnant, RemnantClass,
)
from config import MIN_REMNANT_SIZE, FORBIDDEN_REMNANT_MIN, FORBIDDEN_REMNANT_MAX


def _classify_remnant(w: float, h: float) -> RemnantClass:
    min_dim = min(w, h)
    if min_dim < FORBIDDEN_REMNANT_MIN:
        return RemnantClass.DUST
    if min_dim < FORBIDDEN_REMNANT_MAX or max(w, h) < MIN_REMNANT_SIZE:
        return RemnantClass.FORBIDDEN
    if min_dim < MIN_REMNANT_SIZE:
        return RemnantClass.WATCH
    return RemnantClass.STOCKABLE


def _compute_remnants(usable_w: float, usable_h: float, pieces: list[PlacedPiece]) -> list[Remnant]:
    if not pieces:
        return [Remnant(x=0, y=0, w=usable_w, h=usable_h, classe=_classify_remnant(usable_w, usable_h))]
    max_y = 0.0
    for p in pieces:
        h = p.height if not p.rotated else p.width
        max_y = max(max_y, p.y + h)
    remnants: list[Remnant] = []
    if max_y < usable_h:
        rh = usable_h - max_y
        remnants.append(Remnant(x=0, y=max_y, w=usable_w, h=rh, classe=_classify_remnant(usable_w, rh)))
    for p in sorted(pieces, key=lambda p: (p.y, p.x)):
        pw = p.width if not p.rotated else p.height
        ph = p.height if not p.rotated else p.width
        gap = usable_w - (p.x + pw)
        if gap > 1:
            remnants.append(Remnant(x=p.x + pw, y=p.y, w=gap, h=ph, classe=_classify_remnant(gap, ph)))
    return [r for r in remnants if r.w > 1 and r.h > 1]


def optimize(
    pieces: list[GlassPiece],
    plate_w: float = 3210, plate_h: float = 2550,
    edge_margin: float = 15, cutting_gap: float = 0,
) -> list[MaterialResult]:
    groups: dict[str, list[GlassPiece]] = {}
    for p in pieces:
        groups.setdefault(p.material, []).append(p)

    usable_w = plate_w - 2 * edge_margin
    usable_h = plate_h - 2 * edge_margin
    results: list[MaterialResult] = []

    for material, group in groups.items():
        sorted_pcs = sorted(group, key=lambda p: max(p.width, p.height), reverse=True)
        packer = rectpack.newPacker(
            mode=rectpack.PackingMode.Offline,
            bin_algo=rectpack.MaxRectsBssf,
            pack_algo=rectpack.MaxRectsBssf,
            rotation=False,
        )
        for _ in range(len(sorted_pcs)):
            packer.add_bin(int(usable_w), int(usable_h))

        piece_map: dict[str, GlassPiece] = {}
        for p in sorted_pcs:
            w, h = int(p.width + cutting_gap), int(p.height + cutting_gap)
            if not p.no_rotation and h > w:
                w, h = h, w
            packer.add_rect(w, h, rid=p.id)
            piece_map[p.id] = p

        packer.pack()

        bins: dict[int, list[PlacedPiece]] = {}
        for b_idx, x, y, w, h, rid in packer.rect_list():
            pc = piece_map.get(rid)
            if not pc:
                continue
            aw = w - int(cutting_gap)
            ah = h - int(cutting_gap)
            rotated = not (abs(aw - pc.width) < 1 and abs(ah - pc.height) < 1)
            bins.setdefault(b_idx, []).append(PlacedPiece(
                id=pc.id, vitrage_ref=pc.vitrage_ref,
                width=pc.width, height=pc.height,
                material=pc.material, face=pc.face,
                no_rotation=pc.no_rotation, treatment=pc.treatment,
                x=x + edge_margin, y=y + edge_margin, rotated=rotated,
            ))

        plates: list[OptimizedPlate] = []
        for b_idx in sorted(bins.keys()):
            placed = bins[b_idx]
            used = sum(p.width * p.height for p in placed)
            area = plate_w * plate_h
            local = [PlacedPiece(**{**p.model_dump(), "x": p.x - edge_margin, "y": p.y - edge_margin}) for p in placed]
            rems = _compute_remnants(usable_w, usable_h, local)
            plates.append(OptimizedPlate(
                numero=len(plates) + 1, material=material,
                plate_width=plate_w, plate_height=plate_h,
                pieces=placed, remnants=rems,
                utilisation=(used / area * 100) if area else 0,
                has_forbidden=any(r.classe == RemnantClass.FORBIDDEN for r in rems),
            ))

        total_used = sum(p.utilisation / 100 * plate_w * plate_h for p in plates)
        total_area = len(plates) * plate_w * plate_h
        results.append(MaterialResult(
            material=material, plates=plates,
            total_plates=len(plates), total_pieces=len(group),
            utilisation=(total_used / total_area * 100) if total_area else 0,
        ))

    return results
