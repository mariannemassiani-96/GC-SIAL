import { useState } from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { Affaire, Travee, TraveeConfig, Alerte, FixationId, RaidBranche } from '../types';
import { createEmptyTravee, duplicateTravee } from '../store/affaires';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
import { TraveeDrawTool } from './TraveeDrawTool';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface SectionTraveesProps {
  affaire: Affaire;
  onChange: (updates: Partial<Affaire>) => void;
  alertesByTravee?: Map<string, Alerte[]>;
}

/**
 * Schémas de pose SIAL (vue intérieure).
 * Chaque schéma définit automatiquement fixG, fixD et coupeG/coupeD.
 */
interface SchemaPose {
  id: string;
  fixG: FixationId;
  fixD: FixationId;
  coupeG: '90' | '45';
  coupeD: '90' | '45';
  desc: string;
}

const SCHEMAS_POSE: SchemaPose[] = [
  { id: 'A', fixG: 'libre',         fixD: 'mur_d',        coupeG: '90', coupeD: '90', desc: 'Côté libre à gauche, patte murale droite' },
  { id: 'B', fixG: 'mur_g',         fixD: 'mur_d',        coupeG: '90', coupeD: '90', desc: 'Patte murale des deux côtés' },
  { id: 'C', fixG: 'libre',         fixD: 'raccord90',    coupeG: '90', coupeD: '45', desc: 'Libre à gauche, angle 90° à droite' },
  { id: 'D', fixG: 'mur_g',         fixD: 'raccord90',    coupeG: '90', coupeD: '45', desc: 'Mur à gauche, angle 90° à droite' },
  { id: 'E', fixG: 'libre',         fixD: 'libre',        coupeG: '90', coupeD: '90', desc: 'Bouchons des deux côtés' },
  { id: 'F', fixG: 'mur_g',         fixD: 'libre',        coupeG: '90', coupeD: '90', desc: 'Patte murale gauche, libre à droite' },
  { id: 'G', fixG: 'raccord90',     fixD: 'libre',        coupeG: '45', coupeD: '90', desc: 'Angle 90° à gauche, libre à droite' },
  { id: 'H', fixG: 'raccord_droit', fixD: 'raccord_droit', coupeG: '90', coupeD: '90', desc: 'Éclisse droite des deux côtés' },
  { id: 'U', fixG: 'raccord90',     fixD: 'raccord90',    coupeG: '45', coupeD: '45', desc: 'Schéma en U — angle 90° des deux côtés' },
];

function getSchemaId(t: Travee): string {
  for (const s of SCHEMAS_POSE) {
    if (s.fixG === t.fixG && s.fixD === t.fixD && s.coupeG === t.coupeG && s.coupeD === t.coupeD) return s.id;
  }
  return '?';
}

function schemaHasAngle(t: Travee): boolean {
  return t.coupeG === '45' || t.coupeD === '45';
}

function schemaIsU(t: Travee): boolean {
  return t.coupeG === '45' && t.coupeD === '45';
}

/** Petit SVG schématique du schéma de pose (vue intérieure) */
function SchemaPoseMini({ schema }: { schema: SchemaPose }) {
  const w = 80, h = 36, pad = 6;
  const barY = 20;

  const fG: FixationId = schema.fixG;
  const fD: FixationId = schema.fixD;
  const leftWall = fG === 'mur_g' || fG === 'mur_d';
  const leftAngle = fG === 'raccord90';
  const rightWall = fD === 'mur_d' || fD === 'mur_g';
  const rightAngle = fD === 'raccord90';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      {/* EXT en haut, INT en bas */}
      <text x={2} y={7} fill="#4b5563" fontSize={4.5} fontFamily="sans-serif">EXT</text>
      <text x={2} y={h - 2} fill="#6b7280" fontSize={4.5} fontFamily="sans-serif">INT</text>
      {/* Ligne séparatrice ext/int */}
      <line x1={pad} y1={barY + 5} x2={w - pad} y2={barY + 5} stroke="#2a2d35" strokeWidth={0.5} strokeDasharray="2,2" />
      {/* Main bar (sur la façade, côté extérieur) */}
      <line x1={pad} y1={barY} x2={w - pad} y2={barY} stroke="#60a5fa" strokeWidth={2.5} />
      {/* Left end */}
      {leftWall && (<>
        <rect x={1} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={pad} y1={barY} x2={4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {leftAngle && (<line x1={pad} y1={barY} x2={pad} y2={barY - 12} stroke="#f59e0b" strokeWidth={2} />)}
      {schema.fixG === 'libre' && (<circle cx={pad} cy={barY} r={2} fill="#ef4444" />)}
      {schema.fixG === 'raccord_droit' && (<line x1={pad - 3} y1={barY} x2={pad} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />)}
      {/* Right end */}
      {rightWall && (<>
        <rect x={w - 4} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={w - pad} y1={barY} x2={w - 4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {rightAngle && (<line x1={w - pad} y1={barY} x2={w - pad} y2={barY - 12} stroke="#f59e0b" strokeWidth={2} />)}
      {schema.fixD === 'libre' && (<circle cx={w - pad} cy={barY} r={2} fill="#ef4444" />)}
      {schema.fixD === 'raccord_droit' && (<line x1={w - pad} y1={barY} x2={w - pad + 3} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />)}
    </svg>
  );
}

function MiniSelect({ value, onChange, options, className = '' }: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-[#14161d] border border-[#353840] rounded px-1.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-blue-500 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

export function SectionTravees({ affaire, onChange, alertesByTravee }: SectionTraveesProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const addTravee = () => {
    const idx = affaire.travees.length + 1;
    const newTravee = createEmptyTravee(idx, affaire.defaults);
    onChange({ travees: [...affaire.travees, newTravee] });
  };

  const updateTravee = (id: string, updates: Partial<Travee>) => {
    onChange({
      travees: affaire.travees.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  const deleteTravee = (id: string) => {
    onChange({ travees: affaire.travees.filter((t) => t.id !== id) });
    if (expandedId === id) setExpandedId(null);
  };

  const dupTravee = (source: Travee) => {
    const idx = affaire.travees.length + 1;
    const dup = duplicateTravee(source, idx);
    onChange({ travees: [...affaire.travees, dup] });
  };

  const applySchema = (id: string, schema: SchemaPose) => {
    const hasAngleR = schema.coupeD === '45';
    const hasAngleL = schema.coupeG === '45';
    const isU = hasAngleL && hasAngleR;
    const travee = affaire.travees.find((t) => t.id === id);
    updateTravee(id, {
      fixG: schema.fixG,
      fixD: schema.fixD,
      coupeG: schema.coupeG,
      coupeD: schema.coupeD,
      largeur2: hasAngleR ? (travee?.largeur2 || travee?.largeur || 2000) : (hasAngleL ? (travee?.largeur2 || travee?.largeur || 2000) : 0),
      largeur3: isU ? (travee?.largeur3 || travee?.largeur || 2000) : 0,
    });
  };

  return (
    <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Travées</h2>
        <Button variant="primary" size="sm" onClick={addTravee} icon={<Plus size={14} />}>
          Ajouter
        </Button>
      </div>

      {affaire.travees.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Aucune travée. Cliquez sur « Ajouter » pour commencer.
        </p>
      ) : (
        <div className="space-y-1">
          {affaire.travees.map((t) => {
            const alertes = alertesByTravee?.get(t.id) ?? [];
            const isExpanded = expandedId === t.id;
            const currentSchema = getSchemaId(t);

            return (
              <div key={t.id} className="border border-[#252830] rounded bg-[#14161d]">
                {/* Compact row */}
                <div className="flex items-center gap-2 px-3 py-2 hover:bg-[#1e2028]/50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : t.id)}>
                  <span className="text-gray-500">
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>

                  <span className="text-xs font-mono font-semibold text-blue-400 w-10">{t.repere}</span>
                  <span className="text-xs text-gray-500 w-10">{t.etage}</span>
                  <span className="text-xs font-mono text-gray-200 text-right">
                    {schemaIsU(t) && t.largeur3 > 0 ? <span className="text-amber-400">{t.largeur3} + </span> : ''}{t.largeur}{schemaHasAngle(t) && t.largeur2 > 0 ? <span className="text-amber-400"> + {t.largeur2}</span> : ''}
                  </span>
                  <span className="text-[10px] text-gray-600">×</span>
                  <span className="text-xs font-mono text-gray-200 w-12 text-right">{t.hauteur}</span>
                  <span className="text-[10px] text-gray-600">mm</span>
                  <span className="text-xs text-gray-400 w-6 text-center">×{t.qte}</span>

                  <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-[#252830] text-gray-400" title={SCHEMAS_POSE.find(s => s.id === currentSchema)?.desc}>
                    {currentSchema}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate max-w-[100px]">
                    {TYPES_GC[t.typeGC]?.label.split(' ')[0]}
                  </span>

                  {alertes.map((a, i) => (
                    <Badge key={i} variant={a.niveau === 'bloquant' ? 'bloquant' : a.niveau === 'attention' ? 'attention' : 'info'}>
                      {a.niveau === 'bloquant' ? '!' : a.niveau === 'attention' ? '!!' : 'i'}
                    </Badge>
                  ))}

                  <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => dupTravee(t)} className="p-1 text-gray-600 hover:text-blue-400" title="Dupliquer cette travée">
                      <Copy size={13} />
                    </button>
                    <button onClick={() => deleteTravee(t.id)} className="p-1 text-gray-600 hover:text-red-400" title="Supprimer">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Expanded config */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#252830] space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Row 1: basic fields */}
                    <div className={`grid gap-2 ${schemaIsU(t) ? 'grid-cols-8' : schemaHasAngle(t) ? 'grid-cols-7' : 'grid-cols-6'}`}>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Repère</label>
                        <input value={t.repere} onChange={(e) => updateTravee(t.id, { repere: e.target.value })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Étage</label>
                        <input value={t.etage} onChange={(e) => updateTravee(t.id, { etage: e.target.value })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500" />
                      </div>
                      {schemaIsU(t) && (
                        <div>
                          <label className="block text-[10px] text-amber-400 mb-0.5">Gauche (mm)</label>
                          <input type="number" value={t.largeur3} onChange={(e) => updateTravee(t.id, { largeur3: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#1e2028] border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500" />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          {schemaIsU(t) ? 'Centre (mm)' : schemaHasAngle(t) ? 'Côté 1 (mm)' : 'Largeur (mm)'}
                        </label>
                        <input type="number" value={t.largeur} onChange={(e) => updateTravee(t.id, { largeur: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
                      {schemaHasAngle(t) && (
                        <div>
                          <label className="block text-[10px] text-amber-400 mb-0.5">{schemaIsU(t) ? 'Droite (mm)' : 'Côté 2 (mm)'}</label>
                          <input type="number" value={t.largeur2} onChange={(e) => updateTravee(t.id, { largeur2: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#1e2028] border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500" />
                        </div>
                      )}
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Hauteur (mm)</label>
                        <input type="number" value={t.hauteur} onChange={(e) => updateTravee(t.id, { hauteur: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Quantité</label>
                        <input type="number" min={1} value={t.qte} onChange={(e) => updateTravee(t.id, { qte: Math.max(1, parseInt(e.target.value) || 1) })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
                      <div className="flex items-end gap-2 pb-0.5">
                        <div>
                          <label className="block text-[10px] text-gray-500 mb-0.5">Rampant</label>
                          <input type="checkbox" checked={t.rampant} onChange={(e) => updateTravee(t.id, { rampant: e.target.checked })} className="accent-blue-500" />
                        </div>
                        {t.rampant && (
                          <MiniSelect value={String(t.angle)} onChange={(v) => updateTravee(t.id, { angle: parseInt(v) as TraveeConfig['angle'] })}
                            options={[{ value: '0', label: '0°' }, { value: '10', label: '10°' }, { value: '20', label: '20°' }, { value: '30', label: '30°' }]} />
                        )}
                      </div>
                    </div>

                    {/* Row 2: GC config */}
                    <div className="grid grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Type GC</label>
                        <MiniSelect value={t.typeGC} onChange={(v) => updateTravee(t.id, { typeGC: v as TraveeConfig['typeGC'] })} className="w-full"
                          options={Object.entries(TYPES_GC).map(([id, def]) => ({ value: id, label: def.label }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Pose</label>
                        <MiniSelect value={t.pose} onChange={(v) => updateTravee(t.id, { pose: v as TraveeConfig['pose'] })} className="w-full"
                          options={Object.entries(POSE_DATA).map(([id, def]) => ({ value: id, label: def.label }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Main courante</label>
                        <MiniSelect value={t.mc} onChange={(v) => updateTravee(t.id, { mc: v as TraveeConfig['mc'] })} className="w-full"
                          options={Object.entries(TYPES_MC).map(([id, def]) => ({ value: id, label: def.label }))} />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Lieu</label>
                        <MiniSelect value={t.lieu} onChange={(v) => updateTravee(t.id, { lieu: v as TraveeConfig['lieu'] })} className="w-full"
                          options={[{ value: 'prive', label: 'Privé' }, { value: 'public', label: 'Public' }]} />
                      </div>
                    </div>

                    {/* Outil de dessin CAD */}
                    <TraveeDrawTool travee={t} onUpdate={(patch) => updateTravee(t.id, patch)} />

                    {/* Row 4: Fixation des retours (L, U, C, D, G) */}
                    {schemaHasAngle(t) && (
                      <div className="flex items-center gap-4">
                        {(t.coupeG === '45') && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">Bout retour gauche :</span>
                            <button onClick={() => updateTravee(t.id, { fixRetourG: 'mur' })}
                              className={`px-2.5 py-1 rounded text-[10px] border ${(t.fixRetourG ?? 'libre') === 'mur' ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' : 'text-gray-500 border-[#353840]'}`}>
                              Fixation murale
                            </button>
                            <button onClick={() => updateTravee(t.id, { fixRetourG: 'libre' })}
                              className={`px-2.5 py-1 rounded text-[10px] border ${(t.fixRetourG ?? 'libre') === 'libre' ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>
                              Bouchon
                            </button>
                          </div>
                        )}
                        {(t.coupeD === '45') && (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-500">Bout retour droit :</span>
                            <button onClick={() => updateTravee(t.id, { fixRetourD: 'mur' })}
                              className={`px-2.5 py-1 rounded text-[10px] border ${(t.fixRetourD ?? 'libre') === 'mur' ? 'bg-amber-600/20 text-amber-400 border-amber-500/40' : 'text-gray-500 border-[#353840]'}`}>
                              Fixation murale
                            </button>
                            <button onClick={() => updateTravee(t.id, { fixRetourD: 'libre' })}
                              className={`px-2.5 py-1 rounded text-[10px] border ${(t.fixRetourD ?? 'libre') === 'libre' ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>
                              Bouchon
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Row 5: Raidisseurs par branche */}
                    <RaidisseursEditor travee={t} onUpdate={(patch) => updateTravee(t.id, patch)} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BrancheRaidEditor({ label, color, longueur, branche, onChange }: {
  label: string; color: string; longueur: number; branche: RaidBranche | undefined; onChange: (b: RaidBranche | undefined) => void;
}) {
  const isActive = branche && branche.nb !== undefined && branche.nb >= 2;
  const hasPos = branche?.positions && branche.positions.length >= 2;
  const autoNb = Math.ceil(longueur / 1400) + 1;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-bold ${color} w-16`}>{label}</span>
        <span className="text-[10px] text-gray-600">{longueur} mm</span>
        <label className="flex items-center gap-1 text-[10px] text-gray-400 cursor-pointer ml-2">
          <input type="checkbox" checked={!!isActive} onChange={(e) => {
            onChange(e.target.checked ? { nb: autoNb } : undefined);
          }} className="accent-amber-500" />
          Forcer
        </label>
        {isActive && (
          <>
            <input type="number" min={2} max={20} value={branche!.nb} onChange={(e) => {
              onChange({ ...branche, nb: Math.max(2, parseInt(e.target.value) || 2), positions: undefined });
            }} className="w-12 bg-[#1e2028] border border-amber-500/30 rounded px-1 py-0.5 text-[10px] text-amber-300 font-mono text-center outline-none" />
            <span className="text-[10px] text-gray-600">raid.</span>
            <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer ml-2">
              <input type="checkbox" checked={!!hasPos} onChange={(e) => {
                if (e.target.checked) {
                  const nb = branche!.nb || 3;
                  const step = longueur / (nb - 1);
                  onChange({ ...branche, positions: Array.from({ length: nb }, (_, i) => Math.round(i * step)) });
                } else {
                  onChange({ ...branche, positions: undefined });
                }
              }} className="accent-amber-500" />
              Positions
            </label>
          </>
        )}
      </div>
      {hasPos && (
        <div className="flex flex-wrap gap-1 ml-16">
          {branche!.positions!.map((pos, pi) => (
            <input key={pi} type="number" value={pos} onChange={(e) => {
              const newPos = [...(branche!.positions || [])];
              newPos[pi] = parseInt(e.target.value) || 0;
              onChange({ ...branche, positions: newPos });
            }} className="w-14 bg-[#1e2028] border border-amber-500/20 rounded px-1 py-0.5 text-[10px] text-amber-300 font-mono text-center outline-none focus:border-amber-500" />
          ))}
          <span className="text-[10px] text-gray-600 self-center">mm</span>
        </div>
      )}
    </div>
  );
}

function RaidisseursEditor({ travee: t, onUpdate }: { travee: Travee; onUpdate: (patch: Partial<Travee>) => void }) {
  const isU = t.coupeG === '45' && t.coupeD === '45';
  const hasAngleD = t.coupeD === '45' && !isU;
  const hasAngleG = t.coupeG === '45' && !isU;

  const branches: { key: 'raidGauche' | 'raidCentre' | 'raidDroite'; label: string; color: string; longueur: number }[] = [];

  if (isU && t.largeur3 > 0) branches.push({ key: 'raidGauche', label: 'Gauche', color: 'text-amber-400', longueur: t.largeur3 });
  if (hasAngleG && t.largeur2 > 0) branches.push({ key: 'raidGauche', label: 'Retour', color: 'text-amber-400', longueur: t.largeur2 });
  branches.push({ key: 'raidCentre', label: isU || hasAngleG || hasAngleD ? 'Centre' : 'Travee', color: 'text-blue-400', longueur: t.largeur });
  if ((hasAngleD || isU) && t.largeur2 > 0) branches.push({ key: 'raidDroite', label: isU ? 'Droite' : 'Retour', color: 'text-emerald-400', longueur: t.largeur2 });

  const hasAnyForce = t.raidGauche?.nb || t.raidCentre?.nb || t.raidDroite?.nb || t.nbRaidForce;

  return (
    <div className="bg-[#14161d] border border-[#252830] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 font-medium">Raidisseurs</span>
        {hasAnyForce ? <span className="text-[10px] text-amber-400">Mode manuel</span> : <span className="text-[10px] text-gray-600">Calcul automatique</span>}
      </div>
      {branches.map(b => (
        <BrancheRaidEditor
          key={b.key}
          label={b.label}
          color={b.color}
          longueur={b.longueur}
          branche={b.key === 'raidCentre' ? (t.raidCentre ?? (t.nbRaidForce ? { nb: t.nbRaidForce, positions: t.posRaidForce } : undefined)) : t[b.key]}
          onChange={(v) => {
            if (b.key === 'raidCentre') {
              onUpdate({ raidCentre: v, nbRaidForce: v?.nb, posRaidForce: v?.positions });
            } else {
              onUpdate({ [b.key]: v });
            }
          }}
        />
      ))}
    </div>
  );
}
