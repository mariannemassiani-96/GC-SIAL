// ── Preset du bâtiment SIAL Apertura — Biguglia ──────────────────────
// Reconstitué à partir du plan coté (cotes roses en cm)
// Bâtiment en forme de L/T composé de 3 blocs principaux

import { v4 as uuidv4 } from 'uuid';
import type { Plan, Objet, MurDessine } from './types';

// Dimensions lues sur le plan (cm) — approximatives, à affiner
const BLOC_HAUT_LARGEUR = 3543;   // largeur totale partie haute
const BLOC_HAUT_PROFONDEUR = 1200; // profondeur partie haute (500m² + 55m² + 275m²)

const BLOC_CENTRAL_LARGEUR = 2800; // largeur zone centrale + bureau
const BLOC_CENTRAL_PROFONDEUR = 3500; // profondeur bureau (202m²) + atelier (969m²)

const BLOC_BAS_LARGEUR = 2800;    // largeur partie basse
const BLOC_BAS_PROFONDEUR = 1700;  // profondeur partie basse (472m²)

// Positions relatives (le bloc haut est le plus large, décalé à gauche)
const SITE_LARGEUR = 5000;  // site total avec parking
const SITE_HAUTEUR = 8000;  // site total

const BAT_X = 500;  // marge gauche
const BAT_Y = 500;  // marge haut

export function createPresetSIAL(): Plan {
  const murs: MurDessine[] = [];
  const objets: Objet[] = [];
  let murIdx = 1;

  const addMur = (x1: number, y1: number, x2: number, y2: number, type: 'mur_exterieur' | 'cloison' = 'mur_exterieur') => {
    murs.push({
      id: uuidv4(), type, niveau: 'rdc',
      x1: BAT_X + x1, y1: BAT_Y + y1,
      x2: BAT_X + x2, y2: BAT_Y + y2,
      epaisseur: type === 'mur_exterieur' ? 20 : 10,
      couleur: type === 'mur_exterieur' ? '#475569' : '#64748b',
      nom: `Mur ${murIdx++}`,
    });
  };

  const addZone = (nom: string, x: number, y: number, w: number, h: number, couleur: string) => {
    objets.push({
      id: uuidv4(), type: 'zone', nom, niveau: 'rdc',
      x: BAT_X + x, y: BAT_Y + y,
      largeur: w, hauteur: h,
      rotation: 0, couleur, operateurs: [],
    });
  };

  const addPoteau = (x: number, y: number) => {
    objets.push({
      id: uuidv4(), type: 'colonne', nom: `Poteau ${objets.filter(o => o.type === 'colonne').length + 1}`,
      niveau: 'rdc', x: BAT_X + x - 15, y: BAT_Y + y - 15,
      largeur: 30, hauteur: 30, rotation: 0, couleur: '#334155', operateurs: [],
    });
  };

  // ═══════════════════════════════════════════════════════════════
  // BLOC HAUT (500m² + 55m² + 275m²) — ~3543 x 1200
  // ═══════════════════════════════════════════════════════════════

  // Murs extérieurs bloc haut
  addMur(0, 0, BLOC_HAUT_LARGEUR, 0);                          // Haut
  addMur(0, 0, 0, BLOC_HAUT_PROFONDEUR);                       // Gauche
  addMur(BLOC_HAUT_LARGEUR, 0, BLOC_HAUT_LARGEUR, BLOC_HAUT_PROFONDEUR); // Droite
  addMur(0, BLOC_HAUT_PROFONDEUR, BLOC_HAUT_LARGEUR, BLOC_HAUT_PROFONDEUR); // Bas

  // Cloisons internes bloc haut
  const sep1 = 800;   // séparation zone gauche (500m²) — environ
  addMur(sep1, 0, sep1, BLOC_HAUT_PROFONDEUR, 'cloison');

  const sep2 = 1300;  // séparation petite zone centrale (55m²)
  addMur(sep1, 0, sep2, 0, 'cloison');
  addMur(sep2, 0, sep2, 470, 'cloison');

  const sep3 = 2200;  // séparation zone droite (275m²)
  addMur(sep3, 0, sep3, BLOC_HAUT_PROFONDEUR, 'cloison');

  // Zones bloc haut
  addZone('Atelier ALU', 20, 20, sep1 - 40, BLOC_HAUT_PROFONDEUR - 40, '#1e40af');
  addZone('Local technique', sep1 + 20, 20, sep2 - sep1 - 40, 450, '#6b21a8');
  addZone('Atelier PVC', sep3 + 20, 20, BLOC_HAUT_LARGEUR - sep3 - 40, BLOC_HAUT_PROFONDEUR - 40, '#065f46');

  // ═══════════════════════════════════════════════════════════════
  // BLOC CENTRAL (Bureau 202m² + Atelier principal 969m²)
  // Décalé vers la droite par rapport au bloc haut
  // ═══════════════════════════════════════════════════════════════

  const centralX = 400;  // décalage X du bloc central
  const centralY = BLOC_HAUT_PROFONDEUR;

  // Murs extérieurs bloc central
  addMur(centralX, centralY, centralX + BLOC_CENTRAL_LARGEUR, centralY);
  addMur(centralX, centralY, centralX, centralY + BLOC_CENTRAL_PROFONDEUR);
  addMur(centralX + BLOC_CENTRAL_LARGEUR, centralY, centralX + BLOC_CENTRAL_LARGEUR, centralY + BLOC_CENTRAL_PROFONDEUR);

  // Cloison bureau / atelier
  const bureauProf = 800;
  addMur(centralX, centralY + bureauProf, centralX + BLOC_CENTRAL_LARGEUR, centralY + bureauProf, 'cloison');

  // Zone bureau
  addZone('Bureaux', centralX + 20, centralY + 20, BLOC_CENTRAL_LARGEUR - 40, bureauProf - 40, '#1e3a5f');

  // Zone atelier principal
  addZone('Atelier principal', centralX + 20, centralY + bureauProf + 20, BLOC_CENTRAL_LARGEUR - 40, BLOC_CENTRAL_PROFONDEUR - bureauProf - 40, '#0f766e');

  // ═══════════════════════════════════════════════════════════════
  // BLOC BAS (472m²) — stockage / expédition
  // ═══════════════════════════════════════════════════════════════

  const basY = centralY + BLOC_CENTRAL_PROFONDEUR;

  // Murs extérieurs bloc bas
  addMur(centralX, basY, centralX + BLOC_BAS_LARGEUR, basY);
  addMur(centralX, basY, centralX, basY + BLOC_BAS_PROFONDEUR);
  addMur(centralX + BLOC_BAS_LARGEUR, basY, centralX + BLOC_BAS_LARGEUR, basY + BLOC_BAS_PROFONDEUR);
  addMur(centralX, basY + BLOC_BAS_PROFONDEUR, centralX + BLOC_BAS_LARGEUR, basY + BLOC_BAS_PROFONDEUR);

  // Zone stockage
  addZone('Stockage / Expedition', centralX + 20, basY + 20, BLOC_BAS_LARGEUR - 40, BLOC_BAS_PROFONDEUR - 40, '#713f12');

  // ═══════════════════════════════════════════════════════════════
  // POTEAUX (rangée visible en bas du plan)
  // ═══════════════════════════════════════════════════════════════

  const poteauxY = basY + BLOC_BAS_PROFONDEUR - 100;
  for (let i = 0; i < 7; i++) {
    addPoteau(centralX + 300 + i * 350, poteauxY);
  }

  // Poteaux intérieurs atelier principal (2 visibles sur le plan)
  addPoteau(centralX + BLOC_CENTRAL_LARGEUR / 2, centralY + bureauProf + 800);
  addPoteau(centralX + BLOC_CENTRAL_LARGEUR / 2, centralY + bureauProf + 1600);

  return {
    id: uuidv4(),
    nom: 'SIAL Apertura — Biguglia',
    date: new Date().toISOString().slice(0, 10),
    largeurSite: SITE_LARGEUR,
    hauteurSite: SITE_HAUTEUR,
    batiment: {
      x: BAT_X,
      y: BAT_Y,
      largeur: BLOC_HAUT_LARGEUR,
      hauteur: BLOC_HAUT_PROFONDEUR + BLOC_CENTRAL_PROFONDEUR + BLOC_BAS_PROFONDEUR,
      epaisseurMurs: 20,
      forme: 'L',
      lBrancheX: BLOC_CENTRAL_LARGEUR + centralX,
      lBrancheY: BLOC_CENTRAL_PROFONDEUR + BLOC_BAS_PROFONDEUR,
    },
    tailleGrille: 10,
    niveaux: [
      { id: 'rdc', nom: 'RDC', ordre: 0, hauteurSousPlafond: 600 },
      { id: 'mez', nom: 'Mezzanine', ordre: 1, hauteurSousPlafond: 300 },
    ],
    objets,
    murs,
    contraintes: [],
    flux: [],
    annotations: [
      { id: uuidv4(), niveau: 'rdc', x: BAT_X + 200, y: BAT_Y + 500, texte: 'Atelier ALU\n500 m2', couleur: '#60a5fa', taille: 30 },
      { id: uuidv4(), niveau: 'rdc', x: BAT_X + sep3 + 200, y: BAT_Y + 500, texte: 'Atelier PVC\n275 m2', couleur: '#4ade80', taille: 30 },
      { id: uuidv4(), niveau: 'rdc', x: BAT_X + centralX + 200, y: BAT_Y + centralY + 200, texte: 'Bureaux\n202 m2', couleur: '#f59e0b', taille: 25 },
      { id: uuidv4(), niveau: 'rdc', x: BAT_X + centralX + 800, y: BAT_Y + centralY + bureauProf + 800, texte: 'Atelier principal\n969 m2', couleur: '#2dd4bf', taille: 35 },
      { id: uuidv4(), niveau: 'rdc', x: BAT_X + centralX + 800, y: BAT_Y + basY + 500, texte: 'Stockage\n472 m2', couleur: '#f97316', taille: 30 },
    ],
    cotations: [],
  };
}
