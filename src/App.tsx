import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { ConfigurateurAper } from './menuiseries/pages/ConfigurateurAper';
import type { Affaire } from './types';

type AppMode =
  | 'home'
  | 'fabrication'        // Hub fabrication (GC + apps atelier)
  | 'commercial'         // Hub commercial (APER menuiseries)
  | 'gc'                 // Configurateur garde-corps
  | 'aper';              // Configurateur menuiseries

// ── Page d'accueil — choix du portail ────────────────────────────────

function HomePage({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4">
      <div className="text-center mb-14">
        <h1 className="text-5xl font-bold text-white mb-3">SIAL</h1>
        <p className="text-gray-500 text-lg">Portail professionnel</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
        {/* ── Fabrication ── */}
        <button
          onClick={() => onSelect('fabrication')}
          className="group relative bg-[#181a20] border-2 border-[#2a2d35] rounded-2xl p-10 text-left hover:border-green-500/60 hover:bg-green-600/5 transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-xl bg-green-600/10 border border-green-500/20 flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
              <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
            Fabrication
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            Outils atelier et configurateurs techniques — garde-corps, débits, usinages, optimisation.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Garde-corps', 'Débits', 'Usinages', 'Optimisation', 'PDF/XML'].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#252830] text-gray-400 border border-[#353840]">
                {tag}
              </span>
            ))}
          </div>
        </button>

        {/* ── Commercial ── */}
        <button
          onClick={() => onSelect('commercial')}
          className="group relative bg-[#181a20] border-2 border-[#2a2d35] rounded-2xl p-10 text-left hover:border-blue-500/60 hover:bg-blue-600/5 transition-all duration-200"
        >
          <div className="w-16 h-16 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mb-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
              <line x1="3" y1="12" x2="21" y2="12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
            Commercial
          </h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">
            Configurateur menuiseries — devis, prix en temps réel, variantes, export PDF.
          </p>
          <div className="flex flex-wrap gap-2">
            {['Fenêtres', 'Portes', 'Baies', 'Volets', 'Devis', 'Variantes'].map((tag) => (
              <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#252830] text-gray-400 border border-[#353840]">
                {tag}
              </span>
            ))}
          </div>
        </button>
      </div>

      <p className="text-xs text-gray-700 mt-14">SIAL — Portail professionnel</p>
    </div>
  );
}

// ── Hub Fabrication — liste des outils atelier ───────────────────────

function HubFabrication({ onSelect, onBack }: { onSelect: (mode: AppMode) => void; onBack: () => void }) {
  const apps = [
    {
      id: 'gc' as AppMode,
      label: 'Configurateur Garde-Corps',
      description: 'Kawneer 1800 Kadence — configuration technique, débits, usinages, optimisation barres, devis et export PDF/XML.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
          <line x1="4" y1="2" x2="4" y2="22" />
          <line x1="20" y1="2" x2="20" y2="22" />
          <line x1="12" y1="2" x2="12" y2="22" />
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      ),
      color: 'green',
      ready: true,
    },
    // ── Placeholder pour les 3 apps atelier à venir ──
    {
      id: 'app_atelier_1' as AppMode,
      label: 'Application Atelier 1',
      description: 'En attente d\'intégration — envoyez le code pour activer.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      color: 'gray',
      ready: false,
    },
    {
      id: 'app_atelier_2' as AppMode,
      label: 'Application Atelier 2',
      description: 'En attente d\'intégration — envoyez le code pour activer.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      color: 'gray',
      ready: false,
    },
    {
      id: 'app_atelier_3' as AppMode,
      label: 'Application Atelier 3',
      description: 'En attente d\'intégration — envoyez le code pour activer.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
      ),
      color: 'gray',
      ready: false,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
              Accueil
            </button>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-semibold text-green-400">Fabrication</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-white mb-2">Outils Fabrication</h1>
        <p className="text-sm text-gray-500 mb-8">Configurateurs techniques et outils atelier</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => app.ready && onSelect(app.id)}
              disabled={!app.ready}
              className={`group text-left p-6 rounded-xl border-2 transition-all
                ${app.ready
                  ? 'border-[#2a2d35] bg-[#181a20] hover:border-green-500/50 hover:bg-green-600/5 cursor-pointer'
                  : 'border-[#1e2028] bg-[#14161c] opacity-50 cursor-not-allowed'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${app.ready ? 'bg-green-600/10 border border-green-500/20' : 'bg-[#1c1e24] border border-[#2a2d35]'}`}>
                {app.icon}
              </div>
              <h3 className={`font-semibold text-base mb-1 ${app.ready ? 'text-white group-hover:text-green-400' : 'text-gray-600'} transition-colors`}>
                {app.label}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">{app.description}</p>
              {!app.ready && (
                <span className="inline-block mt-3 text-[10px] px-2 py-0.5 rounded bg-[#252830] text-gray-600 border border-[#353840]">
                  Bientôt disponible
                </span>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}

// ── App principale ───────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState<AppMode>('home');

  // ── Mode GC ─────────────────────────────────────────
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

  // ── Hub Fabrication ────────────────────────────────
  if (mode === 'fabrication') {
    return <HubFabrication onSelect={setMode} onBack={goHome} />;
  }

  // ── Hub Commercial → APER directement ──────────────
  if (mode === 'commercial' || mode === 'aper') {
    return <ConfigurateurAper onSwitchToGC={goHome} />;
  }

  // ── Garde-corps ────────────────────────────────────
  if (selectedAffaire) {
    return (
      <Configurateur
        affaire={selectedAffaire}
        onUpdate={handleUpdate}
        onBack={() => setSelectedId(null)}
      />
    );
  }

  // Mode GC — liste des affaires
  return (
    <div>
      <div className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={goHome} className="text-sm text-gray-500 hover:text-white transition-colors">
            Accueil
          </button>
          <span className="text-gray-700">/</span>
          <button onClick={() => setMode('fabrication')} className="text-sm text-gray-500 hover:text-white transition-colors">
            Fabrication
          </button>
          <span className="text-gray-700">/</span>
          <span className="text-sm font-semibold text-green-400">Garde-corps</span>
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
