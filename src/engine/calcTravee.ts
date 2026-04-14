import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU, DEPASSEMENT_LISSE } from '../constants/parametres';
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
  longueurLisse: number,
  nbRaid: number,
  entraxeEff: number
): UsinageLisse {
  const depassement = DEPASSEMENT_LISSE;

  // Positions des raidisseurs
  const posRaidisseurs: number[] = [];
  for (let i = 0; i < nbRaid; i++) {
    posRaidisseurs.push(Math.round((depassement + i * entraxeEff) * 10) / 10);
  }

  // Barreaux : même nombre dans chaque intervalle, répartis symétriquement
  // Le nombre est calculé une seule fois sur l'entraxe pour garantir l'uniformité
  const barParInterval = calcBarParIntervalle(entraxeEff);
  const posBarreaux: number[] = [];
  for (let i = 0; i < nbRaid - 1; i++) {
    posBarreaux.push(...barreauxDansIntervalle(posRaidisseurs[i], posRaidisseurs[i + 1], barParInterval));
  }

  // Goupilles d'extrémité
  const posGoupilleG = 68.3;
  const posGoupilleD = Math.round((longueurLisse - 68.3) * 10) / 10;

  // percageLisse = barreaux + goupilles extrémité + positions raidisseurs
  // (les raidisseurs ont un "Perçage Lisse" goupille 110306 EN PLUS du "Perçage Lisse_Raidisseur")
  const allPercage = [...posBarreaux, posGoupilleG, posGoupilleD, ...posRaidisseurs];
  const uniquePercage = [...new Set(allPercage.map(v => Math.round(v * 10) / 10))].sort((a, b) => a - b);

  return {
    percageLisse: uniquePercage,
    percageLisseRaidisseur: posRaidisseurs,
  };
}

export function calcTravee(travee: Travee, affaire: Affaire): ResultatTravee {
  const gc = TYPES_GC[affaire.typeGC];
  const mc = TYPES_MC[affaire.mc];
  const pose = POSE_DATA[affaire.pose];
  const alertes: Alerte[] = [];

  // 1. Nombre de raidisseurs
  const entraxeMax = ENTRAXE[affaire.lieu][affaire.angle];
  const nbRaid = Math.ceil(travee.largeur / entraxeMax) + 1;
  const entraxeEff = travee.largeur / (nbRaid - 1);

  // 2. Débit raidisseur
  const debRaid = affaire.hauteur + pose.offsets[mc.raidKey];

  // 3. h1 et débit barreau
  const h1 = debRaid - 20 - mc.hauteur;
  const debBarreau = gc.hasBarreaux ? Math.max(0, h1 + mc.barreauDelta) : 0;

  // 4. Nombre de barreaux (même nombre par intervalle, espacement ≤ 130mm NF P01-012)
  let nbBarreaux = 0;
  if (gc.hasBarreaux) {
    nbBarreaux = calcBarParIntervalle(entraxeEff) * (nbRaid - 1);
  }

  // 5. Débits profilés filants
  const dedG = affaire.fixG === 'libre' ? 5 : 0;
  const dedD = affaire.fixD === 'libre' ? 5 : 0;
  const debMC = travee.largeur - dedG - dedD;
  const debLisse = travee.largeur;
  const debClosoir = travee.largeur;
  const longueurLisse = travee.largeur + 2 * DEPASSEMENT_LISSE;

  // 6. Remplissage
  let hautVitre = 0;
  let largVitre = 0;
  if (gc.hasRemplissage) {
    const deltaH = mc.raidKey === 'std' ? -112 : -80;
    const X = 20;
    const Y = 20;
    hautVitre = Math.max(0, affaire.hauteur + deltaH - X - Y);
    largVitre = Math.max(0, entraxeEff - 10);
  }

  // 7. Positions raidisseurs
  const posRaidisseurs: number[] = [];
  for (let i = 0; i < nbRaid; i++) {
    posRaidisseurs.push(
      Math.round((DEPASSEMENT_LISSE + i * entraxeEff) * 10) / 10
    );
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
    // Prendre toutes les positions d'éléments verticaux (raidisseurs + barreaux)
    // = percageLisse SANS les goupilles d'extrémité (qui ne sont pas des éléments verticaux)
    const posGoupG = 68.3;
    const posGoupD = Math.round((longueurLisse - 68.3) * 10) / 10;
    const posVerticaux = usinages[0].percageLisse.filter(
      (p) => Math.abs(p - posGoupG) > 0.05 && Math.abs(p - posGoupD) > 0.05
    );

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
  if (affaire.hauteur < 1000) {
    alertes.push({ niveau: 'bloquant', message: `Hauteur ${affaire.hauteur}mm < 1000mm minimum` });
  }
  if (gc.hMax && affaire.hauteur > gc.hMax) {
    alertes.push({
      niveau: 'bloquant',
      message: `Hauteur ${affaire.hauteur}mm > ${gc.hMax}mm max pour ${gc.label}`,
    });
  }
  if (affaire.rampant) {
    alertes.push({ niveau: 'info', message: 'GC rampant — vérifier l\'angle de coupe' });
  }

  // 10. Nomenclature
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
  const nomenclature = calcNomenclature(travee, affaire, calcResult);

  return {
    travee,
    ...calcResult,
    nomenclature,
    usinages,
    posRaidisseurs,
    alertes,
  };
}
