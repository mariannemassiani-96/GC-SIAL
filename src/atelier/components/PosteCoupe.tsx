import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Upload, Search, Trash2, Send, ChevronRight } from 'lucide-react';
import { v4 as uid } from 'uuid';
import { useApiCollection } from '../../useApiCollection';
import { useAuth } from '../../AuthContext';
import { parseFstlineFile, type FstJob, type FstBar, type FstCut } from '../fstlineParser';

interface Props { onBack: () => void; }

// ── Types ────────────────────────────────────────────────────────────

type MachineName = 'lmt65' | 'dt' | 'renfort';

interface MachineData {
  fstlineJob?: FstJob;
  fileName: string;
  importDate: string;
  statut: 'imported' | 'en_cours' | 'termine';
}

interface Commande {
  id: string;
  ref: string;
  chantier: string;
  date: string;
  machines: {
    lmt65?: MachineData;
    dt?: MachineData;
    renfort?: MachineData;
  };
  statut: 'en_attente' | 'envoyee' | 'en_cours' | 'terminee';
  notes: string;
}

const MACHINE_LABELS: Record<MachineName, string> = {
  lmt65: 'LMT 65',
  dt: 'DT',
  renfort: 'RENFORT ACIER',
};

const MACHINE_COLORS: Record<MachineName, string> = {
  lmt65: 'bg-blue-700 hover:bg-blue-600',
  dt: 'bg-green-700 hover:bg-green-600',
  renfort: 'bg-amber-700 hover:bg-amber-600',
};

const STATUT_LABELS: Record<Commande['statut'], string> = {
  en_attente: 'En attente',
  envoyee: 'Envoyee atelier',
  en_cours: 'En cours',
  terminee: 'Terminee',
};

const STATUT_COLORS: Record<Commande['statut'], string> = {
  en_attente: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
  envoyee: 'bg-blue-600/20 text-blue-400 border-blue-500/30',
  en_cours: 'bg-amber-600/20 text-amber-400 border-amber-500/30',
  terminee: 'bg-green-600/20 text-green-400 border-green-500/30',
};

// ── Helpers ──────────────────────────────────────────────────────────

function machineStats(md?: MachineData): { bars: number; cuts: number; profiles: number } | null {
  if (!md?.fstlineJob) return null;
  const j = md.fstlineJob;
  return { bars: j.totalBars, cuts: j.totalCuts, profiles: j.totalProfiles };
}

function getBarProgress(bar: FstBar): { total: number; done: number } {
  const total = bar.cuts.length;
  const done = bar.cuts.filter(c => c.statut === 'coupe').length;
  return { total, done };
}

function getProfileBars(job: FstJob): Map<string, FstBar[]> {
  const map = new Map<string, FstBar[]>();
  for (const bar of job.bars) {
    const list = map.get(bar.code) || [];
    list.push(bar);
    map.set(bar.code, list);
  }
  return map;
}

// ── Main Component ──────────────────────────────────────────────────

export function PosteCoupe({ onBack }: Props) {
  const { user } = useAuth();
  const { items: commandes, upsert, remove } = useApiCollection<Commande>('coupe', 'commandes');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modeAtelier, setModeAtelier] = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';

  const selected = commandes.find(c => c.id === selectedId) ?? null;

  // ── Import FSTLINE XML per machine slot ──
  const handleImportMachine = useCallback((commandeId: string, machine: MachineName) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const job = await parseFstlineFile(file);
        const commande = commandes.find(c => c.id === commandeId);
        if (!commande) return;

        const md: MachineData = {
          fstlineJob: job,
          fileName: file.name,
          importDate: new Date().toISOString(),
          statut: 'imported',
        };

        const updated: Commande = {
          ...commande,
          chantier: commande.chantier || job.chantier || '',
          ref: commande.ref || job.orderCode || '',
          machines: { ...commande.machines, [machine]: md },
        };
        upsert(updated);
        setSelectedId(updated.id);
      } catch (e) {
        alert('Erreur import FSTLINE : ' + (e instanceof Error ? e.message : String(e)));
      }
    };
    input.click();
  }, [commandes, upsert]);

  // ── Create new commande ──
  const handleNewCommande = useCallback(() => {
    const ref = prompt('Reference commande (ex: L_2026-0103):');
    if (!ref) return;
    const c: Commande = {
      id: uid(),
      ref,
      chantier: '',
      date: new Date().toISOString().slice(0, 10),
      machines: {},
      statut: 'en_attente',
      notes: '',
    };
    upsert(c);
    setSelectedId(c.id);
  }, [upsert]);

  // ── Send to atelier ──
  const handleSendToAtelier = useCallback((commandeId: string) => {
    const c = commandes.find(x => x.id === commandeId);
    if (!c) return;
    upsert({ ...c, statut: 'envoyee' });
  }, [commandes, upsert]);

  // ── Update cut statut in a commande ──
  const updateCutStatut = useCallback((commandeId: string, machine: MachineName, barId: string, cutIdx: number, statut: FstCut['statut']) => {
    const c = commandes.find(x => x.id === commandeId);
    if (!c) return;
    const md = c.machines[machine];
    if (!md?.fstlineJob) return;

    const newBars = md.fstlineJob.bars.map(b => {
      if (b.id !== barId) return b;
      return {
        ...b,
        cuts: b.cuts.map((cut, i) => i === cutIdx ? {
          ...cut,
          statut,
          coupePar: user?.nom ?? '',
          dateCoupe: statut === 'coupe' ? new Date().toISOString() : null,
        } : cut),
      };
    });

    const newJob: FstJob = {
      ...md.fstlineJob,
      bars: newBars,
    };

    upsert({
      ...c,
      machines: {
        ...c.machines,
        [machine]: { ...md, fstlineJob: newJob },
      },
    });
  }, [commandes, upsert, user]);

  // ── Mark entire bar as cut ──
  const markBarAllCut = useCallback((commandeId: string, machine: MachineName, barId: string) => {
    const c = commandes.find(x => x.id === commandeId);
    if (!c) return;
    const md = c.machines[machine];
    if (!md?.fstlineJob) return;

    const newBars = md.fstlineJob.bars.map(b => {
      if (b.id !== barId) return b;
      return {
        ...b,
        cuts: b.cuts.map(cut => ({
          ...cut,
          statut: cut.statut === 'a_couper' ? 'coupe' as const : cut.statut,
          coupePar: cut.statut === 'a_couper' ? (user?.nom ?? '') : cut.coupePar,
          dateCoupe: cut.statut === 'a_couper' ? new Date().toISOString() : cut.dateCoupe,
        })),
      };
    });

    const newJob: FstJob = { ...md.fstlineJob, bars: newBars };
    upsert({
      ...c,
      machines: {
        ...c.machines,
        [machine]: { ...md, fstlineJob: newJob },
      },
    });
  }, [commandes, upsert, user]);

  // ── Mode Atelier ──
  if (modeAtelier) {
    return (
      <AtelierView
        commandes={commandes}
        onBack={() => setModeAtelier(false)}
        updateCutStatut={updateCutStatut}
        markBarAllCut={markBarAllCut}
      />
    );
  }

  // ── Admin/Manager: Commande Detail ──
  if (selected) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex flex-col">
        <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedId(null)} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
              <div>
                <h1 className="text-sm font-bold text-white">{selected.ref || 'Sans reference'}</h1>
                <p className="text-[10px] text-gray-500">{selected.chantier || 'Chantier non defini'} — {selected.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-1 rounded border ${STATUT_COLORS[selected.statut]}`}>
                {STATUT_LABELS[selected.statut]}
              </span>
              {selected.statut === 'en_attente' && (
                <button onClick={() => handleSendToAtelier(selected.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
                  <Send size={12} /> Envoyer atelier
                </button>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-6">
          {/* 3 Machine Slots */}
          {(['lmt65', 'dt', 'renfort'] as MachineName[]).map(machine => {
            const md = selected.machines[machine];
            const stats = machineStats(md);
            return (
              <div key={machine} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`px-3 py-1 rounded-lg text-sm font-bold text-white ${MACHINE_COLORS[machine].split(' ')[0]}`}>
                      {MACHINE_LABELS[machine]}
                    </div>
                    {md && (
                      <span className="text-[10px] text-gray-500">{md.fileName} — {new Date(md.importDate).toLocaleDateString('fr-FR')}</span>
                    )}
                  </div>
                  <button onClick={() => handleImportMachine(selected.id, machine)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#252830] hover:bg-[#353840] text-gray-300 text-xs rounded-lg border border-[#353840]">
                    <Upload size={12} /> {md ? 'Re-importer XML' : 'Importer XML'}
                  </button>
                </div>

                {stats ? (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">{stats.bars}</p>
                      <p className="text-[10px] text-gray-500">barres</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-400">{stats.cuts}</p>
                      <p className="text-[10px] text-gray-500">pieces</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-amber-400">{stats.profiles}</p>
                      <p className="text-[10px] text-gray-500">profils</p>
                    </div>
                    {md?.fstlineJob && (() => {
                      const totalCuts = md.fstlineJob.bars.reduce((s, b) => s + b.cuts.length, 0);
                      const doneCuts = md.fstlineJob.bars.reduce((s, b) => s + b.cuts.filter(c => c.statut === 'coupe').length, 0);
                      const pct = totalCuts > 0 ? Math.round(doneCuts / totalCuts * 100) : 0;
                      return (
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-[#252830] rounded-full overflow-hidden">
                              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-400">{doneCuts}/{totalCuts} ({pct}%)</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-xs text-gray-600">Aucun fichier importe</p>
                )}
              </div>
            );
          })}

          {/* Notes */}
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <label className="text-xs text-gray-500 block mb-1">Notes</label>
            <textarea
              value={selected.notes}
              onChange={e => upsert({ ...selected, notes: e.target.value })}
              className="w-full bg-[#0f1117] border border-[#2a2d35] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 outline-none resize-none"
              rows={2} placeholder="Notes..."
            />
          </div>
        </main>
      </div>
    );
  }

  // ── Admin/Manager: List of Commandes ──
  const filtered = commandes.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.ref.toLowerCase().includes(q) || c.chantier.toLowerCase().includes(q);
  }).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-sm font-bold text-white">Poste de Coupe — Alu/PVC</h1>
              <p className="text-[10px] text-gray-500">Import FSTLINE XML — Gestion coupes profils</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setModeAtelier(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold rounded-lg">
              MODE ATELIER
            </button>
            <button onClick={handleNewCommande}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
              + Nouvelle commande
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 max-w-5xl mx-auto w-full space-y-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher commande / chantier..."
            className="w-full pl-9 pr-3 py-2 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-xs text-white placeholder-gray-600 outline-none" />
        </div>

        {filtered.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-12">Aucune commande. Cliquez sur "+ Nouvelle commande" pour commencer.</p>
        )}

        {filtered.map(c => {
          const machineCount = (['lmt65', 'dt', 'renfort'] as MachineName[]).filter(m => c.machines[m]).length;
          const totalBars = (['lmt65', 'dt', 'renfort'] as MachineName[]).reduce((s, m) => {
            const md = c.machines[m];
            return s + (md?.fstlineJob?.totalBars ?? 0);
          }, 0);
          const totalCuts = (['lmt65', 'dt', 'renfort'] as MachineName[]).reduce((s, m) => {
            const md = c.machines[m];
            return s + (md?.fstlineJob?.totalCuts ?? 0);
          }, 0);

          return (
            <div key={c.id} className="w-full bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 hover:border-[#404550] transition-colors">
              <div className="flex items-center justify-between">
                <button onClick={() => setSelectedId(c.id)} className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{c.ref || 'Sans ref'}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${STATUT_COLORS[c.statut]}`}>
                      {STATUT_LABELS[c.statut]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                    <span>{c.date}</span>
                    {c.chantier && <span>{c.chantier}</span>}
                    <span>{machineCount}/3 machines</span>
                    {totalBars > 0 && <span>{totalBars} barres — {totalCuts} pieces</span>}
                  </div>
                </button>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button onClick={() => { if (confirm('Supprimer cette commande ?')) remove(c.id); }}
                      className="text-gray-600 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                  )}
                  <ChevronRight size={16} className="text-gray-600" />
                </div>
              </div>
            </div>
          );
        })}
      </main>
    </div>
  );
}

// ── Atelier View (full screen, touch optimized) ─────────────────────

type AtelierStep = 'machine' | 'commande' | 'profile' | 'bar';

function AtelierView({
  commandes, onBack, updateCutStatut, markBarAllCut,
}: {
  commandes: Commande[];
  onBack: () => void;
  updateCutStatut: (commandeId: string, machine: MachineName, barId: string, cutIdx: number, statut: FstCut['statut']) => void;
  markBarAllCut: (commandeId: string, machine: MachineName, barId: string) => void;
}) {
  const [step, setStep] = useState<AtelierStep>('machine');
  const [machine, setMachine] = useState<MachineName | null>(null);
  const [commandeId, setCommandeId] = useState<string | null>(null);
  const [profileCode, setProfileCode] = useState<string | null>(null);
  const [barIdx, setBarIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const commande = commandes.find(c => c.id === commandeId) ?? null;
  const md = commande && machine ? commande.machines[machine] : undefined;
  const job = md?.fstlineJob ?? null;

  // Bars for selected profile
  const profileBars = job && profileCode
    ? job.bars.filter(b => b.code === profileCode)
    : [];
  const currentBar = profileBars[barIdx] ?? null;

  // Commandes available for selected machine
  const availableCommandes = machine
    ? commandes.filter(c =>
        (c.statut === 'envoyee' || c.statut === 'en_cours') && c.machines[machine]?.fstlineJob
      )
    : [];

  const goBack = () => {
    if (step === 'bar') { setStep('profile'); setBarIdx(0); }
    else if (step === 'profile') { setStep('commande'); setProfileCode(null); }
    else if (step === 'commande') { setStep('machine'); setCommandeId(null); }
    else onBack();
  };

  // Auto-advance to next bar when all cuts done
  const autoAdvance = () => {
    if (barIdx < profileBars.length - 1) {
      setBarIdx(barIdx + 1);
    }
  };

  // ── Step 1: Choose Machine ──
  if (step === 'machine') {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center gap-8 z-50">
        <button onClick={onBack} className="absolute top-4 left-4 text-gray-500 hover:text-white text-lg px-4 py-2">
          <ArrowLeft size={24} className="inline mr-2" />Bureau
        </button>
        <h1 className="text-4xl font-black text-white">POSTE DE COUPE</h1>
        <p className="text-xl text-gray-400">Choisir la machine</p>
        <div className="grid grid-cols-1 gap-6 w-full max-w-md px-8">
          {(['lmt65', 'dt', 'renfort'] as MachineName[]).map(m => {
            const count = commandes.filter(c =>
              (c.statut === 'envoyee' || c.statut === 'en_cours') && c.machines[m]?.fstlineJob
            ).length;
            return (
              <button key={m} onClick={() => { setMachine(m); setStep('commande'); }}
                className={`${MACHINE_COLORS[m]} text-white text-2xl font-bold py-8 rounded-2xl transition-colors shadow-lg active:scale-95`}
                style={{ minHeight: 80 }}>
                {MACHINE_LABELS[m]}
                {count > 0 && (
                  <span className="ml-3 text-base opacity-80">({count} commande{count > 1 ? 's' : ''})</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step 2: Choose Commande ──
  if (step === 'commande' && machine) {
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={goBack} className="text-gray-400 hover:text-white text-lg px-3 py-2">
            <ArrowLeft size={24} className="inline mr-2" />Machines
          </button>
          <h1 className="text-2xl font-black text-white flex-1">{MACHINE_LABELS[machine]}</h1>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {availableCommandes.length === 0 ? (
            <p className="text-gray-500 text-2xl text-center py-20">Aucune commande envoyee pour {MACHINE_LABELS[machine]}</p>
          ) : (
            <div className="space-y-4 max-w-2xl mx-auto">
              {availableCommandes.map(c => {
                const mdata = c.machines[machine];
                const j = mdata?.fstlineJob;
                const totalCuts = j?.bars.reduce((s, b) => s + b.cuts.length, 0) ?? 0;
                const doneCuts = j?.bars.reduce((s, b) => s + b.cuts.filter(ct => ct.statut === 'coupe').length, 0) ?? 0;
                const pct = totalCuts > 0 ? Math.round(doneCuts / totalCuts * 100) : 0;
                return (
                  <button key={c.id} onClick={() => { setCommandeId(c.id); setStep('profile'); }}
                    className="w-full p-6 bg-[#181a20] rounded-2xl border border-[#2a2d35] hover:border-blue-500 transition-colors text-left active:scale-[0.98]"
                    style={{ minHeight: 80 }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-white">{c.ref}</div>
                        <div className="text-base text-gray-400 mt-1">{c.chantier}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-black ${pct === 100 ? 'text-green-400' : pct > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                          {pct}%
                        </div>
                        <div className="text-sm text-gray-500">{doneCuts}/{totalCuts} pieces</div>
                      </div>
                    </div>
                    {pct > 0 && pct < 100 && (
                      <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    )}
                    {pct === 100 && <div className="mt-2 text-green-400 text-lg font-bold">TERMINE</div>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3: Choose Profile ──
  if (step === 'profile' && machine && job) {
    const profileMap = getProfileBars(job);
    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        <div className="flex items-center gap-4 p-4 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={goBack} className="text-gray-400 hover:text-white text-lg px-3 py-2">
            <ArrowLeft size={24} className="inline mr-2" />Commandes
          </button>
          <div className="flex-1">
            <span className="text-xl font-bold text-white">{commande?.ref}</span>
            <span className="text-base text-gray-500 ml-3">{commande?.chantier}</span>
          </div>
          <span className="text-base text-amber-400 font-bold">{MACHINE_LABELS[machine]}</span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <h2 className="text-2xl font-black text-white text-center mb-8">CHOISIR LE PROFIL</h2>
          <div className="space-y-4 max-w-2xl mx-auto">
            {[...profileMap.entries()].map(([code, bars]) => {
              const desc = bars[0]?.description || code;
              const totalCuts = bars.reduce((s, b) => s + b.cuts.length, 0);
              const doneCuts = bars.reduce((s, b) => s + b.cuts.filter(c => c.statut === 'coupe').length, 0);
              const pct = totalCuts > 0 ? Math.round(doneCuts / totalCuts * 100) : 0;
              const profileInfo = job.profiles.find(p => p.code === code);
              return (
                <button key={code} onClick={() => { setProfileCode(code); setBarIdx(0); setStep('bar'); }}
                  className="w-full p-5 bg-[#181a20] rounded-2xl border border-[#2a2d35] hover:border-blue-500 transition-colors text-left active:scale-[0.98]"
                  style={{ minHeight: 70 }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-bold text-white">{code}</div>
                      <div className="text-base text-gray-400">{desc}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {bars.length} barre{bars.length > 1 ? 's' : ''} — {totalCuts} pieces
                        {profileInfo?.innerColor ? ` — ${profileInfo.innerColor}` : ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-xl font-black ${pct === 100 ? 'text-green-400' : pct > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                        {pct}%
                      </div>
                      <div className="text-sm text-gray-500">{doneCuts}/{totalCuts}</div>
                    </div>
                  </div>
                  {pct > 0 && pct < 100 && (
                    <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Bar-by-bar navigation ──
  if (step === 'bar' && machine && commandeId && currentBar) {
    const { total: barTotalCuts, done: barDoneCuts } = getBarProgress(currentBar);
    const barAllDone = barTotalCuts > 0 && barDoneCuts === barTotalCuts;

    return (
      <div className="fixed inset-0 bg-[#0a0c10] flex flex-col z-50">
        {/* Header */}
        <div className="flex items-center gap-4 p-3 bg-[#14161d] border-b border-[#2a2d35]">
          <button onClick={goBack} className="text-gray-400 hover:text-white text-lg px-3 py-2">
            <ArrowLeft size={24} className="inline mr-2" />Profils
          </button>
          <div className="flex-1">
            <span className="text-lg font-bold text-white">{commande?.ref}</span>
            <span className="text-base text-gray-500 ml-3">{currentBar.code}</span>
          </div>
          <span className="text-base text-amber-400 font-mono">{MACHINE_LABELS[machine]}</span>
        </div>

        {/* Navigation + bar visualization */}
        <div className="flex-1 flex items-center gap-2 px-2 overflow-hidden">
          {/* Left arrow */}
          <button onClick={() => setBarIdx(Math.max(0, barIdx - 1))} disabled={barIdx === 0}
            className="text-6xl text-white hover:text-amber-400 disabled:text-gray-800 transition-colors px-2 select-none active:scale-90 shrink-0"
            style={{ minWidth: 60, minHeight: 60 }}>
            &#9664;
          </button>

          <div className="flex-1 flex flex-col items-center gap-3 min-w-0 overflow-auto py-4">
            {/* Bar header */}
            <div className="text-center">
              <div className="text-3xl font-black text-white">
                Barre {barIdx + 1} / {profileBars.length}
              </div>
              <div className="text-lg text-gray-400">
                {currentBar.code} — {currentBar.length} mm — {currentBar.cuts.length} pieces
              </div>
              <div className="text-base mt-1">
                <span className={barAllDone ? 'text-green-400 font-bold' : 'text-amber-400'}>
                  {barDoneCuts}/{barTotalCuts} coupees
                </span>
              </div>
            </div>

            {/* SVG Bar Visualization */}
            <BarVisualization
              bar={currentBar}
              onCutClick={(cutIdx, statut) => {
                updateCutStatut(commandeId, machine, currentBar.id, cutIdx, statut);
              }}
            />

            {/* Cuts detail list */}
            <div className="w-full max-w-3xl">
              <div className="grid gap-2">
                {currentBar.cuts.map((cut, i) => {
                  const bgColor = cut.statut === 'coupe' ? 'bg-green-900/30 border-green-500/30'
                    : cut.statut === 'nc' ? 'bg-red-900/30 border-red-500/30'
                    : cut.statut === 'casse' ? 'bg-orange-900/30 border-orange-500/30'
                    : 'bg-[#181a20] border-[#2a2d35]';

                  return (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border ${bgColor}`}>
                      <span className="text-base font-mono text-gray-400 w-8">{i + 1}</span>
                      <div className="flex-1">
                        <div className="text-base font-bold text-white">{cut.ref || cut.bcod || `Piece ${i + 1}`}</div>
                        <div className="text-sm text-gray-400">
                          {cut.ol} mm
                          {cut.angleLeft !== 90 && ` — G:${cut.angleLeft}°`}
                          {cut.angleRight !== 90 && ` — D:${cut.angleRight}°`}
                          {cut.chantier && ` — ${cut.chantier}`}
                          {cut.dimensions && ` — ${cut.dimensions}`}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => updateCutStatut(commandeId, machine, currentBar.id, i, 'coupe')}
                          className={`px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition-colors ${
                            cut.statut === 'coupe' ? 'bg-green-600 text-white' : 'bg-[#252830] text-gray-400 hover:bg-green-700 hover:text-white'
                          }`} style={{ minWidth: 44, minHeight: 44 }}>
                          OK
                        </button>
                        <button onClick={() => updateCutStatut(commandeId, machine, currentBar.id, i, 'nc')}
                          className={`px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-colors ${
                            cut.statut === 'nc' ? 'bg-red-600 text-white' : 'bg-[#252830] text-gray-400 hover:bg-red-700 hover:text-white'
                          }`} style={{ minWidth: 44, minHeight: 44 }}>
                          NC
                        </button>
                        <button onClick={() => updateCutStatut(commandeId, machine, currentBar.id, i, 'casse')}
                          className={`px-3 py-2 rounded-xl text-sm font-bold active:scale-95 transition-colors ${
                            cut.statut === 'casse' ? 'bg-orange-600 text-white' : 'bg-[#252830] text-gray-400 hover:bg-orange-700 hover:text-white'
                          }`} style={{ minWidth: 44, minHeight: 44 }}>
                          CASSE
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right arrow */}
          <button onClick={() => setBarIdx(Math.min(profileBars.length - 1, barIdx + 1))} disabled={barIdx >= profileBars.length - 1}
            className="text-6xl text-white hover:text-amber-400 disabled:text-gray-800 transition-colors px-2 select-none active:scale-90 shrink-0"
            style={{ minWidth: 60, minHeight: 60 }}>
            &#9654;
          </button>
        </div>

        {/* Bottom action bar */}
        <div className="p-4 bg-[#14161d] border-t border-[#2a2d35] flex items-center justify-center gap-6">
          <button
            onClick={() => {
              markBarAllCut(commandeId, machine, currentBar.id);
              if (!barAllDone) autoAdvance();
            }}
            disabled={barAllDone}
            className={`px-12 py-5 rounded-2xl text-xl font-black transition-colors active:scale-95 ${
              barAllDone ? 'bg-green-800 text-green-300' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg'
            }`} style={{ minHeight: 60 }}>
            {barAllDone ? 'BARRE TERMINEE' : 'TOUTE LA BARRE COUPEE'}
          </button>
          {barAllDone && barIdx < profileBars.length - 1 && (
            <button onClick={() => setBarIdx(barIdx + 1)}
              className="px-12 py-5 rounded-2xl text-xl font-black bg-amber-600 hover:bg-amber-500 text-white shadow-lg active:scale-95"
              style={{ minHeight: 60 }}>
              SUIVANTE &#9654;
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".xml" className="hidden" />
      </div>
    );
  }

  // Fallback: redirect back
  return (
    <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center z-50">
      <p className="text-gray-400 text-2xl mb-4">Aucune donnee disponible</p>
      <button onClick={goBack}
        className="px-8 py-4 bg-gray-700 text-white text-lg rounded-xl active:scale-95"
        style={{ minHeight: 60 }}>
        Retour
      </button>
    </div>
  );
}

// ── Bar Visualization Component ─────────────────────────────────────

function BarVisualization({ bar, onCutClick }: {
  bar: FstBar;
  onCutClick: (cutIdx: number, statut: FstCut['statut']) => void;
}) {
  const svgW = 900;
  const svgH = 80;
  const margin = 20;
  const barW = svgW - 2 * margin;
  const barY = 20;
  const barH = 40;
  const scale = barW / bar.length;

  const cutColors: Record<FstCut['statut'], string> = {
    a_couper: '#3b82f6',
    coupe: '#22c55e',
    nc: '#ef4444',
    casse: '#f97316',
  };

  return (
    <div className="w-full max-w-3xl bg-[#181a20] rounded-xl p-3 border border-[#2a2d35]">
      <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} preserveAspectRatio="xMinYMid meet">
        {/* Background bar */}
        <rect x={margin} y={barY} width={barW} height={barH} rx={3} fill="#252830" stroke="#353840" strokeWidth={1} />

        {/* Pieces */}
        {(() => {
          let x = margin;
          return bar.cuts.map((cut, i) => {
            const w = cut.ol * scale;
            const fill = cutColors[cut.statut];
            const angleL = cut.angleLeft;
            const angleR = cut.angleRight;

            // Compute angled edges
            const angleOffsetL = angleL !== 90 ? Math.min(8, w * 0.15) : 0;
            const angleOffsetR = angleR !== 90 ? Math.min(8, w * 0.15) : 0;
            const isLeftAcute = angleL < 90;
            const isRightAcute = angleR < 90;

            // Build polygon points for angled cuts
            const x1 = x;
            const x2 = x + Math.max(w - 2, 1);
            const y1 = barY + 2;
            const y2 = barY + barH - 2;

            let points: string;
            if (angleOffsetL > 0 || angleOffsetR > 0) {
              const tlx = isLeftAcute ? x1 + angleOffsetL : x1;
              const blx = isLeftAcute ? x1 : x1 + angleOffsetL;
              const trx = isRightAcute ? x2 - angleOffsetR : x2;
              const brx = isRightAcute ? x2 : x2 - angleOffsetR;
              points = `${tlx},${y1} ${trx},${y1} ${brx},${y2} ${blx},${y2}`;
            } else {
              points = `${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}`;
            }

            const piece = (
              <g key={i} style={{ cursor: 'pointer' }}
                onClick={() => onCutClick(i, cut.statut === 'coupe' ? 'a_couper' : 'coupe')}>
                <polygon points={points} fill={fill} opacity={0.85} />
                {w > 35 && (
                  <text x={x + w / 2} y={barY + barH / 2 - 2} textAnchor="middle" dominantBaseline="middle"
                    fontSize={9} fill="#fff" fontFamily="monospace" fontWeight="bold">
                    {cut.ol}
                  </text>
                )}
                {w > 55 && (
                  <text x={x + w / 2} y={barY + barH / 2 + 10} textAnchor="middle"
                    fontSize={7} fill="rgba(255,255,255,0.7)" fontFamily="system-ui">
                    {cut.ref || cut.bcod || ''}
                  </text>
                )}
                {/* Angle indicators */}
                {angleL !== 90 && w > 20 && (
                  <text x={x + 3} y={barY + barH + 10} fontSize={6} fill="#fbbf24" fontFamily="monospace">
                    {angleL}&deg;
                  </text>
                )}
                {angleR !== 90 && w > 20 && (
                  <text x={x + w - 15} y={barY + barH + 10} fontSize={6} fill="#fbbf24" fontFamily="monospace">
                    {angleR}&deg;
                  </text>
                )}
              </g>
            );
            x += w;
            return piece;
          });
        })()}

        {/* Waste (yellow) */}
        {bar.waste > 0 && (() => {
          const wasteW = bar.waste * scale;
          const wasteX = margin + barW - wasteW;
          return (
            <g>
              <rect x={wasteX} y={barY + 2} width={wasteW} height={barH - 4} rx={2} fill="#eab308" opacity={0.4} />
              {wasteW > 25 && (
                <text x={wasteX + wasteW / 2} y={barY + barH / 2} textAnchor="middle" dominantBaseline="middle"
                  fontSize={8} fill="#fde047" fontFamily="monospace">
                  {bar.waste}
                </text>
              )}
            </g>
          );
        })()}

        {/* Total length label */}
        <text x={margin + barW / 2} y={14} textAnchor="middle" fontSize={9} fill="#6b7280" fontFamily="monospace">
          {bar.length} mm
        </text>
      </svg>
    </div>
  );
}
