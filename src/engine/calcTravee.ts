import type { Affaire, Travee, ResultatTravee, UsinageLisse, Alerte } from '../types';
import { ENTRAXE, ESPACEMENT_BARREAU, DEPASSEMENT_LISSE } from '../constants/parametres';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { calcNomenclature } from './calcNomenclature';

export function calcPositionsUsinages(
  longueurLisse: number,
  nbRaid: number,
  entraxeEff: number
): UsinageLisse {
  const depassement = DEPASSEMENT_LISSE;

  const posRaidisseurs: number[] = [];
  for (let i = 0; i < nbRaid; i++) {
    posRaidisseurs.push(Math.round((depassement + i * entraxeEff) * 10) / 10);
  }

  const posBarreaux: number[] = [];
  for (
    let x = ESPACEMENT_BARREAU;
    x <= longueurLisse - ESPACEMENT_BARREAU + 0.1;
    x += ESPACEMENT_BARREAU
  ) {
    posBarreaux.push(Math.round(x * 10) / 10);
  }

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

  // 4. Nombre de barreaux
  let nbBarreaux = 0;
  if (gc.hasBarreaux) {
    const barParInterval = Math.floor(entraxeEff / ESPACEMENT_BARREAU) - 1;
    nbBarreaux = Math.max(0, barParInterval) * (nbRaid - 1);
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

  // 9. Alertes
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
