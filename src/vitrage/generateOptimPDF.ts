import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { GlassOptimResult } from './types';

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;
const MARGIN = 15 * MM;

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

      page.drawText(`OPTIMISATION COUPE VERRE — ${commandeLabel}`, { x: MARGIN, y: y - 10, size: 10, font: bold });
      y -= 6 * MM;
      page.drawText(`Materiau : ${group.material}`, { x: MARGIN, y: y - 8, size: 8, font: bold, color: rgb(0.7, 0.15, 0.15) });
      y -= 5 * MM;
      page.drawText(`Plaque ${plate.numero} — ${plate.plateWidth} x ${plate.plateHeight} mm — ${plate.pieces.length} pieces — ${plate.utilisation.toFixed(1)}%`,
        { x: MARGIN, y: y - 7, size: 7, font });
      y -= 8 * MM;

      const drawW = A4_W - 2 * MARGIN;
      const maxH = (A4_H - MARGIN * 2) * 0.55;
      const scale = Math.min(drawW / plate.plateWidth, maxH / plate.plateHeight);
      const pw = plate.plateWidth * scale;
      const ph = plate.plateHeight * scale;
      const ox = MARGIN + (drawW - pw) / 2;
      const oy = y - ph;

      page.drawRectangle({ x: ox, y: oy, width: pw, height: ph, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });

      const colors = [rgb(0.2, 0.5, 0.9), rgb(0.1, 0.7, 0.5), rgb(0.9, 0.6, 0.1), rgb(0.9, 0.3, 0.3),
        rgb(0.5, 0.3, 0.8), rgb(0, 0.7, 0.8), rgb(0.9, 0.5, 0.1), rgb(0.9, 0.3, 0.6)];

      for (let i = 0; i < plate.pieces.length; i++) {
        const p = plate.pieces[i];
        const rpw = (p.rotated ? p.height : p.width) * scale;
        const rph = (p.rotated ? p.width : p.height) * scale;
        const rx = ox + p.x * scale;
        const ry = oy + ph - p.y * scale - rph;
        const c = colors[i % colors.length];

        page.drawRectangle({ x: rx, y: ry, width: rpw, height: rph, color: rgb(c.red, c.green, c.blue), opacity: 0.15,
          borderColor: c, borderWidth: 0.5 });

        const label = `${p.vitrageRef} [${p.face}]`;
        const dim = `${p.width}x${p.height}`;
        const fs = Math.min(7, rpw / (label.length * 2.5));
        if (fs > 2.5) {
          page.drawText(label, { x: rx + 2, y: ry + rph - fs - 1, size: fs, font: bold, color: c });
          page.drawText(dim, { x: rx + 2, y: ry + 2, size: Math.min(5, fs), font, color: rgb(0.3, 0.3, 0.3) });
        }
      }

      y = oy - 6 * MM;

      page.drawText('N°', { x: MARGIN, y: y, size: 6, font: bold });
      page.drawText('Reference', { x: MARGIN + 8 * MM, y: y, size: 6, font: bold });
      page.drawText('Face', { x: MARGIN + 50 * MM, y: y, size: 6, font: bold });
      page.drawText('Materiau', { x: MARGIN + 62 * MM, y: y, size: 6, font: bold });
      page.drawText('L x H', { x: MARGIN + 105 * MM, y: y, size: 6, font: bold });
      page.drawText('Rotation', { x: MARGIN + 140 * MM, y: y, size: 6, font: bold });
      y -= 3 * MM;
      page.drawLine({ start: { x: MARGIN, y: y }, end: { x: A4_W - MARGIN, y: y }, thickness: 0.3, color: rgb(0.7, 0.7, 0.7) });
      y -= 1 * MM;

      for (let i = 0; i < plate.pieces.length && y > MARGIN + 10; i++) {
        const p = plate.pieces[i];
        y -= 3.5 * MM;
        page.drawText(`${i + 1}`, { x: MARGIN, y, size: 6, font });
        page.drawText(p.vitrageRef, { x: MARGIN + 8 * MM, y, size: 6, font: bold });
        page.drawText(p.face, { x: MARGIN + 50 * MM, y, size: 6, font, color: p.face === 'EXT' ? rgb(0.8, 0, 0) : rgb(0, 0.2, 0.8) });
        page.drawText(p.material, { x: MARGIN + 62 * MM, y, size: 5.5, font });
        page.drawText(`${p.width} x ${p.height}`, { x: MARGIN + 105 * MM, y, size: 6, font });
        page.drawText(p.rotated ? 'Oui' : '—', { x: MARGIN + 140 * MM, y, size: 6, font });
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
