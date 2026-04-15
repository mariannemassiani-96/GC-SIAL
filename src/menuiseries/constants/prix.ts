import type { TypeProduit } from '../types';

/** Prix de base HT par type de produit, pour 1m² en config standard */
export const PRIX_BASE: Record<TypeProduit, number> = {
  fenetre: 280,
  porte_fenetre: 380,
  baie_vitree: 450,
  porte_entree: 950,
  volet_roulant: 220,
  store: 180,
  pergola: 350, // au m²
  portail: 1200, // forfaitaire + m²
};

/** Prix minimum affichable par type de produit */
export const PRIX_MIN: Record<TypeProduit, number> = {
  fenetre: 85,
  porte_fenetre: 180,
  baie_vitree: 350,
  porte_entree: 650,
  volet_roulant: 120,
  store: 80,
  pergola: 2500,
  portail: 800,
};

/** Supplément croisillons par vantail */
export const PRIX_CROISILLONS = {
  integre: 35,
  colle: 25,
  viennois: 45,
};

/** Supplément appui de fenêtre par mètre linéaire */
export const PRIX_APPUI = {
  pvc: 28,
  alu: 45,
  pierre: 85,
};

/** Prix volet roulant de base (ajouté au prix de la fenêtre) */
export const PRIX_VOLET_BASE = 180; // pour 1m² de volet

/** TVA standard */
export const TVA = 0.20;

/** TVA réduite (rénovation) */
export const TVA_REDUITE = 0.10;

/** Dimensions min/max par type de produit (en mm) */
export const DIMENSIONS_LIMITES: Record<TypeProduit, { minL: number; maxL: number; minH: number; maxH: number }> = {
  fenetre: { minL: 400, maxL: 2400, minH: 400, maxH: 2200 },
  porte_fenetre: { minL: 600, maxL: 4000, minH: 2000, maxH: 2600 },
  baie_vitree: { minL: 1200, maxL: 6000, minH: 2000, maxH: 2600 },
  porte_entree: { minL: 800, maxL: 1400, minH: 2000, maxH: 2400 },
  volet_roulant: { minL: 400, maxL: 4000, minH: 400, maxH: 3000 },
  store: { minL: 500, maxL: 5000, minH: 500, maxH: 3000 },
  pergola: { minL: 2000, maxL: 7000, minH: 2000, maxH: 6000 }, // H = profondeur
  portail: { minL: 1000, maxL: 5000, minH: 1000, maxH: 2200 },
};
