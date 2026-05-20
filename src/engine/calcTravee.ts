import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU } from '../constants/parametres';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
import { calcNomenclature } from './calcNomenclature';

/**
 * Calcule le nombre de barreaux par intervalle pour un entraxe donné.
 * ceil garantit espacement ≤ 130mm (NF P01-012).
 */
function calcBarParIntervalle(entraxeEff: number): number {
  if (entraxeEff <= ESPACEMENT_BARREAU) return 0;
  return Math.ceil(entraxeEff / ESPACEMENT_BARREAU) - 1;
}

/**
 * Répartit nbBar barreaux symétriquement dans un intervalle [start, end].
 * L'espacement barreau-barreau = espacement barreau-raidisseur = largeur/(nbBar+1).
 */
function barreauxDansIntervalle(start: number, end: number, nbBar: number): number[] {
  if (nbBar <= 0) return [];
  const largeur = end - start;
  const esp = largeur / (nbBar + 1);
  const positions: number[] = [];
  for (let i = 1; i <= nbBar; i++) {
    positions.push(Math.round((start + i * esp) * 10) / 10);
  }
  return positions;
}

export function calcPositionsUsinages(
  raidPositions: number[],
  longueurLisse: number,
): UsinageLisse {
  const posRaidisseurs = [...raidPositions].sort((a, b) => a - b);

  // For barreau calculation, include lisse edges (0 and longueurLisse) as boundaries
  const boundaries = [0, ...posRaidisseurs, longueurLisse];
  // Deduplicate and sort
  const uniqueBoundaries = [...new Set(boundaries.map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);

  const posBarreaux: number[] = [];
  for (let i = 0; i < uniqueBoundaries.length - 1; i++) {
    const left = uniqueBoundaries[i];
    const right = uniqueBoundaries[i + 1];
    const interval = right - left;
    if (interval < 10) continue;
    const barParInterval = calcBarParIntervalle(interval);
    posBarreaux.push(...barreauxDansIntervalle(left, right, barParInterval));
  }

  // percageLisse = barreaux + positions raidisseurs (sans goupilles ext)
  const allPercage = [...posBarreaux, ...posRaidisseurs];
  const uniquePercage = [...new Set(allPercage.map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);

  return {
    percageLisse: uniquePercage,
    percageLisseRaidisseur: posRaidisseurs,
  };
}

export function calcTravee(travee: Travee, _affaire: Affaire): ResultatTravee {
  // Config is now on the travee itself
  const gc = TYPES_GC[travee.typeGC];
  const mc = TYPES_MC[travee.mc];
  const alertes: Alerte[] = [];

  // 1. Positions raidisseurs — toujours intérieures (jamais à 0 ni à largeur)
  const entraxeMax = ENTRAXE[travee.lieu][travee.angle];

  // N raidisseurs intérieurs, espacés de largeur/(N+1)
  // Chaque intervalle (bord→raid, raid→raid, raid→bord) ≤ entraxeMax
  const nbRaidAuto = Math.max(2, Math.ceil(travee.largeur / entraxeMax));
  const autoStep = travee.largeur / (nbRaidAuto + 1);
  const autoPositions: number[] = [];
  for (let i = 1; i <= nbRaidAuto; i++) {
    autoPositions.push(Math.round(i * autoStep * 10) / 10);
  }

  // Override: raidCentre.positions or raidCentre.nb
  const override = travee.raidCentre;
  const hasForcePos = override?.positions && override.positions.length >= 2;
  const hasForceNb = !hasForcePos && typeof override?.nb === 'number' && override.nb >= 2;

  let posRaidisseurs: number[];
  if (hasForcePos) {
    posRaidisseurs = override!.positions!
      .map(p => Math.round(p * 10) / 10)
      .filter(p => p > 1 && Math.abs(p - travee.largeur) > 1);
  } else if (hasForceNb) {
    const forceNb = override!.nb!;
    const forceStep = travee.largeur / (forceNb + 1);
    posRaidisseurs = [];
    for (let i = 1; i <= forceNb; i++) {
      posRaidisseurs.push(Math.round(i * forceStep * 10) / 10);
    }
  } else {
    posRaidisseurs = autoPositions;
  }

  const nbRaid = posRaidisseurs.length;
  const entraxeEff = nbRaid >= 2
    ? (posRaidisseurs[posRaidisseurs.length - 1] - posRaidisseurs[0]) / (nbRaid - 1)
    : travee.largeur;

  // 2. Débit raidisseur (H + offset from Kawneer doc, or manual override)
  const debitOffsets = mc.debits[travee.pose];
  const debRaid = travee.debRaidForce ?? (travee.hauteur + debitOffsets.raidisseur);

  // 3. Débit barreau (H + offset from Kawneer doc, or manual override)
  const debBarreau = gc.hasBarreaux
    ? (travee.debBarreauForce ?? Math.max(0, travee.hauteur + debitOffsets.barreau))
    : 0;

  // 4. Nombre de barreaux (même nombre par intervalle, espacement ≤ 130mm NF P01-012)
  let nbBarreaux = 0;
  if (gc.hasBarreaux) {
    nbBarreaux = calcBarParIntervalle(entraxeEff) * (nbRaid - 1);
  }

  // 5. Débits profilés filants
  // Déduction 5mm pour bouchon (127143) et patte murale (127150/127152)
  // Pas de déduction pour raccord90 (angle) et raccord_droit (éclisse) car le profilé continue
  const dedG = (travee.fixG === 'raccord90' || travee.fixG === 'raccord_droit') ? 0 : 5;
  const dedD = (travee.fixD === 'raccord90' || travee.fixD === 'raccord_droit') ? 0 : 5;
  const debMC = travee.largeur - dedG - dedD;
  const debLisse = travee.largeur - dedG - dedD;
  const debClosoir = travee.largeur - dedG - dedD;
  const longueurLisse = debLisse;

  // 6. Remplissage
  let hautVitre = 0;
  let largVitre = 0;
  if (gc.hasRemplissage) {
    const deltaH = mc.hauteur >= 48 ? -80 : -112;
    const X = 20;
    const Y = 20;
    hautVitre = Math.max(0, travee.hauteur + deltaH - X - Y);
    largVitre = Math.max(0, entraxeEff - 10);
  }

  // 7. (positions already computed in step 1)

  // 8. Usinages — calculer pour chaque lisse
  const nbLisses =
    gc.hasBarreaux || gc.hasRemplissage
      ? gc.hasLisseInter
        ? 3
        : gc.hasBarreaux
          ? 2
          : 1
      : 0;
  const usinages: UsinageLisse[] = [];
  for (let i = 0; i < nbLisses; i++) {
    usinages.push(calcPositionsUsinages(posRaidisseurs, longueurLisse));
  }

  // 9. Contrôle NF P01-012 : vérifier que tous les espacements ≤ 130mm
  if (gc.hasBarreaux && usinages.length > 0) {
    const posVerticaux = [...usinages[0].percageLisse].sort((a, b) => a - b);

    // Vérifier bord gauche → premier élément
    if (posVerticaux.length > 0 && posVerticaux[0] > ESPACEMENT_BARREAU + 0.5) {
      alertes.push({
        niveau: 'attention',
        message: `Espace bord gauche → 1er élément = ${posVerticaux[0].toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm`,
      });
    }
    // Vérifier dernier élément → bord droit
    if (posVerticaux.length > 0) {
      const gapDroit = longueurLisse - posVerticaux[posVerticaux.length - 1];
      if (gapDroit > ESPACEMENT_BARREAU + 0.5) {
        alertes.push({
          niveau: 'attention',
          message: `Espace dernier élément → bord droit = ${gapDroit.toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm`,
        });
      }
    }
    // Vérifier entre chaque paire d'éléments consécutifs
    for (let i = 1; i < posVerticaux.length; i++) {
      const gap = posVerticaux[i] - posVerticaux[i - 1];
      if (gap > ESPACEMENT_BARREAU + 0.5) {
        alertes.push({
          niveau: 'bloquant',
          message: `Espacement ${posVerticaux[i - 1].toFixed(1)}→${posVerticaux[i].toFixed(1)}mm = ${gap.toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm (NF P01-012)`,
        });
      }
    }
  }

  // 10. Alertes
  if (travee.hauteur < 1000) {
    alertes.push({ niveau: 'bloquant', message: `Hauteur ${travee.hauteur}mm < 1000mm minimum` });
  }
  if (gc.hMax && travee.hauteur > gc.hMax) {
    alertes.push({
      niveau: 'bloquant',
      message: `Hauteur ${travee.hauteur}mm > ${gc.hMax}mm max pour ${gc.label}`,
    });
  }
  if (travee.rampant) {
    alertes.push({ niveau: 'info', message: 'GC rampant — vérifier l\'angle de coupe' });
  }

  // 11. Nomenclature
  const calcResult = {
    nbRaid,
    entraxeEff,
    debRaid,
    h1: debRaid - 20 - mc.hauteur,
    debBarreau,
    nbBarreaux,
    debMC,
    debLisse,
    debClosoir,
    longueurLisse,
    hautVitre,
    largVitre,
  };
  const nomenclature = calcNomenclature(travee, calcResult);

  return {
    travee,
    ...calcResult,
    nomenclature,
    usinages,
    posRaidisseurs,
    alertes,
  };
}
