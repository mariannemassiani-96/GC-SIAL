import { PDFDocument, StandardFonts, rgb, PDFPage, PDFFont } from 'pdf-lib';
import QRCode from 'qrcode';
import type { Vitrage, Commande, WEGroupe, OptimizedPlate } from './types';

const MM = 72 / 25.4;
const A4_W = 210 * MM;
const A4_H = 297 * MM;

async function makeQR(doc: PDFDocument, text: string) {
  try {
    const url = await QRCode.toDataURL(text, { width: 150, margin: 0, errorCorrectionLevel: 'M' });
    const bytes = Uint8Array.from(atob(url.split(',')[1]), c => c.charCodeAt(0));
    return await doc.embedPng(bytes);
  } catch { return null; }
}

function txt(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0), maxW?: number) {
  let t = text;
  if (maxW) while (font.widthOfTextAtSize(t, size) > maxW && t.length > 2) t = t.slice(0, -1);
  page.drawText(t, { x, y, size, font, color });
}

function centered(page: PDFPage, text: string, cx: number, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
  const w = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: cx - w / 2, y, size, font, color });
}

// ── 1. Etiquette vitrage CE/CEKAL (100×70mm) ────────────────────────

const CE_W = 100 * MM;
const CE_H = 70 * MM;
const CE_COLS = 2;
const CE_ROWS = 4;
const CE_PER_PAGE = CE_COLS * CE_ROWS;
const CE_MARGIN_X = (A4_W - CE_COLS * CE_W) / 2;
const CE_MARGIN_Y = (A4_H - CE_ROWS * CE_H) / 2;

export async function generateEtiquettesCE(
  vitrages: Vitrage[], commande: Commande,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pages = Math.ceil(vitrages.length / CE_PER_PAGE);
  for (let pi = 0; pi < pages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < CE_PER_PAGE; s++) {
      const vi = pi * CE_PER_PAGE + s;
      if (vi >= vitrages.length) break;
      const v = vitrages[vi];
      const col = s % CE_COLS;
      const row = Math.floor(s / CE_COLS);
      const x = CE_MARGIN_X + col * CE_W;
      const y = A4_H - CE_MARGIN_Y - (row + 1) * CE_H;
      const pad = 4 * MM;
      const innerW = CE_W - 2 * pad;

      page.drawRectangle({ x, y, width: CE_W, height: CE_H, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3 });

      let ly = y + CE_H - pad;

      // CE mark + norme
      txt(page, 'CE', x + pad, ly - 10, bold, 12, rgb(0, 0, 0));
      txt(page, 'EN 1279-5', x + pad + 20 * MM, ly - 8, font, 7, rgb(0.4, 0.4, 0.4));
      ly -= 13;

      txt(page, 'VITRAGE ISOLANT', x + pad, ly - 8, bold, 9, rgb(0, 0, 0));
      ly -= 12;

      // Composition
      txt(page, v.composition || `${v.outerGlass} / ${v.intercalaireEpaisseur} / ${v.innerGlass}`, x + pad, ly - 8, bold, 8, rgb(0.1, 0.1, 0.5), innerW);
      ly -= 11;

      // Dimensions
      txt(page, `${v.largeur} x ${v.hauteur} mm`, x + pad, ly - 8, bold, 9, rgb(0, 0, 0));
      ly -= 11;

      // Ug + gaz
      if (v.ug) txt(page, `Ug = ${v.ug} W/m²K`, x + pad, ly - 7, font, 7, rgb(0, 0, 0));
      txt(page, v.gazType || 'Argon', x + pad + 40 * MM, ly - 7, font, 7, rgb(0.4, 0.4, 0.4));
      ly -= 10;

      // Date + lot
      const dateFab = commande.dateCreation;
      txt(page, `Fab: ${dateFab}`, x + pad, ly - 6, font, 6, rgb(0.3, 0.3, 0.3));
      txt(page, `Lot: ${commande.reference}`, x + pad + 30 * MM, ly - 6, font, 6, rgb(0.3, 0.3, 0.3));
      ly -= 8;

      // Site
      txt(page, 'ISULA VITRAGE — Biguglia, Corse', x + pad, ly - 5, font, 5.5, rgb(0.4, 0.4, 0.4));
      ly -= 7;

      // CEKAL + FATTU IN CORSICA
      txt(page, 'CEKAL', x + pad, ly - 4, font, 4.5, rgb(0.6, 0.6, 0.6));
      txt(page, 'FATTU IN CORSICA', x + pad + 20 * MM, ly - 4, font, 4.5, rgb(0.6, 0.6, 0.6));

      // QR code
      const qr = await makeQR(doc, `VI-${commande.reference}-${v.reference}|${v.largeur}x${v.hauteur}|${v.composition}`);
      if (qr) {
        const qrS = 15 * MM;
        page.drawImage(qr, { x: x + CE_W - pad - qrS, y: y + pad, width: qrS, height: qrS });
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── 2. Etiquette atelier + checklist (150×100mm) ────────────────────

const AT_W = 150 * MM;
const AT_H = 100 * MM;
const AT_ROWS = 2;
const AT_PER_PAGE = AT_ROWS;
const AT_MARGIN_Y = (A4_H - AT_ROWS * AT_H) / 2;

const STEPS = [
  'Coupe verre',
  'Lavage',
  'Assemblage cadre',
  'Remplissage gaz',
  'Fermeture vitrage',
  'Controle qualite',
];

export async function generateEtiquettesAtelier(
  vitrages: Vitrage[], commande: Commande,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const pages = Math.ceil(vitrages.length / AT_PER_PAGE);
  for (let pi = 0; pi < pages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < AT_PER_PAGE; s++) {
      const vi = pi * AT_PER_PAGE + s;
      if (vi >= vitrages.length) break;
      const v = vitrages[vi];
      const x = (A4_W - AT_W) / 2;
      const y = A4_H - AT_MARGIN_Y - (s + 1) * AT_H;
      const pad = 5 * MM;
      const innerW = AT_W - 2 * pad;

      page.drawRectangle({ x, y, width: AT_W, height: AT_H, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5 });

      let ly = y + AT_H - pad;

      // Header
      txt(page, 'ISULA VITRAGE — FICHE ATELIER', x + pad, ly - 9, bold, 9, rgb(0, 0, 0));
      ly -= 13;

      // Client + commande
      txt(page, `Client: ${commande.client}`, x + pad, ly - 7, bold, 7, rgb(0, 0, 0), innerW * 0.5);
      txt(page, `Cde: ${commande.reference}`, x + pad + innerW * 0.55, ly - 7, font, 7, rgb(0, 0, 0));
      ly -= 10;

      // Reference + variante
      txt(page, v.reference, x + pad, ly - 12, bold, 14, rgb(0, 0, 0.6));
      txt(page, v.variante, x + pad + innerW * 0.6, ly - 10, bold, 11, rgb(0.8, 0, 0));
      ly -= 16;

      // Composition + dimensions
      txt(page, v.composition || `${v.outerGlass}/${v.intercalaireEpaisseur}/${v.innerGlass}`, x + pad, ly - 7, bold, 7, rgb(0, 0, 0), innerW);
      ly -= 10;
      txt(page, `${v.largeur} x ${v.hauteur} mm`, x + pad, ly - 8, bold, 9, rgb(0, 0, 0));
      if (v.ug) txt(page, `Ug=${v.ug}`, x + pad + 45 * MM, ly - 7, font, 7, rgb(0.3, 0.3, 0.3));
      txt(page, `Gaz: ${v.gazType || 'Argon'}`, x + pad + 70 * MM, ly - 7, font, 7, rgb(0.3, 0.3, 0.3));
      ly -= 12;

      // Separator
      page.drawLine({ start: { x: x + pad, y: ly }, end: { x: x + AT_W - pad, y: ly }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) });
      ly -= 3;

      // Checklist header
      txt(page, 'CHECKLIST FABRICATION', x + pad, ly - 7, bold, 7, rgb(0, 0, 0));
      txt(page, 'OK', x + pad + 55 * MM, ly - 6, font, 5.5, rgb(0.5, 0.5, 0.5));
      txt(page, 'Initiales', x + pad + 68 * MM, ly - 6, font, 5.5, rgb(0.5, 0.5, 0.5));
      txt(page, 'Heure', x + pad + 90 * MM, ly - 6, font, 5.5, rgb(0.5, 0.5, 0.5));
      ly -= 10;

      // Checklist lines
      for (const step of STEPS) {
        txt(page, step, x + pad + 2 * MM, ly - 6, font, 7, rgb(0, 0, 0));
        // Checkbox
        page.drawRectangle({ x: x + pad + 56 * MM, y: ly - 7, width: 8, height: 8, borderColor: rgb(0, 0, 0), borderWidth: 0.5 });
        // Initials line
        page.drawLine({ start: { x: x + pad + 68 * MM, y: ly - 7 }, end: { x: x + pad + 85 * MM, y: ly - 7 }, thickness: 0.3, color: rgb(0.7, 0.7, 0.7) });
        // Time line
        page.drawLine({ start: { x: x + pad + 90 * MM, y: ly - 7 }, end: { x: x + pad + 108 * MM, y: ly - 7 }, thickness: 0.3, color: rgb(0.7, 0.7, 0.7) });
        ly -= 9;
      }

      // QR code
      const qr = await makeQR(doc, `VI-${commande.reference}-${v.reference}|ATELIER`);
      if (qr) {
        const qrS = 18 * MM;
        page.drawImage(qr, { x: x + AT_W - pad - qrS, y: y + pad, width: qrS, height: qrS });
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── 3. Etiquettes post-coupe (par piece de verre coupee) ────────────

const PC_W = 70 * MM;
const PC_H = 50 * MM;
const PC_COLS = 3;
const PC_ROWS = 5;
const PC_PER_PAGE = PC_COLS * PC_ROWS;

interface CutPiece {
  vitrageRef: string;
  face: 'EXT' | 'INT';
  material: string;
  width: number;
  height: number;
  plateNo: number;
  commandeRef: string;
}

function extractCutPieces(vitrages: Vitrage[], plates: OptimizedPlate[], commandeRef: string): CutPiece[] {
  const pieces: CutPiece[] = [];
  for (const plate of plates) {
    for (const p of plate.pieces) {
      const v = vitrages.find(vt => vt.id === p.vitrageId);
      pieces.push({
        vitrageRef: p.vitrageRef,
        face: p.face,
        material: p.material,
        width: p.rotated ? p.height : p.width,
        height: p.rotated ? p.width : p.height,
        plateNo: plate.numero,
        commandeRef,
      });
    }
  }
  return pieces;
}

export async function generateEtiquettesPostCoupe(
  vitrages: Vitrage[], plates: OptimizedPlate[], commandeRef: string,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const cutPieces = extractCutPieces(vitrages, plates, commandeRef);

  const mx = (A4_W - PC_COLS * PC_W) / 2;
  const my = (A4_H - PC_ROWS * PC_H) / 2;

  const pages = Math.ceil(cutPieces.length / PC_PER_PAGE);
  for (let pi = 0; pi < pages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < PC_PER_PAGE; s++) {
      const idx = pi * PC_PER_PAGE + s;
      if (idx >= cutPieces.length) break;
      const p = cutPieces[idx];
      const col = s % PC_COLS;
      const row = Math.floor(s / PC_COLS);
      const x = mx + col * PC_W;
      const y = A4_H - my - (row + 1) * PC_H;
      const pad = 3 * MM;

      page.drawRectangle({ x, y, width: PC_W, height: PC_H, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3 });

      const faceColor = p.face === 'EXT' ? rgb(0.8, 0, 0) : rgb(0, 0.2, 0.8);
      let ly = y + PC_H - pad;

      txt(page, p.vitrageRef, x + pad, ly - 10, bold, 11, rgb(0, 0, 0));
      txt(page, `[${p.face}]`, x + PC_W - pad - 18 * MM, ly - 10, bold, 10, faceColor);
      ly -= 14;

      txt(page, p.material, x + pad, ly - 7, bold, 8, faceColor);
      ly -= 10;

      txt(page, `${p.width} x ${p.height} mm`, x + pad, ly - 8, bold, 9, rgb(0, 0, 0));
      ly -= 11;

      txt(page, `Plaque ${p.plateNo}`, x + pad, ly - 6, font, 6, rgb(0.4, 0.4, 0.4));
      txt(page, p.commandeRef, x + pad + 25 * MM, ly - 6, font, 6, rgb(0.4, 0.4, 0.4));

      const qr = await makeQR(doc, `CUT|${p.commandeRef}|${p.vitrageRef}|${p.face}|${p.width}x${p.height}`);
      if (qr) {
        const qs = 12 * MM;
        page.drawImage(qr, { x: x + PC_W - pad - qs, y: y + pad, width: qs, height: qs });
      }
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}

// ── 4. Etiquettes Warm Edge (par barre debitee) ─────────────────────

const WE_W = 80 * MM;
const WE_H = 30 * MM;
const WE_COLS = 2;
const WE_ROWS = 9;
const WE_PER_PAGE = WE_COLS * WE_ROWS;

interface WELabel {
  barreNo: number;
  pieceIdx: number;
  longueur: number;
  origDim: number;
  cote: string;
  vitrageRef: string;
  epaisseur: number;
  couleur: string;
}

function extractWELabels(groupes: WEGroupe[]): WELabel[] {
  const labels: WELabel[] = [];
  for (const g of groupes) {
    for (const b of g.barres) {
      for (let i = 0; i < b.pieces.length; i++) {
        const p = b.pieces[i];
        labels.push({
          barreNo: b.numero,
          pieceIdx: i + 1,
          longueur: p.longueur,
          origDim: p.origDim,
          cote: p.cote === 'court' ? 'C' : 'L',
          vitrageRef: p.vitrageRef,
          epaisseur: g.epaisseur,
          couleur: g.couleur,
        });
      }
    }
  }
  return labels;
}

export async function generateEtiquettesWE(
  groupes: WEGroupe[], commandeRef: string,
): Promise<Blob> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const weLabels = extractWELabels(groupes);

  const mx = (A4_W - WE_COLS * WE_W) / 2;
  const my = (A4_H - WE_ROWS * WE_H) / 2;

  const pages = Math.ceil(weLabels.length / WE_PER_PAGE);
  for (let pi = 0; pi < pages; pi++) {
    const page = doc.addPage([A4_W, A4_H]);
    for (let s = 0; s < WE_PER_PAGE; s++) {
      const idx = pi * WE_PER_PAGE + s;
      if (idx >= weLabels.length) break;
      const l = weLabels[idx];
      const col = s % WE_COLS;
      const row = Math.floor(s / WE_COLS);
      const x = mx + col * WE_W;
      const y = A4_H - my - (row + 1) * WE_H;
      const pad = 2.5 * MM;

      page.drawRectangle({ x, y, width: WE_W, height: WE_H, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.3 });

      let ly = y + WE_H - pad;

      txt(page, `WE ${l.epaisseur}mm`, x + pad, ly - 7, bold, 7, rgb(0, 0, 0));
      txt(page, l.couleur, x + pad + 25 * MM, ly - 7, font, 6, rgb(0.4, 0.4, 0.4));
      txt(page, `B${l.barreNo}`, x + WE_W - pad - 10 * MM, ly - 7, bold, 7, rgb(0.5, 0.5, 0.5));
      ly -= 10;

      txt(page, `${l.longueur} mm`, x + pad, ly - 9, bold, 11, rgb(0, 0, 0));
      txt(page, `(${l.cote} ${l.origDim})`, x + pad + 30 * MM, ly - 7, font, 6, rgb(0.4, 0.4, 0.4));
      ly -= 11;

      txt(page, l.vitrageRef, x + pad, ly - 5, font, 6, rgb(0, 0, 0.5));
      txt(page, commandeRef, x + pad + 35 * MM, ly - 5, font, 5, rgb(0.4, 0.4, 0.4));
    }
  }

  const bytes = await doc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
