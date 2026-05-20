import type { Affaire, ResultatAffaire } from '../types';
import { PROFILS, LG_BARRE_MM } from '../constants/profils';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
import { MAX_PIECE_MM } from '../constants/parametres';
import { calcPositionsUsinages } from '../engine/calcTravee';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pad(n: number, w = 5): string {
  const s = String(n);
  return s.length >= w ? s : ' '.repeat(w - s.length) + s;
}

function padF(n: number, decimals = 2): string {
  return ' ' + n.toFixed(decimals);
}

function genBCOD(jobNum: string, traveeIdx: number, barreIdx: number, pieceIdx: number): string {
  return `${jobNum.padStart(4, '0')}01946${String(traveeIdx).padStart(2, '0')}${String(barreIdx).padStart(2, '0')}${String(pieceIdx).padStart(3, '0')}`;
}

function extractJobNum(ref: string): string {
  const nums = ref.replace(/\D/g, '');
  return nums.slice(-5).padStart(5, '0');
}

function posTypeLabel(posType: CutInfo['posType']): string {
  switch (posType) {
    case 'lisse_inf': return 'Lisse INF';
    case 'lisse_sup': return 'Lisse SUP';
    case 'lisse_med': return 'Lisse MED';
    case 'mc': return 'MC';
    case 'raidisseur': return 'Raidisseur';
    case 'barreau': return 'Barreau';
    case 'closoir': return 'Closoir';
    case 'u_remplissage': return 'U Remplis.';
    case 'tube': return 'Tube';
    case 'joint': return 'Joint';
    default: return '';
  }
}

interface CutInfo {
  ref: string;
  longueur: number;
  traveeIdx: number;
  traveeRepere: string;
  coupeG: string;
  coupeD: string;
  posType: 'lisse_inf' | 'lisse_sup' | 'lisse_med' | 'mc' | 'raidisseur' | 'barreau' | 'closoir' | 'u_remplissage' | 'tube' | 'joint';
  usinages?: { wcode: string; offset: number }[];
  hauteur: number;
  segmentLabel?: string;
}

function hasMachinings(posType: CutInfo['posType']): boolean {
  return posType === 'lisse_inf' || posType === 'lisse_sup' || posType === 'lisse_med';
}

/**
 * Split a long horizontal piece into segments at raidisseur positions.
 * Returns the original piece if it fits in one bar.
 */
function splitAtRaidisseurs(
  piece: CutInfo,
  raidPositions: number[],
  fullLength: number,
): CutInfo[] {
  if (piece.longueur <= MAX_PIECE_MM) return [piece];

  const sorted = [...raidPositions].filter(p => p > 1 && p < fullLength - 1).sort((a, b) => a - b);
  if (sorted.length === 0) return [piece];

  const splitPoints: number[] = [0];
  let lastSplit = 0;

  for (const pos of sorted) {
    if (pos - lastSplit > MAX_PIECE_MM) {
      splitPoints.push(lastSplit === 0 ? sorted[0] : lastSplit);
      lastSplit = splitPoints[splitPoints.length - 1];
    }
    if (pos - lastSplit <= MAX_PIECE_MM) {
      lastSplit = pos;
    }
  }
  splitPoints.push(fullLength);

  // Deduplicate and sort
  const uniqueSplits = [...new Set(splitPoints)].sort((a, b) => a - b);

  // Merge segments that are too long (between 2 splits > MAX)
  const finalSplits: number[] = [0];
  for (let i = 1; i < uniqueSplits.length; i++) {
    const prev = finalSplits[finalSplits.length - 1];
    const curr = uniqueSplits[i];
    if (curr - prev > MAX_PIECE_MM && i < uniqueSplits.length - 1) {
      // Find the best raidisseur to split at
      const bestRaid = sorted.filter(p => p > prev && p <= prev + MAX_PIECE_MM);
      if (bestRaid.length > 0) {
        finalSplits.push(bestRaid[bestRaid.length - 1]);
      }
    }
    finalSplits.push(curr);
  }
  const cleanSplits = [...new Set(finalSplits)].sort((a, b) => a - b);

  if (cleanSplits.length <= 2) return [piece];

  const totalSegments = cleanSplits.length - 1;
  const segments: CutInfo[] = [];

  for (let i = 0; i < totalSegments; i++) {
    const segStart = cleanSplits[i];
    const segEnd = cleanSplits[i + 1];
    const segLen = Math.round((segEnd - segStart) * 10) / 10;

    // Determine cut angles for this segment
    const isFirst = i === 0;
    const isLast = i === totalSegments - 1;
    const segCoupeG = isFirst ? piece.coupeG : '90';
    const segCoupeD = isLast ? piece.coupeD : '90';

    // Filter and offset usinages for this segment
    let segUsinages: { wcode: string; offset: number }[] | undefined;
    if (piece.usinages) {
      segUsinages = piece.usinages
        .filter(u => u.offset >= segStart - 0.5 && u.offset <= segEnd + 0.5)
        .map(u => ({ wcode: u.wcode, offset: Math.round((u.offset - segStart) * 10) / 10 }));
    }

    segments.push({
      ...piece,
      longueur: segLen,
      coupeG: segCoupeG,
      coupeD: segCoupeD,
      usinages: segUsinages,
      segmentLabel: `${i + 1}/${totalSegments}`,
    });
  }

  return segments;
}

function collectCuts(_affaire: Affaire, resultat: ResultatAffaire): CutInfo[] {
  const cuts: CutInfo[] = [];

  for (let ti = 0; ti < resultat.travees.length; ti++) {
    const rt = resultat.travees[ti];
    const t = rt.travee;
    const gc = TYPES_GC[t.typeGC];
    const mc = TYPES_MC[t.mc];

    for (let q = 0; q < t.qte; q++) {
      const hCoupeG = t.coupeG;
      const hCoupeD = t.coupeD;
      const vCoupe = t.rampant && t.angle > 0 ? String(90 - t.angle) : '90';
      const qSuffix = t.qte > 1 ? ` (${q + 1}/${t.qte})` : '';

      // --- Raidisseurs (vertical, no aboutage needed) ---
      for (let r = 0; r < rt.nbRaid; r++) {
        cuts.push({
          ref: '180000', longueur: rt.debRaid, traveeIdx: ti,
          traveeRepere: t.repere + qSuffix,
          coupeG: vCoupe, coupeD: vCoupe,
          posType: 'raidisseur', hauteur: t.hauteur,
        });
      }

      // --- Horizontal profiles (may need aboutage) ---
      const baseMC: CutInfo = {
        ref: mc.ref, longueur: rt.debMC, traveeIdx: ti,
        traveeRepere: t.repere + qSuffix,
        coupeG: hCoupeG, coupeD: hCoupeD,
        posType: 'mc', hauteur: t.hauteur,
      };
      cuts.push(...splitAtRaidisseurs(baseMC, rt.posRaidisseurs, rt.longueurLisse));

      const baseClosoir: CutInfo = {
        ref: '180020', longueur: rt.debClosoir, traveeIdx: ti,
        traveeRepere: t.repere + qSuffix,
        coupeG: hCoupeG, coupeD: hCoupeD,
        posType: 'closoir', hauteur: t.hauteur,
      };
      cuts.push(...splitAtRaidisseurs(baseClosoir, rt.posRaidisseurs, rt.longueurLisse));

      // Lisses (with usinages)
      if (gc.hasBarreaux || gc.hasRemplissage) {
        const nbLisses = gc.hasLisseInter ? 3 : gc.hasBarreaux ? 2 : 1;
        const lisseUsinages = calcPositionsUsinages(rt.posRaidisseurs, rt.longueurLisse);

        for (let li = 0; li < nbLisses; li++) {
          const posType: CutInfo['posType'] = li === 0 ? 'lisse_inf' : li === 1 ? 'lisse_sup' : 'lisse_med';
          const usinages: { wcode: string; offset: number }[] = [];
          for (const pos of lisseUsinages.percageLisse) {
            usinages.push({ wcode: 'Percage Lisse', offset: pos });
          }
          for (const pos of lisseUsinages.percageLisseRaidisseur) {
            usinages.push({ wcode: 'Percage Lisse_Raidisseur', offset: pos });
          }
          usinages.sort((a, b) => a.offset - b.offset || a.wcode.localeCompare(b.wcode));

          const baseLisse: CutInfo = {
            ref: '180010', longueur: rt.longueurLisse, traveeIdx: ti,
            traveeRepere: t.repere + qSuffix,
            coupeG: hCoupeG, coupeD: hCoupeD,
            posType, usinages, hauteur: t.hauteur,
          };
          cuts.push(...splitAtRaidisseurs(baseLisse, rt.posRaidisseurs, rt.longueurLisse));
        }
      }

      // Barreaux (vertical, no aboutage)
      if (gc.hasBarreaux && rt.nbBarreaux > 0) {
        for (let b = 0; b < rt.nbBarreaux; b++) {
          cuts.push({
            ref: '180005', longueur: rt.debBarreau, traveeIdx: ti,
            traveeRepere: t.repere + qSuffix,
            coupeG: vCoupe, coupeD: vCoupe,
            posType: 'barreau', hauteur: t.hauteur,
          });
        }
      }

      // U remplissage
      if (gc.hasRemplissage) {
        for (let u = 0; u < 2; u++) {
          const baseU: CutInfo = {
            ref: '180040', longueur: rt.debLisse, traveeIdx: ti,
            traveeRepere: t.repere + qSuffix,
            coupeG: hCoupeG, coupeD: hCoupeD,
            posType: 'u_remplissage', hauteur: t.hauteur,
          };
          cuts.push(...splitAtRaidisseurs(baseU, rt.posRaidisseurs, rt.longueurLisse));
        }
      }

      // Tubes ronds
      if (gc.nbTubesRonds > 0) {
        for (let tr = 0; tr < gc.nbTubesRonds; tr++) {
          const baseTube: CutInfo = {
            ref: '140545', longueur: rt.debMC, traveeIdx: ti,
            traveeRepere: t.repere + qSuffix,
            coupeG: hCoupeG, coupeD: hCoupeD,
            posType: 'tube', hauteur: t.hauteur,
          };
          cuts.push(...splitAtRaidisseurs(baseTube, rt.posRaidisseurs, rt.longueurLisse));
        }
      }
    }
  }

  return cuts;
}

function buildXMLString(affaire: Affaire, resultat: ResultatAffaire): string {
  const jobNum = extractJobNum(affaire.ref);
  const cuts = collectCuts(affaire, resultat);

  // Group cuts by ref for bin packing
  const cutsByRef = new Map<string, CutInfo[]>();
  for (const cut of cuts) {
    const arr = cutsByRef.get(cut.ref) ?? [];
    arr.push(cut);
    cutsByRef.set(cut.ref, arr);
  }

  // Bin pack each ref into bars of LG_BARRE_MM
  const allBars: { ref: string; cuts: CutInfo[]; chute: number }[] = [];
  const headData: { ref: string; desc: string; qty: number }[] = [];

  for (const [ref, refCuts] of cutsByRef.entries()) {
    refCuts.sort((a, b) => b.longueur - a.longueur);
    const bars: { cuts: CutInfo[]; used: number }[] = [];
    for (const cut of refCuts) {
      let placed = false;
      for (const bar of bars) {
        if (LG_BARRE_MM - bar.used >= cut.longueur) {
          bar.cuts.push(cut);
          bar.used += cut.longueur;
          placed = true;
          break;
        }
      }
      if (!placed) {
        bars.push({ cuts: [cut], used: cut.longueur });
      }
    }
    for (const bar of bars) {
      allBars.push({ ref, cuts: bar.cuts, chute: LG_BARRE_MM - bar.used });
    }
    headData.push({ ref, desc: PROFILS[ref]?.label ?? ref, qty: bars.length });
  }

  // Build XML
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-16"?>');
  lines.push('<JOB>');
  lines.push(`  <JINF><NUM>${pad(parseInt(jobNum), 5)}</NUM></JINF>`);
  lines.push('  <VER><MJ>1</MJ><MN>0</MN></VER>');
  lines.push('');

  lines.push('  <HEAD>');
  for (const h of headData) {
    const profil = PROFILS[h.ref];
    lines.push('    <PDAT>');
    lines.push(`      <CODE>${h.ref}</CODE>`);
    lines.push(`      <DESC>${esc(h.desc)}</DESC>`);
    lines.push(`      <DICL>${esc(affaire.coloris)}</DICL>`);
    lines.push(`      <DOCL>${esc(affaire.coloris)}</DOCL>`);
    lines.push(`      <BQTY>${pad(h.qty, 2)}</BQTY>`);
    lines.push(`      <W>${profil ? ` ${profil.w}` : ' 0'}</W>`);
    lines.push(`      <H>${profil ? ` ${profil.h}` : ' 0'}</H>`);
    lines.push(`      <PANG>${profil ? ` ${profil.angle}` : ' 0'}</PANG>`);
    lines.push('    </PDAT>');
  }
  lines.push('  </HEAD>');
  lines.push('');

  lines.push('  <BODY>');
  let globalBarIdx = 0;
  for (const bar of allBars) {
    globalBarIdx++;
    const profil = PROFILS[bar.ref];
    const hasPos = bar.cuts.some((c) => hasMachinings(c.posType));

    lines.push('    <BAR>');
    lines.push('      <BRAN>Kawneer</BRAN>');
    lines.push('      <SYST>1800 Kadence</SYST>');
    lines.push(`      <CODE>${bar.ref}</CODE>`);
    lines.push(`      <DESC>${esc(profil?.label ?? bar.ref)}</DESC>`);
    lines.push(`      <DICL>${esc(affaire.coloris)}</DICL>`);
    lines.push(`      <DOCL>${esc(affaire.coloris)}</DOCL>`);
    lines.push(`      <LEN>${pad(LG_BARRE_MM, 5)}</LEN>`);
    lines.push(`      <POS>${hasPos ? ' 1' : ' 0'}</POS>`);
    lines.push(`      <LENR>${padF(bar.chute)}</LENR>`);
    lines.push(`      <W>${profil ? ` ${profil.w}` : ' 0'}</W>`);
    lines.push(`      <H>${profil ? ` ${profil.h}` : ' 0'}</H>`);
    lines.push(`      <PANG>${profil ? ` ${profil.angle}` : ' 0'}</PANG>`);
    lines.push('      <MLT> 1</MLT>');

    for (let ci = 0; ci < bar.cuts.length; ci++) {
      const cut = bar.cuts[ci];
      const bcod = genBCOD(jobNum, cut.traveeIdx + 1, globalBarIdx, ci + 1);
      const typeLabel = posTypeLabel(cut.posType);

      lines.push('      <CUT>');
      lines.push(`        <ANGL> ${cut.coupeG}</ANGL>`);
      lines.push(`        <ANGR> ${cut.coupeD}</ANGR>`);
      lines.push(`        <IL>${padF(cut.longueur)}</IL>`);
      lines.push(`        <OL>${padF(cut.longueur)}</OL>`);
      lines.push(`        <BCOD>${bcod}</BCOD>`);
      lines.push(`        <CSNA>Standard</CSNA>`);
      lines.push('        <CSNU>0</CSNU>');
      lines.push(`        <ORCD>O_${esc(affaire.ref)}</ORCD>`);
      lines.push('        <ORDCDQTY> 0</ORDCDQTY>');
      lines.push(`        <TINA>${esc(cut.traveeRepere)}</TINA>`);
      lines.push(`        <DESC>${esc(typeLabel)}</DESC>`);
      lines.push(`        <CID>${esc(cut.traveeRepere)}/${esc(typeLabel)}</CID>`);
      lines.push('        <STAT>0</STAT>');

      // Labels — clear info for workshop operators
      lines.push(`        <LBL>${esc(cut.traveeRepere)}</LBL>`);
      lines.push(`        <LBL>${esc(typeLabel)}</LBL>`);
      lines.push(`        <LBL>${esc(affaire.chantier)}</LBL>`);
      lines.push(`        <LBL>${Math.round(cut.longueur)} mm</LBL>`);
      lines.push(`        <LBL>${cut.segmentLabel ? 'Trame ' + cut.segmentLabel : ''}</LBL>`);
      lines.push(`        <LBL>${esc(affaire.ref)}</LBL>`);
      lines.push(`        <LBL>AG:${cut.coupeG} AD:${cut.coupeD}</LBL>`);
      lines.push(`        <LBL>H=${cut.hauteur}</LBL>`);
      lines.push('        <LBL></LBL>');
      lines.push('        <LBL></LBL>');

      if (hasMachinings(cut.posType) && cut.usinages && cut.usinages.length > 0) {
        lines.push('        <MACHININGS>');
        for (const u of cut.usinages) {
          lines.push(`          <MACHINING WCODE="${esc(u.wcode)}" OFFSET="${padF(u.offset)}"/>`);
        }
        lines.push('        </MACHININGS>');
      }

      lines.push('      </CUT>');
    }

    lines.push('    </BAR>');
  }
  lines.push('  </BODY>');
  lines.push('</JOB>');

  return lines.join('\n');
}

export function exportXML(affaire: Affaire, resultat: ResultatAffaire): Blob {
  const xmlContent = buildXMLString(affaire, resultat);

  const bytes = new Uint8Array(2 + xmlContent.length * 2);
  bytes[0] = 0xff;
  bytes[1] = 0xfe;
  for (let i = 0; i < xmlContent.length; i++) {
    const code = xmlContent.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }

  return new Blob([bytes], { type: 'text/xml;charset=UTF-16' });
}
