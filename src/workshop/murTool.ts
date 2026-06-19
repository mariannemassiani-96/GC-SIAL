// ── Outil de dessin de murs/cloisons ─────────────────────────────────
import { v4 as uuidv4 } from 'uuid';
import type { MurDessine, TypeMur, NiveauId } from './types';
import { DEFAULTS_MUR as DEFS } from './types';

export function createMur(type: TypeMur, niveau: NiveauId, x1: number, y1: number, x2: number, y2: number): MurDessine {
  const def = DEFS[type];
  const index = Date.now() % 1000;
  return {
    id: uuidv4(),
    type,
    niveau,
    x1, y1, x2, y2,
    epaisseur: def.epaisseur,
    couleur: def.couleur,
    nom: `${def.label} ${index}`,
  };
}

/** Longueur du mur en cm */
export function longueurMur(m: MurDessine): number {
  const dx = m.x2 - m.x1;
  const dy = m.y2 - m.y1;
  return Math.round(Math.sqrt(dx * dx + dy * dy));
}

/** Angle du mur en degrés */
export function angleMur(m: MurDessine): number {
  return Math.atan2(m.y2 - m.y1, m.x2 - m.x1) * 180 / Math.PI;
}

/** Snap à 0/45/90/135/180 si on est proche (< 5 degrés) */
export function snapAngle(x1: number, y1: number, x2: number, y2: number, tolerance = 5): { x: number; y: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * 180 / Math.PI;
  const length = Math.sqrt(dx * dx + dy * dy);

  const snapAngles = [0, 45, 90, 135, 180, -45, -90, -135, -180];
  for (const sa of snapAngles) {
    if (Math.abs(angle - sa) < tolerance) {
      const rad = sa * Math.PI / 180;
      return {
        x: Math.round(x1 + Math.cos(rad) * length),
        y: Math.round(y1 + Math.sin(rad) * length),
      };
    }
  }
  return { x: x2, y: y2 };
}

/** Polygone du mur pour rendu SVG (rectangle orienté) */
export function murToPolygon(m: MurDessine): string {
  const dx = m.x2 - m.x1;
  const dy = m.y2 - m.y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return '';

  // Vecteur perpendiculaire normalisé × épaisseur/2
  const nx = (-dy / len) * (m.epaisseur / 2);
  const ny = (dx / len) * (m.epaisseur / 2);

  const p1x = m.x1 + nx, p1y = m.y1 + ny;
  const p2x = m.x2 + nx, p2y = m.y2 + ny;
  const p3x = m.x2 - nx, p3y = m.y2 - ny;
  const p4x = m.x1 - nx, p4y = m.y1 - ny;

  return `${p1x},${p1y} ${p2x},${p2y} ${p3x},${p3y} ${p4x},${p4y}`;
}

/** Point le plus proche d'un clic sur un mur (pour sélection) */
export function distanceToMur(px: number, py: number, m: MurDessine): number {
  const dx = m.x2 - m.x1;
  const dy = m.y2 - m.y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1) return Math.sqrt((px - m.x1) ** 2 + (py - m.y1) ** 2);

  let t = ((px - m.x1) * dx + (py - m.y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closestX = m.x1 + t * dx;
  const closestY = m.y1 + t * dy;
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

/** Vérifie si un clic est sur une extrémité (pour drag) */
export function getEndpointHit(px: number, py: number, m: MurDessine, tolerance = 15): 'start' | 'end' | null {
  const d1 = Math.sqrt((px - m.x1) ** 2 + (py - m.y1) ** 2);
  const d2 = Math.sqrt((px - m.x2) ** 2 + (py - m.y2) ** 2);
  if (d1 < tolerance) return 'start';
  if (d2 < tolerance) return 'end';
  return null;
}
