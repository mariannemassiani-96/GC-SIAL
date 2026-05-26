import type {
  Vitrage,
  GlassPiece,
  PlacedPiece,
  OptimizedPlate,
  GlassOptimResult,
  GlassSettings,
  Remnant,
  RemnantClass,
} from './types';
import { DEFAULT_GLASS } from './types';

interface FreeRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Extracts two glass pieces per vitrage: one EXT (outer glass) and one INT (inner glass). */
export function extractGlassPieces(vitrages: Vitrage[]): GlassPiece[] {
  const pieces: GlassPiece[] = [];
  for (const v of vitrages) {
    pieces.push({
      vitrageId: v.id,
      vitrageRef: v.reference,
      width: v.largeur,
      height: v.hauteur,
      material: v.outerGlass,
      face: 'EXT',
    });
    pieces.push({
      vitrageId: v.id,
      vitrageRef: v.reference,
      width: v.largeur,
      height: v.hauteur,
      material: v.innerGlass,
      face: 'INT',
    });
  }
  return pieces;
}

function findBestFit(
  freeRects: FreeRect[],
  pw: number,
  ph: number,
): { rectIndex: number; rotated: boolean } | null {
  let bestIndex = -1;
  let bestRotated = false;
  let bestShortSide = Infinity;
  let bestLongSide = Infinity;

  for (let i = 0; i < freeRects.length; i++) {
    const r = freeRects[i];

    for (const rot of [false, true]) {
      const w = rot ? ph : pw;
      const h = rot ? pw : ph;

      if (w > r.w || h > r.h) continue;

      const leftoverW = r.w - w;
      const leftoverH = r.h - h;
      const shortSide = Math.min(leftoverW, leftoverH);
      const longSide = Math.max(leftoverW, leftoverH);

      if (
        shortSide < bestShortSide ||
        (shortSide === bestShortSide && longSide < bestLongSide)
      ) {
        bestShortSide = shortSide;
        bestLongSide = longSide;
        bestIndex = i;
        bestRotated = rot;
      }
    }
  }

  if (bestIndex === -1) return null;
  return { rectIndex: bestIndex, rotated: bestRotated };
}

function guillotineSplit(
  rect: FreeRect,
  placedW: number,
  placedH: number,
): FreeRect[] {
  const rightW = rect.w - placedW;
  const bottomH = rect.h - placedH;
  const result: FreeRect[] = [];

  if (rightW <= 0 && bottomH <= 0) return result;

  if (rightW <= 0) {
    result.push({ x: rect.x, y: rect.y + placedH, w: rect.w, h: bottomH });
    return result;
  }
  if (bottomH <= 0) {
    result.push({ x: rect.x + placedW, y: rect.y, w: rightW, h: rect.h });
    return result;
  }

  const horizontalLarger = Math.max(rect.w * bottomH, rightW * placedH);
  const verticalLarger = Math.max(placedW * bottomH, rightW * rect.h);

  if (horizontalLarger >= verticalLarger) {
    result.push({ x: rect.x, y: rect.y + placedH, w: rect.w, h: bottomH });
    result.push({ x: rect.x + placedW, y: rect.y, w: rightW, h: placedH });
  } else {
    result.push({ x: rect.x + placedW, y: rect.y, w: rightW, h: rect.h });
    result.push({ x: rect.x, y: rect.y + placedH, w: placedW, h: bottomH });
  }

  return result;
}

function classifyRemnant(w: number, h: number): RemnantClass {
  const minDim = Math.min(w, h);
  const maxDim = Math.max(w, h);
  if (minDim < 50) return 'poussiere';
  if (minDim < 250 || maxDim < 300) return 'interdit';
  if (minDim < 300) return 'surveiller';
  return 'stockable';
}

function analyzeRemnants(freeRects: FreeRect[]): Remnant[] {
  return freeRects
    .filter(r => r.w > 1 && r.h > 1)
    .map(r => ({
      x: r.x, y: r.y, w: Math.round(r.w), h: Math.round(r.h),
      classe: classifyRemnant(r.w, r.h),
    }));
}

function packPlate(
  pieces: GlassPiece[],
  plateWidth: number,
  plateHeight: number,
  cuttingGap: number,
  edgeTrimMargin: number,
): { placed: PlacedPiece[]; remaining: GlassPiece[]; remnants: Remnant[] } {
  const m = edgeTrimMargin;
  const freeRects: FreeRect[] = [{ x: m, y: m, w: plateWidth - 2 * m, h: plateHeight - 2 * m }];
  const placed: PlacedPiece[] = [];
  const remaining: GlassPiece[] = [];

  for (const piece of pieces) {
    const pw = piece.width + cuttingGap;
    const ph = piece.height + cuttingGap;

    const fit = findBestFit(freeRects, pw, ph);
    if (!fit) {
      remaining.push(piece);
      continue;
    }

    const rect = freeRects[fit.rectIndex];
    const actualW = fit.rotated ? piece.height : piece.width;
    const actualH = fit.rotated ? piece.width : piece.height;

    placed.push({
      ...piece,
      x: rect.x,
      y: rect.y,
      rotated: fit.rotated,
    });

    const occupiedW = actualW + cuttingGap;
    const occupiedH = actualH + cuttingGap;

    const newRects = guillotineSplit(rect, occupiedW, occupiedH);
    freeRects.splice(fit.rectIndex, 1, ...newRects);
  }

  return { placed, remaining, remnants: analyzeRemnants(freeRects) };
}

/** Runs 2D guillotine bin-packing to optimize glass cutting across standard plates, grouped by material. */
export function optimizeGlass(
  vitrages: Vitrage[],
  settings: GlassSettings = DEFAULT_GLASS,
): GlassOptimResult[] {
  const { plateWidth, plateHeight, cuttingGap, edgeTrimMargin } = settings;
  const allPieces = extractGlassPieces(vitrages);

  const groups = new Map<string, GlassPiece[]>();
  for (const p of allPieces) {
    const arr = groups.get(p.material) ?? [];
    arr.push(p);
    groups.set(p.material, arr);
  }

  const results: GlassOptimResult[] = [];

  for (const [material, pieces] of groups) {
    const sorted = [...pieces].sort((a, b) => {
      const maxA = Math.max(a.width, a.height);
      const maxB = Math.max(b.width, b.height);
      if (maxB !== maxA) return maxB - maxA;
      return (b.width * b.height) - (a.width * a.height);
    });

    const plates: OptimizedPlate[] = [];
    let remaining = sorted;

    while (remaining.length > 0) {
      const { placed, remaining: leftover, remnants } = packPlate(
        remaining,
        plateWidth,
        plateHeight,
        cuttingGap,
        edgeTrimMargin,
      );

      if (placed.length === 0) {
        for (const p of leftover) {
          const canFit =
            (p.width <= plateWidth && p.height <= plateHeight) ||
            (p.height <= plateWidth && p.width <= plateHeight);
          if (!canFit) continue;

          const rotated = p.width > plateWidth || p.height > plateHeight;
          const actualW = rotated ? p.height : p.width;
          const actualH = rotated ? p.width : p.height;
          const usedArea = actualW * actualH;
          const plateArea = plateWidth * plateHeight;

          plates.push({
            numero: plates.length + 1,
            material,
            plateWidth,
            plateHeight,
            pieces: [{ ...p, x: edgeTrimMargin, y: edgeTrimMargin, rotated }],
            utilisation: (usedArea / plateArea) * 100,
            remnants: [],
            hasInterdit: false,
          });
        }
        break;
      }

      const usedArea = placed.reduce((sum, p) => {
        const w = p.rotated ? p.height : p.width;
        const h = p.rotated ? p.width : p.height;
        return sum + w * h;
      }, 0);
      const plateArea = plateWidth * plateHeight;

      plates.push({
        numero: plates.length + 1,
        material,
        plateWidth,
        plateHeight,
        pieces: placed,
        utilisation: (usedArea / plateArea) * 100,
        remnants,
        hasInterdit: remnants.some(r => r.classe === 'interdit'),
      });

      remaining = leftover;
    }

    plates.forEach((p, i) => (p.numero = i + 1));

    const totalUsedArea = plates.reduce(
      (sum, p) => sum + (p.utilisation / 100) * p.plateWidth * p.plateHeight,
      0,
    );
    const totalPlateArea = plates.length * plateWidth * plateHeight;

    results.push({
      material,
      plates,
      totalPlates: plates.length,
      totalPieces: pieces.length,
      tauxUtilisation: totalPlateArea > 0 ? (totalUsedArea / totalPlateArea) * 100 : 0,
    });
  }

  return results;
}
