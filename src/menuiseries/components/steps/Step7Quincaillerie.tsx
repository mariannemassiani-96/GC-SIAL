import type { ConfigMenuiserie, NiveauSecuriteId } from '../../types';
import { NIVEAUX_SECURITE, getPoigneesForMateriau } from '../../constants/ouvertures';
import { ArrowRight, ArrowLeft, Check, Lock, Grip, Wind, Eye } from 'lucide-react';
import { useState } from 'react';

interface Step7Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
  hideNav?: boolean;
}

type NiveauQuincaillerie = 'standard' | 'confort' | 'securite';

export function Step7Quincaillerie({ config, onUpdate, onNext, onPrev, hideNav }: Step7Props) {
  const [niveau, setNiveau] = useState<NiveauQuincaillerie>('standard');

  const poignees = getPoigneesForMateriau(config.materiau ?? 'pvc');

  // Options avancées
  const [entrebailleurs, setEntrebailleurs] = useState(false);
  const [microVentilation, setMicroVentilation] = useState(false);
  const [charnieresInvisibles, setCharnieresInvisibles] = useState(false);

  const niveauxPresets: { id: NiveauQuincaillerie; label: string; desc: string; securite: NiveauSecuriteId; icon: React.ReactNode }[] = [
    { id: 'standard', label: 'Standard', desc: 'Ferrure standard, points de fermeture classiques', securite: 'standard', icon: <Grip size={24} /> },
    { id: 'confort', label: 'Confort', desc: 'Multi-points, entrebâillement, micro-ventilation', securite: 'renforcee', icon: <Wind size={24} /> },
    { id: 'securite', label: 'Sécurité', desc: 'Anti-effraction RC2, gâches renforcées, vitrage sécurité', securite: 'anti_effraction_rc2', icon: <Lock size={24} /> },
  ];

  const handleNiveau = (n: NiveauQuincaillerie) => {
    setNiveau(n);
    const preset = niveauxPresets.find((p) => p.id === n)!;
    onUpdate({ securite: preset.securite });
    if (n === 'confort') {
      setEntrebailleurs(true);
      setMicroVentilation(true);
    } else if (n === 'securite') {
      setEntrebailleurs(false);
      setMicroVentilation(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Quincaillerie</h2>
        <p className="text-sm text-gray-400">Choisissez le niveau de quincaillerie, la poignée et les options</p>
      </div>

      {/* Niveaux preset */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Niveau de quincaillerie</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {niveauxPresets.map((preset) => {
            const isSelected = niveau === preset.id;
            const secDef = NIVEAUX_SECURITE.find((s) => s.id === preset.securite);
            return (
              <button
                key={preset.id}
                onClick={() => handleNiveau(preset.id)}
                className={`relative text-left p-5 rounded-xl border-2 transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
              >
                {isSelected && <div className="absolute top-3 right-3"><Check size={16} className="text-blue-400" /></div>}
                <div className={`mb-3 ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>{preset.icon}</div>
                <h4 className={`font-semibold text-sm mb-1 ${isSelected ? 'text-blue-400' : 'text-white'}`}>{preset.label}</h4>
                <p className="text-xs text-gray-500">{preset.desc}</p>
                {secDef && secDef.coefPrix > 1 && (
                  <p className="text-xs text-gray-600 mt-2">+{Math.round((secDef.coefPrix - 1) * 100)}%</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Options avancées */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Options</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550] transition-colors">
            <div className="flex items-center gap-3">
              <Wind size={16} className="text-gray-400" />
              <div>
                <p className="text-sm text-white">Entrebâillement</p>
                <p className="text-xs text-gray-500">Position d'ouverture limitée pour aération</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={entrebailleurs}
              onChange={(e) => setEntrebailleurs(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550] transition-colors">
            <div className="flex items-center gap-3">
              <Wind size={16} className="text-gray-400" />
              <div>
                <p className="text-sm text-white">Micro-ventilation</p>
                <p className="text-xs text-gray-500">Ventilation permanente discrète</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={microVentilation}
              onChange={(e) => setMicroVentilation(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500"
            />
          </label>

          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550] transition-colors">
            <div className="flex items-center gap-3">
              <Eye size={16} className="text-gray-400" />
              <div>
                <p className="text-sm text-white">Charnières invisibles</p>
                <p className="text-xs text-gray-500">Finition épurée, paumelles cachées</p>
              </div>
            </div>
            <input
              type="checkbox"
              checked={charnieresInvisibles}
              onChange={(e) => setCharnieresInvisibles(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>
      </div>

      {/* Poignées */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Poignée</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {poignees.map((poignee) => {
            const isSelected = config.poignee === poignee.id;
            return (
              <button
                key={poignee.id}
                onClick={() => onUpdate({ poignee: poignee.id })}
                className={`text-left p-4 rounded-xl border-2 transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
              >
                {/* Placeholder visuel poignée */}
                <div className={`w-8 h-16 mx-auto mb-2 rounded-full border-2 ${isSelected ? 'border-blue-400 bg-blue-600/10' : 'border-[#404550] bg-[#252830]'}`} />
                <p className={`text-xs font-medium text-center ${isSelected ? 'text-blue-400' : 'text-white'}`}>{poignee.label}</p>
                <p className="text-[10px] text-gray-500 text-center mt-0.5">{poignee.description}</p>
                {poignee.coefPrix > 1 && (
                  <p className="text-[10px] text-gray-600 text-center mt-1">+{Math.round((poignee.coefPrix - 1) * 100)}%</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation */}
      {!hideNav && (
        <div className="flex justify-between pt-4">
          <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
            <ArrowLeft size={18} /> Retour
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Continuer <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
