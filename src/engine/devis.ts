import { ACCESSOIRES, LG_BARRE_MM } from '../constants/profils';
import type { ResultatAffaire, Affaire } from '../types';

/** Prix unitaires estimés — à ajuster avec le tarif Kawneer en vigueur */
export const PRIX_PROFILS: Record<string, number> = {
  '180000': 18.50,  // Raidisseur — prix/barre 6400
  '180005': 8.20,   // Barreau — prix/barre 6400
  '180010': 22.00,  // Lisse non percée — prix/barre 6400
  '180020': 9.50,   // Closoir — prix/barre 6400
  '180030': 28.00,  // MC standard — prix/barre 6400
  '180032': 42.00,  // MC design — prix/barre 6400
  '180033': 55.00,  // MC ronde — prix/barre 6400
  '180040': 14.00,  // U remplissage — prix/barre 6400
  '140545': 19.00,  // Tube rond — prix/barre 6400
  '126129': 3.50,   // Joint — prix/ml
};

export const PRIX_ACCESSOIRES: Record<string, number> = {
  '6003992': 12.50,  // Sabot dalle
  '6004105': 14.00,  // Sabot nez de dalle
  '110306': 8.50,    // Goupille (sachet 5)
  '110312': 35.00,   // Vis barreau (sachet 200)
  '110955': 15.00,   // Fixation raidisseur (sac 5)
  '110956': 4.50,    // Renfort MC
  '127143': 6.00,    // Bouchon MC std/design (sachet 2)
  '127144': 5.00,    // Bouchon lisse (sachet 2)
  '127149': 7.50,    // Patte mur droite (sac 2)
  '127150': 7.50,    // Patte mur gauche (sac 2)
  '127158': 8.00,    // Bouchon MC ronde (sachet 2)
  '110962': 9.00,    // Équerre 90° (par 2)
  '110966': 7.00,    // Éclisse (par 2)
  '6003997': 11.00,  // Pince vitrage
};

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

export function genererDevis(affaire: Affaire, resultat: ResultatAffaire): Devis {
  const lignesProfiles: LigneDevis[] = [];
  const lignesAccessoires: LigneDevis[] = [];
  const lignesAutres: LigneDevis[] = [];

  // Profilés — prix par barre
  for (const opt of resultat.optimBarres) {
    const prixBarre = PRIX_PROFILS[opt.ref] ?? 0;
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

  // Accessoires — regrouper par ref
  const accessMap = new Map<string, number>();
  for (const item of resultat.nomenclatureGlobale) {
    if (item.type === 'accessoire') {
      accessMap.set(item.ref, (accessMap.get(item.ref) ?? 0) + item.qte);
    }
  }

  for (const [ref, qte] of accessMap.entries()) {
    const cond = ACCESSOIRES[ref]?.cond ?? 1;
    const nbColis = Math.ceil(qte / cond);
    const prixColis = PRIX_ACCESSOIRES[ref] ?? 0;
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

  // Vitrages si remplissage
  for (const rt of resultat.travees) {
    if (rt.hautVitre > 0 && rt.largVitre > 0) {
      const surface = (rt.hautVitre * rt.largVitre) / 1e6; // m²
      const nbVitrages = (rt.nbRaid - 1) * rt.travee.qte;
      lignesAutres.push({
        ref: 'STADIP442',
        designation: `Stadip 44.2 — ${rt.hautVitre.toFixed(0)}×${rt.largVitre.toFixed(0)}mm (${rt.travee.repere})`,
        type: 'vitrage',
        qte: nbVitrages,
        unite: 'pièce',
        prixUnit: Math.round(surface * 85), // ~85€/m²
        montant: Math.round(nbVitrages * surface * 85),
      });
    }
  }

  // Main d'œuvre estimée
  const nbTravees = affaire.travees.reduce((s, t) => s + t.qte, 0);
  const heuresFab = nbTravees * 1.5; // ~1.5h par travée
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
    lignesProfiles,
    lignesAccessoires,
    lignesAutres,
    totalProfiles,
    totalAccessoires,
    totalAutres,
    totalHT,
    tva,
    totalTTC: totalHT + tva,
  };
}
