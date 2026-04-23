import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { SmartAssembly } from './atelier/components/SmartAssembly';
import { PickToLight } from './atelier/components/PickToLight';
import { BridgeAtelier } from './atelier/components/BridgeAtelier';
import { StageInventaire } from './atelier/components/StageInventaire';
import { PreparationLivraison } from './atelier/components/PreparationLivraison';
import { WorkshopApp } from './workshop/WorkshopApp';
import type { Affaire } from './types';

type AppMode =
  | 'home'
  | 'gc'
  | 'smart_assembly'
  | 'bridge'
  | 'picktolight'
  | 'stage_inventaire'
  | 'preparation_livraison'
  | 'workshop_layout';

// ── Hub Fabrication (page d'accueil) ─────────────────────────────────

function HubFabrication({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  const apps = [
    {
      id: 'gc' as AppMode,
      label: 'Configurateur Garde-Corps',
      description: 'Kawneer 1800 Kadence — configuration technique, debits, usinages, optimisation barres, devis et export PDF/XML.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-green-400">
          <line x1="4" y1="2" x2="4" y2="22" /><line x1="20" y1="2" x2="20" y2="22" /><line x1="12" y1="2" x2="12" y2="22" />
          <line x1="4" y1="6" x2="20" y2="6" /><line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      ),
      color: 'green',
    },
    {
      id: 'smart_assembly' as AppMode,
      label: 'Smart Assembly',
      description: 'Guidage pas-a-pas pour le poste de montage frappe. Scan code-barres PRO F2, pick-to-light LED par casier.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-400">
          <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      color: 'amber',
    },
    {
      id: 'bridge' as AppMode,
      label: 'Bridge Atelier',
      description: 'Gestion des fiches PRO F2 en memoire. Import JSON, recherche, detail pieces Ferco par fiche.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400">
          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      ),
      color: 'cyan',
    },
    {
      id: 'picktolight' as AppMode,
      label: 'Pick-to-Light',
      description: 'Dashboard des 14 casiers Ferco avec simulation LED. Test sequentiel, controle luminosite.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400">
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
        </svg>
      ),
      color: 'rose',
    },
    {
      id: 'stage_inventaire' as AppMode,
      label: 'Stage Inventaire',
      description: 'Analyse factures fournisseurs, recensement terrain, decisions stock, assistant IA, export Odoo 18.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange-400">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" /><line x1="9" y1="12" x2="15" y2="12" /><line x1="9" y1="16" x2="13" y2="16" />
        </svg>
      ),
      color: 'orange',
    },
    {
      id: 'preparation_livraison' as AppMode,
      label: 'Preparation & Livraison',
      description: 'Bons de preparation, chargement camion par scan, tournee multi-clients, bon de livraison avec signature tablette.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-emerald-400">
          <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
        </svg>
      ),
      color: 'emerald',
    },
    {
      id: 'workshop_layout' as AppMode,
      label: 'Plan Atelier',
      description: 'Editeur de plan atelier — placement des postes, machines, flux de production, cotes.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-violet-400">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="21" />
        </svg>
      ),
      color: 'violet',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-xl font-bold text-white">SIAL Fabrication</h1>
          <p className="text-sm text-gray-500 mt-0.5">Outils atelier et configurateurs techniques</p>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps.map((app) => (
            <button
              key={app.label}
              onClick={() => onSelect(app.id)}
              className="group text-left p-6 rounded-xl border-2 border-[#2a2d35] bg-[#181a20] hover:border-green-500/50 hover:bg-green-600/5 cursor-pointer transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-green-600/10 border border-green-500/20 flex items-center justify-center mb-4">
                {app.icon}
              </div>
              <h3 className="font-semibold text-base text-white group-hover:text-green-400 transition-colors mb-1">
                {app.label}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">{app.description}</p>
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
    return <HubFabrication onSelect={setMode} />;
  }

  if (mode === 'smart_assembly') return <SmartAssembly onBack={goHome} />;
  if (mode === 'bridge') return <BridgeAtelier onBack={goHome} />;
  if (mode === 'picktolight') return <PickToLight onBack={goHome} />;
  if (mode === 'stage_inventaire') return <StageInventaire onBack={goHome} />;
  if (mode === 'preparation_livraison') return <PreparationLivraison onBack={goHome} />;
  if (mode === 'workshop_layout') return <WorkshopApp onHome={goHome} />;

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

  return (
    <div>
      <div className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-2">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button onClick={goHome} className="text-sm text-gray-500 hover:text-white transition-colors">
            Accueil
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
