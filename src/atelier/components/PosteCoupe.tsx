import { useState, useCallback } from 'react';
import { ArrowLeft, Upload, FileText, Trash2, X, Search, ChevronRight, Scissors, Plus, Eye, RefreshCw } from 'lucide-react';
import { v4 as uid } from 'uuid';
import { useApiState } from '../../useApiState';
import { useAuth } from '../../AuthContext';

interface Props { onBack: () => void; }

// ── Types ────────────────────────────────────────────────────────────

type Machine = 'LMT65' | 'DT' | 'RenfortAcier';
type StatutMachine =
  | 'a_faire'
  | 'prepare'
  | 'coupe'
  | 'barre_a_refaire'
  | 'piece_a_refaire'
  | 'barre_manquante'
  | 'non_conforme';

const MACHINES: { id: Machine; label: string; color: string }[] = [
  { id: 'LMT65', label: 'LMT 65', color: '#4b8fc8' },
  { id: 'DT', label: 'DT', color: '#c8a84b' },
  { id: 'RenfortAcier', label: 'Renfort Acier', color: '#7a4bc8' },
];

// Groupes : progression normale | anomalies
const STATUT_PROGRESSION: StatutMachine[] = ['a_faire', 'prepare', 'coupe'];
const STATUT_ANOMALIE: StatutMachine[] = ['barre_a_refaire', 'piece_a_refaire', 'barre_manquante', 'non_conforme'];

interface OptimisationMachine {
  pdfDataUrl: string;     // data:application/pdf;base64,...
  pdfFilename: string;
  importedAt: string;     // ISO
  statut: StatutMachine;
  notes: string;
}

interface Commande {
  id: string;
  ref: string;            // ex: L_2026-0103
  nom: string;            // ex: QUERCIU BAT D
  date: string;           // yyyy-mm-dd
  optimisations: Partial<Record<Machine, OptimisationMachine>>;
}

const STORAGE_KEY = 'sial-commandes-coupe';

const STATUT_LABEL: Record<StatutMachine, string> = {
  a_faire: 'À faire',
  prepare: 'Préparé',
  coupe: 'Coupé',
  barre_a_refaire: 'Barre à refaire',
  piece_a_refaire: 'Pièce à refaire',
  barre_manquante: 'Barre manquante',
  non_conforme: 'NON CONFORME',
};
const STATUT_STYLE: Record<StatutMachine, string> = {
  a_faire: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
  prepare: 'bg-amber-600/20 text-amber-300 border-amber-500/40',
  coupe: 'bg-green-600/20 text-green-400 border-green-500/40',
  barre_a_refaire: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
  piece_a_refaire: 'bg-orange-600/20 text-orange-300 border-orange-500/40',
  barre_manquante: 'bg-red-600/20 text-red-300 border-red-500/40',
  non_conforme: 'bg-red-600/30 text-red-200 border-red-500/60 font-bold tracking-wide',
};

const DEMO: Commande[] = [{
  id: uid(),
  ref: 'L_2026-0103',
  nom: 'QUERCIU BAT D',
  date: '2026-05-26',
  optimisations: {},
}];

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function pickPdf(): Promise<{ file: File; dataUrl: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,application/pdf';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const dataUrl = await readFileAsDataUrl(file);
      resolve({ file, dataUrl });
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

// ── Composant principal ──────────────────────────────────────────────

export function PosteCoupe({ onBack }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [commandes, setCommandes] = useApiState<Commande[]>('coupe', 'commandes', STORAGE_KEY, DEMO);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importState, setImportState] = useState<{ file: File; dataUrl: string } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ dataUrl: string; filename: string } | null>(null);

  const selected = commandes.find(c => c.id === selectedId) ?? null;

  const updateCommande = useCallback((id: string, patch: Partial<Commande>) => {
    setCommandes(commandes.map(c => c.id === id ? { ...c, ...patch } : c));
  }, [commandes, setCommandes]);

  const removeCommande = useCallback((id: string) => {
    if (!isAdmin) return;
    setCommandes(commandes.filter(c => c.id !== id));
    setSelectedId(null);
  }, [commandes, setCommandes, isAdmin]);

  const setOptim = useCallback((id: string, machine: Machine, optim: OptimisationMachine | null) => {
    setCommandes(commandes.map(c => {
      if (c.id !== id) return c;
      const optims = { ...c.optimisations };
      if (optim === null) delete optims[machine];
      else optims[machine] = optim;
      return { ...c, optimisations: optims };
    }));
  }, [commandes, setCommandes]);

  const patchOptim = useCallback((id: string, machine: Machine, patch: Partial<OptimisationMachine>) => {
    setCommandes(commandes.map(c => {
      if (c.id !== id) return c;
      const existing = c.optimisations[machine];
      if (!existing) return c;
      return { ...c, optimisations: { ...c.optimisations, [machine]: { ...existing, ...patch } } };
    }));
  }, [commandes, setCommandes]);

  const startImport = useCallback(async () => {
    const picked = await pickPdf();
    if (picked) setImportState(picked);
  }, []);

  const handleImportConfirm = useCallback((commandeId: string, machine: Machine, newCommande?: { ref: string; nom: string; date: string }) => {
    if (!importState) return;
    const optim: OptimisationMachine = {
      pdfDataUrl: importState.dataUrl,
      pdfFilename: importState.file.name,
      importedAt: new Date().toISOString(),
      statut: 'a_faire',
      notes: '',
    };
    if (newCommande) {
      const cmd: Commande = {
        id: commandeId,
        ref: newCommande.ref,
        nom: newCommande.nom,
        date: newCommande.date,
        optimisations: { [machine]: optim },
      };
      setCommandes([cmd, ...commandes]);
      setSelectedId(commandeId);
    } else {
      setOptim(commandeId, machine, optim);
      setSelectedId(commandeId);
    }
    setImportState(null);
  }, [importState, commandes, setCommandes, setOptim]);

  const replaceOptim = useCallback(async (commandeId: string, machine: Machine) => {
    const picked = await pickPdf();
    if (!picked) return;
    const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
    setOptim(commandeId, machine, {
      pdfDataUrl: picked.dataUrl,
      pdfFilename: picked.file.name,
      importedAt: new Date().toISOString(),
      statut: existing?.statut ?? 'a_faire',
      notes: existing?.notes ?? '',
    });
  }, [commandes, setOptim]);

  // ── Vue Liste ──
  if (!selected) {
    const filtered = commandes
      .filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-sm font-bold text-white">Poste de Coupe</h1>
                <p className="text-[10px] text-gray-500">Optimisations par machine — LMT 65 / DT / Renfort Acier</p>
              </div>
            </div>
            <button onClick={startImport}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
              <Upload size={14} /> Importer un PDF
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher commande ou chantier..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">
              Aucune commande. Cliquez sur « Importer un PDF » pour démarrer.
            </div>
          )}

          {filtered.map(c => {
            const nbOptims = Object.keys(c.optimisations).length;
            const nbCoupes = Object.values(c.optimisations).filter(o => o?.statut === 'coupe').length;
            const nbAnomalies = Object.values(c.optimisations).filter(o => o && STATUT_ANOMALIE.includes(o.statut)).length;
            return (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 text-left hover:border-[#404550] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Scissors size={14} className="text-gray-500 shrink-0" />
                      <span className="text-sm font-bold text-white truncate">{c.nom}</span>
                      <span className="text-[10px] text-gray-500 font-mono">{c.ref}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      {MACHINES.map(m => {
                        const opt = c.optimisations[m.id];
                        return (
                          <span key={m.id}
                            className={`text-[9px] px-2 py-0.5 rounded border ${
                              opt ? STATUT_STYLE[opt.statut] : 'bg-[#1c1e24] text-gray-600 border-[#2a2d35]'
                            }`}>
                            {m.label}{opt ? ` · ${STATUT_LABEL[opt.statut]}` : ' · —'}
                          </span>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-2">
                      <span>{c.date}</span>
                      <span>{nbOptims}/3 optim.</span>
                      {nbCoupes > 0 && <span className="text-green-400">{nbCoupes} coupée{nbCoupes > 1 ? 's' : ''}</span>}
                      {nbAnomalies > 0 && <span className="text-red-400">{nbAnomalies} anomalie{nbAnomalies > 1 ? 's' : ''}</span>}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 shrink-0 ml-2" />
                </div>
              </button>
            );
          })}
        </main>

        {importState && (
          <ImportModal state={importState} commandes={commandes}
            onClose={() => setImportState(null)}
            onConfirm={handleImportConfirm} />
        )}
        {pdfViewer && (
          <PdfViewerModal {...pdfViewer} onClose={() => setPdfViewer(null)} />
        )}
      </div>
    );
  }

  // ── Vue Détail Commande ──
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white shrink-0"><ArrowLeft size={18} /></button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <input value={selected.nom}
                  onChange={e => updateCommande(selected.id, { nom: e.target.value })}
                  className="text-sm font-bold text-white bg-transparent outline-none border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 px-1 -mx-1 min-w-0" />
              </div>
              <div className="flex items-center gap-3 text-[10px] text-gray-500 mt-0.5">
                <input value={selected.ref}
                  onChange={e => updateCommande(selected.id, { ref: e.target.value })}
                  className="font-mono bg-transparent outline-none border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 px-1 -mx-1 w-40" />
                <input type="date" value={selected.date}
                  onChange={e => updateCommande(selected.id, { date: e.target.value })}
                  className="bg-transparent outline-none border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 px-1 -mx-1" />
              </div>
            </div>
          </div>
          {isAdmin && (
            <button onClick={() => { if (confirm(`Supprimer la commande ${selected.nom} ?`)) removeCommande(selected.id); }}
              className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded border border-red-500/20 hover:border-red-500/40 shrink-0">
              <Trash2 size={12} className="inline mr-1" /> Supprimer
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {MACHINES.map(m => {
            const optim = selected.optimisations[m.id];
            return (
              <MachineCard
                key={m.id}
                machine={m}
                optim={optim}
                onImport={async () => {
                  const picked = await pickPdf();
                  if (!picked) return;
                  setOptim(selected.id, m.id, {
                    pdfDataUrl: picked.dataUrl,
                    pdfFilename: picked.file.name,
                    importedAt: new Date().toISOString(),
                    statut: 'a_faire',
                    notes: '',
                  });
                }}
                onReplace={() => replaceOptim(selected.id, m.id)}
                onDelete={() => { if (confirm(`Supprimer le PDF ${m.label} ?`)) setOptim(selected.id, m.id, null); }}
                onView={() => optim && setPdfViewer({ dataUrl: optim.pdfDataUrl, filename: optim.pdfFilename })}
                onStatut={(s) => patchOptim(selected.id, m.id, { statut: s })}
                onNotes={(n) => patchOptim(selected.id, m.id, { notes: n })}
              />
            );
          })}
        </div>
      </main>

      {pdfViewer && (
        <PdfViewerModal {...pdfViewer} onClose={() => setPdfViewer(null)} />
      )}
    </div>
  );
}

// ── Carte machine ────────────────────────────────────────────────────

function MachineCard({ machine, optim, onImport, onReplace, onDelete, onView, onStatut, onNotes }: {
  machine: { id: Machine; label: string; color: string };
  optim: OptimisationMachine | undefined;
  onImport: () => void;
  onReplace: () => void;
  onDelete: () => void;
  onView: () => void;
  onStatut: (s: StatutMachine) => void;
  onNotes: (n: string) => void;
}) {
  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[#2a2d35] flex items-center gap-2">
        <div className="w-3 h-3 rounded" style={{ backgroundColor: machine.color }} />
        <h2 className="text-sm font-bold text-white">{machine.label}</h2>
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {!optim ? (
          <button onClick={onImport}
            className="flex-1 min-h-[120px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#2a2d35] hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
            <Plus size={24} />
            <span className="text-xs">Importer un PDF</span>
          </button>
        ) : (
          <>
            <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-lg p-3">
              <div className="flex items-start gap-2">
                <FileText size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-white truncate" title={optim.pdfFilename}>{optim.pdfFilename}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    Importé le {new Date(optim.importedAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <button onClick={onView}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-semibold rounded">
                  <Eye size={12} /> Voir
                </button>
                <button onClick={onReplace} title="Remplacer"
                  className="px-2 py-1.5 bg-[#252830] hover:bg-[#2f323a] text-gray-300 rounded">
                  <RefreshCw size={12} />
                </button>
                <button onClick={onDelete} title="Supprimer"
                  className="px-2 py-1.5 bg-[#252830] hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Progression</p>
              <div className="grid grid-cols-3 gap-1">
                {STATUT_PROGRESSION.map(s => {
                  const active = optim.statut === s;
                  return (
                    <button key={s} onClick={() => onStatut(s)}
                      className={`px-2 py-1.5 rounded text-[10px] font-medium border transition-all ${
                        active ? STATUT_STYLE[s] : 'text-gray-600 border-[#2a2d35] hover:border-[#404550]'
                      }`}>
                      {STATUT_LABEL[s]}
                    </button>
                  );
                })}
              </div>

              <p className="text-[10px] text-gray-500 mt-2.5 mb-1.5 uppercase tracking-wide">Anomalies</p>
              <div className="grid grid-cols-2 gap-1">
                {STATUT_ANOMALIE.map(s => {
                  const active = optim.statut === s;
                  return (
                    <button key={s} onClick={() => onStatut(s)}
                      className={`px-2 py-1.5 rounded text-[10px] font-medium border transition-all ${
                        active ? STATUT_STYLE[s] : 'text-gray-600 border-[#2a2d35] hover:border-[#404550]'
                      }`}>
                      {STATUT_LABEL[s]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Notes</p>
              <textarea value={optim.notes} onChange={e => onNotes(e.target.value)}
                placeholder="Incident, manquant, remarque..."
                className="flex-1 min-h-[80px] bg-[#1c1e24] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none resize-none focus:border-blue-500/50" />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modale import (choix machine + commande) ────────────────────────

function ImportModal({ state, commandes, onClose, onConfirm }: {
  state: { file: File; dataUrl: string };
  commandes: Commande[];
  onClose: () => void;
  onConfirm: (commandeId: string, machine: Machine, newCommande?: { ref: string; nom: string; date: string }) => void;
}) {
  // Auto-detect ref + nom from filename (only once at mount, file is stable)
  const guessed = (() => {
    const name = state.file.name.replace(/\.pdf$/i, '');
    const refMatch = name.match(/L[_-]?(\d{4})[_-]?(\d{3,4})/i);
    const ref = refMatch ? `L_${refMatch[1]}-${refMatch[2]}` : '';
    const nom = name.replace(/Optimisation[_-]?/i, '').replace(/L[_-]?\d{4}[_-]?\d{3,4}/i, '').replace(/[_-]+/g, ' ').trim();
    return { ref, nom };
  })();

  const [machine, setMachine] = useState<Machine | null>(null);
  const [mode, setMode] = useState<'existing' | 'new'>(commandes.length > 0 ? 'existing' : 'new');
  const [existingId, setExistingId] = useState<string>(commandes[0]?.id ?? '');
  const [newRef, setNewRef] = useState(guessed.ref);
  const [newNom, setNewNom] = useState(guessed.nom);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));

  const canConfirm = machine !== null && (
    (mode === 'existing' && existingId) ||
    (mode === 'new' && newRef.trim() && newNom.trim())
  );

  const handleConfirm = () => {
    if (!machine) return;
    if (mode === 'existing') {
      onConfirm(existingId, machine);
    } else {
      onConfirm(uid(), machine, { ref: newRef.trim(), nom: newNom.trim(), date: newDate });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-2xl max-w-lg w-full p-6 space-y-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Importer un PDF d'optimisation</h2>
            <p className="text-[11px] text-gray-500 mt-1 truncate max-w-sm" title={state.file.name}>
              <FileText size={11} className="inline mr-1" /> {state.file.name}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-2 font-semibold">Machine</p>
          <div className="grid grid-cols-3 gap-2">
            {MACHINES.map(m => (
              <button key={m.id} onClick={() => setMachine(m.id)}
                className={`px-3 py-3 rounded-lg border text-xs font-medium transition-all ${
                  machine === m.id ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' : 'bg-[#1c1e24] text-gray-400 border-[#2a2d35] hover:border-[#404550]'
                }`}>
                <div className="w-3 h-3 rounded inline-block mr-1.5 align-middle" style={{ backgroundColor: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[11px] text-gray-400 mb-2 font-semibold">Commande</p>
          <div className="flex gap-2 mb-3">
            <button onClick={() => setMode('new')}
              className={`flex-1 px-3 py-2 rounded text-[11px] font-medium border ${
                mode === 'new' ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' : 'bg-[#1c1e24] text-gray-400 border-[#2a2d35]'
              }`}>
              Nouvelle commande
            </button>
            <button onClick={() => setMode('existing')} disabled={commandes.length === 0}
              className={`flex-1 px-3 py-2 rounded text-[11px] font-medium border ${
                mode === 'existing' ? 'bg-blue-600/20 text-blue-300 border-blue-500/50' : 'bg-[#1c1e24] text-gray-400 border-[#2a2d35]'
              } disabled:opacity-30 disabled:cursor-not-allowed`}>
              Ajouter à existante
            </button>
          </div>

          {mode === 'new' ? (
            <div className="space-y-2">
              <input value={newRef} onChange={e => setNewRef(e.target.value)} placeholder="Réf (ex: L_2026-0103)"
                className="w-full px-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/50 font-mono" />
              <input value={newNom} onChange={e => setNewNom(e.target.value)} placeholder="Nom chantier (ex: QUERCIU BAT D)"
                className="w-full px-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-xs text-white placeholder-gray-600 outline-none focus:border-blue-500/50" />
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-xs text-white outline-none focus:border-blue-500/50" />
            </div>
          ) : (
            <select value={existingId} onChange={e => setExistingId(e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-xs text-white outline-none focus:border-blue-500/50">
              {commandes.map(c => (
                <option key={c.id} value={c.id}>{c.nom} ({c.ref})</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-gray-400 hover:text-white">Annuler</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-[#252830] disabled:text-gray-600 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg">
            Importer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modale visualisation PDF ────────────────────────────────────────

function PdfViewerModal({ dataUrl, filename, onClose }: { dataUrl: string; filename: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col p-4" onClick={onClose}>
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl flex-1 flex flex-col overflow-hidden max-w-6xl w-full mx-auto" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-2 border-b border-[#2a2d35] flex items-center justify-between shrink-0">
          <p className="text-xs text-white truncate"><FileText size={12} className="inline mr-1.5 text-blue-400" />{filename}</p>
          <div className="flex items-center gap-2">
            <a href={dataUrl} download={filename}
              className="text-[11px] text-blue-400 hover:text-blue-300 px-2 py-1">Télécharger</a>
            <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
          </div>
        </div>
        <iframe src={dataUrl} className="flex-1 bg-white" title={filename} />
      </div>
    </div>
  );
}
