import type { AffaireAper, StatutAffaireAper } from '../store/menuiserieStore';
import { Plus, FolderOpen, Copy, Trash2, FileText, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { calculerPrix } from '../engine/calcPrix';

interface TableauDeBordProps {
  affaires: AffaireAper[];
  onNew: () => void;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onSwitchToGC: () => void;
}

const STATUT_LABELS: Record<StatutAffaireAper, { label: string; color: string }> = {
  brouillon: { label: 'Brouillon', color: 'bg-gray-600/20 text-gray-400 border-gray-600/30' },
  en_cours: { label: 'En cours', color: 'bg-blue-600/20 text-blue-400 border-blue-500/30' },
  a_valider: { label: 'À valider', color: 'bg-amber-600/20 text-amber-400 border-amber-500/30' },
  validee: { label: 'Validée', color: 'bg-green-600/20 text-green-400 border-green-500/30' },
  commandee: { label: 'Commandée', color: 'bg-purple-600/20 text-purple-400 border-purple-500/30' },
};

export function TableauDeBord({ affaires, onNew, onSelect, onDuplicate, onDelete, onSwitchToGC }: TableauDeBordProps) {
  const [search, setSearch] = useState('');
  const [filtreStatut, setFiltreStatut] = useState<StatutAffaireAper | 'tous'>('tous');

  const filtered = affaires.filter((a) => {
    const matchSearch = search === '' ||
      a.nom.toLowerCase().includes(search.toLowerCase()) ||
      a.client.toLowerCase().includes(search.toLowerCase()) ||
      a.ref.toLowerCase().includes(search.toLowerCase());
    const matchStatut = filtreStatut === 'tous' || a.statut === filtreStatut;
    return matchSearch && matchStatut;
  });

  const getTotalAffaire = (a: AffaireAper) => {
    return a.menuiseries.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0);
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">APER — Configurateur Menuiseries</h1>
              <p className="text-sm text-gray-500 mt-0.5">Portail professionnel de configuration et devis</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onSwitchToGC}
                className="px-4 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] hover:border-[#404550] rounded-lg transition-colors"
              >
                Garde-corps GC
              </button>
              <button
                onClick={onNew}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} />
                Nouvelle affaire
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Barre recherche + filtres */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une affaire..."
              className="w-full pl-9 pr-4 py-2.5 bg-[#1c1e24] border border-[#2a2d35] rounded-lg text-sm text-white placeholder-gray-600 focus:border-blue-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-gray-500" />
            {(['tous', 'brouillon', 'en_cours', 'a_valider', 'validee', 'commandee'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFiltreStatut(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
                  ${filtreStatut === s
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                    : 'text-gray-500 hover:text-gray-400 border border-transparent'
                  }`}
              >
                {s === 'tous' ? 'Toutes' : STATUT_LABELS[s].label}
              </button>
            ))}
          </div>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total affaires', value: affaires.length, color: 'text-white' },
            { label: 'En cours', value: affaires.filter((a) => a.statut === 'en_cours').length, color: 'text-blue-400' },
            { label: 'À valider', value: affaires.filter((a) => a.statut === 'a_valider').length, color: 'text-amber-400' },
            { label: 'Validées', value: affaires.filter((a) => a.statut === 'validee' || a.statut === 'commandee').length, color: 'text-green-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Liste des affaires */}
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <FileText size={48} className="mx-auto text-gray-700 mb-4" />
            <p className="text-gray-500 mb-4">
              {search ? 'Aucune affaire trouvée' : 'Aucune affaire pour le moment'}
            </p>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Créer ma première affaire
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((affaire) => {
              const total = getTotalAffaire(affaire);
              const statut = STATUT_LABELS[affaire.statut];
              return (
                <div
                  key={affaire.id}
                  className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 hover:border-[#404550] transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Ref */}
                      <span className="font-mono text-xs text-gray-500 shrink-0">{affaire.ref}</span>

                      {/* Infos */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-white truncate">
                            {affaire.nom || 'Sans nom'}
                          </h3>
                          <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border ${statut.color}`}>
                            {statut.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span>{affaire.client || '—'}</span>
                          <span>{affaire.menuiseries.length} menuiserie{affaire.menuiseries.length > 1 ? 's' : ''}</span>
                          <span>{affaire.dateModification}</span>
                        </div>
                      </div>

                      {/* Prix */}
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-white">{total.toLocaleString('fr-FR')} &euro; HT</p>
                        <p className="text-xs text-gray-500">{Math.round(total * 1.2).toLocaleString('fr-FR')} &euro; TTC</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onSelect(affaire.id)} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors" title="Ouvrir">
                        <FolderOpen size={16} />
                      </button>
                      <button onClick={() => onDuplicate(affaire.id)} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-600/10 rounded-lg transition-colors" title="Dupliquer">
                        <Copy size={16} />
                      </button>
                      <button onClick={() => onDelete(affaire.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors" title="Supprimer">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
