export type CommandeStatut = 'en_attente' | 'en_cours' | 'terminee' | 'livree';

export interface LotFabrication {
  verreExt: string;
  verreInt: string;
  intercalaire: string;
  dessiccant: string;
  masticButyl: string;
  masticPU: string;
  gazArgon: string;
  notes: string;
}

export const EMPTY_LOT: LotFabrication = {
  verreExt: '', verreInt: '', intercalaire: '',
  dessiccant: '', masticButyl: '', masticPU: '', gazArgon: '', notes: '',
};

export interface Commande {
  id: string;
  reference: string;
  client: string;
  dateCreation: string;
  semaineFabrication: string;
  semaineLivraison: string;
  statut: CommandeStatut;
  vitrages: Vitrage[];
  lotFabrication: LotFabrication;
  notes: string;
}

export interface Vitrage {
  id: string;
  reference: string;
  variante: 'V1' | 'V2';
  largeur: number;
  hauteur: number;
  composition: string;
  intercalaireEpaisseur: number;
  intercalaireCouleur: string;
  outerGlass: string;
  innerGlass: string;
}

export interface GlassPiece {
  vitrageId: string;
  vitrageRef: string;
  width: number;
  height: number;
  material: string;
  face: 'EXT' | 'INT';
}

export interface PlacedPiece extends GlassPiece {
  x: number;
  y: number;
  rotated: boolean;
}

export interface OptimizedPlate {
  numero: number;
  material: string;
  plateWidth: number;
  plateHeight: number;
  pieces: PlacedPiece[];
  utilisation: number;
}

export interface GlassOptimResult {
  material: string;
  plates: OptimizedPlate[];
  totalPlates: number;
  totalPieces: number;
  tauxUtilisation: number;
}

export interface WEPiece {
  longueur: number;
  origDim: number;
  cote: 'court' | 'long';
  vitrageRef: string;
}

export interface WEBarre {
  numero: number;
  pieces: WEPiece[];
  utilise: number;
  chute: number;
}

export interface WEGroupe {
  epaisseur: number;
  couleur: string;
  pieces: WEPiece[];
  barres: WEBarre[];
  totalPieces: number;
  totalBarres: number;
  tauxUtilisation: number;
  chuteTotal: number;
}

export interface AverySettings {
  paddingLeft: number;
  paddingRight: number;
  paddingTop: number;
  paddingBottom: number;
}

export interface WESettings {
  barreLength: number;
  marge: number;
  kerf: number;
}

export interface GlassSettings {
  plateWidth: number;
  plateHeight: number;
  cuttingGap: number;
}

export interface IsulaStore {
  commandes: Commande[];
  averySettings: AverySettings;
  weSettings: WESettings;
  glassSettings: GlassSettings;
}

export const DEFAULT_AVERY: AverySettings = {
  paddingLeft: 4,
  paddingRight: 3,
  paddingTop: 2,
  paddingBottom: 2,
};

export const DEFAULT_WE: WESettings = {
  barreLength: 6000,
  marge: 20,
  kerf: 5,
};

export const DEFAULT_GLASS: GlassSettings = {
  plateWidth: 3210,
  plateHeight: 2550,
  cuttingGap: 5,
};

export const STATUT_LABELS: Record<CommandeStatut, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  terminee: 'Terminee',
  livree: 'Livree',
};

export const STATUT_COLORS: Record<CommandeStatut, string> = {
  en_attente: 'text-gray-400 bg-gray-500/20 border-gray-500/30',
  en_cours: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  terminee: 'text-green-400 bg-green-500/20 border-green-500/30',
  livree: 'text-purple-400 bg-purple-500/20 border-purple-500/30',
};
