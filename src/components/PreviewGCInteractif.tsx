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

// ── Plan View (L/U shapes) ───────────────────────────────────────────

function PlanView({ t, rt, branches, svgW, svgH, pad, hoverKey, setHoverKey, onUpdateTravee }: {
  t: Travee; rt: ResultatTravee; gc: (typeof TYPES_GC)[keyof typeof TYPES_GC]; branches: BrancheDef[];
  svgW: number; svgH: number; pad: number; hoverKey: string | null; setHoverKey: (k: string | null) => void; onUpdateTravee: (p: Partial<Travee>) => void;
}) {
  const isU = t.coupeG === '45' && t.coupeD === '45';
  const hasAngleG = t.coupeG === '45';
  const hasAngleD = t.coupeD === '45';

  const centreLen = t.largeur;
  const leftLen = hasAngleG ? (isU ? t.largeur3 : t.largeur2) : 0;
  const rightLen = hasAngleD ? t.largeur2 : 0;

  const totalSpan = centreLen + Math.max(leftLen, rightLen) * 0.6;
  const scale = Math.min((svgW - 2 * pad) / totalSpan, (svgH - 2 * pad - 60) / Math.max(leftLen, rightLen, 400));

  const barThick = 12;
  const slotR = 6;

  // Centre bar position
  const centreY = pad + Math.max(leftLen, rightLen) * scale + 20;
  const centreX0 = pad + (leftLen > 0 ? 30 : 0);

  const allBranchData = useMemo(() => {
    return branches.map(b => ({
      ...b,
      raidPos: getRaidPositions(t, b, rt),
      slots: generateSlots(b.longueur),
    }));
  }, [branches, t, rt]);

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

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4 text-xs text-gray-400">
        Vue en plan — cliquez pour placer/retirer des raidisseurs
        {allBranchData.map(b => (
          <span key={b.key} className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded" style={{ backgroundColor: b.color }} />
            {b.label}: <span className="text-white font-mono">{b.raidPos.length}</span>
          </span>
        ))}
      </div>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full cursor-crosshair" style={{ maxHeight: 380 }}>
          <rect width={svgW} height={svgH} fill="#14161d" rx={4} />

          {/* EXT / INT labels */}
          <text x={pad - 10} y={centreY - 20} fill="#4b5563" fontSize={9} fontFamily="monospace" textAnchor="end">EXT</text>
          <text x={pad - 10} y={centreY + 30} fill="#6b7280" fontSize={9} fontFamily="monospace" textAnchor="end">INT</text>

          {/* Centre branch (horizontal) */}
          {(() => {
            const bd = allBranchData.find(b => b.key === 'raidCentre')!;
            const tolerance = bd.longueur / Math.max(bd.slots.length - 1, 1) * 0.4;
            return (
              <g>
                <rect x={centreX0} y={centreY - barThick / 2} width={centreLen * scale} height={barThick} fill={bd.color} opacity={0.3} rx={2} />
                <text x={centreX0 + centreLen * scale / 2} y={centreY + barThick / 2 + 16} textAnchor="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace">{centreLen} mm</text>
                <text x={centreX0 + centreLen * scale / 2} y={centreY - barThick / 2 - 8} textAnchor="middle" fill={bd.color} fontSize={8} fontFamily="monospace" fontWeight="bold">{bd.label}</text>
                {bd.slots.map((slotPos, si) => {
                  const isR = isAtPosition(slotPos, bd.raidPos, tolerance);
                  const key = `c-${si}`;
                  const isH = hoverKey === key;
                  const cx = centreX0 + slotPos * scale;
                  return (
                    <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(bd, slotPos, bd.raidPos)} className="cursor-pointer">
                      <rect x={cx - slotR - 2} y={centreY - barThick} width={slotR * 2 + 4} height={barThick * 2} fill="transparent" />
                      <circle cx={cx} cy={centreY} r={slotR} fill={isR ? '#ef4444' : isH ? '#22c55e' : '#1e2028'} stroke={isR ? '#ef4444' : isH ? '#22c55e' : '#353840'} strokeWidth={isR ? 2 : 1} strokeDasharray={isR ? '' : '2,2'} opacity={isR ? 0.8 : isH ? 0.6 : 0.3} />
                      {isR && <circle cx={cx} cy={centreY} r={2.5} fill="#ef4444" />}
                      {(isR || isH) && <text x={cx} y={centreY + barThick + 10} textAnchor="middle" fill={isR ? '#ef4444' : '#22c55e'} fontSize={6} fontFamily="monospace">{slotPos}</text>}
                      {isH && !isR && <text x={cx} y={centreY - barThick - 2} textAnchor="middle" fill="#22c55e" fontSize={9}>+</text>}
                      {isH && isR && <text x={cx} y={centreY - barThick - 2} textAnchor="middle" fill="#ef4444" fontSize={9}>×</text>}
                    </g>
                  );
                })}
              </g>
            );
          })()}

          {/* Left branch (vertical, going up from left end) */}
          {hasAngleG && (() => {
            const bd = allBranchData.find(b => b.key === 'raidGauche');
            if (!bd) return null;
            const tolerance = bd.longueur / Math.max(bd.slots.length - 1, 1) * 0.4;
            const bx = centreX0;
            return (
              <g>
                <rect x={bx - barThick / 2} y={centreY - bd.longueur * scale} width={barThick} height={bd.longueur * scale} fill={bd.color} opacity={0.3} rx={2} />
                <text x={bx - barThick / 2 - 10} y={centreY - bd.longueur * scale / 2} fill="#f59e0b" fontSize={8} fontFamily="monospace" textAnchor="end" dominantBaseline="middle">{bd.longueur}</text>
                <text x={bx + barThick / 2 + 8} y={centreY - bd.longueur * scale + 10} fill={bd.color} fontSize={8} fontFamily="monospace" fontWeight="bold">{bd.label}</text>
                {/* Angle marker */}
                <rect x={bx - barThick / 2 - 1} y={centreY - barThick / 2 - 1} width={barThick + 2} height={barThick + 2} fill={bd.color} opacity={0.15} rx={2} />
                {bd.slots.map((slotPos, si) => {
                  const isR = isAtPosition(slotPos, bd.raidPos, tolerance);
                  const key = `g-${si}`;
                  const isH = hoverKey === key;
                  const cy = centreY - slotPos * scale;
                  return (
                    <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(bd, slotPos, bd.raidPos)} className="cursor-pointer">
                      <rect x={bx - barThick} y={cy - slotR - 2} width={barThick * 2} height={slotR * 2 + 4} fill="transparent" />
                      <circle cx={bx} cy={cy} r={slotR} fill={isR ? '#ef4444' : isH ? '#22c55e' : '#1e2028'} stroke={isR ? '#ef4444' : isH ? '#22c55e' : '#353840'} strokeWidth={isR ? 2 : 1} strokeDasharray={isR ? '' : '2,2'} opacity={isR ? 0.8 : isH ? 0.6 : 0.3} />
                      {isR && <circle cx={bx} cy={cy} r={2.5} fill="#ef4444" />}
                      {(isR || isH) && <text x={bx + barThick + 6} y={cy + 3} fill={isR ? '#ef4444' : '#22c55e'} fontSize={6} fontFamily="monospace">{slotPos}</text>}
                    </g>
                  );
                })}
                {/* Fixation retour */}
                {(t.fixRetourG ?? 'libre') === 'mur' ? (
                  <rect x={bx - barThick / 2 - 3} y={centreY - bd.longueur * scale - 3} width={barThick + 6} height={4} fill="#9ca3af" rx={1} />
                ) : (
                  <circle cx={bx} cy={centreY - bd.longueur * scale} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                )}
              </g>
            );
          })()}

          {/* Right branch (vertical, going up from right end) */}
          {hasAngleD && (() => {
            const bd = allBranchData.find(b => b.key === 'raidDroite');
            if (!bd) return null;
            const tolerance = bd.longueur / Math.max(bd.slots.length - 1, 1) * 0.4;
            const bx = centreX0 + centreLen * scale;
            return (
              <g>
                <rect x={bx - barThick / 2} y={centreY - bd.longueur * scale} width={barThick} height={bd.longueur * scale} fill={bd.color} opacity={0.3} rx={2} />
                <text x={bx + barThick / 2 + 10} y={centreY - bd.longueur * scale / 2} fill="#f59e0b" fontSize={8} fontFamily="monospace" dominantBaseline="middle">{bd.longueur}</text>
                <text x={bx - barThick / 2 - 8} y={centreY - bd.longueur * scale + 10} fill={bd.color} fontSize={8} fontFamily="monospace" textAnchor="end" fontWeight="bold">{bd.label}</text>
                <rect x={bx - barThick / 2 - 1} y={centreY - barThick / 2 - 1} width={barThick + 2} height={barThick + 2} fill={bd.color} opacity={0.15} rx={2} />
                {bd.slots.map((slotPos, si) => {
                  const isR = isAtPosition(slotPos, bd.raidPos, tolerance);
                  const key = `d-${si}`;
                  const isH = hoverKey === key;
                  const cy = centreY - slotPos * scale;
                  return (
                    <g key={key} onMouseEnter={() => setHoverKey(key)} onMouseLeave={() => setHoverKey(null)} onClick={() => toggle(bd, slotPos, bd.raidPos)} className="cursor-pointer">
                      <rect x={bx - barThick} y={cy - slotR - 2} width={barThick * 2} height={slotR * 2 + 4} fill="transparent" />
                      <circle cx={bx} cy={cy} r={slotR} fill={isR ? '#ef4444' : isH ? '#22c55e' : '#1e2028'} stroke={isR ? '#ef4444' : isH ? '#22c55e' : '#353840'} strokeWidth={isR ? 2 : 1} strokeDasharray={isR ? '' : '2,2'} opacity={isR ? 0.8 : isH ? 0.6 : 0.3} />
                      {isR && <circle cx={bx} cy={cy} r={2.5} fill="#ef4444" />}
                      {(isR || isH) && <text x={bx - barThick - 6} y={cy + 3} fill={isR ? '#ef4444' : '#22c55e'} fontSize={6} fontFamily="monospace" textAnchor="end">{slotPos}</text>}
                    </g>
                  );
                })}
                {(t.fixRetourD ?? 'libre') === 'mur' ? (
                  <rect x={bx - barThick / 2 - 3} y={centreY - bd.longueur * scale - 3} width={barThick + 6} height={4} fill="#9ca3af" rx={1} />
                ) : (
                  <circle cx={bx} cy={centreY - bd.longueur * scale} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                )}
              </g>
            );
          })()}

          {/* Left fixation */}
          {!hasAngleG && (
            t.fixG === 'mur_g' || t.fixG === 'mur_d'
              ? <rect x={centreX0 - 4} y={centreY - 12} width={4} height={24} fill="#9ca3af" rx={1} />
              : t.fixG === 'libre'
                ? <circle cx={centreX0} cy={centreY} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                : null
          )}
          {/* Right fixation */}
          {!hasAngleD && (
            t.fixD === 'mur_d' || t.fixD === 'mur_g'
              ? <rect x={centreX0 + centreLen * scale} y={centreY - 12} width={4} height={24} fill="#9ca3af" rx={1} />
              : t.fixD === 'libre'
                ? <circle cx={centreX0 + centreLen * scale} cy={centreY} r={4} fill="none" stroke="#ef4444" strokeWidth={1.5} />
                : null
          )}
        </svg>
      </div>
    </div>
  );
}
