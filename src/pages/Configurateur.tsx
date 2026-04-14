import { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Ruler, Wrench, ShoppingCart } from 'lucide-react';
import type { Affaire, Alerte } from '../types';
import { calculerAffaire } from '../engine';
import { exportXML } from '../export/exportXML';
import { generateFicheFabPDF, generateBonCommandePDF } from '../export/exportPDF';
import { Sidebar } from '../components/Sidebar';
import { SectionProjet } from '../components/SectionProjet';
import { SectionTravees } from '../components/SectionTravees';
import { TabDebits } from '../components/tabs/TabDebits';
import { TabUsinages } from '../components/tabs/TabUsinages';
import { TabBonCommande } from '../components/tabs/TabBonCommande';
import { AlertBanner } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

interface ConfigurateurProps {
  affaire: Affaire;
  onUpdate: (updates: Partial<Affaire>) => void;
  onBack: () => void;
}

type TabId = 'debits' | 'usinages' | 'bc';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function Configurateur({ affaire, onUpdate, onBack }: ConfigurateurProps) {
  const [activeTab, setActiveTab] = useState<TabId>('debits');

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

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'debits', label: 'Débits', icon: <Ruler size={14} /> },
    { id: 'usinages', label: 'Usinages', icon: <Wrench size={14} /> },
    { id: 'bc', label: 'Bon de commande', icon: <ShoppingCart size={14} /> },
  ];

  return (
    <div className="flex h-screen bg-[#0f1117]">
      <Sidebar
        affaire={affaire}
        onChange={onUpdate}
        onExportXML={handleExportXML}
        onExportPDF={handleExportPDF}
        onExportBC={handleExportBC}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Topbar */}
        <div className="sticky top-0 z-10 bg-[#0f1117]/95 backdrop-blur border-b border-[#252830] px-6 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack} icon={<ArrowLeft size={16} />}>
            Retour
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-semibold text-gray-200">
              {affaire.ref} — {affaire.chantier || 'Nouveau projet'}
            </h1>
            <p className="text-xs text-gray-500">{affaire.client || 'Client non défini'}</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Alertes */}
          {resultat && <AlertBanner alertes={resultat.alertes} />}

          {/* Projet */}
          <SectionProjet affaire={affaire} onChange={onUpdate} />

          {/* Travees */}
          <SectionTravees affaire={affaire} onChange={onUpdate} alertesByTravee={alertesByTravee} />

          {/* Tabs */}
          {resultat && (
            <div className="bg-[#181c25] rounded-lg border border-[#252830]">
              <div className="flex border-b border-[#252830]">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {activeTab === 'debits' && <TabDebits resultat={resultat} />}
                {activeTab === 'usinages' && <TabUsinages resultat={resultat} angle={affaire.angle} />}
                {activeTab === 'bc' && <TabBonCommande resultat={resultat} />}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
