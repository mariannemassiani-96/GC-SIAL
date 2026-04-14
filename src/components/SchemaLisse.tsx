import type { ResultatTravee } from '../types';

interface SchemaLisseProps {
  rt: ResultatTravee;
  lisseIndex: number;
  lisseLabel: string;
}

export function SchemaLisse({ rt, lisseIndex, lisseLabel }: SchemaLisseProps) {
  const u = rt.usinages[lisseIndex];
  if (!u) return null;

  const L = rt.longueurLisse;
  const padding = 40;
  const svgWidth = 800;
  const barY = 60;
  const barH = 24;
  const scale = (svgWidth - 2 * padding) / L;
  const toX = (mm: number) => padding + mm * scale;

  // Identify which percageLisse positions are raidisseur positions
  const raidSet = new Set(rt.posRaidisseurs.map((p) => Math.round(p * 10) / 10));
  const goupilleG = 68.3;
  const goupilleD = Math.round((L - 68.3) * 10) / 10;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${svgWidth} 200`}
        className="w-full min-w-[700px]"
        style={{ maxHeight: 200 }}
      >
        {/* Background */}
        <rect width={svgWidth} height={200} fill="#14161d" rx={4} />

        {/* Lisse bar */}
        <rect
          x={toX(0)}
          y={barY}
          width={toX(L) - toX(0)}
          height={barH}
          fill="#2a2d38"
          stroke="#4a4d58"
          strokeWidth={1}
          rx={2}
        />

        {/* Label */}
        <text x={svgWidth / 2} y={20} textAnchor="middle" fill="#9ca3af" fontSize={11} fontFamily="monospace">
          Lisse {lisseLabel} — L = {L.toFixed(1)} mm
        </text>

        {/* Total length dimension line */}
        <line x1={toX(0)} y1={barY + barH + 40} x2={toX(L)} y2={barY + barH + 40} stroke="#555" strokeWidth={0.5} />
        <line x1={toX(0)} y1={barY + barH + 35} x2={toX(0)} y2={barY + barH + 45} stroke="#555" strokeWidth={0.5} />
        <line x1={toX(L)} y1={barY + barH + 35} x2={toX(L)} y2={barY + barH + 45} stroke="#555" strokeWidth={0.5} />
        <text x={svgWidth / 2} y={barY + barH + 55} textAnchor="middle" fill="#9ca3af" fontSize={9} fontFamily="monospace">
          {L.toFixed(1)} mm
        </text>

        {/* Goupilles d'extrémité — triangles */}
        {[goupilleG, goupilleD].map((pos, i) => (
          <g key={`goup-${i}`}>
            <line
              x1={toX(pos)}
              y1={barY - 2}
              x2={toX(pos)}
              y2={barY + barH + 2}
              stroke="#22c55e"
              strokeWidth={1.5}
              strokeDasharray="3,2"
            />
            <text
              x={toX(pos)}
              y={barY - 6}
              textAnchor="middle"
              fill="#22c55e"
              fontSize={7}
              fontFamily="monospace"
            >
              {pos.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Barreau positions (not raidisseurs, not goupilles) */}
        {u.percageLisse
          .filter(
            (p) =>
              !raidSet.has(Math.round(p * 10) / 10) &&
              Math.abs(p - goupilleG) > 0.05 &&
              Math.abs(p - goupilleD) > 0.05
          )
          .map((pos, i) => (
            <line
              key={`bar-${i}`}
              x1={toX(pos)}
              y1={barY + 2}
              x2={toX(pos)}
              y2={barY + barH - 2}
              stroke="#60a5fa"
              strokeWidth={1}
              opacity={0.6}
            />
          ))}

        {/* Raidisseur positions — thick red lines */}
        {rt.posRaidisseurs.map((pos, i) => (
          <g key={`raid-${i}`}>
            <rect
              x={toX(pos) - 3}
              y={barY - 14}
              width={6}
              height={barH + 28}
              fill="#ef4444"
              opacity={0.25}
              rx={1}
            />
            <line
              x1={toX(pos)}
              y1={barY - 14}
              x2={toX(pos)}
              y2={barY + barH + 14}
              stroke="#ef4444"
              strokeWidth={2}
            />
            <text
              x={toX(pos)}
              y={barY + barH + 25}
              textAnchor="middle"
              fill="#f87171"
              fontSize={7}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {pos.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Entraxe dimension between first two raidisseurs */}
        {rt.posRaidisseurs.length >= 2 && (
          <g>
            <line
              x1={toX(rt.posRaidisseurs[0])}
              y1={barY - 26}
              x2={toX(rt.posRaidisseurs[1])}
              y2={barY - 26}
              stroke="#f59e0b"
              strokeWidth={0.7}
              markerEnd="url(#arrowEnd)"
              markerStart="url(#arrowStart)"
            />
            <text
              x={(toX(rt.posRaidisseurs[0]) + toX(rt.posRaidisseurs[1])) / 2}
              y={barY - 30}
              textAnchor="middle"
              fill="#f59e0b"
              fontSize={8}
              fontFamily="monospace"
            >
              entraxe {rt.entraxeEff.toFixed(1)}
            </text>
          </g>
        )}

        {/* Legend */}
        <g transform={`translate(${padding}, 175)`}>
          <rect x={0} y={-5} width={8} height={8} fill="#ef4444" opacity={0.7} rx={1} />
          <text x={12} y={3} fill="#9ca3af" fontSize={8} fontFamily="monospace">Raidisseur</text>

          <line x1={80} y1={-1} x2={88} y2={-1} stroke="#60a5fa" strokeWidth={1.5} />
          <text x={92} y={3} fill="#9ca3af" fontSize={8} fontFamily="monospace">Barreau</text>

          <line x1={150} y1={-1} x2={158} y2={-1} stroke="#22c55e" strokeWidth={1.5} strokeDasharray="3,2" />
          <text x={162} y={3} fill="#9ca3af" fontSize={8} fontFamily="monospace">Goupille ext.</text>

          <line x1={250} y1={-4} x2={250} y2={4} stroke="#f59e0b" strokeWidth={0.7} />
          <line x1={248} y1={0} x2={258} y2={0} stroke="#f59e0b" strokeWidth={0.7} />
          <text x={262} y={3} fill="#9ca3af" fontSize={8} fontFamily="monospace">Entraxe</text>
        </g>

        {/* Arrow markers */}
        <defs>
          <marker id="arrowEnd" markerWidth={6} markerHeight={4} refX={6} refY={2} orient="auto">
            <path d="M0,0 L6,2 L0,4" fill="none" stroke="#f59e0b" strokeWidth={0.7} />
          </marker>
          <marker id="arrowStart" markerWidth={6} markerHeight={4} refX={0} refY={2} orient="auto">
            <path d="M6,0 L0,2 L6,4" fill="none" stroke="#f59e0b" strokeWidth={0.7} />
          </marker>
        </defs>
      </svg>
    </div>
  );
}
