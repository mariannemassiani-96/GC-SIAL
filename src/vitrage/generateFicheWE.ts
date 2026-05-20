import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import type { WEGroupe, WESettings } from './types';
import { DEFAULT_WE } from './types';

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const MARGIN = 15 * MM;
const LINE_H = 4.2 * MM;

function drawCell(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  w: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
  align: 'left' | 'right' | 'center' = 'left',
) {
  let t = text;
  while (font.widthOfTextAtSize(t, size) > w - 2 * MM && t.length > 2) t = t.slice(0, -1);
  const tw = font.widthOfTextAtSize(t, size);
  let tx = x + 1 * MM;
  if (align === 'right') tx = x + w - tw - 1 * MM;
  else if (align === 'center') tx = x + (w - tw) / 2;
  page.drawText(t, { x: tx, y: y + 1 * MM, size, font, color });
}

function drawRow(
  page: PDFPage,
  cols: { text: string; w: number; align?: 'left' | 'right' | 'center' }[],
  x: number,
  y: number,
  h: number,
  font: PDFFont,
  size: number,
  color = rgb(0, 0, 0),
  bg?: ReturnType<typeof rgb>,
) {
  if (bg) {
    const totalW = cols.reduce((s, c) => s + c.w, 0);
    page.drawRectangle({ x, y, width: totalW, height: h, color: bg });
  }
  let cx = x;
  for (const col of cols) {
    drawCell(page, col.text, cx, y, col.w, font, size, color, col.align ?? 'left');
    cx += col.w;
  }
}

export async function generateFicheWE(
  groupes: WEGroupe[],
  commandeLabel: string,
  settings: WESettings = DEFAULT_WE,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const contentW = A4_W - 2 * MARGIN;
  const colNo = 12 * MM;
  const colDetail = contentW - colNo - 22 * MM - 22 * MM;
  const colUtilise = 22 * MM;
  const colChute = 22 * MM;

  for (const groupe of groupes) {
    let page = doc.addPage([A4_W, A4_H]);
    let y = A4_H - MARGIN;

    // Title
    const title = `Optimisation Warm Edge — ${commandeLabel}`;
    page.drawText(title, { x: MARGIN, y: y - 10, size: 12, font: fontBold, color: rgb(0, 0, 0) });
    y -= 7 * MM;

    // Subtitle
    const sub = `Intercalaire ${groupe.epaisseur}mm — ${groupe.couleur}`;
    page.drawText(sub, { x: MARGIN, y: y - 8, size: 10, font: fontBold, color: rgb(0.7, 0.15, 0.15) });
    y -= 5.5 * MM;

    // Parameters
    const params = `Barre ${settings.barreLength}mm | Marges ${settings.marge}mm | Trait de scie ${settings.kerf}mm`;
    page.drawText(params, { x: MARGIN, y: y - 6, size: 6.5, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 4 * MM;

    // Stats
    const stats = `${groupe.totalPieces} pieces | ${groupe.totalBarres} barres | Utilisation ${(groupe.tauxUtilisation * 100).toFixed(1)}% | Chute totale ${groupe.chuteTotal} mm`;
    page.drawText(stats, { x: MARGIN, y: y - 7, size: 7, font: fontBold, color: rgb(0, 0, 0) });
    y -= 6 * MM;

    // Table header
    const headerCols = [
      { text: 'N°', w: colNo, align: 'center' as const },
      { text: 'Detail des coupes', w: colDetail, align: 'left' as const },
      { text: 'Utilise', w: colUtilise, align: 'right' as const },
      { text: 'Chute', w: colChute, align: 'right' as const },
    ];

    drawRow(page, headerCols, MARGIN, y - LINE_H, LINE_H, fontBold, 6.5, rgb(1, 1, 1), rgb(0.2, 0.2, 0.2));
    y -= LINE_H;

    // Table rows
    for (const barre of groupe.barres) {
      if (y - LINE_H < MARGIN + 10 * MM) {
        page = doc.addPage([A4_W, A4_H]);
        y = A4_H - MARGIN;
        drawRow(page, headerCols, MARGIN, y - LINE_H, LINE_H, fontBold, 6.5, rgb(1, 1, 1), rgb(0.2, 0.2, 0.2));
        y -= LINE_H;
      }

      const detailParts = barre.pieces.map(
        p => `${p.longueur} (${p.vitrageRef} ${p.cote === 'court' ? 'C' : 'L'} ${p.origDim})`,
      );
      const detail = detailParts.join(` + ${settings.kerf} + `);

      const bgColor = barre.numero % 2 === 0 ? rgb(0.95, 0.95, 0.95) : undefined;
      const rowCols = [
        { text: String(barre.numero), w: colNo, align: 'center' as const },
        { text: detail, w: colDetail, align: 'left' as const },
        { text: `${barre.utilise}`, w: colUtilise, align: 'right' as const },
        { text: `${barre.chute}`, w: colChute, align: 'right' as const },
      ];
      drawRow(page, rowCols, MARGIN, y - LINE_H, LINE_H, font, 5.5, rgb(0, 0, 0), bgColor);
      y -= LINE_H;
    }

    // Total row
    const totalUtilise = groupe.barres.reduce((s, b) => s + b.utilise, 0);
    drawRow(
      page,
      [
        { text: 'TOTAL', w: colNo + colDetail, align: 'right' as const },
        { text: `${totalUtilise}`, w: colUtilise, align: 'right' as const },
        { text: `${groupe.chuteTotal}`, w: colChute, align: 'right' as const },
      ],
      MARGIN,
      y - LINE_H,
      LINE_H,
      fontBold,
      6.5,
      rgb(0, 0, 0),
      rgb(0.9, 0.9, 0.9),
    );
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
