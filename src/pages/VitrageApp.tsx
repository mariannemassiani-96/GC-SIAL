import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type {
  Commande, Vitrage, AverySettings, WESettings, GlassSettings,
  CommandeStatut, WEGroupe, GlassOptimResult, OptimizedPlate, LotFabrication,
} from '../vitrage/types';
import {
  EMPTY_LOT, DEFAULT_AVERY, DEFAULT_WE, DEFAULT_GLASS, STATUT_LABELS, STATUT_COLORS,
} from '../vitrage/types';
import { parseVitrageSpec } from '../vitrage/parseVitrageSpec';
import { parseExcelFile, parseCSVText, type ParseResult } from '../vitrage/parseExcel';
import { optimizeWE } from '../vitrage/optimizeWE';
import { optimizeGlass, extractGlassPieces } from '../vitrage/optimize2D';
import { hasBackend, apiOptimize, apiExportDXF, apiExportOPT, apiLabelsZPL } from '../vitrage/api';
import { generateLabelsA, generateLabelsB, generateLabelsC } from '../vitrage/generateLabels';
import { ProductionView } from '../vitrage/ProductionView';
import { generateFicheWE } from '../vitrage/generateFicheWE';
import { generateEtiquettesCE, generateEtiquettesAtelier, generateEtiquettesPostCoupe, generateEtiquettesWE } from '../vitrage/generateLabelsIndustrial';
import {
  fetchCommandes, insertCommande, patchCommande, removeCommande,
  fetchSettings, saveSettings, type Settings,
} from '../vitrage/store';
import { v4 as uuid } from 'uuid';

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

// ── Dashboard ────────────────────────────────────────────────────────

function Dashboard({ commandes, onSelect, onNew, onDelete, onBatch, onProduction }: {
  commandes: Commande[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onBatch: (ids: string[]) => void;
  onProduction: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filtre, setFiltre] = useState<CommandeStatut | 'all'>('all');
  const stats = useMemo(() => {
    const s = { total: commandes.length, en_attente: 0, en_cours: 0, terminee: 0, livree: 0, totalVitrages: 0 };
    for (const c of commandes) { s[c.statut]++; s.totalVitrages += c.vitrages.length; }
    return s;
  }, [commandes]);

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
          <button onClick={onProduction} className="px-4 py-2 bg-green-700 hover:bg-green-600 text-white text-sm rounded-lg transition-colors">
            Production
          </button>
          <button onClick={onNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
            + Nouvelle commande
          </button>
        </div>
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
        <p className="text-gray-500 text-sm text-center py-12">Aucune commande. Cliquez sur "+ Nouvelle commande" pour commencer.</p>
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
        setGlassResult(optimizeGlass(vitrages, glass));
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

const TABS = ['Import', 'Vitrages', 'Optim Verre', 'Warm Edge', 'Etiquettes', 'Lots & Tracabilite', 'Parametres'] as const;

function OrderDetail({ commande, onUpdate, onBack, avery, we, glass, onAvery, onWE, onGlass }: {
  commande: Commande;
  onUpdate: (patch: Partial<Commande>) => void;
  onBack: () => void;
  avery: AverySettings; we: WESettings; glass: GlassSettings;
  onAvery: (s: AverySettings) => void; onWE: (s: WESettings) => void; onGlass: (s: GlassSettings) => void;
}) {
  const [tab, setTab] = useState(0);
  const c = commande;

  const weResult = useMemo(() => c.vitrages.length > 0 ? optimizeWE(c.vitrages, we) : [], [c.vitrages, we]);
  const { glassResult, loading: optimLoading, backend: usingBackend } = useOptimization(c.vitrages, glass);
  const allPlates = useMemo(() => glassResult.flatMap(g => g.plates), [glassResult]);

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

      {tab === 0 && <TabImport vitrages={c.vitrages} onUpdate={v => onUpdate({ vitrages: v })} onSetRef={ref => onUpdate({ reference: ref })} />}
      {tab === 1 && <TabVitrages vitrages={c.vitrages} onUpdate={v => onUpdate({ vitrages: v })} />}
      {tab === 2 && <TabGlass results={glassResult} loading={optimLoading} backend={usingBackend} />}
      {tab === 3 && <TabWE results={weResult} />}
      {tab === 4 && <TabExport vitrages={c.vitrages} allPlates={allPlates} weResult={weResult}
        commandeLabel={`${c.reference} — ${c.client}`} commande={c} avery={avery} we={we} />}
      {tab === 5 && <TabLots lot={c.lotFabrication ?? { ...EMPTY_LOT }} onUpdate={l => onUpdate({ lotFabrication: l })} />}
      {tab === 6 && <TabSettings avery={avery} we={we} glass={glass} onAvery={onAvery} onWE={onWE} onGlass={onGlass} />}
    </div>
  );
}

// ── Tab: Import ──────────────────────────────────────────────────────

function TabImport({ vitrages, onUpdate, onSetRef }: { vitrages: Vitrage[]; onUpdate: (v: Vitrage[]) => void; onSetRef?: (ref: string) => void }) {
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResult = (result: ParseResult, fileName: string) => {
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
      setInfo(`${fileName} : ${result.vitrages.length} vitrages importes (${result.totalRows} lignes, ${result.skippedRows} ignorees). Colonnes : ${colInfo}${result.lotInfo ? `\nLot : ${result.lotInfo}` : ''}`);
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
      if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
        const text = await file.text();
        result = parseCSVText(text);
      } else {
        result = await parseExcelFile(file);
      }
      handleResult(result, file.name);
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
          <input type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={handleFile} className="hidden" />
          <div className="text-blue-400 text-sm font-semibold">Import Excel / CSV</div>
          <div className="text-xs text-gray-500 mt-1">.xlsx, .xls, .csv, .tsv</div>
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

// ── Tab: Glass Optimization ──────────────────────────────────────────

function TabGlass({ results, loading, backend }: { results: GlassOptimResult[]; loading?: boolean; backend?: boolean }) {
  if (loading) return <p className="text-blue-400 text-sm">Optimisation en cours (rectpack)...</p>;
  if (results.length === 0) return <p className="text-gray-500 text-sm">Importez des vitrages pour voir l'optimisation.</p>;

  const totalInterdit = results.reduce((s, r) => s + r.plates.filter(p => p.hasInterdit).length, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-green-500/30 border border-green-500/50" /> Stockable (&gt;300mm)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-amber-500/30 border border-amber-500/50" /> Surveiller (250-300)</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-red-500/30 border border-red-500/50" /> Interdit (50-250)</span>
        {totalInterdit > 0 && <span className="text-red-400 font-semibold ml-4">{totalInterdit} plaque(s) avec chutes interdites</span>}
        {backend && <span className="text-green-400 ml-auto text-[10px] px-2 py-0.5 rounded bg-green-500/10 border border-green-500/20">rectpack (serveur)</span>}
        {!backend && <span className="text-gray-500 ml-auto text-[10px] px-2 py-0.5 rounded bg-gray-500/10 border border-gray-500/20">JS local</span>}
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
  const scale = 180 / Math.max(plate.plateWidth, plate.plateHeight);
  const w = plate.plateWidth * scale;
  const h = plate.plateHeight * scale;
  const remnantColors: Record<string, string> = {
    poussiere: '#333', interdit: '#ef4444', surveiller: '#f59e0b', stockable: '#22c55e',
  };

  return (
    <div className={`bg-[#14161d] rounded p-3 ${plate.hasInterdit ? 'border border-red-500/50' : ''}`}>
      <div className="text-xs text-gray-400 mb-2">
        Plaque {plate.numero} — {plate.plateWidth}x{plate.plateHeight} — <span className="text-green-400">{plate.utilisation.toFixed(0)}%</span> — {plate.pieces.length} pcs
        {plate.hasInterdit && <span className="text-red-400 ml-2">Chute interdite</span>}
      </div>
      <svg viewBox={`0 0 ${w + 4} ${h + 4}`} className="w-full" style={{ maxHeight: 160 }}>
        <rect x={2} y={2} width={w} height={h} fill="#1e2028" stroke="#333" strokeWidth={0.5} />
        {(plate.remnants ?? []).map((r, i) => (
          <rect key={`r${i}`} x={2 + r.x * scale} y={2 + r.y * scale}
            width={r.w * scale} height={r.h * scale}
            fill={remnantColors[r.classe]} opacity={0.15}
            stroke={remnantColors[r.classe]} strokeWidth={0.3} strokeDasharray="2,1" />
        ))}
        {plate.pieces.map((p, i) => {
          const pw = (p.rotated ? p.height : p.width) * scale;
          const ph = (p.rotated ? p.width : p.height) * scale;
          const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];
          return (
            <g key={i}>
              <rect x={2 + p.x * scale} y={2 + p.y * scale} width={pw} height={ph}
                fill={colors[i % colors.length]} opacity={0.3} stroke={colors[i % colors.length]} strokeWidth={0.5} />
              <text x={2 + p.x * scale + pw / 2} y={2 + p.y * scale + ph / 2}
                textAnchor="middle" dominantBaseline="middle" fill="white" fontSize={Math.min(pw, ph) > 15 ? 5 : 3}>
                {p.vitrageRef}
              </text>
            </g>
          );
        })}
      </svg>
      {(plate.remnants ?? []).filter(r => r.classe !== 'poussiere').length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {(plate.remnants ?? []).filter(r => r.classe !== 'poussiere').map((r, i) => (
            <span key={i} className={`text-[9px] px-1 rounded ${
              r.classe === 'interdit' ? 'bg-red-500/20 text-red-400' :
              r.classe === 'surveiller' ? 'bg-amber-500/20 text-amber-400' :
              'bg-green-500/20 text-green-400'
            }`}>{r.w}x{r.h}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab: WE ──────────────────────────────────────────────────────────

function TabWE({ results }: { results: WEGroupe[] }) {
  if (results.length === 0) return <p className="text-gray-500 text-sm">Importez des vitrages pour voir l'optimisation WE.</p>;

  return (
    <div className="space-y-4">
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

// ── Tab: Lots & Tracabilite ───────────────────────────────────────────

const LOT_FIELDS: { key: keyof LotFabrication; label: string; placeholder: string }[] = [
  { key: 'verreExt', label: 'Verre exterieur', placeholder: 'N° lot fournisseur' },
  { key: 'verreInt', label: 'Verre interieur', placeholder: 'N° lot fournisseur' },
  { key: 'intercalaire', label: 'Intercalaire / Warm Edge', placeholder: 'N° lot' },
  { key: 'dessiccant', label: 'Dessiccant (tamis)', placeholder: 'N° lot + date ouverture' },
  { key: 'masticButyl', label: 'Mastic butyl (1re barriere)', placeholder: 'N° lot' },
  { key: 'masticPU', label: 'Mastic PU (2e barriere)', placeholder: 'N° lot' },
  { key: 'gazArgon', label: 'Gaz argon', placeholder: 'N° lot bouteille' },
];

function TabLots({ lot, onUpdate }: { lot: LotFabrication; onUpdate: (l: LotFabrication) => void }) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-400">
        Tracabilite CEKAL — enregistrer les N° de lot des matieres premieres utilisees pour ce lot de fabrication.
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LOT_FIELDS.map(f => (
          <div key={f.key} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
            <label className="text-xs text-gray-400 block mb-1.5">{f.label}</label>
            <input
              value={(lot[f.key] as string) ?? ''}
              onChange={e => onUpdate({ ...lot, [f.key]: e.target.value })}
              placeholder={f.placeholder}
              className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white w-full focus:border-blue-500 outline-none"
            />
          </div>
        ))}
      </div>
      <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
        <label className="text-xs text-gray-400 block mb-1.5">Notes / observations</label>
        <textarea
          value={lot.notes ?? ''}
          onChange={e => onUpdate({ ...lot, notes: e.target.value })}
          placeholder="Remarques, conditions de stockage, NC detectees..."
          rows={3}
          className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white w-full resize-y focus:border-blue-500 outline-none"
        />
      </div>
    </div>
  );
}

// ── Tab: Settings ────────────────────────────────────────────────────

function TabSettings({ avery, we, glass, onAvery, onWE, onGlass }: {
  avery: AverySettings; we: WESettings; glass: GlassSettings;
  onAvery: (s: AverySettings) => void; onWE: (s: WESettings) => void; onGlass: (s: GlassSettings) => void;
}) {
  const numInput = (label: string, value: number, onChange: (n: number) => void, step = 1) => (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <input type="number" step={step} value={value} onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white w-full" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Padding Avery (mm)</h4>
        <div className="grid grid-cols-4 gap-3">
          {numInput('Gauche', avery.paddingLeft, v => onAvery({ ...avery, paddingLeft: v }), 0.5)}
          {numInput('Droite', avery.paddingRight, v => onAvery({ ...avery, paddingRight: v }), 0.5)}
          {numInput('Haut', avery.paddingTop, v => onAvery({ ...avery, paddingTop: v }), 0.5)}
          {numInput('Bas', avery.paddingBottom, v => onAvery({ ...avery, paddingBottom: v }), 0.5)}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Plaques de verre</h4>
        <div className="grid grid-cols-3 gap-3">
          {numInput('Largeur (mm)', glass.plateWidth, v => onGlass({ ...glass, plateWidth: v }))}
          {numInput('Hauteur (mm)', glass.plateHeight, v => onGlass({ ...glass, plateHeight: v }))}
          {numInput('Trait de scie (mm)', glass.cuttingGap, v => onGlass({ ...glass, cuttingGap: v }))}
          {numInput('Marge rive (mm)', glass.edgeTrimMargin ?? 15, v => onGlass({ ...glass, edgeTrimMargin: v }))}
        </div>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Warm Edge</h4>
        <div className="grid grid-cols-3 gap-3">
          {numInput('Barre (mm)', we.barreLength, v => onWE({ ...we, barreLength: v }))}
          {numInput('Marge (mm)', we.marge, v => onWE({ ...we, marge: v }))}
          {numInput('Trait de scie (mm)', we.kerf, v => onWE({ ...we, kerf: v }))}
        </div>
      </div>
    </div>
  );
}

// ── Batch View (multi-order) ─────────────────────────────────────────

const BATCH_TABS = ['Vitrages', 'Optim Verre', 'Warm Edge', 'Etiquettes'] as const;

function BatchView({ commandes, onBack, avery, we, glass }: {
  commandes: Commande[];
  onBack: () => void;
  avery: AverySettings; we: WESettings; glass: GlassSettings;
}) {
  const [tab, setTab] = useState(0);
  const allVitrages = useMemo(() => commandes.flatMap(c => c.vitrages), [commandes]);
  const batchLabel = commandes.map(c => c.reference).join(' + ');
  const weResult = useMemo(() => allVitrages.length > 0 ? optimizeWE(allVitrages, we) : [], [allVitrages, we]);
  const { glassResult, loading: optimLoading, backend: usingBackend } = useOptimization(allVitrages, glass);
  const allPlates = useMemo(() => glassResult.flatMap(g => g.plates), [glassResult]);

  const [sending, setSending] = useState(false);

  const envoyerEnProduction = async () => {
    setSending(true);
    try {
      const lotId = uuid();
      const now = new Date();
      const sem = getISOWeek(now);
      const ref = `LOT-${sem}-${now.getTime().toString(36).slice(-4).toUpperCase()}`;

      const prodPieces = allPlates.flatMap(plate =>
        plate.pieces.map(p => ({
          lot_id: lotId, commande_ref: commandes.find(c => c.vitrages.some(v => v.id === p.vitrageId))?.reference || '',
          vitrage_ref: p.vitrageRef, vitrage_id: p.vitrageId,
          largeur: p.width, hauteur: p.height, composition: '',
          face: p.face, material: p.material,
          machine: p.noRotation ? 'lisec' : 'bottero', plaque_no: plate.numero,
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
        }),
      });
      alert(`Lot ${ref} cree avec ${prodPieces.length} pieces verre + ${weProd.length} WE`);
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
          <button onClick={envoyerEnProduction} disabled={sending}
            className="ml-auto px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded-lg transition-colors disabled:opacity-50">
            {sending ? 'Envoi...' : 'Envoyer en production'}
          </button>
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
      {tab === 1 && <TabGlass results={glassResult} loading={optimLoading} backend={usingBackend} />}
      {tab === 2 && <TabWE results={weResult} />}
      {tab === 3 && <TabExport vitrages={allVitrages} allPlates={allPlates} weResult={weResult}
        commandeLabel={batchLabel} avery={avery} we={we} />}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────

type ViewMode = { type: 'dashboard' } | { type: 'order'; id: string } | { type: 'batch'; ids: string[] } | { type: 'production' };

export function VitrageApp({ onBack }: { onBack: () => void }) {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [settings, setSettingsState] = useState<Settings>({
    averySettings: DEFAULT_AVERY, weSettings: DEFAULT_WE, glassSettings: DEFAULT_GLASS,
  });
  const [view, setView] = useState<ViewMode>({ type: 'dashboard' });
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

  const handleNew = async () => {
    const now = new Date();
    const cmd: Commande = {
      id: uuid(),
      reference: `CMD-${now.toISOString().slice(0, 10).replace(/-/g, '')}`,
      client: '',
      dateCreation: now.toISOString().slice(0, 10),
      semaineFabrication: '',
      semaineLivraison: '',
      statut: 'en_attente',
      vitrages: [],
      lotFabrication: { ...EMPTY_LOT },
      notes: '',
    };
    try {
      await insertCommande(cmd);
      setCommandes(prev => [cmd, ...prev]);
      setView({ type: 'order', id: cmd.id });
    } catch (err) { setError(`Erreur creation : ${err}`); }
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
      try { await patchCommande(id, toSave as Partial<Commande>); } catch (err) { console.error('Save error:', err); }
    }, 800);
  }, []);

  const settingsTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const handleSettings = useCallback((patch: Partial<Settings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      clearTimeout(settingsTimer.current);
      settingsTimer.current = setTimeout(async () => {
        try { await saveSettings(next); } catch { /* ignore */ }
      }, 1000);
      return next;
    });
  }, []);

  const goHome = () => { setView({ type: 'dashboard' }); reload(); };

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
          avery={settings.averySettings} we={settings.weSettings} glass={settings.glassSettings}
          onAvery={a => handleSettings({ averySettings: a })}
          onWE={w => handleSettings({ weSettings: w })}
          onGlass={g => handleSettings({ glassSettings: g })}
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
    return (
      <Dashboard
        commandes={commandes}
        onSelect={id => setView({ type: 'order', id })}
        onNew={handleNew}
        onDelete={handleDelete}
        onBatch={ids => setView({ type: 'batch', ids })}
        onProduction={() => setView({ type: 'production' })}
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
