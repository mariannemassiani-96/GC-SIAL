import { useState, useEffect, useCallback } from 'react';

const API = import.meta.env.VITE_ISULA_API_URL as string || '';

const STATUTS_VERRE = [
  { id: 'a_preparer', label: 'A preparer', color: 'text-gray-400 bg-gray-500/20' },
  { id: 'a_couper', label: 'A couper', color: 'text-blue-400 bg-blue-500/20' },
  { id: 'coupe', label: 'Coupe', color: 'text-cyan-400 bg-cyan-500/20' },
  { id: 'a_assembler', label: 'A assembler', color: 'text-amber-400 bg-amber-500/20' },
  { id: 'assemble', label: 'Assemble', color: 'text-green-400 bg-green-500/20' },
  { id: 'nc', label: 'Non conforme', color: 'text-red-400 bg-red-500/20' },
  { id: 'casse', label: 'Casse', color: 'text-red-400 bg-red-500/20' },
  { id: 'manquant', label: 'Manquant', color: 'text-orange-400 bg-orange-500/20' },
];

const STATUTS_WE = [
  { id: 'a_couper', label: 'A couper', color: 'text-blue-400 bg-blue-500/20' },
  { id: 'coupe', label: 'Coupe', color: 'text-green-400 bg-green-500/20' },
  { id: 'nc', label: 'Non conforme', color: 'text-red-400 bg-red-500/20' },
];

interface OptimPlate {
  numero: number; material: string; plateWidth: number; plateHeight: number;
  pieces: { vitrageRef: string; width: number; height: number; x: number; y: number; rotated: boolean; face: string; material: string }[];
  utilisation: number; remnants?: { x: number; y: number; w: number; h: number; classe: string }[];
}
interface OptimResult { material: string; plates: OptimPlate[]; totalPlates: number; totalPieces: number; tauxUtilisation: number }

interface PrepItem { needed: number; ready: boolean; nc_qty: number; nc_notes: string }

interface Lot {
  id: string; reference: string; semaine: string; date_creation: string;
  commande_refs: string[]; total_pieces: number; total_we: number; statut: string;
  pieces?: Piece[]; we_pieces?: WEPiece[];
  lot_matieres?: Record<string, string>;
  glass_optim?: OptimResult[];
  we_optim?: unknown[];
  preparation?: Record<string, PrepItem>;
}

interface Piece {
  id: string; commande_ref: string; vitrage_ref: string; largeur: number; hauteur: number;
  composition: string; face: string; material: string; machine: string; plaque_no: number;
  lot_verre: string; statut: string; operateur: string; date_coupe: string | null; date_assemblage: string | null;
}

interface WEPiece {
  id: string; barre_no: number; longueur: number; orig_dim: number; cote: string;
  vitrage_ref: string; epaisseur: number; couleur: string; statut: string; operateur: string;
}

interface Stats {
  pieces: Record<string, number>;
  we: Record<string, number>;
  daily_cuts: { jour: string; nb: number }[];
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `S${String(weekNum).padStart(2, '0')}-${d.getFullYear()}`;
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function patchJSON(path: string, body: unknown) {
  await fetch(`${API}${path}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

// ── Main Production View ─────────────────────────────────────────────

export function ProductionView({ onBack }: { onBack: () => void }) {
  const [modeAtelier, setModeAtelier] = useState(false);
  const [poste, setPoste] = useState<'' | 'lisec' | 'bottero' | 'assemblage'>('');
  const [semaine, setSemaine] = useState(getISOWeek(new Date()));
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'verre' | 'we' | 'optim_verre' | 'optim_we' | 'preparation' | 'lots' | 'stats'>('verre');
  const [filtreMachine, setFiltreMachine] = useState<string>('');
  const [filtreStatut, setFiltreStatut] = useState<string>('');
  const [filtreCommande, setFiltreCommande] = useState<string>('');

  const loadLots = useCallback(async () => {
    try {
      const data = await fetchJSON<Lot[]>(`/api/production/lots?semaine=${semaine}`);
      setLots(data);
    } catch { setLots([]); }
  }, [semaine]);

  const loadStats = useCallback(async () => {
    try {
      setStats(await fetchJSON<Stats>(`/api/production/stats?semaine=${semaine}`));
    } catch { setStats(null); }
  }, [semaine]);

  useEffect(() => { loadLots(); loadStats(); }, [loadLots, loadStats]);

  const loadLotDetail = async (lot: Lot) => {
    try {
      const full = await fetchJSON<Lot>(`/api/production/lots/${lot.id}`);
      setSelectedLot(full);
    } catch { /* ignore */ }
  };

  const updatePieceStatut = async (pieceId: string, statut: string) => {
    await patchJSON(`/api/production/pieces/${pieceId}`, { statut, operateur: '' });
    if (selectedLot) loadLotDetail(selectedLot);
    loadStats();
  };

  const updateWEStatut = async (pieceId: string, statut: string) => {
    await patchJSON(`/api/production/we/${pieceId}`, { statut, operateur: '' });
    if (selectedLot) loadLotDetail(selectedLot);
    loadStats();
  };

  const pieces = selectedLot?.pieces ?? [];
  const wePieces = selectedLot?.we_pieces ?? [];

  const filteredPieces = pieces.filter(p =>
    (!filtreMachine || p.machine === filtreMachine) &&
    (!filtreStatut || p.statut === filtreStatut) &&
    (!filtreCommande || p.commande_ref === filtreCommande)
  );

  const allCommandes = [...new Set(pieces.map(p => p.commande_ref))];

  // ── Mode Atelier (tablette/opérateur) ──
  if (modeAtelier) {
    return (
      <AtelierView
        lots={lots} semaine={semaine} poste={poste}
        onSelectPoste={setPoste}
        onBack={() => setModeAtelier(false)}
        onSemaineChange={setSemaine}
        loadLotDetail={loadLotDetail}
        selectedLot={selectedLot}
        setSelectedLot={setSelectedLot}
        updatePieceStatut={updatePieceStatut}
        onReload={() => { if (selectedLot) loadLotDetail(selectedLot); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <h2 className="text-xl font-bold text-amber-400">Production</h2>
        <button onClick={() => setModeAtelier(true)}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg font-bold transition-colors">
          MODE ATELIER
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - 7);
            const parts = semaine.match(/S(\d+)-(\d+)/);
            if (parts) setSemaine(`S${String(Math.max(1, parseInt(parts[1]) - 1)).padStart(2, '0')}-${parts[2]}`);
          }} className="text-gray-500 hover:text-white px-2">&lt;</button>
          <span className="text-white font-mono text-sm bg-[#181a20] px-3 py-1 rounded border border-[#2a2d35]">{semaine}</span>
          <button onClick={() => {
            const parts = semaine.match(/S(\d+)-(\d+)/);
            if (parts) setSemaine(`S${String(Math.min(52, parseInt(parts[1]) + 1)).padStart(2, '0')}-${parts[2]}`);
          }} className="text-gray-500 hover:text-white px-2">&gt;</button>
        </div>
        <span className="text-xs text-gray-500">{lots.length} lot(s)</span>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {STATUTS_VERRE.slice(0, 6).map(s => (
            <div key={s.id} className="bg-[#181a20] rounded p-3 border border-[#2a2d35] text-center">
              <div className={`text-xl font-bold ${s.color.split(' ')[0]}`}>{stats.pieces[s.id] || 0}</div>
              <div className="text-[10px] text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Lot selector */}
      {!selectedLot ? (
        <div>
          {lots.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">Aucun lot de production pour {semaine}.</p>
          ) : (
            <div className="space-y-2">
              {lots.map(lot => (
                <button key={lot.id} onClick={() => loadLotDetail(lot)}
                  className="w-full text-left p-4 bg-[#181a20] rounded-lg border border-[#2a2d35] hover:border-amber-500/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-semibold">{lot.reference}</span>
                    <span className="text-xs text-gray-400">{lot.total_pieces} pcs verre + {lot.total_we} WE</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {(lot.commande_refs || []).map((ref: string, i: number) => (
                      <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-[#14161d] text-gray-400">{ref}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setSelectedLot(null)} className="text-gray-500 hover:text-white text-sm">&larr; Lots</button>
            <h3 className="text-lg font-bold text-white">{selectedLot.reference}</h3>
            <span className="text-xs text-gray-400">{pieces.length} pcs verre — {wePieces.length} WE</span>
            <button onClick={async () => {
              if (!confirm(`Supprimer le lot ${selectedLot.reference} ?`)) return;
              await fetch(`${API}/api/production/lots/${selectedLot.id}`, { method: 'DELETE' });
              setSelectedLot(null); loadLots(); loadStats();
            }} className="ml-auto px-3 py-1 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition-colors">
              Supprimer lot
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#2a2d35] flex-wrap">
            {([
              ['verre', `Verre (${pieces.length})`],
              ['we', `WE (${wePieces.length})`],
              ['optim_verre', 'Optim Verre'],
              ['optim_we', 'Optim WE'],
              ['preparation', 'Preparation'],
              ['lots', 'Lots matieres'],
              ['stats', 'Productivite'],
            ] as const).map(([t, label]) => (
              <button key={t} onClick={() => setTab(t as typeof tab)}
                className={`px-3 py-2 text-xs border-b-2 transition-colors ${tab === t
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {label}
              </button>
            ))}
          </div>

          {/* Filtres verre */}
          {tab === 'verre' && (
            <>
              <div className="flex gap-2 flex-wrap">
                <select value={filtreMachine} onChange={e => setFiltreMachine(e.target.value)}
                  className="bg-[#181a20] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
                  <option value="">Toutes machines</option>
                  <option value="lisec">LISEC</option>
                  <option value="bottero">Bottero</option>
                </select>
                <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                  className="bg-[#181a20] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
                  <option value="">Tous statuts</option>
                  {STATUTS_VERRE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
                <select value={filtreCommande} onChange={e => setFiltreCommande(e.target.value)}
                  className="bg-[#181a20] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
                  <option value="">Toutes commandes</option>
                  {allCommandes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="text-xs text-gray-500 ml-auto">{filteredPieces.length} / {pieces.length} pieces</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                    <th className="text-left py-2 px-2">Commande</th>
                    <th className="text-left py-2 px-2">Reference</th>
                    <th className="text-left py-2 px-2">Face</th>
                    <th className="text-left py-2 px-2">Materiau</th>
                    <th className="text-right py-2 px-2">L</th>
                    <th className="text-right py-2 px-2">H</th>
                    <th className="text-left py-2 px-2">Machine</th>
                    <th className="text-left py-2 px-2">Plaque</th>
                    <th className="text-left py-2 px-2">Statut</th>
                  </tr></thead>
                  <tbody>
                    {filteredPieces.map(p => {
                      const st = STATUTS_VERRE.find(s => s.id === p.statut);
                      return (
                        <tr key={p.id} className="border-b border-[#1e2028] hover:bg-[#1e2028]">
                          <td className="py-1.5 px-2 text-gray-400">{p.commande_ref}</td>
                          <td className="py-1.5 px-2 text-white">{p.vitrage_ref}</td>
                          <td className={`py-1.5 px-2 ${p.face === 'EXT' ? 'text-red-400' : 'text-blue-400'}`}>{p.face}</td>
                          <td className="py-1.5 px-2 text-gray-300">{p.material}</td>
                          <td className="py-1.5 px-2 text-white text-right">{p.largeur}</td>
                          <td className="py-1.5 px-2 text-white text-right">{p.hauteur}</td>
                          <td className="py-1.5 px-2 text-amber-400 uppercase text-[10px]">{p.machine || '—'}</td>
                          <td className="py-1.5 px-2 text-gray-400">{p.plaque_no || '—'}</td>
                          <td className="py-1.5 px-2">
                            <select value={p.statut} onChange={e => updatePieceStatut(p.id, e.target.value)}
                              className={`text-[10px] px-2 py-0.5 rounded border border-transparent ${st?.color || ''} bg-opacity-30 cursor-pointer`}>
                              {STATUTS_VERRE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* WE tab */}
          {tab === 'we' && (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                  <th className="text-left py-2 px-2">Barre</th>
                  <th className="text-left py-2 px-2">Reference</th>
                  <th className="text-right py-2 px-2">Longueur</th>
                  <th className="text-left py-2 px-2">Cote</th>
                  <th className="text-left py-2 px-2">Ep.</th>
                  <th className="text-left py-2 px-2">Couleur</th>
                  <th className="text-left py-2 px-2">Statut</th>
                </tr></thead>
                <tbody>
                  {wePieces.map(p => {
                    const st = STATUTS_WE.find(s => s.id === p.statut);
                    return (
                      <tr key={p.id} className="border-b border-[#1e2028]">
                        <td className="py-1.5 px-2 text-white">B{p.barre_no}</td>
                        <td className="py-1.5 px-2 text-gray-300">{p.vitrage_ref}</td>
                        <td className="py-1.5 px-2 text-white text-right font-mono">{p.longueur}</td>
                        <td className="py-1.5 px-2 text-gray-400">{p.cote}</td>
                        <td className="py-1.5 px-2 text-gray-400">{p.epaisseur}mm</td>
                        <td className="py-1.5 px-2 text-gray-400">{p.couleur}</td>
                        <td className="py-1.5 px-2">
                          <select value={p.statut} onChange={e => updateWEStatut(p.id, e.target.value)}
                            className={`text-[10px] px-2 py-0.5 rounded ${st?.color || ''} cursor-pointer`}>
                            {STATUTS_WE.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Stats tab */}
          {/* Lots matieres */}
          {tab === 'lots' && selectedLot && (
            <LotMatieresTab lotId={selectedLot.id} pieces={pieces} lotMatieres={selectedLot.lot_matieres || {}} onReload={() => loadLotDetail(selectedLot)} />
          )}

          {tab === 'optim_verre' && selectedLot && (
            <OptimVerreTab glassOptim={selectedLot.glass_optim} pieces={pieces}
              lotId={selectedLot.id} onReload={() => loadLotDetail(selectedLot)} />
          )}

          {tab === 'optim_we' && selectedLot && (
            <div className="text-sm">
              {selectedLot.we_optim && (selectedLot.we_optim as unknown[]).length > 0 ? (
                <pre className="bg-[#181a20] p-4 rounded text-xs text-gray-300 overflow-auto max-h-96">
                  {JSON.stringify(selectedLot.we_optim, null, 2)}
                </pre>
              ) : (
                <p className="text-gray-500 text-sm">Donnees WE non disponibles pour ce lot.</p>
              )}
            </div>
          )}

          {tab === 'preparation' && selectedLot && (
            <PreparationTab lotId={selectedLot.id} pieces={pieces}
              savedPrep={selectedLot.preparation || {}} onReload={() => loadLotDetail(selectedLot)} />
          )}

          {tab === 'stats' && stats && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-300">Coupes par jour</h4>
              {stats.daily_cuts.length > 0 ? (
                <div className="flex items-end gap-1 h-32">
                  {stats.daily_cuts.map((d, i) => {
                    const max = Math.max(...stats.daily_cuts.map(x => x.nb));
                    const h = max > 0 ? (d.nb / max) * 100 : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-[9px] text-white">{d.nb}</span>
                        <div className="w-full bg-amber-500/60 rounded-t" style={{ height: `${h}%` }} />
                        <span className="text-[8px] text-gray-500">{String(d.jour).slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-xs">Aucune coupe enregistree.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Mode Atelier (plein écran tactile) ───────────────────────────────

function AtelierView({ lots, semaine, poste, onSelectPoste, onBack, onSemaineChange, loadLotDetail, selectedLot, setSelectedLot, updatePieceStatut, onReload }: {
  lots: Lot[]; semaine: string; poste: '' | 'lisec' | 'bottero' | 'assemblage';
  onSelectPoste: (p: '' | 'lisec' | 'bottero' | 'assemblage') => void;
  onBack: () => void; onSemaineChange: (s: string) => void;
  loadLotDetail: (lot: Lot) => void; selectedLot: Lot | null;
  setSelectedLot: (l: Lot | null) => void;
  updatePieceStatut: (id: string, statut: string) => void; onReload: () => void;
}) {
  const [plateIdx, setPlateIdx] = useState(0);

  if (!poste) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center gap-8 z-50">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-white text-lg px-4 py-2">← Bureau</button>
        <h1 className="text-4xl font-black text-white">ISULA VITRAGE</h1>
        <p className="text-xl text-gray-400">{semaine}</p>
        <div className="grid grid-cols-1 gap-6 w-full max-w-md px-8">
          {([['lisec', 'COUPE LISEC', 'bg-blue-700 hover:bg-blue-600'],
             ['bottero', 'COUPE BOTTERO', 'bg-green-700 hover:bg-green-600'],
             ['assemblage', 'ASSEMBLAGE', 'bg-purple-700 hover:bg-purple-600']] as const).map(([id, label, cls]) => (
            <button key={id} onClick={() => onSelectPoste(id)}
              className={`${cls} text-white text-2xl font-bold py-8 rounded-2xl transition-colors shadow-lg active:scale-95`}>
              {label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const pieces = selectedLot?.pieces ?? [];
  const machinePieces = poste === 'assemblage'
    ? pieces.filter(p => p.statut === 'coupe' || p.statut === 'a_assembler')
    : pieces.filter(p => p.machine === poste);

  if (!selectedLot) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={() => onSelectPoste('')} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Postes</button>
          <h1 className="text-2xl font-black text-white flex-1">{poste.toUpperCase()}</h1>
          <span className="text-lg text-amber-400 font-mono">{semaine}</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {lots.length === 0 ? (
            <p className="text-gray-500 text-2xl text-center py-20">Aucun lot cette semaine</p>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {lots.map(lot => (
                <button key={lot.id} onClick={() => loadLotDetail(lot)}
                  className="w-full p-6 bg-[#181a20] rounded-2xl border border-[#2a2d35] hover:border-amber-500 transition-colors text-left active:scale-[0.98]">
                  <div className="text-xl font-bold text-white">{lot.reference}</div>
                  <div className="text-base text-gray-400 mt-1">{lot.total_pieces} pcs verre — {lot.total_we} WE</div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {(lot.commande_refs || []).map((ref, i) => (
                      <span key={i} className="text-sm px-2 py-1 rounded bg-[#14161d] text-gray-300">{ref}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Vue plaque par plaque Atelier ──
  const glassOptim = selectedLot.glass_optim || [];
  const allPlates: OptimPlate[] = [];
  for (const r of glassOptim) {
    for (const p of (r.plates || [])) {
      const raw = p as unknown as Record<string, unknown>;
      allPlates.push({
        numero: p.numero ?? raw.numero as number,
        material: p.material ?? r.material,
        plateWidth: p.plateWidth ?? raw.plate_width as number ?? 3210,
        plateHeight: p.plateHeight ?? raw.plate_height as number ?? 2550,
        pieces: ((p.pieces || []) as unknown as Record<string, unknown>[]).map(pc => ({
          vitrageRef: (pc.vitrageRef ?? pc.vitrage_ref ?? '') as string,
          width: (pc.width ?? 0) as number, height: (pc.height ?? 0) as number,
          x: (pc.x ?? 0) as number, y: (pc.y ?? 0) as number,
          rotated: (pc.rotated ?? false) as boolean,
          face: (pc.face ?? '') as string, material: (pc.material ?? '') as string,
        })),
        utilisation: p.utilisation ?? raw.utilisation as number ?? 0,
      });
    }
  }

  const idx = Math.min(plateIdx, Math.max(0, allPlates.length - 1));
  const plate = allPlates[idx];
  const plaqueNo = plate?.numero || 0;
  const piecesOnPlate = pieces.filter(p => p.plaque_no === plaqueNo);
  const allCut = piecesOnPlate.length > 0 && piecesOnPlate.every(p => p.statut === 'coupe' || p.statut === 'assemble');
  const lotVerre = piecesOnPlate.find(p => p.lot_verre)?.lot_verre || '';

  const markPlateAsCut = async () => {
    for (const p of piecesOnPlate) {
      if (p.statut !== 'coupe' && p.statut !== 'assemble') {
        await patchJSON(`/api/production/pieces/${p.id}`, { statut: 'coupe', operateur: '' });
      }
    }
    onReload();
  };

  if (!plate) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center z-50">
        <p className="text-gray-500 text-xl">Pas de donnees d'optimisation pour ce lot</p>
        <button onClick={() => setSelectedLot(null)} className="mt-8 px-8 py-4 bg-gray-700 text-white text-lg rounded-xl">← Retour aux lots</button>
      </div>
    );
  }

  const pad = 20;
  const scale = 400 / Math.max(plate.plateWidth, plate.plateHeight);
  const w = plate.plateWidth * scale;
  const h = plate.plateHeight * scale;

  return (
    <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
      {/* Header atelier */}
      <div className="flex items-center gap-4 p-3 bg-[#14161d] border-b border-[#2a2d35]">
        <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-base px-3 py-2">← Lots</button>
        <span className="text-lg font-bold text-white flex-1">{selectedLot.reference}</span>
        <span className="text-base text-amber-400 font-mono">{poste.toUpperCase()}</span>
      </div>

      {/* Navigation + plaque */}
      <div className="flex-1 flex items-center gap-2 px-2 overflow-hidden">
        {/* Flèche gauche */}
        <button onClick={() => setPlateIdx(Math.max(0, idx - 1))} disabled={idx === 0}
          className="text-6xl text-white hover:text-amber-400 disabled:text-gray-800 transition-colors px-2 select-none active:scale-90 shrink-0">
          ◀
        </button>

        {/* Plaque centrale */}
        <div className="flex-1 flex flex-col items-center gap-3 min-w-0">
          <div className="text-center">
            <div className="text-3xl font-black text-white">Plaque {plaqueNo}</div>
            <div className="text-lg text-amber-400">{plate.material} — {plate.utilisation.toFixed(0)}% — {plate.pieces.length} pcs</div>
            <div className="text-base text-gray-500">{idx + 1} / {allPlates.length}</div>
          </div>

          {/* SVG plaque */}
          <div className="bg-white rounded-xl p-3 w-full max-w-xl">
            <svg viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`} className="w-full" style={{ maxHeight: '35vh' }}>
              <rect x={pad} y={pad} width={w} height={h} fill="#FFD700" stroke="#000" strokeWidth={1.5} />
              {plate.pieces.map((p, i) => {
                const pw = (p.rotated ? p.height : p.width) * scale;
                const ph = (p.rotated ? p.width : p.height) * scale;
                const rx = pad + p.x * scale;
                const ry = pad + p.y * scale;
                const fills = ['#0000CC', '#2244AA', '#0033BB', '#1155CC', '#003399', '#2266BB'];
                const fs = Math.min(12, pw / 8, ph / 3);
                return (
                  <g key={i}>
                    <rect x={rx} y={ry} width={pw} height={ph} fill={fills[i % fills.length]} stroke="#FFD700" strokeWidth={2} />
                    <text x={rx + pw / 2} y={ry + ph / 2} textAnchor="middle" dominantBaseline="middle"
                      fill="#FFD700" fontSize={Math.max(fs, 6)} fontWeight="bold">{i + 1}</text>
                  </g>
                );
              })}
              <text x={pad + w / 2} y={h + pad + 14} textAnchor="middle" fill="#000" fontSize={12} fontWeight="bold">{plate.plateWidth}</text>
              <text x={6} y={pad + h / 2} textAnchor="middle" fill="#000" fontSize={12} fontWeight="bold"
                transform={`rotate(-90,6,${pad + h / 2})`}>{plate.plateHeight}</text>
            </svg>
          </div>

          {/* Lot verre */}
          {lotVerre && <div className="text-lg text-green-400 font-mono">Lot verre : {lotVerre}</div>}

          {/* Liste pièces compacte */}
          <div className="w-full max-w-xl overflow-auto max-h-[15vh]">
            <table className="w-full text-sm">
              <tbody>
                {plate.pieces.map((p, i) => {
                  const effW = p.rotated ? p.height : p.width;
                  const effH = p.rotated ? p.width : p.height;
                  return (
                    <tr key={i} className="border-b border-gray-800">
                      <td className="py-1 px-2 text-amber-400 font-bold text-base">{i + 1}</td>
                      <td className="py-1 px-2 text-white text-base">{p.vitrageRef}</td>
                      <td className={`py-1 px-2 text-base ${p.face === 'EXT' ? 'text-red-400' : 'text-blue-400'}`}>{p.face}</td>
                      <td className="py-1 px-2 text-gray-300 text-base">{effW} x {effH}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Flèche droite */}
        <button onClick={() => setPlateIdx(Math.min(allPlates.length - 1, idx + 1))} disabled={idx >= allPlates.length - 1}
          className="text-6xl text-white hover:text-amber-400 disabled:text-gray-800 transition-colors px-2 select-none active:scale-90 shrink-0">
          ▶
        </button>
      </div>

      {/* Barre d'action bas */}
      <div className="p-4 bg-[#14161d] border-t border-[#2a2d35] flex items-center justify-center gap-6">
        <button onClick={markPlateAsCut} disabled={allCut}
          className={`px-12 py-5 rounded-2xl text-xl font-black transition-colors active:scale-95 ${
            allCut ? 'bg-green-800 text-green-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'}`}>
          {allCut ? '✓ PLAQUE COUPEE' : 'MARQUER COUPEE'}
        </button>
        {idx < allPlates.length - 1 && allCut && (
          <button onClick={() => setPlateIdx(idx + 1)}
            className="px-12 py-5 rounded-2xl text-xl font-black bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-95">
            SUIVANTE ▶
          </button>
        )}
      </div>
    </div>
  );
}


// ── Optim Verre Tab (plaque par plaque) ──────────────────────────────

function OptimVerreTab({ glassOptim, pieces, lotId, onReload }: {
  glassOptim?: OptimResult[]; pieces: Piece[]; lotId: string; onReload: () => void;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);

  if (!glassOptim || glassOptim.length === 0) {
    return <p className="text-gray-500 text-sm">Donnees d'optimisation non disponibles pour ce lot.</p>;
  }

  const allPlates: { plate: OptimPlate; material: string }[] = [];
  for (const r of glassOptim) {
    for (const p of (r.plates || [])) {
      const raw = p as unknown as Record<string, unknown>;
      const plate: OptimPlate = {
        numero: p.numero ?? raw.numero as number,
        material: p.material ?? (r.material || ''),
        plateWidth: p.plateWidth ?? raw.plate_width as number ?? 3210,
        plateHeight: p.plateHeight ?? raw.plate_height as number ?? 2550,
        pieces: ((p.pieces || []) as unknown as Record<string, unknown>[]).map(pc => ({
          vitrageRef: (pc.vitrageRef ?? pc.vitrage_ref ?? '') as string,
          width: (pc.width ?? 0) as number,
          height: (pc.height ?? 0) as number,
          x: (pc.x ?? 0) as number,
          y: (pc.y ?? 0) as number,
          rotated: (pc.rotated ?? false) as boolean,
          face: (pc.face ?? '') as string,
          material: (pc.material ?? '') as string,
        })),
        utilisation: p.utilisation ?? raw.utilisation as number ?? 0,
      };
      allPlates.push({ plate, material: plate.material });
    }
  }

  if (allPlates.length === 0) return <p className="text-gray-500 text-sm">Aucune plaque.</p>;

  const idx = Math.min(currentIdx, allPlates.length - 1);
  const { plate, material } = allPlates[idx];
  const plaqueNo = plate.numero;
  const lotVerre = pieces.find(p => p.plaque_no === plaqueNo)?.lot_verre || '';

  const [lotInput, setLotInput] = useState('');

  const piecesOnPlate = pieces.filter(p => p.plaque_no === plaqueNo);
  const allCut = piecesOnPlate.length > 0 && piecesOnPlate.every(p => p.statut === 'coupe' || p.statut === 'assemble');

  const saveLotVerre = async () => {
    if (!lotInput) return;
    await patchJSON(`/api/production/lots/${lotId}/lot-verre`, { plaque_nos: [plaqueNo], lot_verre: lotInput });
    setLotInput('');
    onReload();
  };

  const markPlateAsCut = async () => {
    for (const p of piecesOnPlate) {
      if (p.statut !== 'coupe' && p.statut !== 'assemble') {
        await patchJSON(`/api/production/pieces/${p.id}`, { statut: 'coupe', operateur: '' });
      }
    }
    onReload();
  };

  const pad = 30;
  const inner = 280;
  const scale = inner / Math.max(plate.plateWidth, plate.plateHeight);
  const w = plate.plateWidth * scale;
  const h = plate.plateHeight * scale;

  return (
    <div className="space-y-4">
      {/* Navigation arrows */}
      <div className="flex items-center justify-between bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
        <button onClick={() => setCurrentIdx(Math.max(0, idx - 1))} disabled={idx === 0}
          className="px-4 py-3 bg-[#14161d] hover:bg-blue-600 text-white text-lg rounded-lg disabled:opacity-20 transition-colors font-bold">
          ← Precedente
        </button>
        <div className="text-center">
          <div className="text-white text-lg font-bold">Plaque {plaqueNo}</div>
          <div className="text-amber-400 text-sm">{material}</div>
          <div className="text-gray-400 text-xs">{idx + 1} / {allPlates.length} — {plate.utilisation.toFixed(0)}% — {plate.pieces.length} pcs</div>
        </div>
        <button onClick={() => setCurrentIdx(Math.min(allPlates.length - 1, idx + 1))} disabled={idx === allPlates.length - 1}
          className="px-4 py-3 bg-[#14161d] hover:bg-blue-600 text-white text-lg rounded-lg disabled:opacity-20 transition-colors font-bold">
          Suivante →
        </button>
      </div>

      {/* Plate visualization */}
      <div className="bg-white rounded-lg p-4 border border-gray-300">
        <svg viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`} className="w-full" style={{ maxHeight: 350 }}>
          <rect x={pad} y={pad} width={w} height={h} fill="#FFD700" stroke="#000" strokeWidth={1} />
          {plate.pieces.map((p, i) => {
            const pw = (p.rotated ? p.height : p.width) * scale;
            const ph = (p.rotated ? p.width : p.height) * scale;
            const rx = pad + p.x * scale;
            const ry = pad + p.y * scale;
            const effW = p.rotated ? p.height : p.width;
            const effH = p.rotated ? p.width : p.height;
            const fs = Math.min(8, pw / 10, ph / 4);
            const fills = ['#0000CC', '#2244AA', '#0033BB', '#1155CC', '#003399', '#2266BB'];
            return (
              <g key={i}>
                <rect x={rx} y={ry} width={pw} height={ph} fill={fills[i % fills.length]} stroke="#FFD700" strokeWidth={1.5} />
                <text x={rx + pw / 2} y={ry + ph / 2 - (fs > 3 ? fs * 0.4 : 0)}
                  textAnchor="middle" dominantBaseline="middle" fill="#FFD700" fontSize={Math.max(fs, 5)} fontWeight="bold">
                  {i + 1}
                </text>
                {fs > 3 && <text x={rx + pw / 2} y={ry + ph / 2 + fs * 0.5}
                  textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fs * 0.7}>
                  {p.vitrageRef}
                </text>}
                {fs > 4 && <text x={rx + pw / 2} y={ry + ph / 2 + fs * 1.2}
                  textAnchor="middle" dominantBaseline="middle" fill="#aac" fontSize={fs * 0.55}>
                  {effW}x{effH}
                </text>}
              </g>
            );
          })}
          <text x={pad + w / 2} y={h + pad + 14} textAnchor="middle" fill="#000" fontSize={10} fontWeight="bold">{plate.plateWidth}</text>
          <text x={8} y={pad + h / 2} textAnchor="middle" fill="#000" fontSize={10} fontWeight="bold" transform={`rotate(-90,8,${pad + h / 2})`}>{plate.plateHeight}</text>
        </svg>
      </div>

      {/* Lot verre + checkbox coupe */}
      <div className="flex items-center gap-4 bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
        <div className="flex-1">
          <label className="text-xs text-gray-400 block mb-1">N° lot verre pour cette plaque</label>
          <div className="flex gap-2">
            <input value={lotInput || lotVerre} onChange={e => setLotInput(e.target.value)}
              placeholder="Ex: LOT-2026-0042" className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white flex-1 focus:border-blue-500 outline-none" />
            <button onClick={saveLotVerre} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded transition-colors">
              Sauver
            </button>
          </div>
          {lotVerre && <div className="text-xs text-green-400 mt-1">Lot actuel : {lotVerre}</div>}
        </div>
        <div className="text-center">
          <button onClick={markPlateAsCut} disabled={allCut}
            className={`px-6 py-3 rounded-lg text-sm font-bold transition-colors ${
              allCut ? 'bg-green-700 text-green-200 cursor-default' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}>
            {allCut ? '✓ Coupee' : 'Marquer coupee'}
          </button>
        </div>
      </div>

      {/* Piece list for this plate */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
            <th className="text-left py-2 px-2">N</th>
            <th className="text-left py-2 px-2">Reference</th>
            <th className="text-left py-2 px-2">Face</th>
            <th className="text-left py-2 px-2">Materiau</th>
            <th className="text-right py-2 px-2">L x H</th>
            <th className="text-center py-2 px-2">Rotation</th>
          </tr></thead>
          <tbody>
            {plate.pieces.map((p, i) => (
              <tr key={i} className="border-b border-[#1e2028]">
                <td className="py-1 px-2 text-white font-bold">{i + 1}</td>
                <td className="py-1 px-2 text-white">{p.vitrageRef}</td>
                <td className={`py-1 px-2 ${p.face === 'EXT' ? 'text-red-400' : 'text-blue-400'}`}>{p.face}</td>
                <td className="py-1 px-2 text-gray-300">{p.material}</td>
                <td className="py-1 px-2 text-white text-right">{p.rotated ? p.height : p.width} x {p.rotated ? p.width : p.height}</td>
                <td className="py-1 px-2 text-center">{p.rotated ? 'Oui' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


// ── Preparation Matieres Tab ────────────────────────────────────────

function PreparationTab({ lotId, pieces, savedPrep, onReload }: {
  lotId: string; pieces: Piece[]; savedPrep: Record<string, PrepItem>; onReload: () => void;
}) {
  const materialCounts = new Map<string, number>();
  for (const p of pieces) {
    if (p.plaque_no > 0) {
      const key = p.material;
      const existing = materialCounts.get(key) || new Set();
      if (typeof existing === 'number') {
        materialCounts.set(key, existing);
      }
    }
  }

  const plateCounts = new Map<string, Set<number>>();
  for (const p of pieces) {
    if (p.plaque_no > 0) {
      const set = plateCounts.get(p.material) || new Set();
      set.add(p.plaque_no);
      plateCounts.set(p.material, set);
    }
  }

  const materials = [...plateCounts.entries()].map(([mat, plaques]) => {
    const saved = savedPrep[mat];
    return { material: mat, needed: plaques.size, ready: saved?.ready ?? false, nc_qty: saved?.nc_qty ?? 0, nc_notes: saved?.nc_notes ?? '' };
  });

  const [prep, setPrep] = useState<Record<string, PrepItem>>(() => {
    const init: Record<string, PrepItem> = {};
    for (const m of materials) {
      init[m.material] = { needed: m.needed, ready: m.ready ?? false, nc_qty: m.nc_qty ?? 0, nc_notes: m.nc_notes ?? '' };
    }
    return init;
  });

  const save = async () => {
    await patchJSON(`/api/production/lots/${lotId}/preparation`, { preparation: prep });
    onReload();
  };

  const update = (mat: string, patch: Partial<PrepItem>) => {
    setPrep(prev => ({ ...prev, [mat]: { ...prev[mat], ...patch } }));
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-300">Preparation matieres premieres</h4>
      <div className="space-y-2">
        {materials.map(m => {
          const p = prep[m.material] || { needed: m.needed, ready: false, nc_qty: 0, nc_notes: '' };
          return (
            <div key={m.material} className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
              p.ready ? 'bg-green-900/20 border-green-500/30' : 'bg-[#181a20] border-[#2a2d35]'}`}>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={p.ready} onChange={e => update(m.material, { ready: e.target.checked })}
                  className="w-5 h-5 rounded" />
              </label>
              <div className="flex-1">
                <div className="text-white font-semibold">{m.needed} plaque{m.needed > 1 ? 's' : ''} de {m.material}</div>
                <div className="text-xs text-gray-500">Format 3210 x 2550</div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">NC/manquant:</label>
                <input type="number" min={0} value={p.nc_qty} onChange={e => update(m.material, { nc_qty: +e.target.value })}
                  className="w-14 bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white text-center" />
              </div>
              <input value={p.nc_notes} onChange={e => update(m.material, { nc_notes: e.target.value })}
                placeholder="Notes NC" className="w-40 bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1 text-xs text-white" />
            </div>
          );
        })}
      </div>
      <button onClick={save} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors">
        Sauvegarder preparation
      </button>
    </div>
  );
}


// ── Lot Matieres Tab ─────────────────────────────────────────────────

const MATIERES_GLOBALES = [
  { key: 'intercalaire', label: 'Intercalaire / Warm Edge' },
  { key: 'dessiccant', label: 'Dessiccant (tamis)' },
  { key: 'masticButyl', label: 'Mastic butyl (1re barriere)' },
  { key: 'masticPU', label: 'Mastic PU (2e barriere)' },
  { key: 'gazArgon', label: 'Gaz argon' },
];

function LotMatieresTab({ lotId, pieces, lotMatieres, onReload }: {
  lotId: string; pieces: Piece[]; lotMatieres: Record<string, string>; onReload: () => void;
}) {
  const [matieres, setMatieres] = useState(lotMatieres);
  const [lotVerreInput, setLotVerreInput] = useState('');
  const [selectedPlaques, setSelectedPlaques] = useState<Set<number>>(new Set());

  const plaques = [...new Set(pieces.filter(p => p.plaque_no > 0).map(p => p.plaque_no))].sort((a, b) => a - b);
  const plaqueLots = new Map<number, string>();
  for (const p of pieces) {
    if (p.plaque_no > 0 && p.lot_verre) plaqueLots.set(p.plaque_no, p.lot_verre);
  }

  const saveMatieres = async () => {
    await patchJSON(`/api/production/lots/${lotId}/lot-matieres`, { matieres });
    onReload();
  };

  const saveLotVerre = async () => {
    if (selectedPlaques.size === 0 || !lotVerreInput) return;
    await patchJSON(`/api/production/lots/${lotId}/lot-verre`, { plaque_nos: [...selectedPlaques], lot_verre: lotVerreInput });
    setLotVerreInput('');
    setSelectedPlaques(new Set());
    onReload();
  };

  const togglePlaque = (n: number) => {
    setSelectedPlaques(prev => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n); else next.add(n);
      return next;
    });
  };

  const selectAllPlaques = () => {
    if (selectedPlaques.size === plaques.length) setSelectedPlaques(new Set());
    else setSelectedPlaques(new Set(plaques));
  };

  return (
    <div className="space-y-6">
      {/* Lot verre par plaque */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Lot verre par plaque</h4>
        <div className="flex items-center gap-3 mb-3">
          <input value={lotVerreInput} onChange={e => setLotVerreInput(e.target.value)}
            placeholder="N° lot verre fournisseur" className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white w-60 focus:border-blue-500 outline-none" />
          <button onClick={selectAllPlaques} className="text-xs text-gray-400 hover:text-white px-2 py-1 border border-[#2a2d35] rounded">
            {selectedPlaques.size === plaques.length ? 'Deselect' : 'Tout'}
          </button>
          <button onClick={saveLotVerre} disabled={selectedPlaques.size === 0 || !lotVerreInput}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded disabled:opacity-30 transition-colors">
            Appliquer aux {selectedPlaques.size} plaque(s)
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {plaques.map(n => {
            const lot = plaqueLots.get(n) || '';
            const mat = pieces.find(p => p.plaque_no === n)?.material || '';
            return (
              <button key={n} onClick={() => togglePlaque(n)}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  selectedPlaques.has(n) ? 'border-blue-500 bg-blue-500/10' : 'border-[#2a2d35] bg-[#181a20]'}`}>
                <div className="text-xs font-semibold text-white">Plaque {n}</div>
                <div className="text-[10px] text-gray-500">{mat}</div>
                {lot ? (
                  <div className="text-[10px] text-green-400 mt-1">Lot: {lot}</div>
                ) : (
                  <div className="text-[10px] text-red-400 mt-1">Pas de lot</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Matieres globales */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Matieres communes (tout le lot)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {MATIERES_GLOBALES.map(m => (
            <div key={m.key} className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35]">
              <label className="text-xs text-gray-400 block mb-1">{m.label}</label>
              <input value={matieres[m.key] || ''} onChange={e => setMatieres({ ...matieres, [m.key]: e.target.value })}
                placeholder="N° lot" className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-1.5 text-sm text-white w-full focus:border-blue-500 outline-none" />
            </div>
          ))}
        </div>
        <button onClick={saveMatieres} className="mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs rounded-lg transition-colors">
          Sauvegarder matieres
        </button>
      </div>
    </div>
  );
}
