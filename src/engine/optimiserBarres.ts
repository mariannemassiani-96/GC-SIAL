import { LG_BARRE_MM, LG_COUPE_MAX_MM, PROFILS } from '../constants/profils';
import type { OptimResultat, BarreOptim } from '../types';

const DECALAGE_MC = 200;
const REFS_MAIN_COURANTE = new Set(['180030', '180032', '180033']);

interface PieceAOptimiser {
  longueur: number;
  qte: number;
  ref: string;
  label: string;
  traveeRef: string;
}

export function optimiserBarres(pieces: PieceAOptimiser[]): OptimResultat[] {
  const parRef = new Map<string, PieceAOptimiser[]>();
  for (const p of pieces) {
    if (p.longueur <= 0) continue;
    const existing = parRef.get(p.ref) ?? [];
    existing.push(p);
    parRef.set(p.ref, existing);
  }

  const resultats: OptimResultat[] = [];

  for (const [ref, piecesRef] of parRef.entries()) {
    const isMainCourante = REFS_MAIN_COURANTE.has(ref);
    const flat: { longueur: number; label: string; traveeRef: string }[] = [];
    for (const p of piecesRef) {
      for (let i = 0; i < p.qte; i++) {
        if (p.longueur > LG_COUPE_MAX_MM) {
          const nbSegments = Math.ceil(p.longueur / LG_COUPE_MAX_MM);
          const longueurBase = Math.ceil(p.longueur / nbSegments);
          let restant = p.longueur;
          for (let seg = 1; seg <= nbSegments; seg++) {
            let coupe: number;
            if (isMainCourante && nbSegments > 1) {
              if (seg === 1) {
                coupe = Math.min(restant, longueurBase + DECALAGE_MC);
              } else {
                coupe = Math.min(restant, longueurBase);
              }
            } else {
              coupe = Math.min(restant, longueurBase);
            }
            if (coupe > LG_COUPE_MAX_MM) coupe = LG_COUPE_MAX_MM;
            flat.push({ longueur: coupe, label: `${p.label} (seg.${seg}/${nbSegments})`, traveeRef: p.traveeRef });
            restant -= coupe;
          }
        } else {
          flat.push({ longueur: p.longueur, label: p.label, traveeRef: p.traveeRef });
        }
      }
    }

    flat.sort((a, b) => b.longueur - a.longueur);

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
