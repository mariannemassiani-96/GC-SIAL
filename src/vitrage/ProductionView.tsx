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

interface Lot {
  id: string; reference: string; semaine: string; date_creation: string;
  commande_refs: string[]; total_pieces: number; total_we: number; statut: string;
  pieces?: Piece[]; we_pieces?: WEPiece[];
}

interface Piece {
  id: string; commande_ref: string; vitrage_ref: string; largeur: number; hauteur: number;
  composition: string; face: string; material: string; machine: string; plaque_no: number;
  statut: string; operateur: string; date_coupe: string | null; date_assemblage: string | null;
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
  const [semaine, setSemaine] = useState(getISOWeek(new Date()));
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'verre' | 'we' | 'stats'>('verre');
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <h2 className="text-xl font-bold text-amber-400">Production</h2>
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
          </div>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#2a2d35]">
            {(['verre', 'we', 'stats'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t
                  ? 'border-amber-500 text-amber-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
                {t === 'verre' ? `Verre (${pieces.length})` : t === 'we' ? `WE (${wePieces.length})` : 'Productivite'}
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
