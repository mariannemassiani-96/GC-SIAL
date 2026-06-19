// ── Export du plan atelier en SVG et PDF ──────────────────────────────

import type { Plan } from './types';

/** Exporte le contenu SVG visible du canvas */
export function exportSVG(svgElement: SVGSVGElement, plan: Plan): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  // Retirer les éléments d'UI (handles, cursors)
  clone.querySelectorAll('[data-ui]').forEach(el => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', '1920');
  clone.setAttribute('height', '1080');

  const svgData = new XMLSerializer().serializeToString(clone);
  const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.nom.replace(/\s+/g, '_')}_${plan.date}.svg`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Exporte le plan en PNG via canvas */
export function exportPNG(svgElement: SVGSVGElement, plan: Plan): void {
  const clone = svgElement.cloneNode(true) as SVGSVGElement;
  clone.querySelectorAll('[data-ui]').forEach(el => el.remove());
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const svgData = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 3840;
    canvas.height = 2160;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(blob => {
      if (!blob) return;
      const pngUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `${plan.nom.replace(/\s+/g, '_')}_${plan.date}.png`;
      a.click();
      URL.revokeObjectURL(pngUrl);
    }, 'image/png');
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/** Export du plan en JSON (sauvegarde/partage) */
export function exportJSON(plan: Plan): void {
  const blob = new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${plan.nom.replace(/\s+/g, '_')}_${plan.date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
