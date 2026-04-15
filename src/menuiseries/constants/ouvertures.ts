import type { TypeOuvertureDef, FormeDef, PoigneeDef, SecuriteDef, VoletRoulantDef, PoseVoletDef } from '../types';

export const FORMES: FormeDef[] = [
  { id: 'rectangulaire', label: 'Rectangulaire', description: 'Forme standard', minVantaux: 1, maxVantaux: 4, supportsImposte: true, supportsAllege: true },
  { id: 'cintre', label: 'Plein cintre', description: 'Partie haute arrondie en demi-cercle', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: true },
  { id: 'arc_surbaisse', label: 'Arc surbaissé', description: 'Partie haute légèrement arrondie', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: true },
  { id: 'trapeze', label: 'Trapèze', description: 'Forme trapézoïdale adaptée aux toits en pente', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: false },
  { id: 'triangle', label: 'Triangle', description: 'Forme triangulaire pour pignons', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
  { id: 'rond', label: 'Rond', description: 'Fenêtre ronde ou œil-de-bœuf', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
  { id: 'oeil_de_boeuf', label: 'Œil-de-bœuf', description: 'Forme ovale décorative', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
];

export const TYPES_OUVERTURES: TypeOuvertureDef[] = [
  { id: 'fixe', label: 'Fixe', description: 'Vitrage fixe, non ouvrant', icon: 'Square', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse', 'trapeze', 'triangle', 'rond', 'oeil_de_boeuf'], coefPrix: 0.85 },
  { id: 'battant_gauche', label: 'Battant gauche', description: 'Ouverture à la française, charnières à gauche', icon: 'PanelLeft', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse'], coefPrix: 1.0 },
  { id: 'battant_droit', label: 'Battant droit', description: 'Ouverture à la française, charnières à droite', icon: 'PanelRight', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse'], coefPrix: 1.0 },
  { id: 'oscillo_battant_gauche', label: 'Oscillo-battant gauche', description: 'Ouverture battante + basculante, charnières à gauche', icon: 'PanelLeft', compatibleFormes: ['rectangulaire'], coefPrix: 1.15 },
  { id: 'oscillo_battant_droit', label: 'Oscillo-battant droit', description: 'Ouverture battante + basculante, charnières à droite', icon: 'PanelRight', compatibleFormes: ['rectangulaire'], coefPrix: 1.15 },
  { id: 'coulissant', label: 'Coulissant', description: 'Vantail coulissant latéral', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.25 },
  { id: 'oscillo_coulissant', label: 'Oscillo-coulissant', description: 'Coulissant avec fonction oscillante', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.4 },
  { id: 'soulevant_coulissant', label: 'Soulevant-coulissant', description: 'Le vantail se soulève puis coulisse — grande étanchéité', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.55 },
  { id: 'galandage', label: 'À galandage', description: 'Le vantail disparaît dans le mur', icon: 'ArrowRightFromLine', compatibleFormes: ['rectangulaire'], coefPrix: 1.7 },
  { id: 'a_soufflet', label: 'À soufflet', description: 'Ouverture basculante par le haut uniquement', icon: 'PanelTop', compatibleFormes: ['rectangulaire'], coefPrix: 1.05 },
];

export const POIGNEES: PoigneeDef[] = [
  { id: 'std_blanc', label: 'Standard blanc', description: 'Poignée crémone blanche classique', materiauxCompatibles: ['pvc', 'bois', 'pvc_alu'], coefPrix: 1.0 },
  { id: 'std_noir', label: 'Standard noir', description: 'Poignée crémone noire', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.05 },
  { id: 'std_alu', label: 'Standard aluminium', description: 'Poignée crémone aluminium brossé', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.1 },
  { id: 'design_inox', label: 'Design inox', description: 'Poignée design en inox brossé', materiauxCompatibles: ['aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.3 },
  { id: 'design_noir_mat', label: 'Design noir mat', description: 'Poignée design noir mat tendance', materiauxCompatibles: ['aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.3 },
  { id: 'securite_cle', label: 'Sécurité à clé', description: 'Poignée verrouillable avec clé', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.2 },
  { id: 'ergonomique', label: 'Ergonomique', description: 'Poignée ergonomique pour PMR', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu'], coefPrix: 1.15 },
];

export const NIVEAUX_SECURITE: SecuriteDef[] = [
  { id: 'standard', label: 'Standard', description: 'Ferrure standard avec points de fermeture', coefPrix: 1.0 },
  { id: 'renforcee', label: 'Renforcée', description: 'Ferrure multi-points, gâches anti-dégondage', coefPrix: 1.15 },
  { id: 'anti_effraction_rc1', label: 'Anti-effraction RC1', description: 'Résistance à l\'effraction niveau RC1 (NF EN 1627)', coefPrix: 1.35 },
  { id: 'anti_effraction_rc2', label: 'Anti-effraction RC2', description: 'Résistance à l\'effraction niveau RC2 — recommandé', coefPrix: 1.55 },
];

export const VOLETS_ROULANTS: VoletRoulantDef[] = [
  { id: 'manuel_sangle', label: 'Manuel à sangle', description: 'Manœuvre par sangle — économique', coefPrix: 1.0 },
  { id: 'manuel_manivelle', label: 'Manuel à manivelle', description: 'Manœuvre par treuil à manivelle', coefPrix: 1.15 },
  { id: 'electrique', label: 'Électrique filaire', description: 'Motorisé avec interrupteur filaire', coefPrix: 1.6 },
  { id: 'solaire', label: 'Solaire', description: 'Motorisé avec capteur solaire — sans câblage', coefPrix: 2.0 },
];

export const POSES_VOLET: PoseVoletDef[] = [
  { id: 'neuf_coffre_tunnel', label: 'Coffre tunnel (neuf)', description: 'Coffre intégré dans le linteau — construction neuve' },
  { id: 'neuf_coffre_exterieur', label: 'Coffre extérieur (neuf)', description: 'Coffre visible en façade' },
  { id: 'renovation', label: 'Rénovation', description: 'Coffre posé sur la menuiserie existante' },
];

export function getFormeDef(id: string): FormeDef | undefined {
  return FORMES.find((f) => f.id === id);
}

export function getOuverturesForForme(formeId: string): TypeOuvertureDef[] {
  return TYPES_OUVERTURES.filter((o) => o.compatibleFormes.includes(formeId as never));
}

export function getPoigneesForMateriau(materiauId: string): PoigneeDef[] {
  return POIGNEES.filter((p) => p.materiauxCompatibles.includes(materiauId as never));
}
