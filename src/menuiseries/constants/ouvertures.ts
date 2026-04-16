import type { TypeOuvertureDef, FormeDef, PoigneeDef, SecuriteDef, VoletRoulantDef, PoseVoletDef } from '../types';

// ─── Formes calquées sur fenetre24.com ────────────────────────────────

export const FORMES: FormeDef[] = [
  { id: 'rectangulaire', label: 'Rectangulaire', description: 'Forme standard', minVantaux: 1, maxVantaux: 4, supportsImposte: true, supportsAllege: true },
  { id: 'cintre', label: 'Plein cintre', description: 'Arc-de-cercle complet en partie haute', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: true },
  { id: 'arc_surbaisse', label: 'Arc surbaissé', description: 'Partie haute légèrement arrondie', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: true },
  { id: 'trapeze', label: 'Trapèze', description: 'Angles individuels pour toits en pente', minVantaux: 1, maxVantaux: 2, supportsImposte: false, supportsAllege: false },
  { id: 'triangle', label: 'Triangle', description: 'Lucarnes et pignons de toit', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
  { id: 'rond', label: 'Ronde', description: 'Fenêtre ronde — œil-de-bœuf', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
  { id: 'oeil_de_boeuf', label: 'Œil-de-bœuf ovale', description: 'Forme ovale décorative', minVantaux: 1, maxVantaux: 1, supportsImposte: false, supportsAllege: false },
];

// ─── Types d'ouverture calqués sur fenetre24.com ──────────────────────

export const TYPES_OUVERTURES: TypeOuvertureDef[] = [
  { id: 'fixe', label: 'Fixe', description: 'Vitrage fixe, non ouvrant — lumière sans ventilation', icon: 'Square', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse', 'trapeze', 'triangle', 'rond', 'oeil_de_boeuf'], coefPrix: 0.85 },
  { id: 'battant_gauche', label: 'Battant gauche (à la française)', description: 'Charnières à gauche — ouverture classique vers l\'intérieur', icon: 'PanelLeft', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse'], coefPrix: 1.0 },
  { id: 'battant_droit', label: 'Battant droit (à la française)', description: 'Charnières à droite — ouverture classique vers l\'intérieur', icon: 'PanelRight', compatibleFormes: ['rectangulaire', 'cintre', 'arc_surbaisse'], coefPrix: 1.0 },
  { id: 'oscillo_battant_gauche', label: 'Oscillo-battant gauche', description: 'Battant + basculant — charnières à gauche, le plus populaire', icon: 'PanelLeft', compatibleFormes: ['rectangulaire'], coefPrix: 1.15 },
  { id: 'oscillo_battant_droit', label: 'Oscillo-battant droit', description: 'Battant + basculant — charnières à droite, le plus populaire', icon: 'PanelRight', compatibleFormes: ['rectangulaire'], coefPrix: 1.15 },
  { id: 'a_soufflet', label: 'À soufflet (oscillant)', description: 'Bascule uniquement par le haut — idéal salles de bain et caves', icon: 'PanelTop', compatibleFormes: ['rectangulaire'], coefPrix: 1.05 },
  { id: 'coulissant', label: 'Coulissant', description: 'Vantail coulissant latéral — gain de place', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.25 },
  { id: 'oscillo_coulissant', label: 'Oscillo-coulissant (à translation)', description: 'Bascule vers l\'avant puis coulisse — baies grandes dimensions', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.4 },
  { id: 'soulevant_coulissant', label: 'Soulevant-coulissant (HST)', description: 'Le vantail se soulève puis coulisse — étanchéité maximale, grandes baies', icon: 'MoveHorizontal', compatibleFormes: ['rectangulaire'], coefPrix: 1.55 },
  { id: 'galandage', label: 'À galandage', description: 'Le vantail disparaît dans le mur — ouverture totale', icon: 'ArrowRightFromLine', compatibleFormes: ['rectangulaire'], coefPrix: 1.7 },
];

// ─── Poignées — 7 modèles comme fenetre24 ─────────────────────────────

export const POIGNEES: PoigneeDef[] = [
  { id: 'poignee_std_blanc', label: 'Standard blanche', description: 'Crémone PVC blanche classique', materiauxCompatibles: ['pvc', 'bois', 'pvc_alu'], coefPrix: 1.0 },
  { id: 'poignee_std_argent', label: 'Standard argent', description: 'Crémone argent / aluminium brossé', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.05 },
  { id: 'poignee_std_noir', label: 'Standard noire', description: 'Crémone noire mate', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.05 },
  { id: 'poignee_design_inox', label: 'Design inox brossé', description: 'Poignée design épurée en inox brossé', materiauxCompatibles: ['aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.3 },
  { id: 'poignee_design_noir_mat', label: 'Design noir mat', description: 'Poignée design noir mat tendance', materiauxCompatibles: ['aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.3 },
  { id: 'poignee_securite_bouton', label: 'Sécurité à bouton poussoir', description: 'Verrouillage par bouton poussoir — anti-effraction', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.2 },
  { id: 'poignee_securite_cle', label: 'Sécurité à clé', description: 'Verrouillage par clé — sécurité renforcée enfants et effraction', materiauxCompatibles: ['pvc', 'bois', 'aluminium', 'bois_alu', 'pvc_alu', 'acier'], coefPrix: 1.25 },
];

// ─── Sécurité ferrures ────────────────────────────────────────────────

export const NIVEAUX_SECURITE: SecuriteDef[] = [
  { id: 'standard', label: 'Standard', description: 'Ferrure standard avec points de fermeture', coefPrix: 1.0 },
  { id: 'renforcee', label: 'Renforcée', description: 'Ferrure multi-points, gâches anti-dégondage', coefPrix: 1.15 },
  { id: 'anti_effraction_rc1', label: 'Anti-effraction RC1', description: 'Résistance effraction RC1 (NF EN 1627) — serrure 3 points', coefPrix: 1.35 },
  { id: 'anti_effraction_rc2', label: 'Anti-effraction RC2', description: 'Résistance effraction RC2 (NF EN 1627) — serrure 5 points, champignons', coefPrix: 1.55 },
];

// ─── Options portes d'entrée ──────────────────────────────────────────

export const OPTIONS_PORTE_ENTREE = {
  serrures: [
    { id: 'serrure_3pts', label: 'Serrure 3 points', coefPrix: 1.0 },
    { id: 'serrure_5pts', label: 'Serrure 5 points', coefPrix: 1.25 },
  ],
  options: [
    { id: 'gache_electrique', label: 'Gâche électrique', prix: 120 },
    { id: 'barre_tirage', label: 'Barre de tirage', prix: 85 },
    { id: 'barre_tirage_led', label: 'Barre de tirage avec éclairage LED', prix: 180 },
    { id: 'lecteur_empreinte', label: 'Lecteur d\'empreinte digitale', prix: 350 },
    { id: 'digicode', label: 'Digicode', prix: 250 },
    { id: 'judas_optique', label: 'Judas optique', prix: 35 },
    { id: 'judas_numerique', label: 'Judas numérique', prix: 150 },
  ],
};

// ─── Croisillons — 3 types comme fenetre24 ────────────────────────────

export const TYPES_CROISILLONS = [
  { id: 'helima', label: 'Croisillons Helima (intégrés)', description: 'Barres aluminium intégrées dans le vitrage — entretien nul', largeurs: [18, 26, 45], coefPrix: 1.08 },
  { id: 'wiener', label: 'Croisillons Wiener (collés)', description: 'Petits-bois collés sur le vitrage intérieur et extérieur', largeurs: [18, 26, 45], coefPrix: 1.06 },
  { id: 'vrais', label: 'Vrais croisillons (structurels)', description: 'Vrais petits-bois séparant les vitrages — aspect authentique', largeurs: [26, 45], coefPrix: 1.18 },
];

// ─── Volets roulants ──────────────────────────────────────────────────
// Fenetre24 : intégré ou extérieur, coffre arrondi ou rectangulaire
// Motorisation : sangle, manivelle, INEL filaire, Somfy ILMO, Somfy Oximo IO, solaire

export const VOLETS_ROULANTS: VoletRoulantDef[] = [
  { id: 'manuel_sangle', label: 'Manuel à sangle', description: 'Enroulement par sangle — économique', coefPrix: 1.0 },
  { id: 'manuel_manivelle', label: 'Manuel à manivelle', description: 'Enroulement par treuil à manivelle', coefPrix: 1.15 },
  { id: 'electrique_inel', label: 'Électrique INEL filaire', description: 'Moteur INEL filaire avec interrupteur', coefPrix: 1.5 },
  { id: 'electrique_somfy_ilmo', label: 'Électrique Somfy ILMO', description: 'Moteur Somfy ILMO filaire — fiable et silencieux', coefPrix: 1.65 },
  { id: 'electrique_somfy_oximo', label: 'Somfy Oximo IO (radio)', description: 'Moteur Somfy Oximo IO radiocommandé — domotique compatible', coefPrix: 1.85 },
  { id: 'solaire', label: 'Solaire', description: 'Moteur solaire — sans câblage, autonome', coefPrix: 2.1 },
];

export const POSES_VOLET: PoseVoletDef[] = [
  { id: 'neuf_coffre_tunnel', label: 'Coffre intégré tunnel (neuf)', description: 'Coffre intégré dans le linteau — invisible' },
  { id: 'neuf_coffre_exterieur', label: 'Coffre extérieur (neuf)', description: 'Coffre visible en façade' },
  { id: 'ext_coffre_arrondi', label: 'Coffre extérieur arrondi', description: 'Coffre arrondi en façade — discret' },
  { id: 'ext_coffre_rectangulaire', label: 'Coffre extérieur rectangulaire', description: 'Coffre rectangulaire en façade — classique' },
  { id: 'renovation', label: 'Rénovation', description: 'Coffre posé sur la menuiserie existante' },
];

export const TABLIER_VOLET = [
  { id: 'lames_pvc', label: 'Lames PVC', description: 'Tablier en lames PVC — économique et léger', coefPrix: 1.0 },
  { id: 'lames_alu', label: 'Lames aluminium', description: 'Tablier en lames alu — robuste et anti-effraction', coefPrix: 1.3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────

export function getFormeDef(id: string): FormeDef | undefined {
  return FORMES.find((f) => f.id === id);
}

export function getOuverturesForForme(formeId: string): TypeOuvertureDef[] {
  return TYPES_OUVERTURES.filter((o) => o.compatibleFormes.includes(formeId as never));
}

export function getPoigneesForMateriau(materiauId: string): PoigneeDef[] {
  return POIGNEES.filter((p) => p.materiauxCompatibles.includes(materiauId as never));
}
