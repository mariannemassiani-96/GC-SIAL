import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU, MIN_BORD_BARREAU } from '../constants/parametres';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
import { calcNomenclature } from './calcNomenclature';

/**
 * Calcule une grille uniforme de trous sur la lisse.
 * Tous les trous sont espacés de exactement ESPACEMENT_BARREAU (130mm).
 * Les raidisseurs tombent sur des trous de la grille (chaque K trous).
 * Seul l'écart bord↔premier trou varie.
 */
function calcGrille(longueurLisse: number, entraxeMax: number) {
  const E = ESPACEMENT_BARREAU;
  const K_max = Math.floor(entraxeMax / E);

  // 1 raidisseur suffit si le bord↔raidisseur ≤ entraxeMax (longueur ≤ 2×entraxeMax)
  if (longueurLisse <= 2 * entraxeMax) {
    const offset = Math.round(longueurLisse / 2 * 10) / 10;
    if (offset >= MIN_BORD_BARREAU) {
      return buildGrid(longueurLisse, 1, 1, offset);
    }
  }

  // Sinon, chercher nbRaid ≥ 2 avec K intervalles de 130mm entre raidisseurs
  let nbRaid = 2;
  let K = K_max;
  while (nbRaid <= 50) {
    while (K >= 1) {
      const span = (nbRaid - 1) * K * E;
      const offset = (longueurLisse - span) / 2;
      if (offset >= MIN_BORD_BARREAU && offset <= entraxeMax) {
        return buildGrid(longueurLisse, nbRaid, K, offset);
      }
      K--;
    }
    nbRaid++;
    K = K_max;
  }

  return buildGrid(longueurLisse, 1, 1, longueurLisse / 2);
}

function buildGrid(longueurLisse: number, nbRaid: number, K: number, offset: number) {
  const E = ESPACEMENT_BARREAU;
  const firstRaid = Math.round(offset * 10) / 10;

  // Positions raidisseurs (sur la grille, chaque K trous)
  const raidPositions: number[] = [];
  for (let r = 0; r < nbRaid; r++) {
    raidPositions.push(Math.round((firstRaid + r * K * E) * 10) / 10);
  }

  // Grille complète : depuis le premier raidisseur, étendre à gauche et à droite par pas de 130mm
  const allPositions = new Set<number>();
  for (const rp of raidPositions) allPositions.add(rp);

  // Vers la droite depuis le premier raidisseur
  for (let pos = firstRaid + E; pos <= longueurLisse - MIN_BORD_BARREAU + 0.5; pos += E) {
    allPositions.add(Math.round(pos * 10) / 10);
  }
  // Vers la gauche depuis le premier raidisseur
  for (let pos = firstRaid - E; pos >= MIN_BORD_BARREAU - 0.5; pos -= E) {
    allPositions.add(Math.round(pos * 10) / 10);
  }

  const sortedAll = [...allPositions].sort((a, b) => a - b);
  const barreauPositions = sortedAll.filter(p => !raidPositions.some(r => Math.abs(r - p) < 1));

  return {
    raidPositions,
    barreauPositions,
    allPositions: sortedAll,
    entraxeRaid: K * E,
  };
}

export function calcPositionsUsinages(
  raidPositions: number[],
  longueurLisse: number,
): UsinageLisse {
  const entraxeMax = 1560; // fallback, the real value comes from calcTravee
  const grille = calcGrille(longueurLisse, entraxeMax);

  // Si des positions raidisseurs sont fournies explicitement, on les utilise
  const finalRaid = raidPositions.length >= 2 ? [...raidPositions].sort((a, b) => a - b) : grille.raidPositions;

  // Recalculer la grille complète basée sur les raidisseurs réels
  const allPositions = new Set<number>();
  for (const rp of finalRaid) allPositions.add(Math.round(rp * 10) / 10);

  // Étendre la grille à 130mm depuis chaque raidisseur
  for (const rp of finalRaid) {
    for (let pos = rp + ESPACEMENT_BARREAU; pos <= longueurLisse - MIN_BORD_BARREAU + 0.5; pos += ESPACEMENT_BARREAU) {
      allPositions.add(Math.round(pos * 10) / 10);
    }
    for (let pos = rp - ESPACEMENT_BARREAU; pos >= MIN_BORD_BARREAU - 0.5; pos -= ESPACEMENT_BARREAU) {
      allPositions.add(Math.round(pos * 10) / 10);
    }
  }

  const sortedAll = [...allPositions].sort((a, b) => a - b);

  return {
    percageLisse: sortedAll,
    percageLisseRaidisseur: finalRaid,
  };
}

export function calcTravee(travee: Travee, _affaire: Affaire): ResultatTravee {
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

  if (hasForcePos) {
    posRaidisseurs = override!.positions!
      .map(p => Math.round(p * 10) / 10)
      .filter(p => p > 1 && Math.abs(p - travee.largeur) > 1);
  } else if (hasForceNb) {
    // Forcer N raidisseurs sur la grille 130mm
    const grille = calcGrille(longueurLisse, entraxeMax);
    const desired = override!.nb!;
    // Choisir 'desired' positions parmi la grille
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
    const grille = calcGrille(longueurLisse, entraxeMax);
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
    const usinageTest = calcPositionsUsinages(posRaidisseurs, longueurLisse);
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
    usinages.push(calcPositionsUsinages(posRaidisseurs, longueurLisse));
  }

  // 8. Contrôle NF P01-012
  if (gc.hasBarreaux && usinages.length > 0) {
    const posVerticaux = [...usinages[0].percageLisse].sort((a, b) => a - b);
    if (posVerticaux.length > 0 && posVerticaux[0] > ESPACEMENT_BARREAU + 0.5) {
      alertes.push({ niveau: 'attention', message: `Espace bord gauche → 1er élément = ${posVerticaux[0].toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm` });
    }
    if (posVerticaux.length > 0) {
      const gapDroit = longueurLisse - posVerticaux[posVerticaux.length - 1];
      if (gapDroit > ESPACEMENT_BARREAU + 0.5) {
        alertes.push({ niveau: 'attention', message: `Espace dernier élément → bord droit = ${gapDroit.toFixed(1)}mm > ${ESPACEMENT_BARREAU}mm` });
      }
    }
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
