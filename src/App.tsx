import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { ConfigurateurAper } from './menuiseries/pages/ConfigurateurAper';
import type { Affaire } from './types';

type AppMode = 'home' | 'gc' | 'aper';

// ── Page d'accueil — choix du configurateur ──────────────────────────

function HomePage({ onSelect }: { onSelect: (mode: 'gc' | 'aper') => void }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4">
      {/* Logo / Titre */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-2">SIAL</h1>
        <p className="text-gray-500 text-lg">Portail professionnel de configuration</p>
      </div>

      {/* Cartes de sélection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl w-full">
        {/* APER — Menuiseries */}
        <button
          onClick={() => onSelect('aper')}
          className="group relative bg-[#181a20] border-2 border-[#2a2d35] rounded-2xl p-8 text-left hover:border-blue-500/60 hover:bg-blue-600/5 transition-all duration-200"
        >
          <div className="absolute top-4 right-4 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
            NOUVEAU
          </div>
          <div className="w-14 h-14 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
            Configurateur Menuiseries
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Fenêtres, portes-fenêtres, baies vitrées, portes d'entrée, volets roulants, pergolas — configuration step-by-step avec prix en temps réel.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Fenêtres', 'Portes', 'Baies', 'Volets', 'Pergolas'].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#252830] text-gray-400 border border-[#353840]">
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* GC — Garde-corps */}
        <button
          onClick={() => onSelect('gc')}
          className="group relative bg-[#181a20] border-2 border-[#2a2d35] rounded-2xl p-8 text-left hover:border-green-500/60 hover:bg-green-600/5 transition-all duration-200"
        >
          <div className="w-14 h-14 rounded-xl bg-green-600/10 border border-green-500/20 flex items-center justify-center mb-5">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
              <line x1="4" y1="2" x2="4" y2="22" />
              <line x1="20" y1="2" x2="20" y2="22" />
              <line x1="12" y1="2" x2="12" y2="22" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <line x1="4" y1="12" x2="20" y2="12" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
            Configurateur Garde-Corps
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-4">
            Garde-corps Kawneer 1800 Kadence — configuration technique, débits, usinages, optimisation barres, devis et export PDF/XML.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Kawneer', 'NF P01-012', 'Débits', 'Usinages', 'PDF/XML'].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#252830] text-gray-400 border border-[#353840]">
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-700 mt-12">SIAL — Portail professionnel</p>
    </div>
  );
}

// ── App principale ───────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<AppMode>('home');

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

  const goHome = useCallback(() => {
    setMode('home');
    setSelectedId(null);
  }, []);

  // ── Routage ────────────────────────────────────────

  if (mode === 'home') {
    return <HomePage onSelect={setMode} />;
  }

  if (mode === 'aper') {
    return <ConfigurateurAper onSwitchToGC={goHome} />;
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
      <div className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={goHome}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Accueil
          </button>
          <span className="text-gray-700">/</span>
          <span className="px-3 py-1.5 rounded text-sm font-medium bg-green-600/20 text-green-400">
            Garde-corps GC
          </span>
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
