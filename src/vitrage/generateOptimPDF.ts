import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { GlassOptimResult } from './types';

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const MARGIN = 12 * MM;

const YELLOW = rgb(1, 0.85, 0);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GRAY = rgb(0.5, 0.5, 0.5);

export async function generateOptimVerrePDF(
  results: GlassOptimResult[], commandeLabel: string,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  for (const group of results) {
    for (const plate of group.plates) {
      const page = doc.addPage([A4_W, A4_H]);
      let y = A4_H - MARGIN;

      page.drawText(`OPTIMISATION COUPE VERRE — ${commandeLabel}`, { x: MARGIN, y: y - 10, size: 9, font: bold });
      y -= 5 * MM;
      page.drawText(`Materiau : ${group.material}`, { x: MARGIN, y: y - 8, size: 8, font: bold, color: rgb(0.7, 0.15, 0.15) });
      y -= 4.5 * MM;
      page.drawText(`Plaque ${plate.numero} — ${plate.plateWidth} x ${plate.plateHeight} mm — ${plate.pieces.length} pieces — ${plate.utilisation.toFixed(1)}%`,
        { x: MARGIN, y: y - 7, size: 7, font });
      y -= 7 * MM;

      const drawW = A4_W - 2 * MARGIN - 12 * MM;
      const maxH = (A4_H - MARGIN * 2) * 0.5;
      const scale = Math.min(drawW / plate.plateWidth, maxH / plate.plateHeight);
      const pw = plate.plateWidth * scale;
      const ph = plate.plateHeight * scale;
      const ox = MARGIN + 10 * MM;
      const oy = y - ph;

      page.drawRectangle({ x: ox, y: oy, width: pw, height: ph, color: YELLOW, borderColor: BLACK, borderWidth: 1 });

      for (let i = 0; i < plate.pieces.length; i++) {
        const p = plate.pieces[i];
        const effW = p.rotated ? p.height : p.width;
        const effH = p.rotated ? p.width : p.height;
        const rpw = effW * scale;
        const rph = effH * scale;
        const rx = ox + p.x * scale;
        const ry = oy + ph - p.y * scale - rph;

        const blues = [rgb(0, 0, 0.8), rgb(0, 0.13, 0.67), rgb(0.07, 0.27, 0.73), rgb(0, 0.09, 0.87)];
        page.drawRectangle({ x: rx, y: ry, width: rpw, height: rph, color: blues[i % blues.length], borderColor: WHITE, borderWidth: 1 });

        const label = p.vitrageRef;
        const dim = `${effW}x${effH}`;
        const maxFs = Math.min(7, rpw / Math.max(label.length, dim.length) * 1.8, rph / 4);

        if (maxFs > 2) {
          page.drawText(label, { x: rx + rpw / 2 - label.length * maxFs * 0.27, y: ry + rph / 2 + 1, size: maxFs, font: bold, color: WHITE });
          page.drawText(dim, { x: rx + rpw / 2 - dim.length * maxFs * 0.22, y: ry + rph / 2 - maxFs, size: maxFs * 0.8, font, color: rgb(0.7, 0.7, 1) });
        }

        if (rpw > 20) {
          page.drawText(`${effW}`, { x: rx + rpw / 2 - 6, y: ry + rph + 1, size: 4, font, color: BLACK });
        }
        if (rph > 20) {
          page.drawText(`${effH}`, { x: rx - 1, y: ry + rph / 2, size: 4, font, color: BLACK });
        }
      }

      page.drawText(`${plate.plateWidth}`, { x: ox + pw / 2 - 8, y: oy - 10, size: 7, font: bold, color: BLACK });
      page.drawText(`${plate.plateHeight}`, { x: ox - 9 * MM, y: oy + ph / 2 - 3, size: 7, font: bold, color: BLACK });

      y = oy - 6 * MM;

      page.drawText('N', { x: MARGIN, y: y, size: 6, font: bold });
      page.drawText('Reference', { x: MARGIN + 6 * MM, y: y, size: 6, font: bold });
      page.drawText('Face', { x: MARGIN + 50 * MM, y: y, size: 6, font: bold });
      page.drawText('Materiau', { x: MARGIN + 60 * MM, y: y, size: 6, font: bold });
      page.drawText('L x H', { x: MARGIN + 105 * MM, y: y, size: 6, font: bold });
      page.drawText('Rotation', { x: MARGIN + 140 * MM, y: y, size: 6, font: bold });
      y -= 2.5 * MM;
      page.drawLine({ start: { x: MARGIN, y: y }, end: { x: A4_W - MARGIN, y: y }, thickness: 0.3, color: GRAY });
      y -= 1 * MM;

      for (let i = 0; i < plate.pieces.length && y > MARGIN + 10; i++) {
        const p = plate.pieces[i];
        const effW = p.rotated ? p.height : p.width;
        const effH = p.rotated ? p.width : p.height;
        y -= 3.5 * MM;
        page.drawText(`${i + 1}`, { x: MARGIN, y, size: 6, font });
        page.drawText(p.vitrageRef, { x: MARGIN + 6 * MM, y, size: 6, font: bold });
        page.drawText(p.face, { x: MARGIN + 50 * MM, y, size: 6, font, color: p.face === 'EXT' ? rgb(0.8, 0, 0) : rgb(0, 0.2, 0.8) });
        page.drawText(p.material, { x: MARGIN + 60 * MM, y, size: 5.5, font });
        page.drawText(`${effW} x ${effH}`, { x: MARGIN + 105 * MM, y, size: 6, font });
        page.drawText(p.rotated ? 'Oui' : '—', { x: MARGIN + 140 * MM, y, size: 6, font });
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
