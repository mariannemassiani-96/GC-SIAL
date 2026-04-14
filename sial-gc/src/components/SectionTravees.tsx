import { Plus, Trash2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Affaire, Travee } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import type { Alerte } from '../types';

interface SectionTraveesProps {
  affaire: Affaire;
  onChange: (updates: Partial<Affaire>) => void;
  alertesByTravee?: Map<string, Alerte[]>;
}

export function SectionTravees({ affaire, onChange, alertesByTravee }: SectionTraveesProps) {
  const addTravee = () => {
    const idx = affaire.travees.length + 1;
    const newTravee: Travee = {
      id: uuidv4(),
      etage: 'RDC',
      repere: `T${String(idx).padStart(2, '0')}`,
      largeur: 2000,
      hauteur: affaire.hauteur,
      qte: 1,
      coupeG: '90',
      coupeD: '90',
    };
    onChange({ travees: [...affaire.travees, newTravee] });
  };

  const updateTravee = (id: string, updates: Partial<Travee>) => {
    onChange({
      travees: affaire.travees.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    });
  };

  const deleteTravee = (id: string) => {
    onChange({ travees: affaire.travees.filter((t) => t.id !== id) });
  };

  return (
    <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-300">Travées</h2>
        <Button variant="primary" size="sm" onClick={addTravee} icon={<Plus size={14} />}>
          Ajouter
        </Button>
      </div>

      {affaire.travees.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">
          Aucune travée. Cliquez sur «&nbsp;Ajouter&nbsp;» pour commencer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-[#252830]">
                <th className="text-left py-2 px-2">Repère</th>
                <th className="text-left py-2 px-2">Étage</th>
                <th className="text-right py-2 px-2">Largeur (mm)</th>
                <th className="text-right py-2 px-2">Qté</th>
                <th className="text-center py-2 px-2">Coupe G</th>
                <th className="text-center py-2 px-2">Coupe D</th>
                <th className="text-center py-2 px-2">Alertes</th>
                <th className="py-2 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {affaire.travees.map((t) => {
                const alertes = alertesByTravee?.get(t.id) ?? [];
                return (
                  <tr key={t.id} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                    <td className="py-1.5 px-2">
                      <input
                        value={t.repere}
                        onChange={(e) => updateTravee(t.id, { repere: e.target.value })}
                        className="w-16 bg-transparent border border-[#353840] rounded px-1.5 py-1 text-sm text-gray-200 font-mono focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-1.5 px-2">
                      <input
                        value={t.etage}
                        onChange={(e) => updateTravee(t.id, { etage: e.target.value })}
                        className="w-16 bg-transparent border border-[#353840] rounded px-1.5 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        value={t.largeur}
                        onChange={(e) => updateTravee(t.id, { largeur: parseInt(e.target.value) || 0 })}
                        className="w-20 bg-transparent border border-[#353840] rounded px-1.5 py-1 text-sm text-gray-200 font-mono text-right focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-right">
                      <input
                        type="number"
                        min={1}
                        value={t.qte}
                        onChange={(e) => updateTravee(t.id, { qte: Math.max(1, parseInt(e.target.value) || 1) })}
                        className="w-12 bg-transparent border border-[#353840] rounded px-1.5 py-1 text-sm text-gray-200 font-mono text-right focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={t.coupeG}
                        onChange={(e) => updateTravee(t.id, { coupeG: e.target.value as '90' | '45' })}
                        className="bg-transparent border border-[#353840] rounded px-1 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="90">90°</option>
                        <option value="45">45°</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <select
                        value={t.coupeD}
                        onChange={(e) => updateTravee(t.id, { coupeD: e.target.value as '90' | '45' })}
                        className="bg-transparent border border-[#353840] rounded px-1 py-1 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                      >
                        <option value="90">90°</option>
                        <option value="45">45°</option>
                      </select>
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      {alertes.map((a, i) => (
                        <Badge key={i} variant={a.niveau === 'bloquant' ? 'bloquant' : a.niveau === 'attention' ? 'attention' : 'info'}>
                          {a.niveau === 'bloquant' ? '!' : a.niveau === 'attention' ? '⚠' : 'i'}
                        </Badge>
                      ))}
                    </td>
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => deleteTravee(t.id)}
                        className="text-gray-600 hover:text-red-400 transition-colors p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
