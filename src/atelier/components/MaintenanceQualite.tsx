import { useState, useCallback } from 'react';
import { ArrowLeft, Plus,  Settings, Wrench, CheckSquare, BarChart3, Trash2, ChevronDown, AlertTriangle, Star } from 'lucide-react';
import { v4 as uid } from 'uuid';
import { useApiState } from '../../useApiState';

interface Props { onBack: () => void; }

// ── Types ────────────────────────────────────────────────────────────

interface Machine {
  id: string;
  nom: string;
  categorie: string;
  marque: string;
  modele: string;
  numSerie: string;
  anneeMES: string;
  fonction: string;
  localisation: string;
  contactSAV: string;
  lubrifiants: string;
  consommables: string;
  freqConstructeur: string;
  derniereIntervention: string;
  notes: string;
  scoreUsage: number;    // 1-3
  scoreImpact: number;   // 1-3
  scoreCout: number;     // 1-3
}

interface OperationMaint {
  id: string;
  machineId: string;
  intitule: string;
  type: 'J' | 'H' | 'M' | 'T' | 'A';
  duree: number;          // minutes
  responsable: string;
  instructions: string;
  consommable: string;
  statut: 'a_creer' | 'cree_odoo' | 'teste';
}

interface Intervention {
  id: string;
  machineId: string;
  date: string;
  heure: string;
  type: 'preventive' | 'corrective' | 'inspection';
  description: string;
  dureeMin: number;
  piecesRemplacees: string;
  observations: string;
  realisePar: string;
}

interface PosteQualite {
  id: string;
  nom: string;
  machines: string[];
  etapeFlux: string;
  controles: ControleQualite[];
}

interface ControleQualite {
  id: string;
  intitule: string;
  critere: string;
  frequence: string;
  moyen: string;
  procedureRef: string;
  adaptation: string;
  statut: 'identifie' | 'redige' | 'teste' | 'valide' | 'affiche';
}

interface NonConformite {
  id: string;
  posteId: string;
  date: string;
  description: string;
  typeDefaut: string;
  menuiserieRef: string;
  cause: string;
  decision: string;
  actionCorrective: string;
  statut: 'ouverte' | 'en_cours' | 'cloturee';
}

interface LigneAMDEC {
  id: string;
  machineId: string;
  sousEnsemble: string;
  modeDefaillance: string;
  cause: string;
  effetProduction: string;
  frequence: number;      // 1-10
  gravite: number;        // 1-10
  detectabilite: number;  // 1-10
  actionPreventive: string;
  frequenceAction: string;
  responsable: string;
}

type Tab = 'machines' | 'maintenance' | 'amdec' | 'qualite' | 'dashboard';

const CATEGORIES_MACHINE = ['Decoupe', 'Usinage', 'Assemblage', 'Finition', 'Manutention', 'Autre'];
const TYPES_DEFAUT = ['Dimensionnel', 'Assemblage', 'Vitrage', 'Quincaillerie', 'Finition', 'Conformite commande', 'Autre'];
const CAUSES = ['Humaine', 'Machine', 'Matiere', 'Methode'];
const FREQ_LABELS: Record<string, string> = { J: 'Journalier', H: 'Hebdo', M: 'Mensuel', T: 'Trimestriel', A: 'Annuel' };

const SK = {
  machines: 'sial-mq-machines',
  operations: 'sial-mq-operations',
  interventions: 'sial-mq-interventions',
  postes: 'sial-mq-postes',
  nc: 'sial-mq-nc',
  amdec: 'sial-mq-amdec',
};


function getCriticite(m: Machine): { score: number; niveau: string; couleur: string } {
  const s = m.scoreUsage + m.scoreImpact + m.scoreCout;
  if (s >= 7) return { score: s, niveau: 'CRITIQUE', couleur: '#ef4444' };
  if (s >= 4) return { score: s, niveau: 'IMPORTANT', couleur: '#f59e0b' };
  return { score: s, niveau: 'STANDARD', couleur: '#22c55e' };
}

// ── Données démo ─────────────────────────────────────────────────────

const DEMO_MACHINES: Machine[] = [
  { id: uid(), nom: 'Scie a onglets ALU PERTICI', categorie: 'Decoupe', marque: 'PERTICI', modele: 'Univer 500', numSerie: 'PU500-2019-0042', anneeMES: '2019', fonction: 'Debit barres aluminium', localisation: 'Zone debit ALU', contactSAV: 'PERTICI France 04 90 XX XX XX', lubrifiants: 'Huile coupe alu Rhenus FU60', consommables: 'Lames carbure D500 Z120', freqConstructeur: 'Mensuel', derniereIntervention: '2026-01-15 Changement lame', notes: '', scoreUsage: 3, scoreImpact: 3, scoreCout: 3 },
  { id: uid(), nom: 'Centre usinage EMMEGI', categorie: 'Usinage', marque: 'EMMEGI', modele: 'Phantomatic T3', numSerie: 'PT3-2020-0118', anneeMES: '2020', fonction: 'Percage fraisage barres ALU', localisation: 'Zone debit ALU', contactSAV: 'EMMEGI Italia +39 0522 XX XX XX', lubrifiants: 'Lubrifiant micro-pulverisation', consommables: 'Forets, fraises, ventouses', freqConstructeur: 'Mensuel', derniereIntervention: '2026-02-20 Calibration axes', notes: '', scoreUsage: 3, scoreImpact: 3, scoreCout: 2 },
  { id: uid(), nom: 'Scie a onglets PVC KABAN', categorie: 'Decoupe', marque: 'KABAN', modele: 'CM 4020', numSerie: 'CM4020-2018-0087', anneeMES: '2018', fonction: 'Debit barres PVC', localisation: 'Zone debit PVC', contactSAV: 'KABAN France 01 XX XX XX XX', lubrifiants: '', consommables: 'Lames carbure PVC D400', freqConstructeur: 'Trimestriel', derniereIntervention: '2025-11-10 Revision generale', notes: '', scoreUsage: 3, scoreImpact: 2, scoreCout: 2 },
  { id: uid(), nom: 'Table assemblage ALU', categorie: 'Assemblage', marque: 'SIAL', modele: 'Fabrication interne', numSerie: '', anneeMES: '2015', fonction: 'Assemblage cadres ALU', localisation: 'Zone assemblage', contactSAV: '', lubrifiants: '', consommables: 'Ventouses, butees', freqConstructeur: '', derniereIntervention: '', notes: 'Table fabrication maison', scoreUsage: 2, scoreImpact: 2, scoreCout: 1 },
  { id: uid(), nom: 'Poste quincaillerie', categorie: 'Assemblage', marque: '', modele: '', numSerie: '', anneeMES: '', fonction: 'Montage quincaillerie Ferco', localisation: 'Zone montage', contactSAV: '', lubrifiants: '', consommables: '', freqConstructeur: '', derniereIntervention: '', notes: 'Poste manuel', scoreUsage: 1, scoreImpact: 1, scoreCout: 1 },
];

const DEMO_POSTES: PosteQualite[] = [
  { id: uid(), nom: 'Debit ALU', machines: ['Scie PERTICI', 'CU EMMEGI'], etapeFlux: 'Etape 1 — Decoupe', controles: [
    { id: uid(), intitule: 'Longueur de coupe', critere: '+/- 1mm', frequence: 'Chaque piece', moyen: 'Metre ruban', procedureRef: 'PQ-001', adaptation: 'Mesure sur les 3 premieres pieces du lot', statut: 'teste' },
    { id: uid(), intitule: 'Equerrage', critere: '+/- 0.5 degre', frequence: 'Chaque piece', moyen: 'Equerre numerique', procedureRef: 'PQ-001', adaptation: 'Controle systematique apres changement de lame', statut: 'valide' },
    { id: uid(), intitule: 'Etat des coupes', critere: 'Pas d ecrasement ni bavure', frequence: 'Chaque piece', moyen: 'Visuel', procedureRef: 'PQ-001', adaptation: '', statut: 'identifie' },
    { id: uid(), intitule: 'Identification piece', critere: 'Etiquette lisible et conforme', frequence: 'Chaque piece', moyen: 'Visuel', procedureRef: 'PQ-002', adaptation: '', statut: 'identifie' },
  ]},
  { id: uid(), nom: 'Debit PVC', machines: ['Scie KABAN'], etapeFlux: 'Etape 1 — Decoupe PVC', controles: [] },
  { id: uid(), nom: 'Assemblage ALU', machines: ['Table assemblage'], etapeFlux: 'Etape 3 — Assemblage', controles: [] },
];

const DEMO_NC: NonConformite[] = [
  { id: uid(), posteId: '', date: '2026-04-10', description: 'Erreur dimensionnelle sur debit traverse basse', typeDefaut: 'Dimensionnel', menuiserieRef: 'CMD-2026-048 T01', cause: 'Humaine', decision: 'Retouche', actionCorrective: 'Rappel procedure mesure', statut: 'cloturee' },
  { id: uid(), posteId: '', date: '2026-04-18', description: 'Angle assemblage ouvert 91.2 degres', typeDefaut: 'Assemblage', menuiserieRef: 'CMD-2026-052 F02', cause: 'Machine', decision: 'En attente', actionCorrective: 'Verifier equerre table', statut: 'en_cours' },
];

// ── Composant principal ──────────────────────────────────────────────

export function MaintenanceQualite({ onBack }: Props) {
  const [tab, setTab] = useState<Tab>('machines');
  const [machines, setMachines] = useApiState<Machine[]>('maintenance', 'machines', SK.machines, DEMO_MACHINES);
  const [operations, setOperations] = useApiState<OperationMaint[]>('maintenance', 'operations', SK.operations, []);
  const [interventions, setInterventions] = useApiState<Intervention[]>('maintenance', 'interventions', SK.interventions, []);
  const [postes, setPostes] = useApiState<PosteQualite[]>('maintenance', 'postes', SK.postes, DEMO_POSTES);
  const [ncs, setNcs] = useApiState<NonConformite[]>('maintenance', 'nc', SK.nc, DEMO_NC);
  const [amdec, setAmdec] = useApiState<LigneAMDEC[]>('maintenance', 'amdec', SK.amdec, []);

  const savM = useCallback((n: Machine[]) => { setMachines(n); }, [setMachines]);
  const savO = useCallback((n: OperationMaint[]) => { setOperations(n); }, [setOperations]);
  const savI = useCallback((n: Intervention[]) => { setInterventions(n); }, [setInterventions]);
  const savP = useCallback((n: PosteQualite[]) => { setPostes(n); }, [setPostes]);
  const savN = useCallback((n: NonConformite[]) => { setNcs(n); }, [setNcs]);
  const savA = useCallback((n: LigneAMDEC[]) => { setAmdec(n); }, [setAmdec]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'machines', label: 'Machines', icon: <Settings size={14} /> },
    { id: 'maintenance', label: 'Maintenance', icon: <Wrench size={14} /> },
    { id: 'amdec', label: 'AMDEC', icon: <AlertTriangle size={14} /> },
    { id: 'qualite', label: 'Qualite', icon: <CheckSquare size={14} /> },
    { id: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 size={14} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="text-gray-400 hover:text-white"><ArrowLeft size={18} /></button>
            <div>
              <h1 className="text-sm font-bold text-white">Maintenance & Qualite</h1>
              <p className="text-[10px] text-gray-500">Machines, plan preventif, procedures CQ, non-conformites</p>
            </div>
          </div>
          <span className="text-xs text-gray-500">{machines.length} machines | {ncs.length} NC</span>
        </div>
      </header>
      <nav className="bg-[#181a20] border-b border-[#2a2d35] px-4 shrink-0">
        <div className="max-w-7xl mx-auto flex gap-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                ${tab === t.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 overflow-y-auto">
        {tab === 'machines' && <TabMachines machines={machines} onSave={savM} />}
        {tab === 'maintenance' && <TabMaintenance machines={machines} operations={operations} interventions={interventions} onSaveOps={savO} onSaveInt={savI} />}
        {tab === 'amdec' && <TabAMDEC machines={machines} lignes={amdec} onSave={savA} />}
        {tab === 'qualite' && <TabQualite postes={postes} ncs={ncs} onSavePostes={savP} onSaveNc={savN} />}
        {tab === 'dashboard' && <TabDashboardMQ machines={machines} operations={operations} interventions={interventions} postes={postes} ncs={ncs} />}
      </main>
    </div>
  );
}

// ── Tab Machines ─────────────────────────────────────────────────────

function TabMachines({ machines, onSave }: { machines: Machine[]; onSave: (m: Machine[]) => void }) {
  const [editId, setEditId] = useState<string | null>(null);
  const [filtreCrit, setFiltreCrit] = useState<string>('tous');

  const filtered = machines.filter(m => {
    if (filtreCrit === 'tous') return true;
    return getCriticite(m).niveau === filtreCrit;
  }).sort((a, b) => (b.scoreUsage + b.scoreImpact + b.scoreCout) - (a.scoreUsage + a.scoreImpact + a.scoreCout));

  const addMachine = () => {
    const m: Machine = { id: uid(), nom: '', categorie: 'Decoupe', marque: '', modele: '', numSerie: '', anneeMES: '', fonction: '', localisation: '', contactSAV: '', lubrifiants: '', consommables: '', freqConstructeur: '', derniereIntervention: '', notes: '', scoreUsage: 1, scoreImpact: 1, scoreCout: 1 };
    onSave([m, ...machines]);
    setEditId(m.id);
  };

  const updateMachine = (id: string, patch: Partial<Machine>) => onSave(machines.map(m => m.id === id ? { ...m, ...patch } : m));
  const deleteMachine = (id: string) => { onSave(machines.filter(m => m.id !== id)); if (editId === id) setEditId(null); };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1">
          {['tous', 'CRITIQUE', 'IMPORTANT', 'STANDARD'].map(f => (
            <button key={f} onClick={() => setFiltreCrit(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${filtreCrit === f ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>
              {f === 'tous' ? `Toutes (${machines.length})` : f}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <button onClick={addMachine} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
          <Plus size={14} /> Nouvelle machine
        </button>
      </div>

      {filtered.map(m => {
        const crit = getCriticite(m);
        const isEdit = editId === m.id;
        return (
          <div key={m.id} className={`bg-[#181a20] border rounded-xl overflow-hidden ${isEdit ? 'border-blue-500/40' : 'border-[#2a2d35]'}`}>
            <button onClick={() => setEditId(isEdit ? null : m.id)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1c1e24]">
              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: crit.couleur }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{m.nom || '(sans nom)'}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded border" style={{ color: crit.couleur, borderColor: crit.couleur + '55', backgroundColor: crit.couleur + '15' }}>
                    {crit.niveau} ({crit.score})
                  </span>
                  <span className="text-[10px] text-gray-600">{m.categorie}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.marque} {m.modele} — {m.localisation}</p>
              </div>
              <ChevronDown size={14} className={`text-gray-600 transition-transform ${isEdit ? 'rotate-180' : ''}`} />
            </button>

            {isEdit && (
              <div className="px-4 pb-4 border-t border-[#2a2d35] pt-3 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <F label="Nom machine" v={m.nom} set={v => updateMachine(m.id, { nom: v })} />
                  <div><label className="block text-[10px] text-gray-500 mb-1">Categorie</label>
                    <select value={m.categorie} onChange={e => updateMachine(m.id, { categorie: e.target.value })} className="w-full px-2.5 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
                      {CATEGORIES_MACHINE.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <F label="Marque" v={m.marque} set={v => updateMachine(m.id, { marque: v })} />
                  <F label="Modele" v={m.modele} set={v => updateMachine(m.id, { modele: v })} />
                  <F label="N. serie" v={m.numSerie} set={v => updateMachine(m.id, { numSerie: v })} />
                  <F label="Annee MES" v={m.anneeMES} set={v => updateMachine(m.id, { anneeMES: v })} />
                  <F label="Fonction" v={m.fonction} set={v => updateMachine(m.id, { fonction: v })} />
                  <F label="Localisation" v={m.localisation} set={v => updateMachine(m.id, { localisation: v })} />
                  <F label="Contact SAV" v={m.contactSAV} set={v => updateMachine(m.id, { contactSAV: v })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <F label="Lubrifiants" v={m.lubrifiants} set={v => updateMachine(m.id, { lubrifiants: v })} />
                  <F label="Consommables maint." v={m.consommables} set={v => updateMachine(m.id, { consommables: v })} />
                  <F label="Freq. constructeur" v={m.freqConstructeur} set={v => updateMachine(m.id, { freqConstructeur: v })} />
                </div>
                {/* Criticité */}
                <div className="bg-[#0f1117] border border-[#2a2d35] rounded-lg p-3">
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Score de criticite</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <ScoreSlider label="Frequence usage" value={m.scoreUsage} onChange={v => updateMachine(m.id, { scoreUsage: v })} labels={['Occasionnel', 'Hebdo', 'Quotidien']} />
                    <ScoreSlider label="Impact panne" value={m.scoreImpact} onChange={v => updateMachine(m.id, { scoreImpact: v })} labels={['Contournable', 'Degrade', 'Arret total']} />
                    <ScoreSlider label="Cout panne" value={m.scoreCout} onChange={v => updateMachine(m.id, { scoreCout: v })} labels={['Faible', 'Modere', 'Eleve']} />
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-lg font-bold" style={{ color: crit.couleur }}>{crit.score}/9 — {crit.niveau}</span>
                  </div>
                </div>
                <button onClick={() => deleteMachine(m.id)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300">
                  <Trash2 size={12} /> Supprimer
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tab Maintenance ──────────────────────────────────────────────────

function TabMaintenance({ machines, operations, interventions, onSaveOps, onSaveInt }: {
  machines: Machine[]; operations: OperationMaint[]; interventions: Intervention[];
  onSaveOps: (o: OperationMaint[]) => void; onSaveInt: (i: Intervention[]) => void;
}) {
  const [vue, setVue] = useState<'operations' | 'historique'>('operations');
  const [selMachine, setSelMachine] = useState<string>('tous');

  const addOp = (machineId: string) => {
    onSaveOps([...operations, { id: uid(), machineId, intitule: '', type: 'M', duree: 30, responsable: 'Operateur', instructions: '', consommable: '', statut: 'a_creer' }]);
  };

  const addInt = () => {
    onSaveInt([{ id: uid(), machineId: machines[0]?.id ?? '', date: new Date().toISOString().slice(0, 10), heure: `${new Date().getHours()}:${new Date().getMinutes().toString().padStart(2, '0')}`, type: 'preventive', description: '', dureeMin: 30, piecesRemplacees: '', observations: '', realisePar: '' }, ...interventions]);
  };

  const filteredInt = interventions.filter(i => selMachine === 'tous' || i.machineId === selMachine);

  // Calcul heures maintenance par mois
  const hParMois = operations.reduce((s, o) => {
    const freq: Record<string, number> = { J: 22, H: 4.3, M: 1, T: 0.33, A: 0.083 };
    return s + (o.duree / 60) * (freq[o.type] ?? 1);
  }, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setVue('operations')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${vue === 'operations' ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>Operations ({operations.length})</button>
        <button onClick={() => setVue('historique')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${vue === 'historique' ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>Historique ({interventions.length})</button>
        <select value={selMachine} onChange={e => setSelMachine(e.target.value)} className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
          <option value="tous">Toutes machines</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">{hParMois.toFixed(1)} h/mois estimees</span>
      </div>

      {vue === 'operations' && (
        <div className="space-y-3">
          {machines.map(m => {
            if (selMachine !== 'tous' && selMachine !== m.id) return null;
            const ops = operations.filter(o => o.machineId === m.id);
            const crit = getCriticite(m);
            return (
              <div key={m.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
                <div className="px-4 py-2 bg-[#1c1e24] border-b border-[#2a2d35] flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crit.couleur }} />
                  <span className="text-xs font-bold text-white">{m.nom}</span>
                  <span className="text-[9px] text-gray-600">{ops.length} op.</span>
                  <div className="flex-1" />
                  <button onClick={() => addOp(m.id)} className="text-[10px] text-blue-400 hover:text-blue-300"><Plus size={10} className="inline" /> Ajouter</button>
                </div>
                {ops.length === 0 ? (
                  <p className="px-4 py-3 text-[10px] text-gray-600">Aucune operation definie</p>
                ) : (
                  <table className="w-full text-[10px]">
                    <tbody>
                      {ops.map(o => (
                        <tr key={o.id} className="border-b border-[#2a2d35]/30">
                          <td className="px-3 py-1.5">
                            <input value={o.intitule} onChange={e => onSaveOps(operations.map(op => op.id === o.id ? { ...op, intitule: e.target.value } : op))} placeholder="Intitule..."
                              className="bg-transparent text-white outline-none w-full" />
                          </td>
                          <td className="px-2 py-1.5 w-20">
                            <select value={o.type} onChange={e => onSaveOps(operations.map(op => op.id === o.id ? { ...op, type: e.target.value as any } : op))} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-gray-300 outline-none">
                              {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1.5 w-16">
                            <input type="number" value={o.duree} onChange={e => onSaveOps(operations.map(op => op.id === o.id ? { ...op, duree: Number(e.target.value) } : op))} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-gray-300 w-12 text-center outline-none" /> min
                          </td>
                          <td className="px-2 py-1.5 w-8">
                            <button onClick={() => onSaveOps(operations.filter(op => op.id !== o.id))} className="text-gray-600 hover:text-red-400"><Trash2 size={10} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
        </div>
      )}

      {vue === 'historique' && (
        <div className="space-y-2">
          <button onClick={addInt} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"><Plus size={14} /> Nouvelle intervention</button>
          {filteredInt.sort((a, b) => b.date.localeCompare(a.date)).map(i => {
            const mach = machines.find(m => m.id === i.machineId);
            return (
              <div key={i.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-3">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">{i.date}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] ${i.type === 'corrective' ? 'bg-red-600/20 text-red-400' : i.type === 'preventive' ? 'bg-green-600/20 text-green-400' : 'bg-blue-600/20 text-blue-400'}`}>{i.type}</span>
                  <span className="text-white font-medium">{mach?.nom ?? '?'}</span>
                  <span className="text-gray-500">{i.dureeMin} min</span>
                  <span className="text-gray-600">{i.realisePar}</span>
                </div>
                <input value={i.description} onChange={e => onSaveInt(interventions.map(ii => ii.id === i.id ? { ...ii, description: e.target.value } : ii))} placeholder="Description..."
                  className="mt-1 w-full bg-transparent text-[10px] text-gray-300 outline-none" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab Qualité ──────────────────────────────────────────────────────

function TabQualite({ postes, ncs, onSavePostes, onSaveNc }: {
  postes: PosteQualite[]; ncs: NonConformite[];
  onSavePostes: (p: PosteQualite[]) => void; onSaveNc: (n: NonConformite[]) => void;
}) {
  const [vue, setVue] = useState<'postes' | 'nc'>('postes');
  const [selPoste, setSelPoste] = useState<string | null>(null);

  const addNC = () => {
    onSaveNc([{ id: uid(), posteId: postes[0]?.id ?? '', date: new Date().toISOString().slice(0, 10), description: '', typeDefaut: 'Dimensionnel', menuiserieRef: '', cause: 'Humaine', decision: 'En attente', actionCorrective: '', statut: 'ouverte' }, ...ncs]);
  };

  const addControle = (posteId: string) => {
    onSavePostes(postes.map(p => p.id === posteId ? { ...p, controles: [...p.controles, { id: uid(), intitule: '', critere: '', frequence: 'Chaque piece', moyen: 'Visuel', procedureRef: '', adaptation: '', statut: 'identifie' }] } : p));
  };

  const tncGlobal = ncs.length > 0 ? ((ncs.filter(n => n.statut !== 'cloturee').length / Math.max(ncs.length, 1)) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => setVue('postes')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${vue === 'postes' ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-500 border-[#353840]'}`}>Postes & CQ ({postes.length})</button>
        <button onClick={() => setVue('nc')} className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${vue === 'nc' ? 'bg-red-600/20 text-red-400 border-red-500/40' : 'text-gray-500 border-[#353840]'}`}>Non-conformites ({ncs.length})</button>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">TNC: {tncGlobal}%</span>
      </div>

      {vue === 'postes' && postes.map(p => (
        <div key={p.id} className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
          <button onClick={() => setSelPoste(selPoste === p.id ? null : p.id)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#1c1e24]">
            <span className="text-sm font-bold text-white">{p.nom}</span>
            <span className="text-[10px] text-gray-500">{p.etapeFlux}</span>
            <span className="text-[10px] text-gray-600">{p.controles.length} controles</span>
            <div className="flex-1" />
            <ChevronDown size={14} className={`text-gray-600 transition-transform ${selPoste === p.id ? 'rotate-180' : ''}`} />
          </button>
          {selPoste === p.id && (
            <div className="px-4 pb-3 border-t border-[#2a2d35] pt-2 space-y-2">
              {p.controles.map(c => (
                <div key={c.id} className="bg-[#0f1117] border border-[#252830] rounded-lg p-2 grid grid-cols-3 gap-2">
                  <input value={c.intitule} onChange={e => onSavePostes(postes.map(pp => pp.id === p.id ? { ...pp, controles: pp.controles.map(cc => cc.id === c.id ? { ...cc, intitule: e.target.value } : cc) } : pp))} placeholder="Point de controle..." className="col-span-2 bg-transparent text-xs text-white outline-none" />
                  <select value={c.statut} onChange={e => onSavePostes(postes.map(pp => pp.id === p.id ? { ...pp, controles: pp.controles.map(cc => cc.id === c.id ? { ...cc, statut: e.target.value as any } : cc) } : pp))}
                    className={`text-[9px] rounded px-1 py-0.5 outline-none ${c.statut === 'affiche' ? 'bg-green-600/20 text-green-400' : c.statut === 'valide' ? 'bg-blue-600/20 text-blue-400' : 'bg-[#252830] text-gray-400'}`}>
                    {['identifie', 'redige', 'teste', 'valide', 'affiche'].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <input value={c.critere} onChange={e => onSavePostes(postes.map(pp => pp.id === p.id ? { ...pp, controles: pp.controles.map(cc => cc.id === c.id ? { ...cc, critere: e.target.value } : cc) } : pp))} placeholder="Critere (+/- 1mm...)" className="col-span-2 bg-transparent text-[10px] text-gray-400 outline-none" />
                  <input value={c.moyen} onChange={e => onSavePostes(postes.map(pp => pp.id === p.id ? { ...pp, controles: pp.controles.map(cc => cc.id === c.id ? { ...cc, moyen: e.target.value } : cc) } : pp))} placeholder="Moyen" className="bg-transparent text-[10px] text-gray-500 outline-none" />
                </div>
              ))}
              <button onClick={() => addControle(p.id)} className="text-[10px] text-blue-400 hover:text-blue-300"><Plus size={10} className="inline" /> Ajouter un controle</button>
            </div>
          )}
        </div>
      ))}

      {vue === 'nc' && (
        <div className="space-y-2">
          <button onClick={addNC} className="flex items-center gap-1.5 px-4 py-2 bg-red-600/20 border border-red-500/30 text-red-400 text-xs font-semibold rounded-lg hover:bg-red-600/30"><Plus size={14} /> Nouvelle NC</button>
          {ncs.sort((a, b) => b.date.localeCompare(a.date)).map(n => (
            <div key={n.id} className={`bg-[#181a20] border rounded-xl p-3 ${n.statut === 'ouverte' ? 'border-red-500/30' : n.statut === 'en_cours' ? 'border-amber-500/30' : 'border-[#2a2d35] opacity-60'}`}>
              <div className="flex items-center gap-2 text-xs mb-1">
                <span className="text-gray-500">{n.date}</span>
                <select value={n.typeDefaut} onChange={e => onSaveNc(ncs.map(nn => nn.id === n.id ? { ...nn, typeDefaut: e.target.value } : nn))} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-[9px] text-gray-300 outline-none">
                  {TYPES_DEFAUT.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={n.cause} onChange={e => onSaveNc(ncs.map(nn => nn.id === n.id ? { ...nn, cause: e.target.value } : nn))} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-[9px] text-gray-300 outline-none">
                  {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select value={n.statut} onChange={e => onSaveNc(ncs.map(nn => nn.id === n.id ? { ...nn, statut: e.target.value as any } : nn))}
                  className={`rounded px-1 py-0.5 text-[9px] outline-none ${n.statut === 'ouverte' ? 'bg-red-600/20 text-red-400' : n.statut === 'en_cours' ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                  {['ouverte', 'en_cours', 'cloturee'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <input value={n.description} onChange={e => onSaveNc(ncs.map(nn => nn.id === n.id ? { ...nn, description: e.target.value } : nn))} placeholder="Description du defaut..." className="w-full bg-transparent text-xs text-white outline-none" />
              <input value={n.actionCorrective} onChange={e => onSaveNc(ncs.map(nn => nn.id === n.id ? { ...nn, actionCorrective: e.target.value } : nn))} placeholder="Action corrective..." className="w-full bg-transparent text-[10px] text-gray-400 outline-none mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Tab AMDEC ───────────────────────────────────────────────────────

function iprNiveau(ipr: number): { label: string; color: string; bg: string } {
  if (ipr > 100) return { label: 'CRITIQUE', color: 'text-red-400', bg: 'bg-red-600/20 border-red-500/30' };
  if (ipr >= 40) return { label: 'MODERE', color: 'text-amber-400', bg: 'bg-amber-600/20 border-amber-500/30' };
  return { label: 'FAIBLE', color: 'text-green-400', bg: 'bg-green-600/20 border-green-500/30' };
}

function TabAMDEC({ machines, lignes, onSave }: { machines: Machine[]; lignes: LigneAMDEC[]; onSave: (l: LigneAMDEC[]) => void }) {
  const [filtreMachine, setFiltreMachine] = useState<string>('tous');
  const [tri, setTri] = useState<'ipr' | 'machine'>('ipr');

  const addLigne = () => {
    onSave([...lignes, {
      id: uid(), machineId: machines[0]?.id ?? '', sousEnsemble: '', modeDefaillance: '',
      cause: '', effetProduction: '', frequence: 1, gravite: 1, detectabilite: 1,
      actionPreventive: '', frequenceAction: '', responsable: '',
    }]);
  };

  const update = (id: string, patch: Partial<LigneAMDEC>) => onSave(lignes.map(l => l.id === id ? { ...l, ...patch } : l));
  const remove = (id: string) => onSave(lignes.filter(l => l.id !== id));

  const filtered = lignes
    .filter(l => filtreMachine === 'tous' || l.machineId === filtreMachine)
    .sort((a, b) => {
      if (tri === 'ipr') return (b.frequence * b.gravite * b.detectabilite) - (a.frequence * a.gravite * a.detectabilite);
      return a.machineId.localeCompare(b.machineId);
    });

  const totalCritique = lignes.filter(l => l.frequence * l.gravite * l.detectabilite > 100).length;
  const totalModere = lignes.filter(l => { const ipr = l.frequence * l.gravite * l.detectabilite; return ipr >= 40 && ipr <= 100; }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold text-white">AMDEC — Analyse des Modes de Defaillance, Effets et Criticite</h2>
            <p className="text-[10px] text-gray-500 mt-0.5">Objectif : Maintenance Preventive</p>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="px-2 py-1 rounded bg-red-600/20 text-red-400 border border-red-500/30">{totalCritique} critique{totalCritique > 1 ? 's' : ''}</span>
            <span className="px-2 py-1 rounded bg-amber-600/20 text-amber-400 border border-amber-500/30">{totalModere} modere{totalModere > 1 ? 's' : ''}</span>
            <span className="px-2 py-1 rounded bg-green-600/20 text-green-400 border border-green-500/30">{lignes.length - totalCritique - totalModere} faible{lignes.length - totalCritique - totalModere > 1 ? 's' : ''}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-[10px] text-gray-500">
          <div><span className="text-blue-400 font-bold">F</span> Frequence : 1=Tres rare | 5=Occasionnelle | 10=Quotidienne</div>
          <div><span className="text-amber-400 font-bold">G</span> Gravite : 1=Aucun impact | 5=Arret partiel | 10=Arret long + securite</div>
          <div><span className="text-red-400 font-bold">D</span> Detectabilite : 1=Tres facile | 5=Instruments | 10=Indetectable</div>
          <div><span className="text-white font-bold">IPR</span> = F x G x D — &lt;40 Faible | 40-100 Modere | &gt;100 Critique</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <select value={filtreMachine} onChange={e => setFiltreMachine(e.target.value)} className="px-2 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none">
          <option value="tous">Toutes machines</option>
          {machines.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
        </select>
        <button onClick={() => setTri(tri === 'ipr' ? 'machine' : 'ipr')} className="px-3 py-1.5 rounded-lg text-xs border text-gray-500 border-[#353840] hover:text-white">
          Tri : {tri === 'ipr' ? 'IPR decroissant' : 'Par machine'}
        </button>
        <div className="flex-1" />
        <button onClick={addLigne} className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg">
          <Plus size={14} /> Nouvelle ligne
        </button>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500 text-sm">Aucune analyse AMDEC. Cliquez sur "Nouvelle ligne" pour commencer.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#181a20] border-b border-[#2a2d35]">
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Machine</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Sous-ensemble</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Mode de defaillance</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Cause</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Effet production</th>
                <th className="px-2 py-2 text-center text-blue-400 font-bold w-10">F</th>
                <th className="px-2 py-2 text-center text-amber-400 font-bold w-10">G</th>
                <th className="px-2 py-2 text-center text-red-400 font-bold w-10">D</th>
                <th className="px-2 py-2 text-center text-white font-bold w-14">IPR</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium">Action preventive</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium w-20">Freq.</th>
                <th className="px-2 py-2 text-left text-gray-500 font-medium w-24">Responsable</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(l => {
                const ipr = l.frequence * l.gravite * l.detectabilite;
                const niv = iprNiveau(ipr);
                return (
                  <tr key={l.id} className="border-b border-[#2a2d35]/40 hover:bg-[#181a20]/50">
                    <td className="px-2 py-1.5">
                      <select value={l.machineId} onChange={e => update(l.id, { machineId: e.target.value })} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-white outline-none w-full">
                        {machines.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input value={l.sousEnsemble} onChange={e => update(l.id, { sousEnsemble: e.target.value })} placeholder="Composant..." className="bg-transparent text-white outline-none w-full" /></td>
                    <td className="px-2 py-1.5"><input value={l.modeDefaillance} onChange={e => update(l.id, { modeDefaillance: e.target.value })} placeholder="Mode de defaillance..." className="bg-transparent text-white outline-none w-full" /></td>
                    <td className="px-2 py-1.5"><input value={l.cause} onChange={e => update(l.id, { cause: e.target.value })} placeholder="Cause..." className="bg-transparent text-gray-300 outline-none w-full" /></td>
                    <td className="px-2 py-1.5"><input value={l.effetProduction} onChange={e => update(l.id, { effetProduction: e.target.value })} placeholder="Effet..." className="bg-transparent text-gray-300 outline-none w-full" /></td>
                    <td className="px-1 py-1.5 text-center">
                      <select value={l.frequence} onChange={e => update(l.id, { frequence: Number(e.target.value) })} className="bg-[#252830] border border-[#353840] rounded px-0.5 py-0.5 text-blue-400 text-center outline-none w-10">
                        {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <select value={l.gravite} onChange={e => update(l.id, { gravite: Number(e.target.value) })} className="bg-[#252830] border border-[#353840] rounded px-0.5 py-0.5 text-amber-400 text-center outline-none w-10">
                        {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      <select value={l.detectabilite} onChange={e => update(l.id, { detectabilite: Number(e.target.value) })} className="bg-[#252830] border border-[#353840] rounded px-0.5 py-0.5 text-red-400 text-center outline-none w-10">
                        {[1,2,3,4,5,6,7,8,9,10].map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded border text-[10px] font-bold ${niv.bg} ${niv.color}`}>{ipr}</span>
                    </td>
                    <td className="px-2 py-1.5"><input value={l.actionPreventive} onChange={e => update(l.id, { actionPreventive: e.target.value })} placeholder="Action..." className="bg-transparent text-gray-300 outline-none w-full" /></td>
                    <td className="px-2 py-1.5">
                      <select value={l.frequenceAction} onChange={e => update(l.id, { frequenceAction: e.target.value })} className="bg-[#252830] border border-[#353840] rounded px-1 py-0.5 text-gray-300 outline-none w-full">
                        <option value="">—</option>
                        {Object.entries(FREQ_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5"><input value={l.responsable} onChange={e => update(l.id, { responsable: e.target.value })} placeholder="Qui..." className="bg-transparent text-gray-300 outline-none w-full" /></td>
                    <td className="px-1 py-1.5"><button onClick={() => remove(l.id)} className="text-gray-600 hover:text-red-400"><Trash2 size={12} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Matrice IPR résumé */}
      {lignes.length > 0 && (
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Synthese IPR par machine</h3>
          {machines.filter(m => lignes.some(l => l.machineId === m.id)).map(m => {
            const ml = lignes.filter(l => l.machineId === m.id);
            const maxIPR = Math.max(...ml.map(l => l.frequence * l.gravite * l.detectabilite));
            const avgIPR = Math.round(ml.reduce((s, l) => s + l.frequence * l.gravite * l.detectabilite, 0) / ml.length);
            const niv = iprNiveau(maxIPR);
            return (
              <div key={m.id} className="flex items-center gap-3 mb-2">
                <span className="text-xs text-gray-400 w-48 truncate">{m.nom}</span>
                <div className="flex-1 h-4 bg-[#252830] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(maxIPR / 10, 100)}%`, backgroundColor: maxIPR > 100 ? '#ef4444' : maxIPR >= 40 ? '#f59e0b' : '#22c55e' }} />
                </div>
                <span className={`text-[10px] font-bold w-16 text-right ${niv.color}`}>max {maxIPR}</span>
                <span className="text-[10px] text-gray-500 w-16 text-right">moy {avgIPR}</span>
                <span className="text-[10px] text-gray-600 w-8 text-right">{ml.length}L</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab Dashboard ────────────────────────────────────────────────────

function TabDashboardMQ({ machines, operations, interventions, postes, ncs }: {
  machines: Machine[]; operations: OperationMaint[]; interventions: Intervention[];
  postes: PosteQualite[]; ncs: NonConformite[];
}) {
  const critiques = machines.filter(m => getCriticite(m).niveau === 'CRITIQUE').length;
  const importants = machines.filter(m => getCriticite(m).niveau === 'IMPORTANT').length;
  const standards = machines.filter(m => getCriticite(m).niveau === 'STANDARD').length;
  const ncOuvertes = ncs.filter(n => n.statut === 'ouverte').length;
  const ncEnCours = ncs.filter(n => n.statut === 'en_cours').length;
  const totalControles = postes.reduce((s, p) => s + p.controles.length, 0);
  const controlesAffich = postes.reduce((s, p) => s + p.controles.filter(c => c.statut === 'affiche').length, 0);
  const intPrev = interventions.filter(i => i.type === 'preventive').length;
  const intCorr = interventions.filter(i => i.type === 'corrective').length;
  const tauxPrev = (intPrev + intCorr) > 0 ? Math.round((intPrev / (intPrev + intCorr)) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Machines" value={machines.length} color="text-white" />
        <KPI label="Critiques" value={critiques} color="text-red-400" />
        <KPI label="Operations maint." value={operations.length} color="text-blue-400" />
        <KPI label="Taux preventif" value={`${tauxPrev}%`} color={tauxPrev >= 50 ? 'text-green-400' : 'text-amber-400'} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI label="Postes qualite" value={postes.length} color="text-white" />
        <KPI label="Controles definis" value={totalControles} color="text-blue-400" />
        <KPI label="Fiches affichees" value={`${controlesAffich}/${totalControles}`} color={controlesAffich === totalControles ? 'text-green-400' : 'text-amber-400'} />
        <KPI label="NC ouvertes" value={ncOuvertes} color={ncOuvertes > 0 ? 'text-red-400' : 'text-green-400'} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Criticité machines */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Criticite machines</h3>
          {[{ label: 'CRITIQUE', count: critiques, color: '#ef4444' }, { label: 'IMPORTANT', count: importants, color: '#f59e0b' }, { label: 'STANDARD', count: standards, color: '#22c55e' }].map(c => (
            <div key={c.label} className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-gray-400 w-24">{c.label}</span>
              <div className="flex-1 h-4 bg-[#252830] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${machines.length > 0 ? (c.count / machines.length) * 100 : 0}%`, backgroundColor: c.color }} />
              </div>
              <span className="text-xs text-white font-bold w-6 text-right">{c.count}</span>
            </div>
          ))}
        </div>

        {/* Alertes */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Alertes</h3>
          {machines.filter(m => getCriticite(m).niveau === 'CRITIQUE' && operations.filter(o => o.machineId === m.id).length === 0).length > 0 && (
            <p className="text-xs text-red-400 mb-2"><AlertTriangle size={12} className="inline mr-1" />
              {machines.filter(m => getCriticite(m).niveau === 'CRITIQUE' && operations.filter(o => o.machineId === m.id).length === 0).length} machine(s) CRITIQUE sans plan maintenance
            </p>
          )}
          {ncOuvertes > 0 && <p className="text-xs text-red-400 mb-2"><AlertTriangle size={12} className="inline mr-1" /> {ncOuvertes} NC ouverte(s)</p>}
          {ncEnCours > 0 && <p className="text-xs text-amber-400 mb-2"><Star size={12} className="inline mr-1" /> {ncEnCours} NC en cours de traitement</p>}
          {postes.filter(p => p.controles.length === 0).length > 0 && (
            <p className="text-xs text-amber-400 mb-2"><AlertTriangle size={12} className="inline mr-1" />
              {postes.filter(p => p.controles.length === 0).length} poste(s) sans controle qualite
            </p>
          )}
          {ncOuvertes === 0 && ncEnCours === 0 && <p className="text-xs text-green-400">Aucune alerte</p>}
        </div>

        {/* NC par type */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">NC par type de defaut</h3>
          {TYPES_DEFAUT.map(t => {
            const count = ncs.filter(n => n.typeDefaut === t).length;
            if (count === 0) return null;
            return (
              <div key={t} className="flex items-center gap-2 mb-1.5 text-xs">
                <span className="text-gray-400 w-40 truncate">{t}</span>
                <div className="flex-1 h-3 bg-[#252830] rounded-full overflow-hidden">
                  <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${(count / ncs.length) * 100}%` }} />
                </div>
                <span className="text-white font-bold w-6 text-right">{count}</span>
              </div>
            );
          })}
        </div>

        {/* Interventions */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
          <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Interventions</h3>
          <div className="flex items-center gap-2 mb-2 text-xs">
            <span className="text-gray-400 w-24">Preventives</span>
            <div className="flex-1 h-3 bg-[#252830] rounded-full overflow-hidden">
              <div className="h-full bg-green-500/60 rounded-full" style={{ width: `${interventions.length > 0 ? (intPrev / interventions.length) * 100 : 0}%` }} />
            </div>
            <span className="text-green-400 font-bold w-6 text-right">{intPrev}</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-24">Correctives</span>
            <div className="flex-1 h-3 bg-[#252830] rounded-full overflow-hidden">
              <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${interventions.length > 0 ? (intCorr / interventions.length) * 100 : 0}%` }} />
            </div>
            <span className="text-red-400 font-bold w-6 text-right">{intCorr}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Helpers UI ───────────────────────────────────────────────────────

function KPI({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
      <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-xl font-bold ${color} mt-0.5`}>{value}</p>
    </div>
  );
}

function F({ label, v, set }: { label: string; v: string; set: (v: string) => void }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 mb-1">{label}</label>
      <input value={v} onChange={e => set(e.target.value)} className="w-full px-2.5 py-1.5 bg-[#252830] border border-[#353840] rounded-lg text-xs text-white outline-none focus:border-blue-500" />
    </div>
  );
}

function ScoreSlider({ label, value, onChange, labels }: { label: string; value: number; onChange: (v: number) => void; labels: string[] }) {
  return (
    <div>
      <p className="text-[10px] text-gray-500 mb-1">{label}</p>
      <div className="flex gap-1">
        {[1, 2, 3].map(v => (
          <button key={v} onClick={() => onChange(v)}
            className={`flex-1 py-1.5 rounded text-[10px] font-medium border transition-all ${value === v ? 'bg-blue-600/20 text-blue-400 border-blue-500/40' : 'text-gray-600 border-[#353840]'}`}>
            {v}
          </button>
        ))}
      </div>
      <p className="text-[9px] text-gray-600 mt-0.5 text-center">{labels[value - 1]}</p>
    </div>
  );
}
