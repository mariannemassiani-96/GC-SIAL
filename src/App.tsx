import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { SmartAssembly } from './atelier/components/SmartAssembly';
import { StageInventaire } from './atelier/components/StageInventaire';
import { PreparationLivraison } from './atelier/components/PreparationLivraison';
import { ReceptionMatiere } from './atelier/components/ReceptionMatiere';
import { PosteCoupe } from './atelier/components/PosteCoupe';
import { MaintenanceQualite } from './atelier/components/MaintenanceQualite';
import { WorkshopApp } from './workshop/WorkshopApp';
import { VitrageApp } from './pages/VitrageApp';
import { AuthProvider, LoginScreen, useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import type { Affaire } from './types';

type AppMode =
  | 'home'
  | 'admin'
  | 'gc'
  | 'smart_assembly'
  | 'stock_accessoires'
  | 'preparation_livraison'
  | 'workshop_layout'
  | 'reception_matiere'
  | 'poste_coupe'
  | 'maintenance_qualite'
  | 'vitrage';

// ── Hub Fabrication (page d'accueil) ─────────────────────────────────

function HubFabrication({ onSelect }: { onSelect: (mode: AppMode) => void }) {
  const { user, logout } = useAuth();
  const apps = [
    {
      id: 'reception_matiere' as AppMode,
      label: 'Reception Matiere',
      description: 'Validation des livraisons fournisseurs — BL, sommiers, palettes, colis, controle quantitatif, reserves.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-sky-400">
          <rect x="1" y="3" width="15" height="13" rx="2" /><path d="M16 8h4l3 3v5h-7V8z" />
          <circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" />
          <path d="M9 10l2 2 4-4" strokeWidth="2" />
        </svg>
      ),
      color: 'sky',
    },
    {
      id: 'poste_coupe' as AppMode,
      label: 'Poste de Coupe',
      description: 'Optimisation barres, preparation stock, validation coupes piece par piece, visualisation chutes.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <path d="M6 9l6 6M14 9l-6 6" /><circle cx="10" cy="12" r="9" />
        </svg>
      ),
      color: 'red',
    },
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
      id: 'stock_accessoires' as AppMode,
      label: 'Stock & Accessoires',
      description: 'Gestion stock, accessoires, factures fournisseurs, dotations postes, inventaire, export Odoo 18.',
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
    {
      id: 'maintenance_qualite' as AppMode,
      label: 'Maintenance & Qualite',
      description: 'Fiches machines, plan preventif, criticite, procedures qualite, non-conformites, TNC.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-lime-400">
          <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
        </svg>
      ),
      color: 'lime',
    },
    {
      id: 'vitrage' as AppMode,
      label: 'Etiquettes Vitrage & WE',
      description: 'Etiquettes Avery 70x35mm (assemblees, EXT/INT, ordre de coupe Pro2D), optimisation intercalaires Warm Edge.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" /><rect x="5" y="5" width="5" height="5" rx="0.5" strokeDasharray="2,1" />
        </svg>
      ),
      color: 'blue',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SIAL Fabrication</h1>
            <p className="text-sm text-gray-500 mt-0.5">Outils atelier et configurateurs techniques</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{user.nom}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/30">{user.role}</span>
              {user.role === 'admin' && (
                <button onClick={() => onSelect('admin')} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">
                  Admin
                </button>
              )}
              <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                Deconnexion
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {apps
            .filter(app => {
              if (!user) return false;
              if (user.role === 'admin') return true;
              if (!user.apps_autorisees || user.apps_autorisees.length === 0) return true;
              return user.apps_autorisees.includes(app.id);
            })
            .map((app) => (
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

function AppContent() {
  const { user } = useAuth();
  const [mode, setModeRaw] = useState<AppMode>(() => {
    const saved = sessionStorage.getItem('sial_mode');
    return (saved as AppMode) || 'home';
  });
  const setMode = useCallback((m: AppMode) => {
    sessionStorage.setItem('sial_mode', m);
    setModeRaw(m);
  }, []);

  const { affaires, addAffaire, updateAffaire, deleteAffaire, duplicateAffaire } = useAffaires();
  const [selectedId, setSelectedIdRaw] = useState<string | null>(() => sessionStorage.getItem('sial_affaire_id'));
  const setSelectedId = useCallback((id: string | null) => {
    setSelectedIdRaw(id);
    if (id) sessionStorage.setItem('sial_affaire_id', id);
    else sessionStorage.removeItem('sial_affaire_id');
  }, []);
  const selectedAffaire = affaires.find((a) => a.id === selectedId) ?? null;

  const handleNew = useCallback(() => {
    const newAffaire = createEmptyAffaire();
    addAffaire(newAffaire);
    setSelectedId(newAffaire.id);
    sessionStorage.setItem('sial_affaire_id', newAffaire.id);
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
  }, [setMode, setSelectedId]);

  if (!user) return <LoginScreen />;

  // ── Routage ────────────────────────────────────────

  if (mode === 'admin' && user.role === 'admin') {
    return <AdminPanel onBack={goHome} />;
  }

  if (mode === 'home') {
    return <HubFabrication onSelect={setMode} />;
  }

  if (mode === 'poste_coupe') return <PosteCoupe onBack={goHome} />;
  if (mode === 'maintenance_qualite') return <MaintenanceQualite onBack={goHome} />;
  if (mode === 'reception_matiere') return <ReceptionMatiere onBack={goHome} />;
  if (mode === 'smart_assembly') return <SmartAssembly onBack={goHome} />;
  if (mode === 'stock_accessoires') return <StageInventaire onBack={goHome} />;
  if (mode === 'preparation_livraison') return <PreparationLivraison onBack={goHome} />;
  if (mode === 'workshop_layout') return <WorkshopApp onHome={goHome} />;
  if (mode === 'vitrage') return <VitrageApp onBack={goHome} />;

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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
