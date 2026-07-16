/**
 * Generate PDF documents for cart loading and remnant labels.
 *
 * 1. Cart loading sheet (A4 portrait) — one page per cart
 * 2. Remnant labels (Avery 70x35mm style) — QR code + glass type + dimensions
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { CartAssignment } from './cartOptimizer';

const MM = 2.835;
const A4W = 210 * MM;
const A4H = 297 * MM;

// ── Cart Loading Sheet (Fiche Chariot) ─────────────────────────────

export async function generateCartSheetPDF(
  carts: CartAssignment[],
  lotRef: string,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const cart of carts) {
    const page = doc.addPage([A4W, A4H]);
    let y = A4H - 30;

    // Header
    page.drawText('FICHE CHARGEMENT CHARIOT', { x: 20, y, size: 14, font: fontBold, color: rgb(0, 0, 0) });
    y -= 18;
    page.drawText(`${cart.cartId} — ${cart.cartLabel}`, { x: 20, y, size: 11, font: fontBold, color: rgb(0.2, 0.4, 0.2) });
    y -= 14;
    page.drawText(`Lot: ${lotRef}    Client: ${cart.clientRef}    Pieces: ${cart.totalPieces}    Remplissage: ${(cart.fillRate * 100).toFixed(0)}%`, {
      x: 20, y, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });
    y -= 6;
    page.drawLine({ start: { x: 20, y }, end: { x: A4W - 20, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 16;

    // Table header
    const cols = [20, 40, 160, 210, 270, 340, 410, 510];
    const headers = ['N', 'Reference', 'Face', 'Materiau', 'L (mm)', 'H (mm)', 'Vitrage ID'];
    for (let i = 0; i < headers.length; i++) {
      page.drawText(headers[i], { x: cols[i], y, size: 7, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    }
    y -= 4;
    page.drawLine({ start: { x: 20, y }, end: { x: A4W - 20, y }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
    y -= 10;

    // Pieces sorted: EXT first then INT, by vitrageRef
    const sorted = [...cart.pieces].sort((a, b) => {
      if (a.vitrageRef !== b.vitrageRef) return a.vitrageRef.localeCompare(b.vitrageRef);
      return a.position === 'EXT' ? -1 : 1;
    });

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      if (y < 40) {
        // New page if needed
        const np = doc.addPage([A4W, A4H]);
        y = A4H - 30;
        np.drawText(`${cart.cartId} (suite)`, { x: 20, y, size: 10, font: fontBold });
        y -= 20;
      }

      const faceColor = p.position === 'EXT' ? rgb(0.8, 0.1, 0.1) : rgb(0.1, 0.2, 0.8);
      page.drawText(String(i + 1), { x: cols[0], y, size: 7, font });
      page.drawText(p.vitrageRef, { x: cols[1], y, size: 7, font: fontBold });
      page.drawText(p.position, { x: cols[2], y, size: 7, font: fontBold, color: faceColor });
      page.drawText(p.material.slice(0, 20), { x: cols[3], y, size: 6, font, color: rgb(0.4, 0.4, 0.4) });
      page.drawText(String(p.width), { x: cols[4], y, size: 7, font });
      page.drawText(String(p.height), { x: cols[5], y, size: 7, font });
      page.drawText(p.vitrageId.slice(0, 12), { x: cols[6], y, size: 5, font, color: rgb(0.5, 0.5, 0.5) });

      y -= 11;
      if (i < sorted.length - 1) {
        page.drawLine({ start: { x: 20, y: y + 4 }, end: { x: A4W - 20, y: y + 4 }, thickness: 0.2, color: rgb(0.9, 0.9, 0.9) });
      }
    }

    // Footer
    y -= 16;
    page.drawLine({ start: { x: 20, y }, end: { x: A4W - 20, y }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
    y -= 12;
    page.drawText(`Pairing EXT+INT: ${cart.iguPaired}/${cart.iguTotal}`, { x: 20, y, size: 7, font, color: rgb(0.3, 0.3, 0.3) });
    page.drawText('Date: ____________  Operateur: ____________  Controle: ____________', {
      x: 200, y, size: 7, font, color: rgb(0.5, 0.5, 0.5),
    });
  }

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

// ── Remnant Labels (Etiquettes Chutes) ─────────────────────────────

export interface RemnantLabel {
  code: string;
  glass_code: string;
  width: number;
  height: number;
  source: string;
  date: string;
}

export async function generateRemnantLabelsPDF(
  labels: RemnantLabel[],
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  // Avery L7157 compatible: 64x24.3mm, 3 colonnes x 10 lignes
  const labelW = 64 * MM;
  const labelH = 24.3 * MM;
  const marginLeft = 7.2 * MM;
  const marginTop = 13.5 * MM;
  const gapX = 2.5 * MM;
  const cols = 3;
  const rows = 10;
  const perPage = cols * rows;

  for (let i = 0; i < labels.length; i++) {
    const pageIdx = Math.floor(i / perPage);
    const posOnPage = i % perPage;
    const col = posOnPage % cols;
    const row = Math.floor(posOnPage / cols);

    let page;
    if (posOnPage === 0) {
      page = doc.addPage([A4W, A4H]);
    } else {
      page = doc.getPages()[pageIdx];
    }

    const x = marginLeft + col * (labelW + gapX);
    const y = A4H - marginTop - row * labelH;

    // Label border (light)
    page.drawRectangle({
      x, y: y - labelH, width: labelW, height: labelH,
      borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 0.3,
    });

    const lab = labels[i];

    // Code (big, bold)
    page.drawText(lab.code, { x: x + 3, y: y - 9, size: 9, font: fontBold, color: rgb(0, 0, 0) });

    // Glass type
    page.drawText(lab.glass_code, { x: x + 3, y: y - 17, size: 7, font: fontBold, color: rgb(0.2, 0.4, 0.2) });

    // Dimensions
    page.drawText(`${lab.width} x ${lab.height} mm`, { x: x + labelW / 2, y: y - 17, size: 7, font: fontMono, color: rgb(0.3, 0.3, 0.3) });

    // Source + date
    page.drawText(`${lab.source}  ${lab.date}`, { x: x + 3, y: y - labelH + 3, size: 5, font, color: rgb(0.5, 0.5, 0.5) });
  }

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}
