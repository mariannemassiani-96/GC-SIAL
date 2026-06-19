// ── Projection isométrique pour vue 3D ───────────────────────────────
// Convertit les coordonnées 2D (x, y en cm) + hauteur Z en
// coordonnées SVG isométriques.

import type { Objet, Batiment } from './types';

const ISO_ANGLE = Math.PI / 6; // 30 degrés
const COS_A = Math.cos(ISO_ANGLE);
const SIN_A = Math.sin(ISO_ANGLE);

export interface IsoPoint {
  x: number;
  y: number;
}

/** Projette un point 3D (cm) en coordonnées isométriques SVG */
export function isoProject(x: number, y: number, z: number, scale: number = 0.15): IsoPoint {
  return {
    x: (x - y) * COS_A * scale,
    y: (x + y) * SIN_A * scale - z * scale,
  };
}

/** Hauteur par défaut d'un objet selon son type (cm) */
export function getDefaultHeight(o: Objet): number {
  if (o.hauteurObjet) return o.hauteurObjet;
  const defaults: Record<string, number> = {
    machine: 200, poste: 90, convoyeur: 80, stock: 150,
    stock_tampon: 120, mur: 350, porte: 210, fenetre: 120,
    colonne: 400, bureau: 75, armoire: 200, salle: 300,
    equipement: 150, parking: 0, vehicule: 180, exterieur: 0, piece: 250,
  };
  return defaults[o.type] ?? 150;
}

/** Génère le polygone 3D d'un objet (boîte isométrique) */
export function isoBox(
  x: number, y: number, w: number, d: number, h: number, z: number, scale: number
): { top: IsoPoint[]; left: IsoPoint[]; right: IsoPoint[]; front: IsoPoint[] } {
  // 8 sommets de la boîte
  const p000 = isoProject(x, y, z, scale);
  const p100 = isoProject(x + w, y, z, scale);
  const p010 = isoProject(x, y + d, z, scale);
  const p110 = isoProject(x + w, y + d, z, scale);
  const p001 = isoProject(x, y, z + h, scale);
  const p101 = isoProject(x + w, y, z + h, scale);
  const p011 = isoProject(x, y + d, z + h, scale);
  const p111 = isoProject(x + w, y + d, z + h, scale);

  return {
    top: [p001, p101, p111, p011],
    left: [p000, p010, p011, p001],
    right: [p100, p110, p111, p101],
    front: [p010, p110, p111, p011],
  };
}

/** Convertit des IsoPoints en attribut SVG points */
export function isoPointsToSvg(pts: IsoPoint[]): string {
  return pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

function normalizeHex(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return '808080';
  return h;
}

/** Assombrit une couleur hex */
export function darken(hex: string, factor: number): string {
  const h = normalizeHex(hex);
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - factor));
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - factor));
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - factor));
  return `rgb(${r},${g},${b})`;
}

/** Éclaircit une couleur hex */
export function lighten(hex: string, factor: number): string {
  const h = normalizeHex(hex);
  const r = Math.min(255, Math.round(parseInt(h.slice(0, 2), 16) * (1 + factor)));
  const g = Math.min(255, Math.round(parseInt(h.slice(2, 4), 16) * (1 + factor)));
  const b = Math.min(255, Math.round(parseInt(h.slice(4, 6), 16) * (1 + factor)));
  return `rgb(${r},${g},${b})`;
}

/** Tri des objets pour le rendu isométrique (arrière → avant) */
export function isoSort(objets: Objet[]): Objet[] {
  return [...objets].sort((a, b) => {
    const za = a.positionZ ?? 0;
    const zb = b.positionZ ?? 0;
    if (za !== zb) return za - zb;
    return (a.x + a.y) - (b.x + b.y);
  });
}

/** Génère le sol isométrique du bâtiment */
export function isoFloor(bat: Batiment, scale: number): IsoPoint[] {
  const p1 = isoProject(bat.x, bat.y, 0, scale);
  const p2 = isoProject(bat.x + bat.largeur, bat.y, 0, scale);
  const p3 = isoProject(bat.x + bat.largeur, bat.y + bat.hauteur, 0, scale);
  const p4 = isoProject(bat.x, bat.y + bat.hauteur, 0, scale);
  return [p1, p2, p3, p4];
}

/** Génère les murs extérieurs du bâtiment en 3D */
export function isoBatimentWalls(bat: Batiment, hauteur: number, scale: number): { points: string; fill: string }[] {
  const walls: { points: string; fill: string }[] = [];
  const e = bat.epaisseurMurs;
  const h = hauteur;

  // Mur arrière (haut)
  const backBox = isoBox(bat.x, bat.y, bat.largeur, e, h, 0, scale);
  walls.push({ points: isoPointsToSvg(backBox.top), fill: '#374151' });

  // Mur gauche
  const leftBox = isoBox(bat.x, bat.y, e, bat.hauteur, h, 0, scale);
  walls.push({ points: isoPointsToSvg(leftBox.left), fill: '#4b5563' });

  // Mur droit
  const rightBox = isoBox(bat.x + bat.largeur - e, bat.y, e, bat.hauteur, h, 0, scale);
  walls.push({ points: isoPointsToSvg(rightBox.right), fill: '#374151' });

  // Mur avant (bas)
  const frontBox = isoBox(bat.x, bat.y + bat.hauteur - e, bat.largeur, e, h, 0, scale);
  walls.push({ points: isoPointsToSvg(frontBox.front), fill: '#4b5563' });

  return walls;
}
