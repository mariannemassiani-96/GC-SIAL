import { useState } from 'react';
import { Plus, Trash2, Copy, ChevronDown, ChevronRight } from 'lucide-react';
import type { Affaire, Travee, TraveeConfig, Alerte, FixationId } from '../types';
import { createEmptyTravee, duplicateTravee } from '../store/affaires';
import { TYPES_GC, TYPES_MC, POSE_DATA } from '../constants/typesGC';
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
];

function getSchemaId(t: Travee): string {
  for (const s of SCHEMAS_POSE) {
    if (s.fixG === t.fixG && s.fixD === t.fixD && s.coupeG === t.coupeG && s.coupeD === t.coupeD) return s.id;
  }
  return '?';
}

/** Petit SVG schématique du schéma de pose (vue intérieure) */
function SchemaPoseMini({ schema }: { schema: SchemaPose }) {
  const w = 80, h = 28, pad = 6;
  const barY = h / 2;

  const fG: FixationId = schema.fixG;
  const fD: FixationId = schema.fixD;
  const leftWall = fG === 'mur_g' || fG === 'mur_d';
  const leftAngle = fG === 'raccord90';
  const rightWall = fD === 'mur_d' || fD === 'mur_g';
  const rightAngle = fD === 'raccord90';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      {/* Main bar */}
      <line x1={pad} y1={barY} x2={w - pad} y2={barY} stroke="#60a5fa" strokeWidth={2} />
      {/* Left end */}
      {leftWall && (<>
        <rect x={1} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={pad} y1={barY} x2={4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {leftAngle && (<line x1={pad} y1={barY} x2={pad} y2={barY + 10} stroke="#60a5fa" strokeWidth={2} />)}
      {schema.fixG === 'libre' && (<circle cx={pad} cy={barY} r={2} fill="#ef4444" />)}
      {schema.fixG === 'raccord_droit' && (<line x1={pad - 3} y1={barY} x2={pad} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />)}
      {/* Right end */}
      {rightWall && (<>
        <rect x={w - 4} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={w - pad} y1={barY} x2={w - 4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {rightAngle && (<line x1={w - pad} y1={barY} x2={w - pad} y2={barY + 10} stroke="#60a5fa" strokeWidth={2} />)}
      {schema.fixD === 'libre' && (<circle cx={w - pad} cy={barY} r={2} fill="#ef4444" />)}
      {schema.fixD === 'raccord_droit' && (<line x1={w - pad} y1={barY} x2={w - pad + 3} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />)}
      {/* Interior label */}
      <text x={w / 2} y={8} textAnchor="middle" fill="#6b7280" fontSize={5} fontFamily="sans-serif">INT.</text>
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

  const applySchema = (id: string, schema: typeof SCHEMAS_POSE[0]) => {
    updateTravee(id, {
      fixG: schema.fixG,
      fixD: schema.fixD,
      coupeG: schema.coupeG,
      coupeD: schema.coupeD,
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
                  <span className="text-xs font-mono text-gray-200 w-14 text-right">{t.largeur}</span>
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
                    <div className="grid grid-cols-6 gap-2">
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
                      <div>
                        <label className="block text-[10px] text-gray-500 mb-0.5">Largeur (mm)</label>
                        <input type="number" value={t.largeur} onChange={(e) => updateTravee(t.id, { largeur: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
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

                    {/* Row 3: Schéma de pose (vue intérieure) */}
                    <div>
                      <label className="block text-[10px] text-gray-500 mb-1.5">Schéma de pose (vue intérieure — extérieur en haut)</label>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                        {SCHEMAS_POSE.map((schema) => {
                          const isActive = currentSchema === schema.id;
                          return (
                            <button
                              key={schema.id}
                              onClick={() => applySchema(t.id, schema)}
                              className={`relative border rounded p-1 transition-all ${
                                isActive
                                  ? 'border-blue-500 bg-blue-500/10'
                                  : 'border-[#353840] bg-[#1e2028] hover:border-[#4a4d58]'
                              }`}
                              title={schema.desc}
                            >
                              <div className="h-8">
                                <SchemaPoseMini schema={schema} />
                              </div>
                              <span className={`block text-center text-[10px] font-mono mt-0.5 ${isActive ? 'text-blue-400 font-bold' : 'text-gray-500'}`}>
                                {schema.id}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
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
