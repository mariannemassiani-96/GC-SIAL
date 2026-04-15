import type { MateriauDef, ProfileDef } from '../types';

export const MATERIAUX: MateriauDef[] = [
  {
    id: 'pvc',
    label: 'PVC',
    description: 'Excellent rapport qualité-prix, entretien facile, bonne isolation',
    avantages: ['Économique', 'Entretien facile', 'Bonne isolation thermique', 'Résistant aux intempéries'],
    coefPrix: 1.0,
    couleursDisponibles: ['blanc_9016', 'gris_7016', 'gris_9007', 'noir_9005', 'chene_dore', 'chene_fonce', 'noyer', 'acajou', 'creme_9001', 'gris_7035', 'gris_7040', 'bleu_5010', 'vert_6005', 'rouge_3004'],
  },
  {
    id: 'bois',
    label: 'Bois',
    description: 'Chaleureux et naturel, excellente isolation, écologique',
    avantages: ['Naturel et chaleureux', 'Excellente isolation', 'Écologique', 'Personnalisable'],
    coefPrix: 1.35,
    couleursDisponibles: ['pin_naturel', 'chene_naturel', 'meranti', 'blanc_laque', 'gris_laque', 'noir_laque', 'ral_sur_mesure'],
  },
  {
    id: 'aluminium',
    label: 'Aluminium',
    description: 'Design moderne, profilés fins, durabilité maximale',
    avantages: ['Design épuré', 'Profilés fins', 'Durable', 'Large choix de couleurs RAL'],
    coefPrix: 1.55,
    couleursDisponibles: ['blanc_9016', 'gris_7016', 'gris_9007', 'noir_9005', 'anthracite_7016', 'gris_quartz_7039', 'blanc_creme_9001', 'bleu_5010', 'vert_6005', 'rouge_3004', 'bronze', 'inox_brosse', 'ral_sur_mesure'],
  },
  {
    id: 'bois_alu',
    label: 'Bois-Aluminium',
    description: 'Le meilleur des deux mondes : bois à l\'intérieur, alu à l\'extérieur',
    avantages: ['Chaleur du bois intérieur', 'Résistance alu extérieur', 'Isolation maximale', 'Sans entretien extérieur'],
    coefPrix: 1.85,
    couleursDisponibles: ['blanc_9016', 'gris_7016', 'gris_9007', 'noir_9005', 'anthracite_7016', 'bronze', 'inox_brosse', 'chene_naturel_int', 'pin_naturel_int', 'ral_sur_mesure'],
  },
  {
    id: 'pvc_alu',
    label: 'PVC-Aluminium',
    description: 'PVC intérieur avec habillage aluminium extérieur',
    avantages: ['Économique', 'Habillage alu extérieur', 'Entretien réduit', 'Design moderne'],
    coefPrix: 1.3,
    couleursDisponibles: ['blanc_9016', 'gris_7016', 'gris_9007', 'noir_9005', 'anthracite_7016', 'ral_sur_mesure'],
  },
];

export const PROFILS: ProfileDef[] = [
  // PVC
  { id: 'pvc_std_70', label: 'PVC 70mm Standard', materiau: 'pvc', epaisseur: 70, isolation: 'standard', uw: 1.3, coefPrix: 1.0 },
  { id: 'pvc_isol_76', label: 'PVC 76mm Isolation+', materiau: 'pvc', epaisseur: 76, isolation: 'renforcee', uw: 1.1, coefPrix: 1.15 },
  { id: 'pvc_prem_82', label: 'PVC 82mm Premium', materiau: 'pvc', epaisseur: 82, isolation: 'premium', uw: 0.95, coefPrix: 1.3 },

  // Bois
  { id: 'bois_std_68', label: 'Bois 68mm Classique', materiau: 'bois', epaisseur: 68, isolation: 'standard', uw: 1.4, coefPrix: 1.0 },
  { id: 'bois_isol_78', label: 'Bois 78mm Confort', materiau: 'bois', epaisseur: 78, isolation: 'renforcee', uw: 1.2, coefPrix: 1.15 },
  { id: 'bois_prem_92', label: 'Bois 92mm Prestige', materiau: 'bois', epaisseur: 92, isolation: 'premium', uw: 1.0, coefPrix: 1.35 },

  // Aluminium
  { id: 'alu_std_55', label: 'Alu 55mm Design', materiau: 'aluminium', epaisseur: 55, isolation: 'standard', uw: 1.6, coefPrix: 1.0 },
  { id: 'alu_rpt_65', label: 'Alu 65mm RPT', materiau: 'aluminium', epaisseur: 65, isolation: 'renforcee', uw: 1.3, coefPrix: 1.2 },
  { id: 'alu_prem_75', label: 'Alu 75mm Premium RPT', materiau: 'aluminium', epaisseur: 75, isolation: 'premium', uw: 1.1, coefPrix: 1.45 },

  // Bois-Alu
  { id: 'boisalu_78', label: 'Bois-Alu 78mm', materiau: 'bois_alu', epaisseur: 78, isolation: 'renforcee', uw: 1.1, coefPrix: 1.0 },
  { id: 'boisalu_92', label: 'Bois-Alu 92mm Premium', materiau: 'bois_alu', epaisseur: 92, isolation: 'premium', uw: 0.9, coefPrix: 1.25 },

  // PVC-Alu
  { id: 'pvcalu_76', label: 'PVC-Alu 76mm', materiau: 'pvc_alu', epaisseur: 76, isolation: 'renforcee', uw: 1.1, coefPrix: 1.0 },
  { id: 'pvcalu_82', label: 'PVC-Alu 82mm Premium', materiau: 'pvc_alu', epaisseur: 82, isolation: 'premium', uw: 0.95, coefPrix: 1.2 },
];

export function getMateriauDef(id: string): MateriauDef | undefined {
  return MATERIAUX.find((m) => m.id === id);
}

export function getProfilsForMateriauId(materiauId: string): ProfileDef[] {
  return PROFILS.filter((p) => p.materiau === materiauId);
}
