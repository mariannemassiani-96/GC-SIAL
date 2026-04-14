import { LG_BARRE_MM, PROFILS } from '../constants/profils';
import type { OptimResultat, BarreOptim } from '../types';

interface PieceAOptimiser {
  longueur: number;
  qte: number;
  ref: string;
  label: string;
  traveeRef: string;
}

export function optimiserBarres(pieces: PieceAOptimiser[]): OptimResultat[] {
  // Regrouper par référence profilé
  const parRef = new Map<string, PieceAOptimiser[]>();
  for (const p of pieces) {
    if (p.longueur <= 0) continue;
    const existing = parRef.get(p.ref) ?? [];
    existing.push(p);
    parRef.set(p.ref, existing);
  }

  const resultats: OptimResultat[] = [];

  for (const [ref, piecesRef] of parRef.entries()) {
    // Aplatir
    const flat: { longueur: number; label: string; traveeRef: string }[] = [];
    for (const p of piecesRef) {
      for (let i = 0; i < p.qte; i++) {
        flat.push({ longueur: p.longueur, label: p.label, traveeRef: p.traveeRef });
      }
    }

    // Trier par longueur décroissante (FFD)
    flat.sort((a, b) => b.longueur - a.longueur);

    // Bin packing FFD
    const barres: BarreOptim[] = [];
    for (const piece of flat) {
      let placed = false;
      for (const barre of barres) {
        const occupe = barre.pieces.reduce((s, p) => s + p.longueur, 0);
        if (LG_BARRE_MM - occupe >= piece.longueur) {
          barre.pieces.push(piece);
          barre.chute = LG_BARRE_MM - occupe - piece.longueur;
          placed = true;
          break;
        }
      }
      if (!placed) {
        barres.push({
          pieces: [piece],
          chute: LG_BARRE_MM - piece.longueur,
        });
      }
    }

    const totalChute = barres.reduce((s, b) => s + b.chute, 0);
    const totalLongueur = barres.length * LG_BARRE_MM;

    resultats.push({
      ref,
      label: PROFILS[ref]?.label ?? ref,
      nbBarres: barres.length,
      barres,
      tauxChute: totalLongueur > 0 ? totalChute / totalLongueur : 0,
      totalPieces: flat.length,
    });
  }

  return resultats.sort((a, b) => a.ref.localeCompare(b.ref));
}
