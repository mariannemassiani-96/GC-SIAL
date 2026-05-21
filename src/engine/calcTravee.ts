import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU, MIN_BORD_BARREAU } from '../constants/parametres';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
import { calcNomenclature } from './calcNomenclature';

/**
 * Grille canonique : offset symétrique ∈ [MIN_BORD, ESPACEMENT] puis 130mm fixe.
 * Le bord fait toujours ≤ 130mm — on « saute un trou » pour ça.
 * forcedBordG/D : forcer l'offset d'un côté (alignement raccord 90°).
 */
function computeGridPositions(
  longueurLisse: number,
  forcedBordG?: number,
  forcedBordD?: number,
): number[] {
  const E = ESPACEMENT_BARREAU;

  if (forcedBordG !== undefined) {
    const positions: number[] = [];
    let pos = forcedBordG;
    while (pos <= longueurLisse - MIN_BORD_BARREAU + 0.05) {
      positions.push(Math.round(pos * 10) / 10);
      pos += E;
    }
    return positions;
  }

  if (forcedBordD !== undefined) {
    const positions: number[] = [];
    let pos = longueurLisse - forcedBordD;
    while (pos >= MIN_BORD_BARREAU - 0.05) {
      positions.unshift(Math.round(pos * 10) / 10);
      pos -= E;
    }
    return positions;
  }

  const intervals = Math.floor((longueurLisse - 2 * MIN_BORD_BARREAU) / E);
  if (intervals < 0) return [];
  const count = intervals + 1;
  const offset = Math.round((longueurLisse - intervals * E) / 2 * 10) / 10;
  const positions: number[] = [];
  for (let i = 0; i < count; i++) {
    positions.push(Math.round((offset + i * E) * 10) / 10);
  }
  return positions;
}

function snapToGrid(positions: number[], grid: number[]): number[] {
  if (grid.length === 0) return [];
  const snapped = positions.map(p => {
    let best = grid[0];
    for (const gp of grid) {
      if (Math.abs(gp - p) < Math.abs(best - p)) best = gp;
    }
    return best;
  });
  return [...new Set(snapped)].sort((a, b) => a - b);
}

function calcGrille(longueurLisse: number, entraxeMax: number, forcedBordG?: number, forcedBordD?: number) {
  const E = ESPACEMENT_BARREAU;
  const gridPositions = computeGridPositions(longueurLisse, forcedBordG, forcedBordD);
  const count = gridPositions.length;

  if (count === 0) {
    return { raidPositions: [], barreauPositions: [], allPositions: [], entraxeRaid: 0 };
  }

  // 1 raidisseur si la lisse est courte
  if (longueurLisse <= 2 * entraxeMax) {
    const center = longueurLisse / 2;
    let bestIdx = 0;
    for (let i = 1; i < count; i++) {
      if (Math.abs(gridPositions[i] - center) < Math.abs(gridPositions[bestIdx] - center)) bestIdx = i;
    }
    return {
      raidPositions: [gridPositions[bestIdx]],
      barreauPositions: gridPositions.filter((_, i) => i !== bestIdx),
      allPositions: gridPositions,
      entraxeRaid: 0,
    };
  }

  // Plusieurs raidisseurs : chercher K (nb intervalles 130mm entre raids)
  const K_max = Math.floor(entraxeMax / E);
  for (let nbRaid = 2; nbRaid <= 50; nbRaid++) {
    for (let K = K_max; K >= 1; K--) {
      const raidSpan = (nbRaid - 1) * K;
      if (raidSpan >= count) continue;
      const startIdx = Math.round((count - 1 - raidSpan) / 2);
      if (startIdx < 0) continue;
      const endIdx = startIdx + raidSpan;
      if (endIdx >= count) continue;
      if (gridPositions[startIdx] > entraxeMax) continue;
      if (longueurLisse - gridPositions[endIdx] > entraxeMax) continue;

      const raidPositions: number[] = [];
      for (let r = 0; r < nbRaid; r++) {
        raidPositions.push(gridPositions[startIdx + r * K]);
      }
      return {
        raidPositions,
        barreauPositions: gridPositions.filter(p => !raidPositions.some(rp => Math.abs(rp - p) < 1)),
        allPositions: gridPositions,
        entraxeRaid: K * E,
      };
    }
  }

  const center = longueurLisse / 2;
  let bestIdx = 0;
  for (let i = 1; i < count; i++) {
    if (Math.abs(gridPositions[i] - center) < Math.abs(gridPositions[bestIdx] - center)) bestIdx = i;
  }
  return {
    raidPositions: [gridPositions[bestIdx]],
    barreauPositions: gridPositions.filter((_, i) => i !== bestIdx),
    allPositions: gridPositions,
    entraxeRaid: 0,
  };
}

export function calcPositionsUsinages(
  raidPositions: number[],
  longueurLisse: number,
  forcedBordG?: number,
  forcedBordD?: number,
): UsinageLisse {
  const gridPositions = computeGridPositions(longueurLisse, forcedBordG, forcedBordD);
  const finalRaid = raidPositions.length > 0
    ? snapToGrid(raidPositions, gridPositions)
    : [];

  return {
    percageLisse: gridPositions,
    percageLisseRaidisseur: finalRaid,
  };
}

export function calcTravee(
  travee: Travee,
  _affaire: Affaire,
  gridConstraint?: { forcedBordG?: number; forcedBordD?: number },
): ResultatTravee {
  const gc = TYPES_GC[travee.typeGC];
  const mc = TYPES_MC[travee.mc];
  const alertes: Alerte[] = [];

  // 1. Débits profilés filants
  const dedG = (travee.fixG === 'raccord90' || travee.fixG === 'raccord_droit') ? 0 : 5;
  const dedD = (travee.fixD === 'raccord90' || travee.fixD === 'raccord_droit') ? 0 : 5;
  const debMC = travee.largeur - dedG - dedD;
  const debLisse = travee.largeur - dedG - dedD;
  const debClosoir = travee.largeur - dedG - dedD;
  const longueurLisse = debLisse;

  // 2. Raidisseurs — grille uniforme 130mm, raidisseur = trou spécial
  const entraxeMax = ENTRAXE[travee.lieu][travee.angle];
  const override = travee.raidCentre;
  const hasForcePos = Array.isArray(override?.positions);
  const hasForceNb = !hasForcePos && typeof override?.nb === 'number' && override.nb >= 1;

  let posRaidisseurs: number[];

  const { forcedBordG, forcedBordD } = gridConstraint ?? {};
  const canonicalGrid = computeGridPositions(longueurLisse, forcedBordG, forcedBordD);

  if (hasForcePos) {
    const raw = override!.positions!
      .map(p => Math.round(p * 10) / 10)
      .filter(p => p > 1 && Math.abs(p - travee.largeur) > 1);
    posRaidisseurs = snapToGrid(raw, canonicalGrid);
  } else if (hasForceNb) {
    const grille = calcGrille(longueurLisse, entraxeMax, forcedBordG, forcedBordD);
    const desired = override!.nb!;
    if (desired >= grille.allPositions.length) {
      posRaidisseurs = grille.allPositions;
    } else {
      const step = (grille.allPositions.length - 1) / (desired - 1);
      posRaidisseurs = [];
      for (let i = 0; i < desired; i++) {
        posRaidisseurs.push(grille.allPositions[Math.round(i * step)]);
      }
    }
  } else {
    const grille = calcGrille(longueurLisse, entraxeMax, forcedBordG, forcedBordD);
    posRaidisseurs = grille.raidPositions;
  }

  const nbRaid = posRaidisseurs.length;
  const entraxeEff = nbRaid >= 2
    ? (posRaidisseurs[posRaidisseurs.length - 1] - posRaidisseurs[0]) / (nbRaid - 1)
    : travee.largeur;

  // 3. Débit raidisseur
  const debitOffsets = mc.debits[travee.pose];
  const debRaid = travee.debRaidForce ?? (travee.hauteur + debitOffsets.raidisseur);

  // 4. Débit barreau = raidisseur - 115mm (toujours)
  const debBarreau = gc.hasBarreaux
    ? (travee.debBarreauForce ?? Math.max(0, debRaid - 115))
    : 0;

  // 5. Nombre de barreaux — tous les trous de la grille sauf les raidisseurs
  let nbBarreaux = 0;
  if (gc.hasBarreaux) {
    const usinageTest = calcPositionsUsinages(posRaidisseurs, longueurLisse, forcedBordG, forcedBordD);
    nbBarreaux = usinageTest.percageLisse.length - usinageTest.percageLisseRaidisseur.length;
  }

  // 6. Remplissage
  let hautVitre = 0;
  let largVitre = 0;
  if (gc.hasRemplissage) {
    const deltaH = mc.hauteur >= 48 ? -80 : -112;
    hautVitre = Math.max(0, travee.hauteur + deltaH - 40);
    largVitre = Math.max(0, entraxeEff - 10);
  }

  // 7. Usinages — calculer pour chaque lisse
  const nbLisses =
    gc.hasBarreaux || gc.hasRemplissage
      ? gc.hasLisseInter ? 3 : gc.hasBarreaux ? 2 : 1
      : 0;
  const usinages: UsinageLisse[] = [];
  for (let i = 0; i < nbLisses; i++) {
    usinages.push(calcPositionsUsinages(posRaidisseurs, longueurLisse, forcedBordG, forcedBordD));
  }

  // 8. Contrôle NF P01-012 — espacement entre éléments verticaux consécutifs
  if (gc.hasBarreaux && usinages.length > 0) {
    const posVerticaux = [...usinages[0].percageLisse].sort((a, b) => a - b);
    for (let i = 1; i < posVerticaux.length; i++) {
      const gap = posVerticaux[i] - posVerticaux[i - 1];
      if (gap > ESPACEMENT_BARREAU + 0.5) {
        alertes.push({ niveau: 'bloquant', message: `Espacement ${posVerticaux[i - 1].toFixed(1)}→${posVerticaux[i].toFixed(1)}mm = ${gap.toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm (NF P01-012)` });
      }
    }
  }

  // 9. Alertes
  if (travee.hauteur < 1000) {
    alertes.push({ niveau: 'bloquant', message: `Hauteur ${travee.hauteur}mm < 1000mm minimum` });
  }
  if (gc.hMax && travee.hauteur > gc.hMax) {
    alertes.push({ niveau: 'bloquant', message: `Hauteur ${travee.hauteur}mm > ${gc.hMax}mm max pour ${gc.label}` });
  }
  if (travee.rampant) {
    alertes.push({ niveau: 'info', message: 'GC rampant — vérifier l\'angle de coupe' });
  }

  // 10. Nomenclature
  const calcResult = {
    nbRaid, entraxeEff, debRaid,
    h1: debRaid - 20 - mc.hauteur,
    debBarreau, nbBarreaux,
    debMC, debLisse, debClosoir, longueurLisse,
    hautVitre, largVitre,
  };
  const nomenclature = calcNomenclature(travee, calcResult);

  return {
    travee, ...calcResult,
    nomenclature, usinages, posRaidisseurs, alertes,
  };
}
