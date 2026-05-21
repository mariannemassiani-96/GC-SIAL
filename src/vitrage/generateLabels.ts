import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import type { Vitrage, OptimizedPlate, AverySettings } from './types';
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

function drawText(
  page: PDFPage, text: string, x: number, y: number,
  font: PDFFont, size: number, color = rgb(0, 0, 0), maxWidth?: number,
) {
  let t = text;
  if (maxWidth) {
    while (font.widthOfTextAtSize(t, size) > maxWidth && t.length > 3) t = t.slice(0, -1);
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
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
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

      drawText(page, 'ISULA', lx, ly - 8, bold, 7);
      drawText(page, v.variante, lx + maxW * 0.7, ly - 8, bold, 9, rgb(0.8, 0, 0));
      ly -= 12;
      drawText(page, commandeLabel, lx, ly - 7, bold, 7, rgb(0, 0, 0), maxW);
      ly -= 11;
      drawText(page, v.reference, lx, ly - 12, bold, 14, rgb(0, 0, 0), maxW);
      ly -= 17;
      drawText(page, `${v.largeur} x ${v.hauteur} mm`, lx, ly - 7, bold, 8, rgb(0, 0, 0), maxW);
      ly -= 11;
      drawText(page, v.composition, lx, ly - 6, font, 6, rgb(0, 0, 0), maxW);
      ly -= 9;
      drawText(page, `WE ${v.intercalaireEpaisseur}mm ${v.intercalaireCouleur}`, lx, ly - 5, font, 5.5, rgb(0.4, 0.4, 0.4), maxW);
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
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
  page: PDFPage, label: SplitLabel, slot: number, commandeLabel: string,
  font: PDFFont, bold: PDFFont, settings: AverySettings,
) {
  const { x, y } = labelOrigin(slot);
  const padL = settings.paddingLeft * MM;
  const padT = settings.paddingTop * MM;
  const maxW = LABEL_W - (settings.paddingLeft + settings.paddingRight) * MM;
  const v = label.vitrage;
  const lx = x + padL;
  let ly = y + LABEL_H - padT;
  const faceColor = label.face === 'EXT' ? rgb(0.8, 0, 0) : rgb(0, 0.2, 0.8);

  drawText(page, 'ISULA', lx, ly - 8, bold, 7);
  drawText(page, `[${label.face}]`, lx + maxW * 0.5, ly - 8, bold, 8, faceColor);
  drawText(page, v.variante, lx + maxW * 0.85, ly - 8, bold, 7, rgb(0.5, 0, 0));
  ly -= 12;
  drawText(page, commandeLabel, lx, ly - 6, bold, 6, rgb(0, 0, 0), maxW);
  ly -= 9;
  drawText(page, v.reference, lx, ly - 10, bold, 12, rgb(0, 0, 0), maxW);
  ly -= 14;
  drawText(page, label.glassSpec, lx, ly - 8, bold, 9, faceColor, maxW);
  ly -= 12;
  drawText(page, `${v.largeur} x ${v.hauteur} mm`, lx, ly - 6, font, 6.5, rgb(0, 0, 0), maxW);
  ly -= 9;
  drawText(page, `WE ${v.intercalaireEpaisseur}mm ${v.intercalaireCouleur}`, lx, ly - 5, font, 5, rgb(0.4, 0.4, 0.4), maxW);
}

export async function generateLabelsB(
  vitrages: Vitrage[], commandeLabel: string, settings: AverySettings = DEFAULT_AVERY,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const labels = splitVitrages(vitrages);
  const totalPages = Math.ceil(labels.length / PER_PAGE);
  for (let pi = 0; pi < totalPages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PER_PAGE; s++) {
      const li = pi * PER_PAGE + s;
      if (li >= labels.length) break;
      drawSplitLabel(page, labels[li], s, commandeLabel, font, bold, settings);
    }
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── Variant C: Cutting order from internal optimization ──────────────

interface CutOrderLabel {
  type: 'plaque' | 'piece';
  plate?: OptimizedPlate;
  splitLabel?: SplitLabel;
}

function buildCutOrderLabels(
  vitrages: Vitrage[],
  plates: OptimizedPlate[],
): CutOrderLabel[] {
  const labels: CutOrderLabel[] = [];
  const vitrageMap = new Map(vitrages.map(v => [v.id, v]));

  for (const plate of plates) {
    labels.push({ type: 'plaque', plate });

    for (const piece of plate.pieces) {
      const v = vitrageMap.get(piece.vitrageId);
      if (v) {
        labels.push({
          type: 'piece',
          splitLabel: {
            vitrage: v,
            face: piece.face,
            glassSpec: piece.face === 'EXT' ? v.outerGlass : v.innerGlass,
          },
        });
      }
    }
  }

  return labels;
}

function drawPlateSeparator(
  page: PDFPage, plate: OptimizedPlate, slot: number, bold: PDFFont,
) {
  const { x, y } = labelOrigin(slot);
  page.drawRectangle({ x, y, width: LABEL_W, height: LABEL_H, color: rgb(0.1, 0.1, 0.1) });
  const cx = x + LABEL_W / 2;
  let ly = y + LABEL_H - 8 * MM;

  const t1 = `PLAQUE N° ${plate.numero}`;
  page.drawText(t1, { x: cx - bold.widthOfTextAtSize(t1, 11) / 2, y: ly, size: 11, font: bold, color: rgb(1, 1, 1) });
  ly -= 5 * MM;
  const t2 = plate.material;
  page.drawText(t2, { x: cx - bold.widthOfTextAtSize(t2, 9) / 2, y: ly, size: 9, font: bold, color: rgb(0.9, 0.2, 0.2) });
  ly -= 4 * MM;
  const t3 = `${plate.plateWidth} x ${plate.plateHeight} mm — ${plate.pieces.length} pcs — ${plate.utilisation.toFixed(0)}%`;
  page.drawText(t3, { x: cx - bold.widthOfTextAtSize(t3, 7) / 2, y: ly, size: 7, font: bold, color: rgb(0.7, 0.7, 0.7) });
}

export async function generateLabelsC(
  vitrages: Vitrage[], plates: OptimizedPlate[], commandeLabel: string,
  settings: AverySettings = DEFAULT_AVERY,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const labels = buildCutOrderLabels(vitrages, plates);
  const totalPages = Math.ceil(labels.length / PER_PAGE);
  for (let pi = 0; pi < totalPages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PER_PAGE; s++) {
      const li = pi * PER_PAGE + s;
      if (li >= labels.length) break;
      const label = labels[li];
      if (label.type === 'plaque' && label.plate) {
        drawPlateSeparator(page, label.plate, s, bold);
      } else if (label.splitLabel) {
        drawSplitLabel(page, label.splitLabel, s, commandeLabel, font, bold, settings);
      }
    }
  }
  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
