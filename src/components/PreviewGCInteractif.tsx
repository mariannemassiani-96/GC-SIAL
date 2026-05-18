import { useState, useMemo } from 'react';
import type { ResultatTravee, Travee } from '../types';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';
import { ESPACEMENT_BARREAU } from '../constants/parametres';

interface Props {
  rt: ResultatTravee;
  onUpdateTravee: (patch: Partial<Travee>) => void;
}

export function PreviewGCInteractif({ rt, onUpdateTravee }: Props) {
  const t = rt.travee;
  const gc = TYPES_GC[t.typeGC];
  const mc = TYPES_MC[t.mc];
  const [hoverSlot, setHoverSlot] = useState<number | null>(null);

  const totalWidth = t.largeur;
  const totalHeight = t.hauteur;

  const svgW = 800;
  const svgH = 420;
  const margin = { top: 50, right: 100, bottom: 80, left: 100 };
  const drawW = svgW - margin.left - margin.right;
  const drawH = svgH - margin.top - margin.bottom;

  const scaleX = drawW / totalWidth;
  const scaleY = drawH / totalHeight;
  const scale = Math.min(scaleX, scaleY);

  const gcW = totalWidth * scale;
  const gcH = totalHeight * scale;
  const offsetX = margin.left + (drawW - gcW) / 2;
  const offsetY = margin.top + (drawH - gcH) / 2;

  const toX = (mm: number) => offsetX + mm * scale;
  const toY = (mm: number) => offsetY + gcH - mm * scale;

  const raidW = 30 * scale;
  const barreauW = Math.max(1, 4 * scale);
  const lisseH = 25 * scale;
  const mcH = mc.hauteur * scale;
  const sabotW = 50 * scale;
  const sabotH = 20 * scale;
  const dalleH = 8;

  // Generate all possible slot positions (evenly spaced at ~ESPACEMENT_BARREAU)
  const slotSpacing = ESPACEMENT_BARREAU; // 130mm
  const nbSlots = Math.max(2, Math.ceil(totalWidth / slotSpacing) + 1);
  const slotStep = totalWidth / (nbSlots - 1);

  const slots = useMemo(() => {
    const s: number[] = [];
    for (let i = 0; i < nbSlots; i++) {
      s.push(Math.round(i * slotStep));
    }
    return s;
  }, [nbSlots, slotStep]);

  // Current raidisseur positions (from manual or auto)
  const currentRaidPositions = useMemo(() => {
    if (t.posRaidForce && t.posRaidForce.length >= 2) return t.posRaidForce;
    const positions: number[] = [];
    for (let i = 0; i < rt.nbRaid; i++) {
      positions.push(Math.round(i * rt.entraxeEff));
    }
    return positions;
  }, [t.posRaidForce, rt.nbRaid, rt.entraxeEff]);

  const raidSet = useMemo(() => new Set(currentRaidPositions.map(p => Math.round(p))), [currentRaidPositions]);

  const isRaid = (slotPos: number) => {
    for (const rp of raidSet) {
      if (Math.abs(rp - slotPos) < slotStep * 0.4) return true;
    }
    return false;
  };

  const toggleSlot = (slotPos: number) => {
    const wasRaid = isRaid(slotPos);
    let newPositions: number[];

    if (wasRaid) {
      // Remove closest raidisseur
      newPositions = currentRaidPositions.filter(p => Math.abs(p - slotPos) >= slotStep * 0.4);
      if (newPositions.length < 2) return; // minimum 2 raidisseurs
    } else {
      // Add raidisseur at this slot
      newPositions = [...currentRaidPositions, slotPos].sort((a, b) => a - b);
    }

    onUpdateTravee({
      nbRaidForce: newPositions.length,
      posRaidForce: newPositions,
      raidCentre: { nb: newPositions.length, positions: newPositions },
    });
  };

  // Compute barreaux between raidisseurs
  const barreauPositions = useMemo(() => {
    const bars: number[] = [];
    if (!gc.hasBarreaux) return bars;
    const sorted = [...currentRaidPositions].sort((a, b) => a - b);
    for (let i = 0; i < sorted.length - 1; i++) {
      const left = sorted[i];
      const right = sorted[i + 1];
      const interval = right - left;
      const nbBar = Math.ceil(interval / ESPACEMENT_BARREAU) - 1;
      if (nbBar > 0) {
        const esp = interval / (nbBar + 1);
        for (let j = 1; j <= nbBar; j++) {
          bars.push(left + j * esp);
        }
      }
    }
    return bars;
  }, [currentRaidPositions, gc.hasBarreaux]);

  const col = {
    bg: '#14161d',
    dalle: '#4b5563',
    sabot: '#6b7280',
    raid: '#ef4444',
    raidHover: '#22c55e',
    slotEmpty: '#2a2d35',
    slotHover: '#22c55e',
    barreau: '#60a5fa',
    lisse: '#94a3b8',
    mc: '#e2e8f0',
    remplissage: '#3b82f6',
    dim: '#f59e0b',
    label: '#9ca3af',
    text: '#d1d5db',
  };

  const arrowId = `gc-int-${t.id}`;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-400">Cliquez sur les emplacements pour placer/retirer des raidisseurs</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500/60" /> Raidisseur</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-[#2a2d35] bg-[#1e2028]" /> Emplacement libre</span>
        <span className="text-gray-600">|</span>
        <span className="text-gray-500">{currentRaidPositions.length} raidisseurs</span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full cursor-crosshair"
          style={{ maxHeight: 340 }}
        >
          <defs>
            <marker id={`${arrowId}-s`} markerWidth={6} markerHeight={4} refX={0} refY={2} orient="auto">
              <path d="M6,0 L0,2 L6,4" fill="none" stroke={col.dim} strokeWidth={0.7} />
            </marker>
            <marker id={`${arrowId}-e`} markerWidth={6} markerHeight={4} refX={6} refY={2} orient="auto">
              <path d="M0,0 L6,2 L0,4" fill="none" stroke={col.dim} strokeWidth={0.7} />
            </marker>
          </defs>

          <rect width={svgW} height={svgH} fill={col.bg} rx={4} />

          <text x={svgW / 2} y={18} textAnchor="middle" fill={col.text} fontSize={11} fontFamily="monospace" fontWeight="bold">
            Vue de face interactive — {gc.label} — {totalWidth} x {totalHeight} mm
          </text>

          {/* Dalle */}
          <rect x={toX(-40)} y={toY(0)} width={gcW + 80} height={dalleH} fill={col.dalle} />

          {/* Lisse basse */}
          <rect x={toX(0)} y={toY(lisseH / scale) - 0.5} width={gcW} height={lisseH} fill={col.lisse} stroke="#64748b" strokeWidth={0.5} opacity={0.8} rx={1} />

          {/* Main courante */}
          <rect x={toX(0) - 4} y={toY(totalHeight)} width={gcW + 8} height={mcH + 2} fill={col.mc} stroke="#94a3b8" strokeWidth={0.7} rx={2} />
          <text x={toX(totalWidth / 2)} y={toY(totalHeight) + mcH / 2 + 3} textAnchor="middle" fill={col.bg} fontSize={7} fontFamily="monospace" fontWeight="bold">{mc.label}</text>

          {/* Barreaux */}
          {gc.hasBarreaux && barreauPositions.map((pos, i) => (
            <line key={`bar-${i}`} x1={toX(pos)} y1={toY(lisseH / scale)} x2={toX(pos)} y2={toY(totalHeight - mcH / scale)} stroke={col.barreau} strokeWidth={barreauW} opacity={0.5} />
          ))}

          {/* Remplissage panels */}
          {gc.hasRemplissage && (() => {
            const sorted = [...currentRaidPositions].sort((a, b) => a - b);
            return sorted.slice(0, -1).map((pos, i) => {
              const next = sorted[i + 1];
              const px = toX(pos) + raidW / 2 + 2;
              const pw = toX(next) - toX(pos) - raidW - 4;
              const pBottom = lisseH / scale + 10;
              const pTop = totalHeight - mcH / scale - 10;
              return <rect key={`panel-${i}`} x={px} y={toY(pTop)} width={pw} height={(pTop - pBottom) * scale} fill={col.remplissage} opacity={0.12} stroke={col.remplissage} strokeWidth={0.5} strokeDasharray="4,2" rx={1} />;
            });
          })()}

          {/* Clickable slots */}
          {slots.map((slotPos, si) => {
            const isR = isRaid(slotPos);
            const isHover = hoverSlot === si;
            const fillColor = isR ? col.raid : isHover ? col.slotHover : col.slotEmpty;
            const opacity = isR ? 0.5 : isHover ? 0.3 : 0.15;

            return (
              <g key={`slot-${si}`}
                onMouseEnter={() => setHoverSlot(si)}
                onMouseLeave={() => setHoverSlot(null)}
                onClick={() => toggleSlot(slotPos)}
                className="cursor-pointer"
              >
                {/* Clickable area */}
                <rect
                  x={toX(slotPos) - raidW / 2 - 2}
                  y={toY(totalHeight) - 2}
                  width={raidW + 4}
                  height={gcH + 4}
                  fill="transparent"
                />
                {/* Raidisseur or slot marker */}
                <rect
                  x={toX(slotPos) - raidW / 2}
                  y={toY(totalHeight)}
                  width={raidW}
                  height={gcH}
                  fill={fillColor}
                  opacity={opacity}
                  stroke={isR ? col.raid : isHover ? col.slotHover : '#353840'}
                  strokeWidth={isR ? 1.5 : isHover ? 1 : 0.5}
                  strokeDasharray={isR ? '' : '3,3'}
                  rx={1}
                />
                {/* Sabot */}
                {isR && (
                  <rect x={toX(slotPos) - sabotW / 2} y={toY(0) - sabotH} width={sabotW} height={sabotH} fill={col.sabot} stroke="#9ca3af" strokeWidth={0.5} rx={1} />
                )}
                {/* Position label */}
                {(isR || isHover) && (
                  <text x={toX(slotPos)} y={toY(0) + dalleH + 16} textAnchor="middle" fill={isR ? col.raid : col.slotHover} fontSize={7} fontFamily="monospace" fontWeight={isR ? 'bold' : 'normal'}>
                    {slotPos}
                  </text>
                )}
                {/* Hover indicator */}
                {isHover && !isR && (
                  <text x={toX(slotPos)} y={toY(totalHeight) - 6} textAnchor="middle" fill={col.slotHover} fontSize={8} fontFamily="monospace">+</text>
                )}
                {isHover && isR && (
                  <text x={toX(slotPos)} y={toY(totalHeight) - 6} textAnchor="middle" fill={col.raid} fontSize={8} fontFamily="monospace">×</text>
                )}
              </g>
            );
          })}

          {/* Dimensions: width */}
          {(() => {
            const dimY = toY(0) + dalleH + 28;
            return (
              <g>
                <line x1={toX(0)} y1={toY(0) + dalleH + 4} x2={toX(0)} y2={dimY + 4} stroke={col.dim} strokeWidth={0.4} />
                <line x1={toX(totalWidth)} y1={toY(0) + dalleH + 4} x2={toX(totalWidth)} y2={dimY + 4} stroke={col.dim} strokeWidth={0.4} />
                <line x1={toX(0)} y1={dimY} x2={toX(totalWidth)} y2={dimY} stroke={col.dim} strokeWidth={0.6} markerStart={`url(#${arrowId}-s)`} markerEnd={`url(#${arrowId}-e)`} />
                <text x={toX(totalWidth / 2)} y={dimY + 14} textAnchor="middle" fill={col.dim} fontSize={9} fontFamily="monospace">{totalWidth} mm</text>
              </g>
            );
          })()}

          {/* Dimensions: height */}
          {(() => {
            const dimX = toX(totalWidth) + 30;
            return (
              <g>
                <line x1={toX(totalWidth) + 6} y1={toY(0)} x2={dimX + 4} y2={toY(0)} stroke={col.dim} strokeWidth={0.4} />
                <line x1={toX(totalWidth) + 6} y1={toY(totalHeight)} x2={dimX + 4} y2={toY(totalHeight)} stroke={col.dim} strokeWidth={0.4} />
                <line x1={dimX} y1={toY(0)} x2={dimX} y2={toY(totalHeight)} stroke={col.dim} strokeWidth={0.6} markerStart={`url(#${arrowId}-s)`} markerEnd={`url(#${arrowId}-e)`} />
                <text x={dimX + 14} y={(toY(0) + toY(totalHeight)) / 2} textAnchor="middle" fill={col.dim} fontSize={9} fontFamily="monospace" transform={`rotate(-90, ${dimX + 14}, ${(toY(0) + toY(totalHeight)) / 2})`}>H = {totalHeight} mm</text>
              </g>
            );
          })()}

          {/* Entraxe dimension */}
          {currentRaidPositions.length >= 2 && (() => {
            const sorted = [...currentRaidPositions].sort((a, b) => a - b);
            const dimY = toY(totalHeight) - 18;
            return (
              <g>
                <line x1={toX(sorted[0])} y1={toY(totalHeight) - 2} x2={toX(sorted[0])} y2={dimY - 4} stroke={col.dim} strokeWidth={0.4} />
                <line x1={toX(sorted[1])} y1={toY(totalHeight) - 2} x2={toX(sorted[1])} y2={dimY - 4} stroke={col.dim} strokeWidth={0.4} />
                <line x1={toX(sorted[0])} y1={dimY} x2={toX(sorted[1])} y2={dimY} stroke={col.dim} strokeWidth={0.6} markerStart={`url(#${arrowId}-s)`} markerEnd={`url(#${arrowId}-e)`} />
                <text x={(toX(sorted[0]) + toX(sorted[1])) / 2} y={dimY - 5} textAnchor="middle" fill={col.dim} fontSize={8} fontFamily="monospace">
                  {Math.round(sorted[1] - sorted[0])} mm
                </text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
