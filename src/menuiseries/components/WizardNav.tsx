import type { WizardStep } from '../types';
import { Check } from 'lucide-react';

interface WizardNavProps {
  currentStep: WizardStep;
  maxStep: WizardStep;
  onGoTo: (step: WizardStep) => void;
}

const STEPS: { step: WizardStep; label: string; short: string }[] = [
  { step: 1, label: 'Type de produit', short: 'Produit' },
  { step: 2, label: 'Matériau & Profilé', short: 'Matériau' },
  { step: 3, label: 'Forme & Dimensions', short: 'Dimensions' },
  { step: 4, label: 'Ouverture', short: 'Ouverture' },
  { step: 5, label: 'Vitrage', short: 'Vitrage' },
  { step: 6, label: 'Couleurs & Finitions', short: 'Couleurs' },
  { step: 7, label: 'Accessoires & Options', short: 'Options' },
  { step: 8, label: 'Récapitulatif', short: 'Récap.' },
];

export function WizardNav({ currentStep, maxStep, onGoTo }: WizardNavProps) {
  return (
    <nav className="w-full bg-[#181a20] border-b border-[#2a2d35] px-4 py-3">
      <div className="max-w-6xl mx-auto">
        {/* Desktop */}
        <ol className="hidden md:flex items-center gap-1">
          {STEPS.map(({ step, label }) => {
            const isActive = step === currentStep;
            const isCompleted = step < currentStep;
            const isAccessible = step <= maxStep;

            return (
              <li key={step} className="flex items-center flex-1">
                <button
                  onClick={() => isAccessible && onGoTo(step)}
                  disabled={!isAccessible}
                  className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                      : isCompleted
                        ? 'bg-green-600/10 text-green-400 hover:bg-green-600/20 cursor-pointer'
                        : isAccessible
                          ? 'text-gray-400 hover:bg-[#252830] cursor-pointer'
                          : 'text-gray-600 cursor-not-allowed'
                    }`}
                >
                  <span
                    className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0
                      ${isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-[#353840] text-gray-400'
                      }`}
                  >
                    {isCompleted ? <Check size={14} /> : step}
                  </span>
                  <span className="truncate">{label}</span>
                </button>
                {step < 8 && (
                  <div className={`w-4 h-0.5 mx-1 shrink-0 ${step < currentStep ? 'bg-green-600' : 'bg-[#353840]'}`} />
                )}
              </li>
            );
          })}
        </ol>

        {/* Mobile */}
        <div className="md:hidden flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
              {currentStep}
            </span>
            <div>
              <p className="text-sm font-medium text-white">{STEPS[currentStep - 1].label}</p>
              <p className="text-xs text-gray-500">Étape {currentStep} sur 8</p>
            </div>
          </div>
          <div className="flex gap-1">
            {STEPS.map(({ step }) => (
              <button
                key={step}
                onClick={() => step <= maxStep && onGoTo(step)}
                className={`w-2 h-2 rounded-full transition-all
                  ${step === currentStep ? 'bg-blue-500 w-4' : step < currentStep ? 'bg-green-500' : step <= maxStep ? 'bg-gray-500' : 'bg-gray-700'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
