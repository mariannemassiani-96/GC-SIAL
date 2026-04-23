// ── Analyse des compositions de vitrage isolant ──────────────────────
// Parse les désignations de double/triple vitrage pour extraire :
// - Composition (ex: 4/16/4, 44.2/16/4, 6/16/4 argon)
// - Face extérieure et intérieure (type de verre, épaisseur)
// - Intercalaire (type, largeur)
// - Gaz (air, argon, krypton)
// - Dimensions (largeur × hauteur en mm)
// - Surface en m²
// - Caractéristiques (phonique, sécurité, solaire, etc.)

export interface CompositionVitrage {
  composition: string;         // ex: "4/16Ar/4BE"
  faceExterieure: string;      // ex: "4mm clair"
  faceInterieure: string;      // ex: "4mm BE (basse émissivité)"
  intercalaire: string;        // ex: "16mm warm edge"
  gaz: string;                 // ex: "Argon"
  epaisseurTotale: number;     // mm
  nbVerres: number;            // 2 ou 3
  caracteristiques: string[];  // ['phonique', 'securite', 'solaire', etc.]
}

export interface VitrageFacture {
  id: string;
  ref: string;
  designation: string;
  composition: CompositionVitrage;
  largeurMM: number;
  hauteurMM: number;
  surfaceM2: number;
  qte: number;
  surfaceTotaleM2: number;
  prixUnitaireHT: number;
  totalHT: number;
  fournisseur: string;
  dateFacture: string;
  annee: string;
  mois: string;
  semaine: string;
}

// ── Parser de composition ────────────────────────────────────────────

export function parseComposition(designation: string): CompositionVitrage {
  const desc = designation.toUpperCase();
  const result: CompositionVitrage = {
    composition: '',
    faceExterieure: '',
    faceInterieure: '',
    intercalaire: '',
    gaz: 'Air',
    epaisseurTotale: 0,
    nbVerres: 2,
    caracteristiques: [],
  };

  // Détecter la composition x/y/z ou x/y/z/w/v
  const compMatch = designation.match(/(\d+(?:\.\d)?)\s*[\/\-]\s*(\d+)\s*(?:AR|ARGON|KR)?\s*[\/\-]\s*(\d+(?:\.\d)?)/i);
  const tripleMatch = designation.match(/(\d+(?:\.\d)?)\s*[\/\-]\s*(\d+)\s*(?:AR)?\s*[\/\-]\s*(\d+(?:\.\d)?)\s*[\/\-]\s*(\d+)\s*(?:AR)?\s*[\/\-]\s*(\d+(?:\.\d)?)/i);

  if (tripleMatch) {
    result.nbVerres = 3;
    const [, v1, i1, v2, i2, v3] = tripleMatch;
    result.faceExterieure = `${v1}mm`;
    result.faceInterieure = `${v3}mm`;
    result.intercalaire = `${i1}mm + ${i2}mm`;
    result.epaisseurTotale = Number(v1) + Number(i1) + Number(v2) + Number(i2) + Number(v3);
    result.composition = `${v1}/${i1}/${v2}/${i2}/${v3}`;
  } else if (compMatch) {
    const [, v1, intercalaire, v2] = compMatch;
    result.faceExterieure = `${v1}mm`;
    result.faceInterieure = `${v2}mm`;
    result.intercalaire = `${intercalaire}mm`;
    result.epaisseurTotale = Number(v1) + Number(intercalaire) + Number(v2);
    result.composition = `${v1}/${intercalaire}/${v2}`;
  }

  // Détecter le gaz
  if (/ARGON|\/AR\//i.test(desc) || /\bAR\b/.test(desc)) result.gaz = 'Argon';
  if (/KRYPTON|\/KR\//i.test(desc)) result.gaz = 'Krypton';

  // Détecter le type de verre
  if (/44[\.,]2|FEUILLET/i.test(desc)) {
    result.faceExterieure += ' feuillete';
    result.caracteristiques.push('securite');
  }
  if (/33[\.,]1/i.test(desc)) {
    result.faceExterieure += ' feuillete';
    result.caracteristiques.push('securite');
  }
  if (/BE\b|BASSE.?[EÉ]MIS|LOW.?E/i.test(desc)) {
    result.faceInterieure += ' BE';
    result.caracteristiques.push('basse emissivite');
  }
  if (/PLANITHERM|THERMOCONTROL|SGG/i.test(desc)) {
    result.caracteristiques.push('haute performance');
  }
  if (/PHONIQUE|ACOUST|PHON/i.test(desc)) {
    result.caracteristiques.push('phonique');
  }
  if (/SOLAIRE|SOLAR|COOL.?LITE|ANTELIO/i.test(desc)) {
    result.caracteristiques.push('controle solaire');
  }
  if (/TREMPE|SECURIT|ESG/i.test(desc)) {
    result.caracteristiques.push('trempe');
  }
  if (/DEPOLI|SATINE|OPAQUE|SABLE/i.test(desc)) {
    result.caracteristiques.push('depoli');
  }
  if (/WARM.?EDGE|TGI|SWISSPACER|CHROMATECH/i.test(desc)) {
    result.intercalaire += ' warm edge';
  }

  return result;
}

// ── Extraire les dimensions d'une désignation ────────────────────────

export function parseDimensionsVitrage(designation: string): { largeurMM: number; hauteurMM: number } {
  // Formats courants : 1200x800, 1200 x 800, 1200*800, L1200 H800
  const match = designation.match(/(\d{3,4})\s*[x×\*]\s*(\d{3,4})/i);
  if (match) return { largeurMM: Number(match[1]), hauteurMM: Number(match[2]) };

  const matchLH = designation.match(/L\s*(\d{3,4}).*H\s*(\d{3,4})/i);
  if (matchLH) return { largeurMM: Number(matchLH[1]), hauteurMM: Number(matchLH[2]) };

  return { largeurMM: 0, hauteurMM: 0 };
}

// ── Calculer le numéro de semaine ISO ────────────────────────────────

export function getISOWeek(dateStr: string): string {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `${d.getFullYear()}-S${weekNum.toString().padStart(2, '0')}`;
}

// ── Données démo vitrages ────────────────────────────────────────────

export const DEMO_VITRAGES: VitrageFacture[] = [
  { id: 'V1', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 1290x1535', composition: parseComposition('4/16Ar/4BE'), largeurMM: 1290, hauteurMM: 1535, surfaceM2: 1.98, qte: 4, surfaceTotaleM2: 7.92, prixUnitaireHT: 42.50, totalHT: 170.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-06-15', annee: '2025', mois: '2025-06', semaine: '2025-S24' },
  { id: 'V2', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 800x1200', composition: parseComposition('4/16Ar/4BE'), largeurMM: 800, hauteurMM: 1200, surfaceM2: 0.96, qte: 12, surfaceTotaleM2: 11.52, prixUnitaireHT: 28.00, totalHT: 336.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-06-20', annee: '2025', mois: '2025-06', semaine: '2025-S25' },
  { id: 'V3', ref: 'VI-44216-4', designation: '44.2/16Ar/4BE securite 1000x2100', composition: parseComposition('44.2/16Ar/4BE securite'), largeurMM: 1000, hauteurMM: 2100, surfaceM2: 2.10, qte: 6, surfaceTotaleM2: 12.60, prixUnitaireHT: 85.00, totalHT: 510.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-07-10', annee: '2025', mois: '2025-07', semaine: '2025-S28' },
  { id: 'V4', ref: 'VI-6164-PH', designation: '6/16Ar/4BE phonique 700x1200', composition: parseComposition('6/16Ar/4BE phonique'), largeurMM: 700, hauteurMM: 1200, surfaceM2: 0.84, qte: 8, surfaceTotaleM2: 6.72, prixUnitaireHT: 38.00, totalHT: 304.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-08-05', annee: '2025', mois: '2025-08', semaine: '2025-S32' },
  { id: 'V5', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 1400x1200', composition: parseComposition('4/16Ar/4BE'), largeurMM: 1400, hauteurMM: 1200, surfaceM2: 1.68, qte: 10, surfaceTotaleM2: 16.80, prixUnitaireHT: 38.50, totalHT: 385.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-09-01', annee: '2025', mois: '2025-09', semaine: '2025-S36' },
  { id: 'V6', ref: 'VI-10164-PH', designation: '10/16Ar/4BE phonique cl4 900x1400', composition: parseComposition('10/16Ar/4BE phonique cl4'), largeurMM: 900, hauteurMM: 1400, surfaceM2: 1.26, qte: 4, surfaceTotaleM2: 5.04, prixUnitaireHT: 55.00, totalHT: 220.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-09-15', annee: '2025', mois: '2025-09', semaine: '2025-S38' },
  { id: 'V7', ref: 'VI-4124124', designation: '4/12Ar/4/12Ar/4BE triple 1200x1000', composition: parseComposition('4/12Ar/4/12Ar/4BE triple'), largeurMM: 1200, hauteurMM: 1000, surfaceM2: 1.20, qte: 6, surfaceTotaleM2: 7.20, prixUnitaireHT: 72.00, totalHT: 432.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-10-01', annee: '2025', mois: '2025-10', semaine: '2025-S40' },
  { id: 'V8', ref: 'VI-4164-SOL', designation: '4/16Ar/4BE solaire CoolLite 1500x2100', composition: parseComposition('4/16Ar/4BE solaire CoolLite'), largeurMM: 1500, hauteurMM: 2100, surfaceM2: 3.15, qte: 3, surfaceTotaleM2: 9.45, prixUnitaireHT: 95.00, totalHT: 285.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-11-12', annee: '2025', mois: '2025-11', semaine: '2025-S46' },
  { id: 'V9', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 600x800', composition: parseComposition('4/16Ar/4BE'), largeurMM: 600, hauteurMM: 800, surfaceM2: 0.48, qte: 20, surfaceTotaleM2: 9.60, prixUnitaireHT: 18.00, totalHT: 360.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2025-12-01', annee: '2025', mois: '2025-12', semaine: '2025-S49' },
  { id: 'V10', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 1000x1200', composition: parseComposition('4/16Ar/4BE'), largeurMM: 1000, hauteurMM: 1200, surfaceM2: 1.20, qte: 15, surfaceTotaleM2: 18.00, prixUnitaireHT: 32.00, totalHT: 480.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2026-01-15', annee: '2026', mois: '2026-01', semaine: '2026-S03' },
  { id: 'V11', ref: 'VI-44216-4', designation: '44.2/16Ar/4BE securite 900x2150', composition: parseComposition('44.2/16Ar/4BE securite'), largeurMM: 900, hauteurMM: 2150, surfaceM2: 1.94, qte: 8, surfaceTotaleM2: 15.48, prixUnitaireHT: 82.00, totalHT: 656.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2026-02-10', annee: '2026', mois: '2026-02', semaine: '2026-S07' },
  { id: 'V12', ref: 'VI-4164-BE', designation: '4/16Ar/4BE 700x1000', composition: parseComposition('4/16Ar/4BE'), largeurMM: 700, hauteurMM: 1000, surfaceM2: 0.70, qte: 25, surfaceTotaleM2: 17.50, prixUnitaireHT: 22.00, totalHT: 550.00, fournisseur: 'Vitrage Insulaire', dateFacture: '2026-03-05', annee: '2026', mois: '2026-03', semaine: '2026-S10' },
];
