import type { ConfigMenuiserie, CouleurId } from '../../types';
import { COULEURS, getCouleursDisponibles } from '../../constants/couleurs';
import { getMateriauDef } from '../../constants/materiaux';
import { ArrowRight, ArrowLeft, Check, Palette } from 'lucide-react';
import { useState } from 'react';

interface Step6Props {
  config: Partial<ConfigMenuiserie>;
  onUpdate: (updates: Partial<ConfigMenuiserie>) => void;
  onNext: () => void;
  onPrev: () => void;
}

type FiltreCategorie = 'tous' | 'blanc' | 'gris' | 'noir' | 'bois' | 'couleur' | 'metallique';

export function Step6Couleurs({ config, onUpdate, onNext, onPrev }: Step6Props) {
  const [filtreCategorie, setFiltreCategorie] = useState<FiltreCategorie>('tous');
  const [coteActif, setCoteActif] = useState<'exterieur' | 'interieur'>('exterieur');

  const materiauDef = getMateriauDef(config.materiau ?? '');
  const couleursIds = materiauDef?.couleursDisponibles ?? [];
  const couleursDispo = getCouleursDisponibles(couleursIds);

  const couleursFiltrees = filtreCategorie === 'tous'
    ? couleursDispo
    : couleursDispo.filter((c) => c.categorie === filtreCategorie);

  const selectedExt = config.couleurExterieure;
  const selectedInt = config.couleurInterieure;
  const bicolore = config.bicolore ?? false;

  const couleurActuelle = coteActif === 'exterieur' ? selectedExt : selectedInt;

  const handleSelect = (id: CouleurId) => {
    if (coteActif === 'exterieur') {
      const updates: Partial<ConfigMenuiserie> = { couleurExterieure: id };
      if (!bicolore) updates.couleurInterieure = id;
      onUpdate(updates);
    } else {
      onUpdate({ couleurInterieure: id });
    }
  };

  const categories: { id: FiltreCategorie; label: string }[] = [
    { id: 'tous', label: 'Tous' },
    { id: 'blanc', label: 'Blancs' },
    { id: 'gris', label: 'Gris' },
    { id: 'noir', label: 'Noirs' },
    { id: 'bois', label: 'Bois' },
    { id: 'couleur', label: 'Couleurs' },
    { id: 'metallique', label: 'Métalliques' },
  ];

  // N'afficher que les catégories qui ont des couleurs
  const categoriesAvecCouleurs = categories.filter(
    (cat) => cat.id === 'tous' || couleursDispo.some((c) => c.categorie === cat.id),
  );

  const couleurExtDef = COULEURS.find((c) => c.id === selectedExt);
  const couleurIntDef = COULEURS.find((c) => c.id === selectedInt);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Couleurs & Finitions</h2>
        <p className="text-sm text-gray-400">Personnalisez l'apparence de votre menuiserie</p>
      </div>

      {/* Option bicolore */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div className="flex items-center gap-3">
            <Palette size={20} className="text-blue-400" />
            <div>
              <p className="text-sm font-medium text-white">Bicolore</p>
              <p className="text-xs text-gray-500">Couleur différente intérieur / extérieur</p>
            </div>
          </div>
          <div className="relative">
            <input
              type="checkbox"
              checked={bicolore}
              onChange={(e) => {
                const newBicolore = e.target.checked;
                onUpdate({
                  bicolore: newBicolore,
                  couleurInterieure: newBicolore ? (selectedInt ?? selectedExt ?? 'blanc_9016') : (selectedExt ?? 'blanc_9016'),
                });
                if (!newBicolore) setCoteActif('exterieur');
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-[#353840] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white" />
          </div>
        </label>
      </div>

      {/* Sélecteur côté (si bicolore) */}
      {bicolore && (
        <div className="flex gap-2">
          <button
            onClick={() => setCoteActif('exterieur')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
              ${coteActif === 'exterieur' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-[#1c1e24] text-gray-400 border border-[#2a2d35] hover:border-[#404550]'}`}
          >
            Extérieur
            {couleurExtDef && (
              <span className="inline-block w-3 h-3 rounded-full ml-2 border border-gray-600" style={{ backgroundColor: couleurExtDef.hex }} />
            )}
          </button>
          <button
            onClick={() => setCoteActif('interieur')}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
              ${coteActif === 'interieur' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-[#1c1e24] text-gray-400 border border-[#2a2d35] hover:border-[#404550]'}`}
          >
            Intérieur
            {couleurIntDef && (
              <span className="inline-block w-3 h-3 rounded-full ml-2 border border-gray-600" style={{ backgroundColor: couleurIntDef.hex }} />
            )}
          </button>
        </div>
      )}

      {/* Filtres catégorie */}
      <div className="flex flex-wrap gap-2">
        {categoriesAvecCouleurs.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setFiltreCategorie(cat.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${filtreCategorie === cat.id
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40'
                : 'bg-[#252830] text-gray-400 border border-[#353840] hover:border-[#404550]'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grille de couleurs */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {couleursFiltrees.map((couleur) => {
          const isSelected = couleurActuelle === couleur.id;
          return (
            <button
              key={couleur.id}
              onClick={() => handleSelect(couleur.id)}
              className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all hover:scale-[1.02]
                ${isSelected ? 'border-blue-500 bg-blue-600/10' : 'border-[#2a2d35] bg-[#1c1e24] hover:border-[#404550]'}`}
            >
              {isSelected && (
                <div className="absolute top-1.5 right-1.5">
                  <Check size={12} className="text-blue-400" />
                </div>
              )}
              {/* Pastille couleur */}
              <div
                className="w-12 h-12 rounded-lg border-2 shadow-inner"
                style={{
                  backgroundColor: couleur.hex,
                  borderColor: isSelected ? '#60a5fa' : '#353840',
                }}
              />
              <div className="text-center">
                <p className={`text-xs font-medium leading-tight ${isSelected ? 'text-blue-400' : 'text-gray-300'}`}>
                  {couleur.label}
                </p>
                {couleur.coefPrix !== 1.0 && (
                  <p className="text-[10px] text-gray-600 mt-0.5">+{Math.round((couleur.coefPrix - 1) * 100)}%</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Aperçu sélection */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Rendu couleur</h4>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] text-gray-500 mb-1">Extérieur</p>
            <div
              className="w-20 h-28 rounded-lg border-2 border-[#353840] shadow-lg"
              style={{ backgroundColor: couleurExtDef?.hex ?? '#F7F9F4' }}
            />
            <p className="text-xs text-gray-400 mt-1">{couleurExtDef?.label ?? '—'}</p>
          </div>
          {bicolore && (
            <div className="text-center">
              <p className="text-[10px] text-gray-500 mb-1">Intérieur</p>
              <div
                className="w-20 h-28 rounded-lg border-2 border-[#353840] shadow-lg"
                style={{ backgroundColor: couleurIntDef?.hex ?? '#F7F9F4' }}
              />
              <p className="text-xs text-gray-400 mt-1">{couleurIntDef?.label ?? '—'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
          <ArrowLeft size={18} /> Retour
        </button>
        <button
          onClick={onNext}
          disabled={!selectedExt}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Continuer <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
