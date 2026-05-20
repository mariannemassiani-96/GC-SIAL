import type { Affaire, Travee, ResultatAffaire, Alerte, NomenclatureItem } from '../types';
import { calcTravee } from './calcTravee';
import { optimiserBarres } from './optimiserBarres';

export { calcTravee } from './calcTravee';
export { calcNomenclature } from './calcNomenclature';
export { optimiserBarres } from './optimiserBarres';
export { calcPositionsUsinages } from './calcTravee';

export function calculerAffaire(affaire: Affaire): ResultatAffaire {
  const travees = affaire.travees.flatMap((t) => {
    const hasRetour = (t.largeur2 > 0 && t.coupeD === '45') || t.coupeG === '45';
    const mainTravee = hasRetour ? { ...t, repere: t.repere + ' Partie 1' } : t;
    const results = [calcTravee(mainTravee, affaire)];

    // Branche retour droite (L droite ou U)
    if (t.largeur2 > 0 && t.coupeD === '45') {
      const t2: Travee = {
        ...t,
        id: t.id + '_retD',
        repere: t.repere + ' Partie 2',
        largeur: t.largeur2,
        largeur2: 0, largeur3: 0,
        fixG: 'raccord90',
        fixD: (t.fixRetourD ?? 'libre') === 'mur' ? 'mur_d' : 'libre',
        coupeG: '45',
        coupeD: '90',
        raidCentre: t.raidDroite,
        raidGauche: undefined, raidDroite: undefined,
      };
      results.push(calcTravee(t2, affaire));
    }

    // Branche retour gauche (L gauche ou U)
    if (t.coupeG === '45') {
      const lenG = t.coupeD === '45' ? (t.largeur3 || 0) : (t.largeur2 || 0);
      if (lenG > 0) {
        const t3: Travee = {
          ...t,
          id: t.id + '_retG',
          repere: t.repere + ' Partie 3',
          largeur: lenG,
          largeur2: 0, largeur3: 0,
          fixG: (t.fixRetourG ?? 'libre') === 'mur' ? 'mur_g' : 'libre',
          fixD: 'raccord90',
          coupeG: '90',
          coupeD: '45',
          raidCentre: t.raidGauche,
          raidGauche: undefined, raidDroite: undefined,
        };
        results.push(calcTravee(t3, affaire));
      }
    }

    return results;
  });

  const nomenclatureMap = new Map<string, NomenclatureItem>();
  for (const rt of travees) {
    for (const item of rt.nomenclature) {
      const key = `${item.ref}_${item.longueur}_${item.coupeG}_${item.coupeD}`;
      const existing = nomenclatureMap.get(key);
      if (existing) {
        existing.qte += item.qte * rt.travee.qte;
      } else {
        nomenclatureMap.set(key, { ...item, qte: item.qte * rt.travee.qte });
      }
    }
  }
  const nomenclatureGlobale = [...nomenclatureMap.values()];

  const piecesAOptimiser = travees.flatMap((rt) =>
    rt.nomenclature
      .filter((n) => n.type === 'profil')
      .map((n) => ({ ref: n.ref, label: n.label, longueur: n.longueur, qte: n.qte * rt.travee.qte, traveeRef: rt.travee.repere }))
  );
  const optimBarres = optimiserBarres(piecesAOptimiser);

  const alertes: Alerte[] = [];
  for (const rt of travees) { alertes.push(...rt.alertes); }

  return { travees, nomenclatureGlobale, optimBarres, alertes };
}
