import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU } from '../constants/parametres';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
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
  _longueurLisse: number,
  nbRaid: number,
  entraxeEff: number
): UsinageLisse {
  // Positions des raidisseurs (mm depuis bord gauche)
  const posRaidisseurs: number[] = [];
  for (let i = 0; i < nbRaid; i++) {
    posRaidisseurs.push(Math.round(i * entraxeEff * 10) / 10);
  }

  // Barreaux : même nombre dans chaque intervalle, répartis symétriquement
  // Le nombre est calculé une seule fois sur l'entraxe pour garantir l'uniformité
  const barParInterval = calcBarParIntervalle(entraxeEff);
  const posBarreaux: number[] = [];
  for (let i = 0; i < nbRaid - 1; i++) {
    posBarreaux.push(...barreauxDansIntervalle(posRaidisseurs[i], posRaidisseurs[i + 1], barParInterval));
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
  const pose = POSE_DATA[travee.pose];
  const alertes: Alerte[] = [];

  // 1. Nombre de raidisseurs
  // Aux angles 45° (L/U), pas de raidisseur à la jonction — c'est le raccord 90° (110962)
  const hasAngleG = travee.coupeG === '45';
  const hasAngleD = travee.coupeD === '45';
  const entraxeMax = ENTRAXE[travee.lieu][travee.angle];
  let nbRaid: number;
  let entraxeEff: number;
  const hasForceNb = travee.nbRaidForce !== undefined && travee.nbRaidForce >= 2;
  if (hasForceNb) {
    nbRaid = travee.nbRaidForce!;
    entraxeEff = travee.largeur / (nbRaid + (hasAngleG ? 1 : 0) + (hasAngleD ? 1 : 0) - 1);
  } else {
    // Nombre total de divisions sur la largeur
    const nbDivisions = Math.ceil(travee.largeur / entraxeMax);
    // Nombre de raidisseurs = points - ceux aux angles
    nbRaid = nbDivisions + 1 - (hasAngleG ? 1 : 0) - (hasAngleD ? 1 : 0);
    nbRaid = Math.max(nbRaid, hasAngleG || hasAngleD ? 1 : 2);
    entraxeEff = travee.largeur / nbDivisions;
  }

  // 2. Débit raidisseur
  const debRaid = travee.hauteur + pose.offsets[mc.raidKey];

  // 3. h1 et débit barreau
  const h1 = debRaid - 20 - mc.hauteur;
  const debBarreau = gc.hasBarreaux ? Math.max(0, h1 + mc.barreauDelta) : 0;

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
    const deltaH = mc.raidKey === 'std' ? -112 : -80;
    const X = 20;
    const Y = 20;
    hautVitre = Math.max(0, travee.hauteur + deltaH - X - Y);
    largVitre = Math.max(0, entraxeEff - 10);
  }

  // 7. Positions raidisseurs (mm depuis bord gauche de la lisse)
  // Skip positions at angle junctions (0 if angleG, largeur if angleD)
  let posRaidisseurs: number[];
  const hasForcePos = travee.posRaidForce && travee.posRaidForce.length >= 2;
  if (hasForcePos) {
    posRaidisseurs = travee.posRaidForce!.map(p => Math.round(p * 10) / 10);
  } else {
    const nbDivisions = Math.ceil(travee.largeur / entraxeMax);
    const allPositions: number[] = [];
    for (let i = 0; i <= nbDivisions; i++) {
      allPositions.push(Math.round(i * entraxeEff * 10) / 10);
    }
    // Remove positions at angle junctions
    posRaidisseurs = allPositions.filter(p => {
      if (hasAngleG && p < 1) return false;
      if (hasAngleD && Math.abs(p - travee.largeur) < 1) return false;
      return true;
    });
  }

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
    usinages.push(calcPositionsUsinages(longueurLisse, nbRaid, entraxeEff));
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
    h1,
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
