import { useState, useCallback } from 'react';
import { ArrowLeft, Upload, Check, Search, ChevronDown, ChevronRight, Scissors, Package } from 'lucide-react';
import { v4 as uid } from 'uuid';

interface Props { onBack: () => void; }

// ── Types ────────────────────────────────────────────────────────────

interface PieceCoupe {
  id: string;
  longueur: number;      // mm
  label: string;          // ex: "Raidisseur T01"
  affaireRef: string;     // ex: "GC-2026-001"
  profilRef: string;      // ref profil
  coupeG: string;         // "90" ou "45"
  coupeD: string;
}

interface BarreOptim {
  id: string;
  profilRef: string;
  profilLabel: string;
  longueurBrute: number;  // mm (6400 standard)
  pieces: PieceCoupe[];
  chute: number;          // mm restant
  tauxChute: number;      // %
  preparee: boolean;      // barre brute trouvée en stock
  coupee: boolean;        // toutes les coupes faites
}

interface OrdreCoupe {
  id: string;
  nom: string;
  date: string;
  affaireRef: string;
  barres: BarreOptim[];
  statut: 'en_attente' | 'preparation' | 'en_cours' | 'termine';
}

const STORAGE_KEY = 'sial-coupes';
const PROFIL_COLORS: Record<string, string> = {
  '180000': '#4b8fc8', '180005': '#c8a84b', '180010': '#4bc87a',
  '180020': '#c84b7a', '180030': '#7a4bc8', '180040': '#c87a4b',
};

function loadOrdres(): OrdreCoupe[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveOrdres(o: OrdreCoupe[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); }

// ── Données démo ─────────────────────────────────────────────────────

const DEMO: OrdreCoupe[] = [{
  id: uid(), nom: 'GC Dupont — Porticcio', date: '2026-04-24', affaireRef: 'GC-2026-001', statut: 'preparation',
  barres: [
    {
      id: uid(), profilRef: '180000', profilLabel: 'Raidisseur 40x20', longueurBrute: 6400,
      pieces: [
        { id: uid(), longueur: 1500, label: 'Raid. T01', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1500, label: 'Raid. T02', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1500, label: 'Raid. T03', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1500, label: 'Raid. T04', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
      ],
      chute: 400, tauxChute: 6.25, preparee: false, coupee: false,
    },
    {
      id: uid(), profilRef: '180000', profilLabel: 'Raidisseur 40x20', longueurBrute: 6400,
      pieces: [
        { id: uid(), longueur: 1200, label: 'Raid. T05', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1200, label: 'Raid. T06', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1200, label: 'Raid. T07', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1200, label: 'Raid. T08', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 1200, label: 'Raid. T09', affaireRef: 'GC-2026-001', profilRef: '180000', coupeG: '90', coupeD: '90' },
      ],
      chute: 400, tauxChute: 6.25, preparee: false, coupee: false,
    },
    {
      id: uid(), profilRef: '180010', profilLabel: 'Lisse 46.5x20', longueurBrute: 6400,
      pieces: [
        { id: uid(), longueur: 2100, label: 'Lisse T01', affaireRef: 'GC-2026-001', profilRef: '180010', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 2100, label: 'Lisse T02', affaireRef: 'GC-2026-001', profilRef: '180010', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 2100, label: 'Lisse T03', affaireRef: 'GC-2026-001', profilRef: '180010', coupeG: '90', coupeD: '90' },
      ],
      chute: 100, tauxChute: 1.56, preparee: false, coupee: false,
    },
    {
      id: uid(), profilRef: '180030', profilLabel: 'Main courante 52x25', longueurBrute: 6400,
      pieces: [
        { id: uid(), longueur: 3200, label: 'MC T01', affaireRef: 'GC-2026-001', profilRef: '180030', coupeG: '90', coupeD: '90' },
        { id: uid(), longueur: 3100, label: 'MC T02', affaireRef: 'GC-2026-001', profilRef: '180030', coupeG: '90', coupeD: '45' },
      ],
      chute: 100, tauxChute: 1.56, preparee: false, coupee: false,
    },
  ],
}];

// ── Composant principal ──────────────────────────────────────────────

export function PosteCoupe({ onBack }: Props) {
  const [ordres, setOrdres] = useState<OrdreCoupe[]>(() => {
    const saved = loadOrdres();
    return saved.length > 0 ? saved : DEMO;
  });
  const [selectedOrdreId, setSelectedOrdreId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const persist = useCallback((next: OrdreCoupe[]) => { setOrdres(next); saveOrdres(next); }, []);

  const selectedOrdre = ordres.find(o => o.id === selectedOrdreId) ?? null;

  const updateBarre = useCallback((ordreId: string, barreId: string, patch: Partial<BarreOptim>) => {
    persist(ordres.map(o => o.id === ordreId ? {
      ...o, barres: o.barres.map(b => b.id === barreId ? { ...b, ...patch } : b),
    } : o));
  }, [ordres, persist]);

  const updateOrdreStatut = useCallback((ordreId: string, statut: OrdreCoupe['statut']) => {
    persist(ordres.map(o => o.id === ordreId ? { ...o, statut } : o));
  }, [ordres, persist]);

  // Import JSON (depuis le configurateur GC exportOptimisation)
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          const ordre: OrdreCoupe = {
            id: uid(), nom: file.name.replace('.json', ''), date: new Date().toISOString().slice(0, 10),
            affaireRef: data.ref ?? '', statut: 'en_attente',
            barres: (data.optimBarres ?? data.barres ?? []).map((b: any) => ({
              id: uid(), profilRef: b.ref ?? b.profilRef ?? '', profilLabel: b.label ?? b.profilLabel ?? '',
              longueurBrute: b.longueurBrute ?? 6400,
              pieces: (b.pieces ?? b.barres?.[0]?.pieces ?? []).map((p: any) => ({
                id: uid(), longueur: p.longueur, label: p.label ?? '', affaireRef: p.traveeRef ?? '',
                profilRef: b.ref ?? '', coupeG: p.coupeG ?? '90', coupeD: p.coupeD ?? '90',
              })),
              chute: b.chute ?? 0, tauxChute: b.tauxChute ?? 0, preparee: false, coupee: false,
            })),
          };
          persist([ordre, ...ordres]);
          setSelectedOrdreId(ordre.id);
        } catch (e) { alert('Erreur import : ' + e); }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [ordres, persist]);

  // ── Vue Liste ──
  if (!selectedOrdre) {
    const filtered = ordres.filter(o => {
      if (!search) return true;
      const q = search.toLowerCase();
      return o.nom.toLowerCase().includes(q) || o.affaireRef.toLowerCase().includes(q);
    });

    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-sm font-bold text-white">Poste de Coupe</h1>
                <p className="text-[10px] text-gray-500">Optimisation barres — preparation et validation coupes</p>
              </div>
            </div>
            <button onClick={handleImport}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
              <Upload size={14} /> Importer optimisation
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher affaire..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
          </div>

          {filtered.sort((a, b) => b.date.localeCompare(a.date)).map(o => {
            const nbBarres = o.barres.length;
            const nbPreparees = o.barres.filter(b => b.preparee).length;
            const nbCoupees = o.barres.filter(b => b.coupee).length;
            const statutColors: Record<string, string> = {
              en_attente: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
              preparation: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
              en_cours: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
              termine: 'bg-green-600/20 text-green-400 border-green-500/30',
            };
            return (
              <button key={o.id} onClick={() => setSelectedOrdreId(o.id)}
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-left hover:border-[#404550] transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Scissors size={14} className="text-gray-500" />
                      <span className="text-sm font-bold text-white">{o.nom}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded border ${statutColors[o.statut]}`}>
                        {o.statut === 'en_attente' ? 'En attente' : o.statut === 'preparation' ? 'Preparation' : o.statut === 'en_cours' ? 'En coupe' : 'Termine'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                      <span>{o.date}</span>
                      <span>{o.affaireRef}</span>
                      <span>{nbBarres} barres</span>
                      <span>Prep: {nbPreparees}/{nbBarres}</span>
                      <span>Coupe: {nbCoupees}/{nbBarres}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </button>
            );
          })}
        </main>
      </div>
    );
  }

  // ── Vue Detail Ordre de Coupe ──
  const nbBarres = selectedOrdre.barres.length;
  const nbPrep = selectedOrdre.barres.filter(b => b.preparee).length;
  const nbCoupe = selectedOrdre.barres.filter(b => b.coupee).length;
  const totalPieces = selectedOrdre.barres.reduce((s, b) => s + b.pieces.length, 0);
  const chuteGlobale = selectedOrdre.barres.reduce((s, b) => s + b.chute, 0);
  const longueurTotale = selectedOrdre.barres.reduce((s, b) => s + b.longueurBrute, 0);
  const tauxChuteGlobal = longueurTotale > 0 ? (chuteGlobale / longueurTotale * 100) : 0;

  // Grouper par profil
  const profilGroups = new Map<string, BarreOptim[]>();
  for (const b of selectedOrdre.barres) {
    const list = profilGroups.get(b.profilRef) ?? [];
    list.push(b);
    profilGroups.set(b.profilRef, list);
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedOrdreId(null)} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-sm font-bold text-white">{selectedOrdre.nom}</h1>
              <p className="text-[10px] text-gray-500">{selectedOrdre.date} — {selectedOrdre.affaireRef}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(['en_attente', 'preparation', 'en_cours', 'termine'] as const).map(s => {
              const labels: Record<string, string> = { en_attente: 'Attente', preparation: 'Prep.', en_cours: 'Coupe', termine: 'Fini' };
              const active = selectedOrdre.statut === s;
              return (
                <button key={s} onClick={() => updateOrdreStatut(selectedOrdre.id, s)}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium border transition-all ${active ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-600 border-[#353840]'}`}>
                  {labels[s]}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-6xl mx-auto w-full space-y-5">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Barres</p><p className="text-lg font-bold text-white">{nbBarres}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Pieces</p><p className="text-lg font-bold text-blue-400">{totalPieces}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Preparees</p><p className="text-lg font-bold text-amber-400">{nbPrep}/{nbBarres}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Coupees</p><p className="text-lg font-bold text-green-400">{nbCoupe}/{nbBarres}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3 text-center">
            <p className="text-[10px] text-gray-500">Chute</p><p className={`text-lg font-bold ${tauxChuteGlobal > 15 ? 'text-red-400' : tauxChuteGlobal > 8 ? 'text-amber-400' : 'text-green-400'}`}>{tauxChuteGlobal.toFixed(1)}%</p>
          </div>
        </div>

        {/* Progression globale */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs text-gray-500">Preparation</span>
              <div className="flex-1 h-2 bg-[#252830] rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${nbBarres > 0 ? (nbPrep / nbBarres) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400">{nbPrep}/{nbBarres}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Coupe</span>
              <div className="flex-1 h-2 bg-[#252830] rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${nbBarres > 0 ? (nbCoupe / nbBarres) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-gray-400">{nbCoupe}/{nbBarres}</span>
            </div>
          </div>
        </div>

        {/* Barres groupées par profil */}
        {[...profilGroups.entries()].map(([profilRef, barres]) => {
          const color = PROFIL_COLORS[profilRef] ?? '#60a5fa';
          const label = barres[0]?.profilLabel ?? profilRef;
          return (
            <div key={profilRef} className="space-y-2">
              {/* En-tête profil */}
              <div className="flex items-center gap-3 px-1">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
                <span className="text-sm font-bold text-white">{label}</span>
                <span className="text-xs text-gray-500">({barres.length} barre{barres.length > 1 ? 's' : ''})</span>
              </div>

              {/* Chaque barre */}
              {barres.map((barre, barreIdx) => (
                <BarreVisu key={barre.id} barre={barre} barreIdx={barreIdx} color={color}
                  onTogglePrep={() => updateBarre(selectedOrdre.id, barre.id, { preparee: !barre.preparee })}
                  onToggleCoupe={() => updateBarre(selectedOrdre.id, barre.id, { coupee: !barre.coupee })}
                />
              ))}
            </div>
          );
        })}

        {/* Bouton terminer */}
        {nbCoupe === nbBarres && nbBarres > 0 && selectedOrdre.statut !== 'termine' && (
          <button onClick={() => updateOrdreStatut(selectedOrdre.id, 'termine')}
            className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm">
            <Check size={16} className="inline mr-2" /> Toutes les barres sont coupees — Terminer
          </button>
        )}
      </main>
    </div>
  );
}

// ── Visualisation d'une barre optimisée ──────────────────────────────

function BarreVisu({ barre, barreIdx, color, onTogglePrep, onToggleCoupe }: {
  barre: BarreOptim; barreIdx: number; color: string;
  onTogglePrep: () => void; onToggleCoupe: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const svgW = 600;
  const svgH = 50;
  const margin = 10;
  const barW = svgW - 2 * margin;
  const scale = barW / barre.longueurBrute;

  return (
    <div className={`bg-[#181a20] border rounded-xl overflow-hidden transition-all ${
      barre.coupee ? 'border-green-500/30 opacity-60' : barre.preparee ? 'border-amber-500/30' : 'border-[#2a2d35]'
    }`}>
      {/* Header barre */}
      <div className="flex items-center gap-3 px-4 py-2 cursor-pointer hover:bg-[#1c1e24]" onClick={() => setExpanded(!expanded)}>
        <span className="text-xs text-gray-600 w-8">B{barreIdx + 1}</span>

        {/* Checkbox Préparée */}
        <button onClick={e => { e.stopPropagation(); onTogglePrep(); }}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            barre.preparee ? 'bg-amber-600 border-amber-500' : 'border-[#404550] hover:border-amber-500'
          }`} title="Barre preparee (trouvee en stock)">
          {barre.preparee && <Package size={12} className="text-white" />}
        </button>

        {/* SVG optimisation visuelle */}
        <svg width={svgW} height={svgH} className="flex-1" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMinYMid meet">
          {/* Fond barre brute */}
          <rect x={margin} y={10} width={barW} height={30} rx={3} fill="#252830" stroke="#353840" strokeWidth={1} />

          {/* Pieces */}
          {(() => {
            let x = margin;
            return barre.pieces.map(p => {
              const w = p.longueur * scale;
              const piece = (
                <g key={p.id}>
                  <rect x={x} y={12} width={Math.max(w - 2, 1)} height={26} rx={2} fill={color} opacity={0.8} />
                  {w > 40 && (
                    <text x={x + w / 2} y={28} textAnchor="middle" fontSize={8} fill="#fff" fontFamily="monospace">
                      {p.longueur}
                    </text>
                  )}
                  {w > 60 && (
                    <text x={x + w / 2} y={36} textAnchor="middle" fontSize={6} fill="rgba(255,255,255,0.6)" fontFamily="system-ui">
                      {p.label}
                    </text>
                  )}
                  {/* Coupes angulaires */}
                  {p.coupeG === '45' && <line x1={x} y1={12} x2={x + 6} y2={38} stroke="#fff" strokeWidth={1} opacity={0.5} />}
                  {p.coupeD === '45' && <line x1={x + w - 2} y1={12} x2={x + w - 8} y2={38} stroke="#fff" strokeWidth={1} opacity={0.5} />}
                </g>
              );
              x += w;
              return piece;
            });
          })()}

          {/* Chute */}
          {barre.chute > 0 && (() => {
            const chuteW = barre.chute * scale;
            const chuteX = margin + barW - chuteW;
            return (
              <g>
                <rect x={chuteX} y={12} width={chuteW} height={26} rx={2} fill="#991b1b" opacity={0.4} />
                {chuteW > 30 && (
                  <text x={chuteX + chuteW / 2} y={28} textAnchor="middle" fontSize={7} fill="#fca5a5" fontFamily="monospace">
                    {barre.chute}
                  </text>
                )}
              </g>
            );
          })()}

          {/* Longueur totale */}
          <text x={margin + barW / 2} y={8} textAnchor="middle" fontSize={7} fill="#6b7280" fontFamily="monospace">
            {barre.longueurBrute} mm
          </text>
        </svg>

        {/* Infos */}
        <span className="text-[10px] text-gray-500 w-20 text-right shrink-0">{barre.pieces.length} pcs</span>
        <span className={`text-[10px] w-14 text-right shrink-0 ${barre.tauxChute > 15 ? 'text-red-400' : barre.tauxChute > 8 ? 'text-amber-400' : 'text-green-400'}`}>
          {barre.tauxChute.toFixed(1)}%
        </span>

        {/* Checkbox Coupée */}
        <button onClick={e => { e.stopPropagation(); onToggleCoupe(); }}
          disabled={!barre.preparee}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
            barre.coupee ? 'bg-green-600 border-green-500' :
            barre.preparee ? 'border-[#404550] hover:border-green-500' :
            'border-[#2a2d35] opacity-30 cursor-not-allowed'
          }`} title={barre.preparee ? 'Marquer comme coupee' : 'Preparer d\'abord'}>
          {barre.coupee && <Check size={12} className="text-white" />}
        </button>

        <ChevronDown size={14} className={`text-gray-600 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Détail pièces (expand) */}
      {expanded && (
        <div className="px-4 pb-3 border-t border-[#2a2d35] pt-2">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-gray-600">
                <th className="text-left py-1">Label</th>
                <th className="text-right py-1">Longueur</th>
                <th className="text-center py-1">Coupe G</th>
                <th className="text-center py-1">Coupe D</th>
                <th className="text-left py-1">Affaire</th>
              </tr>
            </thead>
            <tbody>
              {barre.pieces.map(p => (
                <tr key={p.id} className="border-t border-[#2a2d35]/30">
                  <td className="py-1 text-white font-medium">{p.label}</td>
                  <td className="py-1 text-right font-mono text-amber-400">{p.longueur} mm</td>
                  <td className="py-1 text-center text-gray-400">{p.coupeG}°</td>
                  <td className="py-1 text-center text-gray-400">{p.coupeD}°</td>
                  <td className="py-1 text-gray-500">{p.affaireRef}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
