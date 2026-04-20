import type { ConfigMenuiserie } from '../../types';
import type { TypePose } from '../../store/menuiserieStore';
import { ArrowRight, ArrowLeft, Check, Info } from 'lucide-react';
import { useState } from 'react';

interface Step9Props {
  config: Partial<ConfigMenuiserie>;
  typePose?: TypePose;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onPoseChange?: (pose: TypePose) => void;
  onNext: () => void;
  onPrev: () => void;
  hideNav?: boolean;
}

interface PoseOption {
  id: TypePose;
  label: string;
  description: string;
  details: string[];
}

const POSES: PoseOption[] = [
  {
    id: 'renovation_sur_dormant',
    label: 'Rénovation sur dormant',
    description: 'Pose sur le cadre existant, sans toucher au gros oeuvre',
    details: ['Travaux réduits', 'Pas de reprise maçonnerie', 'Délai court', 'TVA 10% (sous conditions)'],
  },
  {
    id: 'renovation_depose_totale',
    label: 'Rénovation dépose totale',
    description: 'Remplacement complet de l\'ancienne menuiserie et du dormant',
    details: ['Meilleure isolation', 'Plus de lumière', 'Reprise d\'enduit nécessaire', 'TVA 10% (sous conditions)'],
  },
  {
    id: 'neuf_tunnel',
    label: 'Pose en tunnel',
    description: 'Menuiserie posée dans l\'épaisseur du mur (tableau)',
    details: ['Construction neuve', 'Menuiserie en retrait', 'Bonne étanchéité', 'Standard ITE'],
  },
  {
    id: 'neuf_applique',
    label: 'Pose en applique',
    description: 'Menuiserie fixée côté intérieur avec pattes de fixation',
    details: ['Construction neuve', 'Compatible ITE', 'Finition intérieure propre', 'Très répandue'],
  },
  {
    id: 'neuf_feuillure',
    label: 'Pose en feuillure',
    description: 'Menuiserie encastrée dans la feuillure du mur',
    details: ['Rénovation / neuf', 'Aspect traditionnel', 'Cadre partiellement caché', 'Bonne isolation'],
  },
];

export function Step9Pose({ config: _config, typePose, onPoseChange, onNext, onPrev, hideNav }: Step9Props) {
  const [selectedPose, setSelectedPose] = useState<TypePose>(typePose ?? 'neuf_applique');

  // Options de pose
  const [tapees, setTapees] = useState(false);
  const [bavettes, setBavettes] = useState(false);
  const [etancheite, setEtancheite] = useState(false);

  const handlePoseSelect = (pose: TypePose) => {
    setSelectedPose(pose);
    onPoseChange?.(pose);
  };

  // Recommandations
  const isRenovation = selectedPose.startsWith('renovation');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Type de pose</h2>
        <p className="text-sm text-gray-400">Choisissez le mode de pose adapté à votre chantier</p>
      </div>

      {/* Types de pose */}
      <div className="space-y-3">
        {POSES.map((pose) => {
          const isSelected = selectedPose === pose.id;
          return (
            <button
              key={pose.id}
              onClick={() => handlePoseSelect(pose.id)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all
                ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className={`font-semibold text-sm ${isSelected ? 'text-blue-400' : 'text-white'}`}>{pose.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{pose.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pose.details.map((d, i) => (
                      <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-[#252830] text-gray-400 border border-[#353840]">
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ml-3 mt-1
                  ${isSelected ? 'bg-blue-600 border-blue-500' : 'border-[#404550]'}`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
              </div>
              {/* Schéma simplifié pose */}
              {isSelected && (
                <div className="mt-3 pt-3 border-t border-[#2a2d35]">
                  <PoseSVG type={pose.id} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Options complémentaires */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Options de pose</h3>
        <div className="space-y-2">
          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550]">
            <div>
              <p className="text-sm text-white">Tapées d'isolation</p>
              <p className="text-xs text-gray-500">Complément pour épaisseur d'isolation</p>
            </div>
            <input type="checkbox" checked={tapees} onChange={(e) => setTapees(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550]">
            <div>
              <p className="text-sm text-white">Bavette d'appui</p>
              <p className="text-xs text-gray-500">Profilé aluminium d'évacuation des eaux</p>
            </div>
            <input type="checkbox" checked={bavettes} onChange={(e) => setBavettes(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500" />
          </label>
          <label className="flex items-center justify-between p-3 bg-[#1c1e24] border border-[#2a2d35] rounded-lg cursor-pointer hover:border-[#404550]">
            <div>
              <p className="text-sm text-white">Kit d'étanchéité EPDM</p>
              <p className="text-xs text-gray-500">Étanchéité à l'air et à l'eau renforcée</p>
            </div>
            <input type="checkbox" checked={etancheite} onChange={(e) => setEtancheite(e.target.checked)}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500" />
          </label>
        </div>
      </div>

      {/* Info TVA */}
      {isRenovation && (
        <div className="bg-blue-600/10 border border-blue-500/30 rounded-lg p-3 flex items-start gap-2">
          <Info size={16} className="text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-300">
            En rénovation d'un logement de plus de 2 ans, les travaux peuvent bénéficier d'une TVA réduite à 10% (fourniture + pose).
          </p>
        </div>
      )}

      {/* Navigation */}
      {!hideNav && (
        <div className="flex justify-between pt-4">
          <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
            <ArrowLeft size={18} /> Retour
          </button>
          <button
            onClick={onNext}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Voir le récapitulatif <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Schéma SVG simplifié de la pose ──────────────────────────────────

function PoseSVG({ type }: { type: TypePose }) {
  const w = 260, h = 80;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto">
      {/* Mur */}
      <rect x="0" y="0" width="40" height={h} fill="#353840" />
      <rect x={w - 40} y="0" width="40" height={h} fill="#353840" />

      {/* Étiquettes */}
      <text x="20" y={h - 4} textAnchor="middle" className="text-[8px] fill-gray-500">Mur</text>
      <text x={w - 20} y={h - 4} textAnchor="middle" className="text-[8px] fill-gray-500">Mur</text>

      {type === 'neuf_tunnel' && (
        <>
          <rect x="40" y="10" width="8" height="55" fill="#60a5fa" rx="1" />
          <rect x={w - 48} y="10" width="8" height="55" fill="#60a5fa" rx="1" />
          <rect x="50" y="5" width={w - 100} height="65" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="1" rx="2" />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" className="text-[9px] fill-blue-400">Menuiserie dans le tableau</text>
        </>
      )}
      {type === 'neuf_applique' && (
        <>
          <rect x="40" y="5" width={w - 80} height="65" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="1" rx="2" />
          <rect x="36" y="15" width="4" height="45" fill="#f59e0b" rx="1" />
          <rect x={w - 40} y="15" width="4" height="45" fill="#f59e0b" rx="1" />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" className="text-[9px] fill-blue-400">Menuiserie en applique</text>
        </>
      )}
      {type === 'neuf_feuillure' && (
        <>
          <rect x="32" y="10" width="8" height="55" fill="#353840" />
          <rect x={w - 40} y="10" width="8" height="55" fill="#353840" />
          <rect x="42" y="5" width={w - 84} height="65" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="1" rx="2" />
          <text x={w / 2} y={h / 2 + 3} textAnchor="middle" className="text-[9px] fill-blue-400">Menuiserie en feuillure</text>
        </>
      )}
      {type === 'renovation_sur_dormant' && (
        <>
          <rect x="40" y="8" width="6" height="58" fill="#6b7280" rx="1" />
          <rect x={w - 46} y="8" width="6" height="58" fill="#6b7280" rx="1" />
          <rect x="48" y="5" width={w - 96} height="65" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="1" rx="2" />
          <text x={w / 2} y={h / 2 - 3} textAnchor="middle" className="text-[9px] fill-blue-400">Nouveau cadre</text>
          <text x={w / 2} y={h / 2 + 10} textAnchor="middle" className="text-[8px] fill-gray-500">sur ancien dormant</text>
        </>
      )}
      {type === 'renovation_depose_totale' && (
        <>
          <rect x="40" y="5" width={w - 80} height="65" fill="rgba(96,165,250,0.1)" stroke="#60a5fa" strokeWidth="1" rx="2" />
          <text x={w / 2} y={h / 2 - 3} textAnchor="middle" className="text-[9px] fill-blue-400">Nouveau cadre complet</text>
          <text x={w / 2} y={h / 2 + 10} textAnchor="middle" className="text-[8px] fill-gray-500">dépose totale</text>
        </>
      )}
    </svg>
  );
}
