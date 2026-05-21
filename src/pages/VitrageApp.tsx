import { useState, useCallback, useMemo } from 'react';
import type {
  Commande, Vitrage, IsulaStore, AverySettings, WESettings, GlassSettings,
  CommandeStatut, WEGroupe, GlassOptimResult, OptimizedPlate,
} from '../vitrage/types';
import { STATUT_LABELS, STATUT_COLORS } from '../vitrage/types';
import { parseVitrageSpec } from '../vitrage/parseVitrageSpec';
import { parseExcelFile, parseCSVText, type ParseResult } from '../vitrage/parseExcel';
import { optimizeWE } from '../vitrage/optimizeWE';
import { optimizeGlass } from '../vitrage/optimize2D';
import { generateLabelsA, generateLabelsB, generateLabelsC } from '../vitrage/generateLabels';
import { generateFicheWE } from '../vitrage/generateFicheWE';
import { loadStore, saveStore, addCommande, updateCommande, deleteCommande } from '../vitrage/store';
import { v4 as uuid } from 'uuid';

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

// ── Dashboard ────────────────────────────────────────────────────────

function Dashboard({ commandes, onSelect, onNew, onDelete }: {
  commandes: Commande[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const stats = useMemo(() => {
    const s = { total: commandes.length, en_attente: 0, en_cours: 0, terminee: 0, livree: 0, totalVitrages: 0 };
    for (const c of commandes) { s[c.statut]++; s.totalVitrages += c.vitrages.length; }
    return s;
  }, [commandes]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Commandes</h2>
        <button onClick={onNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition-colors">
          + Nouvelle commande
        </button>
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

      {commandes.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-12">Aucune commande. Cliquez sur "+ Nouvelle commande" pour commencer.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-[#2a2d35] text-xs">
                <th className="text-left py-2 px-3">Reference</th>
                <th className="text-left py-2 px-3">Client</th>
                <th className="text-left py-2 px-3">Date</th>
                <th className="text-left py-2 px-3">Statut</th>
                <th className="text-right py-2 px-3">Vitrages</th>
                <th className="text-right py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {[...commandes].sort((a, b) => b.dateCreation.localeCompare(a.dateCreation)).map(c => (
                <tr key={c.id} className="border-b border-[#1e2028] hover:bg-[#1e2028] cursor-pointer" onClick={() => onSelect(c.id)}>
                  <td className="py-2.5 px-3 text-white font-mono">{c.reference}</td>
                  <td className="py-2.5 px-3 text-gray-300">{c.client}</td>
                  <td className="py-2.5 px-3 text-gray-400">{c.dateCreation}</td>
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

// ── Order Detail ─────────────────────────────────────────────────────

const TABS = ['Import', 'Vitrages', 'Optim Verre', 'Warm Edge', 'Etiquettes', 'Parametres'] as const;

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
  const glassResult = useMemo(() => c.vitrages.length > 0 ? optimizeGlass(c.vitrages, glass) : [], [c.vitrages, glass]);
  const allPlates = useMemo(() => glassResult.flatMap(g => g.plates), [glassResult]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-4">
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
      {tab === 2 && <TabGlass results={glassResult} />}
      {tab === 3 && <TabWE results={weResult} />}
      {tab === 4 && <TabExport vitrages={c.vitrages} allPlates={allPlates} weResult={weResult}
        commandeLabel={`${c.reference} — ${c.client}`} avery={avery} we={we} />}
      {tab === 5 && <TabSettings avery={avery} we={we} glass={glass} onAvery={onAvery} onWE={onWE} onGlass={onGlass} />}
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
      outerGlass: '', innerGlass: '',
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

function TabGlass({ results }: { results: GlassOptimResult[] }) {
  if (results.length === 0) return <p className="text-gray-500 text-sm">Importez des vitrages pour voir l'optimisation.</p>;

  return (
    <div className="space-y-6">
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

  return (
    <div className="bg-[#14161d] rounded p-3">
      <div className="text-xs text-gray-400 mb-2">
        Plaque {plate.numero} — {plate.plateWidth}x{plate.plateHeight} — <span className="text-green-400">{plate.utilisation.toFixed(0)}%</span> — {plate.pieces.length} pcs
      </div>
      <svg viewBox={`0 0 ${w + 4} ${h + 4}`} className="w-full" style={{ maxHeight: 160 }}>
        <rect x={2} y={2} width={w} height={h} fill="#1e2028" stroke="#333" strokeWidth={0.5} />
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

function TabExport({ vitrages, allPlates, weResult, commandeLabel, avery, we }: {
  vitrages: Vitrage[]; allPlates: OptimizedPlate[]; weResult: WEGroupe[];
  commandeLabel: string; avery: AverySettings; we: WESettings;
}) {
  const [generating, setGenerating] = useState('');

  const gen = async (type: string) => {
    setGenerating(type);
    try {
      const label = commandeLabel || 'export';
      switch (type) {
        case 'A': download(await generateLabelsA(vitrages, commandeLabel, avery), `${label}_A.pdf`); break;
        case 'B': download(await generateLabelsB(vitrages, commandeLabel, avery), `${label}_B.pdf`); break;
        case 'C': download(await generateLabelsC(vitrages, allPlates, commandeLabel, avery), `${label}_C.pdf`); break;
        case 'WE': download(await generateFicheWE(weResult, commandeLabel, we), `${label}_WE.pdf`); break;
      }
    } catch (err) { alert(`Erreur : ${err}`); }
    setGenerating('');
  };

  const has = vitrages.length > 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {[
        { id: 'A', title: 'Etiquettes assemblees', desc: `${vitrages.length} etiquettes`, color: 'blue', ok: has },
        { id: 'B', title: 'Etiquettes EXT / INT', desc: `${vitrages.length * 2} etiquettes`, color: 'green', ok: has },
        { id: 'C', title: 'Ordre de coupe', desc: `${allPlates.length} plaques`, color: 'purple', ok: has && allPlates.length > 0 },
        { id: 'WE', title: 'Fiche Warm Edge', desc: `${weResult.reduce((s, g) => s + g.totalBarres, 0)} barres`, color: 'amber', ok: has },
      ].map(d => (
        <button key={d.id} onClick={() => gen(d.id)} disabled={!d.ok || !!generating}
          className={`text-left p-5 rounded-xl border-2 bg-[#181a20] transition-all ${
            d.ok ? `border-${d.color}-500/30 hover:border-${d.color}-500/60 cursor-pointer` : 'border-[#2a2d35] opacity-40 cursor-not-allowed'}`}>
          <div className={`text-sm font-semibold text-${d.color}-400`}>{d.title}</div>
          <div className="text-xs text-gray-500 mt-1">{generating === d.id ? 'Generation...' : d.desc}</div>
        </button>
      ))}
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

// ── Main App ─────────────────────────────────────────────────────────

export function VitrageApp({ onBack }: { onBack: () => void }) {
  const [store, setStoreRaw] = useState<IsulaStore>(loadStore);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const setStore = useCallback((fn: (prev: IsulaStore) => IsulaStore) => {
    setStoreRaw(prev => { const next = fn(prev); saveStore(next); return next; });
  }, []);

  const selected = store.commandes.find(c => c.id === selectedId) ?? null;

  const handleNew = () => {
    const cmd: Commande = {
      id: uuid(),
      reference: `CMD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      client: '',
      dateCreation: new Date().toISOString().slice(0, 10),
      statut: 'en_attente',
      vitrages: [],
      notes: '',
    };
    setStore(s => addCommande(s, cmd));
    setSelectedId(cmd.id);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Supprimer cette commande ?')) return;
    setStore(s => deleteCommande(s, id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleUpdate = (patch: Partial<Commande>) => {
    if (selectedId) setStore(s => updateCommande(s, selectedId, patch));
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
      <main className="max-w-6xl mx-auto px-6 py-6">
        {selected ? (
          <OrderDetail
            commande={selected}
            onUpdate={handleUpdate}
            onBack={() => setSelectedId(null)}
            avery={store.averySettings} we={store.weSettings} glass={store.glassSettings}
            onAvery={a => setStore(s => ({ ...s, averySettings: a }))}
            onWE={w => setStore(s => ({ ...s, weSettings: w }))}
            onGlass={g => setStore(s => ({ ...s, glassSettings: g }))}
          />
        ) : (
          <Dashboard commandes={store.commandes} onSelect={setSelectedId} onNew={handleNew} onDelete={handleDelete} />
        )}
      </main>
    </div>
  );
}
