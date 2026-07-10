import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { listCommandesGlobales, getData, type CommandeGlobale } from '../api';

interface NCRecord {
  id: string;
  statut: string;
  cause: string;
  poste: string;
  date_creation: string;
}

export function BiDashboard({ onBack }: { onBack: () => void }) {
  const [commandes, setCommandes] = useState<CommandeGlobale[]>([]);
  const [ncs, setNcs] = useState<NCRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [cmds, ncData] = await Promise.all([
          listCommandesGlobales(),
          getData<NCRecord>('qualite', 'nc'),
        ]);
        setCommandes(cmds);
        setNcs(ncData);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
      <p className="text-gray-500">Chargement tableau de bord...</p>
    </div>
  );

  const enCours = commandes.filter(c => {
    const mods = [c.reception, c.coupe_profiles, c.vitrage, c.assemblage, c.livraison];
    return mods.some(m => m?.statut === 'en_cours' || m?.statut === 'attente');
  }).length;

  const terminees = commandes.filter(c => {
    const mods = [c.reception, c.coupe_profiles, c.vitrage, c.assemblage, c.livraison];
    return mods.every(m => !m?.statut || m.statut === 'termine');
  }).length;

  const bloquees = commandes.filter(c => {
    const mods = [c.reception, c.coupe_profiles, c.vitrage, c.assemblage, c.livraison];
    return mods.some(m => m?.statut === 'bloque');
  }).length;

  const ncOuvertes = ncs.filter(n => n.statut === 'ouvert' || n.statut === 'en_cours').length;

  const totalPieces = commandes.reduce((sum, c) => {
    const v = c.vitrage as Record<string, unknown>;
    return sum + (Number(v?.total) || 0);
  }, 0);

  const piecesFaites = commandes.reduce((sum, c) => {
    const v = c.vitrage as Record<string, unknown>;
    return sum + (Number(v?.fait) || 0);
  }, 0);

  const moduleStats = [
    { key: 'reception', label: 'Reception', color: 'bg-sky-500' },
    { key: 'coupe_profiles', label: 'Coupe Profiles', color: 'bg-red-500' },
    { key: 'vitrage', label: 'Coupe Verre', color: 'bg-blue-500' },
    { key: 'assemblage', label: 'Assemblage', color: 'bg-amber-500' },
    { key: 'livraison', label: 'Livraison', color: 'bg-emerald-500' },
  ].map(m => {
    const counts = { pas_commence: 0, attente: 0, en_cours: 0, bloque: 0, termine: 0 };
    for (const c of commandes) {
      const mod = c[m.key as keyof CommandeGlobale] as Record<string, unknown> | undefined;
      const s = (mod?.statut as string) || 'pas_commence';
      if (s in counts) counts[s as keyof typeof counts]++;
      else counts.pas_commence++;
    }
    return { ...m, counts, total: commandes.length };
  });

  const ncByCause = new Map<string, number>();
  for (const nc of ncs) ncByCause.set(nc.cause || 'Non definie', (ncByCause.get(nc.cause || 'Non definie') || 0) + 1);
  const topCauses = [...ncByCause.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white"><ArrowLeft size={18} /></button>
          <span className="text-sm font-bold text-indigo-400">Tableau de Bord BI</span>
          <span className="text-xs text-gray-500 ml-auto">{commandes.length} commandes</span>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-[#181a20] rounded-lg p-4 border border-[#2a2d35] text-center">
            <div className="text-3xl font-black text-white">{commandes.length}</div>
            <div className="text-xs text-gray-500">Total commandes</div>
          </div>
          <div className="bg-[#181a20] rounded-lg p-4 border border-blue-500/30 text-center">
            <div className="text-3xl font-black text-blue-400">{enCours}</div>
            <div className="text-xs text-gray-500">En cours</div>
          </div>
          <div className="bg-[#181a20] rounded-lg p-4 border border-green-500/30 text-center">
            <div className="text-3xl font-black text-green-400">{terminees}</div>
            <div className="text-xs text-gray-500">Terminees</div>
          </div>
          <div className="bg-[#181a20] rounded-lg p-4 border border-amber-500/30 text-center">
            <div className="text-3xl font-black text-amber-400">{bloquees}</div>
            <div className="text-xs text-gray-500">Bloquees</div>
          </div>
          <div className="bg-[#181a20] rounded-lg p-4 border border-red-500/30 text-center">
            <div className="text-3xl font-black text-red-400">{ncOuvertes}</div>
            <div className="text-xs text-gray-500">NC ouvertes</div>
          </div>
        </div>

        {/* Progression globale */}
        <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-amber-400">Progression pieces vitrage</h3>
            <span className="text-xs text-gray-400">{piecesFaites} / {totalPieces}</span>
          </div>
          <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all bg-blue-500"
              style={{ width: `${totalPieces > 0 ? (piecesFaites / totalPieces) * 100 : 0}%` }} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Charge par poste */}
          <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
            <h3 className="text-sm font-bold text-amber-400 mb-4">Charge par poste</h3>
            <div className="space-y-3">
              {moduleStats.map(m => {
                const done = m.counts.termine;
                const active = m.counts.en_cours + m.counts.attente;
                const blocked = m.counts.bloque;
                const pct = m.total > 0 ? Math.round((done / m.total) * 100) : 0;
                return (
                  <div key={m.key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-400">{m.label}</span>
                      <div className="flex items-center gap-2 text-[10px]">
                        {active > 0 && <span className="text-blue-400">{active} actif</span>}
                        {blocked > 0 && <span className="text-red-400">{blocked} bloque</span>}
                        <span className="text-white font-bold">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
                      <div className={`h-full ${m.color}`} style={{ width: `${pct}%` }} />
                      {active > 0 && <div className="h-full bg-blue-600/50" style={{ width: `${(active / m.total) * 100}%` }} />}
                      {blocked > 0 && <div className="h-full bg-red-600/50" style={{ width: `${(blocked / m.total) * 100}%` }} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pipeline commandes */}
          <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
            <h3 className="text-sm font-bold text-amber-400 mb-4">Pipeline commandes</h3>
            <div className="space-y-2">
              {[
                { label: 'En attente', count: commandes.length - enCours - terminees - bloquees, color: 'bg-gray-600', text: 'text-gray-400' },
                { label: 'En cours', count: enCours, color: 'bg-blue-600', text: 'text-blue-400' },
                { label: 'Bloquees', count: bloquees, color: 'bg-red-600', text: 'text-red-400' },
                { label: 'Terminees', count: terminees, color: 'bg-green-600', text: 'text-green-400' },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-3">
                  <span className={`text-xs w-24 ${s.text}`}>{s.label}</span>
                  <div className="flex-1 h-6 bg-gray-800 rounded overflow-hidden">
                    <div className={`h-full ${s.color} rounded`}
                      style={{ width: `${commandes.length > 0 ? (s.count / commandes.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-sm text-white font-bold w-8 text-right">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NC causes */}
        {topCauses.length > 0 && (
          <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
            <h3 className="text-sm font-bold text-amber-400 mb-4">Top causes NC</h3>
            <div className="space-y-2">
              {topCauses.map(([cause, count]) => {
                const max = topCauses[0][1];
                return (
                  <div key={cause} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-40 shrink-0">{cause}</span>
                    <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
                      <div className="h-full bg-red-600/60 rounded" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                    <span className="text-xs text-white font-bold w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Dernieres commandes */}
        <div className="bg-[#181a20] rounded-lg p-5 border border-[#2a2d35]">
          <h3 className="text-sm font-bold text-amber-400 mb-4">Dernieres commandes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-400 border-b border-[#2a2d35]">
                <th className="text-left py-2 px-2">Ref</th>
                <th className="text-left py-2 px-2">Client</th>
                <th className="text-left py-2 px-2">Fab</th>
                <th className="text-left py-2 px-2">Liv</th>
                <th className="text-center py-2 px-2">Rec</th>
                <th className="text-center py-2 px-2">Coupe</th>
                <th className="text-center py-2 px-2">Verre</th>
                <th className="text-center py-2 px-2">Assy</th>
                <th className="text-center py-2 px-2">Liv</th>
              </tr></thead>
              <tbody>
                {commandes.slice(0, 15).map(c => {
                  const dot = (mod: Record<string, unknown> | undefined) => {
                    const s = (mod?.statut as string) || '';
                    if (s === 'termine') return 'bg-green-500';
                    if (s === 'en_cours') return 'bg-blue-500 animate-pulse';
                    if (s === 'bloque') return 'bg-red-500';
                    if (s === 'attente') return 'bg-amber-500';
                    return 'bg-gray-700';
                  };
                  return (
                    <tr key={c.ref} className="border-b border-[#1e2028]">
                      <td className="py-1.5 px-2 text-white font-mono">{c.ref}</td>
                      <td className="py-1.5 px-2 text-gray-300">{c.client}</td>
                      <td className="py-1.5 px-2 text-gray-400">{c.semaine_fab}</td>
                      <td className="py-1.5 px-2 text-gray-400">{c.semaine_liv}</td>
                      {['reception', 'coupe_profiles', 'vitrage', 'assemblage', 'livraison'].map(k => (
                        <td key={k} className="py-1.5 px-2 text-center">
                          <span className={`inline-block w-3 h-3 rounded-full ${dot(c[k as keyof CommandeGlobale] as Record<string, unknown>)}`} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
