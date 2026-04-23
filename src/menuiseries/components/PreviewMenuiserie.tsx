import type { ConfigMenuiserie, VantailConfig } from '../types';
import { COULEURS } from '../constants/couleurs';

interface PreviewProps {
  config: Partial<ConfigMenuiserie>;
  width?: number;
  height?: number;
}

export function PreviewMenuiserie({ config, width = 280, height = 320 }: PreviewProps) {
  const largeur = config.largeur ?? 1000;
  const hauteur = config.hauteur ?? 1200;
  const forme = config.forme ?? 'rectangulaire';
  const nbVantaux = config.nbVantaux ?? 1;
  const vantaux = config.vantaux ?? [];
  const couleurExt = COULEURS.find((c) => c.id === config.couleurExterieure);
  const couleurHex = couleurExt?.hex ?? '#F7F9F4';
  const imposte = config.imposte ?? false;
  const allege = config.allege ?? false;

  // Échelle pour tenir dans le SVG
  const ratio = largeur / hauteur;
  const margin = 20;
  let svgW: number, svgH: number;
  if (ratio > width / height) {
    svgW = width - margin * 2;
    svgH = svgW / ratio;
  } else {
    svgH = height - margin * 2;
    svgW = svgH * ratio;
  }
  const offsetX = (width - svgW) / 2;
  const offsetY = (height - svgH) / 2;

  // Épaisseur cadre proportionnelle
  const cadre = Math.max(4, Math.min(12, svgW * 0.04));
  const vitrageColor = 'rgba(173, 216, 255, 0.25)';
  const vitrageStroke = 'rgba(173, 216, 255, 0.4)';

  // Hauteurs imposte / allège en proportion
  const imposteH = imposte ? Math.max(svgH * 0.18, 20) : 0;
  const allegeH = allege ? Math.max(svgH * 0.22, 20) : 0;
  const vitrageH = svgH - imposteH - allegeH;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="mx-auto">
      {/* Fond */}
      <rect width={width} height={height} fill="transparent" />

      <g transform={`translate(${offsetX}, ${offsetY})`}>
        {/* Cadre extérieur */}
        {forme === 'rectangulaire' && (
          <rect x="0" y="0" width={svgW} height={svgH} rx="2" fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'cintre' && (
          <path d={`M0 ${svgH} V${svgW / 2} A${svgW / 2} ${svgW / 2} 0 0 1 ${svgW} ${svgW / 2} V${svgH} Z`}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'arc_surbaisse' && (
          <path d={`M0 ${svgH} V${svgH * 0.3} Q${svgW / 2} 0 ${svgW} ${svgH * 0.3} V${svgH} Z`}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'trapeze' && (
          <path d={`M${svgW * 0.15} ${svgH} L0 0 H${svgW} L${svgW * 0.85} ${svgH} Z`}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'triangle' && (
          <path d={`M${svgW / 2} 0 L${svgW} ${svgH} H0 Z`}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'rond' && (
          <ellipse cx={svgW / 2} cy={svgH / 2} rx={svgW / 2} ry={svgH / 2}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}
        {forme === 'oeil_de_boeuf' && (
          <ellipse cx={svgW / 2} cy={svgH / 2} rx={svgW / 2} ry={svgH * 0.35}
            fill={couleurHex} stroke={darken(couleurHex)} strokeWidth="2" />
        )}

        {/* Zone vitrage pour formes rectangulaires */}
        {forme === 'rectangulaire' && (
          <>
            {/* Imposte */}
            {imposte && (
              <>
                <rect x={cadre} y={cadre} width={svgW - cadre * 2} height={imposteH - cadre}
                  fill={vitrageColor} stroke={vitrageStroke} strokeWidth="1" rx="1" />
                <line x1={cadre} y1={imposteH} x2={svgW - cadre} y2={imposteH} stroke={darken(couleurHex)} strokeWidth="2" />
              </>
            )}

            {/* Vantaux */}
            {(() => {
              const vantailW = (svgW - cadre * 2) / nbVantaux;
              const yStart = imposteH || cadre;
              const vantailH = vitrageH - cadre * (imposte ? 1 : 2);

              return Array.from({ length: nbVantaux }, (_, i) => {
                const x = cadre + i * vantailW;
                const v = vantaux[i];
                return (
                  <g key={i}>
                    {/* Vitrage */}
                    <rect x={x + cadre / 2} y={yStart + cadre / 2} width={vantailW - cadre} height={vantailH}
                      fill={vitrageColor} stroke={vitrageStroke} strokeWidth="1" rx="1" />

                    {/* Cadre vantail */}
                    <rect x={x} y={yStart} width={vantailW} height={vantailH + cadre}
                      fill="none" stroke={darken(couleurHex)} strokeWidth="1.5" rx="1" />

                    {/* Symboles ouverture */}
                    {v && renderOuvertureSymbol(v, x + cadre / 2, yStart + cadre / 2, vantailW - cadre, vantailH)}

                    {/* Poignée */}
                    {v && v.ouverture !== 'fixe' && renderPoignee(v, x, yStart, vantailW, vantailH + cadre)}

                    {/* Croisillons */}
                    {config.croisillons && (
                      <>
                        <line x1={x + vantailW / 2} y1={yStart + cadre / 2} x2={x + vantailW / 2} y2={yStart + vantailH + cadre / 2}
                          stroke={darken(couleurHex)} strokeWidth="1" opacity="0.5" />
                        <line x1={x + cadre / 2} y1={yStart + vantailH / 2 + cadre / 2} x2={x + vantailW - cadre / 2} y2={yStart + vantailH / 2 + cadre / 2}
                          stroke={darken(couleurHex)} strokeWidth="1" opacity="0.5" />
                      </>
                    )}
                  </g>
                );
              });
            })()}

            {/* Allège */}
            {allege && (
              <>
                <line x1={cadre} y1={svgH - allegeH} x2={svgW - cadre} y2={svgH - allegeH} stroke={darken(couleurHex)} strokeWidth="2" />
                <rect x={cadre} y={svgH - allegeH} width={svgW - cadre * 2} height={allegeH - cadre}
                  fill={darken(couleurHex, 0.15)} stroke={darken(couleurHex)} strokeWidth="1" rx="1" />
              </>
            )}
          </>
        )}
      </g>

      {/* Dimensions */}
      <g className="text-[10px]" fill="#6b7280">
        {/* Largeur */}
        <line x1={offsetX} y1={offsetY + svgH + 10} x2={offsetX + svgW} y2={offsetY + svgH + 10} stroke="#4b5563" strokeWidth="0.5" />
        <line x1={offsetX} y1={offsetY + svgH + 6} x2={offsetX} y2={offsetY + svgH + 14} stroke="#4b5563" strokeWidth="0.5" />
        <line x1={offsetX + svgW} y1={offsetY + svgH + 6} x2={offsetX + svgW} y2={offsetY + svgH + 14} stroke="#4b5563" strokeWidth="0.5" />
        <text x={offsetX + svgW / 2} y={offsetY + svgH + 18} textAnchor="middle" fontSize="9" fill="#9ca3af">{largeur} mm</text>

        {/* Hauteur */}
        <line x1={offsetX + svgW + 10} y1={offsetY} x2={offsetX + svgW + 10} y2={offsetY + svgH} stroke="#4b5563" strokeWidth="0.5" />
        <line x1={offsetX + svgW + 6} y1={offsetY} x2={offsetX + svgW + 14} y2={offsetY} stroke="#4b5563" strokeWidth="0.5" />
        <line x1={offsetX + svgW + 6} y1={offsetY + svgH} x2={offsetX + svgW + 14} y2={offsetY + svgH} stroke="#4b5563" strokeWidth="0.5" />
        <text x={offsetX + svgW + 14} y={offsetY + svgH / 2} textAnchor="start" fontSize="9" fill="#9ca3af"
          transform={`rotate(90, ${offsetX + svgW + 14}, ${offsetY + svgH / 2})`}>{hauteur} mm</text>
      </g>
    </svg>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────

function darken(hex: string, amount = 0.3): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * (1 - amount))}, ${Math.round(g * (1 - amount))}, ${Math.round(b * (1 - amount))})`;
}

function renderOuvertureSymbol(v: VantailConfig, x: number, y: number, w: number, h: number) {
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (v.ouverture === 'fixe') {
    return (
      <>
        <line x1={x} y1={y} x2={x + w} y2={y + h} stroke="#6b7280" strokeWidth="0.5" opacity="0.3" />
        <line x1={x + w} y1={y} x2={x} y2={y + h} stroke="#6b7280" strokeWidth="0.5" opacity="0.3" />
      </>
    );
  }

  if (v.ouverture.includes('battant_gauche') || (v.ouverture.includes('oscillo') && v.ouverture.includes('gauche'))) {
    return (
      <>
        <path d={`M${x} ${y} L${cx} ${cy} L${x} ${y + h}`} fill="none" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="3 2" />
        {v.ouverture.includes('oscillo') && (
          <path d={`M${x} ${y + h} L${cx} ${y + h * 0.7} L${x + w} ${y + h}`} fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
        )}
      </>
    );
  }

  if (v.ouverture.includes('battant_droit') || (v.ouverture.includes('oscillo') && v.ouverture.includes('droit') && !v.ouverture.includes('coulissant'))) {
    return (
      <>
        <path d={`M${x + w} ${y} L${cx} ${cy} L${x + w} ${y + h}`} fill="none" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="3 2" />
        {v.ouverture.includes('oscillo') && (
          <path d={`M${x} ${y + h} L${cx} ${y + h * 0.7} L${x + w} ${y + h}`} fill="none" stroke="#60a5fa" strokeWidth="0.5" strokeDasharray="2 2" opacity="0.5" />
        )}
      </>
    );
  }

  if (v.ouverture === 'coulissant' || v.ouverture === 'soulevant_coulissant' || v.ouverture === 'galandage' || v.ouverture === 'oscillo_coulissant') {
    return (
      <path d={`M${cx + w * 0.1} ${cy - 5} L${cx + w * 0.25} ${cy} L${cx + w * 0.1} ${cy + 5}`} fill="#60a5fa" />
    );
  }

  if (v.ouverture === 'a_soufflet') {
    return (
      <path d={`M${x} ${y} L${cx} ${y + h * 0.3} L${x + w} ${y}`} fill="none" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="3 2" />
    );
  }

  return null;
}

function renderPoignee(v: VantailConfig, x: number, y: number, w: number, h: number) {
  // Position de la poignée selon le type d'ouverture
  let px: number, py: number;
  if (v.ouverture.includes('gauche')) {
    px = x + w - 6;
    py = y + h / 2;
  } else if (v.ouverture.includes('coulissant') || v.ouverture.includes('galandage')) {
    px = x + w / 2;
    py = y + h / 2;
  } else {
    px = x + 6;
    py = y + h / 2;
  }

  return (
    <g>
      <rect x={px - 1.5} y={py - 8} width="3" height="16" rx="1.5" fill="#9ca3af" opacity="0.6" />
    </g>
  );
}
