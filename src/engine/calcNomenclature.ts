import type { Travee, NomenclatureItem } from '../types';
import { PROFILS, ACCESSOIRES } from '../constants/profils';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { MAX_PIECE_MM } from '../constants/parametres';

interface CalcResult {
  nbRaid: number;
  debRaid: number;
  debMC: number;
  debLisse: number;
  debClosoir: number;
  longueurLisse: number;
  debBarreau: number;
  nbBarreaux: number;
}

export function calcNomenclature(
  travee: Travee,
  calc: CalcResult
): NomenclatureItem[] {
  const items: NomenclatureItem[] = [];
  const gc = TYPES_GC[travee.typeGC];
  const mc = TYPES_MC[travee.mc];
  const pose = POSE_DATA[travee.pose];

  // --- Angles de coupe ---
  const hCoupeG = travee.coupeG;
  const hCoupeD = travee.coupeD;
  const vCoupe = travee.rampant && travee.angle > 0
    ? String(90 - travee.angle)
    : '90';

  function addProfil(ref: string, longueur: number, qte: number, coupeG: string, coupeD: string) {
    if (qte > 0 && longueur > 0) {
      items.push({
        ref,
        label: PROFILS[ref]?.label ?? ref,
        longueur: Math.round(longueur * 10) / 10,
        qte,
        type: 'profil',
        coupeG,
        coupeD,
      });
    }
  }

  function addAccess(ref: string, qte: number) {
    if (qte > 0) {
      items.push({
        ref,
        label: ACCESSOIRES[ref]?.label ?? ref,
        longueur: 0,
        qte,
        type: 'accessoire',
        coupeG: '—',
        coupeD: '—',
      });
    }
  }

  // Profilés verticaux → angle rampant
  addProfil('180000', calc.debRaid, calc.nbRaid, vCoupe, vCoupe);
  if (gc.hasBarreaux && calc.nbBarreaux > 0) {
    addProfil('180005', calc.debBarreau, calc.nbBarreaux, vCoupe, vCoupe);
  }

  // Profilés horizontaux → angle en plan (45° pour L/U)
  addProfil(mc.ref, calc.debMC, 1, hCoupeG, hCoupeD);
  addProfil('180020', calc.debClosoir, 1, hCoupeG, hCoupeD);

  if (gc.hasBarreaux || gc.hasRemplissage) {
    const nbLisses = gc.hasLisseInter ? 3 : gc.hasBarreaux ? 2 : 1;
    addProfil('180010', calc.longueurLisse, nbLisses, hCoupeG, hCoupeD);
  }
  if (gc.hasRemplissage) {
    addProfil('180040', calc.debLisse, 2, hCoupeG, hCoupeD);
    addProfil('126129', calc.debLisse, 2, '—', '—');
  }
  if (gc.nbTubesRonds > 0) {
    addProfil('140545', calc.debMC, gc.nbTubesRonds, hCoupeG, hCoupeD);
  }

  // Accessoires
  addAccess(pose.sabot, calc.nbRaid);
  addAccess('110306', calc.nbRaid);
  addAccess('110955', calc.nbRaid);
  addAccess('110956', Math.max(1, Math.floor(calc.debMC / 600)));
  if (gc.hasBarreaux) addAccess('110312', calc.nbBarreaux * 2);
  if (gc.hasRemplissage) addAccess('6003997', calc.nbRaid * 2);

  // Fixations latérales
  if (travee.fixG === 'libre') {
    addAccess(mc.bouchon, 1);
    addAccess('127144', 1);
  }
  if (travee.fixD === 'libre') {
    addAccess(mc.bouchon, 1);
    addAccess('127144', 1);
  }
  if (travee.fixG === 'mur_d') addAccess('127149', 1);
  if (travee.fixG === 'mur_g') addAccess('127150', 1);
  if (travee.fixD === 'mur_d') addAccess('127149', 1);
  if (travee.fixD === 'mur_g') addAccess('127150', 1);

  // Raccords 90° — 1 par angle
  let nbRaccord90 = 0;
  if (travee.fixG === 'raccord90') nbRaccord90++;
  if (travee.fixD === 'raccord90') nbRaccord90++;
  if (nbRaccord90 > 0) addAccess('110962', nbRaccord90);

  if (travee.fixG === 'raccord_droit' || travee.fixD === 'raccord_droit') addAccess('110966', 1);

  // Éclisses d'aboutage pour les GC longs (profilés > 6300mm)
  if (calc.debMC > MAX_PIECE_MM) {
    const nbSplices = Math.ceil(calc.debMC / MAX_PIECE_MM) - 1;
    const nbLisses = (gc.hasBarreaux || gc.hasRemplissage) ? (gc.hasLisseInter ? 3 : gc.hasBarreaux ? 2 : 1) : 0;
    const nbProfilsAboutés = 1 + nbLisses + 1; // MC + lisses + closoir
    addAccess('110966', nbSplices * nbProfilsAboutés);
  }

  // Bouts des retours (L/U)
  if (travee.coupeG === '45') {
    if ((travee.fixRetourG ?? 'libre') === 'libre') {
      addAccess(mc.bouchon, 1);
      addAccess('127144', 1);
    } else {
      addAccess('127150', 1);
    }
  }
  if (travee.coupeD === '45') {
    if ((travee.fixRetourD ?? 'libre') === 'libre') {
      addAccess(mc.bouchon, 1);
      addAccess('127144', 1);
    } else {
      addAccess('127149', 1);
    }
  }

  return items;
}
