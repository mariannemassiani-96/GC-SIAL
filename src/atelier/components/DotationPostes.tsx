import { useState, useCallback } from 'react';
import { Plus, Trash2, ChevronDown, Search, Download } from 'lucide-react';
import { v4 as uid } from 'uuid';
import { useApiState } from '../../useApiState';

// ── Types ────────────────────────────────────────────────────────────

export interface PosteTravail {
  id: string;
  nom: string;
  machines: string;
  etapeFlux: string;
  localisation: string;
  dotations: DotationArticle[];
}

export interface DotationArticle {
  id: string;
  ref: string;
  designation: string;
  qteDefinie: number;
  unite: string;
  emplacementP: string;  // P/[POSTE]/[N]
  statut: 'a_definir' | 'defini' | 'bac_installe' | 'etiquete';
  notes: string;
}

const STATUT_LABELS: Record<string, { label: string; color: string }> = {
  a_definir: { label: 'A definir', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
  defini: { label: 'Defini', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  bac_installe: { label: 'Bac installe', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  etiquete: { label: 'Etiquete', color: 'bg-green-600/20 text-green-400 border-green-500/30' },
};

const STORAGE_KEY = 'sial-dotations-postes';


// ── Données démo ─────────────────────────────────────────────────────

const DEMO_POSTES: PosteTravail[] = [
  {
    id: uid(), nom: 'Debit ALU', machines: 'PERTICI Univer 500, EMMEGI Phantomatic T3', etapeFlux: 'Etape 1 — Decoupe ALU', localisation: 'Zone debit gauche',
    dotations: [
      { id: uid(), ref: 'VA6338Z', designation: 'Vis autoforeuse 6.3x38 zinguee', qteDefinie: 50, unite: 'piece', emplacementP: 'P/DEBIT-ALU/1', statut: 'etiquete', notes: '' },
      { id: uid(), ref: 'LAME-PERTICI', designation: 'Lame carbure D500 Z120', qteDefinie: 2, unite: 'piece', emplacementP: 'P/DEBIT-ALU/2', statut: 'bac_installe', notes: 'En reserve sous la scie' },
      { id: uid(), ref: 'GANT-COUPE', designation: 'Gants anti-coupure T9', qteDefinie: 2, unite: 'paire', emplacementP: 'P/DEBIT-ALU/3', statut: 'etiquete', notes: '' },
      { id: uid(), ref: 'LUN-SECU', designation: 'Lunettes de securite', qteDefinie: 1, unite: 'piece', emplacementP: 'P/DEBIT-ALU/4', statut: 'defini', notes: '' },
    ],
  },
  {
    id: uid(), nom: 'Debit PVC', machines: 'KABAN CM 4020', etapeFlux: 'Etape 1 — Decoupe PVC', localisation: 'Zone debit droite',
    dotations: [
      { id: uid(), ref: 'LAME-KABAN', designation: 'Lame carbure PVC D400', qteDefinie: 2, unite: 'piece', emplacementP: 'P/DEBIT-PVC/1', statut: 'bac_installe', notes: '' },
      { id: uid(), ref: 'BOUCH-OREIL', designation: 'Bouchons oreilles mousse', qteDefinie: 10, unite: 'paire', emplacementP: 'P/DEBIT-PVC/2', statut: 'a_definir', notes: '' },
    ],
  },
  {
    id: uid(), nom: 'Assemblage ALU', machines: 'Table assemblage, visseuse', etapeFlux: 'Etape 3 — Assemblage', localisation: 'Zone assemblage centre',
    dotations: [
      { id: uid(), ref: 'EQUERRE-NUM', designation: 'Equerre numerique', qteDefinie: 1, unite: 'piece', emplacementP: 'P/ASSEMBLAGE/1', statut: 'defini', notes: 'Instrument de mesure' },
      { id: uid(), ref: 'CLE-ALLEN-JEU', designation: 'Jeu cles Allen 1.5-10mm', qteDefinie: 1, unite: 'jeu', emplacementP: 'P/ASSEMBLAGE/2', statut: 'a_definir', notes: '' },
    ],
  },
  {
    id: uid(), nom: 'Montage quincaillerie', machines: 'Poste frappe Ferco', etapeFlux: 'Etape 4 — Quincaillerie', localisation: 'Zone montage',
    dotations: [],
  },
  {
    id: uid(), nom: 'Vitrage', machines: 'Table vitrage, ventouses', etapeFlux: 'Etape 5 — Vitrage', localisation: 'Zone vitrage fond',
    dotations: [],
  },
];

// ── Composant principal ──────────────────────────────────────────────

interface DotationPostesProps {
  postes?: PosteTravail[];
  onUpdate?: (postes: PosteTravail[]) => void;
}

export function DotationPostes({ postes: externalPostes, onUpdate: externalUpdate }: DotationPostesProps) {
  const [internalPostes, setInternalPostes] = useApiState<PosteTravail[]>('stock', 'dotations', STORAGE_KEY, DEMO_POSTES);
  const postes = externalPostes ?? internalPostes;
  const setPostes = useCallback((next: PosteTravail[]) => {
    if (externalUpdate) externalUpdate(next);
    else setInternalPostes(next);
  }, [externalUpdate, setInternalPostes]);

  const [selPosteId, setSelPosteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');


  // KPIs
  const totalPostes = postes.length;
  const totalDotations = postes.reduce((s, p) => s + p.dotations.length, 0);
  const etiquetes = postes.reduce((s, p) => s + p.dotations.filter(d => d.statut === 'etiquete').length, 0);
  const sansDefinition = postes.filter(p => p.dotations.length === 0).length;
  const incomplets = postes.filter(p => p.dotations.length > 0 && p.dotations.some(d => d.statut === 'a_definir')).length;

  const addPoste = () => {
    const p: PosteTravail = { id: uid(), nom: '', machines: '', etapeFlux: '', localisation: '', dotations: [] };
    setPostes([...postes, p]);
    setSelPosteId(p.id);
  };

  const updatePoste = (id: string, patch: Partial<PosteTravail>) => {
    setPostes(postes.map(p => p.id === id ? { ...p, ...patch } : p));
  };

  const deletePoste = (id: string) => {
    setPostes(postes.filter(p => p.id !== id));
    if (selPosteId === id) setSelPosteId(null);
  };

  const addDotation = (posteId: string) => {
    const d: DotationArticle = { id: uid(), ref: '', designation: '', qteDefinie: 1, unite: 'piece', emplacementP: '', statut: 'a_definir', notes: '' };
    setPostes(postes.map(p => p.id === posteId ? { ...p, dotations: [...p.dotations, d] } : p));
  };

  const updateDotation = (posteId: string, dotId: string, patch: Partial<DotationArticle>) => {
    setPostes(postes.map(p => p.id === posteId ? { ...p, dotations: p.dotations.map(d => d.id === dotId ? { ...d, ...patch } : d) } : p));
  };

  const deleteDotation = (posteId: string, dotId: string) => {
    setPostes(postes.map(p => p.id === posteId ? { ...p, dotations: p.dotations.filter(d => d.id !== dotId) } : p));
  };

  const exportCSV = () => {
    const h = ['Poste', 'Ref', 'Designation', 'Qte', 'Unite', 'Emplacement P', 'Statut', 'Notes'];
    const rows = postes.flatMap(p => p.dotations.map(d => [p.nom, d.ref, d.designation, d.qteDefinie, d.unite, d.emplacementP, d.statut, d.notes]));
    const csv = '﻿' + [h.join(';'), ...rows.map(r => r.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `dotations_postes_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const filtered = postes.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    return p.nom.toLowerCase().includes(q) || p.machines.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Postes</p>
          <p className="text-xl font-bold text-white">{totalPostes}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Articles dotes</p>
          <p className="text-xl font-bold text-blue-400">{totalDotations}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Etiquetes</p>
          <p className="text-xl font-bold text-green-400">{etiquetes}/{totalDotations}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Sans dotation</p>
          <p className={`text-xl font-bold ${sansDefinition > 0 ? 'text-red-400' : 'text-gray-400'}`}>{sansDefinition}</p>
        </div>
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
          <p className="text-[10px] text-gray-500 uppercase">Incomplets</p>
          <p className={`text-xl font-bold ${incomplets > 0 ? 'text-amber-400' : 'text-gray-400'}`}>{incomplets}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher poste..."
            className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 text-xs bg-green-600/10 border border-green-500/30 text-green-400 rounded-lg">
          <Download size={12} /> Export CSV
        </button>
        <button onClick={addPoste} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
          <Plus size={14} /> Nouveau poste
        </button>
      </div>

      {/* Liste des postes */}
      <div className="space-y-3">
        {filtered.map(p => {
          const isSelected = selPosteId === p.id;
          const nbDot = p.dotations.length;
          const nbEtiq = p.dotations.filter(d => d.statut === 'etiquete').length;
          const complet = nbDot > 0 && nbEtiq === nbDot;
          return (
            <div key={p.id} className={`bg-[#181a20] border rounded-xl overflow-hidden ${isSelected ? 'border-blue-500/40' : complet ? 'border-green-500/20' : 'border-[#2a2d35]'}`}>
              {/* Header poste */}
              <button onClick={() => setSelPosteId(isSelected ? null : p.id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1c1e24]">
                <div className={`w-3 h-3 rounded-full shrink-0 ${complet ? 'bg-green-500' : nbDot > 0 ? 'bg-amber-500' : 'bg-gray-600'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.nom || '(sans nom)'}</span>
                    {nbDot === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">Sans dotation</span>}
                    {complet && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/30">Complet</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.etapeFlux} — {p.machines}</p>
                </div>
                <span className="text-xs text-gray-500">{nbEtiq}/{nbDot}</span>
                <ChevronDown size={14} className={`text-gray-600 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
              </button>

              {/* Detail poste */}
              {isSelected && (
                <div className="px-4 pb-4 border-t border-[#2a2d35] pt-3 space-y-3">
                  {/* Infos poste */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div><label className="text-[10px] text-gray-500 block mb-0.5">Nom</label>
                      <input value={p.nom} onChange={e => updatePoste(p.id, { nom: e.target.value })} className="w-full px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" /></div>
                    <div><label className="text-[10px] text-gray-500 block mb-0.5">Machines</label>
                      <input value={p.machines} onChange={e => updatePoste(p.id, { machines: e.target.value })} className="w-full px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" /></div>
                    <div><label className="text-[10px] text-gray-500 block mb-0.5">Etape flux</label>
                      <input value={p.etapeFlux} onChange={e => updatePoste(p.id, { etapeFlux: e.target.value })} className="w-full px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" /></div>
                    <div><label className="text-[10px] text-gray-500 block mb-0.5">Localisation</label>
                      <input value={p.localisation} onChange={e => updatePoste(p.id, { localisation: e.target.value })} className="w-full px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" /></div>
                  </div>

                  {/* Dotations */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs text-gray-500 uppercase tracking-wider">Articles de dotation ({p.dotations.length})</h4>
                      <button onClick={() => addDotation(p.id)} className="text-[10px] text-blue-400 hover:text-blue-300"><Plus size={10} className="inline" /> Ajouter</button>
                    </div>
                    {p.dotations.length === 0 ? (
                      <p className="text-[10px] text-gray-600 py-3 text-center">Aucun article — ajoutez la dotation de ce poste</p>
                    ) : (
                      <div className="space-y-1.5">
                        {p.dotations.map(d => {
                          const st = STATUT_LABELS[d.statut];
                          return (
                            <div key={d.id} className="bg-[#0f1117] border border-[#252830] rounded-lg p-2 grid grid-cols-6 gap-2 items-center">
                              <input value={d.ref} onChange={e => updateDotation(p.id, d.id, { ref: e.target.value })} placeholder="Ref" className="bg-transparent text-[10px] text-amber-400 font-mono outline-none" />
                              <input value={d.designation} onChange={e => updateDotation(p.id, d.id, { designation: e.target.value })} placeholder="Designation" className="col-span-2 bg-transparent text-[10px] text-white outline-none" />
                              <div className="flex items-center gap-1">
                                <input type="number" value={d.qteDefinie} onChange={e => updateDotation(p.id, d.id, { qteDefinie: Number(e.target.value) })} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-[10px] text-white w-10 text-center outline-none" />
                                <span className="text-[9px] text-gray-600">{d.unite}</span>
                              </div>
                              <input value={d.emplacementP} onChange={e => updateDotation(p.id, d.id, { emplacementP: e.target.value })} placeholder="P/POSTE/N" className="bg-transparent text-[10px] text-gray-400 font-mono outline-none" />
                              <div className="flex items-center gap-1">
                                <select value={d.statut} onChange={e => updateDotation(p.id, d.id, { statut: e.target.value as DotationArticle['statut'] })}
                                  className={`text-[9px] rounded px-1 py-0.5 border outline-none ${st.color}`}>
                                  {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                </select>
                                <button onClick={() => deleteDotation(p.id, d.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <button onClick={() => deletePoste(p.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 mt-2">
                    <Trash2 size={12} /> Supprimer ce poste
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
