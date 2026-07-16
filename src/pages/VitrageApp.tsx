import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  Commande, Vitrage, AverySettings, WESettings, GlassSettings,
  CommandeStatut, WEGroupe, GlassOptimResult, OptimizedPlate,
} from '../vitrage/types';
import {
  EMPTY_LOT, DEFAULT_AVERY, DEFAULT_WE, DEFAULT_GLASS, STATUT_LABELS, STATUT_COLORS,
} from '../vitrage/types';
import { parseVitrageSpec } from '../vitrage/parseVitrageSpec';
import { parseExcelFile, parseCSVText, parseDocxFile, type ParseResult } from '../vitrage/parseExcel';
import { parseODTFile } from '../vitrage/parseODT';
import { optimizeWE } from '../vitrage/optimizeWE';
import { optimizeGlass, extractGlassPieces } from '../vitrage/optimize2D';
import { hasBackend, apiOptimize, apiExportDXF, apiExportOPT, apiLabelsZPL } from '../vitrage/api';
import { optimizeCarts, sequenceCuttingRuns, type CutPieceForCart, type CartOptimResult } from '../vitrage/cartOptimizer';
import { generateCartSheetPDF, generateRemnantLabelsPDF } from '../vitrage/generateCartPDF';
import { generateLabelsA, generateLabelsB, generateLabelsC } from '../vitrage/generateLabels';
import { ProductionView } from '../vitrage/ProductionView';
import { generateFicheWE } from '../vitrage/generateFicheWE';
import { generateEtiquettesCE, generateEtiquettesAtelier, generateEtiquettesPostCoupe, generateEtiquettesWE } from '../vitrage/generateLabelsIndustrial';
import { generateOptimVerrePDF } from '../vitrage/generateOptimPDF';
import {
  fetchCommandes, insertCommande, patchCommande, removeCommande,
  fetchSettings, saveSettings, type Settings,
  fetchGlassProducts, upsertGlassProduct, deleteGlassProduct,
  fetchStockPlates, upsertStockPlate, deleteStockPlate,
  fetchStockRemnants, upsertStockRemnant, deleteStockRemnant, patchStockRemnant,
} from '../vitrage/store';
import { patchCommandeModule, upsertCommandeGlobale, listCommandesGlobales, type CommandeGlobale, type ModuleStatus } from '../api';
import type { GlassProduct, StockPlate, StockRemnant, Vitrage as VitrageType } from '../vitrage/types';
import { v4 as uuid } from 'uuid';

/** Shape of the vitrage JSONB column when populated with import data */
interface VitrageModuleData extends ModuleStatus {
  vitrages?: VitrageType[];
  fileName?: string;
}

function getISOWeek(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  const weekNum = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return `S${String(weekNum).padStart(2, '0')}-${d.getFullYear()}`;
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function syncVitrageToGlobal(commande: Commande) {
  const ref = commande.reference.trim();
  if (!ref) return;
  patchCommandeModule(ref, 'vitrage', {
    statut: commande.statut === 'terminee' ? 'termine' : commande.statut === 'en_cours' ? 'en_cours' : 'attente',
    total: commande.vitrages.length, fait: 0, nc: 0,
  }).catch(() => {});
  upsertCommandeGlobale(ref, {
    client: (commande.client || '').trim(), chantier: (commande.client || '').trim(),
    semaine_fab: commande.semaineFabrication || '', semaine_liv: commande.semaineLivraison || '',
  }).catch(() => {});
}

// ── Dashboard ────────────────────────────────────────────────────────

function Dashboard({ commandes, onSelect, onDelete, onBatch, onImportGlobal }: {
  commandes: Commande[];
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onBatch: (ids: string[]) => void;
  onImportGlobal: (globalCmd: CommandeGlobale) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtre, setFiltre] = useState<CommandeStatut | 'all'>('all');
  const [globalCommandes, setGlobalCommandes] = useState<CommandeGlobale[]>([]);
  const [loadingGlobal, setLoadingGlobal] = useState(true);
  const [importingRef, setImportingRef] = useState<string | null>(null);

  const stats = useMemo(() => {
    const s = { total: commandes.length, en_attente: 0, en_cours: 0, terminee: 0, livree: 0, totalVitrages: 0 };
    for (const c of commandes) { s[c.statut]++; s.totalVitrages += c.vitrages.length; }
    return s;
  }, [commandes]);

  // Load global commandes with vitrage data
  useEffect(() => {
    (async () => {
      try {
        const all = await listCommandesGlobales();
        setGlobalCommandes(all.filter(c => {
          const v = c.vitrage as VitrageModuleData | undefined;
          return v?.vitrages && v.vitrages.length > 0;
        }));
      } catch { /* silent */ }
      setLoadingGlobal(false);
    })();
  }, [commandes]); // refresh when local commandes change (after import)

  // Which global commandes are already imported locally?
  const importedRefs = useMemo(() => new Set(commandes.map(c => c.reference.trim())), [commandes]);

  const handleImportGlobal = async (gc: CommandeGlobale) => {
    setImportingRef(gc.ref);
    try {
      await onImportGlobal(gc);
    } finally {
      setImportingRef(null);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === commandes.length) setSelected(new Set());
    else setSelected(new Set(commandes.map(c => c.id)));
  };

  const selectedVitrages = commandes.filter(c => selected.has(c.id)).reduce((s, c) => s + c.vitrages.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Commandes</h2>
        <div className="flex items-center gap-3">
          {selected.size >= 1 && (
            <button onClick={() => onBatch([...selected])}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm rounded-lg transition-colors">
              Envoyer en coupe ({selected.size} cmd — {selectedVitrages} vitrages)
            </button>
          )}
        </div>
      </div>

      {/* Info banner: commands are created in the global dashboard */}
      <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-lg p-4 flex items-center gap-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400 shrink-0">
          <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
        </svg>
        <p className="text-sm text-indigo-300">
          Les commandes sont creees dans le <span className="font-semibold">Tableau de Bord</span>. Les commandes avec vitrages importes apparaissent ci-dessous.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-white' },
          { label: 'En attente', value: stats.en_attente, color: 'text-gray-400' },
          { label: 'En cours', value: stats.en_cours, color: 'text-blue-400' },
          { label: 'Terminees', value: stats.terminee, color: 'text-green-400' },
          { label: 'Vitrages', value: stats.totalVitrages, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Global commands with vitrage data — bridge section */}
      {!loadingGlobal && globalCommandes.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-indigo-400">Commandes globales avec vitrages</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {globalCommandes.map(gc => {
              const vData = gc.vitrage as VitrageModuleData;
              const count = vData.vitrages?.length ?? 0;
              const isImported = importedRefs.has(gc.ref.trim());
              const isImporting = importingRef === gc.ref;
              return (
                <div key={gc.ref} className={`bg-[#181a20] rounded-lg p-4 border ${isImported ? 'border-green-500/30' : 'border-indigo-500/30'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-mono font-bold text-white">{gc.ref}</span>
                    {isImported && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/30">Importe</span>}
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{gc.client || gc.chantier || '—'}</div>
                  <div className="text-xs text-blue-400 mb-2">{count} vitrage{count > 1 ? 's' : ''}{vData.fileName ? ` — ${vData.fileName}` : ''}</div>
                  {gc.semaine_fab && <span className="text-[10px] text-violet-400 mr-2">Fab {gc.semaine_fab}</span>}
                  {gc.semaine_liv && <span className="text-[10px] text-emerald-400">Liv {gc.semaine_liv}</span>}
                  <div className="mt-3">
                    {isImported ? (
                      <button onClick={() => {
                        const local = commandes.find(c => c.reference.trim() === gc.ref.trim());
                        if (local) onSelect(local.id);
                      }} className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded-lg transition-colors w-full">
                        Ouvrir la commande
                      </button>
                    ) : (
                      <button onClick={() => handleImportGlobal(gc)} disabled={isImporting}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition-colors w-full disabled:opacity-50">
                        {isImporting ? 'Import en cours...' : 'Importer dans ISULA VITRAGE'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {loadingGlobal && (
        <p className="text-xs text-gray-500">Chargement des commandes globales...</p>
      )}

      {/* Filtre statut */}
      <div className="flex gap-2">
        {(['all', 'en_attente', 'en_cours', 'terminee', 'livree'] as const).map(s => (
          <button key={s} onClick={() => setFiltre(s)}
            className={`text-xs px-3 py-1 rounded transition-colors ${filtre === s
              ? 'bg-blue-600 text-white' : 'bg-[#181a20] text-gray-400 hover:text-white border border-[#2a2d35]'}`}>
            {s === 'all' ? 'Toutes' : STATUT_LABELS[s]} ({s === 'all' ? commandes.length : commandes.filter(c => c.statut === s).length})
          </button>
        ))}
      </div>

      {commandes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">Aucune commande importee. Utilisez le Tableau de Bord pour creer des commandes, puis importez-les ici.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#2a2d35] text-xs">
                <th className="text-left py-2 px-2 w-8">
                  <input type="checkbox" checked={selected.size === commandes.length && commandes.length > 0}
                    onChange={toggleAll} className="accent-amber-500" />
                </th>
                <th className="text-left py-2 px-3">Reference</th>
                <th className="text-left py-2 px-3">Client</th>
                <th className="text-left py-2 px-2">Fab.</th>
                <th className="text-left py-2 px-2">Livr.</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-right py-2 px-3">Vitrages</th>
                <th className="text-right py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...commandes]
                .filter(c => filtre === 'all' || c.statut === filtre)
                .sort((a, b) => b.dateCreation.localeCompare(a.dateCreation))
                .map(c => (
                <tr key={c.id} className={`border-b border-[#1e2028] hover:bg-[#1e2028] cursor-pointer ${selected.has(c.id) ? 'bg-amber-600/10' : ''}`}
                  onClick={() => onSelect(c.id)}>
                  <td className="py-2.5 px-2" onClick={e => toggleSelect(c.id, e)}>
                    <input type="checkbox" checked={selected.has(c.id)} readOnly className="accent-amber-500" />
                  </td>
                  <td className="py-2.5 px-3 text-white font-mono">{c.reference}</td>
                  <td className="py-2.5 px-3 text-gray-300">{c.client}</td>
                  <td className="py-2.5 px-2 text-xs text-blue-400">{c.semaineFabrication || '—'}</td>
                  <td className="py-2.5 px-2 text-xs text-green-400">{c.semaineLivraison || '—'}</td>
                  <td className="py-2.5 px-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUT_COLORS[c.statut]}`}>
                      {STATUT_LABELS[c.statut]}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right text-white">{c.vitrages.length}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={e => { e.stopPropagation(); onDelete(c.id); }}
                      className="text-red-500/50 hover:text-red-400 text-xs">Suppr.</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Backend-aware optimization hook ──────────────────────────────────

function mapBackendResults(raw: Record<string, unknown>[]): GlassOptimResult[] {
  return raw.map((r: Record<string, unknown>) => ({
    material: r.material as string,
    plates: ((r.plates as Record<string, unknown>[]) ?? []).map((p: Record<string, unknown>, i: number) => ({
      numero: (p.numero as number) ?? i + 1,
      material: (p.material as string) ?? '',
      plateWidth: (p.plateWidth ?? p.plate_width ?? 3210) as number,
      plateHeight: (p.plateHeight ?? p.plate_height ?? 2550) as number,
      pieces: ((p.pieces as Record<string, unknown>[]) ?? []).map((pc: Record<string, unknown>) => ({
        vitrageId: (pc.vitrageId ?? pc.vitrage_id ?? pc.id ?? '') as string,
        vitrageRef: (pc.vitrageRef ?? pc.vitrage_ref ?? '') as string,
        width: (pc.width ?? 0) as number,
        height: (pc.height ?? 0) as number,
        material: (pc.material ?? '') as string,
        face: (pc.face ?? 'EXT') as 'EXT' | 'INT',
        noRotation: (pc.noRotation ?? pc.no_rotation ?? false) as boolean,
        x: (pc.x ?? 0) as number,
        y: (pc.y ?? 0) as number,
        rotated: (pc.rotated ?? false) as boolean,
      })),
      utilisation: (p.utilisation ?? 0) as number,
      remnants: ((p.remnants as Record<string, unknown>[]) ?? []).map((rem: Record<string, unknown>) => ({
        x: (rem.x ?? 0) as number, y: (rem.y ?? 0) as number,
        w: (rem.w ?? 0) as number, h: (rem.h ?? 0) as number,
        classe: (rem.classe ?? 'poussiere') as 'poussiere' | 'interdit' | 'surveiller' | 'stockable',
      })),
      hasInterdit: (p.hasInterdit ?? p.has_interdit ?? p.has_forbidden ?? false) as boolean,
    })),
    totalPlates: (r.totalPlates ?? r.total_plates ?? 0) as number,
    totalPieces: (r.totalPieces ?? r.total_pieces ?? 0) as number,
    tauxUtilisation: (r.tauxUtilisation ?? r.utilisation ?? 0) as number,
  }));
}

function useOptimization(vitrages: Vitrage[], glass: GlassSettings) {
  const [glassResult, setGlassResult] = useState<GlassOptimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [backend, setBackend] = useState(false);

  useEffect(() => {
    if (vitrages.length === 0) { setGlassResult([]); return; }
    let cancelled = false;

    async function run() {
      setLoading(true);
      if (hasBackend) {
        try {
          const pieces = extractGlassPieces(vitrages).map(p => ({
            id: p.vitrageId,
            vitrage_ref: p.vitrageRef,
            width: p.width,
            height: p.height,
            material: p.material,
            face: p.face,
            no_rotation: p.noRotation,
          }));
          const resp = await apiOptimize({
            pieces,
            plate_width: glass.plateWidth,
            plate_height: glass.plateHeight,
            edge_margin: glass.edgeTrimMargin ?? 15,
            cutting_gap: glass.cuttingGap,
            algorithm: 'staged_dp',
            machine: glass.machine || 'lisec',
          });
          if (!cancelled) {
            setGlassResult(mapBackendResults(resp.results as Record<string, unknown>[]));
            setBackend(true);
          }
          setLoading(false);
          return;
        } catch (err) {
          console.warn('Backend optimizer failed, using local:', err);
        }
      }
      if (!cancelled) {
        let remnants: import('../vitrage/optimize2D').RemnantInput[] = [];
        try {
          const stockRemnants = await fetchStockRemnants();
          remnants = stockRemnants
            .filter(r => (r as unknown as Record<string, string>).statut === 'disponible' || !(r as unknown as Record<string, string>).statut)
            .map(r => ({ id: r.id, glass_code: r.glass_code, width: r.width, height: r.height }));
        } catch { /* no remnants available */ }
        setGlassResult(optimizeGlass(vitrages, glass, remnants));
        setBackend(false);
      }
      setLoading(false);
    }

    run();
    return () => { cancelled = true; };
  }, [vitrages, glass]);

  return { glassResult, loading, backend };
}

// ── Order Detail ─────────────────────────────────────────────────────

const TABS = ['Import', 'Vitrages', 'Etiquettes', 'Tracabilite'] as const;

function OrderDetail({ commande, onUpdate, onBack }: {
  commande: Commande;
  onUpdate: (patch: Partial<Commande>) => void;
  onBack: () => void;
}) {
  const [tab, setTab] = useState(0);
  const [importedOptim, setImportedOptim] = useState<GlassOptimResult[]>([]);
  const c = commande;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <input value={c.reference} onChange={e => onUpdate({ reference: e.target.value })}
          className="bg-transparent text-xl font-bold text-white border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 outline-none px-1" />
        <input value={c.client} onChange={e => onUpdate({ client: e.target.value })}
          placeholder="Client" className="bg-transparent text-sm text-gray-300 border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 outline-none px-1 w-48" />
        <select value={c.statut} onChange={e => onUpdate({ statut: e.target.value as CommandeStatut })}
          className="bg-[#181a20] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
          {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{c.vitrages.length} vitrages — {c.dateCreation}</span>
      </div>
      <div className="flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Sem. fabrication :</span>
          <input value={c.semaineFabrication ?? ''} onChange={e => onUpdate({ semaineFabrication: e.target.value })}
            placeholder={getISOWeek(new Date())} className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-white w-24" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Sem. livraison :</span>
          <input value={c.semaineLivraison ?? ''} onChange={e => onUpdate({ semaineLivraison: e.target.value })}
            placeholder={getISOWeek(new Date())} className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-white w-24" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#2a2d35]">
        {TABS.map((label, i) => (
          <button key={label} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 ${i === tab
              ? 'border-blue-500 text-blue-400 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{label}</button>
        ))}
      </div>

      {tab === 0 && <TabImport vitrages={c.vitrages} onUpdate={v => onUpdate({ vitrages: v })} onSetRef={ref => onUpdate({ reference: ref })} onImportOptim={setImportedOptim} chantier={c.client} />}
      {tab === 1 && <TabVitrages vitrages={c.vitrages} onUpdate={v => onUpdate({ vitrages: v })} />}
      {tab === 2 && <TabEtiquettesCommande vitrages={c.vitrages} commandeLabel={`${c.reference} — ${c.client}`} importedPlates={importedOptim.flatMap(g => g.plates)} />}
      {tab === 3 && <TabTracabilite commandeRef={c.reference} />}
    </div>
  );
}

// ── Tab: Import ──────────────────────────────────────────────────────

function TabImport({ vitrages, onUpdate, onSetRef, onImportOptim, chantier }: {
  vitrages: Vitrage[];
  onUpdate: (v: Vitrage[]) => void;
  onSetRef?: (ref: string) => void;
  onImportOptim?: (results: GlassOptimResult[]) => void;
  chantier?: string;
}) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResult = (result: ParseResult, fileName: string, optimResults?: GlassOptimResult[]) => {
    const cols = Object.entries(result.columnsDetected);
    const colInfo = cols.length > 0
      ? cols.map(([f, h]) => `${f}="${h}"`).join(', ')
      : 'Aucune colonne reconnue';

    const headersInfo = result.allHeaders.length > 0
      ? `\nColonnes dans le fichier : ${result.allHeaders.join(' | ')}`
      : '';

    if (result.vitrages.length > 0) {
      onUpdate([...vitrages, ...result.vitrages]);
      if (result.lotInfo && onSetRef) onSetRef(result.lotInfo);

      let optimInfo = '';
      if (optimResults && optimResults.length > 0 && onImportOptim) {
        onImportOptim(optimResults);
        const totalPlates = optimResults.reduce((s, r) => s + r.totalPlates, 0);
        const totalPieces = optimResults.reduce((s, r) => s + r.totalPieces, 0);
        optimInfo = `\nOptimisation Pro2D importee : ${totalPlates} plaques, ${totalPieces} pieces`;
      }

      setInfo(`${fileName} : ${result.vitrages.length} vitrages importes (${result.totalRows} lignes, ${result.skippedRows} ignorees). Colonnes : ${colInfo}${result.lotInfo ? `\nLot : ${result.lotInfo}` : ''}${optimInfo}`);
      setError('');
    } else {
      setError(`${fileName} : aucun vitrage detecte sur ${result.totalRows} lignes.\nColonnes reconnues : ${colInfo}${headersInfo}\n\nLe parser cherche des colonnes comme : Reference/Proto/Repere, Largeur/L, Hauteur/H, Dimensions (LxH), Composition/Vitrage, Couleur/Intercalaire, Qte`);
      setInfo('');
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true); setError(''); setInfo('');
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let result: ParseResult;
      let optimResults: GlassOptimResult[] | undefined;

      if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const text = await file.text();
        result = parseCSVText(text);
      } else if (ext === 'odt') {
        const odtResult = await parseODTFile(file, chantier);
        result = odtResult;
        optimResults = odtResult.optimResults;
      } else if (ext === 'docx') {
        result = await parseDocxFile(file, chantier);
      } else {
        result = await parseExcelFile(file, chantier);
      }
      handleResult(result, file.name, optimResults);
    } catch (err) {
      setError(`Erreur lecture ${file.name} : ${err}`);
    }
    setLoading(false);
    e.target.value = '';
  };

  const addEmpty = () => {
    onUpdate([...vitrages, {
      id: uuid(), reference: '', variante: 'V1', largeur: 0, hauteur: 0,
      composition: '', intercalaireEpaisseur: 10, intercalaireCouleur: '012 (Noir)',
      outerGlass: '', innerGlass: '', ug: '', gazType: 'Argon',
    }]);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors">
          <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt,.docx,.odt" onChange={handleFile} className="hidden" />
<div className="text-blue-400 text-sm font-semibold">Import Excel / CSV / ODT</div>
          <div className="text-xs text-gray-500 mt-1">.xlsx, .xls, .csv, .tsv, .docx, .odt</div>
        </label>
        <button onClick={addEmpty}
          className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/50 transition-colors">
          <div className="text-amber-400 text-sm font-semibold">+ Ajouter manuellement</div>
        </button>
      </div>
      {loading && <div className="text-blue-400 text-sm">Import en cours...</div>}
      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-xs whitespace-pre-wrap">{error}</div>}
      {info && <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-green-400 text-xs">{info}</div>}
      <div className="text-sm text-gray-400">{vitrages.length} vitrage(s) charges</div>
      {vitrages.length > 0 && (
        <button onClick={() => onUpdate([])} className="text-xs text-red-400 hover:text-red-300">Tout effacer</button>
      )}
    </div>
  );
}

// ── Tab: Vitrages table ──────────────────────────────────────────────

function TabVitrages({ vitrages, onUpdate }: { vitrages: Vitrage[]; onUpdate: (v: Vitrage[]) => void }) {
  const updateRow = (id: string, field: keyof Vitrage, value: string | number) => {
    onUpdate(vitrages.map(v => {
      if (v.id !== id) return v;
      const u = { ...v, [field]: value };
      if (field === 'composition' && typeof value === 'string') {
        const p = parseVitrageSpec(value);
        u.outerGlass = p.outer; u.innerGlass = p.inner; u.intercalaireEpaisseur = p.epaisseur;
      }
      return u;
    }));
  };

  if (vitrages.length === 0) return <p className="text-gray-500 text-sm">Aucun vitrage — utilisez l'onglet Import.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-400 border-b border-[#2a2d35]">
            <th className="text-left py-2 px-1">Reference</th>
            <th className="text-left py-2 px-1 w-12">V</th>
            <th className="text-right py-2 px-1 w-16">L</th>
            <th className="text-right py-2 px-1 w-16">H</th>
            <th className="text-left py-2 px-1">Composition</th>
            <th className="text-left py-2 px-1">Couleur WE</th>
            <th className="text-left py-2 px-1 w-20">EXT</th>
            <th className="text-left py-2 px-1 w-20">INT</th>
            <th className="w-8"></th>
          </tr>
        </thead>
        <tbody>
          {vitrages.map(v => (
            <tr key={v.id} className="border-b border-[#1e2028] hover:bg-[#1e2028]">
              <td className="py-1 px-1"><input value={v.reference} onChange={e => updateRow(v.id, 'reference', e.target.value)} className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" /></td>
              <td className="py-1 px-1">
                <select value={v.variante} onChange={e => updateRow(v.id, 'variante', e.target.value)} className="bg-[#181a20] border border-[#2a2d35] rounded text-white text-xs px-1 py-0.5">
                  <option value="V1">V1</option><option value="V2">V2</option>
                </select>
              </td>
              <td className="py-1 px-1"><input type="number" value={v.largeur || ''} onChange={e => updateRow(v.id, 'largeur', parseInt(e.target.value) || 0)} className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white text-right outline-none" /></td>
              <td className="py-1 px-1"><input type="number" value={v.hauteur || ''} onChange={e => updateRow(v.id, 'hauteur', parseInt(e.target.value) || 0)} className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white text-right outline-none" /></td>
              <td className="py-1 px-1"><input value={v.composition} onChange={e => updateRow(v.id, 'composition', e.target.value)} className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" /></td>
              <td className="py-1 px-1"><input value={v.intercalaireCouleur} onChange={e => updateRow(v.id, 'intercalaireCouleur', e.target.value)} className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" /></td>
              <td className="py-1 px-1 text-red-400 text-[11px]">{v.outerGlass}</td>
              <td className="py-1 px-1 text-blue-400 text-[11px]">{v.innerGlass}</td>
              <td className="py-1 px-1"><button onClick={() => onUpdate(vitrages.filter(x => x.id !== v.id))} className="text-red-500 hover:text-red-300">x</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Tracabilite ────────────────────────────────────────────────

interface TracaPiece {
  id: string;
  commande_ref: string;
  vitrage_ref: string;
  vitrage_id: string;
  face: string;
  material: string;
  largeur: number;
  hauteur: number;
  lot_verre: string;
  date_coupe: string | null;
  date_assemblage: string | null;
  lot_reference: string;
  lot_matieres: Record<string, string> | null;
}

function TabEtiquettesCommande({ vitrages, commandeLabel, importedPlates }: { vitrages: Vitrage[]; commandeLabel: string; importedPlates?: OptimizedPlate[] }) {
  const [generating, setGenerating] = useState(false);
  const plates = importedPlates ?? [];

  const gen = async (type: string) => {
    if (vitrages.length === 0) { alert('Aucun vitrage a imprimer'); return; }
    setGenerating(true);
    try {
      const label = commandeLabel.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cmd = {
        id: '', reference: commandeLabel, client: '', dateCreation: '', semaineFabrication: '', semaineLivraison: '',
        statut: 'en_cours' as const, vitrages, lotFabrication: EMPTY_LOT, notes: '',
      };
      switch (type) {
        case 'A': download(await generateLabelsA(vitrages, commandeLabel, DEFAULT_AVERY), `${label}_A.pdf`); break;
        case 'B': download(await generateLabelsB(vitrages, commandeLabel, DEFAULT_AVERY), `${label}_B.pdf`); break;
        case 'C': download(await generateLabelsC(vitrages, plates, commandeLabel, DEFAULT_AVERY), `${label}_C.pdf`); break;
        case 'CE': download(await generateEtiquettesCE(vitrages, cmd), `${label}_CE.pdf`); break;
        case 'ATELIER': download(await generateEtiquettesAtelier(vitrages, cmd), `${label}_atelier.pdf`); break;
      }
    } catch (err) { alert(`Erreur: ${err}`); }
    setGenerating(false);
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-300">Etiquettes — {vitrages.length} vitrages</h4>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { id: 'A', label: 'Avery A', desc: 'Ref + compo + dimensions', color: 'bg-gray-700 hover:bg-gray-600' },
          { id: 'B', label: 'Avery B', desc: 'Ref + QR code', color: 'bg-gray-700 hover:bg-gray-600' },
          { id: 'C', label: 'Avery C', desc: plates.length > 0 ? `Ref + plaque + face (${plates.length} plaques Pro2D)` : 'Ref + plaque + face', color: plates.length > 0 ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600' },
          { id: 'CE', label: 'CE / CEKAL', desc: 'Conformite + tracabilite', color: 'bg-blue-700 hover:bg-blue-600' },
          { id: 'ATELIER', label: 'Atelier + Checklist', desc: 'Fiche suiveuse', color: 'bg-green-700 hover:bg-green-600' },
        ].map(b => (
          <button key={b.id} onClick={() => gen(b.id)} disabled={generating}
            className={`${b.color} text-white p-4 rounded-lg text-left transition-colors disabled:opacity-50 active:scale-95`}>
            <div className="text-sm font-bold">{b.label}</div>
            <div className="text-xs text-white/70 mt-1">{b.desc}</div>
          </button>
        ))}
      </div>
      {generating && <p className="text-amber-400 text-sm">Generation en cours...</p>}
    </div>
  );
}

function TabTracabilite({ commandeRef }: { commandeRef: string }) {
  const [pieces, setPieces] = useState<TracaPiece[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!commandeRef) return;
    setLoading(true);
    setError('');
    const API_URL = import.meta.env.VITE_ISULA_API_URL as string || '';
    fetch(`${API_URL}/api/production/pieces/by-commande/${encodeURIComponent(commandeRef)}`)
      .then(res => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json();
      })
      .then((data: TracaPiece[]) => setPieces(data))
      .catch(err => setError(`Erreur: ${err.message}`))
      .finally(() => setLoading(false));
  }, [commandeRef]);

  if (loading) return <p className="text-blue-400 text-sm">Chargement de la tracabilite...</p>;
  if (error) return <p className="text-red-400 text-sm">{error}</p>;
  if (pieces.length === 0) return <p className="text-gray-500 text-sm">Aucune donnee de production pour cette commande. La commande doit etre dans un lot de production.</p>;

  // Group by vitrage
  const vitrageMap = new Map<string, TracaPiece[]>();
  for (const p of pieces) {
    const key = p.vitrage_id || p.vitrage_ref;
    const arr = vitrageMap.get(key) || [];
    arr.push(p);
    vitrageMap.set(key, arr);
  }

  // Get lot_matieres from first piece that has it
  const lotMatieres = pieces.find(p => p.lot_matieres)?.lot_matieres || null;

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-300">Tracabilite - {commandeRef}</h4>

      {lotMatieres && Object.keys(lotMatieres).length > 0 && (
        <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
          <div className="text-xs font-semibold text-gray-400 mb-2">Matieres du lot</div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.entries(lotMatieres).map(([key, val]) => (
              <div key={key} className="text-xs">
                <span className="text-gray-500">{key}: </span>
                <span className="text-white">{val || '-'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-[#2a2d35]">
              <th className="text-left py-2 px-2">Vitrage</th>
              <th className="text-left py-2 px-2">Face</th>
              <th className="text-left py-2 px-2">Materiau</th>
              <th className="text-right py-2 px-2">Dimensions</th>
              <th className="text-left py-2 px-2">Lot verre</th>
              <th className="text-left py-2 px-2">Date coupe</th>
              <th className="text-left py-2 px-2">Date assemblage</th>
              <th className="text-left py-2 px-2">Lot production</th>
            </tr>
          </thead>
          <tbody>
            {[...vitrageMap.entries()].map(([, pcs]) =>
              pcs.map((p, i) => (
                <tr key={p.id} className={`border-b border-[#1e2028] ${i === 0 && pcs.length > 1 ? '' : ''}`}>
                  {i === 0 && (
                    <td rowSpan={pcs.length} className="py-1.5 px-2 text-white font-semibold align-top">
                      {p.vitrage_ref}
                    </td>
                  )}
                  <td className={`py-1.5 px-2 ${p.face === 'EXT' ? 'text-red-400' : 'text-blue-400'}`}>{p.face}</td>
                  <td className="py-1.5 px-2 text-gray-300">{p.material}</td>
                  <td className="py-1.5 px-2 text-white text-right">{p.largeur}x{p.hauteur}</td>
                  <td className="py-1.5 px-2 text-green-400">{p.lot_verre || '-'}</td>
                  <td className="py-1.5 px-2 text-gray-300">
                    {p.date_coupe ? new Date(p.date_coupe).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-gray-300">
                    {p.date_assemblage ? new Date(p.date_assemblage).toLocaleDateString('fr-FR') : '-'}
                  </td>
                  {i === 0 && (
                    <td rowSpan={pcs.length} className="py-1.5 px-2 text-gray-400 align-top">{p.lot_reference}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Tab: Glass Optimization ──────────────────────────────────────────

function TabGlass({ results, loading, backend, commandeLabel }: { results: GlassOptimResult[]; loading?: boolean; backend?: boolean; commandeLabel?: string }) {
  if (loading) return <p className="text-blue-400 text-sm">Optimisation en cours...</p>;
  if (results.length === 0) return <p className="text-gray-500 text-sm">Importez des vitrages pour voir l'optimisation.</p>;

  const totalInterdit = results.reduce((s, r) => s + r.plates.filter(p => p.hasInterdit).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500/30 border border-green-500/50" /> Stockable (&gt;300mm)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-500/30 border border-amber-500/50" /> Surveiller (250-300)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500/30 border border-red-500/50" /> Interdit (50-250)</span>
          {totalInterdit > 0 && <span className="text-red-400 font-semibold ml-4">{totalInterdit} plaque(s) avec chutes interdites</span>}
          {backend && <span className="text-green-400 text-[10px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">Guillotine DP (serveur)</span>}
          {!backend && <span className="text-gray-500 text-[10px] px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/20">JS local</span>}
        </div>
        <button onClick={async () => { const blob = await generateOptimVerrePDF(results, commandeLabel || ''); download(blob, 'optimisation_verre.pdf'); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded transition-colors flex items-center gap-2">
          🖨 Imprimer PDF
        </button>
      </div>
      {results.map((r, i) => (
        <div key={i} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-amber-400">{r.material}</span>
            <span className="text-xs text-gray-400">{r.totalPieces} pcs / {r.totalPlates} plaques / {r.tauxUtilisation.toFixed(1)}%</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {r.plates.map(plate => (
              <PlatePreview key={plate.numero} plate={plate} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PlatePreview({ plate }: { plate: OptimizedPlate }) {
  const pad = 30;
  const inner = 200;
  const scale = inner / Math.max(plate.plateWidth, plate.plateHeight);
  const w = plate.plateWidth * scale;
  const h = plate.plateHeight * scale;
  const vw = w + pad * 2;
  const vh = h + pad * 2;

  return (
    <div className={`bg-white rounded p-2 ${plate.hasInterdit ? 'border border-red-500' : 'border border-gray-300'}`}>
      <div className="text-xs text-gray-700 mb-1 font-medium">
        {(plate as unknown as Record<string, boolean>).isRemnant && <span className="text-green-600 font-bold mr-1">CHUTE</span>}
        Plaque {plate.numero} — {plate.plateWidth}x{plate.plateHeight} — <span className="text-blue-700 font-bold">{plate.utilisation.toFixed(0)}%</span> — {plate.pieces.length} pcs
      </div>
      <svg viewBox={`0 0 ${vw} ${vh}`} className="w-full" style={{ maxHeight: 180 }}>
        <rect x={pad} y={pad} width={w} height={h} fill="#FFD700" stroke="#000" strokeWidth={0.8} />
        {plate.pieces.map((p, i) => {
          const pw = (p.rotated ? p.height : p.width) * scale;
          const ph = (p.rotated ? p.width : p.height) * scale;
          const rx = pad + p.x * scale;
          const ry = pad + p.y * scale;
          const effW = p.rotated ? p.height : p.width;
          const effH = p.rotated ? p.width : p.height;
          const fs = Math.min(5, pw / 12, ph / 4);
          const fills = ['#0000CC', '#2244AA', '#0033BB', '#1155CC', '#003399', '#2266BB', '#004488', '#1144AA'];
          return (
            <g key={i}>
              <rect x={rx} y={ry} width={pw} height={ph}
                fill={fills[i % fills.length]} stroke="#FFD700" strokeWidth={1.5} />
              <text x={rx + pw / 2} y={ry + ph / 2 - (fs > 2 ? fs * 0.5 : 0)}
                textAnchor="middle" dominantBaseline="middle" fill="#FFD700" fontSize={Math.max(fs, 4)} fontWeight="bold">
                {i + 1}
              </text>
              {fs > 2 && <text x={rx + pw / 2} y={ry + ph / 2 + fs * 0.3}
                textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={fs * 0.8}>
                {p.vitrageRef}
              </text>}
              {fs > 2.5 && <text x={rx + pw / 2} y={ry + ph / 2 + fs * 1.1}
                textAnchor="middle" dominantBaseline="middle" fill="#aac" fontSize={fs * 0.65}>
                {effW}x{effH}
              </text>}
            </g>
          );
        })}
        <text x={pad + w / 2} y={vh - 4} textAnchor="middle" fill="#000" fontSize={7} fontWeight="bold">{plate.plateWidth}</text>
        <text x={6} y={pad + h / 2} textAnchor="middle" fill="#000" fontSize={7} fontWeight="bold" transform={`rotate(-90,6,${pad + h / 2})`}>{plate.plateHeight}</text>
      </svg>
    </div>
  );
}

// ── Tab: WE ──────────────────────────────────────────────────────────

function TabWE({ results, commandeLabel, we }: { results: WEGroupe[]; commandeLabel?: string; we?: WESettings }) {
  if (results.length === 0) return <p className="text-gray-500 text-sm">Importez des vitrages pour voir l'optimisation WE.</p>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={async () => { const blob = await generateFicheWE(results, commandeLabel || '', we); download(blob, 'optimisation_we.pdf'); }}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded transition-colors flex items-center gap-2">
          🖨 Imprimer PDF
        </button>
      </div>
      {results.map((g, i) => (
        <div key={i} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-amber-400">{g.epaisseur}mm — {g.couleur}</span>
            <span className="text-xs text-gray-400">{g.totalPieces} pcs / {g.totalBarres} barres / {(g.tauxUtilisation * 100).toFixed(1)}%</span>
          </div>
          <div className="overflow-x-auto max-h-60 overflow-y-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-[#2a2d35]">
                <th className="text-left py-1 px-2 w-12">N°</th>
                <th className="text-left py-1 px-2">Coupes</th>
                <th className="text-right py-1 px-2 w-16">Utilise</th>
                <th className="text-right py-1 px-2 w-16">Chute</th>
              </tr></thead>
              <tbody>
                {g.barres.map(b => (
                  <tr key={b.numero} className="border-b border-[#181a20]">
                    <td className="py-1 px-2 text-white">{b.numero}</td>
                    <td className="py-1 px-2 text-gray-300">
                      {b.pieces.map((p, j) => (
                        <span key={j}>{j > 0 && <span className="text-gray-600"> + 5 + </span>}{p.longueur}<span className="text-gray-500 text-[10px]"> ({p.vitrageRef})</span></span>
                      ))}
                    </td>
                    <td className="py-1 px-2 text-white text-right">{b.utilise}</td>
                    <td className="py-1 px-2 text-gray-400 text-right">{b.chute}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab: Export / Generate ────────────────────────────────────────────

function TabExport({ vitrages, allPlates, weResult, commandeLabel, commande, avery, we }: {
  vitrages: Vitrage[]; allPlates: OptimizedPlate[]; weResult: WEGroupe[];
  commandeLabel: string; commande?: Commande; avery: AverySettings; we: WESettings;
}) {
  const [generating, setGenerating] = useState('');
  const cmd = commande ?? { id: '', reference: commandeLabel, client: '', dateCreation: '', semaineFabrication: '', semaineLivraison: '', statut: 'en_attente' as const, vitrages, lotFabrication: EMPTY_LOT, notes: '' };

  const gen = async (type: string) => {
    setGenerating(type);
    try {
      const label = commandeLabel || 'export';
      switch (type) {
        case 'A': download(await generateLabelsA(vitrages, commandeLabel, avery), `${label}_A.pdf`); break;
        case 'B': download(await generateLabelsB(vitrages, commandeLabel, avery), `${label}_B.pdf`); break;
        case 'C': download(await generateLabelsC(vitrages, allPlates, commandeLabel, avery), `${label}_C.pdf`); break;
        case 'WE_FICHE': download(await generateFicheWE(weResult, commandeLabel, we), `${label}_WE_fiche.pdf`); break;
        case 'CE': download(await generateEtiquettesCE(vitrages, cmd), `${label}_CE.pdf`); break;
        case 'ATELIER': download(await generateEtiquettesAtelier(vitrages, cmd), `${label}_atelier.pdf`); break;
        case 'POST_COUPE': download(await generateEtiquettesPostCoupe(vitrages, allPlates, commandeLabel), `${label}_post_coupe.pdf`); break;
        case 'WE_ETQ': download(await generateEtiquettesWE(weResult, commandeLabel), `${label}_WE_etiquettes.pdf`); break;
        case 'DXF': download(await apiExportDXF(allPlates, 'bottero'), `${label}_bottero.dxf`); break;
        case 'OPT': download(await apiExportOPT(allPlates), `${label}_bottero.opt`); break;
        case 'ZPL_CE': {
          const zplLabels = vitrages.map(v => ({
            vitrage_id: v.id, reference: v.reference, composition: v.composition,
            width: v.largeur, height: v.hauteur, ug: v.ug || '', gaz: v.gazType || 'Argon',
            commande_ref: cmd.reference, client: cmd.client,
          }));
          download(await apiLabelsZPL(zplLabels, 'ce'), `${label}_CE.zpl`);
          break;
        }
        case 'ZPL_ATELIER': {
          const zplLabels = vitrages.map(v => ({
            vitrage_id: v.id, reference: v.reference, composition: v.composition,
            width: v.largeur, height: v.hauteur, ug: v.ug || '', gaz: v.gazType || 'Argon',
            commande_ref: cmd.reference, client: cmd.client,
          }));
          download(await apiLabelsZPL(zplLabels, 'atelier'), `${label}_atelier.zpl`);
          break;
        }
      }
    } catch (err) { alert(`Erreur : ${err}`); }
    setGenerating('');
  };

  const has = vitrages.length > 0;
  const nbWE = weResult.reduce((s, g) => s + g.barres.reduce((sb, b) => sb + b.pieces.length, 0), 0);

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-300">Etiquettes Avery (70x35mm)</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { id: 'A', title: 'Assemblees', desc: `${vitrages.length} etq`, color: 'blue', ok: has },
        { id: 'B', title: 'EXT / INT', desc: `${vitrages.length * 2} etq`, color: 'green', ok: has },
        { id: 'C', title: 'Ordre coupe', desc: `${allPlates.length} plaques`, color: 'purple', ok: has && allPlates.length > 0 },
        { id: 'WE_FICHE', title: 'Fiche WE', desc: `${weResult.reduce((s, g) => s + g.totalBarres, 0)} barres`, color: 'amber', ok: has },
      ].map(d => (
        <button key={d.id} onClick={() => gen(d.id)} disabled={!d.ok || !!generating}
          className={`text-left p-5 rounded-xl border-2 bg-[#181a20] transition-all ${
            d.ok ? `border-${d.color}-500/30 hover:border-${d.color}-500/60 cursor-pointer` : 'border-[#2a2d35] opacity-40 cursor-not-allowed'}`}>
          <div className={`text-sm font-semibold text-${d.color}-400`}>{d.title}</div>
          <div className="text-xs text-gray-500 mt-1">{generating === d.id ? 'Generation...' : d.desc}</div>
        </button>
      ))}
    </div>
    <h4 className="text-sm font-semibold text-gray-300">Etiquettes industrielles</h4>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
      {[
        { id: 'CE', title: 'CE / CEKAL (100x70)', desc: `${vitrages.length} vitrages`, color: 'blue', ok: has },
        { id: 'ATELIER', title: 'Fiche atelier (150x100)', desc: `+ checklist fab`, color: 'green', ok: has },
        { id: 'POST_COUPE', title: 'Post-coupe (70x50)', desc: `${allPlates.reduce((s, p) => s + p.pieces.length, 0)} pieces`, color: 'purple', ok: has && allPlates.length > 0 },
        { id: 'WE_ETQ', title: 'Etiq. WE (80x30)', desc: `${nbWE} pieces`, color: 'amber', ok: has && nbWE > 0 },
      ].map(d => (
        <button key={d.id} onClick={() => gen(d.id)} disabled={!d.ok || !!generating}
          className={`text-left p-5 rounded-xl border-2 bg-[#181a20] transition-all ${
            d.ok ? `border-${d.color}-500/30 hover:border-${d.color}-500/60 cursor-pointer` : 'border-[#2a2d35] opacity-40 cursor-not-allowed'}`}>
          <div className={`text-sm font-semibold text-${d.color}-400`}>{d.title}</div>
          <div className="text-xs text-gray-500 mt-1">{generating === d.id ? 'Generation...' : d.desc}</div>
        </button>
      ))}
    </div>
    {hasBackend && (
      <>
        <h4 className="text-sm font-semibold text-gray-300">Export machine & ZPL Zebra</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { id: 'DXF', title: 'DXF Bottero', desc: 'Plan de coupe DXF', color: 'blue', ok: has && allPlates.length > 0 },
            { id: 'OPT', title: 'OPT Bottero', desc: 'Format texte OPT', color: 'green', ok: has && allPlates.length > 0 },
            { id: 'ZPL_CE', title: 'ZPL CE/CEKAL', desc: `${vitrages.length} etiquettes Zebra`, color: 'purple', ok: has },
            { id: 'ZPL_ATELIER', title: 'ZPL Atelier', desc: 'Fiches atelier Zebra', color: 'amber', ok: has },
          ].map(d => (
            <button key={d.id} onClick={() => gen(d.id)} disabled={!d.ok || !!generating}
              className={`text-left p-5 rounded-xl border-2 bg-[#181a20] transition-all ${
                d.ok ? `border-${d.color}-500/30 hover:border-${d.color}-500/60 cursor-pointer` : 'border-[#2a2d35] opacity-40 cursor-not-allowed'}`}>
              <div className={`text-sm font-semibold text-${d.color}-400`}>{d.title}</div>
              <div className="text-xs text-gray-500 mt-1">{generating === d.id ? 'Generation...' : d.desc}</div>
            </button>
          ))}
        </div>
      </>
    )}
    </div>
  );
}

// ── Batch View (multi-order) ─────────────────────────────────────────

const BATCH_TABS = ['Vitrages', 'Optim Verre', 'Warm Edge', 'Chariots', 'Etiquettes'] as const;

function BatchView({ commandes, onBack, avery, we, glass }: {
  commandes: Commande[];
  onBack: () => void;
  avery: AverySettings; we: WESettings; glass: GlassSettings;
}) {
  const [tab, setTab] = useState(0);
  const [machine, setMachine] = useState<'lisec' | 'bottero'>(glass.machine || 'lisec');
  const allVitrages = useMemo(() => commandes.flatMap(c => c.vitrages), [commandes]);
  const batchLabel = commandes.map(c => c.reference).join(' + ');
  const weResult = useMemo(() => allVitrages.length > 0 ? optimizeWE(allVitrages, we) : [], [allVitrages, we]);
  const glassWithMachine = useMemo(() => ({ ...glass, machine }), [glass, machine]);
  const { glassResult, loading: optimLoading, backend: usingBackend } = useOptimization(allVitrages, glassWithMachine);
  const allPlates = useMemo(() => glassResult.flatMap(g => g.plates), [glassResult]);

  const [sending, setSending] = useState(false);

  const envoyerEnProduction = async () => {
    setSending(true);
    try {
      const lotId = uuid();
      const now = new Date();
      const sem = getISOWeek(now);
      const ref = `LOT-${sem}-${now.getTime().toString(36).slice(-4).toUpperCase()}`;

      // Calculer l'affectation chariots
      const cartPiecesForOptim: CutPieceForCart[] = allPlates.flatMap(plate =>
        plate.pieces.map(p => ({
          id: `${p.vitrageId}-${p.face}`,
          vitrageId: p.vitrageId,
          vitrageRef: p.vitrageRef,
          clientRef: commandes.find(c => c.vitrages.some(v => v.id === p.vitrageId))?.reference || '',
          position: p.face as 'EXT' | 'INT',
          material: p.material,
          width: p.width, height: p.height,
          area: p.width * p.height,
          plateNo: plate.numero,
        }))
      );
      const cartResult = optimizeCarts(cartPiecesForOptim);
      const pieceCartMap = new Map<string, string>();
      for (const cart of cartResult.carts) {
        for (const cp of cart.pieces) {
          pieceCartMap.set(cp.id, cart.cartId);
        }
      }

      const prodPieces = allPlates.flatMap(plate =>
        plate.pieces.map(p => ({
          lot_id: lotId, commande_ref: commandes.find(c => c.vitrages.some(v => v.id === p.vitrageId))?.reference || '',
          vitrage_ref: p.vitrageRef, vitrage_id: p.vitrageId,
          largeur: p.width, hauteur: p.height, composition: '',
          face: p.face, material: p.material,
          machine, plaque_no: plate.numero,
          cart_id: pieceCartMap.get(`${p.vitrageId}-${p.face}`) || '',
        }))
      );

      const weProd = weResult.flatMap(g => g.barres.flatMap(b =>
        b.pieces.map(p => ({
          lot_id: lotId, barre_no: b.numero, longueur: p.longueur,
          orig_dim: p.origDim, cote: p.cote === 'court' ? 'C' : 'L',
          vitrage_ref: p.vitrageRef, epaisseur: g.epaisseur, couleur: g.couleur,
        }))
      ));

      await fetch(`${import.meta.env.VITE_ISULA_API_URL}/api/production/lots`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: lotId, reference: ref, semaine: sem,
          commande_ids: commandes.map(c => c.id), commande_refs: commandes.map(c => c.reference),
          total_pieces: prodPieces.length, total_we: weProd.length, notes: '',
          pieces: prodPieces, we_pieces: weProd,
          glass_optim: glassResult, we_optim: weResult, cart_optim: cartResult,
        }),
      });
      // Sync each commande to global dashboard (fire-and-forget)
      for (const c of commandes) {
        upsertCommandeGlobale(c.reference, {
          client: c.client || '',
          chantier: c.client || '',
          semaine_fab: c.semaineFabrication || '',
          semaine_liv: c.semaineLivraison || '',
        }).catch(() => {});
        patchCommandeModule(c.reference, 'vitrage', {
          statut: 'en_cours',
          total: c.vitrages.length,
          fait: 0,
          nc: 0,
        }).catch(() => {});
      }
      // Enregistrer les nouvelles chutes stockables + marquer les chutes utilisees
      let chutesCreees = 0;
      let chutesUtilisees = 0;
      for (const matResult of glassResult) {
        for (const plate of matResult.plates) {
          const pd = plate as unknown as Record<string, unknown>;
          // Marquer les chutes utilisees
          if (pd.isRemnant && pd.remnantId) {
            patchStockRemnant(pd.remnantId as string, { statut: 'utilise', used_in_commande: ref } as StockRemnant).catch(() => {});
            chutesUtilisees++;
          }
          // Enregistrer les nouvelles chutes stockables (>300mm dans les 2 dimensions)
          const stockableRemnants = (plate.remnants || []).filter(
            r => r.w >= 300 && r.h >= 300 && r.classe === 'stockable'
          );
          for (const remnant of stockableRemnants) {
            const chCode = `CH-${sem.replace('S', '').replace('-', '')}-${String(chutesCreees + 1).padStart(3, '0')}`;
            upsertStockRemnant({
              code: chCode,
              glass_code: matResult.material,
              width: Math.round(remnant.w),
              height: Math.round(remnant.h),
              quantity: 1,
              statut: 'disponible',
              source_commande: ref,
              source_plaque: plate.numero,
              emplacement: '',
              notes: `Auto-cree depuis ${ref} plaque ${plate.numero}`,
            } as StockRemnant).catch(() => {});
            chutesCreees++;
          }
        }
      }
      const chutesMsg = chutesCreees > 0 ? ` — ${chutesCreees} chute(s) enregistree(s)` : '';
      const usedMsg = chutesUtilisees > 0 ? ` — ${chutesUtilisees} chute(s) reutilisee(s)` : '';
      alert(`Lot ${ref} cree avec ${prodPieces.length} pieces verre + ${weProd.length} WE${chutesMsg}${usedMsg}`);
    } catch (err) { alert(`Erreur : ${err}`); }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <h2 className="text-xl font-bold text-amber-400">Lot de coupe</h2>
        <span className="text-xs text-gray-400">{commandes.length} commandes — {allVitrages.length} vitrages</span>
        {allVitrages.length > 0 && (
          <div className="ml-auto flex items-center gap-3">
            <label className="text-xs text-gray-400">Machine :</label>
            <select value={machine} onChange={e => setMachine(e.target.value as 'lisec' | 'bottero')}
              className="px-3 py-2 bg-[#181a20] border border-[#2a2d35] text-white text-sm rounded-lg">
              <option value="lisec">LISEC (3-stages)</option>
              <option value="bottero">Bottero (2-stages)</option>
            </select>
            <button onClick={envoyerEnProduction} disabled={sending}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
              {sending ? 'Envoi...' : 'Envoyer en production'}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {commandes.map(c => (
          <span key={c.id} className="text-xs px-2 py-1 rounded bg-[#181a20] border border-[#2a2d35] text-gray-300">
            {c.reference} <span className="text-gray-500">({c.vitrages.length})</span>
          </span>
        ))}
      </div>

      <div className="flex gap-1 border-b border-[#2a2d35]">
        {BATCH_TABS.map((label, i) => (
          <button key={label} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm transition-colors border-b-2 ${i === tab
              ? 'border-amber-500 text-amber-400 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-300'}`}>{label}</button>
        ))}
      </div>

      {tab === 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
              <th className="text-left py-2 px-1">Commande</th>
              <th className="text-left py-2 px-1">Reference</th>
              <th className="text-left py-2 px-1 w-12">V</th>
              <th className="text-right py-2 px-1 w-16">L</th>
              <th className="text-right py-2 px-1 w-16">H</th>
              <th className="text-left py-2 px-1">Composition</th>
              <th className="text-left py-2 px-1 w-20">EXT</th>
              <th className="text-left py-2 px-1 w-20">INT</th>
            </tr></thead>
            <tbody>
              {commandes.flatMap(c => c.vitrages.map(v => (
                <tr key={v.id} className="border-b border-[#1e2028]">
                  <td className="py-1 px-1 text-gray-500">{c.reference}</td>
                  <td className="py-1 px-1 text-white">{v.reference}</td>
                  <td className="py-1 px-1 text-gray-300">{v.variante}</td>
                  <td className="py-1 px-1 text-white text-right">{v.largeur}</td>
                  <td className="py-1 px-1 text-white text-right">{v.hauteur}</td>
                  <td className="py-1 px-1 text-gray-300">{v.composition}</td>
                  <td className="py-1 px-1 text-red-400 text-[11px]">{v.outerGlass}</td>
                  <td className="py-1 px-1 text-blue-400 text-[11px]">{v.innerGlass}</td>
                </tr>
              )))}
            </tbody>
          </table>
        </div>
      )}
      {tab === 1 && <TabGlass results={glassResult} loading={optimLoading} backend={usingBackend} commandeLabel={batchLabel} />}
      {tab === 2 && <TabWE results={weResult} commandeLabel={batchLabel} we={we} />}
      {tab === 3 && <TabCarts commandes={commandes} allPlates={allPlates} />}
      {tab === 4 && <TabExport vitrages={allVitrages} allPlates={allPlates} weResult={weResult}
        commandeLabel={batchLabel} avery={avery} we={we} />}
    </div>
  );
}

// ── Tab Chariots ────────────────────────────────────────────────────

function TabCarts({ commandes, allPlates }: { commandes: Commande[]; allPlates: OptimizedPlate[] }) {
  const [maxPerCart, setMaxPerCart] = useState(25);

  const cartPieces: CutPieceForCart[] = allPlates.flatMap(plate =>
    plate.pieces.map(p => ({
      id: `${p.vitrageId}-${p.face}`,
      vitrageId: p.vitrageId,
      vitrageRef: p.vitrageRef,
      clientRef: commandes.find(c => c.vitrages.some(v => v.id === p.vitrageId))?.reference || '',
      position: p.face as 'EXT' | 'INT',
      material: p.material,
      width: p.width,
      height: p.height,
      area: p.width * p.height,
      plateNo: plate.numero,
    }))
  );

  const result: CartOptimResult = useMemo(
    () => optimizeCarts(cartPieces, { maxPiecesPerCart: maxPerCart, maxAreaPerCart: 20_000_000, preferClientGrouping: true }),
    [cartPieces, maxPerCart],
  );

  const runs = useMemo(
    () => sequenceCuttingRuns(cartPieces, () => 'lisec'),
    [cartPieces],
  );

  if (cartPieces.length === 0) return <p className="text-gray-500 text-sm">Lancez l'optimisation verre pour voir l'affectation chariots.</p>;

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35] text-center">
          <div className="text-2xl font-black text-amber-400">{result.totalCarts}</div>
          <div className="text-[10px] text-gray-500">Chariots</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35] text-center">
          <div className="text-2xl font-black text-white">{cartPieces.length}</div>
          <div className="text-[10px] text-gray-500">Pieces totales</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35] text-center">
          <div className="text-2xl font-black text-green-400">{(result.avgFillRate * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-gray-500">Remplissage moy.</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35] text-center">
          <div className="text-2xl font-black text-blue-400">{(result.iguPairingRate * 100).toFixed(0)}%</div>
          <div className="text-[10px] text-gray-500">Pairing EXT+INT</div>
        </div>
        <div className="bg-[#181a20] rounded-lg p-3 border border-[#2a2d35] text-center">
          <div className="text-2xl font-black text-cyan-400">{runs.length}</div>
          <div className="text-[10px] text-gray-500">Runs de coupe</div>
        </div>
      </div>

      {/* Reglage + actions */}
      <div className="flex items-center gap-3 text-sm flex-wrap">
        <label className="text-gray-400">Capacite chariot :</label>
        <input type="number" value={maxPerCart} min={5} max={50}
          onChange={e => setMaxPerCart(+e.target.value)}
          className="w-16 px-2 py-1 bg-[#181a20] border border-[#2a2d35] rounded text-white text-center" />
        <span className="text-gray-500">pieces max</span>
        <div className="ml-auto flex gap-2">
          <button onClick={async () => {
            const blob = await generateCartSheetPDF(result.carts, commandes.map(c => c.reference).join('+'));
            download(blob, 'fiches_chariots.pdf');
          }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg">
            Imprimer fiches chariots
          </button>
        </div>
      </div>

      {/* Ordre de coupe */}
      <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
        <h4 className="text-sm font-bold text-amber-400 mb-3">Ordre de coupe (minimise les changements de plaque)</h4>
        <div className="flex gap-2 flex-wrap">
          {runs.map((r, i) => (
            <div key={i} className={`px-3 py-2 rounded-lg border text-xs ${
              r.machine === 'bottero' ? 'bg-green-900/20 border-green-500/30' : 'bg-blue-900/20 border-blue-500/30'}`}>
              <div className="font-bold text-white">{r.sequenceOrder}. {r.material}</div>
              <div className="text-gray-400">{r.pieces.length} pcs — {r.machine.toUpperCase()}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chariots */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-amber-400">Affectation chariots</h4>
        {result.carts.map(cart => {
          const clients = [...new Set(cart.pieces.map(p => p.clientRef))];
          const materials = [...new Set(cart.pieces.map(p => p.material))];
          return (
            <div key={cart.cartId} className="bg-[#181a20] rounded-lg border border-[#2a2d35] overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2d35]">
                <span className="text-amber-400 font-bold font-mono">{cart.cartId}</span>
                <span className="text-white font-semibold">{cart.clientRef}</span>
                <div className="flex gap-1 flex-1">
                  {materials.map(m => (
                    <span key={m} className="text-[9px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/20">{m}</span>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{cart.totalPieces}/{maxPerCart} pcs</span>
                <span className={`text-xs font-bold ${cart.fillRate > 0.8 ? 'text-green-400' : cart.fillRate > 0.5 ? 'text-amber-400' : 'text-red-400'}`}>
                  {(cart.fillRate * 100).toFixed(0)}%
                </span>
                <span className="text-xs text-blue-400">{cart.iguPaired}/{cart.iguTotal} paires</span>
              </div>
              {/* Fill bar */}
              <div className="h-2 bg-gray-800">
                <div className={`h-full transition-all ${cart.fillRate > 0.8 ? 'bg-green-500' : cart.fillRate > 0.5 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${cart.fillRate * 100}%` }} />
              </div>
              {/* Pieces in 2 columns: EXT | INT */}
              <div className="grid grid-cols-2 gap-px bg-[#2a2d35]">
                <div className="bg-[#14161d] p-2">
                  <div className="text-[9px] text-red-400 font-bold uppercase mb-1">EXT ({cart.pieces.filter(p => p.position === 'EXT').length})</div>
                  {cart.pieces.filter(p => p.position === 'EXT').map(p => (
                    <div key={p.id} className="text-[10px] text-gray-300 py-0.5">
                      {p.vitrageRef} <span className="text-gray-600">{p.width}x{p.height}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-[#14161d] p-2">
                  <div className="text-[9px] text-blue-400 font-bold uppercase mb-1">INT ({cart.pieces.filter(p => p.position === 'INT').length})</div>
                  {cart.pieces.filter(p => p.position === 'INT').map(p => (
                    <div key={p.id} className="text-[10px] text-gray-300 py-0.5">
                      {p.vitrageRef} <span className="text-gray-600">{p.width}x{p.height}</span>
                    </div>
                  ))}
                </div>
              </div>
              {clients.length > 1 && (
                <div className="px-4 py-1 bg-red-900/20 text-red-400 text-[10px]">
                  Attention : {clients.length} clients melanges ({clients.join(', ')})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Stock & Catalogue ────────────────────────────────────────────────

function StockView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState(0);
  const [products, setProducts] = useState<GlassProduct[]>([]);
  const [plates, setPlates] = useState<StockPlate[]>([]);
  const [remnants, setRemnants] = useState<StockRemnant[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    const [p, s, r] = await Promise.all([fetchGlassProducts(), fetchStockPlates(), fetchStockRemnants()]);
    setProducts(p); setPlates(s); setRemnants(r); setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const [editProduct, setEditProduct] = useState<Partial<GlassProduct> | null>(null);
  const [editPlate, setEditPlate] = useState<Partial<StockPlate> | null>(null);

  const saveProduct = async () => {
    if (!editProduct?.code) return;
    await upsertGlassProduct(editProduct as GlassProduct);
    setProducts(await fetchGlassProducts());
    setEditProduct(null);
  };

  const savePlate = async () => {
    if (!editPlate?.glass_code) return;
    await upsertStockPlate(editPlate as StockPlate);
    setPlates(await fetchStockPlates());
    setEditPlate(null);
  };

  const delProduct = async (id: string) => {
    if (!confirm('Supprimer ce verre ?')) return;
    await deleteGlassProduct(id);
    setProducts(await fetchGlassProducts());
  };

  const delPlate = async (id: string) => {
    if (!confirm('Supprimer cette plaque ?')) return;
    await deleteStockPlate(id);
    setPlates(await fetchStockPlates());
  };

  const tabs = ['Catalogue verres', 'Stock plaques', `Chutes (${remnants.filter(r => (r as unknown as Record<string, string>).statut !== 'utilise').length})`];

  if (loading) return <p className="text-gray-500 text-center py-12">Chargement...</p>;

  return (
    <div className="max-w-6xl mx-auto px-6 py-6">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="text-sm text-gray-500 hover:text-white">← Retour</button>
        <h2 className="text-xl font-bold text-white">Catalogue & Stock</h2>
      </div>

      <div className="flex gap-1 mb-6 border-b border-[#2a2d35]">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)}
            className={`px-4 py-2 text-sm transition-colors ${tab === i ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">{products.length} verres</h3>
            <button onClick={() => setEditProduct({ code: '', label: '', famille: 'float', traitement: 'clair', epaisseur: 4, nb_pvb: 0, notation_feuillete: '', has_coating: false, coating_type: '', coating_face: '', emargement_mm: 0, machine: 'lisec', no_rotation: false, can_cut: true, plate_sizes: [], ug_default: 0, fournisseur: '', notes: '' } as unknown as GlassProduct)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded">+ Ajouter</button>
          </div>

          {editProduct && (() => {
            const ep = editProduct as unknown as Record<string, unknown>;
            const famille = (ep.famille as string) || 'float';
            const traitement = (ep.traitement as string) || 'clair';
            const needsCoating = traitement === 'fe' || traitement === 'controle_solaire' || traitement === 'reflechissant';
            const set = (patch: Record<string, unknown>) => setEditProduct({ ...editProduct, ...patch } as unknown as GlassProduct);
            return (
            <div className="bg-[#181a20] rounded-lg p-4 border border-purple-500/30 mb-4 space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <input placeholder="Code * (ex: 4FE)" value={editProduct.code ?? ''} onChange={e => set({ code: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input placeholder="Label (ex: 4mm Float FE 1.1)" value={editProduct.label ?? ''} onChange={e => set({ label: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Famille</label>
                  <select value={famille} onChange={e => {
                    const f = e.target.value;
                    set({ famille: f, machine: f === 'feuillete' ? 'bottero' : 'lisec' });
                  }} className="w-full bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                    <option value="float">Float (monolithique)</option>
                    <option value="feuillete">Feuillete (PVB)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Traitement</label>
                  <select value={traitement} onChange={e => {
                    const t = e.target.value;
                    const coat = t === 'fe' || t === 'controle_solaire' || t === 'reflechissant';
                    set({ traitement: t, has_coating: coat, no_rotation: coat });
                  }} className="w-full bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                    <option value="clair">Clair</option>
                    <option value="extra_clair">Extra clair</option>
                    <option value="fe">Faible emissivite (FE)</option>
                    <option value="controle_solaire">Controle solaire</option>
                    <option value="depoli">Depoli</option>
                    <option value="reflechissant">Reflechissant</option>
                    <option value="teinte">Teinte</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {famille === 'float' ? (
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Epaisseur (mm)</label>
                    <select value={String(editProduct.epaisseur ?? 4)} onChange={e => set({ epaisseur: +e.target.value })}
                      className="w-full bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                      {[4, 6, 8, 10, 12].map(v => <option key={v} value={v}>{v} mm</option>)}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Composition</label>
                      <select value={(ep.notation_feuillete as string) || '44.2'} onChange={e => {
                        const n = e.target.value;
                        const [glasses, pvb] = n.split('.');
                        const g1 = parseInt(glasses.slice(0, glasses.length / 2));
                        const nbPvb = parseInt(pvb);
                        const epTotal = g1 * 2 + nbPvb * 0.38;
                        set({ notation_feuillete: n, nb_pvb: nbPvb, epaisseur: Math.round(epTotal * 10) / 10 });
                      }} className="w-full bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                        <optgroup label="Base 4+4">
                          <option value="44.2">44.2 (2 PVB) — 8.76mm</option>
                          <option value="44.6">44.6 (6 PVB) — 10.28mm</option>
                        </optgroup>
                        <optgroup label="Base 5+5">
                          <option value="55.2">55.2 (2 PVB) — 10.76mm</option>
                          <option value="55.6">55.6 (6 PVB) — 12.28mm</option>
                        </optgroup>
                        <optgroup label="Base 6+6">
                          <option value="66.2">66.2 (2 PVB) — 12.76mm</option>
                          <option value="66.6">66.6 (6 PVB) — 14.28mm</option>
                          <option value="66.8">66.8 (8 PVB) — 15.04mm</option>
                        </optgroup>
                        <optgroup label="Base 8+8">
                          <option value="88.2">88.2 (2 PVB) — 16.76mm</option>
                          <option value="88.6">88.6 (6 PVB) — 18.28mm</option>
                          <option value="88.8">88.8 (8 PVB) — 19.04mm</option>
                        </optgroup>
                        <optgroup label="Base 10+10">
                          <option value="1010.2">1010.2 (2 PVB) — 20.76mm</option>
                          <option value="1010.6">1010.6 (6 PVB) — 22.28mm</option>
                        </optgroup>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-1">Ep. totale</label>
                      <input type="number" step="0.1" value={editProduct.epaisseur ?? 8.8} readOnly
                        className="w-full bg-[#14161d] rounded px-2 py-1.5 text-gray-400 border border-[#2a2d35] cursor-not-allowed" />
                    </div>
                  </>
                )}
                <div>
                  <label className="text-[10px] text-gray-500 block mb-1">Machine de coupe</label>
                  <select value={(ep.machine as string) ?? 'lisec'} onChange={e => set({ machine: e.target.value })}
                    className="w-full bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                    <option value="lisec">LISEC (2 axes)</option>
                    <option value="bottero">Bottero (1 axe)</option>
                    <option value="manuel">Manuel</option>
                    <option value="commande_aux_dimensions">Commande aux dimensions</option>
                  </select>
                </div>
              </div>

              {needsCoating && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm bg-[#14161d] rounded-lg p-3 border border-green-500/20">
                  <div className="col-span-full text-[10px] text-green-400 font-bold uppercase tracking-wider">Parametres couche</div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Type couche</label>
                    <input value={(ep.coating_type as string) ?? ''} onChange={e => set({ coating_type: e.target.value })}
                      placeholder="FE 1.1, Solar, Planitherm..." className="w-full bg-[#0f1117] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Face couche</label>
                    <select value={(ep.coating_face as string) ?? ''} onChange={e => set({ coating_face: e.target.value })}
                      className="w-full bg-[#0f1117] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                      <option value="">--</option>
                      <option value="2">Face 2</option>
                      <option value="3">Face 3</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-1">Emargement (mm)</label>
                    <input type="number" value={(ep.emargement_mm as number) ?? 0} onChange={e => set({ emargement_mm: +e.target.value })}
                      className="w-full bg-[#0f1117] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <input placeholder="Fournisseur" value={editProduct.fournisseur ?? ''} onChange={e => set({ fournisseur: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input type="number" step="0.1" placeholder="Ug par defaut" value={editProduct.ug_default ?? 0} onChange={e => set({ ug_default: +e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input placeholder="Notes" value={editProduct.notes ?? ''} onChange={e => set({ notes: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35] col-span-2" />
              </div>
              <div className="flex gap-2">
                <button onClick={saveProduct} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-sm rounded">Enregistrer</button>
                <button onClick={() => setEditProduct(null)} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">Annuler</button>
              </div>
            </div>
            );
          })()}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                <th className="text-left py-2 px-2">Code</th>
                <th className="text-left py-2 px-2">Label</th>
                <th className="text-left py-2 px-2">Famille</th>
                <th className="text-left py-2 px-2">Traitement</th>
                <th className="text-right py-2 px-2">Ep.</th>
                <th className="text-left py-2 px-2">Machine</th>
                <th className="text-center py-2 px-2">Emarg.</th>
                <th className="text-left py-2 px-2">Fourn.</th>
                <th className="py-2 px-2 w-20"></th>
              </tr></thead>
              <tbody>
                {products.map(p => {
                  const d = p as unknown as Record<string, unknown>;
                  const famille = (d.famille as string) || (p as unknown as Record<string, string>).type || '';
                  const traitement = (d.traitement as string) || (p.has_coating ? 'fe' : 'clair');
                  const machine = (d.machine as string) || '';
                  const machineLabel: Record<string, string> = { lisec: 'LISEC', bottero: 'Bottero', manuel: 'Manuel', commande_aux_dimensions: 'Aux dim.' };
                  const traitLabel: Record<string, string> = { clair: 'Clair', extra_clair: 'Extra clair', fe: 'FE', controle_solaire: 'Ctrl solaire', depoli: 'Depoli', reflechissant: 'Reflect.', teinte: 'Teinte', autre: 'Autre' };
                  const notation = (d.notation_feuillete as string) || '';
                  return (
                    <tr key={p.id} className="border-b border-[#1e2028] hover:bg-[#1a1c24]">
                      <td className="py-1.5 px-2 text-white font-medium">{p.code}</td>
                      <td className="py-1.5 px-2 text-gray-300">{p.label}</td>
                      <td className="py-1.5 px-2">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${famille === 'feuillete' ? 'bg-amber-600/20 text-amber-400' : 'bg-blue-600/20 text-blue-400'}`}>
                          {famille === 'feuillete' ? `FEUIL${notation ? ` ${notation}` : ''}` : 'FLOAT'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        {traitement !== 'clair' ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${traitement === 'fe' || traitement === 'controle_solaire' ? 'bg-green-600/20 text-green-400' : 'bg-gray-600/20 text-gray-300'}`}>
                            {traitLabel[traitement] || traitement}
                          </span>
                        ) : <span className="text-gray-600">Clair</span>}
                      </td>
                      <td className="py-1.5 px-2 text-white text-right">{p.epaisseur}mm</td>
                      <td className="py-1.5 px-2 text-gray-300">{machineLabel[machine] || '—'}</td>
                      <td className="py-1.5 px-2 text-center">{(d.emargement_mm as number) ? `${d.emargement_mm}mm` : '—'}</td>
                      <td className="py-1.5 px-2 text-gray-400">{p.fournisseur}</td>
                      <td className="py-1.5 px-2 text-right">
                        <button onClick={() => setEditProduct(p)} className="text-blue-400 hover:text-blue-300 text-xs mr-2">Modifier</button>
                        <button onClick={() => delProduct(p.id)} className="text-red-400 hover:text-red-300 text-xs">Suppr.</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 1 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">{plates.length} references en stock</h3>
            <button onClick={() => setEditPlate({ glass_code: products[0]?.code ?? '', width: 3210, height: 2550, quantity: 1, emplacement: '', fournisseur: '', lot_fournisseur: '' })}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded">+ Ajouter</button>
          </div>

          {editPlate && (
            <div className="bg-[#181a20] rounded-lg p-4 border border-purple-500/30 mb-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <select value={editPlate.glass_code ?? ''} onChange={e => setEditPlate({ ...editPlate, glass_code: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]">
                  {products.map(p => <option key={p.code} value={p.code}>{p.code}</option>)}
                </select>
                <input type="number" placeholder="Largeur" value={editPlate.width ?? 3210} onChange={e => setEditPlate({ ...editPlate, width: +e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input type="number" placeholder="Hauteur" value={editPlate.height ?? 2550} onChange={e => setEditPlate({ ...editPlate, height: +e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input type="number" placeholder="Quantite" value={editPlate.quantity ?? 1} onChange={e => setEditPlate({ ...editPlate, quantity: +e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input placeholder="Emplacement" value={editPlate.emplacement ?? ''} onChange={e => setEditPlate({ ...editPlate, emplacement: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input placeholder="Fournisseur" value={editPlate.fournisseur ?? ''} onChange={e => setEditPlate({ ...editPlate, fournisseur: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
                <input placeholder="Lot fournisseur" value={editPlate.lot_fournisseur ?? ''} onChange={e => setEditPlate({ ...editPlate, lot_fournisseur: e.target.value })}
                  className="bg-[#14161d] rounded px-2 py-1.5 text-white border border-[#2a2d35]" />
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={savePlate} className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-sm rounded">Enregistrer</button>
                <button onClick={() => setEditPlate(null)} className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">Annuler</button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                <th className="text-left py-2 px-2">Verre</th>
                <th className="text-right py-2 px-2">Dimensions</th>
                <th className="text-right py-2 px-2">Quantite</th>
                <th className="text-left py-2 px-2">Emplacement</th>
                <th className="text-left py-2 px-2">Fournisseur</th>
                <th className="text-left py-2 px-2">Lot</th>
                <th className="py-2 px-2 w-20"></th>
              </tr></thead>
              <tbody>
                {plates.map(p => (
                  <tr key={p.id} className="border-b border-[#1e2028] hover:bg-[#1a1c24]">
                    <td className="py-1.5 px-2 text-white font-medium">{p.glass_code}</td>
                    <td className="py-1.5 px-2 text-white text-right">{p.width} x {p.height}</td>
                    <td className="py-1.5 px-2 text-right"><span className={`font-bold ${p.quantity > 0 ? 'text-green-400' : 'text-red-400'}`}>{p.quantity}</span></td>
                    <td className="py-1.5 px-2 text-gray-400">{p.emplacement}</td>
                    <td className="py-1.5 px-2 text-gray-400">{p.fournisseur}</td>
                    <td className="py-1.5 px-2 text-gray-400">{p.lot_fournisseur}</td>
                    <td className="py-1.5 px-2 text-right">
                      <button onClick={() => setEditPlate(p)} className="text-blue-400 hover:text-blue-300 text-xs mr-2">Modifier</button>
                      <button onClick={() => delPlate(p.id)} className="text-red-400 hover:text-red-300 text-xs">Suppr.</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 2 && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold text-gray-300">
              {remnants.filter(r => (r as unknown as Record<string, string>).statut !== 'utilise').length} chutes disponibles
            </h3>
            <button onClick={async () => {
              const code = `CH-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
              await upsertStockRemnant({ code, glass_code: products[0]?.code ?? '', width: 0, height: 0, quantity: 1, statut: 'disponible', source_commande: '', source_plaque: 0, used_in_commande: '', emplacement: '', notes: '' } as StockRemnant);
              setRemnants(await fetchStockRemnants());
            }} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded">+ Ajouter manuellement</button>
            {remnants.filter(r => (r as unknown as Record<string, string>).statut !== 'utilise').length > 0 && (
              <button onClick={async () => {
                const labels = remnants
                  .filter(r => (r as unknown as Record<string, string>).statut !== 'utilise')
                  .map(r => ({
                    code: (r as unknown as Record<string, string>).code || r.id.slice(0, 8),
                    glass_code: r.glass_code,
                    width: r.width,
                    height: r.height,
                    source: r.source_commande || '',
                    date: r.date_creation?.slice(0, 10) || new Date().toISOString().slice(0, 10),
                  }));
                const blob = await generateRemnantLabelsPDF(labels);
                download(blob, 'etiquettes_chutes.pdf');
              }} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded">Imprimer etiquettes</button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                <th className="text-left py-2 px-2">Code</th>
                <th className="text-left py-2 px-2">Verre</th>
                <th className="text-right py-2 px-2">Dimensions</th>
                <th className="text-center py-2 px-2">Statut</th>
                <th className="text-left py-2 px-2">Origine</th>
                <th className="text-left py-2 px-2">Emplacement</th>
                <th className="text-left py-2 px-2">Date</th>
                <th className="py-2 px-2 w-20"></th>
              </tr></thead>
              <tbody>
                {remnants.map(r => {
                  const d = r as unknown as Record<string, unknown>;
                  const statut = (d.statut as string) || 'disponible';
                  const statusColor: Record<string, string> = {
                    disponible: 'bg-green-600/20 text-green-400',
                    reserve: 'bg-blue-600/20 text-blue-400',
                    utilise: 'bg-gray-600/20 text-gray-500',
                    rebut: 'bg-red-600/20 text-red-400',
                  };
                  return (
                    <tr key={r.id} className={`border-b border-[#1e2028] ${statut === 'utilise' ? 'opacity-40' : ''}`}>
                      <td className="py-1.5 px-2 text-amber-400 font-mono font-bold">{(d.code as string) || r.id.slice(0, 8)}</td>
                      <td className="py-1.5 px-2 text-white">{r.glass_code}</td>
                      <td className="py-1.5 px-2 text-white text-right font-medium">{r.width} x {r.height}</td>
                      <td className="py-1.5 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor[statut] || ''}`}>
                          {statut.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-gray-400">{r.source_commande || '—'}</td>
                      <td className="py-1.5 px-2 text-gray-400">{r.emplacement || '—'}</td>
                      <td className="py-1.5 px-2 text-gray-500">{r.date_creation?.slice(0, 10) || '—'}</td>
                      <td className="py-1.5 px-2 text-right">
                        <button onClick={async () => { if (confirm('Supprimer cette chute ?')) { await deleteStockRemnant(r.id); setRemnants(await fetchStockRemnants()); } }}
                          className="text-red-400 hover:text-red-300 text-xs">Suppr.</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {remnants.length === 0 && <p className="text-gray-500 text-sm text-center py-6">Aucune chute enregistree. Les chutes seront creees automatiquement apres chaque optimisation de coupe.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Settings View ──────────────────────────────────────────────────

function SettingsView({ settings, onSave, onBack }: {
  settings: Settings;
  onSave: (s: Settings) => void;
  onBack: () => void;
}) {
  const [glass, setGlass] = useState({ ...settings.glassSettings });
  const [saved, setSaved] = useState(false);

  const save = () => {
    onSave({ ...settings, glassSettings: glass });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="text-gray-500 hover:text-white text-sm">&larr; Retour</button>
        <h2 className="text-xl font-bold text-white">Parametres optimisation</h2>
        {saved && <span className="text-green-400 text-sm ml-auto">Enregistre</span>}
      </div>

      <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35] space-y-4">
        <h3 className="text-sm font-bold text-amber-400">Machine de coupe</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setGlass(g => ({ ...g, machine: 'lisec' }))}
            className={`p-4 rounded-xl border-2 text-left transition-colors ${glass.machine === 'lisec'
              ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] hover:border-gray-600'}`}>
            <div className="text-white font-bold">LISEC</div>
            <div className="text-xs text-gray-400 mt-1">3 stages — coupe 2 axes</div>
            <div className="text-xs text-gray-500 mt-1">Float, feuillete mince</div>
          </button>
          <button onClick={() => setGlass(g => ({ ...g, machine: 'bottero' }))}
            className={`p-4 rounded-xl border-2 text-left transition-colors ${glass.machine === 'bottero'
              ? 'border-green-500 bg-green-600/10' : 'border-[#2a2d35] hover:border-gray-600'}`}>
            <div className="text-white font-bold">Bottero</div>
            <div className="text-xs text-gray-400 mt-1">2 stages — coupe axe unique</div>
            <div className="text-xs text-gray-500 mt-1">Feuillete epais</div>
          </button>
        </div>
      </div>

      <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35] space-y-4">
        <h3 className="text-sm font-bold text-amber-400">Parametres de coupe</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Marge de bord (mm)</label>
            <input type="number" value={glass.edgeTrimMargin} min={0} max={50}
              onChange={e => setGlass(g => ({ ...g, edgeTrimMargin: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Ecart de coupe (mm)</label>
            <input type="number" value={glass.cuttingGap} min={0} max={20}
              onChange={e => setGlass(g => ({ ...g, cuttingGap: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Largeur min bande (mm)</label>
            <input type="number" value={glass.minStripWidth} min={0} max={100}
              onChange={e => setGlass(g => ({ ...g, minStripWidth: Number(e.target.value) }))}
              className="w-full px-3 py-2 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
          </div>
        </div>
      </div>

      <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35] space-y-4">
        <h3 className="text-sm font-bold text-amber-400">Formats de plaque</h3>
        <div className="space-y-2">
          {glass.plateFormats.map((fmt, i) => (
            <div key={i} className="flex items-center gap-3">
              <input type="number" value={fmt.width} min={100}
                onChange={e => {
                  const pf = [...glass.plateFormats];
                  pf[i] = { ...pf[i], width: Number(e.target.value) };
                  setGlass(g => ({ ...g, plateFormats: pf }));
                }}
                className="w-24 px-2 py-1.5 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
              <span className="text-gray-500 text-sm">x</span>
              <input type="number" value={fmt.height} min={100}
                onChange={e => {
                  const pf = [...glass.plateFormats];
                  pf[i] = { ...pf[i], height: Number(e.target.value) };
                  setGlass(g => ({ ...g, plateFormats: pf }));
                }}
                className="w-24 px-2 py-1.5 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
              <input type="text" value={fmt.label}
                onChange={e => {
                  const pf = [...glass.plateFormats];
                  pf[i] = { ...pf[i], label: e.target.value };
                  setGlass(g => ({ ...g, plateFormats: pf }));
                }}
                className="flex-1 px-2 py-1.5 bg-[#14161d] border border-[#2a2d35] rounded text-white text-sm" />
              {glass.plateFormats.length > 1 && (
                <button onClick={() => setGlass(g => ({ ...g, plateFormats: g.plateFormats.filter((_, j) => j !== i) }))}
                  className="text-red-400 hover:text-red-300 text-xs">Suppr.</button>
              )}
            </div>
          ))}
          <button onClick={() => setGlass(g => ({
            ...g, plateFormats: [...g.plateFormats, { width: 3210, height: 2550, label: `Format ${g.plateFormats.length + 1}` }],
          }))} className="text-xs text-blue-400 hover:text-blue-300">+ Ajouter un format</button>
        </div>
      </div>

      <button onClick={save}
        className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-colors active:scale-[0.98]">
        Enregistrer
      </button>
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────

type ViewMode = { type: 'home' } | { type: 'dashboard' } | { type: 'order'; id: string } | { type: 'batch'; ids: string[] } | { type: 'production' } | { type: 'production-atelier' } | { type: 'stock' } | { type: 'settings' };

export function VitrageApp({ onBack, startAtelier }: { onBack: () => void; startAtelier?: boolean }) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [settings, setSettingsState] = useState<Settings>({
    averySettings: DEFAULT_AVERY, weSettings: DEFAULT_WE, glassSettings: DEFAULT_GLASS,
  });
  const [view, setView] = useState<ViewMode>(startAtelier ? { type: 'production-atelier' } : { type: 'home' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    (async () => {
      try {
        const [cmds, sets] = await Promise.all([fetchCommandes(), fetchSettings()]);
        setCommandes(cmds);
        setSettingsState(sets);
      } catch (err) {
        setError(`Erreur chargement API : ${err}`);
      }
      setLoading(false);
    })();
  }, []);

  const reload = useCallback(async () => {
    try { setCommandes(await fetchCommandes()); } catch { /* ignore */ }
  }, []);

  const handleImportGlobal = async (gc: CommandeGlobale) => {
    const vData = gc.vitrage as VitrageModuleData;
    if (!vData.vitrages || vData.vitrages.length === 0) return;

    // Check if already imported
    const existing = commandes.find(c => c.reference.trim() === gc.ref.trim());
    if (existing) {
      // Update vitrages from global
      const patch: Partial<Commande> = {
        vitrages: vData.vitrages,
        client: gc.client || existing.client,
        semaineFabrication: gc.semaine_fab || existing.semaineFabrication,
        semaineLivraison: gc.semaine_liv || existing.semaineLivraison,
      };
      try {
        await patchCommande(existing.id, patch);
        setCommandes(prev => prev.map(c => c.id === existing.id ? { ...c, ...patch } : c));
        setView({ type: 'order', id: existing.id });
      } catch (err) { setError(`Erreur mise a jour : ${err}`); }
      return;
    }

    // Create new local commande from global data
    const now = new Date();
    const cmd: Commande = {
      id: uuid(),
      reference: gc.ref,
      client: gc.client || gc.chantier || '',
      dateCreation: now.toISOString().slice(0, 10),
      semaineFabrication: gc.semaine_fab || '',
      semaineLivraison: gc.semaine_liv || '',
      statut: 'en_attente',
      vitrages: vData.vitrages,
      lotFabrication: { ...EMPTY_LOT },
      notes: '',
    };
    try {
      await insertCommande(cmd);
      setCommandes(prev => [cmd, ...prev]);
      setView({ type: 'order', id: cmd.id });
      syncVitrageToGlobal(cmd);
    } catch (err) { setError(`Erreur import global : ${err}`); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette commande ?')) return;
    try {
      await removeCommande(id);
      setCommandes(prev => prev.filter(c => c.id !== id));
      if (view.type === 'order' && view.id === id) setView({ type: 'dashboard' });
    } catch (err) { setError(`Erreur suppression : ${err}`); }
  };

  const pendingPatch = useRef<Record<string, unknown>>({});
  const handleUpdate = useCallback((id: string, patch: Partial<Commande>) => {
    setCommandes(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    Object.assign(pendingPatch.current, patch);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const toSave = { ...pendingPatch.current };
      pendingPatch.current = {};
      try {
        await patchCommande(id, toSave as Partial<Commande>);
        // Sync to global dashboard when relevant fields change
        if ('vitrages' in toSave || 'statut' in toSave || 'client' in toSave || 'reference' in toSave || 'semaineFabrication' in toSave || 'semaineLivraison' in toSave) {
          setCommandes(prev => {
            const cmd = prev.find(c => c.id === id);
            if (cmd) {
              syncVitrageToGlobal(cmd);
            }
            return prev;
          });
        }
      } catch (err) { console.error('Save error:', err); }
    }, 800);
  }, []);


  const goHome = () => { setView({ type: 'home' }); reload(); };

  const renderContent = () => {
    if (loading) return <p className="text-gray-500 text-center py-12">Chargement...</p>;

    if (view.type === 'order') {
      const selected = commandes.find(c => c.id === view.id);
      if (!selected) return null;
      return (
        <OrderDetail
          commande={selected}
          onUpdate={patch => handleUpdate(view.id, patch)}
          onBack={goHome}
        />
      );
    }
    if (view.type === 'batch') {
      const batchCmds = commandes.filter(c => view.ids.includes(c.id));
      if (batchCmds.length === 0) return null;
      return (
        <BatchView
          commandes={batchCmds}
          onBack={goHome}
          avery={settings.averySettings} we={settings.weSettings} glass={settings.glassSettings}
        />
      );
    }
    if (view.type === 'production') {
      return <ProductionView onBack={goHome} />;
    }
    if (view.type === 'production-atelier') {
      return <ProductionView onBack={goHome} startAtelier />;
    }
    if (view.type === 'stock') {
      return <StockView onBack={goHome} />;
    }
    if (view.type === 'settings') {
      return (
        <SettingsView
          settings={settings}
          onSave={async (s) => {
            setSettingsState(s);
            try { await saveSettings(s); } catch { /* ignore */ }
          }}
          onBack={goHome}
        />
      );
    }
    if (view.type === 'home') {
      return (
        <div className="max-w-2xl mx-auto py-16 px-6">
          <h1 className="text-3xl font-black text-white text-center mb-2">ISULA VITRAGE</h1>
          <p className="text-gray-500 text-center mb-10">Gestion commandes, optimisation coupe, production</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setView({ type: 'dashboard' })}
              className="p-6 bg-blue-700 hover:bg-blue-600 text-white rounded-2xl text-left transition-colors active:scale-[0.98]">
              <div className="text-xl font-bold">COMMANDES</div>
              <div className="text-sm text-blue-200 mt-1">Import, vitrages, optimisation, lots de coupe</div>
              <div className="text-xs text-blue-300 mt-2">{commandes.length} commande{commandes.length > 1 ? 's' : ''}</div>
            </button>
            <button onClick={() => setView({ type: 'stock' })}
              className="p-6 bg-purple-700 hover:bg-purple-600 text-white rounded-2xl text-left transition-colors active:scale-[0.98]">
              <div className="text-xl font-bold">CATALOGUE & STOCK</div>
              <div className="text-sm text-purple-200 mt-1">Types de verre, stock plaques</div>
            </button>
            <button onClick={() => setView({ type: 'production' })}
              className="p-6 bg-green-700 hover:bg-green-600 text-white rounded-2xl text-left transition-colors active:scale-[0.98]">
              <div className="text-xl font-bold">PRODUCTION</div>
              <div className="text-sm text-green-200 mt-1">Suivi lots, pieces, statistiques</div>
            </button>
            <button onClick={() => setView({ type: 'production-atelier' })}
              className="p-6 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl text-left transition-colors active:scale-[0.98]">
              <div className="text-xl font-bold">MODE ATELIER</div>
              <div className="text-sm text-orange-200 mt-1">Interface operateur plein ecran</div>
            </button>
          </div>
          <button onClick={() => setView({ type: 'settings' })}
            className="mt-6 w-full p-4 bg-[#181a20] hover:bg-[#1e2028] border border-[#2a2d35] text-gray-400 hover:text-white rounded-2xl text-left transition-colors active:scale-[0.98]">
            <div className="text-sm font-bold">Parametres</div>
            <div className="text-xs text-gray-600 mt-1">Machine par defaut, formats de plaque, marges</div>
          </button>
        </div>
      );
    }
    return (
      <Dashboard
        commandes={commandes}
        onSelect={id => setView({ type: 'order', id })}
        onDelete={handleDelete}
        onBatch={ids => setView({ type: 'batch', ids })}
        onImportGlobal={handleImportGlobal}
      />
    );
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">Accueil</button>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-bold text-blue-400">ISULA VITRAGE</span>
          </div>
        </div>
      </header>
      {error && (
        <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-2">
          <div className="max-w-6xl mx-auto text-red-400 text-xs">{error}
            <button onClick={() => setError('')} className="ml-4 text-red-500 hover:text-red-300">x</button>
          </div>
        </div>
      )}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {renderContent()}
      </main>
    </div>
  );
}
