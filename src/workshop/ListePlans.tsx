import { useState, useRef } from 'react';
import { Plus, Copy, Trash2, ChevronRight, ChevronDown, Home, Upload, GitBranch } from 'lucide-react';
import type { Plan } from './types';
import { parseDxf, dxfToObjets, DEFAULT_IMPORT_OPTIONS } from './dxfParser';

interface ListePlansProps {
  plans: Plan[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onCreateVariante: (id: string) => void;
  onImportDxf: (objets: import('./types').Objet[], fileName: string) => void;
  onLoadSIAL?: () => void;
  onHome: () => void;
}

export function ListePlans({ plans, onSelect, onNew, onDuplicate, onDelete, onCreateVariante, onImportDxf, onLoadSIAL, onHome }: ListePlansProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  // Grouper les plans : plans racines + leurs variantes
  const roots = plans.filter(p => !p.parentId);
  const variantesMap = new Map<string, Plan[]>();
  for (const p of plans) {
    if (p.parentId) {
      const list = variantesMap.get(p.parentId) ?? [];
      list.push(p);
      variantesMap.set(p.parentId, list);
    }
  }

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDxfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseDxf(text);
    const objets = dxfToObjets(parsed, DEFAULT_IMPORT_OPTIONS);
    onImportDxf(objets, file.name);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="border-b border-[#252830] bg-[#14161d]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onHome} className="text-gray-500 hover:text-gray-200" title="Accueil">
              <Home size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-100">SIAL — Agencement atelier</h1>
              <p className="text-xs text-gray-500 mt-0.5">Plans d'implantation machines, postes, stocks & flux</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onLoadSIAL && (
              <button onClick={onLoadSIAL} className="inline-flex items-center gap-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 text-sm rounded px-3.5 py-2 border border-green-500/30">
                Plan SIAL Biguglia
              </button>
            )}
            <label className="inline-flex items-center gap-1.5 bg-[#252830] hover:bg-[#353840] text-gray-300 text-sm rounded px-3.5 py-2 cursor-pointer border border-[#353840]">
              <Upload size={14} /> Import DXF
              <input ref={fileRef} type="file" accept=".dxf" onChange={handleDxfUpload} className="hidden" />
            </label>
            <button onClick={onNew} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3.5 py-2">
              <Plus size={16} /> Nouveau plan
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {plans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Aucun plan enregistre.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onNew} className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3.5 py-2">
                <Plus size={16} /> Creer le premier plan
              </button>
              <label className="inline-flex items-center gap-1.5 bg-[#252830] hover:bg-[#353840] text-gray-300 text-sm rounded px-3.5 py-2 cursor-pointer border border-[#353840]">
                <Upload size={14} /> Importer un DXF
                <input type="file" accept=".dxf" onChange={handleDxfUpload} className="hidden" />
              </label>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {[...roots].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
              const variantes = variantesMap.get(p.id) ?? [];
              const hasVariantes = variantes.length > 0;
              const isExpanded = expandedGroups.has(p.id);
              const totalM2 = (p.largeurSite * p.hauteurSite) / 10000;
              const batM2 = (p.batiment.largeur * p.batiment.hauteur) / 10000;
              const forme = p.batiment.forme ?? 'rectangle';

              return (
                <div key={p.id}>
                  {/* Plan principal */}
                  <div className="bg-[#181c25] rounded-lg border border-[#252830] px-4 py-3 flex items-center gap-3 hover:border-[#353840] transition-colors cursor-pointer group"
                    onClick={() => onSelect(p.id)}>
                    {/* Chevron variantes */}
                    {hasVariantes ? (
                      <button onClick={(e) => { e.stopPropagation(); toggleGroup(p.id); }}
                        className="p-1 text-gray-500 hover:text-gray-300">
                        <ChevronDown size={14} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
                      </button>
                    ) : <div className="w-6" />}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-200">{p.nom}</span>
                        {forme !== 'rectangle' && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-400 border border-violet-500/30">
                            {forme.toUpperCase()}
                          </span>
                        )}
                        {hasVariantes && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                            {variantes.length + 1} versions
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>Site {totalM2.toFixed(0)} m2</span>
                        <span>Bat {batM2.toFixed(0)} m2</span>
                        <span>{p.objets.length} objet(s)</span>
                        <span>{p.niveaux.length} niv.</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600">{p.date}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); onCreateVariante(p.id); }}
                        className="p-1.5 text-gray-500 hover:text-violet-400" title="Creer variante">
                        <GitBranch size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onDuplicate(p.id); }}
                        className="p-1.5 text-gray-500 hover:text-gray-300" title="Dupliquer">
                        <Copy size={14} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer "${p.nom}" ?`)) onDelete(p.id); }}
                        className="p-1.5 text-gray-500 hover:text-red-400" title="Supprimer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
                  </div>

                  {/* Variantes */}
                  {isExpanded && variantes.length > 0 && (
                    <div className="ml-8 mt-1 space-y-1">
                      {variantes.sort((a, b) => (a.version ?? 0) - (b.version ?? 0)).map(v => (
                        <div key={v.id}
                          className="bg-[#14161d] rounded-lg border border-[#1e2028] px-4 py-2.5 flex items-center gap-3 hover:border-[#353840] transition-colors cursor-pointer group"
                          onClick={() => onSelect(v.id)}>
                          <GitBranch size={12} className="text-violet-400 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gray-300">{v.nom}</span>
                              <span className="text-[9px] text-gray-600">v{v.version}</span>
                            </div>
                            {v.varianteLabel && <p className="text-[10px] text-gray-600 mt-0.5">{v.varianteLabel}</p>}
                          </div>
                          <span className="text-[10px] text-gray-600">{v.objets.length} obj.</span>
                          <span className="text-[10px] text-gray-600">{v.date}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); onCreateVariante(v.id); }}
                              className="p-1 text-gray-500 hover:text-violet-400" title="Creer sous-variante">
                              <GitBranch size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); if (confirm(`Supprimer "${v.nom}" ?`)) onDelete(v.id); }}
                              className="p-1 text-gray-500 hover:text-red-400">
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <ChevronRight size={14} className="text-gray-600" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
