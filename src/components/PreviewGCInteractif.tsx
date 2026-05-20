import { useState, useMemo } from 'react';
import type { ResultatTravee, Travee, RaidBranche } from '../types';
import { TYPES_GC } from '../constants/typesGC';
import { ESPACEMENT_BARREAU } from '../constants/parametres';

interface Props {
  rt: ResultatTravee;
  retourD?: ResultatTravee;
  retourG?: ResultatTravee;
  onUpdateTravee: (patch: Partial<Travee>) => void;
}

interface BrancheDef {
  key: 'raidGauche' | 'raidCentre' | 'raidDroite';
  label: string;
  color: string;
  longueur: number;
  positions: number[];
}

function generateSlots(longueur: number): number[] {
  const nbSlots = Math.max(2, Math.ceil(longueur / ESPACEMENT_BARREAU) + 1);
  const step = longueur / (nbSlots - 1);
  return Array.from({ length: nbSlots }, (_, i) => Math.round(i * step));
}

function isAtPosition(pos: number, targets: number[], tolerance: number): boolean {
  return targets.some(t => Math.abs(t - pos) < tolerance);
}

export function PreviewGCInteractif({ rt, retourD, retourG, onUpdateTravee }: Props) {
  const t = rt.travee;
  const gc = TYPES_GC[t.typeGC];
  const isMultiBranch = (t.coupeG === '45' || t.coupeD === '45') && (t.largeur2 > 0 || t.largeur3 > 0);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const svgW = 800;
  const svgH = isMultiBranch ? 400 : 420;
  const pad = 60;

  if (isMultiBranch) {
    return <PlanView t={t} rt={rt} retourD={retourD} retourG={retourG} gc={gc} svgW={svgW} svgH={svgH} pad={pad} hoverKey={hoverKey} setHoverKey={setHoverKey} onUpdateTravee={onUpdateTravee} />;
  }
  return <FaceView t={t} rt={rt} gc={gc} svgW={svgW} svgH={svgH} pad={pad} hoverKey={hoverKey} setHoverKey={setHoverKey} onUpdateTravee={onUpdateTravee} />;
}

// ── Face View (straight travée) ──────────────────────────────────────

function FaceView({ t, rt, gc, svgW, svgH, pad, hoverKey, setHoverKey, onUpdateTravee }: {
  t: Travee; rt: ResultatTravee; gc: (typeof TYPES_GC)[keyof typeof TYPES_GC];
  svgW: number; svgH: number; pad: number; hoverKey: string | null; setHoverKey: (k: string | null) => void; onUpdateTravee: (p: Partial<Travee>) => void;
}) {
  // Positions from engine — single source of truth
  const raidPos = rt.posRaidisseurs;
  const slots = useMemo(() => generateSlots(t.largeur), [t.largeur]);
  const tolerance = t.largeur / Math.max(slots.length - 1, 1) * 0.4;
  const barW = Math.max(1, 4 * (svgW - 2 * pad) / t.largeur);

  const scale = (svgW - 2 * pad) / t.largeur;
  const gcH = Math.min(svgH - 160, t.hauteur * scale);
  const topY = 50;
  const toX = (mm: number) => pad + mm * scale;

  const barreauPos = useMemo(() => {
    if (!gc.hasBarreaux) return [];
    const sorted = [...raidPos].sort((a, b) => a - b);
    const bars: number[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const interval = sorted[i + 1] - sorted[i];
      const nb = Math.ceil(interval / ESPACEMENT_BARREAU) - 1;
      if (nb > 0) { const esp = interval / (nb + 1); for (let j = 1; j <= nb; j++) bars.push(sorted[i] + j * esp); }
    }
    return bars;
  }, [raidPos, gc.hasBarreaux]);

  const toggle = (slotPos: number) => {
    const isR = isAtPosition(slotPos, raidPos, tolerance);
    let newPos: number[];
    if (isR) {
      newPos = raidPos.filter(p => Math.abs(p - slotPos) >= tolerance);
      if (newPos.length < 2) return;
    } else {
      newPos = [...raidPos, slotPos].sort((a, b) => a - b);
    }
    onUpdateTravee({ raidCentre: { positions: newPos } });
  };

  const hasForce = !!(t.raidCentre?.positions || t.raidCentre?.nb);
  const resetAuto = () => onUpdateTravee({ raidCentre: null } as Partial<Travee>);

  const raidW = 20 * scale;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        Cliquez pour placer/retirer des raidisseurs — <span className="text-white font-mono">{raidPos.length}</span> raidisseurs
        <span className="flex-1" />
        {hasForce && (
          <button onClick={resetAuto} className="px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/30 rounded hover:bg-amber-600/10">
            Calcul auto
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 340 }}>
          <rect width={svgW} height={svgH} fill="#14161d" rx={4} />
          <text x={svgW / 2} y={18} textAnchor="middle" fill="#d1d5db" fontSize={11} fontFamily="monospace" fontWeight="bold">Vue de face — {t.largeur} x {t.hauteur} mm</text>

          {/* Dalle */}
          <rect x={toX(-20)} y={topY + gcH} width={(t.largeur + 40) * scale} height={8} fill="#4b5563" />
          {/* Lisse basse */}
          <rect x={toX(0)} y={topY + gcH - 15} width={t.largeur * scale} height={15} fill="#94a3b8" opacity={0.7} rx={1} />
          {/* MC */}
          <rect x={toX(0) - 3} y={topY} width={t.largeur * scale + 6} height={18} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.5} rx={2} />

          {/* Barreaux */}
          {barreauPos.map((pos, i) => <line key={i} x1={toX(pos)} y1={topY + 18} x2={toX(pos)} y2={topY + gcH - 15} stroke="#60a5fa" strokeWidth={barW} opacity={0.4} />)}

          {/* Slots */}
          {slots.map((slotPos, si) => {
            const isR = isAtPosition(slotPos, raidPos, tolerance);
            const key = `c-${si}`;
            const isH = hoverKey === key;
            return (
              <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(slotPos)} className="cursor-pointer">
                <rect x={toX(slotPos) - raidW / 2 - 2} y={topY - 2} width={raidW + 4} height={gcH + 12} fill="transparent" />
                <rect x={toX(slotPos) - raidW / 2} y={topY} width={raidW} height={gcH + 8} fill={isR ? '#ef4444' : isH ? '#22c55e' : '#2a2d35'} opacity={isR ? 0.4 : isH ? 0.25 : 0.1} stroke={isR ? '#ef4444' : isH ? '#22c55e' : '#353840'} strokeWidth={isR ? 1.5 : 0.5} strokeDasharray={isR ? '' : '3,3'} rx={1} />
                {(isR || isH) && <text x={toX(slotPos)} y={topY + gcH + 24} textAnchor="middle" fill={isR ? '#ef4444' : '#22c55e'} fontSize={7} fontFamily="monospace">{slotPos}</text>}
                {isH && !isR && <text x={toX(slotPos)} y={topY - 6} textAnchor="middle" fill="#22c55e" fontSize={10}>+</text>}
                {isH && isR && <text x={toX(slotPos)} y={topY - 6} textAnchor="middle" fill="#ef4444" fontSize={10}>×</text>}
              </g>
            );
          })}

          {/* Dimensions */}
          <line x1={toX(0)} y1={topY + gcH + 35} x2={toX(t.largeur)} y2={topY + gcH + 35} stroke="#f59e0b" strokeWidth={0.6} />
          <text x={toX(t.largeur / 2)} y={topY + gcH + 48} textAnchor="middle" fill="#f59e0b" fontSize={9} fontFamily="monospace">{t.largeur} mm</text>
        </svg>
      </div>
    </div>
  );
}

// ── Plan View (L/U shapes) — uses drawPoints + engine positions ──────

interface Pt { x: number; y: number }

function buildFallbackShapePoints(t: Travee): Pt[] {
  const PX = 0.15;
  const cx = 350, cy = 150;
  const pts: Pt[] = [];
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';
  const isU = hasAngleG && hasAngleD;
  const startX = cx - t.largeur * PX / 2;
  if (isU && t.largeur3 > 0) {
    pts.push({ x: startX, y: cy + t.largeur3 * PX });
    pts.push({ x: startX, y: cy });
  } else if (hasAngleG && t.largeur2 > 0) {
    pts.push({ x: startX, y: cy + t.largeur2 * PX });
    pts.push({ x: startX, y: cy });
  } else {
    pts.push({ x: startX, y: cy });
  }
  pts.push({ x: startX + t.largeur * PX, y: cy });
  if (hasAngleD && t.largeur2 > 0) {
    const endX = startX + t.largeur * PX;
    pts.push({ x: endX, y: cy + t.largeur2 * PX });
  }
  return pts;
}

function posOnSeg(from: Pt, to: Pt, frac: number): Pt {
  return { x: from.x + (to.x - from.x) * frac, y: from.y + (to.y - from.y) * frac };
}

function perpOffset(from: Pt, to: Pt, dist: number): Pt {
  const dx = to.x - from.x, dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: -dy / len * dist, y: dx / len * dist };
}

function PlanView({ t, rt, retourD, retourG, gc, svgW, svgH, pad, hoverKey, setHoverKey, onUpdateTravee }: {
  t: Travee; rt: ResultatTravee; retourD?: ResultatTravee; retourG?: ResultatTravee;
  gc: (typeof TYPES_GC)[keyof typeof TYPES_GC];
  svgW: number; svgH: number; pad: number; hoverKey: string | null; setHoverKey: (k: string | null) => void; onUpdateTravee: (p: Partial<Travee>) => void;
}) {
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';
  const isU = hasAngleG && hasAngleD;

  // Shape from drawPoints
  const rawPts = useMemo(() => {
    if (t.drawPoints && t.drawPoints.length >= 2) return t.drawPoints as Pt[];
    return buildFallbackShapePoints(t);
  }, [t]);

  const { pts, segs } = useMemo(() => {
    const xs = rawPts.map(p => p.x), ys = rawPts.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const w = maxX - minX || 1, h = maxY - minY || 1;
    const sc = Math.min((svgW - 2 * pad - 40) / w, (svgH - 2 * pad - 60) / h);
    const offX = pad + 20 + ((svgW - 2 * pad - 40) - w * sc) / 2;
    const offY = pad + 30 + ((svgH - 2 * pad - 60) - h * sc) / 2;
    const scaled = rawPts.map(p => ({ x: offX + (p.x - minX) * sc, y: offY + (p.y - minY) * sc }));
    const segments: { from: Pt; to: Pt }[] = [];
    for (let i = 0; i < scaled.length - 1; i++) segments.push({ from: scaled[i], to: scaled[i + 1] });
    return { pts: scaled, segs: segments };
  }, [rawPts, svgW, svgH, pad]);

  // Map segments → branches, positions come from engine results
  const branches = useMemo((): BrancheDef[] => {
    const result: BrancheDef[] = [];
    if (segs.length === 1) {
      result.push({ key: 'raidCentre', label: 'Travee', color: '#3b82f6', longueur: t.largeur, positions: rt.posRaidisseurs });
    } else if (segs.length === 2) {
      result.push({ key: 'raidCentre', label: 'Centre', color: '#3b82f6', longueur: t.largeur, positions: rt.posRaidisseurs });
      if (hasAngleD) {
        result.push({ key: 'raidDroite', label: 'Retour D', color: '#10b981', longueur: t.largeur2, positions: retourD?.posRaidisseurs ?? [] });
      } else {
        result.push({ key: 'raidGauche', label: 'Retour G', color: '#f59e0b', longueur: isU ? t.largeur3 : t.largeur2, positions: retourG?.posRaidisseurs ?? [] });
      }
    } else {
      result.push({ key: 'raidGauche', label: 'Gauche', color: '#f59e0b', longueur: t.largeur3, positions: retourG?.posRaidisseurs ?? [] });
      result.push({ key: 'raidCentre', label: 'Centre', color: '#3b82f6', longueur: t.largeur, positions: rt.posRaidisseurs });
      result.push({ key: 'raidDroite', label: 'Droite', color: '#10b981', longueur: t.largeur2, positions: retourD?.posRaidisseurs ?? [] });
    }
    return result;
  }, [segs.length, t, rt, retourD, retourG, hasAngleD, isU]);

  // Clickable slots — filter angle junctions
  const branchSlots = useMemo(() => {
    return branches.map((b, segIdx) => {
      const allSlots = generateSlots(b.longueur);
      const isRetour = b.key === 'raidDroite' || b.key === 'raidGauche';
      // For retour branches: junction is at position 0 for retourD, at longueur for retourG
      // For centre: junction at 0 if hasAngleG, at longueur if hasAngleD
      const filtered = allSlots.filter(s => {
        if (b.key === 'raidCentre' && hasAngleG && s < 1) return false;
        if (b.key === 'raidCentre' && hasAngleD && Math.abs(s - b.longueur) < 1) return false;
        if (b.key === 'raidDroite' && s < 1) return false;
        if (b.key === 'raidGauche' && Math.abs(s - b.longueur) < 1) return false;
        return true;
      });
      return { ...b, segIdx, slots: filtered };
    });
  }, [branches, hasAngleG, hasAngleD]);

  const toggle = (branch: BrancheDef, slotPos: number) => {
    const tolerance = branch.longueur / Math.max(generateSlots(branch.longueur).length - 1, 1) * 0.4;
    const isR = isAtPosition(slotPos, branch.positions, tolerance);
    let newPos: number[];
    if (isR) {
      newPos = branch.positions.filter(p => Math.abs(p - slotPos) >= tolerance);
      if (newPos.length < 2) return;
    } else {
      newPos = [...branch.positions, slotPos].sort((a, b) => a - b);
    }
    const rb: RaidBranche = { positions: newPos };
    onUpdateTravee({ [branch.key]: rb });
  };

  const hasAnyForce = !!(t.raidCentre?.positions || t.raidDroite?.positions || t.raidGauche?.positions);
  const resetAuto = () => onUpdateTravee({ raidCentre: null, raidDroite: null, raidGauche: null } as Partial<Travee>);

  const slotR = 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        Vue en plan — cliquez pour placer/retirer des raidisseurs
        {branchSlots.map(b => (
          <span key={b.key} className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded" style={{ backgroundColor: b.color }} />
            {b.label}: <span className="text-white font-mono">{b.positions.length}</span>
          </span>
        ))}
        <span className="flex-1" />
        {hasAnyForce && (
          <button onClick={resetAuto} className="px-2 py-0.5 text-[10px] text-amber-400 border border-amber-500/30 rounded hover:bg-amber-600/10">
            Calcul auto
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 380 }}>
          <rect width={svgW} height={svgH} fill="#14161d" rx={4} />

          <text x={15} y={18} fill="#4b5563" fontSize={9} fontFamily="monospace">EXT</text>
          <text x={15} y={svgH - 8} fill="#6b7280" fontSize={9} fontFamily="monospace">INT</text>

          {/* Render each branch along its actual segment */}
          {branchSlots.map(bd => {
            const seg = segs[bd.segIdx];
            if (!seg) return null;
            const { from, to } = seg;
            const tolerance = bd.longueur / Math.max(bd.slots.length - 1, 1) * 0.4;
            const perp = perpOffset(from, to, 1);
            const mid = posOnSeg(from, to, 0.5);

            return (
              <g key={bd.key}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={bd.color} strokeWidth={12} strokeLinecap="round" opacity={0.3} />
                <text x={mid.x + perp.x * 18} y={mid.y + perp.y * 18} textAnchor="middle" dominantBaseline="middle" fill={bd.color} fontSize={8} fontFamily="monospace" fontWeight="bold">{bd.label}</text>
                <text x={mid.x - perp.x * 14} y={mid.y - perp.y * 14} textAnchor="middle" dominantBaseline="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace">{bd.longueur} mm</text>

                {bd.slots.map((slotPos, si) => {
                  const frac = slotPos / bd.longueur;
                  const pos = posOnSeg(from, to, frac);
                  const isR = isAtPosition(slotPos, bd.positions, tolerance);
                  const key = `${bd.key}-${si}`;
                  const isH = hoverKey === key;
                  return (
                    <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(bd, slotPos)} className="cursor-pointer">
                      <circle cx={pos.x} cy={pos.y} r={slotR + 4} fill="transparent" />
                      <circle cx={pos.x} cy={pos.y} r={slotR} fill={isR ? '#ef4444' : isH ? '#22c55e' : '#1e2028'} stroke={isR ? '#ef4444' : isH ? '#22c55e' : '#353840'} strokeWidth={isR ? 2 : 1} strokeDasharray={isR ? '' : '2,2'} opacity={isR ? 0.8 : isH ? 0.6 : 0.3} />
                      {isR && <circle cx={pos.x} cy={pos.y} r={2.5} fill="#ef4444" />}
                      {(isR || isH) && <text x={pos.x + perp.x * 14} y={pos.y + perp.y * 14} textAnchor="middle" dominantBaseline="middle" fill={isR ? '#ef4444' : '#22c55e'} fontSize={6} fontFamily="monospace">{slotPos}</text>}
                      {isH && !isR && <text x={pos.x - perp.x * 10} y={pos.y - perp.y * 10} textAnchor="middle" dominantBaseline="middle" fill="#22c55e" fontSize={9}>+</text>}
                      {isH && isR && <text x={pos.x - perp.x * 10} y={pos.y - perp.y * 10} textAnchor="middle" dominantBaseline="middle" fill="#ef4444" fontSize={9}>×</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Junction markers */}
          {pts.slice(1, -1).map((pt, i) => (
            <rect key={`junc-${i}`} x={pt.x - 7} y={pt.y - 7} width={14} height={14} fill="#f59e0b" opacity={0.15} rx={3} />
          ))}

          {/* Endpoint fixation markers */}
          {(() => {
            const startPt = pts[0];
            const endPt = pts[pts.length - 1];
            const markers: React.ReactNode[] = [];
            if (hasAngleG) {
              markers.push((t.fixRetourG ?? 'libre') === 'mur'
                ? <circle key="fixG" cx={startPt.x} cy={startPt.y} r={5} fill="#9ca3af" opacity={0.6} />
                : <circle key="fixG" cx={startPt.x} cy={startPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
            } else {
              markers.push((t.fixG === 'mur_g' || t.fixG === 'mur_d')
                ? <circle key="fixG" cx={startPt.x} cy={startPt.y} r={5} fill="#9ca3af" opacity={0.6} />
                : <circle key="fixG" cx={startPt.x} cy={startPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
            }
            if (hasAngleD) {
              markers.push((t.fixRetourD ?? 'libre') === 'mur'
                ? <circle key="fixD" cx={endPt.x} cy={endPt.y} r={5} fill="#9ca3af" opacity={0.6} />
                : <circle key="fixD" cx={endPt.x} cy={endPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
            } else {
              markers.push((t.fixD === 'mur_d' || t.fixD === 'mur_g')
                ? <circle key="fixD" cx={endPt.x} cy={endPt.y} r={5} fill="#9ca3af" opacity={0.6} />
                : <circle key="fixD" cx={endPt.x} cy={endPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
            }
            return markers;
          })()}
        </svg>
      </div>
    </div>
  );
}
