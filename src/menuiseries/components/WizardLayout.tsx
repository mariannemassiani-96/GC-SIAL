import type { ConfigMenuiserie, WizardStep, CalculPrix } from '../types';
import { WizardNav } from './WizardNav';
import { PrixSidebar } from './PrixSidebar';
import { PreviewMenuiserie } from './PreviewMenuiserie';
import { Step1Produit } from './steps/Step1Produit';
import { Step2Materiau } from './steps/Step2Materiau';
import { Step3Dimensions } from './steps/Step3Dimensions';
import { Step4Ouverture } from './steps/Step4Ouverture';
import { Step5Vitrage } from './steps/Step5Vitrage';
import { Step6Couleurs } from './steps/Step6Couleurs';
import { Step7Quincaillerie } from './steps/Step7Quincaillerie';
import { Step8Accessoires } from './steps/Step8Accessoires';
import { Step9Pose } from './steps/Step9Pose';
import { StepRecap } from './steps/StepRecap';
import { TYPES_PRODUITS } from '../constants/produits';
import { ArrowLeft, ArrowRight, AlertTriangle, Lightbulb, XCircle } from 'lucide-react';

interface WizardLayoutProps {
  step: WizardStep;
  maxStep: WizardStep;
  config: Partial<ConfigMenuiserie>;
  prix: CalculPrix;
  onGoTo: (step: WizardStep) => void;
  onNext: () => void;
  onPrev: () => void;
  onUpdateConfig: (updates: Partial<ConfigMenuiserie>) => void;
  onBack: () => void;
  onAddToCart: () => void;
}

/** Notifications moteur intelligent */
function getNotifications(config: Partial<ConfigMenuiserie>): { type: 'error' | 'warning' | 'info'; message: string }[] {
  const notifs: { type: 'error' | 'warning' | 'info'; message: string }[] = [];

  // Vérifications
  const largeur = config.largeur ?? 0;
  const hauteur = config.hauteur ?? 0;
  const surface = (largeur / 1000) * (hauteur / 1000);

  if (surface > 4 && config.vitrage?.startsWith('double')) {
    notifs.push({ type: 'warning', message: 'Triple vitrage recommandé pour les grandes surfaces (> 4m²)' });
  }

  if (config.typeProduit === 'porte_entree' && config.securite === 'standard') {
    notifs.push({ type: 'info', message: 'Sécurité renforcée recommandée pour une porte d\'entrée' });
  }

  if (config.forme === 'cintre' && config.voletRoulant) {
    notifs.push({ type: 'warning', message: 'Les volets roulants ne sont pas compatibles avec les formes cintrées sur la partie arrondie' });
  }

  if (config.materiau === 'bois' && !config.bicolore) {
    notifs.push({ type: 'info', message: 'En bois, pensez à la protection extérieure avec une finition aluminium (bois-alu)' });
  }

  return notifs;
}

export function WizardLayout({
  step, maxStep, config, prix,
  onGoTo, onNext, onPrev, onUpdateConfig, onBack, onAddToCart,
}: WizardLayoutProps) {
  const produit = TYPES_PRODUITS.find((p) => p.id === config.typeProduit);
  const notifications = getNotifications(config);

  // Nombre total d'étapes : 10 (1-9 + récap)
  // On mappe step 1-8 → les 8 premières étapes, step 8 n'existe pas en nav car on a 9 étapes + recap
  // Simplifié : steps 1-8 dans le WizardNav, step 8 = recap
  // Mais on a 9 étapes + recap maintenant. On garde WizardStep = 1..8 pour la nav, et on gère la pose inline

  const renderStep = () => {
    switch (step) {
      case 1: return <Step1Produit config={config} onUpdate={onUpdateConfig} onNext={onNext} />;
      case 2: return <Step2Materiau config={config} onUpdate={onUpdateConfig} onNext={onNext} onPrev={onPrev} />;
      case 3: return <Step3Dimensions config={config} onUpdate={onUpdateConfig} onNext={onNext} onPrev={onPrev} />;
      case 4: return <Step4Ouverture config={config} onUpdate={onUpdateConfig} onNext={onNext} onPrev={onPrev} />;
      case 5: return <Step5Vitrage config={config} onUpdate={onUpdateConfig} onNext={onNext} onPrev={onPrev} />;
      case 6: return <Step6Couleurs config={config} onUpdate={onUpdateConfig} onNext={onNext} onPrev={onPrev} />;
      case 7: return (
        <div className="space-y-8">
          <Step7Quincaillerie config={config} onUpdate={onUpdateConfig} onNext={() => {}} onPrev={onPrev} hideNav />
          <div className="border-t border-[#2a2d35] pt-6">
            <Step8Accessoires config={config} onUpdate={onUpdateConfig} onNext={() => {}} onPrev={() => {}} hideNav />
          </div>
          <div className="border-t border-[#2a2d35] pt-6">
            <Step9Pose config={config} onUpdate={onUpdateConfig} onNext={() => {}} onPrev={() => {}} hideNav />
          </div>
          {/* Bouton principal Continuer — toujours visible en bas */}
          <div className="flex justify-between pt-6 border-t border-[#2a2d35]">
            <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
              <ArrowLeft size={18} /> Retour
            </button>
            <button
              onClick={onNext}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-8 py-3 rounded-lg transition-colors shadow-lg shadow-green-600/20"
            >
              Voir le récapitulatif <ArrowRight size={18} />
            </button>
          </div>
        </div>
      );
      case 8: return <StepRecap config={config} prix={prix} onGoTo={onGoTo} onPrev={onPrev} onAddToCart={onAddToCart} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} />
            Retour à l'affaire
          </button>
          <h1 className="text-sm font-semibold text-white">
            Configurateur {produit?.label ?? 'Menuiserie'}
          </h1>
          <div className="text-sm text-gray-500">
            {config.largeur && config.hauteur ? `${config.largeur}×${config.hauteur} mm` : ''}
          </div>
        </div>
      </header>

      {/* Nav wizard */}
      <WizardNav currentStep={step} maxStep={maxStep} onGoTo={onGoTo} />

      {/* Layout 3 colonnes */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Centre - Configuration */}
          <div className="space-y-6">
            {renderStep()}
          </div>

          {/* Droite - Prix + Aperçu + Alertes */}
          <div className="space-y-4">
            {/* Aperçu visuel */}
            {step > 1 && (
              <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Aperçu</h4>
                <PreviewMenuiserie config={config} width={260} height={220} />
              </div>
            )}

            {/* Prix */}
            <PrixSidebar
              prix={prix}
              typeProduit={produit?.label}
              onAddToCart={step === 8 ? onAddToCart : undefined}
            />

            {/* Notifications moteur intelligent */}
            {notifications.length > 0 && (
              <div className="space-y-2">
                {notifications.map((notif, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 p-3 rounded-lg border text-xs
                      ${notif.type === 'error' ? 'bg-red-600/10 border-red-500/30 text-red-300' :
                        notif.type === 'warning' ? 'bg-amber-600/10 border-amber-500/30 text-amber-300' :
                        'bg-blue-600/10 border-blue-500/30 text-blue-300'
                      }`}
                  >
                    {notif.type === 'error' ? <XCircle size={14} className="mt-0.5 shrink-0" /> :
                     notif.type === 'warning' ? <AlertTriangle size={14} className="mt-0.5 shrink-0" /> :
                     <Lightbulb size={14} className="mt-0.5 shrink-0" />}
                    <span>{notif.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Résumé technique rapide */}
            {step > 2 && (
              <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Résumé technique</h4>
                <div className="space-y-1.5 text-xs">
                  {config.materiau && <div className="flex justify-between"><span className="text-gray-500">Matériau</span><span className="text-gray-300">{config.materiau.toUpperCase()}</span></div>}
                  {config.largeur && <div className="flex justify-between"><span className="text-gray-500">Dimensions</span><span className="text-gray-300">{config.largeur}×{config.hauteur} mm</span></div>}
                  {config.vitrage && <div className="flex justify-between"><span className="text-gray-500">Vitrage</span><span className="text-gray-300 truncate ml-2">{config.vitrage.replace(/_/g, ' ')}</span></div>}
                  {config.nbVantaux && <div className="flex justify-between"><span className="text-gray-500">Vantaux</span><span className="text-gray-300">{config.nbVantaux}</span></div>}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
