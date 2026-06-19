// ── Parseur DXF simplifié pour import de plans atelier ───────────────
// Lit les entités LINE et CIRCLE d'un fichier DXF (format ASCII)
// et les convertit en objets Plan Atelier (murs, poteaux).

import { v4 as uuidv4 } from 'uuid';
import type { Objet, NiveauId } from './types';

interface DxfLine {
  x1: number; y1: number;
  x2: number; y2: number;
  layer: string;
}

interface DxfCircle {
  cx: number; cy: number;
  radius: number;
  layer: string;
}

interface DxfParseResult {
  lines: DxfLine[];
  circles: DxfCircle[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  layers: string[];
}

// ── Parser DXF ASCII ─────────────────────────────────────────────────

export function parseDxf(content: string): DxfParseResult {
  const lines: DxfLine[] = [];
  const circles: DxfCircle[] = [];
  const layersSet = new Set<string>();

  // DXF est un format par paires : code (entier) + valeur (string)
  const rawLines = content.split(/\r?\n/);
  const pairs: { code: number; value: string }[] = [];
  for (let i = 0; i < rawLines.length - 1; i += 2) {
    const code = parseInt(rawLines[i].trim(), 10);
    const value = rawLines[i + 1]?.trim() ?? '';
    if (!isNaN(code)) pairs.push({ code, value });
  }

  let inEntities = false;
  let currentEntity = '';
  let entityData: Record<number, string> = {};

  const flushEntity = () => {
    const layer = entityData[8] ?? '0';
    layersSet.add(layer);

    if (currentEntity === 'LINE') {
      const x1 = parseFloat(entityData[10] ?? '0');
      const y1 = parseFloat(entityData[20] ?? '0');
      const x2 = parseFloat(entityData[11] ?? '0');
      const y2 = parseFloat(entityData[21] ?? '0');
      lines.push({ x1, y1, x2, y2, layer });
    }

    if (currentEntity === 'CIRCLE') {
      const cx = parseFloat(entityData[10] ?? '0');
      const cy = parseFloat(entityData[20] ?? '0');
      const radius = parseFloat(entityData[40] ?? '0');
      circles.push({ cx, cy, radius, layer });
    }

    currentEntity = '';
    entityData = {};
  };

  for (const { code, value } of pairs) {
    if (code === 2 && value === 'ENTITIES') {
      inEntities = true;
      continue;
    }
    if (code === 0 && value === 'ENDSEC') {
      if (currentEntity) flushEntity();
      inEntities = false;
      continue;
    }

    if (!inEntities) continue;

    if (code === 0) {
      if (currentEntity) flushEntity();
      currentEntity = value;
      entityData = {};
    } else {
      entityData[code] = value;
    }
  }
  if (currentEntity) flushEntity();

  // Bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const l of lines) {
    minX = Math.min(minX, l.x1, l.x2);
    minY = Math.min(minY, l.y1, l.y2);
    maxX = Math.max(maxX, l.x1, l.x2);
    maxY = Math.max(maxY, l.y1, l.y2);
  }
  for (const c of circles) {
    minX = Math.min(minX, c.cx - c.radius);
    minY = Math.min(minY, c.cy - c.radius);
    maxX = Math.max(maxX, c.cx + c.radius);
    maxY = Math.max(maxY, c.cy + c.radius);
  }

  if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 1000; maxY = 1000; }

  return {
    lines,
    circles,
    bounds: { minX, minY, maxX, maxY },
    layers: [...layersSet].sort(),
  };
}

// ── Conversion DXF → Objets Atelier ──────────────────────────────────

export interface DxfImportOptions {
  echelle: number;         // ex: 1 unité DXF = X cm (par défaut 100 = 1m → 100cm)
  epaisseurMur: number;    // cm (défaut 20)
  offsetX: number;         // décalage X dans le plan (cm)
  offsetY: number;
  niveau: NiveauId;
  layersMurs: string[];    // layers à traiter comme murs
  layersPoteaux: string[]; // layers à traiter comme poteaux
  invertY: boolean;        // DXF a Y vers le haut, SVG vers le bas
}

export const DEFAULT_IMPORT_OPTIONS: DxfImportOptions = {
  echelle: 100,
  epaisseurMur: 20,
  offsetX: 100,
  offsetY: 100,
  niveau: 'rdc',
  layersMurs: [],
  layersPoteaux: [],
  invertY: true,
};

export function dxfToObjets(parsed: DxfParseResult, options: DxfImportOptions): Objet[] {
  const { echelle, epaisseurMur, offsetX, offsetY, niveau, layersMurs, layersPoteaux, invertY } = options;
  const objets: Objet[] = [];
  const { bounds } = parsed;

  const toX = (v: number) => Math.round((v - bounds.minX) * echelle + offsetX);
  const toY = (v: number) => {
    if (invertY) return Math.round((bounds.maxY - v) * echelle + offsetY);
    return Math.round((v - bounds.minY) * echelle + offsetY);
  };

  const isMurLayer = (layer: string) => layersMurs.length === 0 || layersMurs.includes(layer);
  const isPoteauLayer = (layer: string) => layersPoteaux.length === 0 || layersPoteaux.includes(layer);

  // Lignes → Murs
  let murIndex = 1;
  for (const line of parsed.lines) {
    if (!isMurLayer(line.layer)) continue;

    const x1 = toX(line.x1), y1 = toY(line.y1);
    const x2 = toX(line.x2), y2 = toY(line.y2);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.round(Math.sqrt(dx * dx + dy * dy));

    if (length < 10) continue; // Ignorer les lignes trop courtes

    const isHorizontal = Math.abs(dy) < Math.abs(dx) * 0.15;
    const isVertical = Math.abs(dx) < Math.abs(dy) * 0.15;

    if (isHorizontal) {
      const minXp = Math.min(x1, x2);
      const midY = Math.round((y1 + y2) / 2) - Math.round(epaisseurMur / 2);
      objets.push({
        id: uuidv4(), type: 'mur', nom: `Mur ${murIndex++}`, niveau,
        x: minXp, y: midY, largeur: length, hauteur: epaisseurMur,
        rotation: 0, couleur: '#64748b', operateurs: [],
      });
    } else if (isVertical) {
      const minYp = Math.min(y1, y2);
      const midX = Math.round((x1 + x2) / 2) - Math.round(epaisseurMur / 2);
      objets.push({
        id: uuidv4(), type: 'mur', nom: `Mur ${murIndex++}`, niveau,
        x: midX, y: minYp, largeur: epaisseurMur, hauteur: length,
        rotation: 0, couleur: '#64748b', operateurs: [],
      });
    } else {
      // Mur en diagonal — on le met horizontal et on note l'angle
      const minXp = Math.min(x1, x2);
      const minYp = Math.min(y1, y2);
      objets.push({
        id: uuidv4(), type: 'mur', nom: `Mur diag ${murIndex++}`, niveau,
        x: minXp, y: minYp, largeur: length, hauteur: epaisseurMur,
        rotation: 0, couleur: '#64748b', operateurs: [],
        notes: `Diagonal original — angle a ajuster manuellement`,
      });
    }
  }

  // Cercles → Poteaux (colonnes)
  let poteauIndex = 1;
  for (const circle of parsed.circles) {
    if (!isPoteauLayer(circle.layer)) continue;

    const cx = toX(circle.cx);
    const cy = toY(circle.cy);
    const diametre = Math.round(circle.radius * 2 * echelle);
    const taille = Math.max(diametre, 20); // minimum 20cm

    objets.push({
      id: uuidv4(), type: 'colonne', nom: `Poteau ${poteauIndex++}`, niveau,
      x: cx - Math.round(taille / 2), y: cy - Math.round(taille / 2),
      largeur: taille, hauteur: taille,
      rotation: 0, couleur: '#94a3b8', operateurs: [],
    });
  }

  return objets;
}
