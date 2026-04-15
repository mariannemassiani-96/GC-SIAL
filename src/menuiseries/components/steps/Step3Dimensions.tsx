import type { ConfigMenuiserie, FormeId } from '../../types';
import { FORMES } from '../../constants/ouvertures';
import { DIMENSIONS_LIMITES } from '../../constants/prix';
import { getTypeProduit } from '../../constants/produits';
import { ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';

interface Step3Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

export function Step3Dimensions({ config, onUpdate, onNext, onPrev }: Step3Props) {
  const typeProduit = getTypeProduit(config.typeProduit ?? '');
  const formesDispo = typeProduit?.formesDisponibles ?? ['rectangulaire'];
  const formes = FORMES.filter((f) => formesDispo.includes(f.id));
  const formeSel = config.forme ?? 'rectangulaire';
  const formeDef = FORMES.find((f) => f.id === formeSel);

  const limites = DIMENSIONS_LIMITES[config.typeProduit ?? 'fenetre'];
  const largeur = config.largeur ?? 1000;
  const hauteur = config.hauteur ?? 1200;
  const nbVantaux = config.nbVantaux ?? 1;

  const alertes: string[] = [];
  if (largeur < limites.minL) alertes.push(`Largeur minimum : ${limites.minL}mm`);
  if (largeur > limites.maxL) alertes.push(`Largeur maximum : ${limites.maxL}mm`);
  if (hauteur < limites.minH) alertes.push(`Hauteur minimum : ${limites.minH}mm`);
  if (hauteur > limites.maxH) alertes.push(`Hauteur maximum : ${limites.maxH}mm`);

  const isValid = alertes.length === 0 && largeur > 0 && hauteur > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Forme & Dimensions</h2>
        <p className="text-sm text-gray-400">Définissez la forme, le nombre de vantaux et les dimensions exactes</p>
      </div>

      {/* Forme */}
      {formes.length > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Forme</h3>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {formes.map((forme) => {
              const isSelected = formeSel === forme.id;
              return (
                <button
                  key={forme.id}
                  onClick={() => onUpdate({
                    forme: forme.id as FormeId,
                    nbVantaux: Math.min(nbVantaux, forme.maxVantaux),
                    imposte: config.imposte && forme.supportsImposte ? true : false,
                    allege: config.allege && forme.supportsAllege ? true : false,
                  })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all
                    ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
                >
                  <FormeSVG forme={forme.id} selected={isSelected} />
                  <span className={`text-xs font-medium ${isSelected ? 'text-blue-400' : 'text-gray-400'}`}>
                    {forme.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Vantaux */}
      {formeDef && formeDef.maxVantaux > 1 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Nombre de vantaux</h3>
          <div className="flex gap-3">
            {Array.from({ length: formeDef.maxVantaux - formeDef.minVantaux + 1 }, (_, i) => formeDef.minVantaux + i).map((n) => (
              <button
                key={n}
                onClick={() => {
                  const vantaux = Array.from({ length: n }, (_, i) => ({
                    ouverture: config.vantaux?.[i]?.ouverture ?? 'oscillo_battant_droit' as const,
                    largeur: Math.round(largeur / n),
                  }));
                  onUpdate({ nbVantaux: n, vantaux });
                }}
                className={`w-14 h-14 rounded-lg border-2 font-bold text-lg transition-all
                  ${nbVantaux === n ? 'border-blue-500 bg-blue-600/10 text-blue-400' : 'border-[#2a2d35] bg-[#1c1e24] text-gray-400 hover:border-[#404550]'}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options imposte / allège */}
      <div className="flex gap-4">
        {formeDef?.supportsImposte && (
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.imposte ?? false}
              onChange={(e) => onUpdate({ imposte: e.target.checked })}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500"
            />
            Imposte (partie haute fixe)
          </label>
        )}
        {formeDef?.supportsAllege && (
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={config.allege ?? false}
              onChange={(e) => onUpdate({ allege: e.target.checked })}
              className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600 focus:ring-blue-500"
            />
            Allège (partie basse)
          </label>
        )}
      </div>

      {/* Dimensions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Dimensions (mm)</h3>
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Largeur totale ({limites.minL} – {limites.maxL} mm)
            </label>
            <input
              type="number"
              value={largeur}
              min={limites.minL}
              max={limites.maxL}
              step={10}
              onChange={(e) => onUpdate({ largeur: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Hauteur totale ({limites.minH} – {limites.maxH} mm)
            </label>
            <input
              type="number"
              value={hauteur}
              min={limites.minH}
              max={limites.maxH}
              step={10}
              onChange={(e) => onUpdate({ hauteur: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {config.imposte && (
          <div className="mt-3 max-w-xs">
            <label className="block text-xs text-gray-500 mb-1">Hauteur imposte (mm)</label>
            <input
              type="number"
              value={config.hauteurImposte ?? 300}
              min={150}
              max={600}
              step={10}
              onChange={(e) => onUpdate({ hauteurImposte: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {config.allege && (
          <div className="mt-3 max-w-xs">
            <label className="block text-xs text-gray-500 mb-1">Hauteur allège (mm)</label>
            <input
              type="number"
              value={config.hauteurAllege ?? 400}
              min={200}
              max={800}
              step={10}
              onChange={(e) => onUpdate({ hauteurAllege: Number(e.target.value) })}
              className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        )}

        {/* Surface calculée */}
        <div className="mt-3 text-sm text-gray-400">
          Surface : <span className="text-white font-medium">{((largeur / 1000) * (hauteur / 1000)).toFixed(2)} m²</span>
        </div>
      </div>

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="bg-amber-600/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle size={16} className="text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm text-amber-300">
            {alertes.map((a, i) => <p key={i}>{a}</p>)}
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
          disabled={!isValid}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Mini SVG pour les formes ──────────────────────────────────────────

function FormeSVG({ forme, selected }: { forme: string; selected: boolean }) {
  const stroke = selected ? '#60a5fa' : '#6b7280';
  const fill = selected ? 'rgba(96,165,250,0.1)' : 'rgba(255,255,255,0.03)';
  const w = 48, h = 48;

  switch (forme) {
    case 'rectangulaire':
      return <svg width={w} height={h}><rect x="8" y="8" width="32" height="32" rx="1" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'cintre':
      return <svg width={w} height={h}><path d="M8 40 V18 A16 16 0 0 1 40 18 V40 Z" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'arc_surbaisse':
      return <svg width={w} height={h}><path d="M8 40 V22 Q24 8 40 22 V40 Z" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'trapeze':
      return <svg width={w} height={h}><path d="M12 40 L4 8 H44 L36 40 Z" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'triangle':
      return <svg width={w} height={h}><path d="M24 6 L42 40 H6 Z" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'rond':
      return <svg width={w} height={h}><circle cx="24" cy="24" r="18" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    case 'oeil_de_boeuf':
      return <svg width={w} height={h}><ellipse cx="24" cy="24" rx="20" ry="14" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
    default:
      return <svg width={w} height={h}><rect x="8" y="8" width="32" height="32" fill={fill} stroke={stroke} strokeWidth="2" /></svg>;
  }
}
