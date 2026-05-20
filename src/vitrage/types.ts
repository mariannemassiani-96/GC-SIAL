export interface Vitrage {
  id: string;
  commande: string;
  proto: string;
  protoNum: string;
  variante: 'V1' | 'V2';
  largeur: number;
  hauteur: number;
  composition: string;
  intercalaireEpaisseur: number;
  intercalaireCouleur: string;
  outerGlass: string;
  innerGlass: string;
}

export interface Plaque {
  numero: number;
  qte: number;
  materiau: string;
  largeur: number;
  hauteur: number;
  pieces: PlaquePiece[];
}

export interface PlaquePiece {
  numero: number;
  reference: string;
  largeur: number;
  hauteur: number;
  qte: number;
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

export interface VitrageStore {
  vitrages: Vitrage[];
  plaques: Plaque[];
  commandeLabel: string;
  averySettings: AverySettings;
  weSettings: WESettings;
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
