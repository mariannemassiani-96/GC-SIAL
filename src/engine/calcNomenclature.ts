import type { Affaire, Travee, NomenclatureItem } from '../types';
import { PROFILS, ACCESSOIRES } from '../constants/profils';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';

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
  affaire: Affaire,
  calc: CalcResult
): NomenclatureItem[] {
  const items: NomenclatureItem[] = [];
  const gc = TYPES_GC[affaire.typeGC];
  const mc = TYPES_MC[affaire.mc];
  const pose = POSE_DATA[affaire.pose];

  // --- Angles de coupe ---
  // Coupe 45° (coupeG/coupeD) = angle en plan (GC en L ou U) → profils HORIZONTAUX
  // Rampant (affaire.angle) = pente (escalier) → éléments VERTICAUX
  const hCoupeG = travee.coupeG; // pour profils horizontaux
  const hCoupeD = travee.coupeD;
  const vCoupe = affaire.rampant && affaire.angle > 0
    ? String(90 - affaire.angle)  // ex: pente 10° → coupe à 80°
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
    addProfil('126129', calc.debLisse, 2, '—', '—'); // joint, pas de coupe
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
  if (affaire.fixG === 'libre') {
    addAccess(mc.bouchon, 1);
    addAccess('127144', 1);
  }
  if (affaire.fixD === 'libre') {
    addAccess(mc.bouchon, 1);
    addAccess('127144', 1);
  }
  if (affaire.fixG === 'mur_d') addAccess('127149', 1);
  if (affaire.fixG === 'mur_g') addAccess('127150', 1);
  if (affaire.fixD === 'mur_d') addAccess('127149', 1);
  if (affaire.fixD === 'mur_g') addAccess('127150', 1);
  if (affaire.fixG === 'raccord90' || affaire.fixD === 'raccord90') addAccess('110962', 1);
  if (affaire.fixG === 'raccord_droit' || affaire.fixD === 'raccord_droit') addAccess('110966', 1);

  return items;
}
