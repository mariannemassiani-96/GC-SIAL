import type { ConfigMenuiserie, TypeVitrageId } from '../../types';
import { VITRAGES } from '../../constants/vitrages';
import { getTypeProduit } from '../../constants/produits';
import { ArrowRight, ArrowLeft, Thermometer, Volume2, Shield, Sun, Check, Star } from 'lucide-react';

interface Step5Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step5Vitrage({ config, onUpdate, onNext, onPrev }: Step5Props) {
  const typeProduit = getTypeProduit(config.typeProduit ?? '');
  const selectedVitrage = config.vitrage;

  // Si pas de vitrage pour ce type de produit
  if (!typeProduit?.hasVitrage) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Vitrage</h2>
          <p className="text-sm text-gray-400">Ce type de produit ne nécessite pas de vitrage.</p>
        </div>
        <div className="flex justify-between pt-4">
          <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
            <ArrowLeft size={18} /> Retour
          </button>
          <button onClick={onNext} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Continuer <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Recommandation en fonction du contexte
  const getRecommandation = (vitrageId: TypeVitrageId): 'recommande' | 'obligatoire' | null => {
    // Triple vitrage recommandé pour les grandes surfaces
    const surface = ((config.largeur ?? 1000) / 1000) * ((config.hauteur ?? 1200) / 1000);
    if (vitrageId === 'triple_standard' && surface > 3) return 'recommande';
    if (vitrageId === 'double_securite' && config.typeProduit === 'porte_entree') return 'obligatoire';
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Vitrage</h2>
        <p className="text-sm text-gray-400">Choisissez le type de vitrage adapté à vos besoins d'isolation et de sécurité</p>
      </div>

      {/* Grille de vitrages */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {VITRAGES.map((vitrage) => {
          const isSelected = selectedVitrage === vitrage.id;
          const reco = getRecommandation(vitrage.id);

          return (
            <button
              key={vitrage.id}
              onClick={() => onUpdate({ vitrage: vitrage.id })}
              className={`relative text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.01]
                ${isSelected
                  ? 'border-blue-500 bg-blue-600/10'
                  : reco === 'obligatoire'
                    ? 'border-amber-500/40 bg-[#1c1e24] hover:border-amber-500/60'
                    : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'
                }`}
            >
              {/* Badge recommandation */}
              {reco && (
                <div className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold
                  ${reco === 'obligatoire' ? 'bg-amber-600/20 text-amber-400' : 'bg-green-600/20 text-green-400'}`}>
                  {reco === 'obligatoire' ? '!' : <Star size={10} />}
                  {reco === 'obligatoire' ? 'Obligatoire' : 'Recommandé'}
                </div>
              )}

              {isSelected && !reco && (
                <div className="absolute top-3 right-3">
                  <Check size={16} className="text-blue-400" />
                </div>
              )}

              <h3 className={`font-semibold text-sm mb-1 pr-20 ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                {vitrage.label}
              </h3>
              <p className="text-xs text-gray-500 mb-3">{vitrage.description}</p>

              {/* Performances */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#252830] rounded-lg p-2 text-center">
                  <Thermometer size={14} className="mx-auto text-orange-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Ug</p>
                  <p className="text-sm font-bold text-white">{vitrage.ug}</p>
                  <p className="text-[9px] text-gray-600">W/m²K</p>
                </div>
                <div className="bg-[#252830] rounded-lg p-2 text-center">
                  <Volume2 size={14} className="mx-auto text-purple-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Rw</p>
                  <p className="text-sm font-bold text-white">{vitrage.affaiblissement}</p>
                  <p className="text-[9px] text-gray-600">dB</p>
                </div>
                <div className="bg-[#252830] rounded-lg p-2 text-center">
                  <Shield size={14} className="mx-auto text-green-400 mb-1" />
                  <p className="text-[10px] text-gray-500">Sécurité</p>
                  <p className="text-sm font-bold text-white">{vitrage.classeSecurite ?? '—'}</p>
                  <p className="text-[9px] text-gray-600">{vitrage.classeSecurite ? 'NF EN 356' : 'Standard'}</p>
                </div>
              </div>

              {/* Coef prix */}
              {vitrage.coefPrix !== 1.0 && (
                <p className="text-xs text-gray-600 mt-2">Supplément : +{Math.round((vitrage.coefPrix - 1) * 100)}%</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Légende performances */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Comprendre les performances</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-400">
          <div className="flex items-start gap-2">
            <Thermometer size={14} className="text-orange-400 mt-0.5 shrink-0" />
            <div><strong className="text-gray-300">Ug</strong> : Coefficient thermique du vitrage. Plus il est bas, meilleure est l'isolation.</div>
          </div>
          <div className="flex items-start gap-2">
            <Volume2 size={14} className="text-purple-400 mt-0.5 shrink-0" />
            <div><strong className="text-gray-300">Rw</strong> : Affaiblissement acoustique. Plus il est élevé, meilleure est l'isolation phonique.</div>
          </div>
          <div className="flex items-start gap-2">
            <Sun size={14} className="text-yellow-400 mt-0.5 shrink-0" />
            <div><strong className="text-gray-300">g</strong> : Facteur solaire. Plus il est bas, plus la chaleur solaire est bloquée.</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
          <ArrowLeft size={18} /> Retour
        </button>
        <button
          onClick={onNext}
          disabled={!selectedVitrage}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
