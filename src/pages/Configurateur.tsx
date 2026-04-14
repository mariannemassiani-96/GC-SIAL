import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, FileDown, FileText, Ruler, Wrench, ShoppingCart, Euro, Maximize2, Scissors } from 'lucide-react';
import type { Affaire, Alerte } from '../types';
import { calculerAffaire } from '../engine';
import { exportXML } from '../export/exportXML';
import { generateFicheFabPDF, generateBonCommandePDF } from '../export/exportPDF';
import { SectionProjet } from '../components/SectionProjet';
import { SectionTravees } from '../components/SectionTravees';
import { TabDebits } from '../components/tabs/TabDebits';
import { TabUsinages } from '../components/tabs/TabUsinages';
import { TabBonCommande } from '../components/tabs/TabBonCommande';
import { TabDevis } from '../components/tabs/TabDevis';
import { AlertBanner } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { PreviewGC } from '../components/PreviewGC';
import { OptimBarresVisu } from '../components/OptimBarresVisu';
import { SchemaCotes } from '../components/SchemaCotes';

interface ConfigurateurProps {
  affaire: Affaire;
  onUpdate: (updates: Partial<Affaire>) => void;
  onBack: () => void;
}

type TabId = 'config' | 'preview' | 'cotes' | 'debits' | 'usinages' | 'optim' | 'bc' | 'devis';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Configurateur({ affaire, onUpdate, onBack }: ConfigurateurProps) {
  const [activeTab, setActiveTab] = useState<TabId>('config');
  const [selectedTraveeIdx, setSelectedTraveeIdx] = useState(0);

  const resultat = useMemo(() => {
    if (affaire.travees.length === 0) return null;
    return calculerAffaire(affaire);
  }, [affaire]);

  const alertesByTravee = useMemo(() => {
    const map = new Map<string, Alerte[]>();
    if (resultat) {
      for (const rt of resultat.travees) {
        map.set(rt.travee.id, rt.alertes);
      }
    }
    return map;
  }, [resultat]);

  const handleExportXML = useCallback(() => {
    if (!resultat) return;
    const blob = exportXML(affaire, resultat);
    downloadBlob(blob, `${affaire.ref}_machine.xml`);
  }, [affaire, resultat]);

  const handleExportPDF = useCallback(async () => {
    if (!resultat) return;
    const blob = await generateFicheFabPDF(affaire, resultat);
    downloadBlob(blob, `${affaire.ref}_fiche_fab.pdf`);
  }, [affaire, resultat]);

  const handleExportBC = useCallback(async () => {
    if (!resultat) return;
    const blob = await generateBonCommandePDF(affaire, resultat);
    downloadBlob(blob, `${affaire.ref}_bon_commande.pdf`);
  }, [affaire, resultat]);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; needsResult?: boolean }[] = [
    { id: 'config', label: 'Configuration', icon: <Wrench size={14} /> },
    { id: 'preview', label: 'Aperçu', icon: <Maximize2 size={14} />, needsResult: true },
    { id: 'cotes', label: 'Prise de cotes', icon: <Ruler size={14} /> },
    { id: 'debits', label: 'Débits', icon: <Scissors size={14} />, needsResult: true },
    { id: 'usinages', label: 'Usinages', icon: <Wrench size={14} />, needsResult: true },
    { id: 'optim', label: 'Optimisation', icon: <Ruler size={14} />, needsResult: true },
    { id: 'bc', label: 'Commande', icon: <ShoppingCart size={14} />, needsResult: true },
    { id: 'devis', label: 'Devis', icon: <Euro size={14} />, needsResult: true },
  ];

  const selectedRT = resultat && selectedTraveeIdx < resultat.travees.length
    ? resultat.travees[selectedTraveeIdx]
    : resultat?.travees[0] ?? null;

  return (
    <div className="flex flex-col h-screen bg-[#0f1117]">
      {/* Top bar */}
      <div className="shrink-0 bg-[#14161d] border-b border-[#252830] px-4 py-2 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={16} />}>
          Retour
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-200 truncate">
            {affaire.ref} — {affaire.chantier || 'Nouveau projet'}
          </h1>
          <p className="text-[10px] text-gray-500">{affaire.client || 'Client non défini'} • {affaire.coloris}</p>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={handleExportPDF} icon={<FileText size={13} />} disabled={!resultat}>
            PDF Fab
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportXML} icon={<FileDown size={13} />} disabled={!resultat}>
            XML Machine
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportBC} icon={<FileText size={13} />} disabled={!resultat}>
            PDF Commande
          </Button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="shrink-0 bg-[#14161d] border-b border-[#252830] px-4 flex overflow-x-auto">
        {tabs.map((tab) => {
          const disabled = tab.needsResult && !resultat;
          return (
            <button
              key={tab.id}
              onClick={() => !disabled && setActiveTab(tab.id)}
              disabled={disabled}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : disabled
                    ? 'border-transparent text-gray-700 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-4 space-y-4">
          {/* Alertes */}
          {resultat && resultat.alertes.length > 0 && <AlertBanner alertes={resultat.alertes} />}

          {/* TAB: Config */}
          {activeTab === 'config' && (
            <>
              <SectionProjet affaire={affaire} onChange={onUpdate} />
              <SectionTravees affaire={affaire} onChange={onUpdate} alertesByTravee={alertesByTravee} />
            </>
          )}

          {/* TAB: Aperçu / Preview */}
          {activeTab === 'preview' && resultat && (
            <div className="space-y-4">
              {/* Travee selector */}
              {resultat.travees.length > 1 && (
                <div className="flex gap-1.5">
                  {resultat.travees.map((rt, i) => (
                    <button
                      key={rt.travee.id}
                      onClick={() => setSelectedTraveeIdx(i)}
                      className={`px-3 py-1.5 text-xs rounded font-mono transition-colors ${
                        i === selectedTraveeIdx
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#1e2028] text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {rt.travee.repere}
                    </button>
                  ))}
                </div>
              )}
              {selectedRT && <PreviewGC rt={selectedRT} />}
            </div>
          )}

          {/* TAB: Prise de cotes */}
          {activeTab === 'cotes' && (
            <SchemaCotes affaire={affaire} />
          )}

          {/* TAB: Débits */}
          {activeTab === 'debits' && resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
              <TabDebits resultat={resultat} />
            </div>
          )}

          {/* TAB: Usinages */}
          {activeTab === 'usinages' && resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
              <TabUsinages resultat={resultat} />
            </div>
          )}

          {/* TAB: Optimisation coupes */}
          {activeTab === 'optim' && resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Optimisation de coupe — barres 6 400 mm</h3>
              <OptimBarresVisu optimBarres={resultat.optimBarres} />
            </div>
          )}

          {/* TAB: Bon de commande */}
          {activeTab === 'bc' && resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
              <TabBonCommande resultat={resultat} />
            </div>
          )}

          {/* TAB: Devis */}
          {activeTab === 'devis' && resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
              <TabDevis affaire={affaire} resultat={resultat} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
