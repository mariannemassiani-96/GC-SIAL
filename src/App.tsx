import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import type { Affaire } from './types';

export default function App() {
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
    <ListeAffaires
      affaires={affaires}
      onSelect={setSelectedId}
      onNew={handleNew}
      onDuplicate={duplicateAffaire}
      onDelete={deleteAffaire}
    />
  );
}
