// ── Types SIAL Smart Assembly ─────────────────────────────────────────

export interface FercoPiece {
  qte: number;
  ref: string;
  finition: string;
  desc: string;
  casier: number;
  couleur: string;
  label: string;
  ordre: number;
  fait: boolean;
}

export interface FicheMontage {
  barcode: string;
  lot: string;
  commande: string;
  semaine: string;
  pos: number;
  type_ouverture: string;
  gamme: string;
  matiere: 'PVC' | 'ALU';
  conf: 'OF' | 'OB' | 'OS';
  lff_mm: number;
  hff_mm: number;
  hm_mm: number;
  ouverture: string;
  sens: 'R' | 'L' | '?';
  teinte: string;
  local: string;
  poids_kg: string;
  ferco: FercoPiece[];
  etape_courante: number;
  parsed_at: string;
}

export interface CasierConfig {
  id: number;
  ledIndex: number;
  couleur: string;
  label: string;
  contenu: string;
}

// ── Mapping casiers → LED (14 casiers Ferco) ─────────────────────────

export const REF_MAPPING: { pattern: RegExp; casier: number; couleur: string; label: string; ordre: number }[] = [
  { pattern: /Crémone|cremone/i,              casier: 1,  couleur: '#c8a84b', label: 'Crémone',       ordre: 1 },
  { pattern: /Renvoi d.angle/i,               casier: 2,  couleur: '#4b8fc8', label: 'Renvoi angle',  ordre: 2 },
  { pattern: /Compas OF|Compas OB|Têtière/i,  casier: 3,  couleur: '#c84b7a', label: 'Compas',        ordre: 3 },
  { pattern: /Bras de Compas/i,               casier: 3,  couleur: '#c84b7a', label: 'Bras compas',   ordre: 3 },
  { pattern: /Verrouillage latéral/i,         casier: 4,  couleur: '#7a4bc8', label: 'Verrouillage',  ordre: 4 },
  { pattern: /Verrouilleur anti/i,            casier: 5,  couleur: '#c87a4b', label: 'Anti-décr.',    ordre: 5 },
  { pattern: /Palier de compas|Support d.angle|Axe Palier|Douille/i, casier: 6, couleur: '#4bc87a', label: 'Palier/Support', ordre: 6 },
  { pattern: /Palier de Fiche|Pêne de Fiche/i, casier: 7, couleur: '#4bc8c8', label: 'Fiche interm.', ordre: 7 },
  { pattern: /Sachet|Penture|Rotation UNI/i,  casier: 8,  couleur: '#4bc87a', label: 'Sachet rot.',   ordre: 3 },
  { pattern: /Gâche Galet dormant|Gâche AD/i, casier: 9,  couleur: '#c84b4b', label: 'Gâche galet',  ordre: 8 },
  { pattern: /Gâche tringle|Gâche Batt/i,     casier: 10, couleur: '#c84b4b', label: 'Gâche tringle', ordre: 9 },
  { pattern: /Gâche Se|Gâche OB/i,            casier: 10, couleur: '#c84b4b', label: 'Gâche Se',      ordre: 8 },
  { pattern: /Limiteur|Verrou à levier/i,     casier: 11, couleur: '#c8c84b', label: 'Limiteur',     ordre: 10 },
  { pattern: /Poignée/i,                      casier: 12, couleur: '#888888', label: 'Poignée',      ordre: 11 },
  { pattern: /Cache/i,                        casier: 13, couleur: '#444444', label: 'Cache',        ordre: 12 },
  { pattern: /Anti.Fausse|AFM/i,              casier: 14, couleur: '#c8c84b', label: 'AFM',           ordre: 7 },
];

export const CASIERS: CasierConfig[] = [
  { id: 1,  ledIndex: 0,  couleur: '#c8a84b', label: 'Crémones',       contenu: 'Crémones F15 (triées par longueur)' },
  { id: 2,  ledIndex: 1,  couleur: '#4b8fc8', label: 'Renvois angle',  contenu: 'Renvois d\'angle' },
  { id: 3,  ledIndex: 2,  couleur: '#c84b7a', label: 'Compas',         contenu: 'Compas OF/OB, Têtières, Bras' },
  { id: 4,  ledIndex: 3,  couleur: '#7a4bc8', label: 'Verrouillages',  contenu: 'Verrouillages latéraux' },
  { id: 5,  ledIndex: 4,  couleur: '#c87a4b', label: 'Anti-décr.',     contenu: 'Verrouilleurs anti-décrochement' },
  { id: 6,  ledIndex: 5,  couleur: '#4bc87a', label: 'Paliers',        contenu: 'Paliers, supports, douilles, axes' },
  { id: 7,  ledIndex: 6,  couleur: '#4bc8c8', label: 'Fiches',         contenu: 'Fiches et pênes intermédiaires' },
  { id: 8,  ledIndex: 7,  couleur: '#4bc87a', label: 'Sachets rot.',   contenu: 'Sachets rotation UNI-JET C' },
  { id: 9,  ledIndex: 8,  couleur: '#c84b4b', label: 'Gâches galet',  contenu: 'Gâches galets dormant' },
  { id: 10, ledIndex: 9,  couleur: '#c84b4b', label: 'Gâches tringle', contenu: 'Gâches tringles / battement' },
  { id: 11, ledIndex: 10, couleur: '#c8c84b', label: 'Limiteurs',      contenu: 'Limiteurs, verrous à levier' },
  { id: 12, ledIndex: 11, couleur: '#888888', label: 'Poignées',       contenu: 'Poignées' },
  { id: 13, ledIndex: 12, couleur: '#444444', label: 'Caches',         contenu: 'Caches' },
  { id: 14, ledIndex: 13, couleur: '#c8c84b', label: 'AFM',            contenu: 'Anti-Fausse Manoeuvre' },
];

export function getCasierInfo(ref: string, desc: string): { casier: number; couleur: string; label: string; ordre: number } {
  const text = `${ref} ${desc}`;
  for (const mapping of REF_MAPPING) {
    if (mapping.pattern.test(text)) {
      return { casier: mapping.casier, couleur: mapping.couleur, label: mapping.label, ordre: mapping.ordre };
    }
  }
  return { casier: 0, couleur: '#555555', label: 'Autre', ordre: 99 };
}

// ── Données de démo (fiche réelle Rehau ARALYA OF 2V) ────────────────

export const DEMO_FICHE: FicheMontage = {
  barcode: '2207029970010100211',
  lot: 'L_2026-0054',
  commande: 'O_2026-0083-1',
  semaine: 'w15',
  pos: 1,
  type_ouverture: 'Ouvrant a la francaise - 2 Vantaux',
  gamme: 'Rehau ARALYA',
  matiere: 'PVC',
  conf: 'OF',
  lff_mm: 1290,
  hff_mm: 1535,
  hm_mm: 400,
  ouverture: 'Interne-Droite',
  sens: 'R',
  teinte: 'MASSE - 003 (Blanc)',
  local: 'Salon',
  poids_kg: '28,74',
  etape_courante: 0,
  parsed_at: new Date().toISOString(),
  ferco: [
    { qte: 1, ref: 'G-22158-00-0-1', finition: 'GRZ', desc: 'Cremone OB F7.5 sans rampe L1440 D400', casier: 1, couleur: '#c8a84b', label: 'Cremone', ordre: 1, fait: false },
    { qte: 1, ref: '6-32021-00-0-1', finition: 'BRUT', desc: 'Renvoi d\'angle 160/160 - Galet en haut', casier: 2, couleur: '#4b8fc8', label: 'Renvoi angle', ordre: 2, fait: false },
    { qte: 2, ref: '6-39148-20-0-1', finition: 'BRUT', desc: 'Compas OF - Axe a 13mm', casier: 3, couleur: '#c84b7a', label: 'Compas', ordre: 3, fait: false },
    { qte: 2, ref: '6-36026-06-0-1', finition: 'BRUT', desc: 'Palier de compas - diam 6mm', casier: 6, couleur: '#4bc87a', label: 'Palier', ordre: 6, fait: false },
    { qte: 2, ref: '6-36882-25-0-1', finition: 'BRUT', desc: 'Support d\'angle 100 Kg', casier: 6, couleur: '#4bc87a', label: 'Support', ordre: 6, fait: false },
    { qte: 1, ref: '6-24062-00-0-1', finition: 'BRUT', desc: 'Verrouilleur anti-decrochement', casier: 5, couleur: '#c87a4b', label: 'Anti-decr.', ordre: 5, fait: false },
    { qte: 4, ref: 'E-22369-22-0-1', finition: 'BRUT', desc: 'Palier de Fiche Intermediaire', casier: 7, couleur: '#4bc8c8', label: 'Fiche', ordre: 7, fait: false },
    { qte: 4, ref: 'E-22370-00-0-1', finition: 'BRUT', desc: 'Pene de Fiche Intermediaire', casier: 7, couleur: '#4bc8c8', label: 'Pene fiche', ordre: 7, fait: false },
    { qte: 2, ref: 'E-19736-00-0-1', finition: 'BRUT', desc: 'Gache Galet dormant de 43', casier: 9, couleur: '#c84b4b', label: 'Gache galet', ordre: 8, fait: false },
    { qte: 2, ref: 'E-19511-63-0-1', finition: 'GRZ', desc: 'Gache tringle double', casier: 10, couleur: '#c84b4b', label: 'Gache tringle', ordre: 9, fait: false },
    { qte: 2, ref: 'E-20118-00-0-1', finition: 'BRUT', desc: 'Gache Battement de 22', casier: 10, couleur: '#c84b4b', label: 'Gache battement', ordre: 9, fait: false },
    { qte: 1, ref: 'E-25228-00-0-9', finition: 'BRUT', desc: 'Limiteur de fonction OF', casier: 11, couleur: '#c8c84b', label: 'Limiteur', ordre: 10, fait: false },
    { qte: 1, ref: 'G-16890-01-0-1', finition: 'GRZ', desc: 'Verrou a levier de 120 mm', casier: 11, couleur: '#c8c84b', label: 'Verrou levier', ordre: 10, fait: false },
    { qte: 1, ref: 'G-26219-40-0-7', finition: 'GRZ', desc: 'Poignee Forceo - Blanc Ral 9016', casier: 12, couleur: '#888888', label: 'Poignee', ordre: 11, fait: false },
    { qte: 2, ref: '9-42683-01-0-7', finition: 'GRZ', desc: 'Cache support d\'angle - Blanc', casier: 13, couleur: '#444444', label: 'Cache', ordre: 12, fait: false },
    { qte: 2, ref: '9-47334-01-0-7', finition: 'GRZ', desc: 'Cache palier de compas - Blanc', casier: 13, couleur: '#444444', label: 'Cache', ordre: 12, fait: false },
  ],
};
