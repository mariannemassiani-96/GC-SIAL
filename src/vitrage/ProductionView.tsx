import { useState, useEffect, useCallback } from 'react';
import { generateEtiquettesCE, generateEtiquettesAtelier, generateEtiquettesPostCoupe, generateEtiquettesWE } from './generateLabelsIndustrial';
import { generateLabelsA, generateLabelsB, generateLabelsC } from './generateLabels';
import type { Vitrage, WEGroupe } from './types';
import { DEFAULT_AVERY } from './types';
import { logProductionEvent } from '../api';

const API = import.meta.env.VITE_ISULA_API_URL as string || '';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

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

interface PrepItem { needed: number; ready: boolean; found?: number; nc_qty: number; nc_notes: string }

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
  id: string; commande_ref: string; vitrage_ref: string; vitrage_id: string; largeur: number; hauteur: number;
  composition: string; face: string; material: string; machine: string; plaque_no: number;
  lot_verre: string; statut: string; operateur: string; date_coupe: string | null; date_assemblage: string | null;
  notes: string;
}

interface WEPiece {
  id: string; barre_no: number; longueur: number; orig_dim: number; cote: string;
  vitrage_ref: string; epaisseur: number; couleur: string; statut: string; operateur: string;
}

interface LotProgress {
  id: string;
  reference: string;
  total_pieces: number;
  total_we: number;
  pieces: Record<string, number>;
  we: Record<string, number>;
}

interface Stats {
  pieces: Record<string, number>;
  we: Record<string, number>;
  daily_cuts: { jour: string; nb: number }[];
  daily_assemblies?: { jour: string; nb: number }[];
  lot_progress?: LotProgress[];
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

export function ProductionView({ onBack, startAtelier }: { onBack: () => void; startAtelier?: boolean }) {
  const [modeAtelier, setModeAtelier] = useState(startAtelier ?? false);
  const [poste, setPoste] = useState<'' | 'preparation' | 'lisec' | 'bottero' | 'we' | 'assemblage' | 'arefaire'>('');
  const [semaine, setSemaine] = useState(getISOWeek(new Date()));
  const [lots, setLots] = useState<Lot[]>([]);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'verre' | 'we' | 'optim_verre' | 'optim_we' | 'preparation' | 'lots' | 'etiquettes' | 'stats'>('dashboard');
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
    const piece = pieces.find(p => p.id === pieceId);
    const posteMap: Record<string, string> = { coupe: 'vitrage_coupe', assemble: 'vitrage_assemblage', nc: 'vitrage_coupe', casse: 'vitrage_coupe' };
    logProductionEvent({
      commande_ref: selectedLot?.reference || '',
      poste: posteMap[statut] || 'vitrage_coupe',
      action: statut,
      piece_ref: piece?.vitrage_ref || pieceId,
    }).catch(() => {});
    if (selectedLot) loadLotDetail(selectedLot);
    loadStats();
  };

  const updateWEStatut = async (pieceId: string, statut: string) => {
    await patchJSON(`/api/production/we/${pieceId}`, { statut, operateur: '' });
    const wePiece = (selectedLot?.we_pieces ?? []).find(p => p.id === pieceId);
    logProductionEvent({
      commande_ref: selectedLot?.reference || '',
      poste: 'vitrage_we',
      action: statut,
      piece_ref: wePiece?.vitrage_ref || pieceId,
    }).catch(() => {});
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
        loadLotDetail={loadLotDetail}
        selectedLot={selectedLot}
        setSelectedLot={setSelectedLot}
        onReload={() => { if (selectedLot) loadLotDetail(selectedLot); loadStats(); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <h2 className="text-xl font-bold text-amber-400">Production</h2>
        {(() => {
          const pendingCount = lots.filter(l => {
            const s = l.statut || 'en_preparation';
            return s === 'en_preparation' || s === 'en_coupe' || s === 'en_assemblage';
          }).length;
          return pendingCount > 0 ? (
            <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full animate-pulse">
              {pendingCount} validation{pendingCount > 1 ? 's' : ''} en attente
            </span>
          ) : null;
        })()}
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

          {/* Workflow validation */}
          <WorkflowBar lot={selectedLot} pieces={pieces} onReload={() => loadLotDetail(selectedLot)} />

          {/* Tabs */}
          <div className="flex gap-1 border-b border-[#2a2d35] flex-wrap">
            {([
              ['dashboard', 'Tableau de bord'],
              ['verre', `Verre (${pieces.length})`],
              ['we', `WE (${wePieces.length})`],
              ['optim_verre', 'Optim Verre'],
              ['optim_we', 'Optim WE'],
              ['preparation', 'Preparation'],
              ['lots', 'Lots matieres'],
              ['etiquettes', 'Etiquettes'],
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

          {/* Dashboard */}
          {tab === 'dashboard' && stats && (
            <DashboardTab stats={stats} semaine={semaine} />
          )}

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
            <OptimWETab weOptim={selectedLot.we_optim} />
          )}

          {tab === 'preparation' && selectedLot && (
            <PreparationTab lotId={selectedLot.id} pieces={pieces}
              savedPrep={selectedLot.preparation || {}} onReload={() => loadLotDetail(selectedLot)} />
          )}

          {tab === 'etiquettes' && selectedLot && (
            <EtiquettesTab pieces={pieces} wePieces={wePieces} lotRef={selectedLot.reference} weOptim={selectedLot.we_optim} />
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

// ── Workflow Validation Bar ──────────────────────────────────────────

const WORKFLOW_STEPS = [
  { id: 'en_preparation', label: 'Preparation', next: 'pret_coupe' },
  { id: 'pret_coupe', label: 'Pret a couper', next: 'en_coupe' },
  { id: 'en_coupe', label: 'En coupe', next: 'pret_assemblage' },
  { id: 'pret_assemblage', label: 'Pret assemblage', next: 'en_assemblage' },
  { id: 'en_assemblage', label: 'En assemblage', next: 'termine' },
  { id: 'termine', label: 'Termine', next: '' },
];

function WorkflowBar({ lot, pieces, onReload }: { lot: Lot; pieces: Piece[]; onReload: () => void }) {
  const statut = lot.statut || 'en_preparation';
  const currentStep = WORKFLOW_STEPS.findIndex(s => s.id === statut);
  const prep = lot.preparation || {};
  const allPrepReady = Object.values(prep).length > 0 && Object.values(prep).every((p: PrepItem) => p.ready);
  const allCut = pieces.length > 0 && pieces.every(p => p.statut === 'coupe' || p.statut === 'assemble');
  const allAssembled = pieces.length > 0 && pieces.every(p => p.statut === 'assemble');
  const hasNC = pieces.some(p => p.statut === 'nc' || p.statut === 'casse');

  const needsValidation = (
    (statut === 'en_preparation' && !allPrepReady) ||
    (statut === 'en_coupe' && !allCut && hasNC) ||
    (statut === 'en_assemblage' && !allAssembled && hasNC)
  );

  const canAdvance = (
    (statut === 'en_preparation' && allPrepReady) ||
    (statut === 'pret_coupe') ||
    (statut === 'en_coupe' && allCut) ||
    (statut === 'pret_assemblage') ||
    (statut === 'en_assemblage' && allAssembled)
  );

  const advance = async () => {
    const step = WORKFLOW_STEPS.find(s => s.id === statut);
    if (!step?.next) return;
    await patchJSON(`/api/production/lots/${lot.id}/statut`, { statut: step.next });
    onReload();
  };

  const forceValidate = async () => {
    const step = WORKFLOW_STEPS.find(s => s.id === statut);
    if (!step?.next) return;
    await patchJSON(`/api/production/lots/${lot.id}/statut`, { statut: step.next });
    onReload();
  };

  return (
    <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35]">
      <div className="flex items-center gap-1 mb-2">
        {WORKFLOW_STEPS.map((s, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex-1 h-2 rounded-full ${done ? 'bg-green-500' : active ? 'bg-amber-500' : 'bg-gray-700'}`} />
              {i < WORKFLOW_STEPS.length - 1 && <div className="w-1" />}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-bold text-white">{WORKFLOW_STEPS[currentStep]?.label || statut}</span>
          {needsValidation && <span className="ml-2 text-xs text-amber-400 font-bold animate-pulse">⚠ VALIDATION REQUISE</span>}
        </div>
        <div className="flex gap-2">
          {needsValidation && (
            <button onClick={forceValidate}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded transition-colors">
              FORCER VALIDATION (superviseur)
            </button>
          )}
          {canAdvance && String(statut) !== 'termine' && (
            <button onClick={advance}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded transition-colors">
              PASSER A L'ETAPE SUIVANTE →
            </button>
          )}
          {statut === 'termine' && <span className="text-green-400 text-sm font-bold">✓ LOT TERMINE</span>}
        </div>
      </div>
    </div>
  );
}

// ── Mode Atelier (plein écran tactile) ───────────────────────────────

function AtelierView({ lots, semaine, poste, onSelectPoste, onBack, loadLotDetail, selectedLot, setSelectedLot, onReload }: {
  lots: Lot[]; semaine: string; poste: '' | 'preparation' | 'lisec' | 'bottero' | 'we' | 'assemblage' | 'arefaire';
  onSelectPoste: (p: '' | 'preparation' | 'lisec' | 'bottero' | 'we' | 'assemblage' | 'arefaire') => void;
  onBack: () => void;
  loadLotDetail: (lot: Lot) => void; selectedLot: Lot | null;
  setSelectedLot: (l: Lot | null) => void;
  onReload: () => void;
}) {
  const [plateIdx, setPlateIdx] = useState(0);
  const [selectedMaterial, setSelectedMaterial] = useState<string | null>(null);
  const [editCompo, setEditCompo] = useState<{ pieceId: string; original: string; current: string } | null>(null);
  const [selectedPieceIdx, setSelectedPieceIdx] = useState<number | null>(null);

  if (!poste) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center gap-8 z-50">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-white text-lg px-4 py-2">← Bureau</button>
        <h1 className="text-4xl font-black text-white">ISULA VITRAGE</h1>
        <p className="text-xl text-gray-400">{semaine}</p>
        <div className="grid grid-cols-1 gap-6 w-full max-w-md px-8">
          {([['preparation', 'PREPARATION PLAQUES', 'bg-cyan-700 hover:bg-cyan-600'],
             ['lisec', 'COUPE LISEC', 'bg-blue-700 hover:bg-blue-600'],
             ['bottero', 'COUPE BOTTERO', 'bg-green-700 hover:bg-green-600'],
             ['we', 'COUPE INTERCALAIRE', 'bg-amber-700 hover:bg-amber-600'],
             ['assemblage', 'ASSEMBLAGE', 'bg-purple-700 hover:bg-purple-600'],
             ['arefaire', 'A REFAIRE', 'bg-red-700 hover:bg-red-600']] as const).map(([id, label, cls]) => (
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

  const wePieces = selectedLot.we_pieces ?? [];

  // ── Poste PREPARATION ──
  if (poste === 'preparation') {
    const plateCounts = new Map<string, Set<number>>();
    for (const p of pieces) {
      if (p.plaque_no > 0) {
        const set = plateCounts.get(p.material) || new Set();
        set.add(p.plaque_no);
        plateCounts.set(p.material, set);
      }
    }
    const materials = [...plateCounts.entries()].map(([mat, plaques]) => ({ material: mat, count: plaques.size }));
    const savedPrep = selectedLot.preparation || {};

    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Lots</button>
          <span className="text-xl font-bold text-white flex-1">{selectedLot.reference}</span>
          <span className="text-base text-cyan-400 font-bold">PREPARATION</span>
        </div>
        <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full">
          <h2 className="text-2xl font-black text-white mb-6">PLAQUES A PREPARER</h2>
          {materials.map(m => {
            const prep = savedPrep[m.material];
            const isReady = prep?.ready ?? false;
            const found = prep?.found ?? m.count;
            const isPartial = found < m.count;
            return (
              <div key={m.material} className={`p-5 rounded-2xl border mb-3 transition-colors ${
                isReady ? 'bg-green-900/20 border-green-500/30' : isPartial ? 'bg-amber-900/20 border-amber-500/30' : 'bg-[#181a20] border-[#2a2d35]'}`}>
                <div className="flex items-center gap-4">
                  <button onClick={async () => {
                    const newPrep = { ...savedPrep, [m.material]: { ...prep, needed: m.count, ready: !isReady, found: prep?.found ?? m.count, nc_qty: prep?.nc_qty ?? 0, nc_notes: prep?.nc_notes ?? '' } };
                    await patchJSON(`/api/production/lots/${selectedLot.id}/preparation`, { preparation: newPrep });
                    onReload();
                  }} className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-2xl transition-colors active:scale-90 shrink-0 ${
                    isReady ? 'bg-green-600 border-green-400 text-white' : 'bg-[#14161d] border-gray-600 text-gray-600'}`}>
                    {isReady ? '✓' : ''}
                  </button>
                  <div className="flex-1">
                    <div className="text-xl font-bold text-white">{m.material}</div>
                    <div className="text-sm text-gray-500">3210 x 2550</div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-sm">Trouvees:</span>
                      <button onClick={async () => {
                        const newFound = Math.max(0, (prep?.found ?? m.count) - 1);
                        const newPrep = { ...savedPrep, [m.material]: { ...prep, needed: m.count, found: newFound, ready: prep?.ready ?? false, nc_qty: prep?.nc_qty ?? 0, nc_notes: prep?.nc_notes ?? '' } };
                        await patchJSON(`/api/production/lots/${selectedLot.id}/preparation`, { preparation: newPrep });
                        onReload();
                      }} className="w-10 h-10 bg-[#14161d] border border-gray-600 rounded-lg text-white text-xl font-bold active:scale-90">−</button>
                      <span className={`text-2xl font-black min-w-[60px] text-center ${isPartial ? 'text-amber-400' : 'text-green-400'}`}>
                        {found}/{m.count}
                      </span>
                      <button onClick={async () => {
                        const newFound = Math.min(m.count, (prep?.found ?? m.count) + 1);
                        const newPrep = { ...savedPrep, [m.material]: { ...prep, needed: m.count, found: newFound, ready: prep?.ready ?? false, nc_qty: prep?.nc_qty ?? 0, nc_notes: prep?.nc_notes ?? '' } };
                        await patchJSON(`/api/production/lots/${selectedLot.id}/preparation`, { preparation: newPrep });
                        onReload();
                      }} className="w-10 h-10 bg-[#14161d] border border-gray-600 rounded-lg text-white text-xl font-bold active:scale-90">+</button>
                    </div>
                    {isPartial && <div className="text-amber-400 text-sm font-bold mt-1">INCOMPLET</div>}
                    {isReady && !isPartial && <div className="text-green-400 text-sm font-bold mt-1">PRET</div>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Poste COUPE WE ──
  if (poste === 'we') {
    if (wePieces.length === 0) {
      return (
        <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center z-50">
          <p className="text-gray-400 text-2xl mb-2">Aucune coupe intercalaire dans ce lot</p>
          <button onClick={() => setSelectedLot(null)} className="px-8 py-4 bg-gray-700 text-white text-lg rounded-xl active:scale-95">← Retour aux lots</button>
        </div>
      );
    }

    const barreLength = 6000;

    const epGroups = new Map<string, Map<number, WEPiece[]>>();
    for (const wp of wePieces) {
      const groupKey = `${wp.epaisseur}mm — ${wp.couleur}`;
      if (!epGroups.has(groupKey)) epGroups.set(groupKey, new Map());
      const barresMap = epGroups.get(groupKey)!;
      const arr = barresMap.get(wp.barre_no) || [];
      arr.push(wp);
      barresMap.set(wp.barre_no, arr);
    }

    return (
      <div className="fixed inset-0 bg-white flex flex-col z-50">
        <div className="flex items-center gap-4 p-3 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Lots</button>
          <span className="text-xl font-bold text-white flex-1">{selectedLot.reference}</span>
          <span className="text-base text-amber-400 font-bold">COUPE INTERCALAIRE — {wePieces.length} coupes</span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {[...epGroups.entries()].map(([groupLabel, barresMap]) => {
            const barreNos = [...barresMap.keys()].sort((a, b) => a - b);
            return (
            <div key={groupLabel} className="mb-8">
              <div className="flex items-center gap-4 mb-3 border-b-2 border-gray-300 pb-2">
                <div className="text-lg font-black text-gray-800">{groupLabel}</div>
                <div className="text-base text-gray-500">Qte {barreNos.length} barres</div>
              </div>

              {barreNos.map(no => {
                const pcs = barresMap.get(no) || [];
                const used = pcs.reduce((s, p) => s + p.longueur, 0);
                const chute = barreLength - used;
                const allDone = pcs.every(p => p.statut === 'coupe');

                return (
                  <div key={no} className="flex items-center gap-3 mb-2">
                    <div className="text-sm font-mono text-gray-500 w-12 text-right shrink-0">{barreLength}</div>
                    <div className="flex-1 flex items-center h-12 bg-gray-100 border border-gray-400 rounded overflow-hidden relative">
                      {pcs.map((wp) => {
                        const pct = (wp.longueur / barreLength) * 100;
                        const ref = wp.vitrage_ref.replace(/^[^_]*_/, '').substring(0, 8);
                        return (
                          <div key={wp.id} className={`h-full border-r-2 border-white flex flex-col items-center justify-center cursor-pointer transition-colors ${
                            wp.statut === 'coupe' ? 'bg-blue-600' : 'bg-blue-800 hover:bg-blue-700'}`}
                            style={{ width: `${pct}%`, minWidth: 30 }}
                            onClick={async () => {
                              if (wp.statut !== 'coupe') {
                                await patchJSON(`/api/production/we/${wp.id}`, { statut: 'coupe', operateur: '' });
                                logProductionEvent({ commande_ref: selectedLot?.reference || '', poste: 'vitrage_we', action: 'coupe', piece_ref: wp.vitrage_ref }).catch(() => {});
                                onReload();
                              }
                            }}>
                            <span className="text-[10px] text-white font-bold leading-tight truncate px-0.5">{ref}-{wp.cote}</span>
                            <span className="text-xs text-blue-200 font-mono leading-tight">{wp.longueur}</span>
                          </div>
                        );
                      })}
                      {chute > 0 && (
                        <div className="h-full bg-yellow-400 flex items-center justify-center"
                          style={{ width: `${(chute / barreLength) * 100}%`, minWidth: 20 }}>
                          <span className="text-[10px] text-yellow-800 font-mono">{chute}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-sm font-mono text-gray-600 w-12 shrink-0">{chute}</div>
                    {allDone ? (
                      <span className="text-green-600 font-bold text-lg w-8 shrink-0">✓</span>
                    ) : (
                      <button onClick={async () => {
                        for (const wp of pcs) {
                          if (wp.statut !== 'coupe') {
                            await patchJSON(`/api/production/we/${wp.id}`, { statut: 'coupe', operateur: '' });
                            logProductionEvent({ commande_ref: selectedLot?.reference || '', poste: 'vitrage_we', action: 'coupe', piece_ref: wp.vitrage_ref }).catch(() => {});
                          }
                        }
                        onReload();
                      }} className="px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded active:scale-95 shrink-0">
                        OK
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Poste ASSEMBLAGE ──
  if (poste === 'assemblage') {
    return (
      <AssemblageView
        selectedLot={selectedLot}
        pieces={pieces}
        onReload={onReload}
        setSelectedLot={setSelectedLot}
      />
    );
  }

  // ── Poste A REFAIRE ──
  if (poste === 'arefaire') {
    const ncPieces = pieces.filter(p => p.statut === 'nc' || p.statut === 'casse');
    const ncWe = wePieces.filter(p => p.statut === 'nc');

    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Lots</button>
          <span className="text-xl font-bold text-white flex-1">{selectedLot.reference}</span>
          <span className="text-lg text-red-400 font-bold">{ncPieces.length + ncWe.length} A REFAIRE</span>
        </div>
        <div className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
          {ncPieces.length === 0 && ncWe.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-green-400 text-4xl mb-4">✓</div>
              <div className="text-2xl text-white font-bold">AUCUNE PIECE A REFAIRE</div>
              <div className="text-gray-500 text-lg mt-2">Tout est conforme</div>
            </div>
          ) : (
            <>
              {ncPieces.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-red-400 mb-3">VERRES ({ncPieces.length})</h3>
                  <div className="space-y-2">
                    {ncPieces.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-4 bg-red-900/20 rounded-xl border border-red-500/30">
                        <div className="flex-1">
                          <div className="text-lg font-bold text-white">{p.vitrage_ref}</div>
                          <div className="text-base text-gray-400">{p.face} — {p.material} — {p.largeur}x{p.hauteur}</div>
                          <div className="text-sm text-gray-500">{p.commande_ref} — Plaque {p.plaque_no}</div>
                          {p.notes && <div className="text-sm text-purple-400 mt-1">↳ {p.notes}</div>}
                          <div className="text-xs text-red-400 font-bold mt-1">
                            {p.statut === 'nc' ? 'NON CONFORME' : 'CASSE'}
                            {p.date_coupe && ` — ${new Date(p.date_coupe).toLocaleDateString('fr-FR')}`}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={async () => { await patchJSON(`/api/production/pieces/${p.id}`, { statut: 'a_couper' }); onReload(); }}
                            className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded-xl active:scale-95">
                            REMETTRE A COUPER
                          </button>
                          <button onClick={async () => { await patchJSON(`/api/production/pieces/${p.id}`, { statut: 'coupe' }); onReload(); }}
                            className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm font-bold rounded-xl active:scale-95">
                            DEJA RECOUPE
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {ncWe.length > 0 && (
                <div>
                  <h3 className="text-xl font-bold text-red-400 mb-3">INTERCALAIRES ({ncWe.length})</h3>
                  <div className="space-y-2">
                    {ncWe.map(p => (
                      <div key={p.id} className="flex items-center gap-4 p-4 bg-red-900/20 rounded-xl border border-red-500/30">
                        <div className="flex-1">
                          <div className="text-lg font-bold text-white">{p.vitrage_ref}</div>
                          <div className="text-base text-gray-400">Barre {p.barre_no} — {p.longueur}mm — {p.cote}</div>
                        </div>
                        <button onClick={async () => { await patchJSON(`/api/production/we/${p.id}`, { statut: 'a_couper' }); onReload(); }}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-bold rounded-xl active:scale-95">
                          REMETTRE A COUPER
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Construire toutes les plaques (postes LISEC/BOTTERO) ──
  const glassOptim = selectedLot.glass_optim || [];
  const allPlatesRaw: OptimPlate[] = [];
  for (const r of glassOptim) {
    for (const p of (r.plates || [])) {
      const raw = p as unknown as Record<string, unknown>;
      allPlatesRaw.push({
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

  const materialGroups = new Map<string, number>();
  for (const p of allPlatesRaw) {
    materialGroups.set(p.material, (materialGroups.get(p.material) || 0) + 1);
  }

  // ── Écran choix matériau ──
  if (!selectedMaterial) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Lots</button>
          <span className="text-xl font-bold text-white flex-1">{selectedLot.reference}</span>
          <span className="text-base text-amber-400 font-mono">{poste.toUpperCase()}</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-2xl font-black text-white text-center mb-8">PAR QUELLE COMPOSITION COMMENCER ?</h2>
          <div className="space-y-4 max-w-lg mx-auto">
            {[...materialGroups.entries()].map(([mat, count]) => {
              const pcsForMat = pieces.filter(p => p.material === mat);
              const donePcs = pcsForMat.filter(p => p.statut === 'coupe' || p.statut === 'assemble').length;
              const progress = pcsForMat.length > 0 ? Math.round(donePcs / pcsForMat.length * 100) : 0;
              return (
                <button key={mat} onClick={() => { setSelectedMaterial(mat); setPlateIdx(0); }}
                  className="w-full p-6 bg-[#181a20] rounded-2xl border border-[#2a2d35] hover:border-blue-500 transition-colors text-left active:scale-[0.98]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl font-bold text-white">{mat}</div>
                      <div className="text-lg text-gray-400 mt-1">{count} plaque{count > 1 ? 's' : ''}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${progress === 100 ? 'text-green-400' : progress > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                        {progress}%
                      </div>
                      <div className="text-sm text-gray-500">{donePcs}/{pcsForMat.length} pcs</div>
                    </div>
                  </div>
                  {progress > 0 && progress < 100 && (
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                  )}
                  {progress === 100 && (
                    <div className="mt-2 text-green-400 text-lg font-bold">✓ TERMINE</div>
                  )}
                </button>
              );
            })}
            <button onClick={() => { setSelectedMaterial('__ALL__'); setPlateIdx(0); }}
              className="w-full p-5 bg-blue-900/30 rounded-2xl border border-blue-500/30 hover:border-blue-400 text-center transition-colors active:scale-[0.98]">
              <div className="text-xl font-bold text-blue-400">TOUTES LES COMPOSITIONS</div>
              <div className="text-base text-gray-500">{allPlatesRaw.length} plaques au total</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Filtrer plaques par matériau sélectionné ──
  const allPlates = selectedMaterial === '__ALL__' ? allPlatesRaw : allPlatesRaw.filter(p => p.material === selectedMaterial);

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
        logProductionEvent({
          commande_ref: selectedLot?.reference || '',
          poste: 'vitrage_coupe',
          action: 'coupe',
          piece_ref: p.vitrage_ref,
        }).catch(() => {});
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
        <button onClick={() => { setSelectedMaterial(null); setPlateIdx(0); }} className="text-gray-400 hover:text-white text-base px-3 py-2">← Compositions</button>
        <span className="text-lg font-bold text-white">{selectedLot.reference}</span>
        <span className="text-base text-blue-400 font-bold flex-1">{selectedMaterial === '__ALL__' ? 'TOUTES' : selectedMaterial}</span>
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

          {/* SVG plaque — pièces cliquables */}
          <div className="bg-white rounded-xl p-3 w-full max-w-xl">
            <svg viewBox={`0 0 ${w + pad * 2} ${h + pad * 2}`} className="w-full" style={{ maxHeight: '30vh' }}>
              <rect x={pad} y={pad} width={w} height={h} fill="#FFD700" stroke="#000" strokeWidth={1.5} />
              {plate.pieces.map((p, i) => {
                const pw = (p.rotated ? p.height : p.width) * scale;
                const ph = (p.rotated ? p.width : p.height) * scale;
                const rx = pad + p.x * scale;
                const ry = pad + p.y * scale;
                const dbP = piecesOnPlate[i];
                const isNC = dbP?.statut === 'nc' || dbP?.statut === 'casse';
                const isSel = selectedPieceIdx === i;
                const fillColor = isNC ? '#991111' : isSel ? '#4488FF' : ['#0000CC', '#2244AA', '#0033BB', '#1155CC'][i % 4];
                const fs = Math.min(12, pw / 8, ph / 3);
                return (
                  <g key={i} onClick={() => setSelectedPieceIdx(isSel ? null : i)} style={{ cursor: 'pointer' }}>
                    <rect x={rx} y={ry} width={pw} height={ph} fill={fillColor}
                      stroke={isSel ? '#fff' : '#FFD700'} strokeWidth={isSel ? 3 : 2} />
                    <text x={rx + pw / 2} y={ry + ph / 2} textAnchor="middle" dominantBaseline="middle"
                      fill={isNC ? '#ff6666' : '#FFD700'} fontSize={Math.max(fs, 6)} fontWeight="bold">
                      {isNC ? '✕' : i + 1}
                    </text>
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

          {/* Pièce sélectionnée — actions */}
          {selectedPieceIdx !== null && (() => {
            const p = plate.pieces[selectedPieceIdx];
            if (!p) return null;
            const dbPiece = piecesOnPlate[selectedPieceIdx];
            const effW = p.rotated ? p.height : p.width;
            const effH = p.rotated ? p.width : p.height;
            const isNC = dbPiece?.statut === 'nc' || dbPiece?.statut === 'casse';
            return (
              <div className="w-full max-w-xl bg-[#181a20] rounded-xl p-4 border border-blue-500/50">
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-2xl font-black text-amber-400">{selectedPieceIdx + 1}</span>
                  <div className="flex-1">
                    <div className="text-lg font-bold text-white">{p.vitrageRef}</div>
                    <div className="text-base text-gray-400">{p.face} — {p.material} — {effW} x {effH}</div>
                  </div>
                  <button onClick={() => setSelectedPieceIdx(null)} className="text-gray-500 hover:text-white text-xl px-2">✕</button>
                </div>
                {isNC && dbPiece ? (
                  <div>
                    <div className="text-red-400 text-xl font-bold text-center py-2 mb-3">⚠ {dbPiece.statut === 'nc' ? 'NON CONFORME' : 'CASSE'} — A REFAIRE</div>
                    <div className="flex gap-3 justify-center">
                      <button onClick={async () => { await patchJSON(`/api/production/pieces/${dbPiece.id}`, { statut: 'a_couper', operateur: '' }); setSelectedPieceIdx(null); onReload(); }}
                        className="px-5 py-3 bg-green-700 hover:bg-green-600 text-white text-base font-bold rounded-xl active:scale-95">
                        REMETTRE OK
                      </button>
                      <button onClick={async () => { await patchJSON(`/api/production/pieces/${dbPiece.id}`, { statut: 'coupe', operateur: '' }); setSelectedPieceIdx(null); onReload(); }}
                        className="px-5 py-3 bg-cyan-700 hover:bg-cyan-600 text-white text-base font-bold rounded-xl active:scale-95">
                        DEJA RECOUPE
                      </button>
                    </div>
                  </div>
                ) : dbPiece ? (
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => { setEditCompo({ pieceId: dbPiece.id, original: dbPiece.material, current: dbPiece.material }); }}
                      className="px-5 py-3 bg-purple-700 hover:bg-purple-600 text-white text-base font-bold rounded-xl active:scale-95">
                      CHANGER COMPO
                    </button>
                    <button onClick={async () => {
                      await patchJSON(`/api/production/pieces/${dbPiece.id}`, { statut: 'nc', operateur: '' });
                      logProductionEvent({ commande_ref: selectedLot?.reference || '', poste: 'vitrage_coupe', action: 'nc', piece_ref: p.vitrageRef }).catch(() => {});
                      setSelectedPieceIdx(null); onReload();
                    }}
                      className="px-5 py-3 bg-red-700 hover:bg-red-600 text-white text-base font-bold rounded-xl active:scale-95">
                      NON CONFORME
                    </button>
                    <button onClick={async () => {
                      await patchJSON(`/api/production/pieces/${dbPiece.id}`, { statut: 'casse', operateur: '' });
                      logProductionEvent({ commande_ref: selectedLot?.reference || '', poste: 'vitrage_coupe', action: 'casse', piece_ref: p.vitrageRef }).catch(() => {});
                      setSelectedPieceIdx(null); onReload();
                    }}
                      className="px-5 py-3 bg-orange-700 hover:bg-orange-600 text-white text-base font-bold rounded-xl active:scale-95">
                      CASSE
                    </button>
                  </div>
                ) : (
                  <div className="text-gray-500 text-center">Piece non trouvee en base</div>
                )}
                {dbPiece?.notes && <div className="text-purple-400 text-sm mt-2 text-center">↳ {dbPiece.notes}</div>}
              </div>
            );
          })()}

          {/* Liste résumée des pièces */}
          {selectedPieceIdx === null && (
            <div className="w-full max-w-xl text-sm text-gray-400 text-center">
              Cliquez sur une piece dans le plan pour la selectionner
            </div>
          )}
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

      {/* Modale changement composition */}
      {editCompo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]" onClick={() => setEditCompo(null)}>
          <div className="bg-[#181a20] rounded-2xl p-6 w-full max-w-md mx-4 border border-[#2a2d35]" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Changer la composition</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Materiau original</div>
              <div className="text-lg text-gray-500 line-through">{editCompo.original}</div>
            </div>
            <div className="mb-4">
              <label className="text-sm text-gray-400 block mb-1">Nouveau materiau</label>
              <input value={editCompo.current} onChange={e => setEditCompo({ ...editCompo, current: e.target.value })}
                className="w-full bg-[#14161d] border border-[#2a2d35] rounded-xl px-4 py-3 text-lg text-white focus:border-purple-500 outline-none"
                placeholder="Ex: 6 FE 1.1" />
            </div>
            <div className="flex gap-3">
              <button onClick={async () => {
                const note = `Compo changee: ${editCompo.original} → ${editCompo.current}`;
                await patchJSON(`/api/production/pieces/${editCompo.pieceId}`, {
                  material: editCompo.current, composition: editCompo.current, notes: note,
                });
                setEditCompo(null);
                onReload();
              }} className="flex-1 py-4 bg-purple-600 hover:bg-purple-500 text-white text-lg font-bold rounded-xl active:scale-95">
                Valider
              </button>
              <button onClick={() => setEditCompo(null)}
                className="px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white text-lg rounded-xl active:scale-95">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Dashboard Tab ───────────────────────────────────────────────────

function DashboardTab({ stats, semaine }: { stats: Stats; semaine: string }) {
  const totalPieces = Object.values(stats.pieces).reduce((a, b) => a + b, 0);
  const cutPieces = (stats.pieces['coupe'] || 0) + (stats.pieces['assemble'] || 0) + (stats.pieces['a_assembler'] || 0);
  const assembledPieces = stats.pieces['assemble'] || 0;
  const totalWE = Object.values(stats.we).reduce((a, b) => a + b, 0);
  const cutWE = stats.we['coupe'] || 0;
  const ncPieces = (stats.pieces['nc'] || 0) + (stats.pieces['casse'] || 0);
  const overallProgress = totalPieces > 0 ? Math.round((assembledPieces / totalPieces) * 100) : 0;

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-bold text-white">Tableau de bord - {semaine}</h4>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-3xl font-black text-blue-400">{totalPieces}</div>
          <div className="text-xs text-gray-500">Pieces totales</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-3xl font-black text-cyan-400">{cutPieces}</div>
          <div className="text-xs text-gray-500">Coupees</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-3xl font-black text-green-400">{assembledPieces}</div>
          <div className="text-xs text-gray-500">Assemblees</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-3xl font-black text-amber-400">{overallProgress}%</div>
          <div className="text-xs text-gray-500">Progression</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-2xl font-bold text-amber-400">{totalWE}</div>
          <div className="text-xs text-gray-500">WE total</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-2xl font-bold text-green-400">{cutWE}</div>
          <div className="text-xs text-gray-500">WE coupes</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
          <div className="text-2xl font-bold text-red-400">{ncPieces}</div>
          <div className="text-xs text-gray-500">NC / Casse</div>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Progression globale</span>
          <span className="text-sm font-bold text-white">{overallProgress}%</span>
        </div>
        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{
            width: `${overallProgress}%`,
            background: overallProgress === 100 ? '#22c55e' : overallProgress > 50 ? '#eab308' : '#3b82f6',
          }} />
        </div>
      </div>

      {/* Per-lot progress */}
      {stats.lot_progress && stats.lot_progress.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Progression par lot</h4>
          <div className="space-y-3">
            {stats.lot_progress.map(lot => {
              const lotTotal = Object.values(lot.pieces).reduce((a, b) => a + b, 0);
              const lotCut = (lot.pieces['coupe'] || 0) + (lot.pieces['assemble'] || 0) + (lot.pieces['a_assembler'] || 0);
              const lotAssembled = lot.pieces['assemble'] || 0;
              const lotNC = (lot.pieces['nc'] || 0) + (lot.pieces['casse'] || 0);
              const pctCut = lotTotal > 0 ? Math.round((lotCut / lotTotal) * 100) : 0;
              const pctAssembled = lotTotal > 0 ? Math.round((lotAssembled / lotTotal) * 100) : 0;
              return (
                <div key={lot.id} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{lot.reference}</span>
                    <div className="flex gap-4 text-xs">
                      <span className="text-gray-400">{lotTotal} pcs</span>
                      {lotNC > 0 && <span className="text-red-400">{lotNC} NC/Casse</span>}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16">Coupe</span>
                      <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${pctCut}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-10 text-right">{pctCut}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 w-16">Assemble</span>
                      <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pctAssembled}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-400 w-10 text-right">{pctAssembled}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Daily statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Coupes par jour</h4>
          {stats.daily_cuts.length > 0 ? (
            <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
              <div className="flex items-end gap-1 h-28">
                {stats.daily_cuts.map((d, i) => {
                  const max = Math.max(...stats.daily_cuts.map(x => x.nb));
                  const h = max > 0 ? (d.nb / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-white">{d.nb}</span>
                      <div className="w-full bg-cyan-500/60 rounded-t" style={{ height: `${h}%` }} />
                      <span className="text-[8px] text-gray-500">{String(d.jour).slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Aucune coupe enregistree.</p>
          )}
        </div>
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Assemblages par jour</h4>
          {stats.daily_assemblies && stats.daily_assemblies.length > 0 ? (
            <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
              <div className="flex items-end gap-1 h-28">
                {stats.daily_assemblies.map((d, i) => {
                  const max = Math.max(...(stats.daily_assemblies || []).map(x => x.nb));
                  const h = max > 0 ? (d.nb / max) * 100 : 0;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-[9px] text-white">{d.nb}</span>
                      <div className="w-full bg-green-500/60 rounded-t" style={{ height: `${h}%` }} />
                      <span className="text-[8px] text-gray-500">{String(d.jour).slice(5)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">Aucun assemblage enregistre.</p>
          )}
        </div>
      </div>
    </div>
  );
}


// ── Assemblage View (Atelier) ──────────────────────────────────────

const MATIERES_JOUR_KEYS = [
  { key: 'intercalaire', label: 'Intercalaire / WE' },
  { key: 'dessiccant', label: 'Dessiccant' },
  { key: 'masticButyl', label: 'Mastic butyl' },
  { key: 'masticPU', label: 'Mastic PU' },
  { key: 'gazArgon', label: 'Gaz argon' },
] as const;

function getLocalStorageMatieresKey(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `isula_matieres_jour_${today}`;
}

function loadMatieresJour(): Record<string, string> {
  try {
    const raw = localStorage.getItem(getLocalStorageMatieresKey());
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveMatieresJour(matieres: Record<string, string>) {
  localStorage.setItem(getLocalStorageMatieresKey(), JSON.stringify(matieres));
}

function AssemblageView({ selectedLot, pieces, onReload, setSelectedLot }: {
  selectedLot: Lot;
  pieces: Piece[];
  onReload: () => void;
  setSelectedLot: (l: Lot | null) => void;
}) {
  const [matieresJour, setMatieresJour] = useState<Record<string, string>>(loadMatieresJour);
  const [showMatieres, setShowMatieres] = useState(false);

  const updateMatiere = (key: string, value: string) => {
    const updated = { ...matieresJour, [key]: value };
    setMatieresJour(updated);
    saveMatieresJour(updated);
  };

  const hasAllMatieres = MATIERES_JOUR_KEYS.every(m => matieresJour[m.key]?.trim());

  const vitrageGroups = new Map<string, Piece[]>();
  for (const p of pieces) {
    const key = p.vitrage_id || `${p.vitrage_ref}_${p.id}`;
    const arr = vitrageGroups.get(key) || [];
    arr.push(p);
    vitrageGroups.set(key, arr);
  }

  const vitrages = [...vitrageGroups.entries()].map(([vid, pcs]) => {
    const allAssembled = pcs.every(p => p.statut === 'assemble');
    const allCut = pcs.every(p => p.statut === 'coupe' || p.statut === 'assemble');
    return { ref: pcs[0]?.vitrage_ref || vid, pieces: pcs, allAssembled, allCut, commande: pcs[0]?.commande_ref || '' };
  });

  const totalVitrages = vitrages.length;
  const doneVitrages = vitrages.filter(v => v.allAssembled).length;

  const handleAssemble = async (vitragePieces: Piece[]) => {
    // Save lot_matieres on the lot if we have daily materials
    if (hasAllMatieres) {
      await patchJSON(`/api/production/lots/${selectedLot.id}/lot-matieres`, { matieres: matieresJour });
    }
    // Mark pieces as assembled
    for (const p of vitragePieces) {
      if (p.statut !== 'assemble') {
        await patchJSON(`/api/production/pieces/${p.id}`, { statut: 'assemble', operateur: '' });
        logProductionEvent({
          commande_ref: selectedLot.reference || '',
          poste: 'vitrage_assemblage',
          action: 'assemble',
          piece_ref: p.vitrage_ref,
        }).catch(() => {});
      }
    }
    onReload();
  };

  return (
    <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
      <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
        <button onClick={() => setSelectedLot(null)} className="text-gray-400 hover:text-white text-lg px-3 py-2">← Lots</button>
        <span className="text-xl font-bold text-white flex-1">{selectedLot.reference}</span>
        <span className="text-lg text-purple-400 font-bold">{doneVitrages}/{totalVitrages} assembles</span>
      </div>
      <div className="flex-1 overflow-auto p-4 max-w-2xl mx-auto w-full">
        {/* Matieres du jour section */}
        <div className="mb-4">
          <button onClick={() => setShowMatieres(!showMatieres)}
            className={`w-full p-3 rounded-xl border text-left transition-colors ${
              hasAllMatieres ? 'bg-green-900/20 border-green-500/30' : 'bg-amber-900/20 border-amber-500/30'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-base font-bold text-white">MATIERES DU JOUR</span>
                <span className="text-xs text-gray-400 ml-2">{new Date().toLocaleDateString('fr-FR')}</span>
              </div>
              <div className="flex items-center gap-2">
                {hasAllMatieres ? (
                  <span className="text-green-400 text-sm font-bold">COMPLET</span>
                ) : (
                  <span className="text-amber-400 text-sm font-bold">A REMPLIR</span>
                )}
                <span className="text-gray-500">{showMatieres ? '▲' : '▼'}</span>
              </div>
            </div>
          </button>
          {showMatieres && (
            <div className="mt-2 bg-[#181a20] rounded-xl border border-[#2a2d35] p-4 space-y-3">
              {MATIERES_JOUR_KEYS.map(m => (
                <div key={m.key} className="flex items-center gap-3">
                  <label className="text-sm text-gray-400 w-32 shrink-0">{m.label}</label>
                  <input
                    value={matieresJour[m.key] || ''}
                    onChange={e => updateMatiere(m.key, e.target.value)}
                    placeholder="N° lot"
                    className="flex-1 bg-[#14161d] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none"
                  />
                  {matieresJour[m.key]?.trim() && <span className="text-green-400 text-lg">OK</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <h2 className="text-2xl font-black text-white mb-4">VITRAGES A ASSEMBLER</h2>
        <div className="space-y-2">
          {vitrages.map(v => (
            <div key={v.ref} className={`p-4 rounded-xl border transition-colors ${
              v.allAssembled ? 'bg-green-900/20 border-green-500/30' :
              v.allCut ? 'bg-[#181a20] border-amber-500/30' : 'bg-[#181a20] border-[#2a2d35] opacity-50'}`}>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-lg font-bold text-white">{v.ref}</div>
                  <div className="text-sm text-gray-400">{v.commande} — {v.pieces.length} verres ({v.pieces.map(p => p.face).join('+')})</div>
                  <div className="text-xs text-gray-500">
                    {v.pieces.map(p => `${p.material} ${p.largeur}x${p.hauteur}`).join(' + ')}
                  </div>
                </div>
                {v.allAssembled ? (
                  <span className="text-green-400 text-2xl font-bold">ASSEMBLE</span>
                ) : v.allCut ? (
                  <button onClick={() => handleAssemble(v.pieces)}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white text-base font-bold rounded-xl active:scale-95 shadow-lg">
                    ASSEMBLER
                  </button>
                ) : (
                  <span className="text-gray-500 text-sm">Verres non coupes</span>
                )}
              </div>
            </div>
          ))}
        </div>
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
        logProductionEvent({
          commande_ref: p.commande_ref || '',
          poste: 'vitrage_coupe',
          action: 'coupe',
          piece_ref: p.vitrage_ref,
        }).catch(() => {});
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


// ── Etiquettes Tab ──────────────────────────────────────────────────

function EtiquettesTab({ pieces, wePieces, lotRef, weOptim }: {
  pieces: Piece[]; wePieces: WEPiece[]; lotRef: string; weOptim?: unknown[];
}) {
  const [generating, setGenerating] = useState(false);

  const vitragesFromPieces = (): Vitrage[] => {
    const grouped = new Map<string, Piece[]>();
    for (const p of pieces) {
      const key = p.vitrage_id || p.id;
      const arr = grouped.get(key) || [];
      arr.push(p);
      grouped.set(key, arr);
    }
    return [...grouped.values()].map(pcs => {
      const ext = pcs.find(p => p.face === 'EXT');
      const int = pcs.find(p => p.face === 'INT');
      const p = ext || int || pcs[0];
      return {
        id: p.vitrage_id || p.id,
        reference: p.vitrage_ref,
        variante: 'V1' as const,
        largeur: p.largeur,
        hauteur: p.hauteur,
        composition: p.composition || `${ext?.material || ''} / ${int?.material || ''}`,
        intercalaireEpaisseur: 10,
        intercalaireCouleur: '012 Noir',
        outerGlass: ext?.material || '',
        innerGlass: int?.material || '',
        ug: '', gazType: 'Argon',
      };
    });
  };

  const cmdInfo = {
    id: '', reference: lotRef, client: '', dateCreation: new Date().toISOString().slice(0, 10),
    semaineFabrication: '', semaineLivraison: '', statut: 'en_cours' as const,
    vitrages: [] as Vitrage[],
    lotFabrication: { verreExt: '', verreInt: '', intercalaire: '', dessiccant: '', masticButyl: '', masticPU: '', gazArgon: '', notes: '' },
    notes: '',
  };

  const gen = async (type: string) => {
    setGenerating(true);
    try {
      const vitrages = vitragesFromPieces();
      const label = lotRef.replace(/[^a-zA-Z0-9_-]/g, '_');
      switch (type) {
        case 'A': download(await generateLabelsA(vitrages, lotRef, DEFAULT_AVERY), `${label}_avery_A.pdf`); break;
        case 'B': download(await generateLabelsB(vitrages, lotRef, DEFAULT_AVERY), `${label}_avery_B.pdf`); break;
        case 'C': download(await generateLabelsC(vitrages, [], lotRef, DEFAULT_AVERY), `${label}_avery_C.pdf`); break;
        case 'CE': download(await generateEtiquettesCE(vitrages, cmdInfo), `${label}_CE.pdf`); break;
        case 'ATELIER': download(await generateEtiquettesAtelier(vitrages, cmdInfo), `${label}_atelier.pdf`); break;
        case 'POST_COUPE': download(await generateEtiquettesPostCoupe(vitrages, [], lotRef), `${label}_post_coupe.pdf`); break;
        case 'WE': download(await generateEtiquettesWE(weOptim as WEGroupe[] || [], lotRef), `${label}_WE.pdf`); break;
      }
    } catch (err) { alert(`Erreur: ${err}`); }
    setGenerating(false);
  };

  const buttons = [
    { id: 'A', label: 'Avery A', desc: 'Ref + compo + dimensions', color: 'bg-gray-700 hover:bg-gray-600' },
    { id: 'B', label: 'Avery B', desc: 'Ref + QR code', color: 'bg-gray-700 hover:bg-gray-600' },
    { id: 'C', label: 'Avery C', desc: 'Ref + plaque + face', color: 'bg-gray-700 hover:bg-gray-600' },
    { id: 'CE', label: 'CE / CEKAL', desc: 'Conformite + tracabilite', color: 'bg-blue-700 hover:bg-blue-600' },
    { id: 'ATELIER', label: 'Atelier + Checklist', desc: 'Fiche suiveuse par vitrage', color: 'bg-green-700 hover:bg-green-600' },
    { id: 'POST_COUPE', label: 'Post-coupe', desc: 'Etiquette apres decoupe', color: 'bg-amber-700 hover:bg-amber-600' },
    { id: 'WE', label: 'Warm Edge', desc: 'Etiquettes intercalaires', color: 'bg-purple-700 hover:bg-purple-600' },
  ];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-300">Etiquettes du lot {lotRef}</h4>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {buttons.map(b => (
          <button key={b.id} onClick={() => gen(b.id)} disabled={generating}
            className={`${b.color} text-white p-4 rounded-lg text-left transition-colors disabled:opacity-50 active:scale-95`}>
            <div className="text-sm font-bold">{b.label}</div>
            <div className="text-xs text-white/70 mt-1">{b.desc}</div>
            <div className="text-xs text-white/50 mt-1">
              {b.id === 'WE' ? `${wePieces.length} coupes` : `${pieces.length / 2} vitrages`}
            </div>
          </button>
        ))}
      </div>
      {generating && <p className="text-amber-400 text-sm">Generation en cours...</p>}
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

// ── WE Optimization Tab (linear bar visualization) ────────────────────

interface WEOptimGroup {
  epaisseur: number;
  couleur: string;
  barres: {
    numero: number;
    pieces: { longueur: number; origDim: number; cote: string; vitrageRef: string }[];
    utilise: number;
    chute: number;
  }[];
  totalPieces: number;
  totalBarres: number;
  tauxUtilisation: number;
  chuteTotal: number;
}

function OptimWETab({ weOptim }: { weOptim?: unknown[] }) {
  if (!weOptim || weOptim.length === 0) {
    return <p className="text-gray-500 text-sm">Donnees WE non disponibles pour ce lot.</p>;
  }

  const groups = weOptim as WEOptimGroup[];
  const barreLength = 6000;

  return (
    <div className="space-y-6">
      {groups.map((g, gi) => (
        <div key={gi} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <span className="text-amber-400 font-bold text-sm">
                WE {g.epaisseur}mm — {g.couleur || 'Standard'}
              </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>{g.totalPieces} pieces</span>
              <span>{g.totalBarres} barres</span>
              <span className="text-green-400 font-semibold">{(g.tauxUtilisation || 0).toFixed(0)}% utilisation</span>
              <span className="text-red-400">Chute: {(g.chuteTotal || 0).toFixed(0)}mm</span>
            </div>
          </div>
          <div className="space-y-2">
            {g.barres.map((barre, bi) => {
              const scale = 100 / barreLength;
              return (
                <div key={bi} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-12 text-right shrink-0">B{barre.numero}</span>
                  <div className="flex-1 relative h-7 bg-gray-800 rounded overflow-hidden border border-[#2a2d35]">
                    {(() => {
                      let cursor = 0;
                      const colors = ['bg-blue-600', 'bg-cyan-600', 'bg-teal-600', 'bg-indigo-600', 'bg-violet-600', 'bg-sky-600'];
                      return barre.pieces.map((p, pi) => {
                        const w = p.longueur * scale;
                        const x = cursor * scale;
                        cursor += p.longueur + 5;
                        return (
                          <div key={pi} className={`absolute top-0 h-full ${colors[pi % colors.length]} border-r border-gray-900`}
                            style={{ left: `${x}%`, width: `${Math.max(w, 0.5)}%` }}
                            title={`${p.vitrageRef} — ${p.longueur}mm (${p.cote === 'court' ? 'C' : 'L'})`}>
                            {w > 5 && (
                              <span className="text-[8px] text-white px-0.5 truncate block leading-7">
                                {p.longueur}
                              </span>
                            )}
                          </div>
                        );
                      });
                    })()}
                    {barre.chute > 0 && (
                      <div className="absolute top-0 right-0 h-full bg-red-900/40 border-l border-red-500/30"
                        style={{ width: `${barre.chute * scale}%` }}>
                        {barre.chute * scale > 4 && (
                          <span className="text-[8px] text-red-400 px-1 leading-7 block text-right">
                            {barre.chute}mm
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500 w-14 shrink-0">
                    {barre.pieces.length} pcs
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
