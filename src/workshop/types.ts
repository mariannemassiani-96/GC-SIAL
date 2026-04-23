// Toutes les distances sont en centimètres en interne, affichées en mètres.

export type ObjetType =
  | 'machine'
  | 'poste'
  | 'convoyeur'
  | 'stock'
  | 'stock_tampon'
  | 'zone'
  | 'mur'
  | 'porte'
  | 'fenetre'
  | 'colonne'
  | 'bureau'
  | 'armoire'
  | 'salle'
  | 'equipement'
  | 'parking'
  | 'vehicule'
  | 'exterieur'
  | 'piece';

export type NiveauId = string; // ex: "rdc", "r+1"

export interface Niveau {
  id: NiveauId;
  nom: string;
  /** Ordre vertical : 0 = RDC, 1 = R+1 (mezzanine), … */
  ordre: number;
  /** Hauteur sous plafond en cm (ex: 350 cm en atelier, 250 cm en mezzanine) */
  hauteurSousPlafond: number;
}

export interface Objet {
  id: string;
  type: ObjetType;
  nom: string;
  /** Niveau auquel appartient l'objet (rdc, r+1, …) */
  niveau: NiveauId;
  /** Coin supérieur gauche (cm) avant rotation */
  x: number;
  y: number;
  /** Dimensions non-tournées (cm) */
  largeur: number;
  hauteur: number;
  /** Rotation en degrés (0, 90, 180, 270) */
  rotation: 0 | 90 | 180 | 270;
  couleur?: string;
  operateurs: string[];
  capacite?: number;
  stockActuel?: number;
  tempsCycle?: number;
  notes?: string;
}

export type ContrainteType =
  | 'distance_min'
  | 'distance_max'
  | 'alignement_x'
  | 'alignement_y'
  | 'adjacent';

export interface Contrainte {
  id: string;
  type: ContrainteType;
  objetA: string;
  objetB: string;
  /** Valeur en cm pour distance_min / distance_max */
  valeur?: number;
}

export interface Flux {
  id: string;
  from: string;
  to: string;
  /** Pièces par heure */
  debit: number;
  label?: string;
}

export interface Batiment {
  /** Coin haut-gauche du bâtiment dans le site (cm) */
  x: number;
  y: number;
  /** Emprise extérieure du bâtiment (cm) */
  largeur: number;
  hauteur: number;
  /** Épaisseur des murs extérieurs (cm) */
  epaisseurMurs: number;
}

export interface Plan {
  id: string;
  nom: string;
  date: string;
  /** Dimensions du site total — bâtiment + parking + extérieurs (cm) */
  largeurSite: number;
  hauteurSite: number;
  /** Rectangle du bâtiment posé dans le site */
  batiment: Batiment;
  /** Pas de la grille (cm) */
  tailleGrille: number;
  /** Niveaux : RDC + mezzanine(s) éventuelle(s) */
  niveaux: Niveau[];
  objets: Objet[];
  contraintes: Contrainte[];
  flux: Flux[];
}

export interface ViolationContrainte {
  contrainte: Contrainte;
  message: string;
  distance?: number;
}
