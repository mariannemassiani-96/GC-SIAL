import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ArrowLeft, Search, X, AlertTriangle, ChevronDown, ChevronUp, Plus, Save, Upload, CheckCircle, Send, FileText, Lock, Unlock, Clock, Circle, Zap, Bell, Info, Check } from 'lucide-react';
import { listCommandesGlobales, upsertCommandeGlobale, patchCommandeModule, getProductionStatsByCommande, type CommandeGlobale, type ModuleStatus } from '../api';
import { parseExcelFile, parseCSVText } from '../vitrage/parseExcel';
import { parseFstlineFile, type FstJob } from '../atelier/fstlineParser';
import type { Vitrage } from '../vitrage/types';

// ── Types ────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

interface ModuleDef {
  key: keyof Pick<CommandeGlobale, 'reception' | 'coupe_profiles' | 'vitrage' | 'assemblage' | 'livraison'>;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/** Shape of the vitrage JSONB column when populated with import data */
interface VitrageModuleData extends ModuleStatus {
  vitrages?: Vitrage[];
  fileName?: string;
}

/** Shape of the coupe_profiles JSONB column when populated with import data */
interface CoupeModuleData extends ModuleStatus {
  machines?: {
    lmt65?: FstJob;
    dt?: FstJob;
    renfort?: FstJob;
  };
  fileNames?: {
    lmt65?: string;
    dt?: string;
    renfort?: string;
  };
}

type CoupeMachineKey = 'lmt65' | 'dt' | 'renfort';

const MODULES: ModuleDef[] = [
  { key: 'reception', label: 'Reception', color: 'text-sky-400', bgColor: 'bg-sky-600/20', borderColor: 'border-sky-500/30' },
  { key: 'coupe_profiles', label: 'Coupe Profiles', color: 'text-red-400', bgColor: 'bg-red-600/20', borderColor: 'border-red-500/30' },
  { key: 'vitrage', label: 'Coupe Verre', color: 'text-blue-400', bgColor: 'bg-blue-600/20', borderColor: 'border-blue-500/30' },
  { key: 'assemblage', label: 'Assemblage', color: 'text-amber-400', bgColor: 'bg-amber-600/20', borderColor: 'border-amber-500/30' },
  { key: 'livraison', label: 'Livraison', color: 'text-emerald-400', bgColor: 'bg-emerald-600/20', borderColor: 'border-emerald-500/30' },
];

// ── Workflow Status Types ────────────────────────────────────────────

type WorkflowStatus = 'pas_commence' | 'attente' | 'en_cours' | 'bloque' | 'termine';

interface WorkflowStatusInfo {
  status: WorkflowStatus;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  dotClass: string;
  icon: typeof CheckCircle;
  animate: boolean;
}

const WORKFLOW_STATUS_MAP: Record<WorkflowStatus, WorkflowStatusInfo> = {
  pas_commence: {
    status: 'pas_commence',
    label: 'Pas commence',
    colorClass: 'text-gray-500',
    bgClass: 'bg-gray-600/20',
    borderClass: 'border-gray-500/30',
    dotClass: 'bg-gray-600',
    icon: Circle,
    animate: false,
  },
  attente: {
    status: 'attente',
    label: 'En attente',
    colorClass: 'text-gray-400',
    bgClass: 'bg-gray-600/20',
    borderClass: 'border-gray-400/40',
    dotClass: 'bg-gray-400',
    icon: Clock,
    animate: false,
  },
  en_cours: {
    status: 'en_cours',
    label: 'En cours',
    colorClass: 'text-amber-400',
    bgClass: 'bg-amber-600/20',
    borderClass: 'border-amber-500/30',
    dotClass: 'bg-amber-500',
    icon: Zap,
    animate: true,
  },
  bloque: {
    status: 'bloque',
    label: 'Bloque',
    colorClass: 'text-red-400',
    bgClass: 'bg-red-600/20',
    borderClass: 'border-red-500/30',
    dotClass: 'bg-red-500',
    icon: Lock,
    animate: true,
  },
  termine: {
    status: 'termine',
    label: 'Termine',
    colorClass: 'text-green-400',
    bgClass: 'bg-green-600/20',
    borderClass: 'border-green-500/30',
    dotClass: 'bg-green-500',
    icon: CheckCircle,
    animate: false,
  },
};

// ── Helpers ──────────────────────────────────────────────────────────

function getModuleWorkflowStatus(mod: ModuleStatus): WorkflowStatus {
  if (!mod || typeof mod !== 'object') return 'pas_commence';
  if (mod.statut === 'termine') return 'termine';
  if (mod.statut === 'bloque' || (mod.nc !== undefined && mod.nc > 0)) return 'bloque';
  if (mod.statut === 'en_cours') return 'en_cours';
  if (mod.statut === 'attente') return 'attente';
  // Has data but no explicit status
  if (mod.total && mod.total > 0) {
    if (mod.fait && mod.fait > 0) return 'en_cours';
    return 'attente';
  }
  return 'pas_commence';
}

function getModuleProgress(mod: ModuleStatus): number {
  if (!mod || typeof mod !== 'object') return 0;
  if (mod.statut === 'termine') return 100;
  if (mod.total && mod.total > 0 && mod.fait !== undefined) {
    return Math.round((mod.fait / mod.total) * 100);
  }
  return 0;
}

function getModuleStatutLabel(mod: ModuleStatus): string {
  if (!mod || typeof mod !== 'object') return 'Attente';
  if (mod.statut === 'termine') return 'Termine';
  if (mod.statut === 'en_cours') return 'En cours';
  if (mod.statut === 'bloque') return 'Bloque';
  if (mod.total && mod.fait && mod.fait > 0) return 'En cours';
  return 'Attente';
}

/** Count commands that need supervisor attention (blocked or NC > 0) */
function countAttentionNeeded(commandes: CommandeGlobale[]): number {
  return commandes.filter(c =>
    MODULES.some(m => {
      const mod = c[m.key] as ModuleStatus;
      if (!mod || typeof mod !== 'object') return false;
      return mod.statut === 'bloque' || (mod.nc !== undefined && mod.nc > 0);
    })
  ).length;
}

/** Check if module progress is complete (fait >= total) */
function isModuleComplete(mod: ModuleStatus): boolean {
  if (!mod || typeof mod !== 'object') return false;
  if (mod.statut === 'termine') return true;
  if (mod.total && mod.total > 0 && mod.fait !== undefined) {
    return mod.fait >= mod.total;
  }
  return false;
}

function getOverallProgress(cmd: CommandeGlobale): number {
  const progresses = MODULES.map(m => getModuleProgress(cmd[m.key] as ModuleStatus));
  return Math.round(progresses.reduce((a, b) => a + b, 0) / MODULES.length);
}

function hasAlerts(mod: ModuleStatus): boolean {
  if (!mod || typeof mod !== 'object') return false;
  return (mod.nc !== undefined && mod.nc > 0) || (mod.bloque !== undefined && mod.bloque > 0);
}

function getWeekNumber(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const days = Math.floor((d.getTime() - oneJan.getTime()) / 86400000);
  return `S${Math.ceil((days + oneJan.getDay() + 1) / 7)}`;
}

// ── Module Progress Bar (Enhanced with 5-state) ─────────────────────

function ModuleProgressBar({ mod, def }: { mod: ModuleStatus; def: ModuleDef }) {
  const progress = getModuleProgress(mod);
  const alert = hasAlerts(mod);
  const wfStatus = getModuleWorkflowStatus(mod);
  const statusInfo = WORKFLOW_STATUS_MAP[wfStatus];

  const barColorClass = wfStatus === 'termine' ? 'bg-green-500'
    : wfStatus === 'bloque' ? 'bg-red-500'
    : wfStatus === 'en_cours' ? 'bg-amber-500'
    : wfStatus === 'attente' ? 'bg-gray-400'
    : 'bg-gray-700';

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] w-24 truncate ${def.color}`}>{def.label}</span>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${statusInfo.dotClass} ${statusInfo.animate ? 'animate-pulse' : ''}`} />
      <div className="flex-1 h-2 bg-[#1e2028] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${Math.max(progress, wfStatus === 'attente' ? 3 : 0)}%` }}
        />
      </div>
      <span className="text-[10px] text-gray-500 w-8 text-right">{progress}%</span>
      {alert && (
        <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />
      )}
    </div>
  );
}

// ── Alert Badge ─────────────────────────────────────────────────────

function AlertBadges({ cmd }: { cmd: CommandeGlobale }) {
  const ncCount = MODULES.reduce((acc, m) => {
    const mod = cmd[m.key] as ModuleStatus;
    return acc + (mod?.nc || 0);
  }, 0);
  const bloqueCount = MODULES.reduce((acc, m) => {
    const mod = cmd[m.key] as ModuleStatus;
    return acc + (mod?.bloque || 0);
  }, 0);

  if (ncCount === 0 && bloqueCount === 0) return null;

  return (
    <div className="flex gap-1.5 mt-2">
      {ncCount > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
          {ncCount} NC
        </span>
      )}
      {bloqueCount > 0 && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 border border-orange-500/30">
          {bloqueCount} Bloque
        </span>
      )}
    </div>
  );
}

// ── Command Card ────────────────────────────────────────────────────

function CommandCard({ cmd, onClick }: { cmd: CommandeGlobale; onClick: () => void }) {
  const overall = getOverallProgress(cmd);

  return (
    <button
      onClick={onClick}
      className="text-left p-5 rounded-xl border-2 border-[#2a2d35] bg-[#181a20] hover:border-green-500/50 hover:bg-green-600/5 cursor-pointer transition-all w-full"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0">
          <h3 className="font-mono text-sm font-bold text-white truncate">{cmd.ref}</h3>
          {cmd.client && <p className="text-xs text-gray-400 truncate">{cmd.client}</p>}
          {cmd.chantier && <p className="text-[10px] text-gray-500 truncate">{cmd.chantier}</p>}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
          <span className={`text-xs font-bold ${
            overall === 100 ? 'text-green-400' : overall > 0 ? 'text-amber-400' : 'text-gray-500'
          }`}>
            {overall}%
          </span>
          {cmd.semaine_fab && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-400 border border-violet-500/30">
              Fab {cmd.semaine_fab}
            </span>
          )}
          {cmd.semaine_liv && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              Liv {cmd.semaine_liv}
            </span>
          )}
        </div>
      </div>

      {/* Module progress bars */}
      <div className="space-y-1.5">
        {MODULES.map(m => (
          <ModuleProgressBar key={m.key} mod={cmd[m.key] as ModuleStatus} def={m} />
        ))}
      </div>

      <AlertBadges cmd={cmd} />
    </button>
  );
}

// ── Import Slot: Vitrage ────────────────────────────────────────────

function ImportSlotVitrage({
  vitrageData,
  chantier,
  onImported,
}: {
  vitrageData: VitrageModuleData;
  chantier: string;
  onImported: (data: VitrageModuleData) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const hasData = vitrageData.vitrages && vitrageData.vitrages.length > 0;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError('');
    try {
      let vitrages: Vitrage[];
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const result = parseCSVText(text);
        vitrages = result.vitrages;
      } else {
        const result = await parseExcelFile(file, chantier);
        vitrages = result.vitrages;
      }

      if (vitrages.length === 0) {
        setImportError('Aucun vitrage detecte dans le fichier');
        return;
      }

      onImported({
        statut: 'attente',
        total: vitrages.length,
        fait: 0,
        nc: 0,
        vitrages,
        fileName: file.name,
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur import');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="px-5 py-4 border border-[#2a2d35] rounded-lg bg-[#0f1117]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-sm font-semibold text-blue-400">ISULA VITRAGE</span>
        </div>
        {hasData && <CheckCircle size={16} className="text-green-400" />}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50"
        >
          <Upload size={12} />
          {importing ? 'Import...' : 'Importer Excel SI-AL'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFile}
          className="hidden"
        />
        {hasData && vitrageData.fileName && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText size={12} />
            <span>{vitrageData.fileName}</span>
          </div>
        )}
      </div>

      {hasData && (
        <p className="mt-2 text-xs text-green-400">{vitrageData.vitrages!.length} vitrages importes</p>
      )}

      {importError && (
        <p className="mt-2 text-xs text-red-400">{importError}</p>
      )}
    </div>
  );
}

// ── Import Slot: Coupe (single machine) ─────────────────────────────

function ImportSlotCoupe({
  label,
  machineKey,
  coupeData,
  onImported,
}: {
  label: string;
  machineKey: CoupeMachineKey;
  coupeData: CoupeModuleData;
  onImported: (machineKey: CoupeMachineKey, job: FstJob, xmlName: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');

  const machines = coupeData.machines || {};
  const fileNames = coupeData.fileNames || {};
  const job = machines[machineKey];
  const hasData = !!job;

  const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setImporting(true);
    setImportError('');
    try {
      // Find the XML file in the selection
      let xmlFile: File | null = null;
      let xmlName = '';
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (f.name.toLowerCase().endsWith('.xml')) {
          xmlFile = f;
          xmlName = f.name;
        }
      }

      if (!xmlFile) {
        setImportError('Aucun fichier XML trouve');
        return;
      }

      const parsed = await parseFstlineFile(xmlFile);
      if (parsed.totalBars === 0) {
        setImportError('Aucune barre detectee dans le XML');
        return;
      }

      onImported(machineKey, parsed, xmlName);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erreur import');
    } finally {
      setImporting(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const colorMap: Record<CoupeMachineKey, { dot: string; text: string; border: string; bg: string }> = {
    lmt65: { dot: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/30', bg: 'bg-red-600/20' },
    dt: { dot: 'bg-orange-500', text: 'text-orange-400', border: 'border-orange-500/30', bg: 'bg-orange-600/20' },
    renfort: { dot: 'bg-yellow-500', text: 'text-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-600/20' },
  };
  const colors = colorMap[machineKey];

  return (
    <div className="px-5 py-4 border border-[#2a2d35] rounded-lg bg-[#0f1117]">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colors.dot}`} />
          <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
        </div>
        {hasData && <CheckCircle size={16} className="text-green-400" />}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={importing}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border} rounded-lg hover:opacity-80 transition-colors disabled:opacity-50`}
        >
          <Upload size={12} />
          {importing ? 'Import...' : 'Importer XML + PDF'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xml,.pdf"
          multiple
          onChange={handleFiles}
          className="hidden"
        />
        {hasData && fileNames[machineKey] && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <FileText size={12} />
            <span>{fileNames[machineKey]}</span>
          </div>
        )}
      </div>

      {hasData && job && (
        <p className="mt-2 text-xs text-green-400">
          {job.totalBars} barres, {job.totalCuts} pieces
        </p>
      )}

      {importError && (
        <p className="mt-2 text-xs text-red-400">{importError}</p>
      )}
    </div>
  );
}

// ── Production Stats Section ────────────────────────────────────────

type ProdStat = { poste: string; action: string; user_nom: string; count: number; first_at: string; last_at: string };

function ProductionStatsSection({ cmdRef }: { cmdRef: string }) {
  const [stats, setStats] = useState<ProdStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getProductionStatsByCommande(cmdRef)
      .then(data => setStats(data))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [cmdRef]);

  if (loading) {
    return (
      <div className="px-5 py-4 border-b border-[#2a2d35]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Temps & Productivite</h3>
        <p className="text-xs text-gray-500">Chargement...</p>
      </div>
    );
  }

  if (stats.length === 0) {
    return (
      <div className="px-5 py-4 border-b border-[#2a2d35]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Temps & Productivite</h3>
        <p className="text-xs text-gray-500">Aucun evenement de production enregistre.</p>
      </div>
    );
  }

  // Group by poste
  const byPoste = new Map<string, typeof stats>();
  for (const s of stats) {
    const list = byPoste.get(s.poste) || [];
    list.push(s);
    byPoste.set(s.poste, list);
  }

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR') + ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const durationMinutes = (first: string, last: string) => {
    if (!first || !last) return 0;
    const diff = new Date(last).getTime() - new Date(first).getTime();
    return Math.max(0, Math.round(diff / 60000));
  };

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}min`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}`;
  };

  // Per-operator stats
  const byOperator = new Map<string, { count: number; postes: Set<string> }>();
  for (const s of stats) {
    if (!s.user_nom) continue;
    const entry = byOperator.get(s.user_nom) || { count: 0, postes: new Set<string>() };
    entry.count += s.count;
    entry.postes.add(s.poste);
    byOperator.set(s.user_nom, entry);
  }

  return (
    <div className="px-5 py-4 border-b border-[#2a2d35]">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Temps & Productivite</h3>

      {/* Per-poste table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-[#2a2d35]">
              <th className="text-left py-2 px-2">Poste</th>
              <th className="text-left py-2 px-2">Debut</th>
              <th className="text-left py-2 px-2">Fin</th>
              <th className="text-right py-2 px-2">Duree</th>
              <th className="text-right py-2 px-2">Pieces</th>
              <th className="text-right py-2 px-2">Pcs/h</th>
            </tr>
          </thead>
          <tbody>
            {[...byPoste.entries()].map(([poste, rows]) => {
              const totalCount = rows.reduce((a, r) => a + r.count, 0);
              const firstAt = rows.reduce((min, r) => (!min || r.first_at < min ? r.first_at : min), '');
              const lastAt = rows.reduce((max, r) => (!max || r.last_at > max ? r.last_at : max), '');
              const durMins = durationMinutes(firstAt, lastAt);
              const pcsPerHour = durMins > 0 ? Math.round(totalCount / (durMins / 60) * 10) / 10 : 0;

              return (
                <tr key={poste} className="border-b border-[#1e2028] hover:bg-[#1e2028]">
                  <td className="py-1.5 px-2 text-amber-400 font-semibold">{poste}</td>
                  <td className="py-1.5 px-2 text-gray-300">{formatDate(firstAt)}</td>
                  <td className="py-1.5 px-2 text-gray-300">{formatDate(lastAt)}</td>
                  <td className="py-1.5 px-2 text-white text-right font-mono">{formatDuration(durMins)}</td>
                  <td className="py-1.5 px-2 text-white text-right font-bold">{totalCount}</td>
                  <td className="py-1.5 px-2 text-green-400 text-right font-mono">{pcsPerHour > 0 ? pcsPerHour : '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Per-operator stats */}
      {byOperator.size > 0 && (
        <div>
          <h4 className="text-[10px] text-gray-500 uppercase mb-2">Par operateur</h4>
          <div className="flex flex-wrap gap-2">
            {[...byOperator.entries()].map(([nom, data]) => (
              <div key={nom} className="bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2">
                <div className="text-xs font-semibold text-white">{nom}</div>
                <div className="text-[10px] text-gray-400">{data.count} pieces - {[...data.postes].join(', ')}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Global Workflow Pipeline Bar ────────────────────────────────────

function WorkflowPipeline({ cmd, onScrollToModule }: { cmd: CommandeGlobale; onScrollToModule: (key: string) => void }) {
  return (
    <div className="px-5 py-4 border-b border-[#2a2d35] bg-[#0f1117]">
      <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Pipeline de production</h3>
      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {MODULES.map((m, idx) => {
          const mod = cmd[m.key] as ModuleStatus;
          const wfStatus = getModuleWorkflowStatus(mod);
          const statusInfo = WORKFLOW_STATUS_MAP[wfStatus];
          const progress = getModuleProgress(mod);
          const StatusIcon = statusInfo.icon;

          return (
            <div key={m.key} className="flex items-center">
              {idx > 0 && (
                <div className={`w-6 h-0.5 flex-shrink-0 ${
                  getModuleWorkflowStatus(cmd[MODULES[idx - 1].key] as ModuleStatus) === 'termine'
                    ? 'bg-green-500/50' : 'bg-[#2a2d35]'
                }`} />
              )}
              <button
                onClick={() => onScrollToModule(m.key)}
                className={`flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg border transition-all hover:scale-105 cursor-pointer flex-shrink-0 ${statusInfo.bgClass} ${statusInfo.borderClass}`}
                title={`${m.label} — ${statusInfo.label}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${statusInfo.bgClass} ${statusInfo.animate ? 'animate-pulse' : ''}`}>
                  <StatusIcon size={16} className={statusInfo.colorClass} />
                </div>
                <span className="text-[10px] font-medium text-gray-300 whitespace-nowrap">{m.label}</span>
                <span className={`text-[9px] font-semibold ${statusInfo.colorClass}`}>
                  {wfStatus === 'en_cours' ? `${progress}%` : statusInfo.label}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Module Workflow Actions ─────────────────────────────────────────

function ModuleWorkflowActions({
  mod,
  moduleDef,
  cmdRef,
  onRefresh,
}: {
  mod: ModuleStatus;
  moduleDef: ModuleDef;
  cmdRef: string;
  onRefresh: () => void;
}) {
  const [acting, setActing] = useState(false);
  const wfStatus = getModuleWorkflowStatus(mod);
  const statusInfo = WORKFLOW_STATUS_MAP[wfStatus];
  const progress = getModuleProgress(mod);
  const complete = isModuleComplete(mod);

  const handleAction = async (newStatut: 'en_cours' | 'termine' | 'attente') => {
    setActing(true);
    try {
      const patch: ModuleStatus = { ...mod, statut: newStatut };
      if (newStatut === 'termine') {
        patch.fait = patch.total || 0;
        patch.nc = 0;
        patch.bloque = 0;
      }
      if (newStatut === 'en_cours' || newStatut === 'attente') {
        // Debloquer: clear nc and bloque flags
        patch.nc = 0;
        patch.bloque = 0;
      }
      await patchCommandeModule(cmdRef, moduleDef.key, patch);
      onRefresh();
    } catch {
      // silent
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {/* Big status badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold ${statusInfo.bgClass} ${statusInfo.borderClass} border ${statusInfo.colorClass} ${statusInfo.animate ? 'animate-pulse' : ''}`}>
        <statusInfo.icon size={16} />
        {statusInfo.label}
      </div>

      {/* Progress bar with X/Y count */}
      {mod && mod.total !== undefined && mod.total > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">{mod.fait || 0} / {mod.total}</span>
            <span className={`font-bold ${progress === 100 ? 'text-green-400' : 'text-white'}`}>{progress}%</span>
          </div>
          <div className="h-3 bg-[#1e2028] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                wfStatus === 'termine' ? 'bg-green-500'
                : wfStatus === 'bloque' ? 'bg-red-500'
                : progress > 0 ? 'bg-amber-500' : 'bg-gray-700'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Contextual actions */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {/* Blocked: show reason + DEBLOQUER button */}
        {wfStatus === 'bloque' && (
          <>
            <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-600/10 border border-red-500/20 rounded-lg px-2.5 py-1.5">
              <AlertTriangle size={12} />
              <span>
                {mod?.nc && mod.nc > 0 ? `${mod.nc} NC` : ''}
                {mod?.nc && mod.nc > 0 && mod?.bloque && mod.bloque > 0 ? ' + ' : ''}
                {mod?.bloque && mod.bloque > 0 ? `${mod.bloque} bloque(s)` : ''}
                {(!mod?.nc || mod.nc === 0) && (!mod?.bloque || mod.bloque === 0) ? 'Validation requise' : ''}
              </span>
            </div>
            <button
              onClick={() => handleAction('en_cours')}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Unlock size={12} />
              {acting ? '...' : 'DEBLOQUER'}
            </button>
            <button
              onClick={() => handleAction('attente')}
              disabled={acting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              <Clock size={12} />
              {acting ? '...' : 'VALIDER'}
            </button>
          </>
        )}

        {/* En cours + complete: MARQUER TERMINE button */}
        {wfStatus === 'en_cours' && complete && (
          <button
            onClick={() => handleAction('termine')}
            disabled={acting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg transition-colors"
          >
            <Check size={12} />
            {acting ? '...' : 'MARQUER TERMINE'}
          </button>
        )}

        {/* Pas commence: info message */}
        {wfStatus === 'pas_commence' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-gray-600/10 border border-gray-500/20 rounded-lg px-2.5 py-1.5">
            <Info size={12} />
            <span>Importer les donnees et envoyer aux postes pour demarrer</span>
          </div>
        )}

        {/* Attente: info about waiting */}
        {wfStatus === 'attente' && (
          <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-600/10 border border-gray-400/20 rounded-lg px-2.5 py-1.5">
            <Clock size={12} />
            <span>Donnees importees — en attente d'envoi aux postes</span>
          </div>
        )}

        {/* Termine: completed badge */}
        {wfStatus === 'termine' && (
          <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-600/10 border border-green-500/20 rounded-lg px-2.5 py-1.5">
            <CheckCircle size={12} />
            <span>Module termine</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail View ─────────────────────────────────────────────────────

function DetailView({ cmd, onClose, onRefresh }: { cmd: CommandeGlobale; onClose: () => void; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [formClient, setFormClient] = useState(cmd.client);
  const [formChantier, setFormChantier] = useState(cmd.chantier);
  const [formSemFab, setFormSemFab] = useState(cmd.semaine_fab);
  const [formSemLiv, setFormSemLiv] = useState(cmd.semaine_liv);
  const [formNotes, setFormNotes] = useState(cmd.notes);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  // Local import state — mirrors what's in the command but allows accumulation before save
  const [localVitrage, setLocalVitrage] = useState<VitrageModuleData>(
    (cmd.vitrage as VitrageModuleData) || {}
  );
  const [localCoupe, setLocalCoupe] = useState<CoupeModuleData>(
    (cmd.coupe_profiles as CoupeModuleData) || {}
  );
  const [importDirty, setImportDirty] = useState(false);

  // Module section refs for scroll-to from pipeline
  const moduleRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollToModule = useCallback((key: string) => {
    const el = moduleRefs.current[key];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<CommandeGlobale> = {
        client: formClient,
        chantier: formChantier,
        semaine_fab: formSemFab,
        semaine_liv: formSemLiv,
        notes: formNotes,
      };
      // Include import data if changed
      if (importDirty) {
        payload.vitrage = localVitrage;
        payload.coupe_profiles = localCoupe;
      }
      await upsertCommandeGlobale(cmd.ref, payload);
      setEditing(false);
      setImportDirty(false);
      onRefresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleSaveImports = async () => {
    setSaving(true);
    try {
      await upsertCommandeGlobale(cmd.ref, {
        vitrage: localVitrage,
        coupe_profiles: localCoupe,
      });
      setImportDirty(false);
      onRefresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const handleVitrageImported = (data: VitrageModuleData) => {
    setLocalVitrage(data);
    setImportDirty(true);
  };

  const handleCoupeImported = (machineKey: CoupeMachineKey, job: FstJob, xmlName: string) => {
    setLocalCoupe(prev => {
      const machines = { ...(prev.machines || {}), [machineKey]: job };
      const fileNames = { ...(prev.fileNames || {}), [machineKey]: xmlName };
      // Compute totals across all machines
      let totalBars = 0;
      let totalCuts = 0;
      for (const k of ['lmt65', 'dt', 'renfort'] as CoupeMachineKey[]) {
        const m = machines[k];
        if (m) {
          totalBars += m.totalBars;
          totalCuts += m.totalCuts;
        }
      }
      return {
        ...prev,
        statut: 'attente' as const,
        total: totalCuts,
        fait: prev.fait || 0,
        nc: prev.nc || 0,
        machines,
        fileNames,
        totalBars,
      };
    });
    setImportDirty(true);
  };

  const handleEnvoyerAuxPostes = async () => {
    setSending(true);
    setSendSuccess(false);
    try {
      // Save import data and set statut to en_cours
      const vitragePayload: VitrageModuleData = {
        ...localVitrage,
        statut: localVitrage.vitrages && localVitrage.vitrages.length > 0 ? 'en_cours' : localVitrage.statut,
      };
      const coupePayload: CoupeModuleData = {
        ...localCoupe,
        statut: localCoupe.machines && Object.keys(localCoupe.machines).length > 0 ? 'en_cours' : localCoupe.statut,
      };

      await upsertCommandeGlobale(cmd.ref, {
        vitrage: vitragePayload,
        coupe_profiles: coupePayload,
      });
      setLocalVitrage(vitragePayload);
      setLocalCoupe(coupePayload);
      setImportDirty(false);
      setSendSuccess(true);
      onRefresh();
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const hasAnyImport = (localVitrage.vitrages && localVitrage.vitrages.length > 0) ||
    (localCoupe.machines && Object.keys(localCoupe.machines).length > 0);

  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a2d35]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 className="font-mono text-lg font-bold text-white">{cmd.ref}</h2>
            <p className="text-xs text-gray-500">
              {cmd.client}{cmd.chantier ? ` — ${cmd.chantier}` : ''}
              {cmd.date_creation ? ` — Cree le ${new Date(cmd.date_creation).toLocaleDateString('fr-FR')}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {cmd.semaine_fab && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-600/20 text-violet-400 border border-violet-500/30">
              Fab {cmd.semaine_fab}
            </span>
          )}
          {cmd.semaine_liv && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              Liv {cmd.semaine_liv}
            </span>
          )}
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-[#2a2d35] rounded-lg hover:border-green-500/40 transition-colors"
            >
              Modifier
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                <Save size={12} /> {saving ? '...' : 'Enregistrer'}
              </button>
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                Annuler
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="px-5 py-4 border-b border-[#2a2d35] bg-[#0f1117]">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Client</label>
              <input value={formClient} onChange={e => setFormClient(e.target.value)}
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Chantier</label>
              <input value={formChantier} onChange={e => setFormChantier(e.target.value)}
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Semaine fab.</label>
              <input value={formSemFab} onChange={e => setFormSemFab(e.target.value)} placeholder="S22"
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
            </div>
            <div>
              <label className="block text-[10px] text-gray-500 mb-1">Semaine liv.</label>
              <input value={formSemLiv} onChange={e => setFormSemLiv(e.target.value)} placeholder="S24"
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-[10px] text-gray-500 mb-1">Notes</label>
            <textarea value={formNotes} onChange={e => setFormNotes(e.target.value)} rows={2}
              className="w-full bg-[#181a20] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50 resize-none" />
          </div>
        </div>
      )}

      {/* ── Global Workflow Pipeline ──────────────────────────────── */}
      <WorkflowPipeline cmd={cmd} onScrollToModule={scrollToModule} />

      {/* ── File Import Section ─────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-[#2a2d35]">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Import fichiers par poste
        </h3>

        <div className="space-y-3">
          {/* Vitrage slot */}
          <ImportSlotVitrage
            vitrageData={localVitrage}
            chantier={cmd.chantier || ''}
            onImported={handleVitrageImported}
          />

          {/* Coupe LMT 65 */}
          <ImportSlotCoupe
            label="COUPE LMT 65"
            machineKey="lmt65"
            coupeData={localCoupe}
            onImported={handleCoupeImported}
          />

          {/* Coupe Double Tete */}
          <ImportSlotCoupe
            label="COUPE DOUBLE TETE"
            machineKey="dt"
            coupeData={localCoupe}
            onImported={handleCoupeImported}
          />

          {/* Coupe Renfort Acier */}
          <ImportSlotCoupe
            label="COUPE RENFORT ACIER"
            machineKey="renfort"
            coupeData={localCoupe}
            onImported={handleCoupeImported}
          />
        </div>

        {/* Save imports + Envoyer aux postes */}
        <div className="flex items-center gap-3 mt-4">
          {importDirty && (
            <button
              onClick={handleSaveImports}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Save size={14} /> {saving ? 'Sauvegarde...' : 'Sauvegarder imports'}
            </button>
          )}

          {hasAnyImport && (
            <button
              onClick={handleEnvoyerAuxPostes}
              disabled={sending || importDirty}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
              title={importDirty ? 'Sauvegardez les imports d\'abord' : 'Envoyer les donnees aux postes de travail'}
            >
              <Send size={14} /> {sending ? 'Envoi...' : 'Envoyer aux postes'}
            </button>
          )}

          {sendSuccess && (
            <span className="flex items-center gap-1 text-xs text-green-400">
              <CheckCircle size={14} /> Envoye aux postes
            </span>
          )}
        </div>
      </div>

      {/* Temps & Productivite */}
      <ProductionStatsSection cmdRef={cmd.ref} />

      {/* Modules detail with workflow actions */}
      <div className="divide-y divide-[#2a2d35]">
        {MODULES.map(m => {
          const mod = cmd[m.key] as ModuleStatus;
          const wfStatus = getModuleWorkflowStatus(mod);
          const statusInfo = WORKFLOW_STATUS_MAP[wfStatus];
          const alert = hasAlerts(mod);

          return (
            <div
              key={m.key}
              ref={el => { moduleRefs.current[m.key] = el; }}
              className="px-5 py-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${statusInfo.dotClass} ${statusInfo.animate ? 'animate-pulse' : ''}`} />
                  <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {alert && mod?.nc !== undefined && mod.nc > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-500/30">
                      {mod.nc} NC
                    </span>
                  )}
                  {alert && mod?.bloque !== undefined && mod.bloque > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-600/20 text-orange-400 border border-orange-500/30">
                      {mod.bloque} Bloque
                    </span>
                  )}
                </div>
              </div>

              {/* Workflow actions (status badge, progress bar, action buttons) */}
              <ModuleWorkflowActions
                mod={mod}
                moduleDef={m}
                cmdRef={cmd.ref}
                onRefresh={onRefresh}
              />
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {cmd.notes && !editing && (
        <div className="px-5 py-3 border-t border-[#2a2d35] bg-[#0f1117]">
          <p className="text-[10px] text-gray-500 mb-1">Notes</p>
          <p className="text-xs text-gray-300 whitespace-pre-wrap">{cmd.notes}</p>
        </div>
      )}
    </div>
  );
}

// ── New Command Form ────────────────────────────────────────────────

function NewCommandForm({ onCreated, onCancel }: { onCreated: (ref: string) => void; onCancel: () => void }) {
  const [ref, setRef] = useState('');
  const [client, setClient] = useState('');
  const [chantier, setChantier] = useState('');
  const [semFab, setSemFab] = useState('');
  const [semLiv, setSemLiv] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!ref.trim()) { setError('Reference requise'); return; }
    setSaving(true);
    setError('');
    try {
      await upsertCommandeGlobale(ref.trim(), {
        client,
        chantier,
        semaine_fab: semFab,
        semaine_liv: semLiv,
      });
      onCreated(ref.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur creation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#181a20] border border-green-500/30 rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-green-400">Nouvelle commande</h3>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Reference *</label>
          <input value={ref} onChange={e => setRef(e.target.value)} placeholder="L_2026-0103"
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white font-mono focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Client</label>
          <input value={client} onChange={e => setClient(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Chantier</label>
          <input value={chantier} onChange={e => setChantier(e.target.value)}
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Sem. fab.</label>
          <input value={semFab} onChange={e => setSemFab(e.target.value)} placeholder="S22"
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">Sem. liv.</label>
          <input value={semLiv} onChange={e => setSemLiv(e.target.value)} placeholder="S24"
            className="w-full bg-[#0f1117] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-green-500/50" />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors">
          <Save size={12} /> {saving ? 'Creation...' : 'Creer'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-gray-400 hover:text-white transition-colors">Annuler</button>
      </div>
    </div>
  );
}

// ── Summary Stats ───────────────────────────────────────────────────

function SummaryStats({ commandes }: { commandes: CommandeGlobale[] }) {
  const total = commandes.length;
  const termine = commandes.filter(c => getOverallProgress(c) === 100).length;
  const enCours = commandes.filter(c => { const p = getOverallProgress(c); return p > 0 && p < 100; }).length;
  const attente = commandes.filter(c => getOverallProgress(c) === 0).length;
  const ncTotal = commandes.reduce((acc, c) =>
    acc + MODULES.reduce((a, m) => a + ((c[m.key] as ModuleStatus)?.nc || 0), 0), 0
  );

  const stats = [
    { label: 'Total', value: total, color: 'text-white', bg: 'bg-gray-600/20', border: 'border-gray-500/30' },
    { label: 'En cours', value: enCours, color: 'text-amber-400', bg: 'bg-amber-600/20', border: 'border-amber-500/30' },
    { label: 'Attente', value: attente, color: 'text-gray-400', bg: 'bg-gray-600/20', border: 'border-gray-500/30' },
    { label: 'Termine', value: termine, color: 'text-green-400', bg: 'bg-green-600/20', border: 'border-green-500/30' },
    { label: 'NC', value: ncTotal, color: 'text-red-400', bg: 'bg-red-600/20', border: 'border-red-500/30' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map(s => (
        <div key={s.label} className={`${s.bg} border ${s.border} rounded-lg p-3 text-center`}>
          <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          <p className="text-[10px] text-gray-500">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Dashboard ──────────────────────────────────────────────────

export function DashboardGlobal({ onBack }: Props) {
  const [commandes, setCommandes] = useState<CommandeGlobale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterSemaine, setFilterSemaine] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'attente' | 'en_cours' | 'termine'>('all');
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [sortAsc, setSortAsc] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listCommandesGlobales();
      setCommandes(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Derive available weeks for the filter dropdown
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    commandes.forEach(c => {
      if (c.semaine_fab) weeks.add(c.semaine_fab);
      if (c.semaine_liv) weeks.add(c.semaine_liv);
      const w = getWeekNumber(c.date_creation);
      if (w) weeks.add(w);
    });
    return Array.from(weeks).sort();
  }, [commandes]);

  // Filter + search
  const filtered = useMemo(() => {
    let result = commandes;

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.ref.toLowerCase().includes(q) ||
        c.client.toLowerCase().includes(q) ||
        c.chantier.toLowerCase().includes(q)
      );
    }

    // Semaine filter
    if (filterSemaine) {
      result = result.filter(c =>
        c.semaine_fab === filterSemaine || c.semaine_liv === filterSemaine
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(c => {
        const p = getOverallProgress(c);
        if (filterStatus === 'termine') return p === 100;
        if (filterStatus === 'en_cours') return p > 0 && p < 100;
        if (filterStatus === 'attente') return p === 0;
        return true;
      });
    }

    // Sort
    result = [...result].sort((a, b) => {
      const pa = getOverallProgress(a);
      const pb = getOverallProgress(b);
      return sortAsc ? pa - pb : pb - pa;
    });

    return result;
  }, [commandes, search, filterSemaine, filterStatus, sortAsc]);

  const selectedCmd = selectedRef ? commandes.find(c => c.ref === selectedRef) : null;

  // Count commands needing attention (blocked or NC > 0)
  const attentionCount = useMemo(() => countAttentionNeeded(commandes), [commandes]);

  const handleCommandCreated = (ref: string) => {
    setShowNew(false);
    load().then(() => {
      setSelectedRef(ref);
    });
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
              <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Tableau de Bord — Suivi Global</h1>
            <p className="text-[10px] text-gray-500">Vue superviseur de toutes les commandes</p>
          </div>
          <div className="flex-1" />
          {attentionCount > 0 && (
            <div className="relative flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-500/30 rounded-lg animate-pulse">
              <Bell size={14} className="text-red-400" />
              <span className="text-xs font-bold text-red-400">{attentionCount}</span>
              <span className="text-[10px] text-red-400/80 hidden sm:inline">
                {attentionCount === 1 ? 'commande' : 'commandes'} a traiter
              </span>
            </div>
          )}
          <button
            onClick={() => { setShowNew(true); setSelectedRef(null); }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <Plus size={14} /> Nouvelle commande
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-6 space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        {/* Summary */}
        {!loading && <SummaryStats commandes={commandes} />}

        {/* New command form */}
        {showNew && (
          <NewCommandForm
            onCreated={handleCommandCreated}
            onCancel={() => setShowNew(false)}
          />
        )}

        {/* Detail view */}
        {selectedCmd && !showNew && (
          <DetailView
            cmd={selectedCmd}
            onClose={() => setSelectedRef(null)}
            onRefresh={load}
          />
        )}

        {/* Filters */}
        {!selectedCmd && !showNew && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher ref, client, chantier..."
                className="w-full bg-[#181a20] border border-[#2a2d35] rounded-lg pl-9 pr-8 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Semaine filter */}
            <select
              value={filterSemaine}
              onChange={e => setFilterSemaine(e.target.value)}
              className="bg-[#181a20] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              <option value="">Toutes semaines</option>
              {availableWeeks.map(w => <option key={w} value={w}>{w}</option>)}
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as typeof filterStatus)}
              className="bg-[#181a20] border border-[#2a2d35] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500/50"
            >
              <option value="all">Tous statuts</option>
              <option value="attente">Attente</option>
              <option value="en_cours">En cours</option>
              <option value="termine">Termine</option>
            </select>

            {/* Sort toggle */}
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 px-3 py-2 text-xs text-gray-400 hover:text-white border border-[#2a2d35] rounded-lg hover:border-green-500/40 transition-colors"
            >
              {sortAsc ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {sortAsc ? 'Croissant' : 'Decroissant'}
            </button>
          </div>
        )}

        {/* Grid */}
        {loading ? (
          <p className="text-gray-500 text-sm text-center py-12">Chargement des commandes...</p>
        ) : !selectedCmd && !showNew && (
          <>
            <p className="text-[10px] text-gray-500">{filtered.length} commande{filtered.length !== 1 ? 's' : ''}</p>
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-sm">Aucune commande trouvee</p>
                <p className="text-gray-600 text-xs mt-1">Creez une commande ou modifiez vos filtres</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(cmd => (
                  <CommandCard key={cmd.ref} cmd={cmd} onClick={() => setSelectedRef(cmd.ref)} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
