import { useState, useCallback } from 'react';
import { useAffairesAper, useWizard, createEmptyMenuiserie } from '../store/menuiserieStore';
import type { AffaireAper } from '../store/menuiserieStore';
import type { ConfigMenuiserie } from '../types';
import { TableauDeBord } from './TableauDeBord';
import { CreationAffaire } from './CreationAffaire';
import { ListeMenuiseries } from './ListeMenuiseries';
import { EcranVariantes } from './EcranVariantes';
import { AnalyseInterne } from './AnalyseInterne';
import { WizardLayout } from '../components/WizardLayout';
import { genererDevisPDF } from '../export/exportDevisPDF';
import { exportCSV } from '../export/exportTechnique';
import { v4 as uuid } from 'uuid';

type Screen = 'dashboard' | 'creation' | 'menuiseries' | 'wizard' | 'variantes' | 'analyse';

interface ConfigurateurAperProps {
  onSwitchToGC: () => void;
}

export function ConfigurateurAper({ onSwitchToGC }: ConfigurateurAperProps) {
  const store = useAffairesAper();
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [selectedAffaireId, setSelectedAffaireId] = useState<string | null>(null);
  const [editingMenuiserieId, setEditingMenuiserieId] = useState<string | null>(null);

  const selectedAffaire = store.affaires.find((a) => a.id === selectedAffaireId) ?? null;

  // ── Wizard state ───────────────────────────────────
  const [wizardConfig] = useState<Partial<ConfigMenuiserie>>({});
  const wizard = useWizard(wizardConfig);

  // ── Navigation ─────────────────────────────────────

  const handleNewAffaire = useCallback(() => {
    const newAffaire = store.addAffaire();
    setSelectedAffaireId(newAffaire.id);
    setScreen('creation');
  }, [store]);

  const handleSelectAffaire = useCallback((id: string) => {
    setSelectedAffaireId(id);
    const affaire = store.affaires.find((a) => a.id === id);
    if (affaire && affaire.nom.trim() === '') {
      setScreen('creation');
    } else {
      setScreen('menuiseries');
    }
  }, [store.affaires]);

  const handleUpdateAffaire = useCallback((updates: Partial<AffaireAper>) => {
    if (selectedAffaireId) store.updateAffaire(selectedAffaireId, updates);
  }, [selectedAffaireId, store]);

  const handleContinueFromCreation = useCallback(() => {
    setScreen('menuiseries');
  }, []);

  // ── Wizard menuiserie ─────────────────────────────

  const startWizard = useCallback((menuiserieId?: string) => {
    if (menuiserieId && selectedAffaire) {
      const menu = selectedAffaire.menuiseries.find((m) => m.id === menuiserieId);
      if (menu) {
        setEditingMenuiserieId(menuiserieId);
        wizard.setConfig({ ...menu });
        setScreen('wizard');
        return;
      }
    }
    // Nouvelle menuiserie
    setEditingMenuiserieId(null);
    const defaults = selectedAffaire?.parametresCommuns;
    const newConfig = createEmptyMenuiserie(defaults);
    wizard.setConfig({ ...newConfig });
    setScreen('wizard');
  }, [selectedAffaire, wizard]);

  const handleAddToCart = useCallback(() => {
    if (!selectedAffaireId) return;
    const config = wizard.config as ConfigMenuiserie;
    if (!config.id) config.id = uuid();

    if (editingMenuiserieId) {
      store.updateMenuiserie(selectedAffaireId, editingMenuiserieId, config);
    } else {
      const allAffaires = JSON.parse(localStorage.getItem('sial-aper-affaires') ?? '[]');
      const affaire = allAffaires.find((a: AffaireAper) => a.id === selectedAffaireId);
      if (affaire) {
        affaire.menuiseries.push(config);
        affaire.dateModification = new Date().toISOString().slice(0, 10);
        localStorage.setItem('sial-aper-affaires', JSON.stringify(allAffaires));
      }
    }
    setScreen('menuiseries');
    window.location.reload();
  }, [selectedAffaireId, editingMenuiserieId, wizard.config, store]);

  // ── Exports ────────────────────────────────────────

  const handleExportDevis = useCallback(() => {
    if (selectedAffaire) genererDevisPDF(selectedAffaire);
  }, [selectedAffaire]);

  const handleExportCSV = useCallback(() => {
    if (selectedAffaire) exportCSV(selectedAffaire);
  }, [selectedAffaire]);

  // ── Render ─────────────────────────────────────────

  switch (screen) {
    case 'dashboard':
      return (
        <TableauDeBord
          affaires={store.affaires}
          onNew={handleNewAffaire}
          onSelect={handleSelectAffaire}
          onDuplicate={store.duplicateAffaire}
          onDelete={store.deleteAffaire}
          onSwitchToGC={onSwitchToGC}
        />
      );

    case 'creation':
      if (!selectedAffaire) return null;
      return (
        <CreationAffaire
          affaire={selectedAffaire}
          onUpdate={handleUpdateAffaire}
          onBack={() => setScreen('dashboard')}
          onContinue={handleContinueFromCreation}
        />
      );

    case 'menuiseries':
      if (!selectedAffaire) return null;
      return (
        <ListeMenuiseries
          affaire={selectedAffaire}
          onBack={() => setScreen('dashboard')}
          onEditAffaire={() => setScreen('creation')}
          onAddMenuiserie={() => startWizard()}
          onEditMenuiserie={(id) => startWizard(id)}
          onDuplicateMenuiserie={(id) => {
            store.duplicateMenuiserie(selectedAffaireId!, id);
          }}
          onDeleteMenuiserie={(id) => {
            store.deleteMenuiserie(selectedAffaireId!, id);
          }}
          onExportDevis={handleExportDevis}
          onExportCSV={handleExportCSV}
          onVariantes={() => setScreen('variantes')}
          onAnalyse={() => setScreen('analyse')}
        />
      );

    case 'variantes':
      if (!selectedAffaire) return null;
      return (
        <EcranVariantes
          affaire={selectedAffaire}
          onUpdate={handleUpdateAffaire}
          onBack={() => setScreen('menuiseries')}
        />
      );

    case 'analyse':
      if (!selectedAffaire) return null;
      return (
        <AnalyseInterne
          affaire={selectedAffaire}
          onBack={() => setScreen('menuiseries')}
        />
      );

    case 'wizard':
      return (
        <WizardLayout
          step={wizard.step}
          maxStep={wizard.maxStep}
          config={wizard.config}
          prix={wizard.prix}
          onGoTo={wizard.goTo}
          onNext={wizard.next}
          onPrev={wizard.prev}
          onUpdateConfig={wizard.updateConfig}
          onBack={() => setScreen('menuiseries')}
          onAddToCart={handleAddToCart}
        />
      );
  }
}
