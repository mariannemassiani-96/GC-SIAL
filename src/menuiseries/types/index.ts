// ─── Types du configurateur menuiseries ───────────────────────────────

// ── Produits ──────────────────────────────────────────────────────────

export type TypeProduit =
  | 'fenetre'
  | 'porte_fenetre'
  | 'baie_vitree'
  | 'porte_entree'
  | 'volet_roulant'
  | 'store'
  | 'pergola'
  | 'portail';

export interface TypeProduitDef {
  id: TypeProduit;
  label: string;
  description: string;
  icon: string; // nom icône lucide-react
  materiauxDisponibles: MateriauId[];
  formesDisponibles: FormeId[];
  ouverturesDisponibles: TypeOuvertureId[];
  hasVitrage: boolean;
  hasVoletIntegre: boolean;
}

// ── Matériaux ─────────────────────────────────────────────────────────

export type MateriauId = 'pvc' | 'bois' | 'aluminium' | 'bois_alu' | 'pvc_alu';

export interface MateriauDef {
  id: MateriauId;
  label: string;
  description: string;
  avantages: string[];
  coefPrix: number; // multiplicateur sur le prix de base
  couleursDisponibles: CouleurId[];
}

// ── Profilés ──────────────────────────────────────────────────────────

export interface ProfileDef {
  id: string;
  label: string;
  materiau: MateriauId;
  epaisseur: number; // mm
  isolation: 'standard' | 'renforcee' | 'premium';
  uw: number; // coefficient thermique W/(m².K)
  coefPrix: number;
}

// ── Formes ────────────────────────────────────────────────────────────

export type FormeId =
  | 'rectangulaire'
  | 'cintre'
  | 'arc_surbaisse'
  | 'trapeze'
  | 'triangle'
  | 'rond'
  | 'oeil_de_boeuf';

export interface FormeDef {
  id: FormeId;
  label: string;
  description: string;
  minVantaux: number;
  maxVantaux: number;
  supportsImposte: boolean;
  supportsAllege: boolean;
}

// ── Ouvertures ────────────────────────────────────────────────────────

export type TypeOuvertureId =
  | 'fixe'
  | 'battant_gauche'
  | 'battant_droit'
  | 'oscillo_battant_gauche'
  | 'oscillo_battant_droit'
  | 'coulissant'
  | 'oscillo_coulissant'
  | 'soulevant_coulissant'
  | 'galandage'
  | 'a_soufflet';

export interface TypeOuvertureDef {
  id: TypeOuvertureId;
  label: string;
  description: string;
  icon: string;
  compatibleFormes: FormeId[];
  coefPrix: number;
}

// ── Vitrages ──────────────────────────────────────────────────────────

export type TypeVitrageId =
  | 'double_standard'
  | 'double_phonique'
  | 'double_securite'
  | 'double_solaire'
  | 'triple_standard'
  | 'triple_phonique'
  | 'triple_securite';

export interface VitrageDef {
  id: TypeVitrageId;
  label: string;
  description: string;
  ug: number; // coef thermique vitrage W/(m².K)
  affaiblissement: number; // dB — isolation phonique
  classeSecurite?: string; // P1A, P2A, etc.
  coefPrix: number;
}

// ── Couleurs ──────────────────────────────────────────────────────────

export type CouleurId = string; // RAL code ou identifiant

export interface CouleurDef {
  id: CouleurId;
  label: string;
  hex: string; // code couleur pour l'aperçu
  categorie: 'blanc' | 'gris' | 'noir' | 'bois' | 'couleur' | 'metallique';
  coefPrix: number;
}

// ── Poignées ──────────────────────────────────────────────────────────

export interface PoigneeDef {
  id: string;
  label: string;
  description: string;
  materiauxCompatibles: MateriauId[];
  coefPrix: number;
}

// ── Volets roulants ───────────────────────────────────────────────────

export type TypeVoletId = 'manuel_sangle' | 'manuel_manivelle' | 'electrique' | 'solaire';

export interface VoletRoulantDef {
  id: TypeVoletId;
  label: string;
  description: string;
  coefPrix: number;
}

export type PoseVoletId = 'neuf_coffre_tunnel' | 'neuf_coffre_exterieur' | 'renovation';

export interface PoseVoletDef {
  id: PoseVoletId;
  label: string;
  description: string;
}

// ── Ferrures / Sécurité ──────────────────────────────────────────────

export type NiveauSecuriteId = 'standard' | 'renforcee' | 'anti_effraction_rc1' | 'anti_effraction_rc2';

export interface SecuriteDef {
  id: NiveauSecuriteId;
  label: string;
  description: string;
  coefPrix: number;
}

// ── Stores ────────────────────────────────────────────────────────────

export type TypeStoreId =
  | 'enrouleur'
  | 'plisse'
  | 'venitien'
  | 'occultant'
  | 'brise_soleil'
  | 'store_banne';

export interface StoreDef {
  id: TypeStoreId;
  label: string;
  description: string;
  prixBase: number;
  coefPrixM2: number;
}

// ── Pergolas ──────────────────────────────────────────────────────────

export type TypePergolaId = 'adossee' | 'autoportante' | 'bioclimatique';

export interface PergolaDef {
  id: TypePergolaId;
  label: string;
  description: string;
  prixBase: number;
  coefPrixM2: number;
}

// ── Portails ──────────────────────────────────────────────────────────

export type TypePortailId = 'battant' | 'coulissant' | 'portillon';
export type StylePortailId = 'plein' | 'ajoure' | 'semi_ajoure' | 'barreaudage';

export interface PortailDef {
  id: TypePortailId;
  label: string;
  styles: StylePortailId[];
  prixBase: number;
}

// ── Configuration complète d'un produit ──────────────────────────────

export interface VantailConfig {
  ouverture: TypeOuvertureId;
  largeur: number; // mm — calculé automatiquement si identique
}

export interface VoletConfig {
  type: TypeVoletId;
  pose: PoseVoletId;
  couleur: CouleurId;
  motorisation?: 'filaire' | 'radio';
}

export interface ConfigMenuiserie {
  id: string;
  typeProduit: TypeProduit;

  // Step 2 — Matériau
  materiau: MateriauId;
  profil: string;

  // Step 3 — Forme & dimensions
  forme: FormeId;
  nbVantaux: number;
  imposte: boolean;
  allege: boolean;
  largeur: number; // mm total
  hauteur: number; // mm total
  hauteurAllege?: number; // mm
  hauteurImposte?: number; // mm

  // Step 4 — Ouvertures
  vantaux: VantailConfig[];

  // Step 5 — Vitrage
  vitrage: TypeVitrageId;
  classeSecurite?: NiveauSecuriteId;

  // Step 6 — Couleurs
  couleurExterieure: CouleurId;
  couleurInterieure: CouleurId;
  bicolore: boolean;

  // Step 7 — Options
  poignee: string;
  croisillons: boolean;
  typeCroisillon?: 'integre' | 'colle' | 'viennois';
  voletRoulant?: VoletConfig;
  securite: NiveauSecuriteId;
  appuiFenetre?: 'pvc' | 'alu' | 'pierre';

  // Métadonnées
  qte: number;
  notes?: string;
}

// ── Panier / Devis ───────────────────────────────────────────────────

export interface LigneDevis {
  label: string;
  description?: string;
  qte: number;
  prixUnitaire: number;
  prixTotal: number;
}

export interface DevisMenuiserie {
  id: string;
  ref: string;
  dateCreation: string;
  client: ClientInfo;
  lignes: LigneDevis[];
  totalHT: number;
  tva: number;
  totalTTC: number;
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse';
}

export interface ClientInfo {
  nom: string;
  societe?: string;
  email: string;
  telephone: string;
  adresse: string;
  codePostal: string;
  ville: string;
}

// ── Panier ────────────────────────────────────────────────────────────

export interface PanierItem {
  config: ConfigMenuiserie;
  prixUnitaire: number;
  prixTotal: number;
  lignesDetail: LigneDevis[];
}

export interface Panier {
  id: string;
  items: PanierItem[];
  client: ClientInfo;
  dateCreation: string;
  dateLivraisonEstimee?: string;
  totalHT: number;
  tva: number;
  totalTTC: number;
}

// ── État du wizard ───────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface WizardState {
  currentStep: WizardStep;
  maxStepReached: WizardStep;
  config: Partial<ConfigMenuiserie>;
  prixEstime: number;
  isValid: boolean;
  erreurs: string[];
}

// ── Prix ──────────────────────────────────────────────────────────────

export interface CalculPrix {
  prixBase: number;
  coefMateriau: number;
  coefVitrage: number;
  coefOuverture: number;
  coefCouleur: number;
  coefOptions: number;
  prixVolet: number;
  prixAccessoires: number;
  prixUnitaireHT: number;
  qte: number;
  totalHT: number;
  tva: number;
  totalTTC: number;
  details: LigneDevis[];
}
