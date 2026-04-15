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
  forme: 'droit' | 'L' | 'U';
  desc: string;
}

const SCHEMAS_POSE: SchemaPose[] = [
  // Droits (A-B, E-F, H)
  { id: 'A', fixG: 'libre',         fixD: 'mur_d',         coupeG: '90', coupeD: '90', forme: 'droit', desc: 'Libre / Mur' },
  { id: 'B', fixG: 'mur_g',         fixD: 'mur_d',         coupeG: '90', coupeD: '90', forme: 'droit', desc: 'Mur / Mur' },
  { id: 'E', fixG: 'libre',         fixD: 'libre',         coupeG: '90', coupeD: '90', forme: 'droit', desc: 'Libre / Libre' },
  { id: 'F', fixG: 'mur_g',         fixD: 'libre',         coupeG: '90', coupeD: '90', forme: 'droit', desc: 'Mur / Libre' },
  { id: 'H', fixG: 'raccord_droit', fixD: 'raccord_droit',  coupeG: '90', coupeD: '90', forme: 'droit', desc: 'Éclisse / Éclisse' },
  // L (C-D, G)
  { id: 'C', fixG: 'libre',         fixD: 'raccord90',     coupeG: '90', coupeD: '45', forme: 'L', desc: 'L — Libre / Angle 90°' },
  { id: 'D', fixG: 'mur_g',         fixD: 'raccord90',     coupeG: '90', coupeD: '45', forme: 'L', desc: 'L — Mur / Angle 90°' },
  { id: 'G', fixG: 'raccord90',     fixD: 'libre',         coupeG: '45', coupeD: '90', forme: 'L', desc: 'L — Angle 90° / Libre' },
  // U (I-L)
  { id: 'I', fixG: 'raccord90',     fixD: 'raccord90',     coupeG: '45', coupeD: '45', forme: 'U', desc: 'U — Libre / Libre' },
  { id: 'J', fixG: 'raccord90',     fixD: 'raccord90',     coupeG: '45', coupeD: '45', forme: 'U', desc: 'U — Mur / Mur' },
  { id: 'K', fixG: 'raccord90',     fixD: 'raccord90',     coupeG: '45', coupeD: '45', forme: 'U', desc: 'U — Libre / Mur' },
  { id: 'L', fixG: 'raccord90',     fixD: 'raccord90',     coupeG: '45', coupeD: '45', forme: 'U', desc: 'U — Mur / Libre' },
];

/** Pour les U, on stocke la fixation extérieure des branches dans un champ séparé
 *  car fixG/fixD sont toujours raccord90 (les angles internes).
 *  On encode ça : I=libre/libre, J=mur/mur, K=libre/mur, L=mur/libre
 */
const U_FIX_EXT: Record<string, { fixExtG: FixationId; fixExtD: FixationId }> = {
  'I': { fixExtG: 'libre', fixExtD: 'libre' },
  'J': { fixExtG: 'mur_g', fixExtD: 'mur_d' },
  'K': { fixExtG: 'libre', fixExtD: 'mur_d' },
  'L': { fixExtG: 'mur_g', fixExtD: 'libre' },
};

function getSchemaId(t: Travee): string {
  // U-shape: both coupes at 45° AND largeur3 > 0
  if (t.coupeG === '45' && t.coupeD === '45' && t.largeur3 > 0) {
    // Determine which U variant based on the actual U ext fixations
    // For now, default to 'I' — we'd need extra fields to distinguish J/K/L
    return 'I';
  }
  for (const s of SCHEMAS_POSE) {
    if (s.forme !== 'U' && s.fixG === t.fixG && s.fixD === t.fixD && s.coupeG === t.coupeG && s.coupeD === t.coupeD) return s.id;
  }
  return '?';
}

/** Nombre de branches : 1=droit, 2=L, 3=U */
function nbBranches(t: Travee): number {
  if (t.coupeG === '45' && t.coupeD === '45' && t.largeur3 > 0) return 3;
  if (t.coupeG === '45' || t.coupeD === '45') return 2;
  return 1;
}

/** Petit SVG schématique du schéma de pose (vue intérieure) */
function SchemaPoseMini({ schema }: { schema: SchemaPose }) {
  const w = 80, h = 36, pad = 6;

  if (schema.forme === 'U') {
    // U-shape: 3 branches
    const uFix = U_FIX_EXT[schema.id];
    const leftWall = uFix?.fixExtG === 'mur_g';
    const rightWall = uFix?.fixExtD === 'mur_d';
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
        <text x={w / 2} y={7} textAnchor="middle" fill="#6b7280" fontSize={5} fontFamily="sans-serif">INT.</text>
        {/* U shape path */}
        <polyline points={`${pad},${10} ${pad},${h - 8} ${w - pad},${h - 8} ${w - pad},${10}`} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />
        {/* Left outer end */}
        {leftWall && <rect x={1} y={4} width={3} height={12} fill="#9ca3af" rx={0.5} />}
        {!leftWall && <circle cx={pad} cy={10} r={2} fill="#ef4444" />}
        {/* Right outer end */}
        {rightWall && <rect x={w - 4} y={4} width={3} height={12} fill="#9ca3af" rx={0.5} />}
        {!rightWall && <circle cx={w - pad} cy={10} r={2} fill="#ef4444" />}
      </svg>
    );
  }

  const barY = h / 2;
  const fG: FixationId = schema.fixG;
  const fD: FixationId = schema.fixD;
  const leftWall = fG === 'mur_g' || fG === 'mur_d';
  const leftAngle = fG === 'raccord90';
  const rightWall = fD === 'mur_d' || fD === 'mur_g';
  const rightAngle = fD === 'raccord90';

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <text x={w / 2} y={8} textAnchor="middle" fill="#6b7280" fontSize={5} fontFamily="sans-serif">INT.</text>
      {/* Main bar */}
      <line x1={pad} y1={barY} x2={w - pad} y2={barY} stroke="#60a5fa" strokeWidth={2} />
      {/* Left end */}
      {leftWall && (<>
        <rect x={1} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={pad} y1={barY} x2={4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {leftAngle && <line x1={pad} y1={barY} x2={pad} y2={barY + 10} stroke="#60a5fa" strokeWidth={2} />}
      {schema.fixG === 'libre' && <circle cx={pad} cy={barY} r={2} fill="#ef4444" />}
      {schema.fixG === 'raccord_droit' && <line x1={pad - 3} y1={barY} x2={pad} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />}
      {/* Right end */}
      {rightWall && (<>
        <rect x={w - 4} y={barY - 8} width={3} height={16} fill="#9ca3af" rx={0.5} />
        <line x1={w - pad} y1={barY} x2={w - 4} y2={barY} stroke="#f59e0b" strokeWidth={1.5} />
      </>)}
      {rightAngle && <line x1={w - pad} y1={barY} x2={w - pad} y2={barY + 10} stroke="#60a5fa" strokeWidth={2} />}
      {schema.fixD === 'libre' && <circle cx={w - pad} cy={barY} r={2} fill="#ef4444" />}
      {schema.fixD === 'raccord_droit' && <line x1={w - pad} y1={barY} x2={w - pad + 3} y2={barY} stroke="#60a5fa" strokeWidth={2} strokeDasharray="2,1" />}
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

  const applySchema = (traveeId: string, schema: SchemaPose) => {
    const travee = affaire.travees.find((t) => t.id === traveeId);
    const defLarg = travee?.largeur || 2000;
    const isU = schema.forme === 'U';
    const isL = schema.forme === 'L';

    updateTravee(traveeId, {
      fixG: schema.fixG,
      fixD: schema.fixD,
      coupeG: schema.coupeG,
      coupeD: schema.coupeD,
      largeur2: (isL || isU) ? (travee?.largeur2 || defLarg) : 0,
      largeur3: isU ? (travee?.largeur3 || defLarg) : 0,
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
                    {t.largeur}
                    {nbBranches(t) >= 2 && t.largeur2 > 0 && <span className="text-amber-400"> + {t.largeur2}</span>}
                    {nbBranches(t) >= 3 && t.largeur3 > 0 && <span className="text-purple-400"> + {t.largeur3}</span>}
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
                    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${6 + (nbBranches(t) >= 2 ? 1 : 0) + (nbBranches(t) >= 3 ? 1 : 0)}, minmax(0, 1fr))` }}>
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
                        <label className="block text-[10px] text-gray-500 mb-0.5">
                          {nbBranches(t) >= 2 ? 'Côté 1 (mm)' : 'Largeur (mm)'}
                        </label>
                        <input type="number" value={t.largeur} onChange={(e) => updateTravee(t.id, { largeur: parseInt(e.target.value) || 0 })}
                          className="w-full bg-[#1e2028] border border-[#353840] rounded px-2 py-1 text-xs text-gray-200 font-mono focus:outline-none focus:border-blue-500" />
                      </div>
                      {nbBranches(t) >= 2 && (
                        <div>
                          <label className="block text-[10px] text-amber-400 mb-0.5">
                            {nbBranches(t) >= 3 ? 'Fond U (mm)' : 'Côté 2 (mm)'}
                          </label>
                          <input type="number" value={t.largeur2} onChange={(e) => updateTravee(t.id, { largeur2: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#1e2028] border border-amber-500/30 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-amber-500" />
                        </div>
                      )}
                      {nbBranches(t) >= 3 && (
                        <div>
                          <label className="block text-[10px] text-purple-400 mb-0.5">Côté 3 (mm)</label>
                          <input type="number" value={t.largeur3} onChange={(e) => updateTravee(t.id, { largeur3: parseInt(e.target.value) || 0 })}
                            className="w-full bg-[#1e2028] border border-purple-500/30 rounded px-2 py-1 text-xs text-purple-300 font-mono focus:outline-none focus:border-purple-500" />
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
