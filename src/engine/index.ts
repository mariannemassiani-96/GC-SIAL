import type { Affaire, ResultatAffaire, Alerte } from '../types';
import { calcTravee } from './calcTravee';
import { optimiserBarres } from './optimiserBarres';

export { calcTravee } from './calcTravee';
export { calcNomenclature } from './calcNomenclature';
export { optimiserBarres } from './optimiserBarres';
export { calcPositionsUsinages } from './calcTravee';

export function calculerAffaire(affaire: Affaire): ResultatAffaire {
  const travees = affaire.travees.map((t) => calcTravee(t, affaire));

  // Nomenclature globale — regrouper par ref et additionner
  const nomenclatureMap = new Map<string, { ref: string; label: string; longueur: number; qte: number; type: 'profil' | 'accessoire' }>();

  for (const rt of travees) {
    for (const item of rt.nomenclature) {
      const key = `${item.ref}_${item.longueur}`;
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
