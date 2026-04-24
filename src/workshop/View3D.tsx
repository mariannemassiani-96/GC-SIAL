import { useState, useMemo } from 'react';
import type { Plan } from './types';
import { isoProject, isoBox, isoPointsToSvg, isoFloor, isoBatimentWalls, getDefaultHeight, darken, lighten, isoSort } from './iso3d';
import { longueurMur } from './murTool';
import { ArrowLeft, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';

interface View3DProps {
  plan: Plan;
  niveauActif: string;
  onBack: () => void;
}

export function View3D({ plan, niveauActif, onBack }: View3DProps) {
  const [scale, setScale] = useState(0.12);
  const [rotationOffset, setRotationOffset] = useState(0);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const niveau = plan.niveaux.find(n => n.id === niveauActif);
  const hauteurPlafond = niveau?.hauteurSousPlafond ?? 350;

  const objetsNiveau = useMemo(() =>
    isoSort(plan.objets.filter(o => o.niveau === niveauActif)),
    [plan.objets, niveauActif]
  );

  const mursNiveau = (plan.murs ?? []).filter(m => m.niveau === niveauActif);

  // Centre du bâtiment pour le centrage SVG
  const bat = plan.batiment;
  const cx = bat.x + bat.largeur / 2;
  const cy = bat.y + bat.hauteur / 2;

  // Projection avec rotation
  const proj = (x: number, y: number, z: number) => {
    const rx = (x - cx) * Math.cos(rotationOffset * Math.PI / 180) - (y - cy) * Math.sin(rotationOffset * Math.PI / 180) + cx;
    const ry = (x - cx) * Math.sin(rotationOffset * Math.PI / 180) + (y - cy) * Math.cos(rotationOffset * Math.PI / 180) + cy;
    return isoProject(rx, ry, z, scale);
  };

  // ViewBox centré
  const center = proj(cx, cy, 0);
  const viewW = 1200;
  const viewH = 800;
  const vbX = center.x - viewW / 2;
  const vbY = center.y - viewH / 2;

  return (
    <div className="w-full h-full bg-[#080a0f] flex flex-col">
      {/* Toolbar */}
      <div className="bg-[#0f1117] border-b border-[#252830] px-4 py-2 flex items-center gap-3 shrink-0">
        <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={16} /></button>
        <span className="text-sm font-semibold text-white">Vue 3D — {plan.nom}</span>
        <div className="flex-1" />
        <button onClick={() => setRotationOffset(r => r - 15)} className="p-1.5 text-gray-400 hover:text-white bg-[#252830] rounded" title="Rotation gauche">
          <RotateCw size={14} className="scale-x-[-1]" />
        </button>
        <button onClick={() => setRotationOffset(r => r + 15)} className="p-1.5 text-gray-400 hover:text-white bg-[#252830] rounded" title="Rotation droite">
          <RotateCw size={14} />
        </button>
        <button onClick={() => setScale(s => Math.min(0.3, s * 1.2))} className="p-1.5 text-gray-400 hover:text-white bg-[#252830] rounded">
          <ZoomIn size={14} />
        </button>
        <button onClick={() => setScale(s => Math.max(0.03, s * 0.8))} className="p-1.5 text-gray-400 hover:text-white bg-[#252830] rounded">
          <ZoomOut size={14} />
        </button>
        <span className="text-xs text-gray-600 ml-2">Rotation: {rotationOffset}° | Echelle: {(scale * 100).toFixed(0)}%</span>
      </div>

      {/* SVG 3D */}
      <svg viewBox={`${vbX} ${vbY} ${viewW} ${viewH}`} className="flex-1 w-full" preserveAspectRatio="xMidYMid meet">
        {/* Sol du bâtiment */}
        <polygon points={isoPointsToSvg(isoFloor(bat, scale))} fill="#1a1e2e" stroke="#2a3040" strokeWidth="0.5" />

        {/* Grille au sol */}
        {Array.from({ length: Math.ceil(bat.largeur / 500) + 1 }, (_, i) => {
          const gx = bat.x + i * 500;
          const p1 = isoProject(gx, bat.y, 0, scale);
          const p2 = isoProject(gx, bat.y + bat.hauteur, 0, scale);
          return <line key={`gx${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#1e2535" strokeWidth="0.3" />;
        })}
        {Array.from({ length: Math.ceil(bat.hauteur / 500) + 1 }, (_, i) => {
          const gy = bat.y + i * 500;
          const p1 = isoProject(bat.x, gy, 0, scale);
          const p2 = isoProject(bat.x + bat.largeur, gy, 0, scale);
          return <line key={`gy${i}`} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="#1e2535" strokeWidth="0.3" />;
        })}

        {/* Murs extérieurs */}
        {isoBatimentWalls(bat, hauteurPlafond, scale).map((w, i) => (
          <polygon key={`bw${i}`} points={w.points} fill={w.fill} stroke="#1e293b" strokeWidth="0.5" opacity={0.6} />
        ))}

        {/* Murs dessinés en 3D */}
        {mursNiveau.map(m => {
          const len = longueurMur(m);
          if (len < 5) return null;
          const dx = m.x2 - m.x1;
          const dy = m.y2 - m.y1;
          const angle = Math.atan2(dy, dx);
          const nx = -Math.sin(angle) * m.epaisseur / 2;
          const ny = Math.cos(angle) * m.epaisseur / 2;
          const h = 300; // hauteur mur standard 3m

          const p1 = isoProject(m.x1 + nx, m.y1 + ny, 0, scale);
          const p2 = isoProject(m.x2 + nx, m.y2 + ny, 0, scale);
          const p3 = isoProject(m.x2 + nx, m.y2 + ny, h, scale);
          const p4 = isoProject(m.x1 + nx, m.y1 + ny, h, scale);
          const pts = [p1, p2, p3, p4];

          return (
            <polygon key={m.id} points={isoPointsToSvg(pts)} fill={m.couleur} stroke="#1e293b" strokeWidth="0.3" opacity={0.7} />
          );
        })}

        {/* Objets 3D */}
        {objetsNiveau.map(o => {
          if (o.type === 'zone' || o.type === 'exterieur' || o.type === 'parking') return null;
          const h = getDefaultHeight(o);
          const z = o.positionZ ?? 0;
          const color = o.couleur ?? '#60a5fa';
          const box = isoBox(o.x, o.y, o.largeur, o.hauteur, h, z, scale);
          const isHovered = hoveredId === o.id;

          return (
            <g key={o.id}
              onMouseEnter={() => setHoveredId(o.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{ cursor: 'pointer' }}>
              {/* Face gauche (plus sombre) */}
              <polygon points={isoPointsToSvg(box.left)} fill={darken(color, 0.3)} stroke="#0f172a" strokeWidth="0.3" opacity={isHovered ? 1 : 0.85} />
              {/* Face droite */}
              <polygon points={isoPointsToSvg(box.right)} fill={darken(color, 0.15)} stroke="#0f172a" strokeWidth="0.3" opacity={isHovered ? 1 : 0.85} />
              {/* Face avant */}
              <polygon points={isoPointsToSvg(box.front)} fill={darken(color, 0.2)} stroke="#0f172a" strokeWidth="0.3" opacity={isHovered ? 1 : 0.85} />
              {/* Dessus (plus clair) */}
              <polygon points={isoPointsToSvg(box.top)} fill={isHovered ? lighten(color, 0.3) : color} stroke="#0f172a" strokeWidth="0.3" opacity={isHovered ? 1 : 0.85} />

              {/* Label */}
              {(() => {
                const topCenter = isoProject(o.x + o.largeur / 2, o.y + o.hauteur / 2, z + h + 20, scale);
                return (
                  <text x={topCenter.x} y={topCenter.y} textAnchor="middle" fontSize="4" fill={isHovered ? '#fff' : '#94a3b8'} fontFamily="system-ui">
                    {o.nom}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {/* Poteaux (colonnes) — cylindres simplifiés */}
        {objetsNiveau.filter(o => o.type === 'colonne').map(o => {
          const h = getDefaultHeight(o);
          const z = o.positionZ ?? 0;
          const cx = o.x + o.largeur / 2;
          const cy = o.y + o.hauteur / 2;
          const r = o.largeur / 2;
          const top = isoProject(cx, cy, z + h, scale);
          const bot = isoProject(cx, cy, z, scale);
          return (
            <g key={`col3d-${o.id}`}>
              <line x1={bot.x} y1={bot.y} x2={top.x} y2={top.y} stroke="#64748b" strokeWidth={r * scale * 2} strokeLinecap="round" opacity={0.7} />
              <circle cx={top.x} cy={top.y} r={r * scale} fill="#94a3b8" stroke="#475569" strokeWidth="0.3" />
            </g>
          );
        })}

        {/* Info tooltip en survol */}
        {hoveredId && (() => {
          const o = plan.objets.find(ob => ob.id === hoveredId);
          if (!o) return null;
          const h = getDefaultHeight(o);
          const tp = isoProject(o.x + o.largeur / 2, o.y + o.hauteur / 2, (o.positionZ ?? 0) + h + 50, scale);
          return (
            <g>
              <rect x={tp.x - 40} y={tp.y - 16} width="80" height="20" rx="3" fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
              <text x={tp.x} y={tp.y - 3} textAnchor="middle" fontSize="4" fill="#e2e8f0" fontFamily="system-ui">{o.nom}</text>
              <text x={tp.x} y={tp.y + 3} textAnchor="middle" fontSize="3" fill="#94a3b8" fontFamily="monospace">
                {(o.largeur / 100).toFixed(1)}×{(o.hauteur / 100).toFixed(1)}m h={h}cm
              </text>
            </g>
          );
        })()}
      </svg>
    </div>
  );
}
