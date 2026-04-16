import type { TypeProduit, MateriauId } from '../types';

// ─── Tarifs fenetre24.com — reconstitués à partir des prix réels ──────
//
// RÈGLE DE CALCUL FENETRE24 :
// Prix TTC = PrixBase(type, surface) × CoefMatériau × CoefProfilé × CoefVitrage
//            × CoefOuverture × CoefCouleur + Options (volet, croisillons, etc.)
//
// Le double vitrage standard 4/16/4 argon (Ug 1.1) est INCLUS dans le prix de base.
// Le blanc RAL 9016 est le coloris de base (coef 1.0).

// ── Prix forfaitaire de départ TTC par type de produit ────────────────
// (pour la dimension minimum en PVC blanc, double vitrage, ouverture basique)

export const PRIX_DEPART_TTC: Record<TypeProduit, number> = {
  fenetre: 39,                       // fixe PVC petite dimension
  porte_fenetre: 129,                // PVC 1V battant simple
  baie_coulissante: 780,             // coulissant PVC 2 vantaux
  baie_oscillo_coulissante: 1073,    // oscillo-coulissant PVC
  porte_entree: 718,                 // vitrée PVC
  porte_service: 380,                // PVC simple
  volet_roulant: 54,                 // PVC sangle petite dimension
  pergola: 1261,                     // adossée alu
};

// ── Prix de base HT par m² (PVC blanc, double vitrage standard) ───────
// Déduit des prix réels :
//   - Fenêtre PVC 1V OB 700×1200 = 335€ TTC = 279€ HT → surface 0.84m² → 332€/m²
//   - Fenêtre PVC 2V OB 950×1200 = 427€ TTC = 356€ HT → surface 1.14m² → 312€/m²
//   - Plus la surface augmente, plus le prix/m² diminue (effet dégressif)

export const PRIX_BASE_M2: Record<TypeProduit, number> = {
  fenetre: 320,                      // €HT/m² — base PVC OB
  porte_fenetre: 290,                // €HT/m² — base PVC battant
  baie_coulissante: 380,             // €HT/m² — coulissant / HST
  baie_oscillo_coulissante: 450,     // €HT/m² — oscillo-coulissant
  porte_entree: 0,                   // forfaitaire (voir PRIX_FORFAIT_PORTE)
  porte_service: 0,                  // forfaitaire
  volet_roulant: 160,                // €HT/m²
  pergola: 280,                      // €HT/m² alu bioclimatique
};

// ── Prix forfaitaires portes (HT) ────────────────────────────────────
// Les portes ont un prix de base + petit supplément surface

export const PRIX_FORFAIT_PORTE: Record<string, number> = {
  porte_entree_pvc: 598,             // 718€ TTC → 598€ HT
  porte_entree_alu: 1053,            // 1264€ TTC → 1053€ HT
  porte_entree_bois: 850,
  porte_entree_bois_alu: 1200,
  porte_entree_acier: 950,
  porte_service_pvc: 317,            // ~380€ TTC
  porte_service_alu: 520,
  porte_service_bois: 450,
};

// ── Coefficients matériaux ────────────────────────────────────────────
// Déduits des prix réels fenetre24 :
//   Porte-fenêtre : PVC 129€, Alu 226€, Bois 419€
//   → Alu/PVC = 1.75, Bois/PVC = 3.25

export const COEF_MATERIAU: Record<MateriauId, number> = {
  pvc: 1.0,
  aluminium: 1.75,
  bois: 3.25,
  bois_alu: 3.60,      // Bois-alu ≈ bois + 10% (protection alu ext.)
  pvc_alu: 1.40,       // PVC-alu ≈ PVC + 40%
  acier: 1.60,         // Acier (portes uniquement)
};

// ── Coefficients profilés ─────────────────────────────────────────────
// Fenetre24 PVC simple = 129€, Energeto 8000 = 239€ → ratio 1.85

export const COEF_PROFIL: Record<string, number> = {
  // PVC Aluplast
  aluplast_ideal_4000: 1.0,
  aluplast_ideal_5000: 1.08,
  aluplast_ideal_7000: 1.30,
  aluplast_energeto_8000: 1.85,      // Confirmé : 239/129 ≈ 1.85
  aluplast_energeto_view: 2.05,
  // Bois
  bois_iv68: 1.0,
  bois_iv78: 1.15,
  bois_iv92: 1.35,
  // Alu
  alu_mb70: 1.0,
  alu_mb70hi: 1.20,
  alu_mb86: 1.45,
  // Bois-Alu
  bois_alu_iv78: 1.0,
  bois_alu_iv92: 1.25,
  // PVC-Alu
  pvc_alu_ideal_7000: 1.0,
  pvc_alu_energeto_8000: 1.20,
  // Acier
  acier_thermo46: 1.0,
  acier_thermo65: 1.30,
};

// ── Coefficients vitrage ──────────────────────────────────────────────
// Double vitrage standard INCLUS (coef 1.0)
// Triple vitrage ≈ +35-45% selon les sources

export const COEF_VITRAGE: Record<string, number> = {
  double_standard: 1.0,              // Inclus dans le prix de base
  double_phonique_cl2: 1.08,
  double_phonique_cl3_36: 1.15,
  double_phonique_cl3_38: 1.20,
  double_phonique_cl4: 1.30,
  double_phonique_cl5: 1.45,
  double_securite_a1: 1.18,
  double_securite_a3: 1.35,
  double_solaire: 1.22,
  double_structure: 1.10,
  triple_standard: 1.40,             // Triple standard ≈ +40%
  triple_phonique: 1.60,
  triple_securite: 1.75,
  triple_solaire: 1.55,
};

// ── Coefficients ouverture ────────────────────────────────────────────

export const COEF_OUVERTURE: Record<string, number> = {
  fixe: 0.70,                        // Pas de mécanisme = moins cher
  battant_gauche: 0.90,
  battant_droit: 0.90,
  oscillo_battant_gauche: 1.0,       // OB = référence
  oscillo_battant_droit: 1.0,
  a_soufflet: 0.85,
  coulissant: 1.15,
  oscillo_coulissant: 1.35,
  soulevant_coulissant: 2.50,        // HST ≈ ×2.5 vs OB (2715/1073)
  galandage: 2.80,
};

// ── Coefficients couleur ──────────────────────────────────────────────
// Blanc = base. Couleurs = supplément ~10-25%. Bicolore = +15%

export const COEF_COULEUR: Record<string, number> = {
  // PVC standard
  blanc_9016: 1.0,
  creme_9001: 1.03,
  // Gris / Noirs
  gris_anthracite_7016: 1.12,
  gris_quartz_7039: 1.12,
  gris_agate_7038: 1.10,
  gris_clair_7035: 1.08,
  gris_fenetre_7040: 1.08,
  gris_brun_8019: 1.12,
  noir_jet_9005: 1.12,
  noir_de_sécurité_9011: 1.14,
  // Décors bois PVC
  chene_dore: 1.18,
  chene_irlandais: 1.18,
  chene_marais: 1.20,
  noyer: 1.20,
  douglas: 1.18,
  // Finitions spéciales
  aludec_anthracite: 1.25,
  aludec_gris_clair: 1.25,
  woodec_chene_turner: 1.28,
  woodec_chene_sheffield: 1.28,
  // Bois naturel
  bois_pin_naturel: 1.0,
  bois_chene_naturel: 1.15,
  bois_meranti: 1.10,
  bois_meleze: 1.12,
  bois_eucalyptus: 1.08,
  bois_teinte_chene_clair: 1.05,
  bois_teinte_chene_fonce: 1.08,
  bois_teinte_noyer: 1.08,
  bois_teinte_acajou: 1.10,
  bois_laque_blanc: 1.10,
  bois_laque_gris_7016: 1.15,
  bois_laque_noir_9005: 1.15,
  // Alu RAL
  bleu_gentiane_5010: 1.10,
  vert_mousse_6005: 1.10,
  rouge_rubis_3003: 1.10,
  rouge_pourpre_3004: 1.10,
  brun_chocolat_8017: 1.10,
  bronze_metallic: 1.20,
  ral_sur_mesure: 1.30,
};

// ── Supplément bicolore ───────────────────────────────────────────────
export const SUPPLEMENT_BICOLORE = 0.15; // +15% sur le prix de base

// ── Prix croisillons par vantail ──────────────────────────────────────
export const PRIX_CROISILLONS: Record<string, number> = {
  helima: 32,      // Croisillons intégrés dans le vitrage
  wiener: 24,      // Croisillons collés
  vrais: 58,       // Vrais petits-bois structurels
  integre: 32,     // alias
  colle: 24,
  viennois: 58,
};

// ── Largeur croisillons (supplément par rapport à 18mm base) ──────────
export const SUPPLEMENT_LARGEUR_CROISILLON: Record<number, number> = {
  18: 0,
  26: 5,
  45: 12,
};

// ── Prix appui de fenêtre par mètre linéaire ─────────────────────────
export const PRIX_APPUI: Record<string, number> = {
  pvc: 22,
  alu: 38,
  pierre: 75,
  marbre: 110,
};

// ── Prix volet roulant ────────────────────────────────────────────────
// Volet roulant à partir de 54€ TTC (= 45€ HT pour petite dim PVC sangle)
export const PRIX_VOLET_BASE_M2 = 85; // €HT/m² base PVC sangle

export const COEF_MOTORISATION_VOLET: Record<string, number> = {
  manuel_sangle: 1.0,
  manuel_manivelle: 1.20,
  electrique_inel: 1.65,
  electrique_somfy_ilmo: 1.85,
  electrique_somfy_oximo: 2.15,
  solaire: 2.50,
};

export const COEF_TABLIER_VOLET: Record<string, number> = {
  lames_pvc: 1.0,
  lames_alu: 1.35,
};

export const PRIX_MOUSTIQUAIRE_VR_M2 = 45; // €HT/m² moustiquaire intégrée VR

// ── Prix pergola ──────────────────────────────────────────────────────
export const PRIX_PERGOLA = {
  adossee_base_ht: 1050,    // 1261€ TTC → 1050€ HT
  autoportante_base_ht: 1407, // 1688€ TTC → 1407€ HT
  coef_m2: 280,              // €HT/m² au-delà de la dimension mini
};

// ── TVA ───────────────────────────────────────────────────────────────
export const TVA = 0.20;
export const TVA_REDUITE = 0.10; // Rénovation logement > 2 ans

// ── Dimensions min/max par type de produit (en mm) ────────────────────
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

// ── Options sécurité porte d'entrée ───────────────────────────────────
export const COEF_SERRURE: Record<string, number> = {
  serrure_3pts: 1.0,
  serrure_5pts: 1.18,
};

export const PRIX_ACCESSOIRES_PORTE: Record<string, number> = {
  gache_electrique: 120,
  barre_tirage: 85,
  barre_tirage_led: 180,
  lecteur_empreinte: 350,
  digicode: 250,
  judas_optique: 35,
  judas_numerique: 150,
};

// ── Effet dégressif surface ───────────────────────────────────────────
// Plus la surface augmente, plus le prix/m² diminue (matière vs quincaillerie)
// Fenêtre 0.84m² → 332€/m², 1.14m² → 312€/m² → ~-6% par +0.3m²
export function coefDegressifSurface(surfaceM2: number): number {
  if (surfaceM2 <= 0.5) return 1.15;  // Petites fenêtres : surcoût fixe relatif élevé
  if (surfaceM2 <= 1.0) return 1.0;   // Surface de référence
  if (surfaceM2 <= 2.0) return 0.92;
  if (surfaceM2 <= 3.0) return 0.85;
  if (surfaceM2 <= 5.0) return 0.80;
  return 0.75;                          // Très grandes surfaces
}

// ── Livraison gratuite ────────────────────────────────────────────────
export const SEUIL_LIVRAISON_GRATUITE_TTC = 2000;
