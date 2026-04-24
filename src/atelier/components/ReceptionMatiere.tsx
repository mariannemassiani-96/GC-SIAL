import { useState, useCallback } from 'react';
import { ArrowLeft, Plus, Search, Truck, Check, AlertTriangle, Download, Trash2 } from 'lucide-react';
import { v4 as uid } from 'uuid';

interface Props { onBack: () => void; }

// ── Types ────────────────────────────────────────────────────────────

interface ReceptionLivraison {
  id: string;
  date: string;
  heure: string;
  fournisseur: string;
  numBonLivraison: string;
  nbSommiers: number;
  nbPalettes: number;
  nbColis: number;
  nbTotal: number;
  reserves: string;
  photos: string[];
  statut: 'reception' | 'controle' | 'ok' | 'litige';
  receptionnePar: string;
  notes: string;
  lignes: LigneReception[];
}

interface LigneReception {
  id: string;
  ref: string;
  designation: string;
  qteAttendue: number;
  qteRecue: number;
  unite: string;
  conforme: boolean | null;
  remarque: string;
}

const FOURNISSEURS = [
  'Kawneer', 'Rehau', 'Ferco', 'Wurth', 'PRO Equipe', 'Foussier',
  'Boschat Laveix', 'Rey', 'Nerfs', 'Saint-Gobain', 'Somfy',
  'Hoppe', 'Sika', 'Vitrage Insulaire', 'Autre',
];

const STORAGE_KEY = 'sial-receptions';

function loadReceptions(): ReceptionLivraison[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]'); } catch { return []; }
}
function saveReceptions(r: ReceptionLivraison[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(r)); }

// ── Données démo ─────────────────────────────────────────────────────

const DEMO: ReceptionLivraison[] = [
  {
    id: uid(), date: '2026-04-23', heure: '08:30', fournisseur: 'Kawneer',
    numBonLivraison: 'BL-KAW-2026-1234', nbSommiers: 2, nbPalettes: 0, nbColis: 3, nbTotal: 5,
    reserves: '', photos: [], statut: 'ok', receptionnePar: 'Marco', notes: '',
    lignes: [
      { id: uid(), ref: 'KAW-180000', designation: 'Raidisseur 40x20 L6400', qteAttendue: 50, qteRecue: 50, unite: 'barre', conforme: true, remarque: '' },
      { id: uid(), ref: 'KAW-180010', designation: 'Lisse 46.5x20 L6400', qteAttendue: 30, qteRecue: 30, unite: 'barre', conforme: true, remarque: '' },
      { id: uid(), ref: 'KAW-180030', designation: 'Main courante 52x25 L6400', qteAttendue: 20, qteRecue: 20, unite: 'barre', conforme: true, remarque: '' },
    ],
  },
  {
    id: uid(), date: '2026-04-22', heure: '14:15', fournisseur: 'Rehau',
    numBonLivraison: 'BL-REH-2026-0891', nbSommiers: 0, nbPalettes: 3, nbColis: 1, nbTotal: 4,
    reserves: '1 palette film dechire', photos: [], statut: 'litige', receptionnePar: 'Jean-Pierre', notes: 'Photo envoyee au fournisseur',
    lignes: [
      { id: uid(), ref: 'REH-ARALYA-BL', designation: 'Profile Aralya blanc L6500', qteAttendue: 40, qteRecue: 38, unite: 'barre', conforme: false, remarque: '2 barres manquantes' },
      { id: uid(), ref: 'JB08GR', designation: 'Joint brosse gris 8mm', qteAttendue: 4, qteRecue: 4, unite: 'rouleau', conforme: true, remarque: '' },
    ],
  },
];

// ── Composant principal ──────────────────────────────────────────────

export function ReceptionMatiere({ onBack }: Props) {
  const [receptions, setReceptions] = useState<ReceptionLivraison[]>(() => {
    const saved = loadReceptions();
    return saved.length > 0 ? saved : DEMO;
  });
  const [view, setView] = useState<'liste' | 'nouvelle' | 'detail'>('liste');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const persist = useCallback((next: ReceptionLivraison[]) => {
    setReceptions(next); saveReceptions(next);
  }, []);

  const selected = receptions.find(r => r.id === selectedId) ?? null;

  const filteredReceptions = receptions.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return r.fournisseur.toLowerCase().includes(q) || r.numBonLivraison.toLowerCase().includes(q) || r.date.includes(q);
  });

  // KPIs
  const aujourdHui = new Date().toISOString().slice(0, 10);
  const recsAujourdHui = receptions.filter(r => r.date === aujourdHui).length;
  const enLitige = receptions.filter(r => r.statut === 'litige').length;
  const enControle = receptions.filter(r => r.statut === 'controle').length;

  // ── Vue Liste ──
  if (view === 'liste') {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-sm font-bold text-white">Reception Matiere Fournisseur</h1>
                <p className="text-[10px] text-gray-500">Validation des livraisons entrants</p>
              </div>
            </div>
            <button onClick={() => setView('nouvelle')}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
              <Plus size={14} /> Nouvelle reception
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase">Total receptions</p>
              <p className="text-xl font-bold text-white">{receptions.length}</p>
            </div>
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase">Aujourd'hui</p>
              <p className="text-xl font-bold text-blue-400">{recsAujourdHui}</p>
            </div>
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase">En controle</p>
              <p className="text-xl font-bold text-amber-400">{enControle}</p>
            </div>
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <p className="text-[10px] text-gray-500 uppercase">Litiges</p>
              <p className="text-xl font-bold text-red-400">{enLitige}</p>
            </div>
          </div>

          {/* Recherche */}
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher fournisseur, BL, date..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
          </div>

          {/* Liste */}
          <div className="space-y-2">
            {filteredReceptions.sort((a, b) => `${b.date}${b.heure}`.localeCompare(`${a.date}${a.heure}`)).map(r => {
              const statutColors: Record<string, string> = {
                reception: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
                controle: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
                ok: 'bg-green-600/20 text-green-400 border-green-500/30',
                litige: 'bg-red-600/20 text-red-400 border-red-500/30',
              };
              const statutLabels: Record<string, string> = { reception: 'Receptionne', controle: 'En controle', ok: 'Conforme', litige: 'Litige' };
              return (
                <button key={r.id} onClick={() => { setSelectedId(r.id); setView('detail'); }}
                  className="w-full bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-left hover:border-[#404550] transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Truck size={16} className="text-gray-500 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{r.fournisseur}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded border ${statutColors[r.statut]}`}>{statutLabels[r.statut]}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                          <span>{r.date} {r.heure}</span>
                          <span>BL: {r.numBonLivraison}</span>
                          <span>{r.nbTotal} colis/pal.</span>
                          <span>{r.lignes.length} ligne(s)</span>
                        </div>
                      </div>
                    </div>
                    {r.reserves && <AlertTriangle size={14} className="text-amber-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </main>
      </div>
    );
  }

  // ── Vue Nouvelle Reception ──
  if (view === 'nouvelle') {
    return <FormulaireReception
      onBack={() => setView('liste')}
      onSave={(r) => { persist([r, ...receptions]); setSelectedId(r.id); setView('detail'); }}
    />;
  }

  // ── Vue Detail ──
  if (view === 'detail' && selected) {
    return <DetailReception
      reception={selected}
      onBack={() => setView('liste')}
      onUpdate={(patch) => {
        const next = receptions.map(r => r.id === selected.id ? { ...r, ...patch } : r);
        persist(next);
      }}
      onDelete={() => { persist(receptions.filter(r => r.id !== selected.id)); setView('liste'); }}
    />;
  }

  return null;
}

// ── Formulaire nouvelle réception ────────────────────────────────────

function FormulaireReception({ onBack, onSave }: { onBack: () => void; onSave: (r: ReceptionLivraison) => void }) {
  const now = new Date();
  const [fournisseur, setFournisseur] = useState('');
  const [numBL, setNumBL] = useState('');
  const [nbSommiers, setNbSommiers] = useState(0);
  const [nbPalettes, setNbPalettes] = useState(0);
  const [nbColis, setNbColis] = useState(0);
  const [reserves, setReserves] = useState('');
  const [receptionnePar, setReceptionnePar] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = () => {
    if (!fournisseur || !numBL) return;
    onSave({
      id: uid(), date: now.toISOString().slice(0, 10), heure: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`,
      fournisseur, numBonLivraison: numBL, nbSommiers, nbPalettes, nbColis,
      nbTotal: nbSommiers + nbPalettes + nbColis, reserves, photos: [],
      statut: reserves ? 'litige' : 'reception', receptionnePar, notes, lignes: [],
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
          <h1 className="text-sm font-bold text-white">Nouvelle reception</h1>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-5">
        {/* Date/heure auto */}
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
          <Truck size={20} className="text-blue-400" />
          <div>
            <p className="text-sm font-bold text-white">{now.toLocaleDateString('fr-FR')} a {now.getHours()}:{now.getMinutes().toString().padStart(2, '0')}</p>
            <p className="text-[10px] text-blue-300">Date et heure de reception (automatique)</p>
          </div>
        </div>

        {/* Fournisseur */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Fournisseur *</label>
          <select value={fournisseur} onChange={e => setFournisseur(e.target.value)}
            className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white outline-none focus:border-blue-500">
            <option value="">-- Selectionner --</option>
            {FOURNISSEURS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        {/* N° BL */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">N. Bon de Livraison *</label>
          <input value={numBL} onChange={e => setNumBL(e.target.value)} placeholder="Ex: BL-KAW-2026-1234"
            className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white outline-none focus:border-blue-500 placeholder-gray-600" />
        </div>

        {/* Quantités */}
        <div>
          <label className="block text-xs text-gray-500 mb-2">Quantites recues</label>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-center">
              <p className="text-[10px] text-gray-500 mb-2">Sommiers / Chevalets</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setNbSommiers(Math.max(0, nbSommiers - 1))} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">-</button>
                <span className="text-2xl font-bold text-white w-12 text-center">{nbSommiers}</span>
                <button onClick={() => setNbSommiers(nbSommiers + 1)} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-center">
              <p className="text-[10px] text-gray-500 mb-2">Palettes</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setNbPalettes(Math.max(0, nbPalettes - 1))} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">-</button>
                <span className="text-2xl font-bold text-white w-12 text-center">{nbPalettes}</span>
                <button onClick={() => setNbPalettes(nbPalettes + 1)} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-center">
              <p className="text-[10px] text-gray-500 mb-2">Colis</p>
              <div className="flex items-center justify-center gap-2">
                <button onClick={() => setNbColis(Math.max(0, nbColis - 1))} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">-</button>
                <span className="text-2xl font-bold text-white w-12 text-center">{nbColis}</span>
                <button onClick={() => setNbColis(nbColis + 1)} className="w-8 h-8 rounded-lg border border-[#353840] text-gray-400 text-lg">+</button>
              </div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-2">Total : <strong className="text-white">{nbSommiers + nbPalettes + nbColis}</strong> unite(s)</p>
        </div>

        {/* Réserves */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reserves (si probleme)</label>
          <textarea value={reserves} onChange={e => setReserves(e.target.value)} placeholder="Colis abime, palette cassee, manquant..."
            className="w-full h-20 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white resize-none outline-none placeholder-gray-600" />
        </div>

        {/* Réceptionné par */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Receptionne par</label>
          <input value={receptionnePar} onChange={e => setReceptionnePar(e.target.value)} placeholder="Nom de l'operateur"
            className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-sm text-white outline-none placeholder-gray-600" />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations..."
            className="w-full h-16 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white resize-none outline-none placeholder-gray-600" />
        </div>

        {/* Bouton valider */}
        <button onClick={handleSave} disabled={!fournisseur || !numBL}
          className="w-full py-4 bg-green-600 hover:bg-green-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm">
          <Check size={16} className="inline mr-2" /> Valider la reception
        </button>
      </main>
    </div>
  );
}

// ── Détail d'une réception ───────────────────────────────────────────

function DetailReception({ reception: r, onBack, onUpdate, onDelete }: {
  reception: ReceptionLivraison;
  onBack: () => void;
  onUpdate: (patch: Partial<ReceptionLivraison>) => void;
  onDelete: () => void;
}) {
  const [showAddLine, setShowAddLine] = useState(false);
  const [newRef, setNewRef] = useState('');
  const [newDesig, setNewDesig] = useState('');
  const [newQteAtt, setNewQteAtt] = useState(0);
  const [newQteRec, setNewQteRec] = useState(0);
  const [newUnite, setNewUnite] = useState('piece');

  const addLigne = () => {
    if (!newRef) return;
    const ligne: LigneReception = {
      id: uid(), ref: newRef, designation: newDesig,
      qteAttendue: newQteAtt, qteRecue: newQteRec, unite: newUnite,
      conforme: newQteRec >= newQteAtt ? true : null, remarque: '',
    };
    onUpdate({ lignes: [...r.lignes, ligne] });
    setNewRef(''); setNewDesig(''); setNewQteAtt(0); setNewQteRec(0); setShowAddLine(false);
  };

  const updateLigne = (id: string, patch: Partial<LigneReception>) => {
    onUpdate({ lignes: r.lignes.map(l => l.id === id ? { ...l, ...patch } : l) });
  };

  const deleteLigne = (id: string) => {
    onUpdate({ lignes: r.lignes.filter(l => l.id !== id) });
  };

  const toutConforme = r.lignes.length > 0 && r.lignes.every(l => l.conforme === true);
  const aDesEcarts = r.lignes.some(l => l.qteRecue !== l.qteAttendue);

  const statutColors: Record<string, string> = {
    reception: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
    controle: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
    ok: 'bg-green-600/20 text-green-400 border-green-500/30',
    litige: 'bg-red-600/20 text-red-400 border-red-500/30',
  };

  const exportCSV = () => {
    const h = ['Ref', 'Designation', 'Qte attendue', 'Qte recue', 'Unite', 'Conforme', 'Remarque'];
    const rows = r.lignes.map(l => [l.ref, l.designation, l.qteAttendue, l.qteRecue, l.unite, l.conforme === true ? 'Oui' : l.conforme === false ? 'Non' : '?', l.remarque]);
    const csv = '﻿' + [h.join(';'), ...rows.map(row => row.map(c => `"${c}"`).join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `reception_${r.fournisseur}_${r.date}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-sm font-bold text-white">{r.fournisseur} — {r.numBonLivraison}</h1>
              <p className="text-[10px] text-gray-500">{r.date} {r.heure} — par {r.receptionnePar || '?'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="p-2 text-gray-400 hover:text-white border border-[#353840] rounded-lg"><Download size={14} /></button>
            <button onClick={() => { if (confirm('Supprimer cette reception ?')) onDelete(); }} className="p-2 text-gray-400 hover:text-red-400 border border-[#353840] rounded-lg"><Trash2 size={14} /></button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full space-y-5">
        {/* En-tête info */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[10px] text-gray-500">Sommiers</p><p className="text-lg font-bold text-white">{r.nbSommiers}</p></div>
            <div><p className="text-[10px] text-gray-500">Palettes</p><p className="text-lg font-bold text-white">{r.nbPalettes}</p></div>
            <div><p className="text-[10px] text-gray-500">Colis</p><p className="text-lg font-bold text-white">{r.nbColis}</p></div>
            <div><p className="text-[10px] text-gray-500">Total</p><p className="text-lg font-bold text-blue-400">{r.nbTotal}</p></div>
          </div>
          {r.reserves && (
            <div className="mt-3 p-2 bg-red-600/10 border border-red-500/30 rounded-lg text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle size={14} /> {r.reserves}
            </div>
          )}
        </div>

        {/* Statut */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Statut :</span>
          {(['reception', 'controle', 'ok', 'litige'] as const).map(s => (
            <button key={s} onClick={() => onUpdate({ statut: s })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${r.statut === s ? statutColors[s] : 'text-gray-600 border-[#353840] hover:border-[#505560]'}`}>
              {s === 'reception' ? 'Receptionne' : s === 'controle' ? 'En controle' : s === 'ok' ? 'Conforme' : 'Litige'}
            </button>
          ))}
        </div>

        {/* Lignes articles */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2a2d35] flex items-center justify-between">
            <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Detail articles ({r.lignes.length})</h3>
            <button onClick={() => setShowAddLine(true)} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300">
              <Plus size={12} /> Ajouter
            </button>
          </div>

          {r.lignes.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-gray-600">
              Aucune ligne — ajoutez les articles du BL pour le controle quantitatif
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#2a2d35] text-gray-500">
                  <th className="text-left px-3 py-2">Ref</th>
                  <th className="text-left px-3 py-2">Designation</th>
                  <th className="text-center px-3 py-2">Attendu</th>
                  <th className="text-center px-3 py-2">Recu</th>
                  <th className="text-center px-3 py-2">Unite</th>
                  <th className="text-center px-3 py-2">OK</th>
                  <th className="text-left px-3 py-2">Remarque</th>
                  <th className="px-2"></th>
                </tr>
              </thead>
              <tbody>
                {r.lignes.map(l => {
                  const ecart = l.qteRecue - l.qteAttendue;
                  return (
                    <tr key={l.id} className={`border-b border-[#2a2d35]/50 ${ecart < 0 ? 'bg-red-600/5' : ''}`}>
                      <td className="px-3 py-2 font-mono text-amber-400">{l.ref}</td>
                      <td className="px-3 py-2 text-white">{l.designation}</td>
                      <td className="px-3 py-2 text-center text-gray-400">{l.qteAttendue}</td>
                      <td className="px-3 py-2 text-center">
                        <input type="number" value={l.qteRecue} min={0}
                          onChange={e => updateLigne(l.id, { qteRecue: Number(e.target.value), conforme: Number(e.target.value) >= l.qteAttendue })}
                          className="w-16 px-1 py-0.5 bg-[#252830] border border-[#353840] rounded text-center text-white outline-none" />
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{l.unite}</td>
                      <td className="px-3 py-2 text-center">
                        {l.conforme === true ? <Check size={14} className="mx-auto text-green-400" /> :
                         l.conforme === false ? <AlertTriangle size={14} className="mx-auto text-red-400" /> :
                         <span className="text-gray-600">?</span>}
                      </td>
                      <td className="px-3 py-2">
                        <input value={l.remarque} onChange={e => updateLigne(l.id, { remarque: e.target.value })} placeholder="..."
                          className="w-full px-1 py-0.5 bg-transparent border-b border-[#353840] text-gray-300 outline-none text-[10px]" />
                      </td>
                      <td className="px-2">
                        <button onClick={() => deleteLigne(l.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* Formulaire ajout ligne */}
          {showAddLine && (
            <div className="px-4 py-3 border-t border-[#2a2d35] bg-[#1c1e24] space-y-2">
              <div className="grid grid-cols-5 gap-2">
                <input value={newRef} onChange={e => setNewRef(e.target.value)} placeholder="Ref" className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" />
                <input value={newDesig} onChange={e => setNewDesig(e.target.value)} placeholder="Designation" className="col-span-2 px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none" />
                <input type="number" value={newQteAtt} onChange={e => setNewQteAtt(Number(e.target.value))} placeholder="Att." className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white text-center outline-none" />
                <input type="number" value={newQteRec} onChange={e => setNewQteRec(Number(e.target.value))} placeholder="Recu" className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white text-center outline-none" />
              </div>
              <div className="flex gap-2">
                <select value={newUnite} onChange={e => setNewUnite(e.target.value)} className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded text-xs text-white outline-none">
                  {['piece', 'barre', 'rouleau', 'boite', 'palette', 'kg', 'metre'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
                <button onClick={addLigne} disabled={!newRef} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded disabled:opacity-30">Ajouter</button>
                <button onClick={() => setShowAddLine(false)} className="px-3 py-1.5 text-gray-500 text-xs">Annuler</button>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {toutConforme && r.statut !== 'ok' && (
          <button onClick={() => onUpdate({ statut: 'ok' })}
            className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl text-sm">
            Tout est conforme — Valider
          </button>
        )}
        {aDesEcarts && r.statut !== 'litige' && (
          <button onClick={() => onUpdate({ statut: 'litige' })}
            className="w-full py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-bold rounded-xl text-sm border border-red-500/30">
            Ecarts detectes — Passer en litige
          </button>
        )}
      </main>
    </div>
  );
}
