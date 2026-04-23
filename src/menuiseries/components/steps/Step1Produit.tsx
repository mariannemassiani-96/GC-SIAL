import type { ConfigMenuiserie, TypeProduit } from '../../types';
import { TYPES_PRODUITS } from '../../constants/produits';
import * as Icons from 'lucide-react';

interface Step1Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
}

export function Step1Produit({ config, onUpdate, onNext }: Step1Props) {
  const selected = config.typeProduit;

  const handleSelect = (id: TypeProduit) => {
    onUpdate({ typeProduit: id });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Quel produit souhaitez-vous configurer ?</h2>
        <p className="text-sm text-gray-400">Sélectionnez le type de menuiserie pour commencer</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {TYPES_PRODUITS.map((produit) => {
          const isSelected = selected === produit.id;
          // Dynamic icon from lucide-react
          const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[produit.icon] ?? Icons.Square;

          return (
            <button
              key={produit.id}
              onClick={() => handleSelect(produit.id)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all hover:scale-[1.02]
                ${isSelected
                  ? 'border-blue-500 bg-blue-600/10 shadow-lg shadow-blue-500/10'
                  : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550] hover:bg-[#252830]'
                }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Icons.Check size={16} className="text-blue-400" />
                </div>
              )}
              <div className={`p-3 rounded-xl ${isSelected ? 'bg-blue-600/20' : 'bg-[#252830]'}`}>
                <IconComponent size={28} />
              </div>
              <div className="text-center">
                <p className={`font-semibold text-sm ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                  {produit.label}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {produit.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Info sur le produit sélectionné */}
      {selected && (() => {
        const produit = TYPES_PRODUITS.find((p) => p.id === selected);
        if (!produit) return null;
        return (
          <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4 flex items-start gap-3">
            <Icons.Info size={18} className="text-blue-400 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="text-gray-300 font-medium">{produit.label}</p>
              <p className="text-gray-500 mt-1">
                Matériaux disponibles : {produit.materiauxDisponibles.join(', ').toUpperCase()}
              </p>
              {produit.hasVitrage && <p className="text-gray-500">Vitrage configurable</p>}
              {produit.hasVoletIntegre && <p className="text-gray-500">Volet roulant intégrable</p>}
            </div>
          </div>
        );
      })()}

      {/* CTA */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onNext}
          disabled={!selected}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer
          <Icons.ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
