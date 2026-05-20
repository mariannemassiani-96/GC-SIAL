import type { Vitrage, WEPiece, WEBarre, WEGroupe, WESettings } from './types';
import { DEFAULT_WE } from './types';

function calcDeduction(dim: number): number {
  if (dim < 1800) return 30;
  if (dim <= 2000) return 31;
  return 32;
}

export function generateWEPieces(vitrages: Vitrage[]): WEPiece[] {
  const pieces: WEPiece[] = [];
  for (const v of vitrages) {
    const court = Math.min(v.largeur, v.hauteur);
    const long = Math.max(v.largeur, v.hauteur);
    const ref = `${v.protoNum} ${v.variante}`;
    for (let i = 0; i < 2; i++) {
      pieces.push({ longueur: court - calcDeduction(court), origDim: court, cote: 'court', vitrageRef: ref });
    }
    for (let i = 0; i < 2; i++) {
      pieces.push({ longueur: long - calcDeduction(long), origDim: long, cote: 'long', vitrageRef: ref });
    }
  }
  return pieces;
}

export function optimizeWE(
  vitrages: Vitrage[],
  settings: WESettings = DEFAULT_WE,
): WEGroupe[] {
  const { barreLength, marge, kerf } = settings;
  const usable = barreLength - 2 * marge;

  const groups = new Map<string, Vitrage[]>();
  for (const v of vitrages) {
    const key = `${v.intercalaireEpaisseur}|${v.intercalaireCouleur}`;
    const arr = groups.get(key) ?? [];
    arr.push(v);
    groups.set(key, arr);
  }

  const result: WEGroupe[] = [];
  for (const [key, gVitrages] of groups) {
    const [epStr, couleur] = key.split('|');
    const epaisseur = parseInt(epStr);
    const pieces = generateWEPieces(gVitrages);
    const sorted = [...pieces].sort((a, b) => b.longueur - a.longueur);

    const barres: WEBarre[] = [];
    for (const piece of sorted) {
      let placed = false;
      for (const barre of barres) {
        const needed = barre.pieces.length > 0 ? piece.longueur + kerf : piece.longueur;
        if (barre.utilise + needed <= usable) {
          barre.pieces.push(piece);
          barre.utilise += needed;
          barre.chute = usable - barre.utilise;
          placed = true;
          break;
        }
      }
      if (!placed) {
        barres.push({
          numero: barres.length + 1,
          pieces: [piece],
          utilise: piece.longueur,
          chute: usable - piece.longueur,
        });
      }
    }
    barres.forEach((b, i) => (b.numero = i + 1));

    const totalUtilise = barres.reduce((s, b) => s + b.utilise, 0);
    const totalDispo = barres.length * usable;

    result.push({
      epaisseur,
      couleur,
      pieces: sorted,
      barres,
      totalPieces: pieces.length,
      totalBarres: barres.length,
      tauxUtilisation: totalDispo > 0 ? totalUtilise / totalDispo : 0,
      chuteTotal: barres.reduce((s, b) => s + b.chute, 0),
    });
  }
  return result;
}
