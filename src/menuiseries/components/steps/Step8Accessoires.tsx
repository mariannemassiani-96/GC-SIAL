import type { ConfigMenuiserie, TypeVoletId, PoseVoletId, VoletConfig } from '../../types';
import { VOLETS_ROULANTS, POSES_VOLET } from '../../constants/ouvertures';
import { getTypeProduit } from '../../constants/produits';
import { ArrowRight, ArrowLeft, Blinds, Bug, Sun, Check } from 'lucide-react';
import { useState } from 'react';

interface Step8Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step8Accessoires({ config, onUpdate, onNext, onPrev }: Step8Props) {
  const typeProduit = getTypeProduit(config.typeProduit ?? '');
  const hasVoletIntegre = typeProduit?.hasVoletIntegre ?? false;

  const [voletActif, setVoletActif] = useState(!!config.voletRoulant);
  const [moustiquaireActif, setMoustiquaireActif] = useState(false);
  const [bsoActif, setBsoActif] = useState(false);

  const voletConfig = config.voletRoulant ?? { type: 'electrique' as TypeVoletId, pose: 'neuf_coffre_tunnel' as PoseVoletId, couleur: config.couleurExterieure ?? 'blanc_9016' };

  const handleVoletToggle = (actif: boolean) => {
    setVoletActif(actif);
    if (actif) {
      onUpdate({ voletRoulant: voletConfig });
    } else {
      onUpdate({ voletRoulant: undefined });
    }
  };

  const handleVoletUpdate = (updates: Partial<VoletConfig>) => {
    const newConfig = { ...voletConfig, ...updates };
    onUpdate({ voletRoulant: newConfig });
  };

  // Croisillons
  const [croisillonsActif, setCroisillonsActif] = useState(config.croisillons ?? false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Accessoires & Options</h2>
        <p className="text-sm text-gray-400">Ajoutez les équipements complémentaires</p>
      </div>

      {/* ─── Volet roulant ─── */}
      {hasVoletIntegre && (
        <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl overflow-hidden">
          <button
            onClick={() => handleVoletToggle(!voletActif)}
            className="w-full flex items-center justify-between p-4 hover:bg-[#252830] transition-colors"
          >
            <div className="flex items-center gap-3">
              <Blinds size={20} className={voletActif ? 'text-blue-400' : 'text-gray-500'} />
              <div className="text-left">
                <p className="text-sm font-medium text-white">Volet roulant</p>
                <p className="text-xs text-gray-500">Ajoutez un volet roulant intégré</p>
              </div>
            </div>
            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
              ${voletActif ? 'bg-blue-600 border-blue-500' : 'border-[#404550]'}`}>
              {voletActif && <Check size={12} className="text-white" />}
            </div>
          </button>

          {voletActif && (
            <div className="p-4 pt-0 space-y-4 border-t border-[#2a2d35]">
              {/* Type de motorisation */}
              <div className="pt-4">
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Motorisation</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {VOLETS_ROULANTS.map((vr) => {
                    const isSelected = voletConfig.type === vr.id;
                    return (
                      <button
                        key={vr.id}
                        onClick={() => handleVoletUpdate({ type: vr.id })}
                        className={`p-3 rounded-lg border text-sm text-left transition-all
                          ${isSelected ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#353840] text-gray-400 hover:border-[#404550]'}`}
                      >
                        <p className="font-medium text-xs">{vr.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{vr.description}</p>
                        {vr.coefPrix !== 1 && <p className="text-[10px] text-gray-600 mt-1">&times;{vr.coefPrix}</p>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Type de pose */}
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Type de coffre</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {POSES_VOLET.map((pose) => {
                    const isSelected = voletConfig.pose === pose.id;
                    return (
                      <button
                        key={pose.id}
                        onClick={() => handleVoletUpdate({ pose: pose.id })}
                        className={`p-3 rounded-lg border text-sm text-left transition-all
                          ${isSelected ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#353840] text-gray-400 hover:border-[#404550]'}`}
                      >
                        <p className="font-medium text-xs">{pose.label}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">{pose.description}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Moustiquaire ─── */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl">
        <button
          onClick={() => setMoustiquaireActif(!moustiquaireActif)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252830] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Bug size={20} className={moustiquaireActif ? 'text-blue-400' : 'text-gray-500'} />
            <div className="text-left">
              <p className="text-sm font-medium text-white">Moustiquaire</p>
              <p className="text-xs text-gray-500">Protection anti-insectes enroulable ou fixe</p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${moustiquaireActif ? 'bg-blue-600 border-blue-500' : 'border-[#404550]'}`}>
            {moustiquaireActif && <Check size={12} className="text-white" />}
          </div>
        </button>
      </div>

      {/* ─── Store / BSO ─── */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl">
        <button
          onClick={() => setBsoActif(!bsoActif)}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252830] transition-colors"
        >
          <div className="flex items-center gap-3">
            <Sun size={20} className={bsoActif ? 'text-blue-400' : 'text-gray-500'} />
            <div className="text-left">
              <p className="text-sm font-medium text-white">Brise-soleil orientable (BSO)</p>
              <p className="text-xs text-gray-500">Protection solaire extérieure à lames orientables</p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${bsoActif ? 'bg-blue-600 border-blue-500' : 'border-[#404550]'}`}>
            {bsoActif && <Check size={12} className="text-white" />}
          </div>
        </button>
      </div>

      {/* ─── Croisillons ─── */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl overflow-hidden">
        <button
          onClick={() => {
            const newVal = !croisillonsActif;
            setCroisillonsActif(newVal);
            onUpdate({ croisillons: newVal, typeCroisillon: newVal ? 'integre' : undefined });
          }}
          className="w-full flex items-center justify-between p-4 hover:bg-[#252830] transition-colors"
        >
          <div className="flex items-center gap-3">
            <svg width={20} height={20} viewBox="0 0 20 20" className={croisillonsActif ? 'text-blue-400' : 'text-gray-500'}>
              <rect x="1" y="1" width="18" height="18" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <line x1="10" y1="1" x2="10" y2="19" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="10" x2="19" y2="10" stroke="currentColor" strokeWidth="1" />
            </svg>
            <div className="text-left">
              <p className="text-sm font-medium text-white">Croisillons</p>
              <p className="text-xs text-gray-500">Croisillons décoratifs intégrés, collés ou viennois</p>
            </div>
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
            ${croisillonsActif ? 'bg-blue-600 border-blue-500' : 'border-[#404550]'}`}>
            {croisillonsActif && <Check size={12} className="text-white" />}
          </div>
        </button>

        {croisillonsActif && (
          <div className="p-4 pt-0 border-t border-[#2a2d35]">
            <div className="pt-4 grid grid-cols-3 gap-2">
              {(['integre', 'colle', 'viennois'] as const).map((type) => {
                const isSelected = config.typeCroisillon === type;
                const labels = { integre: 'Intégré', colle: 'Collé', viennois: 'Viennois' };
                return (
                  <button
                    key={type}
                    onClick={() => onUpdate({ typeCroisillon: type })}
                    className={`p-3 rounded-lg border text-sm transition-all
                      ${isSelected ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#353840] text-gray-400 hover:border-[#404550]'}`}
                  >
                    {labels[type]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ─── Appui de fenêtre ─── */}
      {(config.typeProduit === 'fenetre') && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Appui de fenêtre</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { id: undefined, label: 'Aucun' },
              { id: 'pvc' as const, label: 'PVC' },
              { id: 'alu' as const, label: 'Aluminium' },
              { id: 'pierre' as const, label: 'Pierre' },
            ].map((opt) => {
              const isSelected = config.appuiFenetre === opt.id;
              return (
                <button
                  key={opt.label}
                  onClick={() => onUpdate({ appuiFenetre: opt.id })}
                  className={`p-3 rounded-lg border text-sm transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#2a2d35] bg-[#1c1e24] text-gray-400 hover:border-[#404550]'}`}
                >
                  {opt.label}
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
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
