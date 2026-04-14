import type { Affaire, ResultatAffaire } from '../types';
import { PROFILS, LG_BARRE_MM } from '../constants/profils';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
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

function getAffaireCode(chantier: string): string {
  return chantier.slice(0, 3).replace(/\s/g, '');
}

interface CutInfo {
  ref: string;
  longueur: number;
  traveeIdx: number;
  traveeRepere: string;
  coupeG: string;
  coupeD: string;
  position: string; // CID
  posType: 'lisse_inf' | 'lisse_sup' | 'lisse_med' | 'mc' | 'raidisseur' | 'barreau' | 'closoir' | 'u_remplissage' | 'tube' | 'joint';
  usinages?: { wcode: string; offset: number }[];
  hauteur: number;
  affaireCode: string;
}

function buildCID(affaireCode: string, posType: CutInfo['posType']): string {
  switch (posType) {
    case 'lisse_inf': return `${affaireCode}/L/INF-W`;
    case 'lisse_sup': return `${affaireCode}/L/SUP-W`;
    case 'lisse_med': return `${affaireCode}/L/MED-W`;
    case 'mc': return `${affaireCode}/SUP`;
    case 'raidisseur': return `${affaireCode}//`;
    case 'barreau': return `${affaireCode}//`;
    case 'closoir': return `${affaireCode}/CL`;
    case 'u_remplissage': return `${affaireCode}/U`;
    case 'tube': return `${affaireCode}/T`;
    case 'joint': return `${affaireCode}/J`;
    default: return `${affaireCode}//`;
  }
}

function hasMachinings(posType: CutInfo['posType']): boolean {
  return posType === 'lisse_inf' || posType === 'lisse_sup' || posType === 'lisse_med';
}

function collectCuts(affaire: Affaire, resultat: ResultatAffaire): CutInfo[] {
  const cuts: CutInfo[] = [];
  const affaireCode = getAffaireCode(affaire.chantier);

  for (let ti = 0; ti < resultat.travees.length; ti++) {
    const rt = resultat.travees[ti];
    const t = rt.travee;
    // Config is on the travee
    const gc = TYPES_GC[t.typeGC];
    const mc = TYPES_MC[t.mc];

    for (let q = 0; q < t.qte; q++) {
      // --- Angles de coupe ---
      const hCoupeG = t.coupeG;
      const hCoupeD = t.coupeD;
      const vCoupe = t.rampant && t.angle > 0
        ? String(90 - t.angle)
        : '90';

      // Raidisseurs — vertical → angle rampant
      for (let r = 0; r < rt.nbRaid; r++) {
        cuts.push({
          ref: '180000',
          longueur: rt.debRaid,
          traveeIdx: ti,
          traveeRepere: t.repere,
          coupeG: vCoupe,
          coupeD: vCoupe,
          position: buildCID(affaireCode, 'raidisseur'),
          posType: 'raidisseur',
          hauteur: t.hauteur,
          affaireCode,
        });
      }

      // Main courante — horizontal → angle en plan
      cuts.push({
        ref: mc.ref,
        longueur: rt.debMC,
        traveeIdx: ti,
        traveeRepere: t.repere,
        coupeG: hCoupeG,
        coupeD: hCoupeD,
        position: buildCID(affaireCode, 'mc'),
        posType: 'mc',
        hauteur: t.hauteur,
        affaireCode,
      });

      // Closoir — horizontal → angle en plan
      cuts.push({
        ref: '180020',
        longueur: rt.debClosoir,
        traveeIdx: ti,
        traveeRepere: t.repere,
        coupeG: hCoupeG,
        coupeD: hCoupeD,
        position: buildCID(affaireCode, 'closoir'),
        posType: 'closoir',
        hauteur: t.hauteur,
        affaireCode,
      });

      // Lisses
      if (gc.hasBarreaux || gc.hasRemplissage) {
        const nbLisses = gc.hasLisseInter ? 3 : gc.hasBarreaux ? 2 : 1;
        const lisseUsinages = calcPositionsUsinages(rt.longueurLisse, rt.nbRaid, rt.entraxeEff);

        for (let li = 0; li < nbLisses; li++) {
          const posType: CutInfo['posType'] = li === 0 ? 'lisse_inf' : li === 1 ? 'lisse_sup' : 'lisse_med';
          const usinages: { wcode: string; offset: number }[] = [];

          for (const pos of lisseUsinages.percageLisse) {
            usinages.push({ wcode: 'Perçage Lisse', offset: pos });
          }
          for (const pos of lisseUsinages.percageLisseRaidisseur) {
            usinages.push({ wcode: 'Perçage Lisse_Raidisseur', offset: pos });
          }
          usinages.sort((a, b) => a.offset - b.offset || a.wcode.localeCompare(b.wcode));

          cuts.push({
            ref: '180010',
            longueur: rt.longueurLisse,
            traveeIdx: ti,
            traveeRepere: t.repere,
            coupeG: hCoupeG,
            coupeD: hCoupeD,
            position: buildCID(affaireCode, posType),
            posType,
            usinages,
            hauteur: t.hauteur,
            affaireCode,
          });
        }
      }

      // Barreaux — vertical → angle rampant
      if (gc.hasBarreaux && rt.nbBarreaux > 0) {
        for (let b = 0; b < rt.nbBarreaux; b++) {
          cuts.push({
            ref: '180005',
            longueur: rt.debBarreau,
            traveeIdx: ti,
            traveeRepere: t.repere,
            coupeG: vCoupe,
            coupeD: vCoupe,
            position: buildCID(affaireCode, 'barreau'),
            posType: 'barreau',
            hauteur: t.hauteur,
            affaireCode,
          });
        }
      }

      // U remplissage — horizontal → angle en plan
      if (gc.hasRemplissage) {
        for (let u = 0; u < 2; u++) {
          cuts.push({
            ref: '180040',
            longueur: rt.debLisse,
            traveeIdx: ti,
            traveeRepere: t.repere,
            coupeG: hCoupeG,
            coupeD: hCoupeD,
            position: buildCID(affaireCode, 'u_remplissage'),
            posType: 'u_remplissage',
            hauteur: t.hauteur,
            affaireCode,
          });
        }
      }

      // Tubes ronds — horizontal → angle en plan
      if (gc.nbTubesRonds > 0) {
        for (let tr = 0; tr < gc.nbTubesRonds; tr++) {
          cuts.push({
            ref: '140545',
            longueur: rt.debMC,
            traveeIdx: ti,
            traveeRepere: t.repere,
            coupeG: hCoupeG,
            coupeD: hCoupeD,
            position: buildCID(affaireCode, 'tube'),
            posType: 'tube',
            hauteur: t.hauteur,
            affaireCode,
          });
        }
      }
    }
  }

  return cuts;
}

function buildXMLString(affaire: Affaire, resultat: ResultatAffaire): string {
  const jobNum = '1500';
  const cuts = collectCuts(affaire, resultat);

  // Group cuts by ref for bin packing
  const cutsByRef = new Map<string, CutInfo[]>();
  for (const cut of cuts) {
    const arr = cutsByRef.get(cut.ref) ?? [];
    arr.push(cut);
    cutsByRef.set(cut.ref, arr);
  }

  // Bin pack each ref into bars of 6400mm
  const allBars: { ref: string; cuts: CutInfo[]; chute: number }[] = [];
  const headData: { ref: string; desc: string; qty: number }[] = [];

  for (const [ref, refCuts] of cutsByRef.entries()) {
    // Sort by length descending (FFD)
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
      allBars.push({
        ref,
        cuts: bar.cuts,
        chute: LG_BARRE_MM - bar.used,
      });
    }

    headData.push({
      ref,
      desc: PROFILS[ref]?.label ?? ref,
      qty: bars.length,
    });
  }

  // Build XML
  const lines: string[] = [];
  lines.push('<?xml version="1.0" encoding="UTF-16"?>');
  lines.push('<JOB>');
  lines.push(`  <JINF><NUM>${pad(parseInt(jobNum), 5)}</NUM></JINF>`);
  lines.push('  <VER><MJ>1</MJ><MN>0</MN></VER>');
  lines.push('');

  // HEAD
  lines.push('  <HEAD>');
  for (const h of headData) {
    lines.push('    <PDAT>');
    lines.push(`      <CODE>${h.ref}</CODE>`);
    lines.push(`      <DESC>${esc(h.desc)}</DESC>`);
    lines.push(`      <DICL>${esc(affaire.coloris)}</DICL>`);
    lines.push(`      <DOCL>${esc(affaire.coloris)}</DOCL>`);
    lines.push(`      <BQTY>${pad(h.qty, 2)}</BQTY>`);
    lines.push('    </PDAT>');
  }
  lines.push('  </HEAD>');
  lines.push('');

  // BODY
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
    lines.push('      <MLT> 1</MLT>');

    for (let ci = 0; ci < bar.cuts.length; ci++) {
      const cut = bar.cuts[ci];
      const bcod = genBCOD(jobNum, cut.traveeIdx + 1, globalBarIdx, ci + 1);

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
      lines.push(`        <TINA>N°${cut.traveeIdx + 1}</TINA>`);
      lines.push('        <DESC>Do</DESC>');
      lines.push(`        <CID>${esc(cut.position)}</CID>`);
      lines.push('        <STAT>0</STAT>');

      // Labels
      lines.push(`        <LBL>${cut.traveeIdx + 1}</LBL>`);
      lines.push(`        <LBL>${esc(cut.position)}</LBL>`);
      lines.push(`        <LBL>${esc(affaire.chantier)} GC</LBL>`);
      lines.push(`        <LBL>${Math.round(cut.longueur)}/${cut.hauteur}</LBL>`);
      lines.push('        <LBL></LBL>');
      lines.push(`        <LBL>P :${cut.traveeIdx + 1}</LBL>`);
      lines.push('        <LBL>/////////\\\\\\\\\\\\\\\\\\</LBL>');
      lines.push('        <LBL></LBL>');
      lines.push('        <LBL></LBL>');
      lines.push('        <LBL></LBL>');

      // Machinings
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

  // Encode as UTF-16 LE with BOM
  const bytes = new Uint8Array(2 + xmlContent.length * 2);
  bytes[0] = 0xff; // BOM UTF-16 LE
  bytes[1] = 0xfe;
  for (let i = 0; i < xmlContent.length; i++) {
    const code = xmlContent.charCodeAt(i);
    bytes[2 + i * 2] = code & 0xff;
    bytes[2 + i * 2 + 1] = (code >> 8) & 0xff;
  }

  return new Blob([bytes], { type: 'text/xml;charset=UTF-16' });
}
