/**
 * Label printer utility for Brother QL-1050
 * Generates printable HTML labels for cutting pieces and chutes.
 * Used by both EtiquettesCoupe (standalone) and PosteCoupe (integrated).
 */

import JsBarcode from 'jsbarcode';
import type { FstBar, FstCut } from './fstlineParser';

// ── Label formats ───────────────────────────────────────────────────
export type LabelFormat = '62x29' | '62x100';
export const LABEL_FORMATS: Record<LabelFormat, { w: number; h: number; name: string }> = {
  '62x29':  { w: 62, h: 29,  name: '62 x 29 mm (adresse)' },
  '62x100': { w: 100, h: 62, name: '62 x 100 mm paysage' },
};

// ── Barcode as data URL ─────────────────────────────────────────────
export function barcodeDataUrl(text: string, w = 1.2, h = 30): string {
  if (!text) return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, { format: 'CODE128', width: w, height: h, displayValue: false, margin: 0 });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

// ── Extract REP (chassis repere) from LBL[0] ───────────────────────
export function getRepNumber(cut: FstCut): string {
  return cut.labels[0] || '';
}

// ── Extract position lines (P:x, O:x, Q:x, TRANCHE:x) from LBL ───
export function getPosLines(cut: FstCut): string[] {
  return cut.labels
    .slice(1)
    .filter(l => l && /^[POQT]/i.test(l.trim()))
    .map(l => l.trim());
}

// ── Chute label HTML ────────────────────────────────────────────────
function chuteLabel(bar: FstBar, isLarge: boolean): string {
  if (bar.waste <= 0) return '';
  if (isLarge) {
    return `
      <div class="label chute">
        <div class="body">
          <div class="col-left">
            <div class="profile">${bar.code} · ${bar.brand} ${bar.system}</div>
            <div class="color">Couleur : ${bar.innerColor}/${bar.outerColor}</div>
            <div class="dims">Barre ${bar.length}mm — pos ${bar.position}</div>
          </div>
          <div class="col-right">
            <div class="chute-tag">CHUTE</div>
            <div class="chute-len">${Math.round(bar.waste)}</div>
            <div class="pos">mm</div>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="label chute">
      <div class="body">
        <div class="col-left">
          <div class="chute-tag-sm">CHUTE</div>
          <div class="dims">${Math.round(bar.waste)} mm</div>
          <div class="order">${bar.code} · ${bar.brand} · ${bar.innerColor}/${bar.outerColor}</div>
        </div>
        <div class="col-right">
          <div class="chute-len-sm">${Math.round(bar.waste)}</div>
        </div>
      </div>
    </div>
  `;
}

// ── Generate print HTML ─────────────────────────────────────────────
export function generatePrintHTML(
  cuts: { cut: FstCut; bar: FstBar }[],
  jobName: string,
  fmt: LabelFormat,
  includeChutes: boolean,
): string {
  const { w, h } = LABEL_FORMATS[fmt];
  const isLarge = fmt === '62x100';

  const htmlParts: string[] = [];
  let lastBarId = '';

  for (const { cut, bar } of cuts) {
    if (includeChutes && lastBarId && lastBarId !== bar.id) {
      const prevBar = cuts.find(c => c.bar.id === lastBarId)?.bar;
      if (prevBar) htmlParts.push(chuteLabel(prevBar, isLarge));
    }
    lastBarId = bar.id;

    const bcSrc = barcodeDataUrl(cut.bcod, isLarge ? 1.2 : 1.0, isLarge ? 28 : 16);
    const rep = getRepNumber(cut);
    const posLines = getPosLines(cut);

    if (isLarge) {
      htmlParts.push(`
        <div class="label">
          <div class="body">
            <div class="col-left">
              <div class="cid">${cut.cid || cut.ref || '—'}</div>
              <div class="chantier">${cut.chantier || jobName}</div>
              <div class="dims">${cut.il} mm · ${cut.angleLeft}° / ${cut.angleRight}°</div>
              <div class="profile">${bar.code} · ${bar.brand} ${bar.system}</div>
              <div class="color">${bar.innerColor}/${bar.outerColor} · ${cut.orderCode}</div>
              ${bcSrc ? `<div class="row-barcode"><img src="${bcSrc}" /><span class="bc-text">${cut.bcod}</span></div>` : ''}
            </div>
            <div class="col-right">
              <div class="rep-label">REP</div>
              <div class="rep-box">${rep}</div>
              ${posLines.map(l => `<div class="pos">${l}</div>`).join('')}
            </div>
          </div>
        </div>
      `);
    } else {
      htmlParts.push(`
        <div class="label">
          <div class="body">
            <div class="col-left">
              <div class="cid">${cut.cid || cut.ref || '—'}</div>
              <div class="chantier">${cut.chantier || jobName}</div>
              <div class="dims">${cut.il}mm · ${cut.angleLeft}/${cut.angleRight}°</div>
              <div class="order">${cut.orderCode} · ${bar.code} · ${bar.brand}</div>
            </div>
            <div class="col-right">
              <div class="rep-label">REP</div>
              <div class="rep-box">${rep}</div>
              ${posLines.map(l => `<div class="pos">${l}</div>`).join('')}
            </div>
          </div>
          ${bcSrc ? `<div class="row-barcode"><img src="${bcSrc}" /><span class="bc-text">${cut.bcod}</span></div>` : ''}
        </div>
      `);
    }
  }

  if (includeChutes && lastBarId) {
    const lastBar = cuts.find(c => c.bar.id === lastBarId)?.bar;
    if (lastBar) htmlParts.push(chuteLabel(lastBar, isLarge));
  }

  const labels = htmlParts.join('');

  const smallCSS = `
.label { width: ${w - 3}mm; height: ${h - 2}mm; page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
.body { display: flex; flex: 1; min-height: 0; }
.col-left { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.2mm; }
.cid { font-size: 8pt; font-weight: 900; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chantier { font-size: 7pt; font-weight: 900; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dims { font-size: 7pt; font-weight: 900; color: #000; }
.order { font-size: 5pt; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-right { width: 16mm; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 0.5pt solid #ccc; padding-left: 1mm; margin-left: 1mm; }
.rep-label { font-size: 5pt; font-weight: 700; color: #666; letter-spacing: 0.5px; }
.rep-box { font-size: 18pt; font-weight: 900; line-height: 1; border: 1.5pt solid #000; padding: 0.3mm 1.5mm; text-align: center; min-width: 10mm; }
.pos { font-size: 5.5pt; font-weight: 700; color: #444; margin-top: 0.3mm; }
.row-barcode { display: flex; align-items: center; gap: 1mm; margin-top: auto; }
.row-barcode img { flex: 1; height: 5mm; object-fit: contain; }
.bc-text { font-size: 4pt; color: #555; font-family: monospace; white-space: nowrap; }
.chute { border: 1.5pt dashed #000; }
.chute-tag-sm { font-size: 8pt; font-weight: 900; letter-spacing: 1px; }
.chute-len-sm { font-size: 16pt; font-weight: 900; line-height: 1; }
`;

  const largeCSS = `
.label { width: ${w - 3}mm; height: ${h - 2}mm; page-break-after: always; display: flex; flex-direction: column; overflow: hidden; }
.body { display: flex; flex: 1; min-height: 0; gap: 2mm; }
.col-left { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.5mm; }
.col-right { width: 28mm; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 1pt solid #ccc; padding-left: 2mm; }
.rep-label { font-size: 7pt; font-weight: 700; color: #666; letter-spacing: 1px; }
.rep-box { font-size: 36pt; font-weight: 900; line-height: 1; border: 2pt solid #000; padding: 1mm 3mm; text-align: center; min-width: 20mm; margin-top: 1mm; }
.pos { font-size: 8pt; font-weight: 700; color: #333; margin-top: 1mm; }
.cid { font-size: 11pt; font-weight: 900; line-height: 1.2; }
.chantier { font-size: 10pt; font-weight: 900; color: #000; }
.dims { font-size: 12pt; font-weight: 900; color: #000; }
.profile { font-size: 8pt; font-weight: 600; color: #444; }
.color { font-size: 7pt; color: #555; }
.row-barcode { display: flex; align-items: center; gap: 2mm; margin-top: auto; }
.row-barcode img { flex: 1; height: 10mm; object-fit: contain; }
.bc-text { font-size: 6pt; color: #444; font-family: monospace; white-space: nowrap; }
.chute { border: 2pt dashed #000; }
.chute .body { justify-content: center; }
.chute-tag { font-size: 14pt; font-weight: 900; letter-spacing: 2px; }
.chute-len { font-size: 28pt; font-weight: 900; line-height: 1; margin-top: 1mm; }
`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiquettes Coupe — ${jobName}</title>
<style>
@page { size: ${w}mm ${h}mm; margin: 1mm; }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; }
${isLarge ? largeCSS : smallCSS}
@media print { .label:last-child { page-break-after: avoid; } }
</style>
</head>
<body>${labels}</body>
</html>`;
}

// ── Open print window with guide ────────────────────────────────────
export function printLabels(
  cuts: { cut: FstCut; bar: FstBar }[],
  jobName: string,
  fmt: LabelFormat = '62x29',
  includeChutes = true,
): void {
  if (cuts.length === 0) return;
  const html = generatePrintHTML(cuts, jobName, fmt, includeChutes);
  const { w, h } = LABEL_FORMATS[fmt];
  const instructions = `
    <div id="print-help" style="background:#fffbe6;border:2px solid #d97706;padding:12px 16px;margin:8px;border-radius:8px;font-family:Arial;font-size:13px;color:#92400e">
      <b>AVANT D'IMPRIMER :</b><br>
      1. Imprimante = <b>Brother QL-1050</b><br>
      2. Format papier = <b>${w} x ${h} mm</b><br>
      3. Decocher "Adapter a la page" / "Fit to page"<br>
      4. Marges = Aucune<br>
      <button onclick="this.parentElement.remove()" style="margin-top:8px;padding:4px 12px;background:#d97706;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:bold">OK, compris</button>
    </div>
    <style>#print-help{display:block}@media print{#print-help{display:none!important}}</style>
  `;
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(instructions + html);
  win.document.close();
}
