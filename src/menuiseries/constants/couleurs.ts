import type { CouleurDef } from '../types';

export const COULEURS: CouleurDef[] = [
  // ── Blancs ───────────────────────────────────────────
  { id: 'blanc_9016', label: 'Blanc RAL 9016', hex: '#F7F9F4', categorie: 'blanc', coefPrix: 1.0 },
  { id: 'creme_9001', label: 'Crème RAL 9001', hex: '#FDF4E3', categorie: 'blanc', coefPrix: 1.05 },
  { id: 'blanc_creme_9001', label: 'Blanc crème RAL 9001', hex: '#FDF4E3', categorie: 'blanc', coefPrix: 1.05 },

  // ── Gris ─────────────────────────────────────────────
  { id: 'gris_7016', label: 'Gris anthracite RAL 7016', hex: '#383E42', categorie: 'gris', coefPrix: 1.1 },
  { id: 'anthracite_7016', label: 'Anthracite RAL 7016', hex: '#383E42', categorie: 'gris', coefPrix: 1.1 },
  { id: 'gris_9007', label: 'Gris aluminium RAL 9007', hex: '#8F8F8F', categorie: 'gris', coefPrix: 1.1 },
  { id: 'gris_7035', label: 'Gris clair RAL 7035', hex: '#CBD0CC', categorie: 'gris', coefPrix: 1.08 },
  { id: 'gris_7040', label: 'Gris fenêtre RAL 7040', hex: '#9DA1AA', categorie: 'gris', coefPrix: 1.08 },
  { id: 'gris_quartz_7039', label: 'Gris quartz RAL 7039', hex: '#6C6960', categorie: 'gris', coefPrix: 1.12 },

  // ── Noirs ────────────────────────────────────────────
  { id: 'noir_9005', label: 'Noir profond RAL 9005', hex: '#0A0A0A', categorie: 'noir', coefPrix: 1.1 },

  // ── Bois ─────────────────────────────────────────────
  { id: 'chene_dore', label: 'Chêne doré', hex: '#C8983C', categorie: 'bois', coefPrix: 1.2 },
  { id: 'chene_fonce', label: 'Chêne foncé', hex: '#6B4226', categorie: 'bois', coefPrix: 1.2 },
  { id: 'chene_naturel', label: 'Chêne naturel', hex: '#B8860B', categorie: 'bois', coefPrix: 1.18 },
  { id: 'chene_naturel_int', label: 'Chêne naturel (intérieur)', hex: '#B8860B', categorie: 'bois', coefPrix: 1.18 },
  { id: 'noyer', label: 'Noyer', hex: '#5C3317', categorie: 'bois', coefPrix: 1.22 },
  { id: 'acajou', label: 'Acajou', hex: '#6B2A2A', categorie: 'bois', coefPrix: 1.22 },
  { id: 'pin_naturel', label: 'Pin naturel', hex: '#DEB887', categorie: 'bois', coefPrix: 1.0 },
  { id: 'pin_naturel_int', label: 'Pin naturel (intérieur)', hex: '#DEB887', categorie: 'bois', coefPrix: 1.0 },
  { id: 'meranti', label: 'Méranti', hex: '#8B4513', categorie: 'bois', coefPrix: 1.15 },

  // ── Couleurs ─────────────────────────────────────────
  { id: 'bleu_5010', label: 'Bleu gentiane RAL 5010', hex: '#0E4C92', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'vert_6005', label: 'Vert mousse RAL 6005', hex: '#1B4D3E', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'rouge_3004', label: 'Rouge pourpre RAL 3004', hex: '#75151E', categorie: 'couleur', coefPrix: 1.15 },
  { id: 'blanc_laque', label: 'Blanc laqué', hex: '#FFFFFF', categorie: 'couleur', coefPrix: 1.1 },
  { id: 'gris_laque', label: 'Gris laqué', hex: '#808080', categorie: 'couleur', coefPrix: 1.12 },
  { id: 'noir_laque', label: 'Noir laqué', hex: '#1A1A1A', categorie: 'couleur', coefPrix: 1.12 },

  // ── Métalliques ──────────────────────────────────────
  { id: 'bronze', label: 'Bronze', hex: '#8C7853', categorie: 'metallique', coefPrix: 1.25 },
  { id: 'inox_brosse', label: 'Inox brossé', hex: '#C0C0C0', categorie: 'metallique', coefPrix: 1.3 },

  // ── Sur mesure ───────────────────────────────────────
  { id: 'ral_sur_mesure', label: 'RAL sur mesure', hex: '#CCCCCC', categorie: 'couleur', coefPrix: 1.35 },
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
