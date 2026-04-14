export type TypeGCId =
  | 'barreau'
  | 'barreau_vide'
  | 'remplissage'
  | 'remplissage_1lisse'
  | 'remplissage_2lisses'
  | 'bateau1'
  | 'bateau2';

export type MCId = 'std' | 'design' | 'ronde';
export type PoseId = 'dalle' | 'anglaise';
export type LieuId = 'prive' | 'public';
export type FixationId = 'libre' | 'mur_d' | 'mur_g' | 'raccord90' | 'raccord_droit';
export type StatutAffaire = 'brouillon' | 'a_valider' | 'validee';

export interface Travee {
  id: string;
  etage: string;
  repere: string;
  largeur: number;
  hauteur: number;
  qte: number;
  coupeG: '90' | '45';
  coupeD: '90' | '45';
}

export interface Affaire {
  id: string;
  ref: string;
  client: string;
  chantier: string;
  date: string;
  coloris: string;
  typeGC: TypeGCId;
  pose: PoseId;
  mc: MCId;
  lieu: LieuId;
  rampant: boolean;
  angle: 0 | 10 | 20 | 30;
  fixG: FixationId;
  fixD: FixationId;
  hauteur: number;
  travees: Travee[];
  statut: StatutAffaire;
}

export interface NomenclatureItem {
  ref: string;
  label: string;
  longueur: number;
  qte: number;
  type: 'profil' | 'accessoire';
  coupeG: string;  // angle coupe gauche (ex: "90", "45")
  coupeD: string;  // angle coupe droite
}

export interface UsinageLisse {
  percageLisse: number[];
  percageLisseRaidisseur: number[];
}

export interface ResultatTravee {
  travee: Travee;
  nbRaid: number;
  entraxeEff: number;
  debRaid: number;
  h1: number;
  debBarreau: number;
  nbBarreaux: number;
  debMC: number;
  debLisse: number;
  debClosoir: number;
  longueurLisse: number;
  hautVitre: number;
  largVitre: number;
  nomenclature: NomenclatureItem[];
  usinages: UsinageLisse[];
  posRaidisseurs: number[];
  alertes: Alerte[];
}

export interface Alerte {
  niveau: 'bloquant' | 'attention' | 'info';
  message: string;
}

export interface BarreOptim {
  pieces: { longueur: number; label: string; traveeRef: string }[];
  chute: number;
}

export interface OptimResultat {
  ref: string;
  label: string;
  nbBarres: number;
  barres: BarreOptim[];
  tauxChute: number;
  totalPieces: number;
}

export interface ResultatAffaire {
  travees: ResultatTravee[];
  nomenclatureGlobale: NomenclatureItem[];
  optimBarres: OptimResultat[];
  alertes: Alerte[];
}
