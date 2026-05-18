import type { OptimResultat, BarreOptim } from '../types';
import { LG_BARRE_MM } from '../constants/profils';

interface OptimBarresVisuProps {
  optimBarres: OptimResultat[];
}

/** Palette of blues/teals for piece coloring, indexed by travee */
const PIECE_COLORS = [
  '#2563eb', // blue-600
  '#0d9488', // teal-600
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#1d4ed8', // blue-700
  '#0f766e', // teal-700
  '#60a5fa', // blue-400
  '#2dd4bf', // teal-400
  '#1e40af', // blue-800
  '#115e59', // teal-800
];

const BAR_HEIGHT = 36;
const BAR_GAP = 6;

/**
 * Assigns a stable color index per unique traveeRef across all bars in a profile.
 */
function buildTraveeColorMap(barres: BarreOptim[]): Map<string, number> {
  const map = new Map<string, number>();
  let idx = 0;
  for (const barre of barres) {
    for (const piece of barre.pieces) {
      if (!map.has(piece.traveeRef)) {
        map.set(piece.traveeRef, idx % PIECE_COLORS.length);
        idx++;
      }
    }
  }
  return map;
}

function BarreSvg({
  barre,
  barIndex,
  colorMap,
}: {
  barre: BarreOptim;
  barIndex: number;
  colorMap: Map<string, number>;
}) {
  let cursor = 0;
  const pieces = barre.pieces.map((p) => {
    const x = cursor;
    cursor += p.longueur;
    return { ...p, x, pct: (p.longueur / LG_BARRE_MM) * 100 };
  });
  const chutePct = (barre.chute / LG_BARRE_MM) * 100;
  const chuteXPct = (cursor / LG_BARRE_MM) * 100;

  return (
    <div className="relative w-full border border-[#353840] rounded-sm" style={{ height: BAR_HEIGHT }}>
      <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
        <defs>
          <pattern id={`hatch-${barIndex}`} patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="8" stroke="#dc2626" strokeWidth="2" strokeOpacity="0.4" />
          </pattern>
        </defs>
        {pieces.map((p, i) => {
          const colorIdx = colorMap.get(p.traveeRef) ?? (i % PIECE_COLORS.length);
          return (
            <rect key={i} x={`${(p.x / LG_BARRE_MM) * 100}%`} y="0" width={`${p.pct}%`} height="100%"
              fill={PIECE_COLORS[colorIdx]} fillOpacity={i % 2 === 0 ? 1 : 0.8} stroke="#14161d" strokeWidth={1} />
          );
        })}
        {barre.chute > 0 && (
          <>
            <rect x={`${chuteXPct}%`} y="0" width={`${chutePct}%`} height="100%" fill="#dc2626" fillOpacity={0.3} />
            <rect x={`${chuteXPct}%`} y="0" width={`${chutePct}%`} height="100%" fill={`url(#hatch-${barIndex})`} />
          </>
        )}
      </svg>
      {/* Text labels as HTML — not affected by SVG stretching */}
      {pieces.map((p, i) => {
        const widthPct = p.pct;
        if (widthPct < 4) return null;
        return (
          <div key={i} className="absolute top-0 flex items-center justify-center" style={{ left: `${(p.x / LG_BARRE_MM) * 100}%`, width: `${widthPct}%`, height: BAR_HEIGHT }}>
            <span className="text-white font-mono font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ fontSize: widthPct < 8 ? 8 : widthPct < 12 ? 9 : 11 }}>
              {Math.round(p.longueur)}
            </span>
          </div>
        );
      })}
      {barre.chute > 0 && chutePct >= 4 && (
        <div className="absolute top-0 flex items-center justify-center" style={{ left: `${chuteXPct}%`, width: `${chutePct}%`, height: BAR_HEIGHT }}>
          <span className="text-red-400 font-mono font-semibold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" style={{ fontSize: chutePct < 8 ? 8 : 11 }}>
            {Math.round(barre.chute)}
          </span>
        </div>
      )}
    </div>
  );
}

export function OptimBarresVisu({ optimBarres }: OptimBarresVisuProps) {
  if (optimBarres.length === 0) {
    return (
      <p className="text-sm text-gray-500 italic">Aucune optimisation de barres disponible.</p>
    );
  }

  return (
    <div className="space-y-6">
      {optimBarres.map((opt) => {
        const colorMap = buildTraveeColorMap(opt.barres);

        return (
          <div key={opt.ref} className="rounded-lg border border-[#252830] bg-[#14161d] p-4">
            {/* Header */}
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-3">
              <span className="text-sm font-semibold text-blue-400 font-mono">{opt.ref}</span>
              <span className="text-sm text-gray-300">{opt.label}</span>
              <span className="text-xs text-gray-500">
                {opt.totalPieces} pcs &middot; {opt.nbBarres} barre{opt.nbBarres > 1 ? 's' : ''} de {LG_BARRE_MM}mm
              </span>
              <span
                className={`text-xs font-mono font-semibold ${
                  opt.tauxChute > 0.2 ? 'text-amber-400' : 'text-green-400'
                }`}
              >
                Chute : {(opt.tauxChute * 100).toFixed(1)}%
              </span>
            </div>

            {/* Bar diagrams */}
            <div
              className="flex flex-col"
              style={{ gap: BAR_GAP }}
            >
              {opt.barres.map((barre, bi) => (
                <BarreSvg
                  key={bi}
                  barre={barre}
                  barIndex={bi}
                  colorMap={colorMap}
                />
              ))}
            </div>

            {/* Legend: travee color mapping */}
            {colorMap.size > 1 && (
              <div className="flex flex-wrap gap-3 mt-3">
                {[...colorMap.entries()].map(([traveeRef, idx]) => (
                  <div key={traveeRef} className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ backgroundColor: PIECE_COLORS[idx] }}
                    />
                    <span className="text-[10px] text-gray-400 font-mono">{traveeRef}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
