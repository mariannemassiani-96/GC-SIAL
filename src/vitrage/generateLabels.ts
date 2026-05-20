import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import type { Vitrage, Plaque, AverySettings } from './types';
import { DEFAULT_AVERY } from './types';

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const LABEL_W = 70 * MM;
const LABEL_H = 35 * MM;
const COLS = 3;
const ROWS = 8;
const PER_PAGE = COLS * ROWS;
const TOP_MARGIN = 8.5 * MM;

function labelOrigin(slot: number): { x: number; y: number } {
  const col = slot % COLS;
  const row = Math.floor(slot / COLS);
  return {
    x: col * LABEL_W,
    y: A4_H - TOP_MARGIN - (row + 1) * LABEL_H,
  };
}

function drawTextLine(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
  maxWidth?: number,
) {
  let t = text;
  if (maxWidth) {
    while (font.widthOfTextAtSize(t, size) > maxWidth && t.length > 3) {
      t = t.slice(0, -1);
    }
  }
  page.drawText(t, { x, y, size, font, color });
}

// ── Variant A: Assembled labels ──────────────────────────────────────

export async function generateLabelsA(
  vitrages: Vitrage[],
  commandeLabel: string,
  settings: AverySettings = DEFAULT_AVERY,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const padL = settings.paddingLeft * MM;
  const padT = settings.paddingTop * MM;
  const maxW = LABEL_W - (settings.paddingLeft + settings.paddingRight) * MM;

  const totalPages = Math.ceil(vitrages.length / PER_PAGE);
  for (let pi = 0; pi < totalPages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PER_PAGE; s++) {
      const vi = pi * PER_PAGE + s;
      if (vi >= vitrages.length) break;
      const v = vitrages[vi];
      const { x, y } = labelOrigin(s);
      const lx = x + padL;
      let ly = y + LABEL_H - padT;

      // SI-AL + V1/V2
      drawTextLine(page, 'SI-AL', lx, ly - 8, fontBold, 8, rgb(0, 0, 0), maxW * 0.5);
      drawTextLine(page, v.variante, lx + maxW * 0.7, ly - 8, fontBold, 9, rgb(0.8, 0, 0));
      ly -= 13;

      // Commande
      drawTextLine(page, `Cde : ${commandeLabel || v.commande}`, lx, ly - 7, fontBold, 7, rgb(0, 0, 0), maxW);
      ly -= 11;

      // Proto number big
      drawTextLine(page, v.protoNum, lx, ly - 12, fontBold, 14, rgb(0, 0, 0), maxW);
      ly -= 17;

      // Dimensions
      drawTextLine(page, `${v.largeur} x ${v.hauteur} mm`, lx, ly - 7, fontBold, 8, rgb(0, 0, 0), maxW);
      ly -= 11;

      // Composition
      drawTextLine(page, v.composition, lx, ly - 6, font, 6, rgb(0, 0, 0), maxW);
      ly -= 9;

      // Intercalaire
      drawTextLine(page, `Intercalaire : ${v.intercalaireCouleur}`, lx, ly - 5, font, 5.5, rgb(0.4, 0.4, 0.4), maxW);
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer], { type: 'application/pdf' });
}

// ── Variant B: Separated EXT/INT labels ──────────────────────────────

interface SplitLabel {
  vitrage: Vitrage;
  face: 'EXT' | 'INT';
  glassSpec: string;
}

function splitVitrages(vitrages: Vitrage[]): SplitLabel[] {
  const labels: SplitLabel[] = [];
  for (const v of vitrages) {
    labels.push({ vitrage: v, face: 'EXT', glassSpec: v.outerGlass });
    labels.push({ vitrage: v, face: 'INT', glassSpec: v.innerGlass });
  }
  return labels;
}

function drawSplitLabel(
  page: PDFPage,
  label: SplitLabel,
  slot: number,
  commandeLabel: string,
  font: PDFFont,
  fontBold: PDFFont,
  settings: AverySettings,
) {
  const { x, y } = labelOrigin(slot);
  const padL = settings.paddingLeft * MM;
  const padT = settings.paddingTop * MM;
  const maxW = LABEL_W - (settings.paddingLeft + settings.paddingRight) * MM;
  const v = label.vitrage;
  const lx = x + padL;
  let ly = y + LABEL_H - padT;

  const faceColor = label.face === 'EXT' ? rgb(0.8, 0, 0) : rgb(0, 0.2, 0.8);

  // SI-AL + face
  drawTextLine(page, 'SI-AL', lx, ly - 8, fontBold, 7, rgb(0, 0, 0));
  drawTextLine(page, `[${label.face}]`, lx + maxW * 0.55, ly - 8, fontBold, 8, faceColor);
  drawTextLine(page, v.variante, lx + maxW * 0.85, ly - 8, fontBold, 7, rgb(0.5, 0, 0));
  ly -= 12;

  // Commande
  drawTextLine(page, `Cde : ${commandeLabel || v.commande}`, lx, ly - 6, fontBold, 6, rgb(0, 0, 0), maxW);
  ly -= 9;

  // Proto
  drawTextLine(page, v.protoNum, lx, ly - 10, fontBold, 12, rgb(0, 0, 0), maxW);
  ly -= 14;

  // Glass spec big
  drawTextLine(page, label.glassSpec, lx, ly - 8, fontBold, 9, faceColor, maxW);
  ly -= 12;

  // Dimensions
  drawTextLine(page, `${v.largeur} x ${v.hauteur} mm`, lx, ly - 6, font, 6.5, rgb(0, 0, 0), maxW);
  ly -= 9;

  // Intercalaire
  drawTextLine(page, `WE ${v.intercalaireEpaisseur}mm ${v.intercalaireCouleur}`, lx, ly - 5, font, 5, rgb(0.4, 0.4, 0.4), maxW);
}

export async function generateLabelsB(
  vitrages: Vitrage[],
  commandeLabel: string,
  settings: AverySettings = DEFAULT_AVERY,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const labels = splitVitrages(vitrages);

  const totalPages = Math.ceil(labels.length / PER_PAGE);
  for (let pi = 0; pi < totalPages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PER_PAGE; s++) {
      const li = pi * PER_PAGE + s;
      if (li >= labels.length) break;
      drawSplitLabel(page, labels[li], s, commandeLabel, font, fontBold, settings);
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer], { type: 'application/pdf' });
}

// ── Variant C: Cutting order with plaque separators ──────────────────

interface CutOrderLabel {
  type: 'plaque' | 'piece';
  plaque?: Plaque;
  splitLabel?: SplitLabel;
}

function buildCutOrderLabels(
  vitrages: Vitrage[],
  plaques: Plaque[],
): CutOrderLabel[] {
  const labels: CutOrderLabel[] = [];

  for (const plaque of plaques) {
    labels.push({ type: 'plaque', plaque });

    const mat = plaque.materiau.toLowerCase();
    const isInner = mat.includes('fe');
    const face: 'EXT' | 'INT' = isInner ? 'INT' : 'EXT';

    for (const piece of plaque.pieces) {
      const refParts = piece.reference.match(/^(\d+)[\s_]/);
      const refNum = refParts ? refParts[1] : '';
      const matched = vitrages.find(v => {
        if (refNum && v.protoNum === refNum) return true;
        if (v.proto === piece.reference) return true;
        return false;
      });

      for (let q = 0; q < piece.qte; q++) {
        if (matched) {
          labels.push({
            type: 'piece',
            splitLabel: {
              vitrage: matched,
              face,
              glassSpec: face === 'EXT' ? matched.outerGlass : matched.innerGlass,
            },
          });
        }
      }
    }
  }

  return labels;
}

function drawPlaqueSeparator(
  page: PDFPage,
  plaque: Plaque,
  slot: number,
  fontBold: PDFFont,
) {
  const { x, y } = labelOrigin(slot);

  page.drawRectangle({
    x,
    y,
    width: LABEL_W,
    height: LABEL_H,
    color: rgb(0.1, 0.1, 0.1),
  });

  const cx = x + LABEL_W / 2;
  let ly = y + LABEL_H - 8 * MM;

  const t1 = `PLAQUE N° ${plaque.numero}`;
  const w1 = fontBold.widthOfTextAtSize(t1, 11);
  page.drawText(t1, { x: cx - w1 / 2, y: ly, size: 11, font: fontBold, color: rgb(1, 1, 1) });
  ly -= 5 * MM;

  const t2 = plaque.materiau;
  const w2 = fontBold.widthOfTextAtSize(t2, 9);
  page.drawText(t2, { x: cx - w2 / 2, y: ly, size: 9, font: fontBold, color: rgb(0.9, 0.2, 0.2) });
  ly -= 4 * MM;

  const t3 = `${plaque.largeur} x ${plaque.hauteur} mm`;
  const w3 = fontBold.widthOfTextAtSize(t3, 8);
  page.drawText(t3, { x: cx - w3 / 2, y: ly, size: 8, font: fontBold, color: rgb(0.7, 0.7, 0.7) });
}

export async function generateLabelsC(
  vitrages: Vitrage[],
  plaques: Plaque[],
  commandeLabel: string,
  settings: AverySettings = DEFAULT_AVERY,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const labels = buildCutOrderLabels(vitrages, plaques);

  const totalPages = Math.ceil(labels.length / PER_PAGE);
  for (let pi = 0; pi < totalPages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PER_PAGE; s++) {
      const li = pi * PER_PAGE + s;
      if (li >= labels.length) break;
      const label = labels[li];
      if (label.type === 'plaque' && label.plaque) {
        drawPlaqueSeparator(page, label.plaque, s, fontBold);
      } else if (label.splitLabel) {
        drawSplitLabel(page, label.splitLabel, s, commandeLabel, font, fontBold, settings);
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer], { type: 'application/pdf' });
}
