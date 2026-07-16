import { useState, useCallback } from 'react';
import { useAffaires, createEmptyAffaire } from './store/affaires';
import { ListeAffaires } from './pages/ListeAffaires';
import { Configurateur } from './pages/Configurateur';
import { SmartAssembly } from './atelier/components/SmartAssembly';
import { StageInventaire } from './atelier/components/StageInventaire';
import { PreparationLivraison } from './atelier/components/PreparationLivraison';
import { ReceptionMatiere } from './atelier/components/ReceptionMatiere';
import { PosteCoupe } from './atelier/components/PosteCoupe';
import { TracaMenuiserie } from './atelier/components/TracaMenuiserie';
import { SialMenuiseries } from './pages/SialMenuiseries';
import { MaintenanceQualite } from './atelier/components/MaintenanceQualite';
import { WorkshopApp } from './workshop/WorkshopApp';
import { VitrageApp } from './pages/VitrageApp';
import { DashboardGlobal } from './pages/DashboardGlobal';
import { OdooConnector } from './pages/OdooConnector';
import { QualiteView } from './pages/QualiteView';
import { BiDashboard } from './pages/BiDashboard';
import { FormationOdoo } from './pages/FormationOdoo';
import { AuthProvider, LoginScreen, useAuth } from './AuthContext';
import { AdminPanel } from './AdminPanel';
import { logout as apiLogout } from './api';
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
  | 'vitrage'
  | 'dashboard_global'
  | 'odoo'
  | 'qualite'
  | 'bi_dashboard'
  | 'formation_odoo'
  | 'traca_menuiserie'
  | 'sial_menuiseries';

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
      id: 'sial_menuiseries' as AppMode,
      label: 'SIAL MENUISERIES',
      description: 'Fabrication menuiseries alu & PVC — 5 postes avec tracabilite CE + NF integree.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <rect x="3" y="3" width="7" height="10" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" /><line x1="3" y1="8" x2="10" y2="8" />
        </svg>
      ),
      color: 'red',
    },
    {
      id: 'traca_menuiserie' as AppMode,
      label: 'Tracabilite Menuiseries',
      description: 'Fiches tracabilite CE + NF — vue d\'ensemble et gestion des fiches.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400">
          <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18M3 9h18" /><path d="M13 13l2 2 4-4" strokeWidth="2" />
        </svg>
      ),
      color: 'rose',
    },
    {
      id: 'poste_coupe' as AppMode,
      label: 'Preparation & Coupe Profiles',
      description: 'Import FSTLINE, preparation barres, coupe LMT65/DT/Renfort, suivi piece par piece.',
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
      label: 'ISULA VITRAGE',
      description: 'Suivi commandes vitrage, optimisation coupe 2D, etiquettes Avery, fiche Warm Edge.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-blue-400">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" />
          <line x1="12" y1="3" x2="12" y2="21" /><rect x="5" y="5" width="5" height="5" rx="0.5" strokeDasharray="2,1" />
        </svg>
      ),
      color: 'blue',
    },
    {
      id: 'dashboard_global' as AppMode,
      label: 'Tableau de Bord',
      description: 'Suivi global des commandes — progression par module, alertes NC, filtres par semaine et statut.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-indigo-400">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ),
      color: 'indigo',
    },
    {
      id: 'odoo' as AppMode,
      label: 'Odoo 18',
      description: 'Connecteur ERP — produits, stock accessoires, fournisseurs, achats, factures.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-orange-400">
          <circle cx="12" cy="12" r="9" /><path d="M8 12h8M12 8v8" /><circle cx="12" cy="12" r="3" />
        </svg>
      ),
      color: 'orange',
    },
    {
      id: 'formation_odoo' as AppMode,
      label: 'Formation Odoo',
      description: 'Tutoriels, flux de travail, procedures — guide complet Odoo 18 pour SIAL.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-teal-400">
          <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
        </svg>
      ),
      color: 'teal',
    },
    {
      id: 'qualite' as AppMode,
      label: 'Qualite',
      description: 'Non-conformites, causes, actions correctives, procedures qualite, statistiques.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400">
          <path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="9" />
        </svg>
      ),
      color: 'red',
    },
    {
      id: 'bi_dashboard' as AppMode,
      label: 'Tableau de Bord BI',
      description: 'KPI, pipeline commandes, charge par poste, taux NC, progression globale.',
      icon: (
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-cyan-400">
          <rect x="3" y="12" width="4" height="9" rx="1" /><rect x="10" y="7" width="4" height="14" rx="1" /><rect x="17" y="3" width="4" height="18" rx="1" />
        </svg>
      ),
      color: 'cyan',
    },
  ];

  const isulaApps = apps.filter(a => ['vitrage'].includes(a.id));
  const sialApps = apps.filter(a => ['sial_menuiseries'].includes(a.id));
  const transversalApps = apps.filter(a => ['reception_matiere', 'stock_accessoires', 'preparation_livraison', 'maintenance_qualite'].includes(a.id));
  const beApps = apps.filter(a => ['gc', 'workshop_layout', 'formation_odoo'].includes(a.id));
  const supervisionApps = apps.filter(a => ['dashboard_global', 'odoo', 'qualite', 'bi_dashboard'].includes(a.id));

  const filterApps = (list: typeof apps) =>
    list.filter(app => {
      if (!user) return false;
      if (user.role === 'admin') return true;
      if (!user.apps_autorisees || user.apps_autorisees.length === 0) return true;
      return user.apps_autorisees.includes(app.id);
    });

  const renderCard = (app: typeof apps[0]) => (
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
  );

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">SIAL — Groupe VISTA</h1>
            <p className="text-sm text-gray-500 mt-0.5">Outils atelier et bureau d'etudes</p>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{user.nom}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-green-600/20 text-green-400 border border-green-500/30">{user.role}</span>
              {user.role === 'admin' && (
                <button onClick={() => onSelect('admin')} className="text-xs text-gray-500 hover:text-amber-400 transition-colors">Admin</button>
              )}
              <button onClick={logout} className="text-xs text-gray-500 hover:text-red-400 transition-colors">Deconnexion</button>
            </div>
          )}
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-10">
        {/* ISULA VITRAGE */}
        {filterApps(isulaApps).length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="12" y1="3" x2="12" y2="21" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">ISULA VITRAGE</h2>
              <span className="text-xs text-gray-500">Vitrages isolants, coupe verre, CEKAL</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filterApps(isulaApps).map(renderCard)}
            </div>
          </section>
        )}

        {/* SIAL MENUISERIES */}
        {filterApps(sialApps).length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-400">
                  <rect x="3" y="3" width="7" height="10" rx="1" /><rect x="14" y="3" width="7" height="18" rx="1" /><line x1="3" y1="8" x2="10" y2="8" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">SIAL MENUISERIES</h2>
              <span className="text-xs text-gray-500">Aluminium & PVC, coupe profiles, montage, CE + NF</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filterApps(sialApps).map(renderCard)}
            </div>
          </section>
        )}

        {/* TRANSVERSAL */}
        {filterApps(transversalApps).length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/30 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-amber-400">
                  <path d="M2 20h20M4 20V10l8-6 8 6v10" /><rect x="9" y="14" width="6" height="6" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">TRANSVERSAL</h2>
              <span className="text-xs text-gray-500">Reception, stock, livraison, maintenance</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filterApps(transversalApps).map(renderCard)}
            </div>
          </section>
        )}

        {/* BE */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-violet-400">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white">BUREAU D'ETUDES</h2>
            <span className="text-xs text-gray-500">Configuration, plans techniques</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filterApps(beApps).map(renderCard)}
          </div>
        </section>

        {/* SUPERVISION */}
        {user && (user.role === 'admin' || user.role === 'superviseur' || user.role === 'chef_atelier') && filterApps(supervisionApps).length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400">
                  <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-white">SUPERVISION</h2>
              <span className="text-xs text-gray-500">Suivi global, tableaux de bord</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filterApps(supervisionApps).map(renderCard)}
            </div>
          </section>
        )}
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

  const isOperateurPIN = !!user.pin_enabled && user.role === 'operateur';

  // ── Opérateur PIN → mode atelier direct ──
  if (isOperateurPIN) {
    const autoApps = user.apps_autorisees || [];
    if (mode === 'home') {
      if (autoApps.length === 1) {
        if (autoApps[0] === 'vitrage') return <VitrageApp onBack={goHome} startAtelier />;
        if (autoApps[0] === 'poste_coupe') return <PosteCoupe onBack={goHome} startAtelier />;
      }
      return (
        <div className="fixed inset-0 bg-[#0a0c10] flex flex-col items-center justify-center gap-8">
          <h1 className="text-3xl font-black text-white">SIAL ATELIER</h1>
          <p className="text-lg text-gray-400">Bonjour {user.nom}</p>
          <div className="grid grid-cols-1 gap-4 w-full max-w-md px-8">
            {autoApps.includes('vitrage') && (
              <button onClick={() => setMode('vitrage')} className="p-6 bg-blue-700 hover:bg-blue-600 text-white text-2xl font-bold rounded-2xl active:scale-95">
                ISULA VITRAGE
              </button>
            )}
            {autoApps.includes('poste_coupe') && (
              <button onClick={() => setMode('poste_coupe')} className="p-6 bg-green-700 hover:bg-green-600 text-white text-2xl font-bold rounded-2xl active:scale-95">
                PREPARATION & COUPE PROFILES
              </button>
            )}
            <button onClick={() => { apiLogout(); window.location.reload(); }}
              className="p-4 bg-gray-800 hover:bg-gray-700 text-gray-400 text-base rounded-xl">
              Deconnexion
            </button>
          </div>
        </div>
      );
    }
    if (mode === 'vitrage') return <VitrageApp onBack={goHome} startAtelier />;
    if (mode === 'poste_coupe') return <PosteCoupe onBack={goHome} startAtelier />;
  }

  // ── Routage normal ────────────────────────────────────────

  if (mode === 'admin' && user.role === 'admin') {
    return <AdminPanel onBack={goHome} />;
  }

  if (mode === 'home') {
    return <HubFabrication onSelect={setMode} />;
  }

  if (mode === 'sial_menuiseries') return <SialMenuiseries onBack={goHome} />;
  if (mode === 'traca_menuiserie') return <TracaMenuiserie onBack={goHome} />;
  if (mode === 'poste_coupe') return <PosteCoupe onBack={goHome} />;
  if (mode === 'maintenance_qualite') return <MaintenanceQualite onBack={goHome} />;
  if (mode === 'reception_matiere') return <ReceptionMatiere onBack={goHome} />;
  if (mode === 'smart_assembly') return <SmartAssembly onBack={goHome} />;
  if (mode === 'stock_accessoires') return <StageInventaire onBack={goHome} />;
  if (mode === 'preparation_livraison') return <PreparationLivraison onBack={goHome} />;
  if (mode === 'workshop_layout') return <WorkshopApp onHome={goHome} />;
  if (mode === 'vitrage') return <VitrageApp onBack={goHome} />;
  if (mode === 'dashboard_global') return <DashboardGlobal onBack={goHome} />;
  if (mode === 'odoo') return <OdooConnector onBack={goHome} />;
  if (mode === 'formation_odoo') return <FormationOdoo onBack={goHome} />;
  if (mode === 'qualite') return <QualiteView onBack={goHome} />;
  if (mode === 'bi_dashboard') return <BiDashboard onBack={goHome} />;

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
