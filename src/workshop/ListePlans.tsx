import { Plus, Copy, Trash2, ChevronRight, Home } from 'lucide-react';
import type { Plan } from './types';

interface ListePlansProps {
  plans: Plan[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onHome: () => void;
}

export function ListePlans({ plans, onSelect, onNew, onDuplicate, onDelete, onHome }: ListePlansProps) {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="border-b border-[#252830] bg-[#14161d]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onHome} className="text-gray-500 hover:text-gray-200" title="Accueil">
              <Home size={18} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-100">SIAL — Agencement atelier</h1>
              <p className="text-xs text-gray-500 mt-0.5">Plans d'implantation machines, postes, stocks & flux</p>
            </div>
          </div>
          <button
            onClick={onNew}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3.5 py-2"
          >
            <Plus size={16} />
            Nouveau plan
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">
        {plans.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Aucun plan enregistré.</p>
            <button
              onClick={onNew}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded px-3.5 py-2"
            >
              <Plus size={16} /> Créer le premier plan
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...plans].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
              const totalM2 = (p.largeurSite * p.hauteurSite) / 10000;
              const batM2 = (p.batiment.largeur * p.batiment.hauteur) / 10000;
              return (
                <div
                  key={p.id}
                  className="bg-[#181c25] rounded-lg border border-[#252830] px-4 py-3 flex items-center gap-4 hover:border-[#353840] transition-colors cursor-pointer group"
                  onClick={() => onSelect(p.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-200">{p.nom}</div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>Site {totalM2.toFixed(0)} m²</span>
                      <span>•</span>
                      <span>Bâtiment {batM2.toFixed(0)} m²</span>
                      <span>•</span>
                      <span>{p.objets.length} objet(s)</span>
                      <span>•</span>
                      <span>{p.niveaux.length} niveau(x)</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-600">{p.date}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onDuplicate(p.id); }}
                      className="p-1.5 text-gray-500 hover:text-gray-300"
                      title="Dupliquer"
                    >
                      <Copy size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Supprimer le plan "${p.nom}" ?`)) onDelete(p.id);
                      }}
                      className="p-1.5 text-gray-500 hover:text-red-400"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <ChevronRight size={16} className="text-gray-600 group-hover:text-gray-400" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
