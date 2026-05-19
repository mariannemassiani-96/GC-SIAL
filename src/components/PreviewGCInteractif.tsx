import { useState, useMemo } from 'react';
import type { ResultatTravee, Travee, RaidBranche } from '../types';
import { TYPES_GC } from '../constants/typesGC';
import { ESPACEMENT_BARREAU } from '../constants/parametres';

interface Props {
  rt: ResultatTravee;
  onUpdateTravee: (patch: Partial<Travee>) => void;
}

interface BrancheDef {
  key: 'raidGauche' | 'raidCentre' | 'raidDroite';
  label: string;
  color: string;
  longueur: number;
}

function getBranches(t: Travee): BrancheDef[] {
  const isU = t.coupeG === '45' && t.coupeD === '45';
  const hasAngleD = t.coupeD === '45' && !isU;
  const hasAngleG = t.coupeG === '45' && !isU;
  const branches: BrancheDef[] = [];
  if (isU && t.largeur3 > 0) branches.push({ key: 'raidGauche', label: 'Gauche', color: '#f59e0b', longueur: t.largeur3 });
  if (hasAngleG && t.largeur2 > 0) branches.push({ key: 'raidGauche', label: 'Retour G', color: '#f59e0b', longueur: t.largeur2 });
  branches.push({ key: 'raidCentre', label: isU || hasAngleG || hasAngleD ? 'Centre' : 'Travee', color: '#3b82f6', longueur: t.largeur });
  if ((hasAngleD || isU) && t.largeur2 > 0) branches.push({ key: 'raidDroite', label: isU ? 'Droite' : 'Retour D', color: '#10b981', longueur: t.largeur2 });
  return branches;
}

function getRaidPositions(t: Travee, branche: BrancheDef, rt: ResultatTravee): number[] {
  const rb: RaidBranche | undefined = branche.key === 'raidCentre'
    ? (t.raidCentre ?? (t.nbRaidForce ? { nb: t.nbRaidForce, positions: t.posRaidForce } : undefined))
    : t[branche.key];
  if (rb?.positions && rb.positions.length >= 2) return rb.positions;
  if (rb?.nb && rb.nb >= 2) {
    const step = branche.longueur / (rb.nb - 1);
    return Array.from({ length: rb.nb }, (_, i) => Math.round(i * step));
  }
  if (branche.key === 'raidCentre') {
    return rt.posRaidisseurs;
  }
  const autoNb = Math.max(2, Math.ceil(branche.longueur / 1400) + 1);
  const step = branche.longueur / (autoNb - 1);
  return Array.from({ length: autoNb }, (_, i) => Math.round(i * step));
}

function generateSlots(longueur: number): number[] {
  const nbSlots = Math.max(2, Math.ceil(longueur / ESPACEMENT_BARREAU) + 1);
  const step = longueur / (nbSlots - 1);
  return Array.from({ length: nbSlots }, (_, i) => Math.round(i * step));
}

function isAtPosition(pos: number, targets: number[], tolerance: number): boolean {
  return targets.some(t => Math.abs(t - pos) < tolerance);
}

export function PreviewGCInteractif({ rt, onUpdateTravee }: Props) {
  const t = rt.travee;
  const gc = TYPES_GC[t.typeGC];
  const branches = useMemo(() => getBranches(t), [t]);
  const isMultiBranch = branches.length > 1;
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const svgW = 800;
  const svgH = isMultiBranch ? 400 : 420;
  const pad = 60;

  if (isMultiBranch) {
    return <PlanView t={t} rt={rt} gc={gc} branches={branches} svgW={svgW} svgH={svgH} pad={pad} hoverKey={hoverKey} setHoverKey={setHoverKey} onUpdateTravee={onUpdateTravee} />;
  }
  return <FaceView t={t} rt={rt} gc={gc} branches={branches} svgW={svgW} svgH={svgH} pad={pad} hoverKey={hoverKey} setHoverKey={setHoverKey} onUpdateTravee={onUpdateTravee} />;
}

// ── Face View (straight travée) ──────────────────────────────────────

function FaceView({ t, rt, gc, branches, svgW, svgH, pad, hoverKey, setHoverKey, onUpdateTravee }: {
  t: Travee; rt: ResultatTravee; gc: (typeof TYPES_GC)[keyof typeof TYPES_GC]; branches: BrancheDef[];
  svgW: number; svgH: number; pad: number; hoverKey: string | null; setHoverKey: (k: string | null) => void; onUpdateTravee: (p: Partial<Travee>) => void;
}) {
  const b = branches[0];
  const raidPos = useMemo(() => getRaidPositions(t, b, rt), [t, b, rt]);
  const slots = useMemo(() => generateSlots(b.longueur), [b.longueur]);
  const tolerance = b.longueur / (slots.length - 1) * 0.4;
  const barW = Math.max(1, 4 * (svgW - 2 * pad) / b.longueur);

  const scale = (svgW - 2 * pad) / b.longueur;
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
    onUpdateTravee({ nbRaidForce: newPos.length, posRaidForce: newPos, raidCentre: { nb: newPos.length, positions: newPos } });
  };

  const raidW = 20 * scale;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 text-xs text-gray-400">
        Cliquez pour placer/retirer des raidisseurs — <span className="text-white font-mono">{raidPos.length}</span> raidisseurs
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 340 }}>
          <rect width={svgW} height={svgH} fill="#14161d" rx={4} />
          <text x={svgW / 2} y={18} textAnchor="middle" fill="#d1d5db" fontSize={11} fontFamily="monospace" fontWeight="bold">Vue de face — {t.largeur} x {t.hauteur} mm</text>

          {/* Dalle */}
          <rect x={toX(-20)} y={topY + gcH} width={(b.longueur + 40) * scale} height={8} fill="#4b5563" />

          {/* Lisse basse */}
          <rect x={toX(0)} y={topY + gcH - 15} width={b.longueur * scale} height={15} fill="#94a3b8" opacity={0.7} rx={1} />

          {/* MC */}
          <rect x={toX(0) - 3} y={topY} width={b.longueur * scale + 6} height={18} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={0.5} rx={2} />

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
          <line x1={toX(0)} y1={topY + gcH + 35} x2={toX(b.longueur)} y2={topY + gcH + 35} stroke="#f59e0b" strokeWidth={0.6} />
          <text x={toX(b.longueur / 2)} y={topY + gcH + 48} textAnchor="middle" fill="#f59e0b" fontSize={9} fontFamily="monospace">{b.longueur} mm</text>
        </svg>
      </div>
    </div>
  );
}

// ── Plan View (L/U shapes) — uses actual drawPoints for exact match ──

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
  const endX = startX + t.largeur * PX;
  pts.push({ x: endX, y: cy });
  if (hasAngleD && t.largeur2 > 0) {
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

function PlanView({ t, rt, branches, svgW, svgH, pad, hoverKey, setHoverKey, onUpdateTravee }: {
  t: Travee; rt: ResultatTravee; gc: (typeof TYPES_GC)[keyof typeof TYPES_GC]; branches: BrancheDef[];
  svgW: number; svgH: number; pad: number; hoverKey: string | null; setHoverKey: (k: string | null) => void; onUpdateTravee: (p: Partial<Travee>) => void;
}) {
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';

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

  const segBranchKeys: ('raidGauche' | 'raidCentre' | 'raidDroite')[] = useMemo(() => {
    if (segs.length === 1) return ['raidCentre'];
    if (segs.length === 2) return ['raidCentre', 'raidDroite'];
    return ['raidGauche', 'raidCentre', 'raidDroite'];
  }, [segs.length]);

  const allBranchData = useMemo(() => {
    return segBranchKeys.map((branchKey, segIdx) => {
      const branch = branches.find(b => b.key === branchKey);
      if (!branch) return null;
      const allSlots = generateSlots(branch.longueur);
      const isAngleAtStart = (branchKey === 'raidCentre' && hasAngleG) || branchKey === 'raidDroite' || branchKey === 'raidGauche';
      const isAngleAtEnd = (branchKey === 'raidCentre' && hasAngleD);
      const slots = allSlots.filter(s => {
        if (isAngleAtStart && s < 1) return false;
        if (isAngleAtEnd && Math.abs(s - branch.longueur) < 1) return false;
        return true;
      });
      return { segIdx, branch, raidPos: getRaidPositions(t, branch, rt), slots };
    }).filter((d): d is NonNullable<typeof d> => d !== null);
  }, [segBranchKeys, branches, t, rt, hasAngleG, hasAngleD]);

  const toggle = (branche: BrancheDef, slotPos: number, currentPos: number[]) => {
    const tolerance = branche.longueur / Math.max(generateSlots(branche.longueur).length - 1, 1) * 0.4;
    const isR = isAtPosition(slotPos, currentPos, tolerance);
    let newPos: number[];
    if (isR) {
      newPos = currentPos.filter(p => Math.abs(p - slotPos) >= tolerance);
      if (newPos.length < 2) return;
    } else {
      newPos = [...currentPos, slotPos].sort((a, b) => a - b);
    }
    const rb: RaidBranche = { nb: newPos.length, positions: newPos };
    if (branche.key === 'raidCentre') {
      onUpdateTravee({ raidCentre: rb, nbRaidForce: newPos.length, posRaidForce: newPos });
    } else {
      onUpdateTravee({ [branche.key]: rb });
    }
  };

  const slotR = 6;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        Vue en plan — cliquez pour placer/retirer des raidisseurs
        {allBranchData.map(b => (
          <span key={b.branch.key} className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded" style={{ backgroundColor: b.branch.color }} />
            {b.branch.label}: <span className="text-white font-mono">{b.raidPos.length}</span>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 380 }}>
          <rect width={svgW} height={svgH} fill="#14161d" rx={4} />

          {/* EXT / INT labels */}
          <text x={15} y={18} fill="#4b5563" fontSize={9} fontFamily="monospace">EXT</text>
          <text x={15} y={svgH - 8} fill="#6b7280" fontSize={9} fontFamily="monospace">INT</text>

          {/* Render each branch along its actual segment direction */}
          {allBranchData.map(bd => {
            const seg = segs[bd.segIdx];
            if (!seg) return null;
            const { from, to } = seg;
            const tolerance = bd.branch.longueur / Math.max(bd.slots.length - 1, 1) * 0.4;
            const perp = perpOffset(from, to, 1);
            const mid = posOnSeg(from, to, 0.5);

            return (
              <g key={bd.branch.key}>
                {/* Bar */}
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke={bd.branch.color} strokeWidth={12} strokeLinecap="round" opacity={0.3} />

                {/* Branch label */}
                <text x={mid.x + perp.x * 18} y={mid.y + perp.y * 18} textAnchor="middle" dominantBaseline="middle" fill={bd.branch.color} fontSize={8} fontFamily="monospace" fontWeight="bold">{bd.branch.label}</text>

                {/* Dimension */}
                <text x={mid.x - perp.x * 14} y={mid.y - perp.y * 14} textAnchor="middle" dominantBaseline="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace">{bd.branch.longueur} mm</text>

                {/* Raidisseur slots */}
                {bd.slots.map((slotPos, si) => {
                  const frac = slotPos / bd.branch.longueur;
                  const pos = posOnSeg(from, to, frac);
                  const isR = isAtPosition(slotPos, bd.raidPos, tolerance);
                  const key = `${bd.branch.key}-${si}`;
                  const isH = hoverKey === key;
                  return (
                    <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(bd.branch, slotPos, bd.raidPos)} className="cursor-pointer">
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

          {/* Junction angle markers */}
          {pts.slice(1, -1).map((pt, i) => (
            <rect key={`junc-${i}`} x={pt.x - 7} y={pt.y - 7} width={14} height={14} fill="#f59e0b" opacity={0.15} rx={3} />
          ))}

          {/* Endpoint fixation markers */}
          {(() => {
            const startPt = pts[0];
            const endPt = pts[pts.length - 1];
            const markers: React.ReactNode[] = [];

            if (hasAngleG) {
              if ((t.fixRetourG ?? 'libre') === 'mur') {
                const perp2 = perpOffset(segs[0].from, segs[0].to, 1);
                markers.push(<rect key="fixG" x={startPt.x - 5 + perp2.x * 4} y={startPt.y - 2 + perp2.y * 4} width={10} height={4} fill="#9ca3af" rx={1} />);
              } else {
                markers.push(<circle key="fixG" cx={startPt.x} cy={startPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
              }
            } else {
              if (t.fixG === 'mur_g' || t.fixG === 'mur_d') {
                markers.push(<circle key="fixG" cx={startPt.x} cy={startPt.y} r={5} fill="#9ca3af" opacity={0.6} />);
              } else {
                markers.push(<circle key="fixG" cx={startPt.x} cy={startPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
              }
            }

            if (hasAngleD) {
              if ((t.fixRetourD ?? 'libre') === 'mur') {
                const lastSeg = segs[segs.length - 1];
                const perp2 = perpOffset(lastSeg.from, lastSeg.to, 1);
                markers.push(<rect key="fixD" x={endPt.x - 5 + perp2.x * 4} y={endPt.y - 2 + perp2.y * 4} width={10} height={4} fill="#9ca3af" rx={1} />);
              } else {
                markers.push(<circle key="fixD" cx={endPt.x} cy={endPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
              }
            } else {
              if (t.fixD === 'mur_d' || t.fixD === 'mur_g') {
                markers.push(<circle key="fixD" cx={endPt.x} cy={endPt.y} r={5} fill="#9ca3af" opacity={0.6} />);
              } else {
                markers.push(<circle key="fixD" cx={endPt.x} cy={endPt.y} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />);
              }
            }
            return markers;
          })()}
        </svg>
      </div>
    </div>
  );
}
