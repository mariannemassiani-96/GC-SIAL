import type { MateriauDef, ProfileDef } from '../types';

// ─── Matériaux calqués sur fenetre24.com ──────────────────────────────
// PVC (Aluplast), Bois (pin, chêne, méranti, mélèze, eucalyptus),
// Aluminium, Bois-Alu, PVC-Alu, Acier (portes d'entrée)

export const MATERIAUX: MateriauDef[] = [
  {
    id: 'pvc',
    label: 'PVC',
    description: 'Profilés Aluplast multi-chambres — excellent rapport qualité-prix, entretien zéro',
    avantages: [
      'Prix attractif',
      'Entretien quasi-nul',
      'Très bonne isolation thermique',
      'Résistant aux intempéries',
      'Large choix de décors (Aludec, Woodec)',
    ],
    coefPrix: 1.0,
    couleursDisponibles: [
      'blanc_9016', 'creme_9001',
      'gris_anthracite_7016', 'gris_quartz_7039', 'gris_agate_7038',
      'noir_jet_9005',
      'chene_dore', 'chene_irlandais', 'noyer', 'douglas', 'chene_marais',
      'aludec_anthracite', 'aludec_gris_clair',
      'woodec_chene_turner', 'woodec_chene_sheffield',
    ],
  },
  {
    id: 'bois',
    label: 'Bois',
    description: 'Fenêtres en bois massif — pin, chêne, méranti, mélèze ou eucalyptus',
    avantages: [
      'Matériau naturel et chaleureux',
      'Excellente isolation thermique',
      'Écologique et durable',
      'Personnalisable (teinture, laque, RAL)',
      'Choix d\'essences nobles',
    ],
    coefPrix: 1.35,
    couleursDisponibles: [
      'bois_pin_naturel', 'bois_chene_naturel', 'bois_meranti', 'bois_meleze', 'bois_eucalyptus',
      'bois_laque_blanc', 'bois_laque_gris_7016', 'bois_laque_noir_9005',
      'bois_teinte_chene_clair', 'bois_teinte_chene_fonce', 'bois_teinte_noyer', 'bois_teinte_acajou',
      'ral_sur_mesure',
    ],
  },
  {
    id: 'aluminium',
    label: 'Aluminium',
    description: 'Profilés alu à rupture de pont thermique — design épuré, profilés fins, durabilité',
    avantages: [
      'Design moderne, profilés fins',
      'Durabilité maximale',
      'Aucun entretien',
      'Toutes les couleurs RAL',
      'Idéal grandes dimensions',
    ],
    coefPrix: 1.55,
    couleursDisponibles: [
      'blanc_9016', 'creme_9001',
      'gris_anthracite_7016', 'gris_quartz_7039', 'gris_agate_7038',
      'gris_brun_8019', 'gris_clair_7035', 'gris_fenetre_7040',
      'noir_jet_9005', 'noir_de_sécurité_9011',
      'bleu_gentiane_5010', 'vert_mousse_6005', 'rouge_rubis_3003', 'rouge_pourpre_3004',
      'brun_chocolat_8017', 'bronze_metallic',
      'ral_sur_mesure',
    ],
  },
  {
    id: 'bois_alu',
    label: 'Bois-Aluminium',
    description: 'Le meilleur des deux mondes — bois chaleureux à l\'intérieur, alu résistant à l\'extérieur',
    avantages: [
      'Chaleur du bois intérieur',
      'Protection alu extérieur',
      'Isolation thermique maximale',
      'Aucun entretien côté extérieur',
      'Toutes les couleurs RAL extérieur',
    ],
    coefPrix: 1.85,
    couleursDisponibles: [
      // Extérieur alu
      'blanc_9016', 'gris_anthracite_7016', 'gris_quartz_7039', 'noir_jet_9005',
      'gris_brun_8019', 'bronze_metallic', 'ral_sur_mesure',
      // Intérieur bois
      'bois_pin_naturel', 'bois_chene_naturel', 'bois_meranti',
      'bois_laque_blanc', 'bois_laque_gris_7016',
    ],
  },
  {
    id: 'pvc_alu',
    label: 'PVC-Aluminium',
    description: 'PVC intérieur avec habillage alu extérieur — économique et moderne',
    avantages: [
      'Prix contenu',
      'Habillage alu extérieur design',
      'Entretien réduit',
      'Bonne isolation',
      'Couleurs RAL extérieur',
    ],
    coefPrix: 1.3,
    couleursDisponibles: [
      'blanc_9016', 'creme_9001',
      'gris_anthracite_7016', 'gris_quartz_7039', 'noir_jet_9005',
      'gris_brun_8019', 'ral_sur_mesure',
      // Intérieur PVC
      'aludec_anthracite',
    ],
  },
  {
    id: 'acier',
    label: 'Acier',
    description: 'Portes d\'entrée en acier — robustesse et sécurité anti-effraction maximale',
    avantages: [
      'Robustesse exceptionnelle',
      'Sécurité anti-effraction',
      'Isolation thermique renforcée',
      'Résistance aux chocs',
    ],
    coefPrix: 1.7,
    couleursDisponibles: [
      'blanc_9016', 'gris_anthracite_7016', 'noir_jet_9005',
      'gris_brun_8019', 'ral_sur_mesure',
    ],
  },
];

// ─── Profilés par matériau ────────────────────────────────────────────
// Fenetre24 utilise Aluplast (IDEAL série) pour le PVC

export const PROFILS: ProfileDef[] = [
  // ── PVC — Aluplast ──
  { id: 'aluplast_ideal_4000', label: 'Aluplast IDEAL 4000', materiau: 'pvc', epaisseur: 70, isolation: 'standard', uw: 1.3, coefPrix: 1.0 },
  { id: 'aluplast_ideal_5000', label: 'Aluplast IDEAL 5000', materiau: 'pvc', epaisseur: 70, isolation: 'standard', uw: 1.2, coefPrix: 1.05 },
  { id: 'aluplast_ideal_7000', label: 'Aluplast IDEAL 7000', materiau: 'pvc', epaisseur: 76, isolation: 'renforcee', uw: 1.1, coefPrix: 1.15 },
  { id: 'aluplast_energeto_8000', label: 'Aluplast Energeto 8000', materiau: 'pvc', epaisseur: 82, isolation: 'premium', uw: 0.95, coefPrix: 1.3 },
  { id: 'aluplast_energeto_view', label: 'Aluplast Energeto View', materiau: 'pvc', epaisseur: 82, isolation: 'premium', uw: 0.90, coefPrix: 1.4 },

  // ── Bois ──
  { id: 'bois_iv68', label: 'Bois IV 68', materiau: 'bois', epaisseur: 68, isolation: 'standard', uw: 1.4, coefPrix: 1.0 },
  { id: 'bois_iv78', label: 'Bois IV 78', materiau: 'bois', epaisseur: 78, isolation: 'renforcee', uw: 1.2, coefPrix: 1.15 },
  { id: 'bois_iv92', label: 'Bois IV 92', materiau: 'bois', epaisseur: 92, isolation: 'premium', uw: 1.0, coefPrix: 1.35 },

  // ── Aluminium ──
  { id: 'alu_mb70', label: 'Alu MB-70', materiau: 'aluminium', epaisseur: 70, isolation: 'standard', uw: 1.6, coefPrix: 1.0 },
  { id: 'alu_mb70hi', label: 'Alu MB-70 HI', materiau: 'aluminium', epaisseur: 70, isolation: 'renforcee', uw: 1.3, coefPrix: 1.2 },
  { id: 'alu_mb86', label: 'Alu MB-86 SI', materiau: 'aluminium', epaisseur: 86, isolation: 'premium', uw: 1.0, coefPrix: 1.45 },

  // ── Bois-Alu ──
  { id: 'bois_alu_iv78', label: 'Bois-Alu IV 78', materiau: 'bois_alu', epaisseur: 78, isolation: 'renforcee', uw: 1.1, coefPrix: 1.0 },
  { id: 'bois_alu_iv92', label: 'Bois-Alu IV 92', materiau: 'bois_alu', epaisseur: 92, isolation: 'premium', uw: 0.9, coefPrix: 1.25 },

  // ── PVC-Alu ──
  { id: 'pvc_alu_ideal_7000', label: 'PVC-Alu IDEAL 7000', materiau: 'pvc_alu', epaisseur: 76, isolation: 'renforcee', uw: 1.1, coefPrix: 1.0 },
  { id: 'pvc_alu_energeto_8000', label: 'PVC-Alu Energeto 8000', materiau: 'pvc_alu', epaisseur: 82, isolation: 'premium', uw: 0.95, coefPrix: 1.2 },

  // ── Acier (portes) ──
  { id: 'acier_thermo46', label: 'Acier Thermo46', materiau: 'acier', epaisseur: 46, isolation: 'standard', uw: 1.5, coefPrix: 1.0 },
  { id: 'acier_thermo65', label: 'Acier Thermo65', materiau: 'acier', epaisseur: 65, isolation: 'renforcee', uw: 1.1, coefPrix: 1.3 },
];

// ── Essences de bois disponibles (détail pour matériau bois) ──
export const ESSENCES_BOIS = [
  { id: 'pin', label: 'Pin', description: 'Bois tendre, économique, bonne base de peinture', coefPrix: 1.0 },
  { id: 'chene', label: 'Chêne', description: 'Bois noble et très résistant, finition naturelle', coefPrix: 1.4 },
  { id: 'meranti', label: 'Méranti', description: 'Bois tropical imputrescible, excellente durabilité', coefPrix: 1.2 },
  { id: 'meleze', label: 'Mélèze', description: 'Bois résineux européen très résistant, belle veinure', coefPrix: 1.25 },
  { id: 'eucalyptus', label: 'Eucalyptus', description: 'Bois dur et écologique, très résistant en extérieur', coefPrix: 1.15 },
  { id: 'sapin', label: 'Sapin / Épicéa', description: 'Bois tendre classique, économique', coefPrix: 0.95 },
];

export function getMateriauDef(id: string): MateriauDef | undefined {
  return MATERIAUX.find((m) => m.id === id);
}

export function getProfilsForMateriauId(materiauId: string): ProfileDef[] {
  return PROFILS.filter((p) => p.materiau === materiauId);
}
