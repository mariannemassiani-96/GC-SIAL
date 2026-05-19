import { useState, useCallback, useRef, useEffect } from 'react';
import type { Travee, FixationId } from '../types';

interface Props {
  travee: Travee;
  onUpdate: (patch: Partial<Travee>) => void;
}

interface Pt { x: number; y: number; }

const SNAP_ANGLE = 45;
const PX_PER_MM = 0.15;
const MIN_SEG = 100;

function dist(a: Pt, b: Pt): number { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
function angleDeg(a: Pt, b: Pt): number { return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI; }

function snapAngle(raw: number): number {
  const step = SNAP_ANGLE;
  return Math.round(raw / step) * step;
}

function pointAtAngle(origin: Pt, angleDegrees: number, length: number): Pt {
  const rad = angleDegrees * Math.PI / 180;
  return { x: origin.x + Math.cos(rad) * length, y: origin.y + Math.sin(rad) * length };
}

interface Segment { from: Pt; to: Pt; lengthMM: number; angleDeg: number; }

function buildSegmentsFromTravee(t: Travee): Pt[] {
  const pts: Pt[] = [];
  const cx = 350, cy = 250;
  const rot = (t.rotationSchema ?? 0) * Math.PI / 180;

  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';
  const isU = hasAngleG && hasAngleD;

  if (isU && t.largeur3 > 0) {
    const len3 = t.largeur3 * PX_PER_MM;
    const startX = cx - t.largeur * PX_PER_MM / 2;
    const startY = cy;
    pts.push({ x: startX + Math.sin(rot) * len3, y: startY - Math.cos(rot) * len3 });
    pts.push({ x: startX, y: startY });
  } else if (hasAngleG && t.largeur2 > 0) {
    const len2 = t.largeur2 * PX_PER_MM;
    const startX = cx - t.largeur * PX_PER_MM / 2;
    const startY = cy;
    pts.push({ x: startX + Math.sin(rot) * len2, y: startY - Math.cos(rot) * len2 });
    pts.push({ x: startX, y: startY });
  } else {
    pts.push({ x: cx - t.largeur * PX_PER_MM / 2, y: cy });
  }

  const lastPt = pts[pts.length - 1];
  const endCentre = { x: lastPt.x + Math.cos(rot) * t.largeur * PX_PER_MM, y: lastPt.y + Math.sin(rot) * t.largeur * PX_PER_MM };
  pts.push(endCentre);

  if (hasAngleD && t.largeur2 > 0) {
    const len2 = t.largeur2 * PX_PER_MM;
    pts.push({ x: endCentre.x + Math.sin(rot) * len2, y: endCentre.y - Math.cos(rot) * len2 });
  }

  return pts;
}

function getSegments(pts: Pt[]): Segment[] {
  const segs: Segment[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const from = pts[i], to = pts[i + 1];
    segs.push({ from, to, lengthMM: Math.round(dist(from, to) / PX_PER_MM), angleDeg: angleDeg(from, to) });
  }
  return segs;
}

function angleBetween(s1: Segment, s2: Segment): number {
  let a = Math.abs(s2.angleDeg - s1.angleDeg);
  if (a > 180) a = 360 - a;
  return Math.round(a);
}

function ptsToTravee(pts: Pt[]): Partial<Travee> {
  const segs = getSegments(pts);
  if (segs.length === 0) return {};
  if (segs.length === 1) {
    return { largeur: segs[0].lengthMM, largeur2: 0, largeur3: 0, coupeG: '90', coupeD: '90', fixG: 'libre', fixD: 'libre' };
  }
  if (segs.length === 2) {
    const ang = angleBetween(segs[0], segs[1]);
    const isAngle = ang >= 45;
    if (isAngle) {
      return { largeur: segs[0].lengthMM, largeur2: segs[1].lengthMM, largeur3: 0, coupeG: '90', coupeD: '45', fixG: 'libre', fixD: 'raccord90' as FixationId };
    }
    return { largeur: segs[0].lengthMM + segs[1].lengthMM, largeur2: 0, largeur3: 0, coupeG: '90', coupeD: '90' };
  }
  if (segs.length >= 3) {
    return {
      largeur3: segs[0].lengthMM, largeur: segs[1].lengthMM, largeur2: segs[2].lengthMM,
      coupeG: '45', coupeD: '45', fixG: 'raccord90' as FixationId, fixD: 'raccord90' as FixationId,
    };
  }
  return {};
}

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444'];

export function TraveeDrawTool({ travee: t, onUpdate }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [points, setPoints] = useState<Pt[]>(() => buildSegmentsFromTravee(t));
  const [drawing, setDrawing] = useState(false);
  const [mousePos, setMousePos] = useState<Pt | null>(null);
  const [editIdx, setEditIdx] = useState<{ type: 'length' | 'angle'; segIdx: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const svgW = 700, svgH = 400;

  const toSvg = useCallback((e: React.MouseEvent): Pt => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * svgW / rect.width, y: (e.clientY - rect.top) * svgH / rect.height };
  }, [svgW, svgH]);

  const getSnappedPoint = useCallback((raw: Pt, lastPt: Pt): Pt => {
    const rawAngle = angleDeg(lastPt, raw);
    const snapped = snapAngle(rawAngle);
    const length = Math.max(MIN_SEG * PX_PER_MM, dist(lastPt, raw));
    return pointAtAngle(lastPt, snapped, length);
  }, []);

  const startDrawing = useCallback(() => {
    setDrawing(true);
    setPoints([]);
    setEditIdx(null);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (editIdx) return;
    if (!drawing) return;
    const svgPt = toSvg(e);

    if (points.length === 0) {
      setPoints([svgPt]);
      return;
    }

    const lastPt = points[points.length - 1];
    const snapped = getSnappedPoint(svgPt, lastPt);
    const newPts = [...points, snapped];
    setPoints(newPts);

    if (newPts.length >= 4) {
      setDrawing(false);
      onUpdate(ptsToTravee(newPts));
    }
  }, [drawing, points, toSvg, getSnappedPoint, editIdx, onUpdate]);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (drawing && points.length >= 2) {
      setDrawing(false);
      onUpdate(ptsToTravee(points));
    }
  }, [drawing, points, onUpdate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!drawing || points.length === 0) { setMousePos(null); return; }
    const raw = toSvg(e);
    const lastPt = points[points.length - 1];
    setMousePos(getSnappedPoint(raw, lastPt));
  }, [drawing, points, toSvg, getSnappedPoint]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (drawing && points.length >= 2) {
        setDrawing(false);
        onUpdate(ptsToTravee(points));
      } else {
        setDrawing(false);
        setPoints(buildSegmentsFromTravee(t));
      }
    }
  }, [drawing, points, t, onUpdate]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (editIdx && inputRef.current) inputRef.current.focus();
  }, [editIdx]);

  const segments = getSegments(points);

  const startEditLength = (segIdx: number) => {
    if (drawing) return;
    setEditIdx({ type: 'length', segIdx });
    setEditValue(String(segments[segIdx].lengthMM));
  };

  const startEditAngle = (segIdx: number) => {
    if (drawing || segIdx === 0) return;
    setEditIdx({ type: 'angle', segIdx });
    setEditValue(String(angleBetween(segments[segIdx - 1], segments[segIdx])));
  };

  const confirmEdit = () => {
    if (!editIdx) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) { setEditIdx(null); return; }

    if (editIdx.type === 'length') {
      const seg = segments[editIdx.segIdx];
      const newLength = val * PX_PER_MM;
      const angle = seg.angleDeg;
      const newTo = pointAtAngle(seg.from, angle, newLength);
      const newPts = [...points];
      newPts[editIdx.segIdx + 1] = newTo;
      // Shift subsequent points
      const dx = newTo.x - seg.to.x, dy = newTo.y - seg.to.y;
      for (let i = editIdx.segIdx + 2; i < newPts.length; i++) {
        newPts[i] = { x: newPts[i].x + dx, y: newPts[i].y + dy };
      }
      setPoints(newPts);
      onUpdate(ptsToTravee(newPts));
    }
    setEditIdx(null);
  };

  const resetDrawing = () => {
    setPoints(buildSegmentsFromTravee(t));
    setDrawing(false);
    setEditIdx(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs">
        <span className="font-medium text-white">Dessin de la travee</span>
        {drawing ? (
          <span className="text-green-400">Cliquez pour poser les points — Double-clic ou Echap pour terminer</span>
        ) : (
          <span className="text-gray-400">Double-cliquez sur une cote ou un angle pour le modifier</span>
        )}
        <div className="flex-1" />
        {!drawing && (
          <button onClick={startDrawing} className="px-2.5 py-1 text-xs text-green-400 border border-green-500/30 rounded hover:bg-green-600/10">
            Nouveau dessin
          </button>
        )}
        {drawing && (
          <button onClick={() => { if (points.length >= 2) { setDrawing(false); onUpdate(ptsToTravee(points)); } }} className="px-2.5 py-1 text-xs text-green-400 border border-green-500/30 rounded hover:bg-green-600/10">
            Terminer
          </button>
        )}
        <button onClick={resetDrawing} className="px-2 py-1 text-xs text-gray-400 border border-[#353840] rounded hover:text-white hover:border-red-500/40">
          Reinitialiser
        </button>
      </div>

      <div className="bg-[#14161d] border border-[#252830] rounded-xl relative">
        <svg ref={svgRef} viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ maxHeight: 380, cursor: drawing ? 'crosshair' : 'default' }}
          onClick={handleClick} onDoubleClick={handleDoubleClick} onMouseMove={handleMouseMove}>

          {/* Grid */}
          <defs>
            <pattern id="draw-grid" width={20} height={20} patternUnits="userSpaceOnUse">
              <rect width={20} height={20} fill="none" stroke="#1e2028" strokeWidth={0.5} />
            </pattern>
          </defs>
          <rect width={svgW} height={svgH} fill="url(#draw-grid)" />

          <text x={15} y={20} fill="#4b5563" fontSize={10} fontFamily="monospace">EXT</text>
          <text x={15} y={svgH - 10} fill="#6b7280" fontSize={10} fontFamily="monospace">INT</text>

          {/* Drawn segments */}
          {segments.map((seg, si) => {
            const color = COLORS[si % COLORS.length];
            const mx = (seg.from.x + seg.to.x) / 2;
            const my = (seg.from.y + seg.to.y) / 2;
            return (
              <g key={si}>
                <line x1={seg.from.x} y1={seg.from.y} x2={seg.to.x} y2={seg.to.y} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.5} />
                <line x1={seg.from.x} y1={seg.from.y} x2={seg.to.x} y2={seg.to.y} stroke={color} strokeWidth={2} />
                {/* Length label — double-clickable */}
                <g onDoubleClick={(e) => { e.stopPropagation(); startEditLength(si); }} className="cursor-pointer">
                  <rect x={mx - 30} y={my - 18} width={60} height={14} fill="#14161d" opacity={0.8} rx={2} />
                  <text x={mx} y={my - 8} textAnchor="middle" fill="#f59e0b" fontSize={9} fontFamily="monospace" fontWeight="bold">{seg.lengthMM} mm</text>
                </g>
              </g>
            );
          })}

          {/* Angle labels at junctions */}
          {segments.length >= 2 && segments.slice(1).map((seg, si) => {
            const junction = seg.from;
            const ang = angleBetween(segments[si], seg);
            return (
              <g key={`ang-${si}`} onDoubleClick={(e) => { e.stopPropagation(); startEditAngle(si + 1); }} className="cursor-pointer">
                <circle cx={junction.x} cy={junction.y} r={14} fill="#14161d" opacity={0.7} stroke="#f59e0b" strokeWidth={0.5} />
                <text x={junction.x} y={junction.y + 4} textAnchor="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace">{ang}°</text>
              </g>
            );
          })}

          {/* Points */}
          {points.map((pt, pi) => (
            <circle key={pi} cx={pt.x} cy={pt.y} r={5} fill={pi === 0 ? '#ef4444' : pi === points.length - 1 ? '#22c55e' : '#fff'} stroke="#14161d" strokeWidth={1.5} />
          ))}

          {/* Preview line while drawing */}
          {drawing && mousePos && points.length > 0 && (
            <>
              <line x1={points[points.length - 1].x} y1={points[points.length - 1].y} x2={mousePos.x} y2={mousePos.y} stroke="#22c55e" strokeWidth={2} strokeDasharray="6,4" opacity={0.7} />
              <circle cx={mousePos.x} cy={mousePos.y} r={4} fill="none" stroke="#22c55e" strokeWidth={1.5} />
              <text x={(points[points.length - 1].x + mousePos.x) / 2} y={(points[points.length - 1].y + mousePos.y) / 2 - 10} textAnchor="middle" fill="#22c55e" fontSize={8} fontFamily="monospace">
                {Math.round(dist(points[points.length - 1], mousePos) / PX_PER_MM)} mm
              </text>
            </>
          )}
        </svg>

        {/* Edit popup */}
        {editIdx && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#181a20] border border-amber-500/40 rounded-lg p-3 z-10 space-y-2">
            <p className="text-xs text-gray-400">{editIdx.type === 'length' ? 'Longueur (mm)' : 'Angle (degres)'}</p>
            <input ref={inputRef} type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmEdit(); if (e.key === 'Escape') setEditIdx(null); }}
              className="w-32 bg-[#0f1117] border border-amber-500/30 rounded px-3 py-1.5 text-sm text-amber-300 font-mono text-center outline-none focus:border-amber-500" />
            <div className="flex gap-2">
              <button onClick={confirmEdit} className="px-3 py-1 bg-amber-600 text-white text-xs rounded">OK</button>
              <button onClick={() => setEditIdx(null)} className="px-3 py-1 text-gray-400 text-xs">Annuler</button>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        {segments.map((seg, si) => (
          <span key={si} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded" style={{ backgroundColor: COLORS[si % COLORS.length] }} />
            Segment {si + 1}: {seg.lengthMM} mm
          </span>
        ))}
        {points.length >= 2 && <span className="text-gray-600">|</span>}
        {points.length >= 2 && <span>{segments.length} segment{segments.length > 1 ? 's' : ''} — {points.length} points</span>}
      </div>
    </div>
  );
}
