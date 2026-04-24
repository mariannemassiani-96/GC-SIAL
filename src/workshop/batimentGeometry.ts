// ── Géométrie des bâtiments polygonaux (Rectangle, L, U) ────────────
import type { Batiment } from './types';

export interface Point { x: number; y: number; }

/** Retourne le polygone extérieur du bâtiment selon sa forme */
export function getBatimentPolygon(b: Batiment): Point[] {
  const forme = b.forme ?? 'rectangle';

  if (forme === 'rectangle') {
    return [
      { x: b.x, y: b.y },
      { x: b.x + b.largeur, y: b.y },
      { x: b.x + b.largeur, y: b.y + b.hauteur },
      { x: b.x, y: b.y + b.hauteur },
    ];
  }

  if (forme === 'L') {
    const bx = b.lBrancheX ?? Math.round(b.largeur * 0.6);
    const by = b.lBrancheY ?? Math.round(b.hauteur * 0.6);
    // L = rectangle plein moins le coin haut-droit
    return [
      { x: b.x, y: b.y },
      { x: b.x + bx, y: b.y },
      { x: b.x + bx, y: b.y + (b.hauteur - by) },
      { x: b.x + b.largeur, y: b.y + (b.hauteur - by) },
      { x: b.x + b.largeur, y: b.y + b.hauteur },
      { x: b.x, y: b.y + b.hauteur },
    ];
  }

  if (forme === 'U') {
    const ouv = b.uOuverture ?? Math.round(b.largeur * 0.4);
    const prof = b.uProfondeur ?? Math.round(b.hauteur * 0.5);
    const gapLeft = Math.round((b.largeur - ouv) / 2);
    // U = rectangle avec encoche en haut au centre
    return [
      { x: b.x, y: b.y },
      { x: b.x + gapLeft, y: b.y },
      { x: b.x + gapLeft, y: b.y + prof },
      { x: b.x + gapLeft + ouv, y: b.y + prof },
      { x: b.x + gapLeft + ouv, y: b.y },
      { x: b.x + b.largeur, y: b.y },
      { x: b.x + b.largeur, y: b.y + b.hauteur },
      { x: b.x, y: b.y + b.hauteur },
    ];
  }

  return getBatimentPolygon({ ...b, forme: 'rectangle' });
}

/** Convertit un polygone en path SVG */
export function polygonToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z';
}

/** Calcule la surface intérieure d'un bâtiment (cm²) */
export function getSurfaceBatiment(b: Batiment): number {
  const forme = b.forme ?? 'rectangle';
  const e = b.epaisseurMurs;
  const lInt = b.largeur - 2 * e;
  const hInt = b.hauteur - 2 * e;

  if (forme === 'rectangle') return lInt * hInt;

  if (forme === 'L') {
    const bx = (b.lBrancheX ?? Math.round(b.largeur * 0.6)) - 2 * e;
    const by = (b.lBrancheY ?? Math.round(b.hauteur * 0.6)) - 2 * e;
    const fullRect = lInt * hInt;
    const cutout = (lInt - bx) * (hInt - by);
    return fullRect - cutout;
  }

  if (forme === 'U') {
    const ouv = (b.uOuverture ?? Math.round(b.largeur * 0.4));
    const prof = (b.uProfondeur ?? Math.round(b.hauteur * 0.5));
    const fullRect = lInt * hInt;
    const cutout = Math.max(0, ouv - 2 * e) * Math.max(0, prof - e);
    return fullRect - cutout;
  }

  return lInt * hInt;
}

/** Vérifie si un point est à l'intérieur du polygone bâtiment (ray casting) */
export function isInsideBatiment(px: number, py: number, b: Batiment): boolean {
  const poly = getBatimentPolygon(b);
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}
