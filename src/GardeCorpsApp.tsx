import { useState, useCallback } from 'react';
import { Home } from 'lucide-react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import type { Affaire } from './types';

interface GardeCorpsAppProps {
  onHome: () => void;
}

export function GardeCorpsApp({ onHome }: GardeCorpsAppProps) {
  const { affaires, addAffaire, updateAffaire, deleteAffaire, duplicateAffaire } = useAffaires();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedAffaire = affaires.find((a) => a.id === selectedId) ?? null;

  const handleNew = useCallback(() => {
    const newAffaire = createEmptyAffaire();
    addAffaire(newAffaire);
    setSelectedId(newAffaire.id);
  }, [addAffaire]);

  const handleUpdate = useCallback(
    (updates: Partial<Affaire>) => {
      if (selectedId) updateAffaire(selectedId, updates);
    },
    [selectedId, updateAffaire]
  );

  if (selectedAffaire) {
    return (
      <Configurateur
        affaire={selectedAffaire}
        onUpdate={handleUpdate}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  return (
    <div>
      {/* Overlay Home button */}
      <button
        onClick={onHome}
        className="fixed top-5 left-5 z-20 text-gray-500 hover:text-gray-200 p-1.5 bg-[#14161d] border border-[#252830] rounded"
        title="Accueil"
      >
        <Home size={16} />
      </button>
      <ListeAffaires
        affaires={affaires}
        onSelect={setSelectedId}
        onNew={handleNew}
        onDuplicate={duplicateAffaire}
        onDelete={deleteAffaire}
      />
    </div>
  );
}
