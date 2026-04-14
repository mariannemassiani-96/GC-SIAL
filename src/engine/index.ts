import type { Affaire, Travee, ResultatAffaire, Alerte, NomenclatureItem } from '../types';
import { calcTravee } from './calcTravee';
import { optimiserBarres } from './optimiserBarres';

export { calcTravee } from './calcTravee';
export { calcNomenclature } from './calcNomenclature';
export { optimiserBarres } from './optimiserBarres';
export { calcPositionsUsinages } from './calcTravee';

export function calculerAffaire(affaire: Affaire): ResultatAffaire {
  // Pour les travées en angle (largeur2 > 0), on calcule les deux branches
  const travees = affaire.travees.flatMap((t) => {
    const results = [calcTravee(t, affaire)];
    if (t.largeur2 > 0 && (t.coupeG === '45' || t.coupeD === '45')) {
      // Branche 2 : inverser les fixations et coupes, utiliser largeur2
      const t2: Travee = {
        ...t,
        id: t.id + '_b2',
        repere: t.repere + 'b',
        largeur: t.largeur2,
        largeur2: 0,
        // Inverser G/D pour la branche 2 (elle part de l'angle)
        fixG: t.coupeD === '45' ? 'raccord90' : t.fixG,
        fixD: t.coupeD === '45' ? t.fixD : 'raccord90',
        coupeG: t.coupeD === '45' ? '45' : '90',
        coupeD: t.coupeD === '45' ? '90' : '45',
      };
      results.push(calcTravee(t2, affaire));
    }
    return results;
  });

  // Nomenclature globale — regrouper par ref et additionner
  const nomenclatureMap = new Map<string, NomenclatureItem>();

  for (const rt of travees) {
    for (const item of rt.nomenclature) {
      const key = `${item.ref}_${item.longueur}_${item.coupeG}_${item.coupeD}`;
      const existing = nomenclatureMap.get(key);
      if (existing) {
        existing.qte += item.qte * rt.travee.qte;
      } else {
        nomenclatureMap.set(key, {
          ...item,
          qte: item.qte * rt.travee.qte,
        });
      }
    }
  }

  const nomenclatureGlobale = [...nomenclatureMap.values()];

  // Optimisation barres — collecter toutes les pièces profilé
  const piecesAOptimiser = travees.flatMap((rt) =>
    rt.nomenclature
      .filter((n) => n.type === 'profil')
      .map((n) => ({
        ref: n.ref,
        label: n.label,
        longueur: n.longueur,
        qte: n.qte * rt.travee.qte,
        traveeRef: rt.travee.repere,
      }))
  );

  const optimBarres = optimiserBarres(piecesAOptimiser);

  // Alertes globales
  const alertes: Alerte[] = [];
  for (const optim of optimBarres) {
    if (optim.tauxChute > 0.2) {
      alertes.push({
        niveau: 'attention',
        message: `Taux de chute > 20% sur ${optim.ref} (${(optim.tauxChute * 100).toFixed(1)}%)`,
      });
    }
  }

  // Collecter alertes des travées
  for (const rt of travees) {
    alertes.push(...rt.alertes);
  }

  return {
    travees,
    nomenclatureGlobale,
    optimBarres,
    alertes,
  };
}
