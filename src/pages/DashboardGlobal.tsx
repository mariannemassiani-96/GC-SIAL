import { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, Search, X, AlertTriangle, ChevronDown, ChevronUp, Plus, Save } from 'lucide-react';
import { listCommandesGlobales, upsertCommandeGlobale, type CommandeGlobale, type ModuleStatus } from '../api';

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

const MODULES: ModuleDef[] = [
  { key: 'reception', label: 'Reception', color: 'text-sky-400', bgColor: 'bg-sky-600/20', borderColor: 'border-sky-500/30' },
  { key: 'coupe_profiles', label: 'Coupe Profiles', color: 'text-red-400', bgColor: 'bg-red-600/20', borderColor: 'border-red-500/30' },
  { key: 'vitrage', label: 'Coupe Verre', color: 'text-blue-400', bgColor: 'bg-blue-600/20', borderColor: 'border-blue-500/30' },
  { key: 'assemblage', label: 'Assemblage', color: 'text-amber-400', bgColor: 'bg-amber-600/20', borderColor: 'border-amber-500/30' },
  { key: 'livraison', label: 'Livraison', color: 'text-emerald-400', bgColor: 'bg-emerald-600/20', borderColor: 'border-emerald-500/30' },
];

// ── Helpers ──────────────────────────────────────────────────────────

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

// ── Module Progress Bar ─────────────────────────────────────────────

function ModuleProgressBar({ mod, def }: { mod: ModuleStatus; def: ModuleDef }) {
  const progress = getModuleProgress(mod);
  const alert = hasAlerts(mod);

  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] w-24 truncate ${def.color}`}>{def.label}</span>
      <div className="flex-1 h-2 bg-[#1e2028] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-700'
          }`}
          style={{ width: `${progress}%` }}
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

// ── Detail View ─────────────────────────────────────────────────────

function DetailView({ cmd, onClose, onRefresh }: { cmd: CommandeGlobale; onClose: () => void; onRefresh: () => void }) {
  const [editing, setEditing] = useState(false);
  const [formClient, setFormClient] = useState(cmd.client);
  const [formChantier, setFormChantier] = useState(cmd.chantier);
  const [formSemFab, setFormSemFab] = useState(cmd.semaine_fab);
  const [formSemLiv, setFormSemLiv] = useState(cmd.semaine_liv);
  const [formNotes, setFormNotes] = useState(cmd.notes);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertCommandeGlobale(cmd.ref, {
        client: formClient,
        chantier: formChantier,
        semaine_fab: formSemFab,
        semaine_liv: formSemLiv,
        notes: formNotes,
      });
      setEditing(false);
      onRefresh();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

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

      {/* Modules detail */}
      <div className="divide-y divide-[#2a2d35]">
        {MODULES.map(m => {
          const mod = cmd[m.key] as ModuleStatus;
          const progress = getModuleProgress(mod);
          const statut = getModuleStatutLabel(mod);
          const alert = hasAlerts(mod);

          return (
            <div key={m.key} className="px-5 py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-600'
                  }`} />
                  <span className={`text-sm font-semibold ${m.color}`}>{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded border ${
                    statut === 'Termine' ? 'bg-green-600/20 text-green-400 border-green-500/30' :
                    statut === 'En cours' ? 'bg-amber-600/20 text-amber-400 border-amber-500/30' :
                    statut === 'Bloque' ? 'bg-red-600/20 text-red-400 border-red-500/30' :
                    'bg-gray-600/20 text-gray-400 border-gray-500/30'
                  }`}>
                    {statut}
                  </span>
                  <span className="text-sm font-bold text-white">{progress}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 bg-[#0f1117] rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    progress === 100 ? 'bg-green-500' : progress > 0 ? 'bg-amber-500' : 'bg-gray-700'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Details row */}
              <div className="flex gap-4 text-[10px] text-gray-500">
                {mod?.total !== undefined && <span>Total: {mod.total}</span>}
                {mod?.fait !== undefined && <span>Fait: {mod.fait}</span>}
                {alert && mod?.nc !== undefined && mod.nc > 0 && (
                  <span className="text-red-400">NC: {mod.nc}</span>
                )}
                {alert && mod?.bloque !== undefined && mod.bloque > 0 && (
                  <span className="text-orange-400">Bloque: {mod.bloque}</span>
                )}
              </div>
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

function NewCommandForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
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
      onCreated();
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
            onCreated={() => { setShowNew(false); load(); }}
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
