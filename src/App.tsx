import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { ConfigurateurAper } from './menuiseries/pages/ConfigurateurAper';
import type { Affaire } from './types';

type AppMode = 'gc' | 'aper';

export default function App() {
  const [mode, setMode] = useState<AppMode>('aper'); // Par défaut sur APER

  // ── Mode GC (garde-corps existant) ─────────────────
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

  // ── Mode APER (nouveau configurateur menuiseries) ──
  if (mode === 'aper') {
    return (
      <ConfigurateurAper
        onSwitchToGC={() => {
          setMode('gc');
          setSelectedId(null);
        }}
      />
    );
  }

  // ── Mode GC ────────────────────────────────────────
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
      {/* Barre de switch GC <-> APER */}
      <div className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="px-3 py-1.5 rounded text-sm font-medium bg-blue-600/20 text-blue-400">
            Garde-corps GC
          </span>
          <button
            onClick={() => setMode('aper')}
            className="px-3 py-1.5 rounded text-sm font-medium text-gray-500 hover:text-gray-300 transition-colors"
          >
            Menuiseries APER
          </button>
        </div>
      </div>
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
