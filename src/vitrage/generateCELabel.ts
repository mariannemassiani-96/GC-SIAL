/**
 * Generate CE + CEKAL conformity labels for insulated glass units.
 *
 * Format: 100x70mm labels (Avery or similar)
 * Content per label:
 *   - CE marking with pictogram
 *   - Manufacturer (SIAL Apertura)
 *   - Composition (e.g., 4/16 Ar/4 FE 1.1)
 *   - Performance (Ug, Sw, Rw)
 *   - Dimensions
 *   - Traceability: lots verre EXT, INT, intercalaire, gaz
 *   - CEKAL certification number
 *   - Date + lot fabrication
 *   - Norme EN 1279
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { CEData } from './traceability';

const MM = 2.835;
const A4W = 210 * MM;
const A4H = 297 * MM;

export async function generateCELabelsPDF(
  items: CEData[],
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const fontMono = await doc.embedFont(StandardFonts.Courier);

  // Label dimensions: 100x70mm, 2 columns x 4 rows per A4
  const labelW = 100 * MM;
  const labelH = 70 * MM;
  const marginLeft = 5 * MM;
  const marginTop = 8.5 * MM;
  const gapX = 0;
  const gapY = 0;
  const cols = 2;
  const rows = 4;
  const perPage = cols * rows;

  for (let i = 0; i < items.length; i++) {
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
    const y = A4H - marginTop - row * (labelH + gapY);
    const ce = items[i];

    drawCELabel(page, x, y, labelW, labelH, ce, font, fontBold, fontMono);
  }

  const bytes = await doc.save();
  return new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
}

function drawCELabel(
  page: ReturnType<PDFDocument['addPage']>,
  x: number, y: number,
  w: number, h: number,
  ce: CEData,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontBold: Awaited<ReturnType<PDFDocument['embedFont']>>,
  fontMono: Awaited<ReturnType<PDFDocument['embedFont']>>,
) {
  const bottom = y - h;

  // Border
  page.drawRectangle({ x, y: bottom, width: w, height: h, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.5 });

  // CE marking (top left)
  let cy = y - 8;
  page.drawText('CE', { x: x + 4, y: cy, size: 16, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(ce.norme || 'EN 1279', { x: x + 30, y: cy + 2, size: 6, font, color: rgb(0.3, 0.3, 0.3) });

  // CEKAL (top right)
  if (ce.cekal_numero) {
    page.drawText('CEKAL', { x: x + w - 50, y: cy, size: 8, font: fontBold, color: rgb(0.1, 0.3, 0.6) });
    page.drawText(ce.cekal_numero, { x: x + w - 50, y: cy - 8, size: 6, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
  }

  // Fabricant
  cy -= 14;
  page.drawText(ce.fabricant, { x: x + 4, y: cy, size: 7, font: fontBold, color: rgb(0, 0, 0) });
  page.drawText(ce.usine, { x: x + 4, y: cy - 8, size: 5, font, color: rgb(0.4, 0.4, 0.4) });

  // Separator
  cy -= 14;
  page.drawLine({ start: { x: x + 4, y: cy }, end: { x: x + w - 4, y: cy }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });

  // Composition (big)
  cy -= 10;
  const compoText = ce.composition || `${ce.verre_ext} / ${ce.intercalaire_epaisseur} ${ce.gaz_type} / ${ce.verre_int}`;
  page.drawText(compoText, { x: x + 4, y: cy, size: 8, font: fontBold, color: rgb(0, 0, 0) });

  // Dimensions
  cy -= 10;
  page.drawText(`${ce.largeur} x ${ce.hauteur} mm`, { x: x + 4, y: cy, size: 7, font: fontMono, color: rgb(0.2, 0.2, 0.2) });

  // Reference
  page.drawText(ce.vitrage_ref, { x: x + w / 2, y: cy, size: 7, font: fontBold, color: rgb(0.2, 0.4, 0.2) });

  // Performance
  cy -= 12;
  const perfParts = [];
  if (ce.ug) perfParts.push(`Ug=${ce.ug}`);
  if (ce.sw) perfParts.push(`Sw=${ce.sw}`);
  if (ce.rw) perfParts.push(`Rw=${ce.rw}dB`);
  if (perfParts.length) {
    page.drawText(perfParts.join('  '), { x: x + 4, y: cy, size: 6, font: fontBold, color: rgb(0.1, 0.1, 0.5) });
  }
  if (ce.classe_securite) {
    page.drawText(`Securite: ${ce.classe_securite}`, { x: x + w / 2, y: cy, size: 6, font, color: rgb(0.5, 0.1, 0.1) });
  }

  // Separator
  cy -= 6;
  page.drawLine({ start: { x: x + 4, y: cy }, end: { x: x + w - 4, y: cy }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });

  // Traceability
  cy -= 8;
  page.drawText('TRACABILITE', { x: x + 4, y: cy, size: 5, font: fontBold, color: rgb(0.4, 0.4, 0.4) });
  cy -= 7;

  const tracaLines = [
    `EXT: ${ce.lot_verre_ext.fournisseur || '—'} lot ${ce.lot_verre_ext.lot_fournisseur || '—'}`,
    `INT: ${ce.lot_verre_int.fournisseur || '—'} lot ${ce.lot_verre_int.lot_fournisseur || '—'}`,
    `WE: ${ce.lots_assemblage.intercalaire_lot || '—'}  Gaz: ${ce.lots_assemblage.gaz_argon_lot || '—'} (${ce.lots_assemblage.gaz_pourcentage}%)`,
  ];

  for (const line of tracaLines) {
    page.drawText(line, { x: x + 4, y: cy, size: 5, font: fontMono, color: rgb(0.3, 0.3, 0.3) });
    cy -= 7;
  }

  // Footer: date + lot
  cy -= 2;
  page.drawLine({ start: { x: x + 4, y: cy }, end: { x: x + w - 4, y: cy }, thickness: 0.3, color: rgb(0.8, 0.8, 0.8) });
  cy -= 7;
  page.drawText(`Fab: ${ce.date_fabrication}`, { x: x + 4, y: cy, size: 5, font, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`Lot: ${ce.lot_fabrication}`, { x: x + w / 3, y: cy, size: 5, font: fontMono, color: rgb(0.4, 0.4, 0.4) });
  page.drawText(`${ce.commande_ref}`, { x: x + 2 * w / 3, y: cy, size: 5, font, color: rgb(0.4, 0.4, 0.4) });
}
