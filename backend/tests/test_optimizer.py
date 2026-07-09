"""Benchmark: compare greedy vs staged_dp optimisers.

Run from backend/:
    python3 tests/test_optimizer.py

Or with pytest:
    python3 -m pytest tests/test_optimizer.py -v -s
"""

from __future__ import annotations

import sys
import os
import time

# Ensure backend/ is on the import path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from schemas import GlassPiece, PieceFace
from services.optimizer import optimize
from services.validate_guillotine import validate_guillotine


# ── Test data generators ────────────────────────────────────────────


def _make_mixed_order() -> list[GlassPiece]:
    """Realistic mixed window order (32 pieces, 2 materials)."""
    specs = [
        # Standard windows — material A
        ("W1", 1200, 800, "4/16/4 BE", 2),
        ("W2", 1400, 900, "4/16/4 BE", 3),
        ("W3", 800, 600, "4/16/4 BE", 4),
        ("W6", 500, 400, "4/16/4 BE", 6),
        ("W7", 600, 350, "4/16/4 BE", 4),
        ("W10", 1100, 700, "4/16/4 BE", 3),
        ("W11", 950, 850, "4/16/4 BE", 2),
        # Large / door pieces — material B
        ("W4", 2000, 1200, "44.2/20/4 BE", 2),
        ("W5", 1800, 1500, "44.2/20/4 BE", 1),
        ("W8", 700, 2100, "44.2/20/4 BE", 2),
        ("W9", 900, 2200, "44.2/20/4 BE", 1),
        ("W12", 1300, 550, "44.2/20/4 BE", 2),
    ]
    pieces: list[GlassPiece] = []
    for ref, w, h, material, qty in specs:
        for i in range(qty):
            pieces.append(GlassPiece(
                id=f"{ref}-{i + 1}",
                vitrage_ref=ref,
                width=w, height=h,
                material=material,
                face=PieceFace.EXT,
            ))
    return pieces


def _make_identical_small() -> list[GlassPiece]:
    """20 identical small pieces (should pack very efficiently)."""
    return [
        GlassPiece(
            id=f"S-{i}", vitrage_ref="S",
            width=400, height=300, material="4/16/4 BE",
            face=PieceFace.EXT,
        )
        for i in range(20)
    ]


def _make_large_pieces() -> list[GlassPiece]:
    """6 large pieces that barely fit the plate."""
    specs = [
        ("L1", 2800, 2000, 1),
        ("L2", 1500, 2400, 2),
        ("L3", 3000, 1200, 1),
        ("L4", 1000, 2500, 2),
    ]
    pieces: list[GlassPiece] = []
    for ref, w, h, qty in specs:
        for i in range(qty):
            pieces.append(GlassPiece(
                id=f"{ref}-{i + 1}", vitrage_ref=ref,
                width=w, height=h, material="44.2/20/4 BE",
                face=PieceFace.EXT,
            ))
    return pieces


def _make_stackable() -> list[GlassPiece]:
    """Pieces designed to benefit from column stacking (3-stage).

    Two sizes that stack perfectly: 800+700 = 1500, fitting in a
    1500-high shelf.
    """
    pieces: list[GlassPiece] = []
    for i in range(6):
        pieces.append(GlassPiece(
            id=f"TA-{i}", vitrage_ref="TA",
            width=500, height=800, material="4/16/4 BE",
            face=PieceFace.EXT,
        ))
    for i in range(6):
        pieces.append(GlassPiece(
            id=f"TB-{i}", vitrage_ref="TB",
            width=500, height=700, material="4/16/4 BE",
            face=PieceFace.EXT,
        ))
    return pieces


def _make_no_rotation() -> list[GlassPiece]:
    """10 pieces where rotation is forbidden."""
    pieces: list[GlassPiece] = []
    for i in range(10):
        pieces.append(GlassPiece(
            id=f"NR-{i}", vitrage_ref="NR",
            width=600 + i * 50, height=400,
            material="4/16/4 BE",
            face=PieceFace.EXT,
            no_rotation=True,
        ))
    return pieces


# ── Benchmark runner ────────────────────────────────────────────────


def _run_comparison(
    label: str,
    pieces: list[GlassPiece],
    plate_w: float = 3210,
    plate_h: float = 2550,
):
    """Run both algorithms and print a comparison table."""
    n = len(pieces)
    mats = sorted(set(p.material for p in pieces))
    total_area = sum(p.width * p.height for p in pieces) / 1e6
    print(f"\n{'=' * 64}")
    print(f"  {label}")
    print(f"  {n} pieces, {len(mats)} material(s), {total_area:.2f} m2 total")
    print(f"  Plate: {plate_w} x {plate_h}")
    print(f"{'=' * 64}")

    # Run both algorithms with both machine profiles
    configs = [
        ("Greedy", "greedy", "lisec"),
        ("DP 2-stage (bottero)", "staged_dp", "bottero"),
        ("DP 3-stage (lisec)", "staged_dp", "lisec"),
    ]

    results_data: list[tuple[str, float, int, float]] = []

    for name, algo, machine in configs:
        t0 = time.perf_counter()
        res = optimize(
            pieces, plate_w, plate_h,
            algorithm=algo, machine=machine,
        )
        elapsed = time.perf_counter() - t0

        total_plates = sum(r.total_plates for r in res)
        avg_util = (
            sum(r.utilisation * r.total_plates for r in res) / max(total_plates, 1)
        )
        results_data.append((name, elapsed, total_plates, avg_util))

    # Table
    print(f"\n  {'Algorithm':26s} {'Plates':>7s} {'Util%':>7s} {'Time':>8s}")
    print(f"  {'-' * 50}")
    for name, elapsed, plates, util in results_data:
        print(f"  {name:26s} {plates:7d} {util:7.1f} {elapsed:7.3f}s")

    # Improvements
    greedy_plates = results_data[0][2]
    for name, _, plates, _ in results_data[1:]:
        diff = greedy_plates - plates
        if diff > 0:
            print(f"  -> {name} saves {diff} plate(s) vs greedy")
        elif diff == 0:
            print(f"  -> {name} same plate count as greedy")

    # Validation (staged_dp / lisec)
    print(f"\n  Validation:")
    for name, algo, machine in configs:
        res = optimize(
            pieces, plate_w, plate_h,
            algorithm=algo, machine=machine,
        )
        all_plates = [pl for r in res for pl in r.plates]
        errors = validate_guillotine(all_plates, machine=machine)
        err_count = sum(1 for e in errors if e.severity == "error")
        warn_count = sum(1 for e in errors if e.severity == "warning")
        status = "OK" if err_count == 0 else f"{err_count} ERROR(s)"
        if warn_count:
            status += f", {warn_count} warning(s)"
        print(f"    {name:26s} {status}")
        for e in errors:
            if e.severity == "error":
                print(f"      {e}")


# ── Pytest-compatible tests ─────────────────────────────────────────


def test_greedy_produces_results():
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="greedy")
    total = sum(r.total_plates for r in results)
    assert total > 0
    placed = sum(r.total_pieces for r in results)
    assert placed == len(pieces)


def test_staged_dp_produces_results():
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="staged_dp")
    total = sum(r.total_plates for r in results)
    assert total > 0
    placed = sum(r.total_pieces for r in results)
    assert placed == len(pieces)


def test_staged_dp_no_worse_than_greedy():
    """Staged DP must use at most as many plates as greedy (it also
    tries greedy internally and keeps the best)."""
    for make_fn in [_make_mixed_order, _make_identical_small,
                    _make_large_pieces, _make_stackable, _make_no_rotation]:
        pieces = make_fn()
        g = optimize(pieces, algorithm="greedy")
        d = optimize(pieces, algorithm="staged_dp")
        g_plates = sum(r.total_plates for r in g)
        d_plates = sum(r.total_plates for r in d)
        assert d_plates <= g_plates, (
            f"{make_fn.__name__}: DP used {d_plates} plates vs greedy {g_plates}"
        )


def test_no_overlaps():
    """No placed pieces should overlap."""
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="staged_dp")
    all_plates = [pl for r in results for pl in r.plates]
    errors = validate_guillotine(all_plates)
    overlap_errors = [e for e in errors if "overlap" in e.message]
    assert overlap_errors == [], overlap_errors


def test_rotation_respected():
    """Pieces with no_rotation should never be rotated."""
    pieces = _make_no_rotation()
    results = optimize(pieces, algorithm="staged_dp")
    for r in results:
        for plate in r.plates:
            for p in plate.pieces:
                if p.no_rotation:
                    assert not p.rotated, f"Piece {p.id} rotated despite no_rotation"


def test_pieces_within_bounds():
    """All pieces must be within plate bounds."""
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="staged_dp")
    all_plates = [pl for r in results for pl in r.plates]
    errors = validate_guillotine(all_plates)
    bound_errors = [e for e in errors if "bounds" in e.message or "before usable" in e.message]
    assert bound_errors == [], bound_errors


def test_machine_bottero_2stage():
    """Bottero should produce valid 2-stage plans."""
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="staged_dp", machine="bottero")
    all_plates = [pl for r in results for pl in r.plates]
    errors = validate_guillotine(all_plates, machine="bottero")
    hard_errors = [e for e in errors if e.severity == "error"]
    assert hard_errors == [], hard_errors


def test_machine_lisec_3stage():
    """LISEC should produce valid 3-stage plans."""
    pieces = _make_mixed_order()
    results = optimize(pieces, algorithm="staged_dp", machine="lisec")
    all_plates = [pl for r in results for pl in r.plates]
    errors = validate_guillotine(all_plates, machine="lisec")
    hard_errors = [e for e in errors if e.severity == "error"]
    assert hard_errors == [], hard_errors


def test_multiple_plate_sizes():
    """Multiple plate sizes should pick the more efficient one."""
    pieces = _make_large_pieces()
    from config import PLATE_SIZES
    r_single = optimize(pieces, algorithm="staged_dp")
    r_multi = optimize(pieces, algorithm="staged_dp", plate_sizes=PLATE_SIZES)
    p_single = sum(r.total_plates for r in r_single)
    p_multi = sum(r.total_plates for r in r_multi)
    assert p_multi <= p_single


def test_empty_input():
    assert optimize([]) == []


def test_single_piece():
    pieces = [GlassPiece(
        id="X", vitrage_ref="X", width=500, height=400,
        material="4/16/4 BE", face=PieceFace.EXT,
    )]
    results = optimize(pieces, algorithm="staged_dp")
    assert sum(r.total_plates for r in results) == 1
    assert sum(r.total_pieces for r in results) == 1


# ── CLI entry point ─────────────────────────────────────────────────

if __name__ == "__main__":
    print("ISULA VITRAGE — Optimizer Benchmark")
    print("Comparing greedy vs staged_dp (2-stage / 3-stage)")

    _run_comparison("Mixed window order", _make_mixed_order())
    _run_comparison("20 identical small pieces", _make_identical_small())
    _run_comparison("6 large pieces", _make_large_pieces())
    _run_comparison("Column-stackable pieces", _make_stackable())
    _run_comparison("No-rotation pieces", _make_no_rotation())
    _run_comparison(
        "Large pieces on 4500x3210",
        _make_large_pieces(), plate_w=4500, plate_h=3210,
    )

    print(f"\n{'=' * 64}")
    print("  Benchmark complete.")
    print(f"{'=' * 64}")
