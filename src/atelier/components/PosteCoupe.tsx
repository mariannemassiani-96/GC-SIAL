import { useState, useCallback, useMemo, useEffect } from 'react';
import { ArrowLeft, Upload, FileText, FileCode2, Trash2, X, Search, ChevronRight, Scissors, Plus, RefreshCw, Send, History, Layers, AlertCircle, Check, AlertTriangle, RotateCcw, Calendar } from 'lucide-react';
import { v4 as uid } from 'uuid';
import { useApiState } from '../../useApiState';
import { useAuth } from '../../AuthContext';
import {
  parseFstlineXml, detectIsFstlineXml, detectChantier, detectOrdreRef,
  type FstlineOptim,
} from '../fstlineParser';

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

const STATUT_PROGRESSION: StatutMachine[] = ['a_faire', 'prepare', 'coupe'];
const STATUT_ANOMALIE: StatutMachine[] = ['barre_a_refaire', 'piece_a_refaire', 'barre_manquante', 'non_conforme'];

type EventType =
  | 'import_pdf'
  | 'import_xml'
  | 'envoye_atelier'
  | 'annule_envoi'
  | 'statut_change'
  | 'note_modifiee'
  | 'pdf_remplace'
  | 'xml_remplace'
  | 'fichier_supprime'
  | 'date_assignee';

interface Evenement {
  id: string;
  type: EventType;
  date: string;          // ISO timestamp
  userNom: string;
  details?: string;
}

interface OptimisationMachine {
  // Source PDF (optionnel)
  pdfDataUrl?: string;
  pdfFilename?: string;

  // Source XML FSTLINE (optionnel)
  xmlFilename?: string;
  parsedOptim?: FstlineOptim;

  importedAt: string;
  statut: StatutMachine;
  notes: string;

  // Workflow manager
  dateAssignee?: string;       // yyyy-mm-dd
  envoyeeAtelier?: boolean;
  envoyeePar?: string;
  envoyeeLe?: string;          // ISO

  // Traçabilité
  evenements: Evenement[];
}

interface Commande {
  id: string;
  ref: string;
  nom: string;
  date: string;            // yyyy-mm-dd
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

const EVENT_LABEL: Record<EventType, string> = {
  import_pdf: 'Import PDF',
  import_xml: 'Import XML FSTLINE',
  envoye_atelier: 'Envoyée à l\'atelier',
  annule_envoi: 'Envoi annulé',
  statut_change: 'Statut modifié',
  note_modifiee: 'Note modifiée',
  pdf_remplace: 'PDF remplacé',
  xml_remplace: 'XML remplacé',
  fichier_supprime: 'Fichier supprimé',
  date_assignee: 'Date assignée',
};

const DEMO: Commande[] = [{
  id: uid(),
  ref: 'L_2026-0103',
  nom: 'QUERCIU BAT D',
  date: '2026-05-26',
  optimisations: {},
}];

// ── Helpers ─────────────────────────────────────────────────────────

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

type ImportPayload =
  | { kind: 'pdf'; file: File; dataUrl: string }
  | { kind: 'xml'; file: File; parsed: FstlineOptim }
  | { kind: 'error'; file: File; error: string };

async function readPickedFile(file: File): Promise<ImportPayload> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.pdf')) {
    const dataUrl = await readFileAsDataUrl(file);
    return { kind: 'pdf', file, dataUrl };
  }
  if (lower.endsWith('.xml')) {
    const buffer = await readFileAsArrayBuffer(file);
    if (!detectIsFstlineXml(buffer)) {
      return { kind: 'error', file, error: 'XML non reconnu comme FSTLINE (balises <JOB><JINF> absentes)' };
    }
    const result = parseFstlineXml(buffer);
    if (!result.ok) return { kind: 'error', file, error: result.error };
    return { kind: 'xml', file, parsed: result.data };
  }
  return { kind: 'error', file, error: 'Format non pris en charge — utilise .pdf ou .xml' };
}

function pickFile(): Promise<ImportPayload | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.xml,application/pdf,application/xml,text/xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) { resolve(null); return; }
      const payload = await readPickedFile(file);
      resolve(payload);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function makeEvent(type: EventType, userNom: string, details?: string): Evenement {
  return { id: uid(), type, date: new Date().toISOString(), userNom, details };
}

function getEvents(optim: OptimisationMachine): Evenement[] {
  return optim.evenements ?? [];
}

function fmtDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

// ── Composant principal ──────────────────────────────────────────────

export function PosteCoupe({ onBack }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const userNom = user?.nom ?? 'Inconnu';
  const [commandes, setCommandes] = useApiState<Commande[]>('coupe', 'commandes', STORAGE_KEY, DEMO);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [importState, setImportState] = useState<ImportPayload | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ dataUrl: string; filename: string } | null>(null);
  const [historyView, setHistoryView] = useState<{ machine: Machine; events: Evenement[] } | null>(null);
  const [piecesView, setPiecesView] = useState<{ machine: Machine; optim: FstlineOptim } | null>(null);
  const [view, setView] = useState<'today' | 'all'>(isAdmin ? 'all' : 'today');
  const [currentMachine, setCurrentMachine] = useState<Machine | null>(() => {
    const stored = localStorage.getItem('sial-poste-coupe-machine');
    return stored && MACHINES.some(m => m.id === stored) ? (stored as Machine) : null;
  });

  useEffect(() => {
    if (currentMachine) localStorage.setItem('sial-poste-coupe-machine', currentMachine);
    else localStorage.removeItem('sial-poste-coupe-machine');
  }, [currentMachine]);

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

  const patchOptim = useCallback((id: string, machine: Machine, patch: Partial<OptimisationMachine>, eventToAdd?: Evenement) => {
    setCommandes(commandes.map(c => {
      if (c.id !== id) return c;
      const existing = c.optimisations[machine];
      if (!existing) return c;
      const evenements = eventToAdd ? [...getEvents(existing), eventToAdd] : existing.evenements;
      return {
        ...c,
        optimisations: { ...c.optimisations, [machine]: { ...existing, ...patch, evenements } },
      };
    }));
  }, [commandes, setCommandes]);

  const startImport = useCallback(async () => {
    const picked = await pickFile();
    if (picked) setImportState(picked);
  }, []);

  const buildOptim = useCallback((payload: ImportPayload, dateAssignee?: string): OptimisationMachine => {
    const now = new Date().toISOString();
    const evenements: Evenement[] = [];
    let base: OptimisationMachine = {
      importedAt: now,
      statut: 'a_faire',
      notes: '',
      dateAssignee,
      evenements: [],
    };
    if (payload.kind === 'pdf') {
      base = { ...base, pdfDataUrl: payload.dataUrl, pdfFilename: payload.file.name };
      evenements.push(makeEvent('import_pdf', userNom, payload.file.name));
    } else if (payload.kind === 'xml') {
      base = { ...base, xmlFilename: payload.file.name, parsedOptim: payload.parsed };
      evenements.push(makeEvent('import_xml', userNom, `${payload.file.name} — ${payload.parsed.totalBarres} barres, ${payload.parsed.totalPieces} pièces`));
    }
    if (dateAssignee) {
      evenements.push(makeEvent('date_assignee', userNom, dateAssignee));
    }
    return { ...base, evenements };
  }, [userNom]);

  const handleImportConfirm = useCallback((
    commandeId: string,
    machine: Machine,
    dateAssignee: string | undefined,
    newCommande?: { ref: string; nom: string; date: string },
  ) => {
    if (!importState || importState.kind === 'error') return;
    const optim = buildOptim(importState, dateAssignee);
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
      // Si une optim existe déjà sur cette machine, on fusionne PDF/XML proprement
      const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
      if (existing && importState.kind === 'pdf') {
        patchOptim(commandeId, machine,
          { pdfDataUrl: optim.pdfDataUrl, pdfFilename: optim.pdfFilename },
          makeEvent(existing.pdfDataUrl ? 'pdf_remplace' : 'import_pdf', userNom, importState.file.name));
      } else if (existing && importState.kind === 'xml') {
        patchOptim(commandeId, machine,
          { xmlFilename: optim.xmlFilename, parsedOptim: optim.parsedOptim },
          makeEvent(existing.parsedOptim ? 'xml_remplace' : 'import_xml', userNom,
            `${importState.file.name} — ${importState.parsed.totalBarres} barres, ${importState.parsed.totalPieces} pièces`));
      } else {
        setOptim(commandeId, machine, optim);
      }
      setSelectedId(commandeId);
    }
    setImportState(null);
  }, [importState, commandes, setCommandes, setOptim, patchOptim, buildOptim, userNom]);

  const replaceFile = useCallback(async (commandeId: string, machine: Machine) => {
    const picked = await pickFile();
    if (!picked || picked.kind === 'error') {
      if (picked?.kind === 'error') alert(picked.error);
      return;
    }
    const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
    if (!existing) return;
    if (picked.kind === 'pdf') {
      patchOptim(commandeId, machine,
        { pdfDataUrl: picked.dataUrl, pdfFilename: picked.file.name },
        makeEvent(existing.pdfDataUrl ? 'pdf_remplace' : 'import_pdf', userNom, picked.file.name));
    } else {
      patchOptim(commandeId, machine,
        { xmlFilename: picked.file.name, parsedOptim: picked.parsed },
        makeEvent(existing.parsedOptim ? 'xml_remplace' : 'import_xml', userNom,
          `${picked.file.name} — ${picked.parsed.totalBarres} barres, ${picked.parsed.totalPieces} pièces`));
    }
  }, [commandes, patchOptim, userNom]);

  const changeStatut = useCallback((commandeId: string, machine: Machine, statut: StatutMachine) => {
    const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
    if (!existing || existing.statut === statut) return;
    patchOptim(commandeId, machine, { statut },
      makeEvent('statut_change', userNom, `${STATUT_LABEL[existing.statut]} → ${STATUT_LABEL[statut]}`));
  }, [commandes, patchOptim, userNom]);

  const toggleEnvoiAtelier = useCallback((commandeId: string, machine: Machine) => {
    if (!isAdmin) return;
    const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
    if (!existing) return;
    if (existing.envoyeeAtelier) {
      patchOptim(commandeId, machine, { envoyeeAtelier: false, envoyeePar: undefined, envoyeeLe: undefined },
        makeEvent('annule_envoi', userNom));
    } else {
      patchOptim(commandeId, machine, { envoyeeAtelier: true, envoyeePar: userNom, envoyeeLe: new Date().toISOString() },
        makeEvent('envoye_atelier', userNom));
    }
  }, [isAdmin, commandes, patchOptim, userNom]);

  const setDateAssignee = useCallback((commandeId: string, machine: Machine, date: string) => {
    if (!isAdmin) return;
    const existing = commandes.find(c => c.id === commandeId)?.optimisations[machine];
    if (!existing || existing.dateAssignee === date) return;
    patchOptim(commandeId, machine, { dateAssignee: date || undefined },
      makeEvent('date_assignee', userNom, date || '(effacée)'));
  }, [isAdmin, commandes, patchOptim, userNom]);

  // ── Vue Liste (Aujourd'hui ou Toutes) ──
  if (!selected) {
    const filtered = commandes
      .filter(c => !search || c.nom.toLowerCase().includes(search.toLowerCase()) || c.ref.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date));

    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={onBack} className="text-gray-400 hover:text-white shrink-0"><ArrowLeft size={18} /></button>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white">Poste de Coupe</h1>
                <p className="text-[10px] text-gray-500 truncate">PDF + XML FSTLINE — LMT 65 / DT / Renfort Acier</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex bg-[#1c1e24] border border-[#2a2d35] rounded-lg p-0.5">
                <button onClick={() => setView('today')}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                    view === 'today' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  <Calendar size={11} className="inline mr-1 -mt-0.5" /> Aujourd'hui
                </button>
                <button onClick={() => setView('all')}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded transition-colors ${
                    view === 'all' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                  }`}>
                  Toutes commandes
                </button>
              </div>
              {isAdmin && (
                <button onClick={startImport}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
                  <Upload size={14} /> Importer
                </button>
              )}
            </div>
          </div>
        </header>

        {view === 'today' ? (
          <OperatorTodayView
            commandes={commandes}
            currentMachine={currentMachine}
            setCurrentMachine={setCurrentMachine}
            search={search}
            setSearch={setSearch}
            userNom={userNom}
            onOpenCommande={(id) => setSelectedId(id)}
            onChangeStatut={changeStatut}
            onViewPdf={(dataUrl, filename) => setPdfViewer({ dataUrl, filename })}
            onViewPieces={(machine, opt) => setPiecesView({ machine, optim: opt })}
          />
        ) : (
          <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
            <div className="relative max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher commande ou chantier..."
                className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-gray-500 text-sm">
                Aucune commande. {isAdmin ? 'Cliquez sur « Importer » pour démarrer.' : 'Demande au manager d\'importer une optimisation.'}
              </div>
            )}

            {filtered.map(c => {
              const nbOptims = Object.keys(c.optimisations).length;
              const nbCoupes = Object.values(c.optimisations).filter(o => o?.statut === 'coupe').length;
              const nbAnomalies = Object.values(c.optimisations).filter(o => o && STATUT_ANOMALIE.includes(o.statut)).length;
              const nbEnvoyees = Object.values(c.optimisations).filter(o => o?.envoyeeAtelier).length;
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
                        {nbEnvoyees > 0 && <span className="text-blue-400">{nbEnvoyees} envoyée{nbEnvoyees > 1 ? 's' : ''}</span>}
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
        )}

        {importState && (
          <ImportModal payload={importState} commandes={commandes} isAdmin={isAdmin}
            onClose={() => setImportState(null)}
            onConfirm={handleImportConfirm} />
        )}
        {pdfViewer && <PdfViewerModal {...pdfViewer} onClose={() => setPdfViewer(null)} />}
        {piecesView && (
          <PiecesModal
            machine={MACHINES.find(m => m.id === piecesView.machine)!}
            optim={piecesView.optim}
            onClose={() => setPiecesView(null)} />
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
              <input value={selected.nom}
                onChange={e => updateCommande(selected.id, { nom: e.target.value })}
                className="text-sm font-bold text-white bg-transparent outline-none border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 px-1 -mx-1 min-w-0" />
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
                isAdmin={isAdmin}
                onImport={async () => {
                  const picked = await pickFile();
                  if (!picked) return;
                  if (picked.kind === 'error') { alert(picked.error); return; }
                  setOptim(selected.id, m.id, buildOptim(picked));
                }}
                onReplace={() => replaceFile(selected.id, m.id)}
                onDelete={() => {
                  if (!confirm(`Supprimer le fichier ${m.label} ?`)) return;
                  patchOptim(selected.id, m.id,
                    { pdfDataUrl: undefined, pdfFilename: undefined, xmlFilename: undefined, parsedOptim: undefined },
                    makeEvent('fichier_supprime', userNom));
                }}
                onViewPdf={() => optim?.pdfDataUrl && setPdfViewer({ dataUrl: optim.pdfDataUrl, filename: optim.pdfFilename ?? 'document.pdf' })}
                onViewPieces={() => optim?.parsedOptim && setPiecesView({ machine: m.id, optim: optim.parsedOptim })}
                onViewHistory={() => optim && setHistoryView({ machine: m.id, events: getEvents(optim) })}
                onStatut={(s) => changeStatut(selected.id, m.id, s)}
                onNotes={(n) => patchOptim(selected.id, m.id, { notes: n })}
                onToggleEnvoi={() => toggleEnvoiAtelier(selected.id, m.id)}
                onDateAssignee={(d) => setDateAssignee(selected.id, m.id, d)}
              />
            );
          })}
        </div>
      </main>

      {pdfViewer && <PdfViewerModal {...pdfViewer} onClose={() => setPdfViewer(null)} />}
      {historyView && (
        <HistoryModal
          machine={MACHINES.find(m => m.id === historyView.machine)!}
          events={historyView.events}
          onClose={() => setHistoryView(null)} />
      )}
      {piecesView && (
        <PiecesModal
          machine={MACHINES.find(m => m.id === piecesView.machine)!}
          optim={piecesView.optim}
          onClose={() => setPiecesView(null)} />
      )}
    </div>
  );
}

// ── Carte machine ────────────────────────────────────────────────────

function MachineCard({
  machine, optim, isAdmin,
  onImport, onReplace, onDelete, onViewPdf, onViewPieces, onViewHistory,
  onStatut, onNotes, onToggleEnvoi, onDateAssignee,
}: {
  machine: { id: Machine; label: string; color: string };
  optim: OptimisationMachine | undefined;
  isAdmin: boolean;
  onImport: () => void;
  onReplace: () => void;
  onDelete: () => void;
  onViewPdf: () => void;
  onViewPieces: () => void;
  onViewHistory: () => void;
  onStatut: (s: StatutMachine) => void;
  onNotes: (n: string) => void;
  onToggleEnvoi: () => void;
  onDateAssignee: (d: string) => void;
}) {
  const hasPdf = !!optim?.pdfDataUrl;
  const hasXml = !!optim?.parsedOptim;
  const nbEvents = optim ? getEvents(optim).length : 0;

  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-[#2a2d35] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: machine.color }} />
          <h2 className="text-sm font-bold text-white">{machine.label}</h2>
        </div>
        {optim?.envoyeeAtelier && (
          <span className="text-[9px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
            <Send size={9} className="inline mr-1" /> Envoyée
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col gap-3">
        {!optim ? (
          <button onClick={onImport}
            className="flex-1 min-h-[120px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#2a2d35] hover:border-blue-500/50 hover:bg-blue-500/5 rounded-lg text-gray-500 hover:text-blue-400 transition-colors">
            <Plus size={24} />
            <span className="text-xs">Importer PDF ou XML</span>
          </button>
        ) : (
          <>
            {/* Bloc fichiers */}
            <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-lg p-3 space-y-2">
              {hasPdf && (
                <div className="flex items-start gap-2">
                  <FileText size={14} className="text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white truncate" title={optim.pdfFilename}>{optim.pdfFilename}</p>
                    <button onClick={onViewPdf} className="text-[10px] text-blue-400 hover:text-blue-300 mt-0.5">Voir le PDF</button>
                  </div>
                </div>
              )}
              {hasXml && optim.parsedOptim && (
                <div className="flex items-start gap-2">
                  <FileCode2 size={14} className="text-purple-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-white truncate" title={optim.xmlFilename}>{optim.xmlFilename}</p>
                    <p className="text-[10px] text-gray-500">
                      {optim.parsedOptim.totalBarres} barres · {optim.parsedOptim.totalPieces} pièces · {optim.parsedOptim.profils.length} profilés
                    </p>
                    <button onClick={onViewPieces} className="text-[10px] text-purple-400 hover:text-purple-300 mt-0.5">Voir les pièces</button>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-1 pt-1 border-t border-[#2a2d35]">
                <span className="text-[9px] text-gray-600 flex-1">{new Date(optim.importedAt).toLocaleDateString('fr-FR')}</span>
                <button onClick={onReplace} title="Remplacer / Ajouter un fichier"
                  className="px-2 py-1 bg-[#252830] hover:bg-[#2f323a] text-gray-300 rounded">
                  <RefreshCw size={11} />
                </button>
                <button onClick={onDelete} title="Supprimer les fichiers"
                  className="px-2 py-1 bg-[#252830] hover:bg-red-500/20 text-gray-300 hover:text-red-400 rounded">
                  <Trash2 size={11} />
                </button>
              </div>
            </div>

            {/* Workflow manager */}
            <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 uppercase tracking-wide">À faire le</span>
                <input type="date" value={optim.dateAssignee ?? ''}
                  onChange={e => onDateAssignee(e.target.value)}
                  disabled={!isAdmin}
                  className="bg-transparent text-[11px] text-white outline-none border-b border-[#2a2d35] focus:border-blue-500 disabled:opacity-60 disabled:cursor-not-allowed" />
              </div>
              {isAdmin ? (
                <button onClick={onToggleEnvoi}
                  className={`w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-semibold border transition-all ${
                    optim.envoyeeAtelier
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 hover:bg-blue-600/30'
                      : 'bg-blue-600 text-white border-blue-500 hover:bg-blue-500'
                  }`}>
                  <Send size={12} />
                  {optim.envoyeeAtelier ? 'Annuler l\'envoi' : 'Envoyer à l\'atelier'}
                </button>
              ) : optim.envoyeeAtelier ? (
                <p className="text-[10px] text-blue-400">
                  Envoyée par {optim.envoyeePar} le {optim.envoyeeLe ? new Date(optim.envoyeeLe).toLocaleDateString('fr-FR') : '?'}
                </p>
              ) : (
                <p className="text-[10px] text-gray-500 italic">En attente d'envoi par le manager</p>
              )}
            </div>

            {/* Statut */}
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

            {/* Notes */}
            <div>
              <p className="text-[10px] text-gray-500 mb-1.5 uppercase tracking-wide">Notes</p>
              <textarea value={optim.notes} onChange={e => onNotes(e.target.value)}
                placeholder="Incident, manquant, remarque..."
                className="w-full min-h-[60px] bg-[#1c1e24] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none resize-none focus:border-blue-500/50" />
            </div>

            {/* Historique */}
            <button onClick={onViewHistory}
              className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-[#1c1e24] hover:bg-[#252830] border border-[#2a2d35] text-gray-400 hover:text-white rounded text-[10px]">
              <History size={11} /> Historique ({nbEvents})
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Modale import ───────────────────────────────────────────────────

function ImportModal({ payload, commandes, isAdmin, onClose, onConfirm }: {
  payload: ImportPayload;
  commandes: Commande[];
  isAdmin: boolean;
  onClose: () => void;
  onConfirm: (commandeId: string, machine: Machine, dateAssignee: string | undefined, newCommande?: { ref: string; nom: string; date: string }) => void;
}) {
  // Auto-détection des champs à partir du fichier
  const guessed = useMemo(() => {
    const name = payload.kind !== 'error' ? payload.file.name.replace(/\.(pdf|xml)$/i, '') : '';
    let ref = '';
    let nom = '';
    if (payload.kind === 'xml') {
      ref = detectOrdreRef(payload.parsed) ?? '';
      nom = detectChantier(payload.parsed) ?? '';
    }
    if (!ref) {
      const refMatch = name.match(/L[_-]?(\d{4})[_-]?(\d{3,4})/i);
      if (refMatch) ref = `L_${refMatch[1]}-${refMatch[2]}`;
    }
    if (!nom) {
      nom = name.replace(/Optimisation[_-]?/i, '').replace(/L[_-]?\d{4}[_-]?\d{3,4}/i, '').replace(/[_-]+/g, ' ').trim();
    }
    return { ref, nom };
  }, [payload]);

  const [machine, setMachine] = useState<Machine | null>(null);
  const [mode, setMode] = useState<'existing' | 'new'>(commandes.length > 0 ? 'existing' : 'new');
  const [existingId, setExistingId] = useState<string>(commandes[0]?.id ?? '');
  const [newRef, setNewRef] = useState(guessed.ref);
  const [newNom, setNewNom] = useState(guessed.nom);
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0, 10));
  const [dateAssignee, setDateAssignee] = useState('');

  if (payload.kind === 'error') {
    return (
      <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-[#181a20] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-3" onClick={e => e.stopPropagation()}>
          <h2 className="text-sm font-bold text-red-400 flex items-center gap-2"><AlertCircle size={16} /> Erreur d'import</h2>
          <p className="text-xs text-gray-300">{payload.error}</p>
          <p className="text-[10px] text-gray-500">Fichier : {payload.file.name}</p>
          <button onClick={onClose} className="w-full px-4 py-2 bg-[#252830] hover:bg-[#2f323a] text-white text-xs font-semibold rounded-lg">Fermer</button>
        </div>
      </div>
    );
  }

  const canConfirm = machine !== null && (
    (mode === 'existing' && existingId) ||
    (mode === 'new' && newRef.trim() && newNom.trim())
  );

  const handleConfirm = () => {
    if (!machine) return;
    const dateOpt = dateAssignee || undefined;
    if (mode === 'existing') {
      onConfirm(existingId, machine, dateOpt);
    } else {
      onConfirm(uid(), machine, dateOpt, { ref: newRef.trim(), nom: newNom.trim(), date: newDate });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-2xl max-w-lg w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white">
              Importer {payload.kind === 'xml' ? 'XML FSTLINE' : 'PDF d\'optimisation'}
            </h2>
            <p className="text-[11px] text-gray-500 mt-1 truncate" title={payload.file.name}>
              {payload.kind === 'xml' ? <FileCode2 size={11} className="inline mr-1 text-purple-400" /> : <FileText size={11} className="inline mr-1 text-blue-400" />}
              {payload.file.name}
            </p>
            {payload.kind === 'xml' && (
              <div className="mt-2 p-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-[10px] text-gray-400 space-y-0.5">
                <p>Job FSTLINE n° <span className="text-white font-mono">{payload.parsed.jobNum}</span></p>
                <p>{payload.parsed.totalBarres} barres · {payload.parsed.totalPieces} pièces · {payload.parsed.profils.length} profilés</p>
                <p>Profilés : <span className="text-gray-300">{payload.parsed.profils.map(p => p.code).join(', ')}</span></p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white shrink-0 ml-2"><X size={18} /></button>
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
              <input value={newRef} onChange={e => setNewRef(e.target.value)} placeholder="Réf (ex: L_2026-0103 ou O_2026-0136)"
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

        {isAdmin && (
          <div>
            <p className="text-[11px] text-gray-400 mb-2 font-semibold">À faire pour le (optionnel)</p>
            <input type="date" value={dateAssignee} onChange={e => setDateAssignee(e.target.value)}
              className="w-full px-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded text-xs text-white outline-none focus:border-blue-500/50" />
            <p className="text-[10px] text-gray-500 mt-1">Date prévue pour la coupe — visible côté opérateur</p>
          </div>
        )}

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

// ── Modale historique ───────────────────────────────────────────────

function HistoryModal({ machine, events, onClose }: {
  machine: { id: Machine; label: string; color: string };
  events: Evenement[];
  onClose: () => void;
}) {
  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[#2a2d35] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-400" />
            <h2 className="text-sm font-bold text-white">Historique — {machine.label}</h2>
            <span className="text-[10px] text-gray-500">({events.length} événement{events.length > 1 ? 's' : ''})</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {sorted.length === 0 ? (
            <p className="text-center text-xs text-gray-500 py-8">Aucun événement enregistré</p>
          ) : (
            <ol className="relative border-l border-[#2a2d35] pl-5 space-y-3">
              {sorted.map(ev => (
                <li key={ev.id} className="relative">
                  <span className="absolute -left-[26px] w-2.5 h-2.5 rounded-full bg-[#404550] ring-2 ring-[#181a20]" />
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-white">{EVENT_LABEL[ev.type]}</span>
                    <span className="text-[10px] text-gray-500">par {ev.userNom}</span>
                    <span className="text-[10px] text-gray-600 font-mono ml-auto">{fmtDateTime(ev.date)}</span>
                  </div>
                  {ev.details && (
                    <p className="text-[10px] text-gray-400 mt-0.5">{ev.details}</p>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modale liste des pièces (XML FSTLINE) ──────────────────────────

function PiecesModal({ machine, optim, onClose }: {
  machine: { id: Machine; label: string; color: string };
  optim: FstlineOptim;
  onClose: () => void;
}) {
  const [filterProfil, setFilterProfil] = useState<string | null>(null);

  const allPieces = useMemo(() => {
    const list: { barIndex: number; barProfilCode: string; barProfilDesc: string; barLen: number; barChute: number; piece: FstlineOptim['barres'][0]['pieces'][0] }[] = [];
    for (const b of optim.barres) {
      for (const p of b.pieces) {
        list.push({ barIndex: b.index, barProfilCode: b.profilCode, barProfilDesc: b.profilDesc, barLen: b.longueurBrute, barChute: b.chute, piece: p });
      }
    }
    return list;
  }, [optim]);

  const filtered = filterProfil ? allPieces.filter(it => it.barProfilCode === filterProfil) : allPieces;

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-3 border-b border-[#2a2d35] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Layers size={16} className="text-purple-400" />
            <h2 className="text-sm font-bold text-white">Pièces — {machine.label}</h2>
            <span className="text-[10px] text-gray-500">Job FSTLINE n° {optim.jobNum} · {optim.totalPieces} pièces · {optim.totalBarres} barres</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={16} /></button>
        </div>

        {/* Filtres profilés */}
        <div className="px-5 py-2 border-b border-[#2a2d35] flex items-center gap-1.5 flex-wrap shrink-0">
          <button onClick={() => setFilterProfil(null)}
            className={`px-2.5 py-1 rounded text-[10px] font-medium border ${
              filterProfil === null ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'text-gray-400 border-[#2a2d35] hover:border-[#404550]'
            }`}>
            Tous ({optim.totalPieces})
          </button>
          {optim.profils.map(p => {
            const count = allPieces.filter(it => it.barProfilCode === p.code).length;
            return (
              <button key={p.code} onClick={() => setFilterProfil(p.code)}
                className={`px-2.5 py-1 rounded text-[10px] font-medium border ${
                  filterProfil === p.code ? 'bg-blue-600/20 text-blue-300 border-blue-500/40' : 'text-gray-400 border-[#2a2d35] hover:border-[#404550]'
                }`}>
                {p.code} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3">
          <table className="w-full text-[10px] font-mono">
            <thead className="sticky top-0 bg-[#181a20]">
              <tr className="text-gray-500 border-b border-[#2a2d35]">
                <th className="text-left py-1.5 px-2">Barre</th>
                <th className="text-left py-1.5 px-2">Profilé</th>
                <th className="text-left py-1.5 px-2">Code-barre</th>
                <th className="text-right py-1.5 px-2">Long. IL</th>
                <th className="text-center py-1.5 px-2">G°</th>
                <th className="text-center py-1.5 px-2">D°</th>
                <th className="text-left py-1.5 px-2">Typologie</th>
                <th className="text-left py-1.5 px-2">Rôle</th>
                <th className="text-left py-1.5 px-2">Dim. menuis.</th>
                <th className="text-right py-1.5 px-2">Usinages</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => (
                <tr key={`${it.piece.barcode}-${i}`} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                  <td className="py-1 px-2 text-gray-400">#{it.barIndex}</td>
                  <td className="py-1 px-2 text-blue-400">{it.barProfilCode}</td>
                  <td className="py-1 px-2 text-gray-300 text-[9px]">{it.piece.barcode}</td>
                  <td className="py-1 px-2 text-right text-amber-300">{it.piece.longueurInt}</td>
                  <td className="py-1 px-2 text-center text-gray-400">{it.piece.angleG}°</td>
                  <td className="py-1 px-2 text-center text-gray-400">{it.piece.angleD}°</td>
                  <td className="py-1 px-2 text-gray-300">{it.piece.typologie}</td>
                  <td className="py-1 px-2 text-gray-400">{it.piece.role}</td>
                  <td className="py-1 px-2 text-gray-500">{it.piece.dimensionsMenuiserie ?? '—'}</td>
                  <td className="py-1 px-2 text-right text-gray-500">{it.piece.machinings.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Vue Opérateur « Aujourd'hui » ───────────────────────────────────

interface TaskItem {
  commande: Commande;
  optim: OptimisationMachine;
  machine: Machine;
}

function OperatorTodayView({
  commandes, currentMachine, setCurrentMachine, search, setSearch,
  userNom, onOpenCommande, onChangeStatut, onViewPdf, onViewPieces,
}: {
  commandes: Commande[];
  currentMachine: Machine | null;
  setCurrentMachine: (m: Machine | null) => void;
  search: string;
  setSearch: (s: string) => void;
  userNom: string;
  onOpenCommande: (id: string) => void;
  onChangeStatut: (commandeId: string, machine: Machine, statut: StatutMachine) => void;
  onViewPdf: (dataUrl: string, filename: string) => void;
  onViewPieces: (machine: Machine, optim: FstlineOptim) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);

  const buckets = useMemo(() => {
    const aPreparer: TaskItem[] = [];
    const aCouper: TaskItem[] = [];
    const aRefaire: TaskItem[] = [];
    const bloque: TaskItem[] = [];
    if (!currentMachine) return { aPreparer, aCouper, aRefaire, bloque };
    const q = search.trim().toLowerCase();
    for (const c of commandes) {
      if (q && !c.nom.toLowerCase().includes(q) && !c.ref.toLowerCase().includes(q)) continue;
      const optim = c.optimisations[currentMachine];
      if (!optim || !optim.envoyeeAtelier) continue;
      if (optim.dateAssignee && optim.dateAssignee > today) continue;
      const item: TaskItem = { commande: c, optim, machine: currentMachine };
      if (optim.statut === 'a_faire') aPreparer.push(item);
      else if (optim.statut === 'prepare') aCouper.push(item);
      else if (optim.statut === 'barre_a_refaire' || optim.statut === 'piece_a_refaire') aRefaire.push(item);
      else if (optim.statut === 'barre_manquante' || optim.statut === 'non_conforme') bloque.push(item);
    }
    const byDate = (a: TaskItem, b: TaskItem) => (a.optim.dateAssignee ?? '').localeCompare(b.optim.dateAssignee ?? '');
    aPreparer.sort(byDate); aCouper.sort(byDate); aRefaire.sort(byDate); bloque.sort(byDate);
    return { aPreparer, aCouper, aRefaire, bloque };
  }, [commandes, currentMachine, search, today]);

  const todayCount = useMemo(() => {
    if (!currentMachine) return 0;
    let n = 0;
    for (const c of commandes) {
      const optim = c.optimisations[currentMachine];
      if (!optim || optim.statut !== 'coupe') continue;
      const events = getEvents(optim);
      const lastStatutChange = [...events].reverse().find(e => e.type === 'statut_change');
      if (lastStatutChange && lastStatutChange.userNom === userNom && lastStatutChange.date.slice(0, 10) === today) n++;
    }
    return n;
  }, [commandes, currentMachine, userNom, today]);

  return (
    <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-5">
      {/* Sélection machine */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
        <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wide">Tu travailles sur</p>
        <div className="grid grid-cols-3 gap-2">
          {MACHINES.map(m => {
            const active = currentMachine === m.id;
            return (
              <button key={m.id} onClick={() => setCurrentMachine(active ? null : m.id)}
                className={`px-3 py-3 rounded-lg border text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  active ? 'bg-blue-600/30 text-white border-blue-500' : 'bg-[#1c1e24] text-gray-400 border-[#2a2d35] hover:border-[#404550]'
                }`}>
                <div className="w-3 h-3 rounded" style={{ backgroundColor: m.color }} />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {!currentMachine && (
        <div className="text-center py-10 text-gray-500 text-sm">
          Choisis ta machine pour voir ce que tu dois faire aujourd'hui.
        </div>
      )}

      {currentMachine && (
        <>
          <div className="relative max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher commande (réf ou chantier)..."
              className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
          </div>

          <TaskSection
            title="À préparer" icon={<Layers size={14} />} accent="amber"
            items={buckets.aPreparer} emptyLabel="Rien à préparer."
            primaryAction={{ label: 'Marquer préparé', icon: <Check size={12} />, statut: 'prepare' }}
            onAction={onChangeStatut} onOpen={onOpenCommande} onViewPdf={onViewPdf} onViewPieces={onViewPieces} />

          <TaskSection
            title="À couper" icon={<Scissors size={14} />} accent="green"
            items={buckets.aCouper} emptyLabel="Rien à couper."
            primaryAction={{ label: 'Marquer coupé', icon: <Check size={12} />, statut: 'coupe' }}
            onAction={onChangeStatut} onOpen={onOpenCommande} onViewPdf={onViewPdf} onViewPieces={onViewPieces} />

          <TaskSection
            title="À refaire" icon={<RotateCcw size={14} />} accent="orange"
            items={buckets.aRefaire} emptyLabel="Rien à refaire ✓"
            primaryAction={{ label: 'Reprendre', icon: <RotateCcw size={12} />, statut: 'prepare' }}
            onAction={onChangeStatut} onOpen={onOpenCommande} onViewPdf={onViewPdf} onViewPieces={onViewPieces} />

          {buckets.bloque.length > 0 && (
            <TaskSection
              title="Bloqué — manager à prévenir" icon={<AlertTriangle size={14} />} accent="red"
              items={buckets.bloque} emptyLabel="—"
              primaryAction={null}
              onAction={onChangeStatut} onOpen={onOpenCommande} onViewPdf={onViewPdf} onViewPieces={onViewPieces} />
          )}

          <div className="text-center py-3 text-[11px] text-gray-500 border-t border-[#2a2d35]">
            ✓ Aujourd'hui · {todayCount} commande{todayCount > 1 ? 's' : ''} coupée{todayCount > 1 ? 's' : ''} par toi sur {MACHINES.find(m => m.id === currentMachine)?.label}
          </div>
        </>
      )}
    </main>
  );
}

// ── Section de tâches ───────────────────────────────────────────────

function TaskSection({
  title, icon, accent, items, emptyLabel, primaryAction,
  onAction, onOpen, onViewPdf, onViewPieces,
}: {
  title: string;
  icon: React.ReactNode;
  accent: 'amber' | 'green' | 'orange' | 'red';
  items: TaskItem[];
  emptyLabel: string;
  primaryAction: { label: string; icon: React.ReactNode; statut: StatutMachine } | null;
  onAction: (commandeId: string, machine: Machine, statut: StatutMachine) => void;
  onOpen: (id: string) => void;
  onViewPdf: (dataUrl: string, filename: string) => void;
  onViewPieces: (machine: Machine, optim: FstlineOptim) => void;
}) {
  const accentClass = {
    amber: 'border-amber-500/30 bg-amber-500/5',
    green: 'border-green-500/30 bg-green-500/5',
    orange: 'border-orange-500/30 bg-orange-500/5',
    red: 'border-red-500/40 bg-red-500/5',
  }[accent];
  const titleClass = {
    amber: 'text-amber-300',
    green: 'text-green-400',
    orange: 'text-orange-300',
    red: 'text-red-300',
  }[accent];

  return (
    <section className={`border rounded-xl ${accentClass}`}>
      <div className="px-4 py-2.5 border-b border-[#2a2d35] flex items-center justify-between">
        <h2 className={`text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${titleClass}`}>
          {icon} {title}
        </h2>
        <span className="text-[11px] text-gray-500">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <div className="px-4 py-4 text-center text-[11px] text-gray-500">{emptyLabel}</div>
      ) : (
        <ul className="divide-y divide-[#2a2d35]">
          {items.map(it => (
            <TaskRow key={it.commande.id + it.machine}
              item={it} primaryAction={primaryAction}
              onAction={onAction} onOpen={onOpen} onViewPdf={onViewPdf} onViewPieces={onViewPieces} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Une ligne de tâche ──────────────────────────────────────────────

function TaskRow({
  item, primaryAction, onAction, onOpen, onViewPdf, onViewPieces,
}: {
  item: TaskItem;
  primaryAction: { label: string; icon: React.ReactNode; statut: StatutMachine } | null;
  onAction: (commandeId: string, machine: Machine, statut: StatutMachine) => void;
  onOpen: (id: string) => void;
  onViewPdf: (dataUrl: string, filename: string) => void;
  onViewPieces: (machine: Machine, optim: FstlineOptim) => void;
}) {
  const { commande, optim, machine } = item;
  const [showAnomalie, setShowAnomalie] = useState(false);
  const hasPdf = !!optim.pdfDataUrl;
  const hasXml = !!optim.parsedOptim;

  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <button onClick={() => onOpen(commande.id)} className="text-left min-w-0 flex-1 hover:opacity-80">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-white">{commande.nom}</span>
            <span className="text-[10px] text-gray-500 font-mono">{commande.ref}</span>
            {optim.dateAssignee && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30">
                <Calendar size={9} className="inline mr-0.5 -mt-0.5" />
                {new Date(optim.dateAssignee).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
            {hasPdf && <span><FileText size={9} className="inline mr-0.5 text-blue-400" /> PDF</span>}
            {hasXml && optim.parsedOptim && (
              <span><FileCode2 size={9} className="inline mr-0.5 text-purple-400" />
                {optim.parsedOptim.totalBarres} barres · {optim.parsedOptim.totalPieces} pièces
              </span>
            )}
            {STATUT_ANOMALIE.includes(optim.statut) && (
              <span className="text-red-400">⚠ {STATUT_LABEL[optim.statut]}</span>
            )}
            {optim.notes && <span className="italic text-gray-400 truncate max-w-md">« {optim.notes} »</span>}
          </div>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          {hasPdf && (
            <button onClick={() => onViewPdf(optim.pdfDataUrl!, optim.pdfFilename ?? 'doc.pdf')}
              className="px-2 py-1.5 bg-[#252830] hover:bg-[#2f323a] text-gray-300 text-[10px] rounded">
              <FileText size={11} />
            </button>
          )}
          {hasXml && optim.parsedOptim && (
            <button onClick={() => onViewPieces(machine, optim.parsedOptim!)}
              className="px-2 py-1.5 bg-[#252830] hover:bg-[#2f323a] text-purple-300 text-[10px] rounded">
              <Layers size={11} />
            </button>
          )}
          {primaryAction && (
            <button onClick={() => onAction(commande.id, machine, primaryAction.statut)}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-[11px] font-semibold rounded">
              {primaryAction.icon} {primaryAction.label}
            </button>
          )}
          <button onClick={() => setShowAnomalie(s => !s)} title="Déclarer un problème"
            className={`px-2 py-1.5 text-[11px] rounded ${showAnomalie ? 'bg-orange-600 text-white' : 'bg-[#252830] hover:bg-orange-500/30 text-orange-300'}`}>
            <AlertTriangle size={11} />
          </button>
        </div>
      </div>

      {showAnomalie && (
        <div className="mt-2 pt-2 border-t border-[#2a2d35]">
          <p className="text-[10px] text-gray-500 mb-1.5">Type d'anomalie :</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
            {STATUT_ANOMALIE.map(s => (
              <button key={s} onClick={() => { onAction(commande.id, machine, s); setShowAnomalie(false); }}
                className={`px-2 py-1.5 text-[10px] font-medium rounded border ${STATUT_STYLE[s]} hover:brightness-125`}>
                {STATUT_LABEL[s]}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
