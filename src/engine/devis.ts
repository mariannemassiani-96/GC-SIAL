import { ACCESSOIRES, LG_BARRE_MM } from '../constants/profils';
import type { ResultatAffaire, Affaire, TarifKawneer, ClasseColoris } from '../types';

export interface LigneDevis {
  ref: string;
  designation: string;
  type: 'profil' | 'accessoire' | 'vitrage' | 'main_oeuvre';
  qte: number;
  unite: string;
  prixUnit: number;
  montant: number;
}

export interface Devis {
  lignesProfiles: LigneDevis[];
  lignesAccessoires: LigneDevis[];
  lignesAutres: LigneDevis[];
  totalProfiles: number;
  totalAccessoires: number;
  totalAutres: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
}

function getPrix(tarif: TarifKawneer, ref: string, classe: ClasseColoris): number {
  const item = tarif.prix[ref];
  if (!item) return 0;
  return item[`classe${classe}`];
}

export function genererDevis(affaire: Affaire, resultat: ResultatAffaire, tarif: TarifKawneer): Devis {
  const lignesProfiles: LigneDevis[] = [];
  const lignesAccessoires: LigneDevis[] = [];
  const lignesAutres: LigneDevis[] = [];
  const classe = affaire.classeColoris ?? 2;

  for (const opt of resultat.optimBarres) {
    const prixBarre = getPrix(tarif, opt.ref, classe);
    lignesProfiles.push({
      ref: opt.ref,
      designation: opt.label,
      type: 'profil',
      qte: opt.nbBarres,
      unite: `barre ${LG_BARRE_MM}mm`,
      prixUnit: prixBarre,
      montant: opt.nbBarres * prixBarre,
    });
  }

  const accessMap = new Map<string, number>();
  for (const item of resultat.nomenclatureGlobale) {
    if (item.type === 'accessoire') {
      accessMap.set(item.ref, (accessMap.get(item.ref) ?? 0) + item.qte);
    }
  }

  for (const [ref, qte] of accessMap.entries()) {
    const cond = ACCESSOIRES[ref]?.cond ?? 1;
    const nbColis = Math.ceil(qte / cond);
    const prixColis = getPrix(tarif, ref, classe);
    lignesAccessoires.push({
      ref,
      designation: ACCESSOIRES[ref]?.label ?? ref,
      type: 'accessoire',
      qte: nbColis,
      unite: cond > 1 ? `sachet ${cond}` : 'pièce',
      prixUnit: prixColis,
      montant: nbColis * prixColis,
    });
  }

  for (const rt of resultat.travees) {
    if (rt.hautVitre > 0 && rt.largVitre > 0) {
      const surface = (rt.hautVitre * rt.largVitre) / 1e6;
      const nbVitrages = (rt.nbRaid - 1) * rt.travee.qte;
      lignesAutres.push({
        ref: 'STADIP442',
        designation: `Stadip 44.2 — ${rt.hautVitre.toFixed(0)}×${rt.largVitre.toFixed(0)}mm (${rt.travee.repere})`,
        type: 'vitrage',
        qte: nbVitrages,
        unite: 'pièce',
        prixUnit: Math.round(surface * 85),
        montant: Math.round(nbVitrages * surface * 85),
      });
    }
  }

  const nbTravees = affaire.travees.reduce((s, t) => s + t.qte, 0);
  const heuresFab = nbTravees * 1.5;
  lignesAutres.push({
    ref: 'MO-FAB',
    designation: 'Main d\'œuvre fabrication atelier',
    type: 'main_oeuvre',
    qte: heuresFab,
    unite: 'heure',
    prixUnit: 45,
    montant: heuresFab * 45,
  });

  const totalProfiles = lignesProfiles.reduce((s, l) => s + l.montant, 0);
  const totalAccessoires = lignesAccessoires.reduce((s, l) => s + l.montant, 0);
  const totalAutres = lignesAutres.reduce((s, l) => s + l.montant, 0);
  const totalHT = totalProfiles + totalAccessoires + totalAutres;
  const tva = totalHT * 0.20;

  return {
    lignesProfiles, lignesAccessoires, lignesAutres,
    totalProfiles, totalAccessoires, totalAutres,
    totalHT, tva, totalTTC: totalHT + tva,
  };
}
