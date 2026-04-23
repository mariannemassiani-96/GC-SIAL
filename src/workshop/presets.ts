import type { Objet, ObjetType, NiveauId } from './types';

export interface Preset {
  nom: string;
  type: ObjetType;
  largeur: number; // cm
  hauteur: number; // cm
  couleur?: string;
  capacite?: number;
  notes?: string;
}

/** Préréglages typiques d'une menuiserie aluminium (dimensions réalistes). */
export const PRESETS_MENUISERIE_ALU: Preset[] = [
  // Coupe
  { nom: 'Double Tête', type: 'machine', largeur: 700, hauteur: 250, couleur: '#2563eb' },
  { nom: 'Simple Tête', type: 'machine', largeur: 300, hauteur: 200, couleur: '#2563eb' },
  { nom: 'Modus', type: 'machine', largeur: 400, hauteur: 300, couleur: '#1d4ed8' },
  { nom: 'Délignueuse', type: 'machine', largeur: 500, hauteur: 200, couleur: '#2563eb' },
  { nom: 'Scie Intercalaire', type: 'machine', largeur: 300, hauteur: 150, couleur: '#1e40af' },
  { nom: 'Sciage Renforts', type: 'machine', largeur: 350, hauteur: 180, couleur: '#1e40af' },

  // Postes de montage
  { nom: 'Montage Frappe', type: 'poste', largeur: 250, hauteur: 150, couleur: '#10b981' },
  { nom: 'Ferrage Frappe', type: 'poste', largeur: 250, hauteur: 150, couleur: '#10b981' },
  { nom: 'Montage Coulissant Galandage', type: 'poste', largeur: 300, hauteur: 150, couleur: '#059669' },
  { nom: 'Rémontage Ouvrant', type: 'poste', largeur: 200, hauteur: 120, couleur: '#10b981' },
  { nom: 'ASS Intercalaire', type: 'poste', largeur: 200, hauteur: 120, couleur: '#10b981' },
  { nom: 'Menuiserie Hors Standard', type: 'poste', largeur: 400, hauteur: 250, couleur: '#047857' },

  // Vitrage
  { nom: 'Vitrage Frappe', type: 'poste', largeur: 400, hauteur: 200, couleur: '#0ea5e9' },
  { nom: 'Vitrage Coulissant', type: 'poste', largeur: 400, hauteur: 200, couleur: '#0ea5e9' },

  // Stocks
  { nom: 'Stock Double Tête + Mezzanine', type: 'stock', largeur: 600, hauteur: 300, couleur: '#8b5cf6' },
  { nom: 'Stock Renforts', type: 'stock', largeur: 300, hauteur: 150, couleur: '#8b5cf6' },
  { nom: 'Chariots', type: 'stock_tampon', largeur: 200, hauteur: 100, couleur: '#ec4899', capacite: 20 },

  // Expédition
  { nom: 'Déligneuse / Préparation', type: 'poste', largeur: 250, hauteur: 150, couleur: '#10b981' },
];

/** Mobilier atelier générique (tables, établis, convoyeurs, civières, palettes, chariots…). */
export const PRESETS_MOBILIER_ATELIER: Preset[] = [
  { nom: 'Table de pose', type: 'poste', largeur: 300, hauteur: 120, couleur: '#10b981' },
  { nom: 'Table de pose grande', type: 'poste', largeur: 400, hauteur: 150, couleur: '#059669' },
  { nom: 'Table de montage', type: 'poste', largeur: 250, hauteur: 120, couleur: '#10b981' },
  { nom: 'Établi', type: 'poste', largeur: 200, hauteur: 80, couleur: '#10b981' },
  { nom: 'Établi double', type: 'poste', largeur: 300, hauteur: 80, couleur: '#10b981' },
  { nom: 'Convoyeur à rouleaux', type: 'convoyeur', largeur: 400, hauteur: 60, couleur: '#f59e0b' },
  { nom: 'Convoyeur à bande', type: 'convoyeur', largeur: 500, hauteur: 80, couleur: '#f59e0b' },
  { nom: 'Convoyeur courbe', type: 'convoyeur', largeur: 150, hauteur: 150, couleur: '#f59e0b' },
  { nom: 'Civière / transfert', type: 'stock_tampon', largeur: 200, hauteur: 80, couleur: '#ec4899' },
  { nom: 'Palette EUR', type: 'stock_tampon', largeur: 120, hauteur: 80, couleur: '#ec4899', capacite: 1 },
  { nom: 'Palette US / 120×100', type: 'stock_tampon', largeur: 120, hauteur: 100, couleur: '#ec4899', capacite: 1 },
  { nom: 'Chariot à profilés', type: 'stock_tampon', largeur: 700, hauteur: 80, couleur: '#db2777', capacite: 50, notes: 'Barres 6-7 m' },
  { nom: 'Chariot manutention', type: 'stock_tampon', largeur: 100, hauteur: 60, couleur: '#ec4899' },
  { nom: 'Chariot élévateur', type: 'vehicule', largeur: 120, hauteur: 200, couleur: '#f97316' },
  { nom: 'Transpalette', type: 'vehicule', largeur: 80, hauteur: 160, couleur: '#f97316' },
  { nom: 'Rack profilés', type: 'stock', largeur: 700, hauteur: 120, couleur: '#8b5cf6', notes: 'Stockage vertical barres' },
  { nom: 'Rack pièces finies', type: 'stock', largeur: 300, hauteur: 100, couleur: '#8b5cf6' },
];

/** Préréglages Bureau (espace tertiaire). */
export const PRESETS_BUREAU: Preset[] = [
  { nom: 'Bureau', type: 'bureau', largeur: 160, hauteur: 80, couleur: '#0ea5e9' },
  { nom: 'Bureau double', type: 'bureau', largeur: 160, hauteur: 160, couleur: '#0ea5e9' },
  { nom: 'Poste direction', type: 'bureau', largeur: 200, hauteur: 100, couleur: '#0369a1' },
  { nom: 'Salle de réunion', type: 'salle', largeur: 500, hauteur: 350, couleur: '#0891b2' },
  { nom: 'Salle de pause', type: 'salle', largeur: 400, hauteur: 300, couleur: '#0891b2' },
  { nom: 'Vestiaires', type: 'salle', largeur: 400, hauteur: 300, couleur: '#06b6d4' },
  { nom: 'Sanitaires', type: 'salle', largeur: 250, hauteur: 200, couleur: '#06b6d4' },
  { nom: 'Archives', type: 'salle', largeur: 300, hauteur: 200, couleur: '#6366f1' },
  { nom: 'Armoire', type: 'armoire', largeur: 100, hauteur: 50, couleur: '#6366f1' },
  { nom: 'Armoire haute', type: 'armoire', largeur: 120, hauteur: 60, couleur: '#6366f1' },
  { nom: 'Imprimante / copieur', type: 'equipement', largeur: 80, hauteur: 70, couleur: '#14b8a6' },
  { nom: 'Machine à café', type: 'equipement', largeur: 60, hauteur: 50, couleur: '#14b8a6' },
  { nom: 'Frigo', type: 'equipement', largeur: 70, hauteur: 70, couleur: '#14b8a6' },
  { nom: 'Escalier mezzanine', type: 'equipement', largeur: 100, hauteur: 250, couleur: '#6b7280' },
];

/** Préréglages extérieur / site. */
export const PRESETS_EXTERIEUR: Preset[] = [
  { nom: 'Place parking VL', type: 'parking', largeur: 250, hauteur: 500, couleur: '#64748b' },
  { nom: 'Place parking PMR', type: 'parking', largeur: 330, hauteur: 500, couleur: '#2563eb' },
  { nom: 'Place poids-lourd', type: 'parking', largeur: 350, hauteur: 1200, couleur: '#475569' },
  { nom: 'Quai de chargement', type: 'exterieur', largeur: 400, hauteur: 300, couleur: '#f59e0b' },
  { nom: 'Portail coulissant', type: 'porte', largeur: 600, hauteur: 30, couleur: '#fbbf24' },
  { nom: 'Porte piétonne', type: 'porte', largeur: 100, hauteur: 20, couleur: '#fbbf24' },
  { nom: 'Porte sectionnelle', type: 'porte', largeur: 400, hauteur: 30, couleur: '#f59e0b' },
  { nom: 'Voie circulation', type: 'exterieur', largeur: 600, hauteur: 400, couleur: '#a3a3a3' },
  { nom: 'Espace vert', type: 'exterieur', largeur: 400, hauteur: 400, couleur: '#84cc16' },
  { nom: 'Stock extérieur', type: 'stock', largeur: 600, hauteur: 400, couleur: '#8b5cf6' },
  { nom: 'Benne / déchets', type: 'exterieur', largeur: 250, hauteur: 200, couleur: '#78716c' },
  { nom: 'Véhicule utilitaire', type: 'vehicule', largeur: 200, hauteur: 500, couleur: '#475569' },
  { nom: 'Camion', type: 'vehicule', largeur: 250, hauteur: 1200, couleur: '#374151' },
];

export const PRESET_PACKS: { id: string; label: string; presets: Preset[] }[] = [
  { id: 'menuiserie_alu', label: 'Menuiserie aluminium', presets: PRESETS_MENUISERIE_ALU },
  { id: 'mobilier', label: 'Mobilier atelier', presets: PRESETS_MOBILIER_ATELIER },
  { id: 'bureau', label: 'Bureau / tertiaire', presets: PRESETS_BUREAU },
  { id: 'exterieur', label: 'Extérieur / site', presets: PRESETS_EXTERIEUR },
];

export function presetToObjet(p: Preset, id: string, niveau: NiveauId, x: number, y: number): Objet {
  return {
    id,
    type: p.type,
    nom: p.nom,
    niveau,
    x,
    y,
    largeur: p.largeur,
    hauteur: p.hauteur,
    rotation: 0,
    couleur: p.couleur,
    operateurs: [],
    capacite: p.capacite,
    notes: p.notes,
  };
}
