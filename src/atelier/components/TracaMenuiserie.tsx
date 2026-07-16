import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getData, saveDoc } from '../../api';
import { getStoredUser } from '../../api';
import type { MenuiserieTraca } from '../menuiserieTraceability';
import { createEmptyMenuiserieTraca, getCtProgress } from '../menuiserieTraceability';

export function TracaMenuiserie({ onBack }: { onBack: () => void }) {
  const [fiches, setFiches] = useState<MenuiserieTraca[]>([]);
  const [selected, setSelected] = useState<MenuiserieTraca | null>(null);
  const [activeTab, setActiveTab] = useState('ct01');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getData<MenuiserieTraca>('tracabilite', 'menuiserie');
      setFiches(data);
    } catch { setFiches([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async (f: MenuiserieTraca) => {
    await saveDoc('tracabilite', 'menuiserie', f.id, f);
    setSelected(f);
    load();
  };

  const operateur = getStoredUser()?.nom || '';

  const addFiche = async () => {
    const f = createEmptyMenuiserieTraca('', 'alu');
    f.ct01.operateur = operateur;
    await saveDoc('tracabilite', 'menuiserie', f.id, f);
    setSelected(f);
    load();
  };

  const filtered = fiches.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.of_ref.toLowerCase().includes(q) || f.commande_ref.toLowerCase().includes(q) || f.client.toLowerCase().includes(q) || f.window_it_code.toLowerCase().includes(q);
  });

  if (selected) {
    return (
      <FicheDetail
        fiche={selected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSave={save}
        onBack={() => { setSelected(null); load(); }}
        operateur={operateur}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-red-400">Tracabilite Menuiseries SIAL</span>
          <span className="text-xs text-gray-500 ml-auto">{fiches.length} fiches</span>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-4">
        <div className="flex gap-2">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Chercher OF, commande, client..."
            className="flex-1 px-3 py-2 bg-[#181a20] border border-[#2a2d35] rounded text-white text-sm" />
          <button onClick={addFiche} className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-sm rounded-lg">
            + Nouvelle fiche
          </button>
        </div>

        {loading ? <p className="text-gray-500 text-sm">Chargement...</p> : (
          <div className="space-y-2">
            {filtered.map(f => {
              const prog = getCtProgress(f);
              return (
                <button key={f.id} onClick={() => setSelected(f)}
                  className="w-full text-left p-4 bg-[#181a20] rounded-lg border border-[#2a2d35] hover:border-red-500/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{f.of_ref || '(sans OF)'}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${f.matiere === 'pvc' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'}`}>
                          {f.matiere.toUpperCase()}
                        </span>
                        {f.state === 'libere' && <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-600/20 text-green-400 font-bold">LIBERE</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {f.client} — {f.gamme} {f.type_ouverture} — {f.dimensions_l}x{f.dimensions_h} — {f.coloris}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${prog.pct === 100 ? 'text-green-400' : prog.pct > 0 ? 'text-amber-400' : 'text-gray-600'}`}>
                        {prog.pct}%
                      </div>
                      <div className="text-[10px] text-gray-500">{prog.done}/{prog.total} postes</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${prog.pct === 100 ? 'bg-green-500' : 'bg-amber-500'}`} style={{ width: `${prog.pct}%` }} />
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p className="text-gray-500 text-sm text-center py-8">Aucune fiche. Cliquez "Nouvelle fiche" pour commencer.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fiche detail ────────────────────────────────────────────────────

function FicheDetail({ fiche, activeTab, setActiveTab, onSave, onBack, operateur }: {
  fiche: MenuiserieTraca;
  activeTab: string;
  setActiveTab: (t: string) => void;
  onSave: (f: MenuiserieTraca) => void;
  onBack: () => void;
  operateur: string;
}) {
  const [f, setF] = useState(fiche);
  const set = (patch: Partial<MenuiserieTraca>) => setF(prev => ({ ...prev, ...patch }));
  const prog = getCtProgress(f);

  const tabs = [
    { id: 'info', label: 'Identification' },
    { id: 'ct01', label: 'CT-01 Coupe', done: f.ct01.valide },
    { id: 'ct02', label: 'CT-02 Assemblage', done: f.ct02.valide },
    ...(f.matiere === 'pvc' ? [{ id: 'ct03', label: 'CT-03 Soudure', done: f.ct03.valide }] : []),
    { id: 'ct04', label: 'CT-04 Ferrage', done: f.ct04.valide },
    { id: 'ct05', label: 'CT-05 Vitrage', done: f.ct05.valide },
    { id: 'ct06', label: 'CT-06 Final', done: f.ct06.libere },
    ...(f.matiere === 'pvc' ? [{ id: 'nf', label: 'NF PVC' }] : []),
  ];

  const autoSave = () => onSave(f);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={() => { autoSave(); onBack(); }} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <div className="flex-1">
            <span className="text-sm font-bold text-white">{f.of_ref || '(sans OF)'}</span>
            <span className="text-xs text-gray-500 ml-2">{f.client} — {f.gamme} {f.matiere.toUpperCase()}</span>
          </div>
          <span className={`text-sm font-bold ${prog.pct === 100 ? 'text-green-400' : 'text-amber-400'}`}>{prog.pct}%</span>
          <button onClick={autoSave} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded">Sauver</button>
          <button onClick={async () => {
            const API = import.meta.env.VITE_API_URL as string || 'https://pro.groupe-vista.fr/api-sial';
            try {
              await fetch(`${API}/api/data/tracabilite/menuiserie/${f.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('sial_token') || ''}` },
                body: JSON.stringify(f),
              });
              alert('Tracabilite envoyee vers Odoo');
            } catch { alert('Erreur sync Odoo'); }
          }} className="px-3 py-1.5 bg-orange-600 hover:bg-orange-500 text-white text-xs rounded">Sync Odoo</button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 border-b border-[#2a2d35] overflow-x-auto py-1">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-3 py-2 text-xs whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === t.id ? 'border-red-500 text-red-400 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {'done' in t && <span className={`w-2 h-2 rounded-full ${t.done ? 'bg-green-500' : 'bg-gray-600'}`} />}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-4">
        {activeTab === 'info' && (
          <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] space-y-3">
            <h3 className="text-sm font-bold text-amber-400">Identification menuiserie</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <I label="Ref OF" v={f.of_ref} set={v => set({ of_ref: v })} />
              <I label="Commande" v={f.commande_ref} set={v => set({ commande_ref: v })} />
              <I label="Client" v={f.client} set={v => set({ client: v })} />
              <I label="Code Window IT" v={f.window_it_code} set={v => set({ window_it_code: v })} />
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Matiere</label>
                <select value={f.matiere} onChange={e => set({ matiere: e.target.value as 'alu' | 'pvc', ct03: { ...f.ct03, applicable: e.target.value === 'pvc' }, nf: { ...f.nf, applicable: e.target.value === 'pvc' } })}
                  className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-white">
                  <option value="alu">Aluminium</option>
                  <option value="pvc">PVC</option>
                </select>
              </div>
              <I label="Gamme" v={f.gamme} set={v => set({ gamme: v })} ph="Kawneer 190, Rehau..." />
              <I label="Type ouverture" v={f.type_ouverture} set={v => set({ type_ouverture: v })} ph="OF, OB, coulissant..." />
              <I label="Coloris / RAL" v={f.coloris} set={v => set({ coloris: v })} />
              <N label="Largeur (mm)" v={f.dimensions_l} set={v => set({ dimensions_l: v })} />
              <N label="Hauteur (mm)" v={f.dimensions_h} set={v => set({ dimensions_h: v })} />
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Sens</label>
                <select value={f.sens} onChange={e => set({ sens: e.target.value as 'gauche' | 'droite' | '' })}
                  className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-white">
                  <option value="">—</option><option value="gauche">Gauche</option><option value="droite">Droite</option>
                </select>
              </div>
              <I label="Lot fabrication" v={f.lot_fabrication} set={v => set({ lot_fabrication: v })} />
            </div>
          </div>
        )}

        {activeTab === 'ct01' && (
          <CTSection title="CT-01 — Reception profilés & Coupe" sub="9 QC — tous bloquants. Mesure numerique exigee CE/NF." color="red">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <I label="Lot profils" v={f.ct01.lot_profils} set={v => set({ ct01: { ...f.ct01, lot_profils: v } })} />
              <I label="Fournisseur profils" v={f.ct01.profil_fournisseur} set={v => set({ ct01: { ...f.ct01, profil_fournisseur: v } })} ph="Kawneer, Rehau, Schuco..." />
              <I label="Lot quincaillerie" v={f.ct01.lot_quincaillerie} set={v => set({ ct01: { ...f.ct01, lot_quincaillerie: v } })} />
              <I label="Fournisseur quinc." v={f.ct01.quincaillerie_fournisseur} set={v => set({ ct01: { ...f.ct01, quincaillerie_fournisseur: v } })} ph="Ferco, Roto, Maco..." />
              <N label="Longueur mesuree (mm)" v={f.ct01.coupe_longueur_mesuree} set={v => set({ ct01: { ...f.ct01, coupe_longueur_mesuree: v } })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <C label="Reception conforme" v={f.ct01.reception_conforme} set={v => set({ ct01: { ...f.ct01, reception_conforme: v } })} />
              <C label="Tolerance coupe OK" v={f.ct01.coupe_tolerance_ok} set={v => set({ ct01: { ...f.ct01, coupe_tolerance_ok: v } })} />
              <C label="Angle coupe OK" v={f.ct01.coupe_angle_ok} set={v => set({ ct01: { ...f.ct01, coupe_angle_ok: v } })} />
              <C label="Aspect coupe OK" v={f.ct01.coupe_aspect_ok} set={v => set({ ct01: { ...f.ct01, coupe_aspect_ok: v } })} />
              <C label="Joints poses" v={f.ct01.joints_poses} set={v => set({ ct01: { ...f.ct01, joints_poses: v } })} />
              <C label="Identification piece OK" v={f.ct01.identification_piece_ok} set={v => set({ ct01: { ...f.ct01, identification_piece_ok: v } })} />
            </div>
            <Val label="Valider CT-01" done={f.ct01.valide} onValidate={() => set({ ct01: { ...f.ct01, valide: true, operateur, date: new Date().toISOString() }, state: 'en_cours' })} />
          </CTSection>
        )}

        {activeTab === 'ct02' && (
          <CTSection title="CT-02 — Assemblage dormants" sub="Equerrage + etiquettes CE / Window IT. Validation chef d'equipe." color="amber">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <N label="Equerrage (diagonale mm)" v={f.ct02.equerrage_valeur} set={v => set({ ct02: { ...f.ct02, equerrage_valeur: v } })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <C label="Equerrage OK" v={f.ct02.equerrage_ok} set={v => set({ ct02: { ...f.ct02, equerrage_ok: v } })} />
              <C label="Options conformes" v={f.ct02.options_ok} set={v => set({ ct02: { ...f.ct02, options_ok: v } })} />
              <C label="Etiquette CE posee" v={f.ct02.etiquette_ce_posee} set={v => set({ ct02: { ...f.ct02, etiquette_ce_posee: v } })} />
              <C label="Window IT pose" v={f.ct02.etiquette_window_it_posee} set={v => set({ ct02: { ...f.ct02, etiquette_window_it_posee: v } })} />
            </div>
            <Val label="Valider CT-02" done={f.ct02.valide} onValidate={() => set({ ct02: { ...f.ct02, valide: true, operateur, chef_equipe_validation: operateur, date: new Date().toISOString() } })} />
          </CTSection>
        )}

        {activeTab === 'ct03' && f.matiere === 'pvc' && (
          <CTSection title="CT-03 — Soudure PVC" sub="Soudure NOK = rebut (seul QC non reparable)." color="blue">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <N label="Temperature machine (°C)" v={f.ct03.temperature} set={v => set({ ct03: { ...f.ct03, temperature: v } })} />
              <N label="Temps pression (sec)" v={f.ct03.temps_pression} set={v => set({ ct03: { ...f.ct03, temps_pression: v } })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <C label="Aspect soudure OK" v={f.ct03.aspect_ok} set={v => set({ ct03: { ...f.ct03, aspect_ok: v } })} />
              <C label="Test destructif OK" v={f.ct03.test_destructif_ok} set={v => set({ ct03: { ...f.ct03, test_destructif_ok: v } })} />
              <C label="REBUT (soudure NOK)" v={f.ct03.rebut} set={v => set({ ct03: { ...f.ct03, rebut: v } })} warn />
            </div>
            <Val label="Valider CT-03" done={f.ct03.valide} onValidate={() => set({ ct03: { ...f.ct03, valide: true, operateur, date: new Date().toISOString() } })} />
          </CTSection>
        )}

        {activeTab === 'ct04' && (
          <CTSection title="CT-04 — Ferrage & mise en bois" sub="Quincaillerie montee, fonctionnement verifie." color="green">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <C label="Ferrage conforme au plan" v={f.ct04.ferrage_conforme} set={v => set({ ct04: { ...f.ct04, ferrage_conforme: v } })} />
              <C label="Fonctionnement fluide" v={f.ct04.fonctionnement_fluide} set={v => set({ ct04: { ...f.ct04, fonctionnement_fluide: v } })} />
              <C label="Reglage OK" v={f.ct04.reglage_ok} set={v => set({ ct04: { ...f.ct04, reglage_ok: v } })} />
            </div>
            <Val label="Valider CT-04" done={f.ct04.valide} onValidate={() => set({ ct04: { ...f.ct04, valide: true, operateur, date: new Date().toISOString() } })} />
          </CTSection>
        )}

        {activeTab === 'ct05' && (
          <CTSection title="CT-05 — Vitrage menuiserie" sub="Sens profiles = double confirmation (erreur critique)." color="purple">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <I label="Lot vitrage" v={f.ct05.lot_vitrage} set={v => set({ ct05: { ...f.ct05, lot_vitrage: v } })} ph="Ref lot CEKAL si ISULA" />
              <I label="Fournisseur vitrage" v={f.ct05.vitrage_fournisseur} set={v => set({ ct05: { ...f.ct05, vitrage_fournisseur: v } })} ph="ISULA, Saint-Gobain..." />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <C label="Sens profiles OK" v={f.ct05.sens_profiles_ok} set={v => set({ ct05: { ...f.ct05, sens_profiles_ok: v } })} warn />
              <C label="Calage DTU OK" v={f.ct05.calage_dtu_ok} set={v => set({ ct05: { ...f.ct05, calage_dtu_ok: v } })} />
              <C label="Correspondance lot vitrage" v={f.ct05.correspondance_lot} set={v => set({ ct05: { ...f.ct05, correspondance_lot: v } })} />
              <C label="Proprete vitrage" v={f.ct05.proprete_ok} set={v => set({ ct05: { ...f.ct05, proprete_ok: v } })} />
            </div>
            <Val label="Valider CT-05" done={f.ct05.valide} onValidate={() => set({ ct05: { ...f.ct05, valide: true, operateur, date: new Date().toISOString() } })} />
          </CTSection>
        )}

        {activeTab === 'ct06' && (
          <CTSection title="CT-06 — Controle final & expedition" sub="Chef d'equipe uniquement. Bloquant avant expedition." color="cyan">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <N label="Dimension finale L (mm)" v={f.ct06.dimensions_finales_l} set={v => set({ ct06: { ...f.ct06, dimensions_finales_l: v } })} />
              <N label="Dimension finale H (mm)" v={f.ct06.dimensions_finales_h} set={v => set({ ct06: { ...f.ct06, dimensions_finales_h: v } })} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
              <C label="Fonctionnement global OK" v={f.ct06.fonctionnement_global_ok} set={v => set({ ct06: { ...f.ct06, fonctionnement_global_ok: v } })} />
              <C label="Etiquette CE conforme" v={f.ct06.etiquette_ce_conforme} set={v => set({ ct06: { ...f.ct06, etiquette_ce_conforme: v } })} />
              <C label="Window IT scanne" v={f.ct06.window_it_scanne} set={v => set({ ct06: { ...f.ct06, window_it_scanne: v } })} />
              <C label="Emballage OK" v={f.ct06.emballage_ok} set={v => set({ ct06: { ...f.ct06, emballage_ok: v } })} />
            </div>
            <Val label="LIBERER POUR EXPEDITION" done={f.ct06.libere} onValidate={() => set({ ct06: { ...f.ct06, libere: true, chef_equipe: operateur, date: new Date().toISOString() }, state: 'libere' })} />
          </CTSection>
        )}

        {activeTab === 'nf' && f.matiere === 'pvc' && (
          <CTSection title="NF PVC — Marquage supplementaire" sub="Certification NF obligatoire pour les menuiseries PVC." color="indigo">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <I label="N° certification NF" v={f.nf.numero_certification} set={v => set({ nf: { ...f.nf, numero_certification: v } })} />
              <I label="Reference DoP" v={f.nf.dop_reference} set={v => set({ nf: { ...f.nf, dop_reference: v } })} />
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Permeabilite air</label>
                <select value={f.nf.permeabilite} onChange={e => set({ nf: { ...f.nf, permeabilite: e.target.value } })}
                  className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white">
                  <option value="">—</option><option value="1">Classe 1</option><option value="2">Classe 2</option><option value="3">Classe 3</option><option value="4">Classe 4</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Etancheite eau</label>
                <select value={f.nf.etancheite} onChange={e => set({ nf: { ...f.nf, etancheite: e.target.value } })}
                  className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white">
                  <option value="">—</option><option value="E">E</option><option value="1A">1A</option><option value="2A">2A</option><option value="3A">3A</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 block mb-1">Resistance vent</label>
                <select value={f.nf.resistance_vent} onChange={e => set({ nf: { ...f.nf, resistance_vent: e.target.value } })}
                  className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white">
                  <option value="">—</option><option value="1">Classe 1</option><option value="2">Classe 2</option><option value="3">Classe 3</option><option value="4">Classe 4</option><option value="5">Classe 5</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <C label="Marquage NF pose" v={f.nf.marquage_pose} set={v => set({ nf: { ...f.nf, marquage_pose: v } })} />
            </div>
          </CTSection>
        )}

        <div className="mt-4">
          <button onClick={autoSave} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl">
            Sauvegarder
          </button>
        </div>
      </div>
    </div>
  );
}

// ── UI Helpers ──────────────────────────────────────────────────────

function CTSection({ title, sub, color, children }: { title: string; sub: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] space-y-3">
      <div>
        <h3 className={`text-sm font-bold text-${color}-400`}>{title}</h3>
        <p className="text-[10px] text-gray-500">{sub}</p>
      </div>
      {children}
    </div>
  );
}

function I({ label, v, set, ph }: { label: string; v: string; set: (v: string) => void; ph?: string }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
      <input value={v} onChange={e => set(e.target.value)} placeholder={ph || ''}
        className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white" />
    </div>
  );
}

function N({ label, v, set }: { label: string; v: number; set: (v: number) => void }) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 block mb-1">{label}</label>
      <input type="number" value={v || ''} onChange={e => set(+e.target.value)}
        className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-2 py-1.5 text-sm text-white" />
    </div>
  );
}

function C({ label, v, set, warn }: { label: string; v: boolean; set: (v: boolean) => void; warn?: boolean }) {
  return (
    <label className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
      v ? (warn ? 'bg-red-900/20 border-red-500/30' : 'bg-green-900/20 border-green-500/30') : 'bg-[#14161d] border-[#2a2d35]'}`}>
      <input type="checkbox" checked={v} onChange={e => set(e.target.checked)} className="w-4 h-4" />
      <span className={`text-xs ${v ? (warn ? 'text-red-400' : 'text-green-400') : 'text-gray-400'}`}>{label}</span>
    </label>
  );
}

function Val({ label, done, onValidate }: { label: string; done: boolean; onValidate: () => void }) {
  return (
    <div className="mt-4 pt-3 border-t border-[#2a2d35]">
      {done ? (
        <div className="text-green-400 text-sm font-bold text-center py-2">VALIDE</div>
      ) : (
        <button onClick={onValidate}
          className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded-xl active:scale-[0.98]">
          {label}
        </button>
      )}
    </div>
  );
}
