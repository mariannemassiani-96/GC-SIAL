import { useState, useCallback, useRef } from 'react';
import type { Travee, FixationId } from '../types';

interface Props {
  travee: Travee;
  onUpdate: (patch: Partial<Travee>) => void;
}

type FixRetour = 'mur' | 'libre';

interface Point { x: number; y: number; }

interface Segment {
  label: string;
  color: string;
  start: Point;
  end: Point;
  longueur: number;
  direction: 'h' | 'v';
}

type EndType = 'libre' | 'mur' | 'raccord90';
type SelectedEnd = 'startG' | 'endD' | 'retourG' | 'retourD' | null;

const GRID = 10; // mm per grid unit
const PX_PER_MM = 0.12;

function snap(v: number, grid: number): number {
  return Math.round(v / grid) * grid;
}

function buildSegments(t: Travee): Segment[] {
  const segs: Segment[] = [];
  const isU = t.coupeG === '45' && t.coupeD === '45';
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';

  const originX = 80;
  const originY = 300;

  // Left branch (vertical, going up)
  if (hasAngleG) {
    const len = isU ? (t.largeur3 || 1000) : (t.largeur2 || 1000);
    segs.push({
      label: isU ? 'Gauche' : 'Retour G',
      color: '#f59e0b',
      start: { x: originX, y: originY },
      end: { x: originX, y: originY - len * PX_PER_MM },
      longueur: len,
      direction: 'v',
    });
  }

  // Centre (horizontal)
  segs.push({
    label: hasAngleG || hasAngleD ? 'Centre' : 'Travée',
    color: '#3b82f6',
    start: { x: originX, y: originY },
    end: { x: originX + t.largeur * PX_PER_MM, y: originY },
    longueur: t.largeur,
    direction: 'h',
  });

  // Right branch (vertical, going up)
  if (hasAngleD) {
    const endX = originX + t.largeur * PX_PER_MM;
    segs.push({
      label: isU ? 'Droite' : 'Retour D',
      color: '#10b981',
      start: { x: endX, y: originY },
      end: { x: endX, y: originY - t.largeur2 * PX_PER_MM },
      longueur: t.largeur2,
      direction: 'v',
    });
  }

  return segs;
}

const FIX_OPTIONS: { id: EndType; label: string; icon: string }[] = [
  { id: 'libre', label: 'Bouchon', icon: '○' },
  { id: 'mur', label: 'Fixation murale', icon: '█' },
  { id: 'raccord90', label: 'Angle 90°', icon: '┘' },
];

const FIX_RETOUR_OPTIONS: { id: FixRetour; label: string }[] = [
  { id: 'libre', label: 'Bouchon' },
  { id: 'mur', label: 'Fixation murale' },
];

export function TraveePaint({ travee: t, onUpdate }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ seg: number; end: 'start' | 'end' } | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<SelectedEnd>(null);

  const segments = buildSegments(t);
  const isU = t.coupeG === '45' && t.coupeD === '45';
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';

  const svgW = 700;
  const svgH = 400;

  const getFixG = (): EndType => {
    if (t.fixG === 'raccord90') return 'raccord90';
    if (t.fixG === 'mur_g' || t.fixG === 'mur_d') return 'mur';
    return 'libre';
  };
  const getFixD = (): EndType => {
    if (t.fixD === 'raccord90') return 'raccord90';
    if (t.fixD === 'mur_d' || t.fixD === 'mur_g') return 'mur';
    return 'libre';
  };

  const setFixG = (v: EndType) => {
    const patch: Partial<Travee> = {};
    if (v === 'raccord90') { patch.fixG = 'raccord90'; patch.coupeG = '45'; if (!t.largeur2 && !isU) patch.largeur2 = 1000; if (isU && !t.largeur3) patch.largeur3 = 1000; }
    else if (v === 'mur') { patch.fixG = 'mur_g'; patch.coupeG = '90'; if (!hasAngleD) { patch.largeur2 = 0; patch.largeur3 = 0; } }
    else { patch.fixG = 'libre' as FixationId; patch.coupeG = '90'; if (!hasAngleD) { patch.largeur2 = 0; patch.largeur3 = 0; } }
    onUpdate(patch);
    setSelectedEnd(null);
  };

  const setFixD = (v: EndType) => {
    const patch: Partial<Travee> = {};
    if (v === 'raccord90') { patch.fixD = 'raccord90'; patch.coupeD = '45'; if (!t.largeur2) patch.largeur2 = 1000; }
    else if (v === 'mur') { patch.fixD = 'mur_d'; patch.coupeD = '90'; if (!hasAngleG) { patch.largeur2 = 0; } }
    else { patch.fixD = 'libre' as FixationId; patch.coupeD = '90'; if (!hasAngleG) { patch.largeur2 = 0; } }
    onUpdate(patch);
    setSelectedEnd(null);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const scaleX = svgW / rect.width;
    const scaleY = svgH / rect.height;
    const svgX = mx * scaleX;
    const svgY = my * scaleY;

    const seg = segments[dragging.seg];
    if (!seg) return;

    if (seg.direction === 'h') {
      const newLen = snap(Math.max(200, Math.abs(svgX - seg.start.x) / PX_PER_MM), 10);
      onUpdate({ largeur: newLen });
    } else if (seg.direction === 'v') {
      const newLen = snap(Math.max(200, Math.abs(seg.start.y - svgY) / PX_PER_MM), 10);
      if (seg.label === 'Gauche') onUpdate({ largeur3: newLen });
      else if (seg.label.includes('Retour G')) onUpdate({ largeur2: newLen });
      else onUpdate({ largeur2: newLen });
    }
  }, [dragging, segments, onUpdate]);

  const handleMouseUp = useCallback(() => setDragging(null), []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="font-medium text-white">Editeur de travee</span>
        <span>Cliquez les extremites pour changer la fixation — Tirez les bords pour ajuster les cotes</span>
      </div>

      <div className="bg-[#14161d] border border-[#252830] rounded-xl p-4 relative">
        <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 360 }}
          onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>

          {/* Grid */}
          <defs>
            <pattern id="paint-grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <rect width={20} height={20} fill="none" stroke="#1e2028" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width={svgW} height={svgH} fill="url(#paint-grid)" />

          {/* EXT / INT */}
          <text x={15} y={20} fill="#4b5563" fontSize={10} fontFamily="monospace">EXT</text>
          <text x={15} y={svgH - 10} fill="#6b7280" fontSize={10} fontFamily="monospace">INT</text>

          {/* Segments */}
          {segments.map((seg, si) => (
            <g key={si}>
              {/* Bar */}
              <line x1={seg.start.x} y1={seg.start.y} x2={seg.end.x} y2={seg.end.y}
                stroke={seg.color} strokeWidth={8} strokeLinecap="round" opacity={0.6} />
              <line x1={seg.start.x} y1={seg.start.y} x2={seg.end.x} y2={seg.end.y}
                stroke={seg.color} strokeWidth={2} />

              {/* Label */}
              <text x={(seg.start.x + seg.end.x) / 2 + (seg.direction === 'v' ? 18 : 0)}
                y={(seg.start.y + seg.end.y) / 2 + (seg.direction === 'h' ? -14 : 0)}
                textAnchor="middle" fill={seg.color} fontSize={10} fontFamily="monospace" fontWeight="bold">
                {seg.label}
              </text>

              {/* Dimension */}
              <text x={(seg.start.x + seg.end.x) / 2 + (seg.direction === 'v' ? 18 : 0)}
                y={(seg.start.y + seg.end.y) / 2 + (seg.direction === 'h' ? -4 : 12)}
                textAnchor="middle" fill="#f59e0b" fontSize={9} fontFamily="monospace">
                {seg.longueur} mm
              </text>

              {/* Drag handle at end */}
              <circle cx={seg.end.x} cy={seg.end.y} r={8} fill={seg.color} opacity={0.3}
                stroke={seg.color} strokeWidth={1.5} className="cursor-grab"
                onMouseDown={(e) => { e.stopPropagation(); setDragging({ seg: si, end: 'end' }); }} />
              <circle cx={seg.end.x} cy={seg.end.y} r={3} fill={seg.color} />
            </g>
          ))}

          {/* Fixation endpoints — clickable */}
          {/* Left end of centre (or junction with left branch) */}
          {!hasAngleG && (
            <g className="cursor-pointer" onClick={() => setSelectedEnd(selectedEnd === 'startG' ? null : 'startG')}>
              <circle cx={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.start.x}
                cy={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.start.y}
                r={12} fill={selectedEnd === 'startG' ? '#22c55e' : '#1e2028'} stroke={getFixG() === 'mur' ? '#9ca3af' : '#ef4444'} strokeWidth={2} />
              <text x={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.start.x}
                y={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.start.y + 4}
                textAnchor="middle" fill={getFixG() === 'mur' ? '#9ca3af' : '#ef4444'} fontSize={12} fontFamily="monospace">
                {getFixG() === 'mur' ? '█' : getFixG() === 'raccord90' ? '┘' : '○'}
              </text>
            </g>
          )}

          {/* Right end of centre (or junction with right branch) */}
          {!hasAngleD && (
            <g className="cursor-pointer" onClick={() => setSelectedEnd(selectedEnd === 'endD' ? null : 'endD')}>
              <circle cx={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.end.x}
                cy={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.end.y}
                r={12} fill={selectedEnd === 'endD' ? '#22c55e' : '#1e2028'} stroke={getFixD() === 'mur' ? '#9ca3af' : '#ef4444'} strokeWidth={2} />
              <text x={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.end.x}
                y={segments.find(s => s.label.includes('Centre') || s.label.includes('Trav'))!.end.y + 4}
                textAnchor="middle" fill={getFixD() === 'mur' ? '#9ca3af' : '#ef4444'} fontSize={12} fontFamily="monospace">
                {getFixD() === 'mur' ? '█' : getFixD() === 'raccord90' ? '┘' : '○'}
              </text>
            </g>
          )}

          {/* Left branch end (retour) */}
          {hasAngleG && (() => {
            const seg = segments.find(s => s.label === 'Gauche' || s.label === 'Retour G');
            if (!seg) return null;
            const isMur = (t.fixRetourG ?? 'libre') === 'mur';
            return (
              <g className="cursor-pointer" onClick={() => setSelectedEnd(selectedEnd === 'retourG' ? null : 'retourG')}>
                <circle cx={seg.end.x} cy={seg.end.y} r={10} fill={selectedEnd === 'retourG' ? '#22c55e' : '#1e2028'} stroke={isMur ? '#9ca3af' : '#ef4444'} strokeWidth={2} />
                <text x={seg.end.x} y={seg.end.y + 4} textAnchor="middle" fill={isMur ? '#9ca3af' : '#ef4444'} fontSize={10}>{isMur ? '█' : '○'}</text>
              </g>
            );
          })()}

          {/* Right branch end (retour) */}
          {hasAngleD && (() => {
            const seg = segments.find(s => s.label === 'Droite' || s.label === 'Retour D');
            if (!seg) return null;
            const isMur = (t.fixRetourD ?? 'libre') === 'mur';
            return (
              <g className="cursor-pointer" onClick={() => setSelectedEnd(selectedEnd === 'retourD' ? null : 'retourD')}>
                <circle cx={seg.end.x} cy={seg.end.y} r={10} fill={selectedEnd === 'retourD' ? '#22c55e' : '#1e2028'} stroke={isMur ? '#9ca3af' : '#ef4444'} strokeWidth={2} />
                <text x={seg.end.x} y={seg.end.y + 4} textAnchor="middle" fill={isMur ? '#9ca3af' : '#ef4444'} fontSize={10}>{isMur ? '█' : '○'}</text>
              </g>
            );
          })()}

          {/* Angle markers at junctions */}
          {hasAngleG && <text x={80 - 15} y={300 + 5} fill="#f59e0b" fontSize={8} fontFamily="monospace" textAnchor="end">90°</text>}
          {hasAngleD && <text x={80 + t.largeur * PX_PER_MM + 15} y={300 + 5} fill="#10b981" fontSize={8} fontFamily="monospace">90°</text>}
        </svg>

        {/* Fixation popup */}
        {selectedEnd === 'startG' && (
          <div className="absolute top-4 left-4 bg-[#181a20] border border-green-500/40 rounded-lg p-2 space-y-1 z-10">
            <p className="text-[10px] text-gray-500 mb-1">Fixation gauche</p>
            {FIX_OPTIONS.map(f => (
              <button key={f.id} onClick={() => setFixG(f.id)}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs ${getFixG() === f.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-[#252830]'}`}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        )}
        {selectedEnd === 'endD' && (
          <div className="absolute top-4 right-4 bg-[#181a20] border border-green-500/40 rounded-lg p-2 space-y-1 z-10">
            <p className="text-[10px] text-gray-500 mb-1">Fixation droite</p>
            {FIX_OPTIONS.map(f => (
              <button key={f.id} onClick={() => setFixD(f.id)}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs ${getFixD() === f.id ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-[#252830]'}`}>
                {f.icon} {f.label}
              </button>
            ))}
          </div>
        )}
        {selectedEnd === 'retourG' && (
          <div className="absolute top-4 left-4 bg-[#181a20] border border-amber-500/40 rounded-lg p-2 space-y-1 z-10">
            <p className="text-[10px] text-gray-500 mb-1">Bout retour gauche</p>
            {FIX_RETOUR_OPTIONS.map(f => (
              <button key={f.id} onClick={() => { onUpdate({ fixRetourG: f.id }); setSelectedEnd(null); }}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs ${(t.fixRetourG ?? 'libre') === f.id ? 'bg-amber-600/20 text-amber-400' : 'text-gray-400 hover:bg-[#252830]'}`}>
                {f.id === 'mur' ? '█' : '○'} {f.label}
              </button>
            ))}
          </div>
        )}
        {selectedEnd === 'retourD' && (
          <div className="absolute top-4 right-4 bg-[#181a20] border border-emerald-500/40 rounded-lg p-2 space-y-1 z-10">
            <p className="text-[10px] text-gray-500 mb-1">Bout retour droit</p>
            {FIX_RETOUR_OPTIONS.map(f => (
              <button key={f.id} onClick={() => { onUpdate({ fixRetourD: f.id }); setSelectedEnd(null); }}
                className={`block w-full text-left px-3 py-1.5 rounded text-xs ${(t.fixRetourD ?? 'libre') === f.id ? 'bg-emerald-600/20 text-emerald-400' : 'text-gray-400 hover:bg-[#252830]'}`}>
                {f.id === 'mur' ? '█' : '○'} {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick shape buttons */}
      <div className="flex items-center gap-2 text-xs">
        <span className="text-gray-500">Forme rapide :</span>
        <button onClick={() => onUpdate({ coupeG: '90', coupeD: '90', fixG: 'libre', fixD: 'libre', largeur2: 0, largeur3: 0 })}
          className="px-2 py-1 rounded border border-[#353840] text-gray-400 hover:text-white hover:border-blue-500/40">— Droit</button>
        <button onClick={() => onUpdate({ coupeG: '90', coupeD: '45', fixG: 'mur_g', fixD: 'raccord90', largeur2: t.largeur2 || 1000, largeur3: 0 })}
          className="px-2 py-1 rounded border border-[#353840] text-gray-400 hover:text-white hover:border-blue-500/40">⌐ L droite</button>
        <button onClick={() => onUpdate({ coupeG: '45', coupeD: '90', fixG: 'raccord90', fixD: 'libre', largeur2: t.largeur2 || 1000, largeur3: 0 })}
          className="px-2 py-1 rounded border border-[#353840] text-gray-400 hover:text-white hover:border-blue-500/40">¬ L gauche</button>
        <button onClick={() => onUpdate({ coupeG: '45', coupeD: '45', fixG: 'raccord90', fixD: 'raccord90', largeur2: t.largeur2 || 1000, largeur3: t.largeur3 || 1000 })}
          className="px-2 py-1 rounded border border-[#353840] text-gray-400 hover:text-white hover:border-amber-500/40">⊔ U</button>
      </div>
    </div>
  );
}
