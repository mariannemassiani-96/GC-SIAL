import type { ConfigMenuiserie, TypeOuvertureId, VantailConfig } from '../../types';
import { TYPES_OUVERTURES } from '../../constants/ouvertures';
import { getTypeProduit } from '../../constants/produits';
import { ArrowRight, ArrowLeft, Info } from 'lucide-react';

interface Step4Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step4Ouverture({ config, onUpdate, onNext, onPrev }: Step4Props) {
  const typeProduit = getTypeProduit(config.typeProduit ?? '');
  const ouverturesDispo = typeProduit?.ouverturesDisponibles ?? [];
  const forme = config.forme ?? 'rectangulaire';
  const nbVantaux = config.nbVantaux ?? 1;

  // Filtrer les ouvertures compatibles avec le produit ET la forme
  const ouvertures = TYPES_OUVERTURES.filter(
    (o) => ouverturesDispo.includes(o.id) && o.compatibleFormes.includes(forme as never),
  );

  const vantaux: VantailConfig[] = config.vantaux ?? [{ ouverture: 'oscillo_battant_droit', largeur: config.largeur ?? 1000 }];

  // Si pas de vitrage (volet, store, pergola, portail), skip
  if (ouvertures.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-bold text-white mb-1">Type d'ouverture</h2>
          <p className="text-sm text-gray-400">Ce type de produit n'a pas d'options d'ouverture configurables.</p>
        </div>
        <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4 flex items-center gap-3">
          <Info size={18} className="text-blue-400" />
          <p className="text-sm text-gray-400">L'ouverture est prédéfinie pour ce produit. Passez à l'étape suivante.</p>
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

  const handleVantailChange = (index: number, ouverture: TypeOuvertureId) => {
    const newVantaux = [...vantaux];
    while (newVantaux.length < nbVantaux) {
      newVantaux.push({ ouverture: 'oscillo_battant_droit', largeur: Math.round((config.largeur ?? 1000) / nbVantaux) });
    }
    newVantaux[index] = { ...newVantaux[index], ouverture };
    onUpdate({ vantaux: newVantaux.slice(0, nbVantaux) });
  };

  // Appliquer la même ouverture à tous les vantaux
  const handleApplyAll = (ouverture: TypeOuvertureId) => {
    const largeurVantail = Math.round((config.largeur ?? 1000) / nbVantaux);
    const newVantaux = Array.from({ length: nbVantaux }, () => ({ ouverture, largeur: largeurVantail }));
    onUpdate({ vantaux: newVantaux });
  };

  const isValid = vantaux.length >= nbVantaux;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Type d'ouverture</h2>
        <p className="text-sm text-gray-400">
          Configurez l'ouverture {nbVantaux > 1 ? 'de chaque vantail' : 'de votre menuiserie'}
        </p>
      </div>

      {/* Si un seul vantail, sélection simple */}
      {nbVantaux === 1 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ouvertures.map((ouv) => {
            const isSelected = vantaux[0]?.ouverture === ouv.id;
            return (
              <button
                key={ouv.id}
                onClick={() => handleApplyAll(ouv.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all
                  ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
              >
                <div className="flex items-start gap-3">
                  <OuvertureSVG type={ouv.id} selected={isSelected} />
                  <div>
                    <p className={`font-medium text-sm ${isSelected ? 'text-blue-400' : 'text-white'}`}>{ouv.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{ouv.description}</p>
                    {ouv.coefPrix !== 1.0 && (
                      <p className="text-xs text-gray-600 mt-1">Coef. prix : &times;{ouv.coefPrix.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Multi-vantaux */
        <div className="space-y-4">
          {Array.from({ length: nbVantaux }, (_, i) => (
            <div key={i} className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-300 mb-3">Vantail {i + 1} {i === 0 ? '(gauche)' : i === nbVantaux - 1 ? '(droit)' : '(central)'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ouvertures.map((ouv) => {
                  const isSelected = (vantaux[i]?.ouverture ?? '') === ouv.id;
                  return (
                    <button
                      key={ouv.id}
                      onClick={() => handleVantailChange(i, ouv.id)}
                      className={`flex items-center gap-2 p-3 rounded-lg border text-sm transition-all
                        ${isSelected ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#2a2d35] text-gray-400 hover:border-[#404550]'}`}
                    >
                      <OuvertureSVG type={ouv.id} selected={isSelected} size={24} />
                      <span className="truncate">{ouv.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Aperçu schématique */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Aperçu de l'ouverture</h4>
        <OuverturePreview vantaux={vantaux.slice(0, nbVantaux)} largeur={config.largeur ?? 1000} hauteur={config.hauteur ?? 1200} />
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
          <ArrowLeft size={18} /> Retour
        </button>
        <button
          onClick={onNext}
          disabled={!isValid}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Mini SVG icône ouverture ──────────────────────────────────────────

function OuvertureSVG({ type, selected, size = 36 }: { type: string; selected: boolean; size?: number }) {
  const stroke = selected ? '#60a5fa' : '#6b7280';
  const fill = selected ? 'rgba(96,165,250,0.08)' : 'rgba(255,255,255,0.02)';

  return (
    <svg width={size} height={size} viewBox="0 0 36 36">
      <rect x="2" y="2" width="32" height="32" rx="1" fill={fill} stroke={stroke} strokeWidth="1.5" />
      {type === 'fixe' && (
        <>
          <line x1="18" y1="2" x2="18" y2="34" stroke={stroke} strokeWidth="0.5" opacity="0.4" />
          <line x1="2" y1="18" x2="34" y2="18" stroke={stroke} strokeWidth="0.5" opacity="0.4" />
        </>
      )}
      {type.includes('battant_gauche') && (
        <path d="M4 4 L18 18 L4 32" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
      )}
      {type.includes('battant_droit') && (
        <path d="M32 4 L18 18 L32 32" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
      )}
      {type.includes('oscillo') && type.includes('gauche') && (
        <>
          <path d="M4 4 L18 18 L4 32" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
          <path d="M4 32 L18 24 L32 32" fill="none" stroke={stroke} strokeWidth="0.8" strokeDasharray="1 2" />
        </>
      )}
      {type.includes('oscillo') && type.includes('droit') && !type.includes('coulissant') && (
        <>
          <path d="M32 4 L18 18 L32 32" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
          <path d="M4 32 L18 24 L32 32" fill="none" stroke={stroke} strokeWidth="0.8" strokeDasharray="1 2" />
        </>
      )}
      {(type === 'coulissant' || type === 'soulevant_coulissant' || type === 'galandage') && (
        <>
          <line x1="18" y1="4" x2="18" y2="32" stroke={stroke} strokeWidth="1" />
          <path d="M24 16 L28 18 L24 20" fill={stroke} />
        </>
      )}
      {type === 'a_soufflet' && (
        <path d="M4 4 L18 14 L32 4" fill="none" stroke={stroke} strokeWidth="1" strokeDasharray="2 2" />
      )}
    </svg>
  );
}

// ── Aperçu multi-vantaux ──────────────────────────────────────────────

function OuverturePreview({ vantaux, largeur, hauteur }: { vantaux: VantailConfig[]; largeur: number; hauteur: number }) {
  const svgW = 300;
  const svgH = Math.round(svgW * (hauteur / largeur));
  const clampedH = Math.min(svgH, 200);
  const vantailW = svgW / vantaux.length;

  return (
    <svg width={svgW} height={clampedH} viewBox={`0 0 ${svgW} ${clampedH}`} className="mx-auto">
      {/* Cadre global */}
      <rect x="1" y="1" width={svgW - 2} height={clampedH - 2} rx="2" fill="rgba(96,165,250,0.03)" stroke="#404550" strokeWidth="2" />

      {vantaux.map((v, i) => {
        const x = i * vantailW;
        return (
          <g key={i}>
            {/* Séparation vantaux */}
            {i > 0 && <line x1={x} y1="4" x2={x} y2={clampedH - 4} stroke="#404550" strokeWidth="1.5" />}

            {/* Symbole ouverture */}
            {v.ouverture.includes('battant_gauche') && (
              <path d={`M${x + 4} ${4} L${x + vantailW / 2} ${clampedH / 2} L${x + 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
            )}
            {v.ouverture.includes('battant_droit') && !v.ouverture.includes('oscillo') && (
              <path d={`M${x + vantailW - 4} ${4} L${x + vantailW / 2} ${clampedH / 2} L${x + vantailW - 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
            )}
            {v.ouverture.includes('oscillo') && v.ouverture.includes('droit') && (
              <>
                <path d={`M${x + vantailW - 4} ${4} L${x + vantailW / 2} ${clampedH / 2} L${x + vantailW - 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
                <path d={`M${x + 4} ${clampedH - 4} L${x + vantailW / 2} ${clampedH * 0.65} L${x + vantailW - 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
              </>
            )}
            {v.ouverture.includes('oscillo') && v.ouverture.includes('gauche') && (
              <>
                <path d={`M${x + 4} ${4} L${x + vantailW / 2} ${clampedH / 2} L${x + 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="1" strokeDasharray="3 3" />
                <path d={`M${x + 4} ${clampedH - 4} L${x + vantailW / 2} ${clampedH * 0.65} L${x + vantailW - 4} ${clampedH - 4}`} fill="none" stroke="#60a5fa" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.5" />
              </>
            )}
            {v.ouverture === 'fixe' && (
              <>
                <line x1={x + 4} y1={4} x2={x + vantailW - 4} y2={clampedH - 4} stroke="#6b7280" strokeWidth="0.5" opacity="0.3" />
                <line x1={x + vantailW - 4} y1={4} x2={x + 4} y2={clampedH - 4} stroke="#6b7280" strokeWidth="0.5" opacity="0.3" />
              </>
            )}
            {(v.ouverture === 'coulissant' || v.ouverture === 'soulevant_coulissant' || v.ouverture === 'galandage') && (
              <path d={`M${x + vantailW * 0.6} ${clampedH / 2 - 6} L${x + vantailW * 0.75} ${clampedH / 2} L${x + vantailW * 0.6} ${clampedH / 2 + 6}`} fill="#60a5fa" />
            )}

            {/* Label */}
            <text x={x + vantailW / 2} y={clampedH - 10} textAnchor="middle" className="text-[9px] fill-gray-500">
              V{i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
