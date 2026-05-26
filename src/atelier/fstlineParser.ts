// ── Parser FSTLINE XML (optimisation barres PVC) ─────────────────────
// Lit un fichier d'optimisation FSTLINE (Rehau Aralya & co.) et en extrait
// la liste des barres brutes avec leurs pièces à couper.
//
// Format source : XML UTF-16 BOM, racine <JOB>, structure :
//   JOB
//   ├── JINF/NUM           numéro du job
//   ├── VER/MJ.MN          version
//   ├── HEAD/PDAT*         sommaire par profilé (CODE, DESC, BQTY, DICL/DOCL)
//   ├── BODY/BAR*          barres brutes (LEN, POS, LENR, CODE, …)
//   │     └── CUT*         pièces (IL, OL, ANGL, ANGR, BCOD, TINA, CID, LBL*, MACHININGS)
//   └── JOBIMAGES          (ignoré : SVG des pièces)

export interface FstlineProfil {
  code: string;
  desc: string;
  teinteInt: string;
  teinteExt: string;
  qte: number;
}

export interface FstlineMachining {
  code: string;          // WCODE — ex: "DRAIN_INT_EXT_D-SIAL"
  offset: number;        // mm depuis une extrémité
}

export interface FstlinePiece {
  barcode: string;       // BCOD — identifiant unique scannable
  longueurInt: number;   // IL (mm)
  longueurExt: number;   // OL (mm)
  angleG: number;        // ANGL (90 ou 135)
  angleD: number;        // ANGR
  typologie: string;     // TINA — ex: "MEN EXT 06"
  type: string;          // DESC — Mo/Ou/Do (Meneau / Ouvrant / Dormant)
  role: string;          // CID — ex: "Mon/L/TM-W"
  position?: string;     // LBL[0] — repère dans le lot
  chantier?: string;     // LBL[2] souvent
  dimensionsMenuiserie?: string;  // ex: "900/2000"
  ordreRef?: string;     // ORCD — ex: "O_2026-0136"
  labels: string[];      // LBL bruts (filtrés non vides)
  machinings: FstlineMachining[];
}

export interface FstlineBarre {
  index: number;         // POS
  brand: string;         // BRAN — ex: "Rehau"
  systeme: string;       // SYST — ex: "ARALYA"
  profilCode: string;    // CODE
  profilDesc: string;
  teinteInt: string;
  teinteExt: string;
  longueurBrute: number; // LEN
  chute: number;         // LENR
  pieces: FstlinePiece[];
}

export interface FstlineOptim {
  jobNum: string;
  version: string;
  profils: FstlineProfil[];
  barres: FstlineBarre[];
  totalBarres: number;
  totalPieces: number;
}

export type ParseResult =
  | { ok: true; data: FstlineOptim }
  | { ok: false; error: string };

// ── Helpers ─────────────────────────────────────────────────────────

function decodeXmlBuffer(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  return new TextDecoder('utf-8').decode(bytes);
}

const trimStr = (s: string | null | undefined): string => (s ?? '').trim();

function trimNum(s: string | null | undefined): number {
  if (s == null) return 0;
  const n = parseFloat(s.trim());
  return isNaN(n) ? 0 : n;
}

function childText(el: Element | null, tag: string): string {
  if (!el) return '';
  for (const child of Array.from(el.children)) {
    if (child.tagName === tag) return trimStr(child.textContent);
  }
  return '';
}

function childrenByTag(el: Element | null, tag: string): Element[] {
  if (!el) return [];
  return Array.from(el.children).filter(c => c.tagName === tag);
}

// ── Détection ────────────────────────────────────────────────────────

export function detectIsFstlineXml(buffer: ArrayBuffer): boolean {
  try {
    const text = decodeXmlBuffer(buffer).slice(0, 2000);
    return /<JOB[\s>]/.test(text) && /<JINF[\s>]/.test(text);
  } catch {
    return false;
  }
}

// ── Parser principal ─────────────────────────────────────────────────

export function parseFstlineXml(buffer: ArrayBuffer): ParseResult {
  try {
    let text = decodeXmlBuffer(buffer);
    // L'XML déclare encoding="UTF-16" mais on a déjà décodé — retirer le prolog.
    text = text.replace(/^\s*<\?xml[^>]*\?>\s*/, '');

    const doc = new DOMParser().parseFromString(text, 'application/xml');
    const errEl = doc.querySelector('parsererror');
    if (errEl) {
      return { ok: false, error: errEl.textContent?.split('\n')[0] ?? 'XML invalide' };
    }

    const root = doc.documentElement;
    if (!root || root.tagName !== 'JOB') {
      return { ok: false, error: 'Racine <JOB> introuvable — ce n\'est pas un fichier FSTLINE' };
    }

    const jinf = root.querySelector(':scope > JINF');
    const ver = root.querySelector(':scope > VER');
    const head = root.querySelector(':scope > HEAD');
    const body = root.querySelector(':scope > BODY');

    const jobNum = childText(jinf, 'NUM');
    const version = ver ? `${childText(ver, 'MJ')}.${childText(ver, 'MN')}` : '';

    const profils: FstlineProfil[] = childrenByTag(head, 'PDAT').map(el => ({
      code: childText(el, 'CODE'),
      desc: childText(el, 'DESC'),
      teinteInt: childText(el, 'DICL'),
      teinteExt: childText(el, 'DOCL'),
      qte: trimNum(childText(el, 'BQTY')),
    }));

    const barres: FstlineBarre[] = childrenByTag(body, 'BAR').map(barEl => {
      const pieces: FstlinePiece[] = childrenByTag(barEl, 'CUT').map(cutEl => {
        const labels = childrenByTag(cutEl, 'LBL')
          .map(l => trimStr(l.textContent))
          .filter(s => s.length > 0);
        const machinings: FstlineMachining[] = [];
        const macParent = cutEl.querySelector(':scope > MACHININGS');
        if (macParent) {
          for (const m of Array.from(macParent.children)) {
            if (m.tagName === 'MACHINING') {
              machinings.push({
                code: trimStr(m.getAttribute('WCODE')),
                offset: trimNum(m.getAttribute('OFFSET')),
              });
            }
          }
        }
        const dim = labels.find(l => /^\d+\/\d+$/.test(l));
        // Le chantier est en général labels[2] (après position et rôle)
        const chantier = labels[2] && !/^\d+\/\d+$/.test(labels[2]) && !labels[2].includes('/') ? labels[2] : undefined;
        return {
          barcode: childText(cutEl, 'BCOD'),
          longueurInt: trimNum(childText(cutEl, 'IL')),
          longueurExt: trimNum(childText(cutEl, 'OL')),
          angleG: trimNum(childText(cutEl, 'ANGL')),
          angleD: trimNum(childText(cutEl, 'ANGR')),
          typologie: childText(cutEl, 'TINA'),
          type: childText(cutEl, 'DESC'),
          role: childText(cutEl, 'CID'),
          position: labels[0],
          chantier,
          dimensionsMenuiserie: dim,
          ordreRef: childText(cutEl, 'ORCD'),
          labels,
          machinings,
        };
      });

      return {
        index: trimNum(childText(barEl, 'POS')),
        brand: childText(barEl, 'BRAN'),
        systeme: childText(barEl, 'SYST'),
        profilCode: childText(barEl, 'CODE'),
        profilDesc: childText(barEl, 'DESC'),
        teinteInt: childText(barEl, 'DICL'),
        teinteExt: childText(barEl, 'DOCL'),
        longueurBrute: trimNum(childText(barEl, 'LEN')),
        chute: trimNum(childText(barEl, 'LENR')),
        pieces,
      };
    });

    const totalPieces = barres.reduce((s, b) => s + b.pieces.length, 0);

    return {
      ok: true,
      data: {
        jobNum,
        version,
        profils,
        barres,
        totalBarres: barres.length,
        totalPieces,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ── Helpers utilitaires (utilisables côté UI) ──────────────────────

/** Renvoie la référence de commande la plus fréquente parmi les pièces (ex: O_2026-0136). */
export function detectOrdreRef(optim: FstlineOptim): string | undefined {
  const counts = new Map<string, number>();
  for (const b of optim.barres) {
    for (const p of b.pieces) {
      if (p.ordreRef) counts.set(p.ordreRef, (counts.get(p.ordreRef) ?? 0) + 1);
    }
  }
  let best: { ref: string; n: number } | null = null;
  for (const [ref, n] of counts) {
    if (!best || n > best.n) best = { ref, n };
  }
  return best?.ref;
}

/** Renvoie le nom de chantier le plus fréquent (ex: "QUERCIU BAT D"). */
export function detectChantier(optim: FstlineOptim): string | undefined {
  const counts = new Map<string, number>();
  for (const b of optim.barres) {
    for (const p of b.pieces) {
      if (p.chantier) counts.set(p.chantier, (counts.get(p.chantier) ?? 0) + 1);
    }
  }
  let best: { ref: string; n: number } | null = null;
  for (const [ref, n] of counts) {
    if (!best || n > best.n) best = { ref, n };
  }
  return best?.ref;
}
