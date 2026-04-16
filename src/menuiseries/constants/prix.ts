import type { TypeProduit } from '../types';

// ─── Prix calqués sur fenetre24.com ───────────────────────────────────
// Prix HT de base par m² en configuration standard (PVC, double vitrage, blanc)
// Fenêtre PVC 1V OB 700×1200 = ~280€ TTC → ~233€ HT → ~280€/m² base

export const PRIX_BASE: Record<TypeProduit, number> = {
  fenetre: 280,              // €/m² — PVC 1V OB std → ~85€ HT pour 600×400
  porte_fenetre: 320,        // €/m² — PVC 1V battant
  baie_coulissante: 420,     // €/m² — coulissant/HST
  baie_oscillo_coulissante: 480, // €/m² — oscillo-coulissant
  porte_entree: 950,         // forfait base — à partir de 598€ HT
  porte_service: 550,        // forfait base
  volet_roulant: 180,        // €/m² — PVC sangle
  pergola: 320,              // €/m² — alu bioclimatique
};

/** Prix minimum affichable par type de produit (HT) */
export const PRIX_MIN: Record<TypeProduit, number> = {
  fenetre: 85,
  porte_fenetre: 150,
  baie_coulissante: 350,
  baie_oscillo_coulissante: 420,
  porte_entree: 598,
  porte_service: 320,
  volet_roulant: 95,
  pergola: 1050,
};

/** Prix croisillons par vantail selon type */
export const PRIX_CROISILLONS = {
  helima: 30,
  wiener: 22,
  vrais: 55,
  integre: 30, // fallback
  colle: 22,
  viennois: 55,
};

/** Prix appui de fenêtre par mètre linéaire */
export const PRIX_APPUI = {
  pvc: 22,
  alu: 38,
  pierre: 75,
  marbre: 110,
};

/** Prix volet roulant de base par m² */
export const PRIX_VOLET_BASE = 160;

/** TVA standard */
export const TVA = 0.20;

/** TVA réduite (rénovation logement > 2 ans) */
export const TVA_REDUITE = 0.10;

/** Dimensions min/max par type de produit (en mm) */
export const DIMENSIONS_LIMITES: Record<TypeProduit, { minL: number; maxL: number; minH: number; maxH: number }> = {
  fenetre:                  { minL: 360, maxL: 2400, minH: 360, maxH: 2200 },
  porte_fenetre:            { minL: 500, maxL: 4000, minH: 1800, maxH: 2600 },
  baie_coulissante:         { minL: 1200, maxL: 6500, minH: 1800, maxH: 2600 },
  baie_oscillo_coulissante: { minL: 1400, maxL: 6000, minH: 1800, maxH: 2500 },
  porte_entree:             { minL: 800, maxL: 1400, minH: 1900, maxH: 2400 },
  porte_service:            { minL: 700, maxL: 1200, minH: 1800, maxH: 2200 },
  volet_roulant:            { minL: 400, maxL: 4500, minH: 400, maxH: 3200 },
  pergola:                  { minL: 2000, maxL: 7000, minH: 2000, maxH: 6000 },
};

/** Prix accessoires porte d'entrée */
export const PRIX_ACCESSOIRES_PORTE = {
  gache_electrique: 120,
  barre_tirage: 85,
  barre_tirage_led: 180,
  lecteur_empreinte: 350,
  digicode: 250,
  judas_optique: 35,
  judas_numerique: 150,
};

/** Supplément moustiquaire intégrée au volet roulant */
export const PRIX_MOUSTIQUAIRE_VR = 85; // par m²

/** Prix pergola adossée vs autoportante */
export const PRIX_PERGOLA = {
  adossee_base: 1050,   // à partir de (HT)
  autoportante_base: 1400,
  coefM2: 320,
};
