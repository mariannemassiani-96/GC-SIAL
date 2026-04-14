import { Plus, Copy, Trash2, ChevronRight } from 'lucide-react';
import type { Affaire } from '../types';
import { TYPES_GC } from '../constants/typesGC';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

interface ListeAffairesProps {
  affaires: Affaire[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

const statutLabels: Record<string, { text: string; variant: 'info' | 'attention' | 'success' }> = {
  brouillon: { text: 'Brouillon', variant: 'info' },
  a_valider: { text: 'À valider', variant: 'attention' },
  validee: { text: 'Validée', variant: 'success' },
};

export function ListeAffaires({ affaires, onSelect, onNew, onDuplicate, onDelete }: ListeAffairesProps) {
  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <div className="border-b border-[#252830] bg-[#14161d]">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-100">SIAL</h1>
            <p className="text-xs text-gray-500 mt-0.5">Configurateur Garde-Corps — Kawneer 1800 Kadence</p>
          </div>
          <Button variant="primary" onClick={onNew} icon={<Plus size={16} />}>
            Nouvelle affaire
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="max-w-5xl mx-auto px-6 py-6">
        {affaires.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">Aucune affaire enregistrée.</p>
            <Button variant="primary" onClick={onNew} icon={<Plus size={16} />}>
              Créer une première affaire
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {[...affaires]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map((a) => {
                const statut = statutLabels[a.statut] ?? statutLabels.brouillon;
                return (
                  <div
                    key={a.id}
                    className="bg-[#181c25] rounded-lg border border-[#252830] px-4 py-3 flex items-center gap-4 hover:border-[#353840] transition-colors cursor-pointer group"
                    onClick={() => onSelect(a.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-200">{a.ref}</span>
                        <Badge variant={statut.variant}>{statut.text}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span>{a.client || '—'}</span>
                        <span>•</span>
                        <span>{a.chantier || '—'}</span>
                        <span>•</span>
                        <span>{TYPES_GC[a.typeGC]?.label ?? a.typeGC}</span>
                        <span>•</span>
                        <span>{a.travees.length} travée(s)</span>
                      </div>
                    </div>
                    <span className="text-xs text-gray-600">{a.date}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); onDuplicate(a.id); }}
                        className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors"
                        title="Dupliquer"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`Supprimer l'affaire ${a.ref} ?`)) onDelete(a.id);
                        }}
                        className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
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
