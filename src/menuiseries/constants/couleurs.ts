import type { CouleurDef } from '../types';

// ─── Couleurs calquées sur fenetre24.com ──────────────────────────────
// PVC : 11+ coloris standard + finitions Aludec / Woodec
// Bois : essences naturelles + teintures + laques RAL
// Alu : palette RAL complète

export const COULEURS: CouleurDef[] = [
  // ══════════════════════════════════════════════════════
  // ── PVC — Couleurs standard ──────────────────────────
  // ══════════════════════════════════════════════════════
  { id: 'blanc_9016', label: 'Blanc pur RAL 9016', hex: '#F7F9F4', categorie: 'blanc', coefPrix: 1.0 },
  { id: 'creme_9001', label: 'Crème RAL 9001', hex: '#FDF4E3', categorie: 'blanc', coefPrix: 1.05 },

  // Gris
  { id: 'gris_anthracite_7016', label: 'Gris anthracite RAL 7016', hex: '#383E42', categorie: 'gris', coefPrix: 1.1 },
  { id: 'gris_quartz_7039', label: 'Gris quartz RAL 7039', hex: '#6C6960', categorie: 'gris', coefPrix: 1.12 },
  { id: 'gris_agate_7038', label: 'Gris agate RAL 7038', hex: '#B4B8B0', categorie: 'gris', coefPrix: 1.1 },
  { id: 'gris_clair_7035', label: 'Gris clair RAL 7035', hex: '#CBD0CC', categorie: 'gris', coefPrix: 1.08 },
  { id: 'gris_fenetre_7040', label: 'Gris fenêtre RAL 7040', hex: '#9DA1AA', categorie: 'gris', coefPrix: 1.08 },
  { id: 'gris_brun_8019', label: 'Gris brun RAL 8019', hex: '#403A3A', categorie: 'gris', coefPrix: 1.12 },

  // Noirs
  { id: 'noir_jet_9005', label: 'Noir profond RAL 9005', hex: '#0A0A0A', categorie: 'noir', coefPrix: 1.1 },
  { id: 'noir_de_sécurité_9011', label: 'Noir graphite RAL 9011', hex: '#1C2126', categorie: 'noir', coefPrix: 1.12 },

  // ══════════════════════════════════════════════════════
  // ── PVC — Décors bois (plaxage / film) ───────────────
  // ══════════════════════════════════════════════════════
  { id: 'chene_dore', label: 'Chêne doré', hex: '#C8983C', categorie: 'bois', coefPrix: 1.2 },
  { id: 'chene_irlandais', label: 'Chêne irlandais', hex: '#7A5C3A', categorie: 'bois', coefPrix: 1.2 },
  { id: 'chene_marais', label: 'Chêne des marais', hex: '#5C4A32', categorie: 'bois', coefPrix: 1.22 },
  { id: 'noyer', label: 'Noyer', hex: '#5C3317', categorie: 'bois', coefPrix: 1.22 },
  { id: 'douglas', label: 'Douglas', hex: '#A0724B', categorie: 'bois', coefPrix: 1.2 },

  // ══════════════════════════════════════════════════════
  // ── PVC — Finitions spéciales Aludec / Woodec ────────
  // ══════════════════════════════════════════════════════
  { id: 'aludec_anthracite', label: 'Aludec Anthracite (aspect alu)', hex: '#404040', categorie: 'metallique', coefPrix: 1.25 },
  { id: 'aludec_gris_clair', label: 'Aludec Gris clair (aspect alu)', hex: '#A8A8A8', categorie: 'metallique', coefPrix: 1.25 },
  { id: 'woodec_chene_turner', label: 'Woodec Chêne Turner (texture bois)', hex: '#B8860B', categorie: 'bois', coefPrix: 1.28 },
  { id: 'woodec_chene_sheffield', label: 'Woodec Chêne Sheffield (texture bois)', hex: '#8B7355', categorie: 'bois', coefPrix: 1.28 },

  // ══════════════════════════════════════════════════════
  // ── Bois — Essences naturelles ───────────────────────
  // ══════════════════════════════════════════════════════
  { id: 'bois_pin_naturel', label: 'Pin naturel', hex: '#DEB887', categorie: 'bois', coefPrix: 1.0 },
  { id: 'bois_chene_naturel', label: 'Chêne naturel', hex: '#B8860B', categorie: 'bois', coefPrix: 1.15 },
  { id: 'bois_meranti', label: 'Méranti', hex: '#8B4513', categorie: 'bois', coefPrix: 1.1 },
  { id: 'bois_meleze', label: 'Mélèze', hex: '#C4A46C', categorie: 'bois', coefPrix: 1.12 },
  { id: 'bois_eucalyptus', label: 'Eucalyptus', hex: '#9E7C5C', categorie: 'bois', coefPrix: 1.08 },

  // ── Bois — Teintures ─────────────────────────────────
  { id: 'bois_teinte_chene_clair', label: 'Teinture chêne clair', hex: '#C8A55A', categorie: 'bois', coefPrix: 1.1 },
  { id: 'bois_teinte_chene_fonce', label: 'Teinture chêne foncé', hex: '#6B4226', categorie: 'bois', coefPrix: 1.12 },
  { id: 'bois_teinte_noyer', label: 'Teinture noyer', hex: '#5C3317', categorie: 'bois', coefPrix: 1.12 },
  { id: 'bois_teinte_acajou', label: 'Teinture acajou', hex: '#6B2A2A', categorie: 'bois', coefPrix: 1.15 },

  // ── Bois — Laques RAL ────────────────────────────────
  { id: 'bois_laque_blanc', label: 'Laque blanc RAL 9016', hex: '#F7F9F4', categorie: 'blanc', coefPrix: 1.15 },
  { id: 'bois_laque_gris_7016', label: 'Laque gris anthracite RAL 7016', hex: '#383E42', categorie: 'gris', coefPrix: 1.2 },
  { id: 'bois_laque_noir_9005', label: 'Laque noir RAL 9005', hex: '#0A0A0A', categorie: 'noir', coefPrix: 1.2 },

  // ══════════════════════════════════════════════════════
  // ── Aluminium — Couleurs RAL ─────────────────────────
  // ══════════════════════════════════════════════════════
  { id: 'bleu_gentiane_5010', label: 'Bleu gentiane RAL 5010', hex: '#0E4C92', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'vert_mousse_6005', label: 'Vert mousse RAL 6005', hex: '#1B4D3E', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'rouge_rubis_3003', label: 'Rouge rubis RAL 3003', hex: '#8D1D2C', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'rouge_pourpre_3004', label: 'Rouge pourpre RAL 3004', hex: '#75151E', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'brun_chocolat_8017', label: 'Brun chocolat RAL 8017', hex: '#44322D', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'bronze_metallic', label: 'Bronze métallisé', hex: '#8C7853', categorie: 'metallique', coefPrix: 1.25 },

  // ── Sur mesure ───────────────────────────────────────
  { id: 'ral_sur_mesure', label: 'RAL sur mesure (code à préciser)', hex: '#CCCCCC', categorie: 'couleur', coefPrix: 1.35 },
];

export function getCouleurDef(id: string): CouleurDef | undefined {
  return COULEURS.find((c) => c.id === id);
}

export function getCouleursForCategorie(categorie: CouleurDef['categorie']): CouleurDef[] {
  return COULEURS.filter((c) => c.categorie === categorie);
}

export function getCouleursDisponibles(ids: string[]): CouleurDef[] {
  return COULEURS.filter((c) => ids.includes(c.id));
}
