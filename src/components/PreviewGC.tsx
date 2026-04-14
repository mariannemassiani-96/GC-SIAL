import type { ResultatTravee } from '../types';
import { TYPES_GC, TYPES_MC } from '../constants/typesGC';

interface PreviewGCProps {
  rt: ResultatTravee;
}

export function PreviewGC({ rt }: PreviewGCProps) {
  const t = rt.travee;
  const gc = TYPES_GC[t.typeGC];
  const mc = TYPES_MC[t.mc];

  // --- Physical dimensions (mm) ---
  const totalWidth = t.largeur;
  const totalHeight = t.hauteur;

  // --- SVG layout constants ---
  const svgW = 800;
  const svgH = 400;
  const margin = { top: 50, right: 100, bottom: 70, left: 100 };
  const drawW = svgW - margin.left - margin.right;
  const drawH = svgH - margin.top - margin.bottom;

  // Scale to fit the drawing area while preserving aspect ratio
  const scaleX = drawW / totalWidth;
  const scaleY = drawH / totalHeight;
  const scale = Math.min(scaleX, scaleY);

  // Centered offset within drawing area
  const gcW = totalWidth * scale;
  const gcH = totalHeight * scale;
  const offsetX = margin.left + (drawW - gcW) / 2;
  const offsetY = margin.top + (drawH - gcH) / 2;

  // Coordinate helpers: x in mm from left edge, y in mm from floor (0 = bottom)
  const toX = (mm: number) => offsetX + mm * scale;
  const toY = (mm: number) => offsetY + gcH - mm * scale;

  // --- Element dimensions (in mm, proportional) ---
  const raidW = 30 * scale; // raidisseur width in SVG px
  const barreauW = Math.max(1, 4 * scale); // barreau width
  const lisseH = 25 * scale; // rail height in SVG px
  const mcH = mc.hauteur * scale; // main courante height
  const sabotW = 50 * scale;
  const sabotH = 20 * scale;
  const dalleH = 8;

  // Raidisseur positions (relative to left edge of the guardrail, in mm)
  // posRaidisseurs are relative to the lisse (with DEPASSEMENT_LISSE offset)
  // We need positions relative to the guardrail width: raidisseur i is at i * entraxeEff
  const raidPositions: number[] = [];
  for (let i = 0; i < rt.nbRaid; i++) {
    raidPositions.push(i * rt.entraxeEff);
  }

  // Barreaux positions between raidisseurs
  const barreauPositions: number[] = [];
  if (gc.hasBarreaux) {
    for (let i = 0; i < rt.nbRaid - 1; i++) {
      const left = raidPositions[i];
      const right = raidPositions[i + 1];
      const interval = right - left;
      const nbBar = Math.ceil(interval / 130) - 1;
      if (nbBar > 0) {
        const esp = interval / (nbBar + 1);
        for (let j = 1; j <= nbBar; j++) {
          barreauPositions.push(left + j * esp);
        }
      }
    }
  }

  // Tube rond positions (horizontal tubes)
  const tubePositions: number[] = [];
  if (gc.nbTubesRonds > 0) {
    const barreauZone = totalHeight - mcH / scale - lisseH / scale;
    for (let i = 0; i < gc.nbTubesRonds; i++) {
      const y = (barreauZone / (gc.nbTubesRonds + 1)) * (i + 1);
      tubePositions.push(y);
    }
  }

  // Colors
  const col = {
    bg: '#14161d',
    dalle: '#4b5563',
    sabot: '#6b7280',
    raid: '#ef4444',
    barreau: '#60a5fa',
    lisse: '#94a3b8',
    mc: '#e2e8f0',
    remplissage: '#3b82f6',
    tube: '#a78bfa',
    dim: '#f59e0b',
    dimText: '#f59e0b',
    label: '#9ca3af',
    text: '#d1d5db',
  };

  // Unique IDs for markers (avoid collision if multiple instances)
  const arrowId = `gc-arrow-${t.id}`;
  const arrowStartId = `${arrowId}-s`;
  const arrowEndId = `${arrowId}-e`;

  // Dimension annotation helpers
  const dimOffset = 16;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="w-full"
        style={{ maxHeight: 300 }}
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Defs: arrow markers */}
        <defs>
          <marker
            id={arrowEndId}
            markerWidth={6}
            markerHeight={4}
            refX={6}
            refY={2}
            orient="auto"
          >
            <path d="M0,0 L6,2 L0,4" fill="none" stroke={col.dim} strokeWidth={0.7} />
          </marker>
          <marker
            id={arrowStartId}
            markerWidth={6}
            markerHeight={4}
            refX={0}
            refY={2}
            orient="auto"
          >
            <path d="M6,0 L0,2 L6,4" fill="none" stroke={col.dim} strokeWidth={0.7} />
          </marker>
        </defs>

        {/* Background */}
        <rect width={svgW} height={svgH} fill={col.bg} rx={4} />

        {/* Title */}
        <text
          x={svgW / 2}
          y={18}
          textAnchor="middle"
          fill={col.text}
          fontSize={11}
          fontFamily="monospace"
          fontWeight="bold"
        >
          Vue de face — {gc.label} — {totalWidth} x {totalHeight} mm
        </text>

        {/* ============ DALLE (floor line) ============ */}
        <rect
          x={toX(-40)}
          y={toY(0)}
          width={gcW + 80}
          height={dalleH}
          fill={col.dalle}
        />
        {/* Hatch lines on dalle */}
        {Array.from({ length: Math.floor((gcW + 80) / 12) }, (_, i) => (
          <line
            key={`hatch-${i}`}
            x1={toX(-40) + i * 12}
            y1={toY(0) + dalleH}
            x2={toX(-40) + i * 12 + 8}
            y2={toY(0)}
            stroke={col.bg}
            strokeWidth={0.5}
            opacity={0.5}
          />
        ))}

        {/* ============ SABOTS (footplates) ============ */}
        {raidPositions.map((pos, i) => (
          <rect
            key={`sabot-${i}`}
            x={toX(pos) - sabotW / 2}
            y={toY(0) - sabotH}
            width={sabotW}
            height={sabotH}
            fill={col.sabot}
            stroke="#9ca3af"
            strokeWidth={0.5}
            rx={1}
          />
        ))}

        {/* ============ LISSE BASSE (bottom rail) ============ */}
        <rect
          x={toX(0)}
          y={toY(lisseH / scale) - 0.5}
          width={gcW}
          height={lisseH}
          fill={col.lisse}
          stroke="#64748b"
          strokeWidth={0.5}
          opacity={0.8}
          rx={1}
        />
        <text
          x={toX(totalWidth / 2)}
          y={toY(lisseH / scale / 2) + 3}
          textAnchor="middle"
          fill={col.bg}
          fontSize={7}
          fontFamily="monospace"
        >
          Lisse basse
        </text>

        {/* ============ MAIN COURANTE / LISSE HAUTE (top rail) ============ */}
        <rect
          x={toX(0) - 4}
          y={toY(totalHeight)}
          width={gcW + 8}
          height={mcH + 2}
          fill={col.mc}
          stroke="#94a3b8"
          strokeWidth={0.7}
          rx={2}
        />
        <text
          x={toX(totalWidth / 2)}
          y={toY(totalHeight) + mcH / 2 + 3}
          textAnchor="middle"
          fill={col.bg}
          fontSize={7}
          fontFamily="monospace"
          fontWeight="bold"
        >
          {mc.label}
        </text>

        {/* ============ RAIDISSEURS (stiffeners) ============ */}
        {raidPositions.map((pos, i) => (
          <rect
            key={`raid-${i}`}
            x={toX(pos) - raidW / 2}
            y={toY(totalHeight)}
            width={raidW}
            height={gcH}
            fill={col.raid}
            opacity={0.35}
            stroke={col.raid}
            strokeWidth={1}
            rx={1}
          />
        ))}

        {/* ============ REMPLISSAGE (glass panel) ============ */}
        {gc.hasRemplissage &&
          raidPositions.slice(0, -1).map((pos, i) => {
            const nextPos = raidPositions[i + 1];
            const panelX = toX(pos) + raidW / 2 + 2;
            const panelW = toX(nextPos) - toX(pos) - raidW - 4;
            const panelBottom = lisseH / scale + 10;
            const panelTop = totalHeight - mcH / scale - 10;
            return (
              <rect
                key={`panel-${i}`}
                x={panelX}
                y={toY(panelTop)}
                width={panelW}
                height={(panelTop - panelBottom) * scale}
                fill={col.remplissage}
                opacity={0.12}
                stroke={col.remplissage}
                strokeWidth={0.5}
                strokeDasharray="4,2"
                rx={1}
              />
            );
          })}

        {/* ============ BARREAUX (vertical bars) ============ */}
        {gc.hasBarreaux &&
          barreauPositions.map((pos, i) => {
            const barBottom = lisseH / scale;
            const barTop = totalHeight - mcH / scale;
            return (
              <line
                key={`bar-${i}`}
                x1={toX(pos)}
                y1={toY(barBottom)}
                x2={toX(pos)}
                y2={toY(barTop)}
                stroke={col.barreau}
                strokeWidth={barreauW}
                opacity={0.7}
              />
            );
          })}

        {/* ============ TUBES RONDS (horizontal tubes) ============ */}
        {gc.nbTubesRonds > 0 &&
          tubePositions.map((yPos, i) => (
            <g key={`tube-${i}`}>
              <line
                x1={toX(0)}
                y1={toY(yPos)}
                x2={toX(totalWidth)}
                y2={toY(yPos)}
                stroke={col.tube}
                strokeWidth={Math.max(3, 12 * scale)}
                opacity={0.5}
                strokeLinecap="round"
              />
              <line
                x1={toX(0)}
                y1={toY(yPos)}
                x2={toX(totalWidth)}
                y2={toY(yPos)}
                stroke={col.tube}
                strokeWidth={0.7}
                opacity={0.9}
              />
            </g>
          ))}

        {/* ============ LISSE INTERMEDIAIRE (for barreau_vide) ============ */}
        {gc.hasLisseInter && (
          <rect
            x={toX(0)}
            y={toY(totalHeight * 0.45)}
            width={gcW}
            height={lisseH * 0.8}
            fill={col.lisse}
            stroke="#64748b"
            strokeWidth={0.5}
            opacity={0.7}
            rx={1}
          />
        )}

        {/* ============ DIMENSION: Total Width (bottom) ============ */}
        {(() => {
          const dimY = toY(0) + dalleH + 28;
          const extY1 = toY(0) + dalleH + 4;
          const extY2 = dimY + 4;
          return (
            <g>
              {/* Extension lines */}
              <line x1={toX(0)} y1={extY1} x2={toX(0)} y2={extY2} stroke={col.dim} strokeWidth={0.4} />
              <line x1={toX(totalWidth)} y1={extY1} x2={toX(totalWidth)} y2={extY2} stroke={col.dim} strokeWidth={0.4} />
              {/* Dimension line */}
              <line
                x1={toX(0)}
                y1={dimY}
                x2={toX(totalWidth)}
                y2={dimY}
                stroke={col.dim}
                strokeWidth={0.6}
                markerStart={`url(#${arrowStartId})`}
                markerEnd={`url(#${arrowEndId})`}
              />
              {/* Label */}
              <text
                x={toX(totalWidth / 2)}
                y={dimY + dimOffset}
                textAnchor="middle"
                fill={col.dimText}
                fontSize={9}
                fontFamily="monospace"
              >
                {totalWidth} mm
              </text>
            </g>
          );
        })()}

        {/* ============ DIMENSION: Height (right side) ============ */}
        {(() => {
          const dimX = toX(totalWidth) + 30;
          const extX1 = toX(totalWidth) + 6;
          const extX2 = dimX + 4;
          return (
            <g>
              {/* Extension lines */}
              <line x1={extX1} y1={toY(0)} x2={extX2} y2={toY(0)} stroke={col.dim} strokeWidth={0.4} />
              <line x1={extX1} y1={toY(totalHeight)} x2={extX2} y2={toY(totalHeight)} stroke={col.dim} strokeWidth={0.4} />
              {/* Dimension line */}
              <line
                x1={dimX}
                y1={toY(0)}
                x2={dimX}
                y2={toY(totalHeight)}
                stroke={col.dim}
                strokeWidth={0.6}
                markerStart={`url(#${arrowStartId})`}
                markerEnd={`url(#${arrowEndId})`}
              />
              {/* Label (rotated) */}
              <text
                x={dimX + dimOffset}
                y={(toY(0) + toY(totalHeight)) / 2}
                textAnchor="middle"
                fill={col.dimText}
                fontSize={9}
                fontFamily="monospace"
                transform={`rotate(-90, ${dimX + dimOffset}, ${(toY(0) + toY(totalHeight)) / 2})`}
              >
                H = {totalHeight} mm
              </text>
            </g>
          );
        })()}

        {/* ============ DIMENSION: Entraxe (top) ============ */}
        {raidPositions.length >= 2 && (() => {
          const dimY = toY(totalHeight) - 18;
          const extY1 = toY(totalHeight) - 2;
          const extY2 = dimY - 4;
          const x1 = raidPositions[0];
          const x2 = raidPositions[1];
          return (
            <g>
              {/* Extension lines */}
              <line x1={toX(x1)} y1={extY1} x2={toX(x1)} y2={extY2} stroke={col.dim} strokeWidth={0.4} />
              <line x1={toX(x2)} y1={extY1} x2={toX(x2)} y2={extY2} stroke={col.dim} strokeWidth={0.4} />
              {/* Dimension line */}
              <line
                x1={toX(x1)}
                y1={dimY}
                x2={toX(x2)}
                y2={dimY}
                stroke={col.dim}
                strokeWidth={0.6}
                markerStart={`url(#${arrowStartId})`}
                markerEnd={`url(#${arrowEndId})`}
              />
              {/* Label */}
              <text
                x={(toX(x1) + toX(x2)) / 2}
                y={dimY - 5}
                textAnchor="middle"
                fill={col.dimText}
                fontSize={8}
                fontFamily="monospace"
              >
                entraxe {rt.entraxeEff.toFixed(1)}
              </text>
            </g>
          );
        })()}

        {/* ============ LABELS: INT. / EXT. ============ */}
        <text
          x={toX(totalWidth / 2)}
          y={toY(totalHeight / 2) - 4}
          textAnchor="middle"
          fill={col.label}
          fontSize={13}
          fontFamily="monospace"
          fontWeight="bold"
          opacity={0.25}
        >
          INT.
        </text>
        <text
          x={toX(totalWidth / 2)}
          y={toY(totalHeight / 2) + 12}
          textAnchor="middle"
          fill={col.label}
          fontSize={8}
          fontFamily="monospace"
          opacity={0.2}
        >
          (face observateur)
        </text>
        <text
          x={toX(-20)}
          y={(toY(0) + toY(totalHeight)) / 2}
          textAnchor="end"
          fill={col.label}
          fontSize={9}
          fontFamily="monospace"
          opacity={0.4}
          transform={`rotate(-90, ${toX(-20)}, ${(toY(0) + toY(totalHeight)) / 2})`}
        >
          EXT.
        </text>

        {/* ============ LEGEND ============ */}
        <g transform={`translate(${margin.left}, ${svgH - 18})`}>
          <rect x={0} y={-6} width={8} height={8} fill={col.raid} opacity={0.6} rx={1} />
          <text x={12} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
            Raidisseur
          </text>

          {gc.hasBarreaux && (
            <>
              <line x1={80} y1={-2} x2={88} y2={-2} stroke={col.barreau} strokeWidth={1.5} />
              <text x={92} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
                Barreau
              </text>
            </>
          )}

          {gc.hasRemplissage && (
            <>
              <rect x={150} y={-6} width={12} height={8} fill={col.remplissage} opacity={0.2} stroke={col.remplissage} strokeWidth={0.5} />
              <text x={166} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
                Remplissage
              </text>
            </>
          )}

          {gc.nbTubesRonds > 0 && (
            <>
              <line x1={250} y1={-2} x2={262} y2={-2} stroke={col.tube} strokeWidth={2} opacity={0.6} />
              <text x={266} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
                Tube rond
              </text>
            </>
          )}

          <rect x={340} y={-6} width={12} height={8} fill={col.mc} opacity={0.8} rx={1} />
          <text x={356} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
            MC
          </text>

          <rect x={390} y={-6} width={12} height={8} fill={col.lisse} opacity={0.6} rx={1} />
          <text x={406} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
            Lisse
          </text>

          <rect x={450} y={-6} width={12} height={8} fill={col.sabot} opacity={0.8} rx={1} />
          <text x={466} y={2} fill={col.label} fontSize={7} fontFamily="monospace">
            Sabot
          </text>
        </g>
      </svg>
    </div>
  );
}
