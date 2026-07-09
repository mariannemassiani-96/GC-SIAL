import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { getData, saveDoc, deleteDoc } from '../api';

interface NCRecord {
  id: string;
  piece_id: string;
  vitrage_ref: string;
  commande_ref: string;
  material: string;
  dimensions: string;
  poste: string;
  operateur: string;
  cause: string;
  action_corrective: string;
  statut: 'ouvert' | 'en_cours' | 'clos';
  date_creation: string;
  date_cloture: string;
}

interface Procedure {
  id: string;
  titre: string;
  description: string;
  poste: string;
  last_updated: string;
}

const CAUSES = ['Mauvaise coupe', 'Verre casse', 'Rayure', 'Mauvaise dimension', 'Defaut matiere', 'Autre'];
const POSTES = ['LISEC', 'Bottero', 'Assemblage', 'WE', 'Preparation'];

type Tab = 'nc' | 'stats' | 'procedures';

export function QualiteView({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>('nc');
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtreStatut, setFiltreStatut] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [ncData, procData] = await Promise.all([
        getData<NCRecord>('qualite', 'nc'),
        getData<Procedure>('qualite', 'procedures'),
      ]);
      setNcs(ncData);
      setProcedures(procData);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const saveNC = async (nc: NCRecord) => {
    await saveDoc('qualite', 'nc', nc.id, nc);
    loadData();
  };

  const deleteNC = async (id: string) => {
    await deleteDoc('qualite', 'nc', id);
    loadData();
  };

  const filteredNCs = ncs.filter(nc => !filtreStatut || nc.statut === filtreStatut);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'nc', label: `Non-Conformites (${ncs.filter(n => n.statut !== 'clos').length})` },
    { id: 'stats', label: 'Statistiques' },
    { id: 'procedures', label: 'Procedures' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-red-400">Qualite</span>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex gap-1 mb-6 border-b border-[#2a2d35]">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm border-b-2 transition-colors ${tab === t.id
                ? 'border-red-500 text-red-400 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {loading && <p className="text-gray-500 text-sm">Chargement...</p>}

        {tab === 'nc' && !loading && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <select value={filtreStatut} onChange={e => setFiltreStatut(e.target.value)}
                className="bg-[#181a20] border border-[#2a2d35] rounded text-xs px-3 py-2 text-white">
                <option value="">Tous statuts</option>
                <option value="ouvert">Ouvert</option>
                <option value="en_cours">En cours</option>
                <option value="clos">Clos</option>
              </select>
              <span className="text-xs text-gray-500 self-center ml-2">{filteredNCs.length} NC</span>
            </div>

            {filteredNCs.length === 0 ? (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-6 text-center">
                <div className="text-green-400 text-2xl mb-2">0 NC</div>
                <div className="text-gray-400 text-sm">Aucune non-conformite {filtreStatut ? `au statut "${filtreStatut}"` : ''}</div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredNCs.map(nc => (
                  <div key={nc.id} className={`bg-[#181a20] rounded-lg p-4 border ${
                    nc.statut === 'clos' ? 'border-green-500/30' : nc.statut === 'en_cours' ? 'border-amber-500/30' : 'border-red-500/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-white font-semibold">{nc.vitrage_ref}</span>
                        <span className="text-gray-500 text-xs ml-2">{nc.commande_ref}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded ${
                          nc.statut === 'clos' ? 'bg-green-600/20 text-green-400' :
                          nc.statut === 'en_cours' ? 'bg-amber-600/20 text-amber-400' : 'bg-red-600/20 text-red-400'}`}>
                          {nc.statut.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">{nc.date_creation?.slice(0, 10)}</span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mb-2">
                      {nc.dimensions} — {nc.material} — {nc.poste} {nc.operateur ? `— ${nc.operateur}` : ''}
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div>
                        <label className="text-[10px] text-gray-500 block">Cause</label>
                        <select value={nc.cause} onChange={e => saveNC({ ...nc, cause: e.target.value })}
                          className="w-full bg-[#14161d] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
                          <option value="">Selectionner</option>
                          {CAUSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-500 block">Statut</label>
                        <select value={nc.statut} onChange={e => saveNC({ ...nc, statut: e.target.value as NCRecord['statut'], date_cloture: e.target.value === 'clos' ? new Date().toISOString() : '' })}
                          className="w-full bg-[#14161d] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white">
                          <option value="ouvert">Ouvert</option>
                          <option value="en_cours">En cours</option>
                          <option value="clos">Clos</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block">Action corrective</label>
                      <input value={nc.action_corrective} onChange={e => saveNC({ ...nc, action_corrective: e.target.value })}
                        placeholder="Decrire l'action..."
                        className="w-full bg-[#14161d] border border-[#2a2d35] rounded text-xs px-2 py-1 text-white" />
                    </div>
                    <button onClick={() => { if (confirm('Supprimer cette NC ?')) deleteNC(nc.id); }}
                      className="mt-2 text-[10px] text-red-500 hover:text-red-400">Supprimer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'stats' && !loading && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
                <div className="text-2xl font-black text-red-400">{ncs.filter(n => n.statut === 'ouvert').length}</div>
                <div className="text-xs text-gray-500">NC ouvertes</div>
              </div>
              <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
                <div className="text-2xl font-black text-amber-400">{ncs.filter(n => n.statut === 'en_cours').length}</div>
                <div className="text-xs text-gray-500">En cours</div>
              </div>
              <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
                <div className="text-2xl font-black text-green-400">{ncs.filter(n => n.statut === 'clos').length}</div>
                <div className="text-xs text-gray-500">Closes</div>
              </div>
              <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
                <div className="text-2xl font-black text-white">{ncs.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>

            {ncs.length > 0 && (
              <>
                <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
                  <h4 className="text-sm font-bold text-amber-400 mb-3">Causes de NC</h4>
                  {(() => {
                    const causeCounts = new Map<string, number>();
                    for (const nc of ncs) causeCounts.set(nc.cause || 'Non definie', (causeCounts.get(nc.cause || 'Non definie') || 0) + 1);
                    const sorted = [...causeCounts.entries()].sort((a, b) => b[1] - a[1]);
                    const max = sorted[0]?.[1] || 1;
                    return (
                      <div className="space-y-2">
                        {sorted.map(([cause, count]) => (
                          <div key={cause} className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-40 shrink-0">{cause}</span>
                            <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                              <div className="h-full bg-red-600/60 rounded" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                            <span className="text-xs text-white font-bold w-8 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
                  <h4 className="text-sm font-bold text-amber-400 mb-3">NC par poste</h4>
                  {(() => {
                    const posteCounts = new Map<string, number>();
                    for (const nc of ncs) posteCounts.set(nc.poste || 'Inconnu', (posteCounts.get(nc.poste || 'Inconnu') || 0) + 1);
                    const sorted = [...posteCounts.entries()].sort((a, b) => b[1] - a[1]);
                    const max = sorted[0]?.[1] || 1;
                    return (
                      <div className="space-y-2">
                        {sorted.map(([poste, count]) => (
                          <div key={poste} className="flex items-center gap-3">
                            <span className="text-xs text-gray-400 w-28 shrink-0">{poste}</span>
                            <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                              <div className="h-full bg-amber-600/60 rounded" style={{ width: `${(count / max) * 100}%` }} />
                            </div>
                            <span className="text-xs text-white font-bold w-8 text-right">{count}</span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'procedures' && !loading && (
          <ProceduresTab procedures={procedures} onReload={loadData} />
        )}
      </div>
    </div>
  );
}

function ProceduresTab({ procedures, onReload }: { procedures: Procedure[]; onReload: () => void }) {
  const [editing, setEditing] = useState<Partial<Procedure> | null>(null);

  const save = async () => {
    if (!editing?.titre) return;
    const proc: Procedure = {
      id: editing.id || crypto.randomUUID(),
      titre: editing.titre,
      description: editing.description || '',
      poste: editing.poste || '',
      last_updated: new Date().toISOString(),
    };
    await saveDoc('qualite', 'procedures', proc.id, proc);
    setEditing(null);
    onReload();
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setEditing({ titre: '', description: '', poste: '' })}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg">
        + Ajouter une procedure
      </button>

      {editing && (
        <div className="bg-[#181a20] rounded-lg p-4 border border-blue-500/30 space-y-3">
          <input value={editing.titre || ''} onChange={e => setEditing({ ...editing, titre: e.target.value })}
            placeholder="Titre" className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white" />
          <div className="grid grid-cols-2 gap-3">
            <select value={editing.poste || ''} onChange={e => setEditing({ ...editing, poste: e.target.value })}
              className="bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white">
              <option value="">Poste</option>
              {POSTES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <textarea value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })}
            placeholder="Description / Instructions" rows={4}
            className="w-full bg-[#14161d] border border-[#2a2d35] rounded px-3 py-2 text-sm text-white" />
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded">Sauver</button>
            <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">Annuler</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {procedures.map(proc => (
          <div key={proc.id} className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-semibold">{proc.titre}</span>
              <div className="flex items-center gap-2">
                {proc.poste && <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400">{proc.poste}</span>}
                <button onClick={() => setEditing(proc)} className="text-xs text-blue-400 hover:text-blue-300">Modifier</button>
                <button onClick={async () => { if (confirm('Supprimer ?')) { await deleteDoc('qualite', 'procedures', proc.id); onReload(); } }}
                  className="text-xs text-red-400 hover:text-red-300">Suppr.</button>
              </div>
            </div>
            <p className="text-xs text-gray-400 whitespace-pre-wrap">{proc.description}</p>
            <p className="text-[10px] text-gray-600 mt-2">MAJ: {proc.last_updated?.slice(0, 10)}</p>
          </div>
        ))}
        {procedures.length === 0 && <p className="text-gray-500 text-sm text-center py-4">Aucune procedure.</p>}
      </div>
    </div>
  );
}
