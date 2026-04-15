import type { ConfigMenuiserie, MateriauId } from '../../types';
import { MATERIAUX, getProfilsForMateriauId } from '../../constants/materiaux';
import { getTypeProduit } from '../../constants/produits';
import { Check, ArrowRight, ArrowLeft, Shield, Thermometer, Paintbrush, Wrench } from 'lucide-react';

interface Step2Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step2Materiau({ config, onUpdate, onNext, onPrev }: Step2Props) {
  const typeProduit = getTypeProduit(config.typeProduit ?? '');
  const materiauxDispo = typeProduit?.materiauxDisponibles ?? [];
  const materiaux = MATERIAUX.filter((m) => materiauxDispo.includes(m.id));
  const selectedMat = config.materiau;
  const profils = selectedMat ? getProfilsForMateriauId(selectedMat) : [];

  const handleSelectMateriau = (id: MateriauId) => {
    const newProfils = getProfilsForMateriauId(id);
    onUpdate({
      materiau: id,
      profil: newProfils.length > 0 ? newProfils[0].id : undefined,
    });
  };

  const iconForAvantage = (txt: string) => {
    if (txt.toLowerCase().includes('isol')) return <Thermometer size={14} />;
    if (txt.toLowerCase().includes('entretien') || txt.toLowerCase().includes('résist')) return <Shield size={14} />;
    if (txt.toLowerCase().includes('design') || txt.toLowerCase().includes('couleur') || txt.toLowerCase().includes('personnalisable')) return <Paintbrush size={14} />;
    return <Wrench size={14} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Choisissez votre matériau</h2>
        <p className="text-sm text-gray-400">Sélectionnez le matériau et le profilé de votre {typeProduit?.label?.toLowerCase() ?? 'menuiserie'}</p>
      </div>

      {/* Matériaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {materiaux.map((mat) => {
          const isSelected = selectedMat === mat.id;
          return (
            <button
              key={mat.id}
              onClick={() => handleSelectMateriau(mat.id)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all hover:scale-[1.01]
                ${isSelected
                  ? 'border-blue-500 bg-blue-600/10'
                  : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'
                }`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3">
                  <Check size={16} className="text-blue-400" />
                </div>
              )}
              <h3 className={`font-semibold text-base mb-1 ${isSelected ? 'text-blue-400' : 'text-white'}`}>
                {mat.label}
              </h3>
              <p className="text-xs text-gray-500 mb-3">{mat.description}</p>
              <div className="space-y-1.5">
                {mat.avantages.map((av, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                    <span className="text-green-500">{iconForAvantage(av)}</span>
                    {av}
                  </div>
                ))}
              </div>
              {mat.coefPrix !== 1.0 && (
                <div className="mt-3 text-xs text-gray-500">
                  Coefficient prix : &times;{mat.coefPrix.toFixed(2)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Profilés */}
      {selectedMat && profils.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-white mb-3">Profilé</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {profils.map((p) => {
              const isSelected = config.profil === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => onUpdate({ profil: p.id })}
                  className={`text-left p-4 rounded-lg border transition-all
                    ${isSelected
                      ? 'border-blue-500 bg-blue-600/10'
                      : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'
                    }`}
                >
                  <p className={`font-medium text-sm ${isSelected ? 'text-blue-400' : 'text-white'}`}>{p.label}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                    <span>{p.epaisseur}mm</span>
                    <span>Uw={p.uw} W/m²K</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium
                      ${p.isolation === 'premium' ? 'bg-green-600/20 text-green-400' :
                        p.isolation === 'renforcee' ? 'bg-blue-600/20 text-blue-400' :
                        'bg-gray-600/20 text-gray-400'}`}>
                      {p.isolation === 'premium' ? 'Premium' : p.isolation === 'renforcee' ? 'Isolation+' : 'Standard'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
          <ArrowLeft size={18} /> Retour
        </button>
        <button
          onClick={onNext}
          disabled={!selectedMat || !config.profil}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
