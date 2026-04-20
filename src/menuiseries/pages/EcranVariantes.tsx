import { useState } from 'react';
import type { AffaireAper } from '../store/menuiserieStore';
import type { ConfigMenuiserie, VarianteId, Variante, MateriauId, TypeVitrageId } from '../types';
import { calculerPrix } from '../engine/calcPrix';
import { TYPES_PRODUITS } from '../constants/produits';
import { MATERIAUX } from '../constants/materiaux';
import { VITRAGES } from '../constants/vitrages';
import { ArrowLeft, Plus, Trash2, ArrowRightLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { v4 as uuid } from 'uuid';

interface VariantesProps {
  affaire: AffaireAper;
  onUpdate: (updates: Partial<AffaireAper>) => void;
  onBack: () => void;
}

type PerimetreVariante = 'affaire' | 'selection';
type ActionVariante = 'remplacer_materiau' | 'remplacer_vitrage' | 'ajouter_volet' | 'retirer_volet' | 'changer_securite';

export function EcranVariantes({ affaire, onUpdate, onBack }: VariantesProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [perimetre, setPerimetre] = useState<PerimetreVariante>('affaire');
  const [selectedMenuiseries, setSelectedMenuiseries] = useState<string[]>([]);
  const [action, setAction] = useState<ActionVariante>('remplacer_materiau');
  const [newMateriau, setNewMateriau] = useState<MateriauId>('aluminium');
  const [newVitrage, setNewVitrage] = useState<TypeVitrageId>('triple_standard');

  const variantes = affaire.variantes ?? [
    { id: 'A' as VarianteId, label: 'Variante A', menuiseries: affaire.menuiseries, totalHT: 0, totalTTC: 0 },
  ];
  const varianteActive = affaire.varianteActive ?? 'A';

  // Calculer les totaux pour chaque variante
  const variantesAvecPrix = variantes.map((v) => {
    const menus = v.id === 'A' ? affaire.menuiseries : v.menuiseries;
    const totalHT = menus.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0);
    return { ...v, menuiseries: menus, totalHT, totalTTC: Math.round(totalHT * 1.2) };
  });

  const varianteRef = variantesAvecPrix.find((v) => v.id === 'A');
  const refTotalHT = varianteRef?.totalHT ?? 0;

  // Créer une variante
  const handleCreateVariante = () => {
    const existingIds = variantes.map((v) => v.id);
    const nextId = (['B', 'C'] as VarianteId[]).find((id) => !existingIds.includes(id));
    if (!nextId) return;

    // Appliquer la transformation
    const sourceMenuiseries = perimetre === 'affaire'
      ? affaire.menuiseries
      : affaire.menuiseries.filter((m) => selectedMenuiseries.includes(m.id));

    const transformedMenuiseries = sourceMenuiseries.map((m) => {
      const copy: ConfigMenuiserie = { ...structuredClone(m), id: uuid() };
      switch (action) {
        case 'remplacer_materiau':
          copy.materiau = newMateriau;
          break;
        case 'remplacer_vitrage':
          copy.vitrage = newVitrage;
          break;
        case 'ajouter_volet':
          copy.voletRoulant = { type: 'electrique_somfy_ilmo', pose: 'neuf_coffre_tunnel', couleur: copy.couleurExterieure };
          break;
        case 'retirer_volet':
          copy.voletRoulant = undefined;
          break;
        case 'changer_securite':
          copy.securite = 'anti_effraction_rc2';
          break;
      }
      return copy;
    });

    // Si périmètre = sélection, on garde les non-sélectionnées telles quelles
    let finalMenuiseries: ConfigMenuiserie[];
    if (perimetre === 'selection') {
      const nonSelected = affaire.menuiseries.filter((m) => !selectedMenuiseries.includes(m.id)).map((m) => ({ ...structuredClone(m), id: uuid() }));
      finalMenuiseries = [...nonSelected, ...transformedMenuiseries];
    } else {
      finalMenuiseries = transformedMenuiseries;
    }

    const newVariante: Variante = {
      id: nextId,
      label: `Variante ${nextId}`,
      menuiseries: finalMenuiseries,
      totalHT: 0,
      totalTTC: 0,
    };

    const updatedVariantes = [...variantes, newVariante];
    onUpdate({ variantes: updatedVariantes });
    setShowCreate(false);
  };

  const handleDeleteVariante = (id: VarianteId) => {
    if (id === 'A') return; // Pas supprimer la variante de base
    onUpdate({
      variantes: variantes.filter((v) => v.id !== id),
      varianteActive: varianteActive === id ? 'A' : varianteActive,
    });
  };

  const handleActivate = (id: VarianteId) => {
    onUpdate({ varianteActive: id });
  };

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">Variantes — {affaire.nom}</h1>
              <p className="text-xs text-gray-500 mt-0.5">Comparez différentes configurations pour cette affaire</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Variante active */}
            <div className="flex items-center gap-1 bg-[#252830] rounded-lg p-1">
              {variantesAvecPrix.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleActivate(v.id)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-all
                    ${varianteActive === v.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white'
                    }`}
                >
                  {v.id}
                </button>
              ))}
            </div>
            {variantes.length < 3 && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              >
                <Plus size={14} /> Créer variante
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Comparaison côte à côte */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {variantesAvecPrix.map((v) => {
            const isActive = v.id === varianteActive;
            const diffHT = v.totalHT - refTotalHT;
            const diffPercent = refTotalHT > 0 ? ((diffHT / refTotalHT) * 100) : 0;

            return (
              <div
                key={v.id}
                className={`bg-[#181a20] border-2 rounded-xl overflow-hidden transition-all
                  ${isActive ? 'border-blue-500' : 'border-[#2a2d35]'}`}
              >
                {/* En-tête variante */}
                <div className={`px-5 py-4 ${isActive ? 'bg-blue-600/10' : 'bg-[#1c1e24]'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                        ${isActive ? 'bg-blue-600 text-white' : 'bg-[#353840] text-gray-400'}`}>
                        {v.id}
                      </span>
                      <div>
                        <h3 className={`font-semibold text-sm ${isActive ? 'text-blue-400' : 'text-white'}`}>{v.label}</h3>
                        <p className="text-xs text-gray-500">{v.menuiseries.length} menuiserie{v.menuiseries.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">Active</span>
                      )}
                      {v.id !== 'A' && (
                        <button onClick={() => handleDeleteVariante(v.id)} className="p-1 text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Prix */}
                <div className="px-5 py-4 border-t border-[#2a2d35]">
                  <p className="text-xs text-gray-500">Total HT</p>
                  <p className="text-2xl font-bold text-white">{v.totalHT.toLocaleString('fr-FR')} &euro;</p>
                  <p className="text-sm text-gray-400">{v.totalTTC.toLocaleString('fr-FR')} &euro; TTC</p>

                  {/* Différence vs variante A */}
                  {v.id !== 'A' && (
                    <div className={`mt-2 flex items-center gap-1 text-sm font-medium
                      ${diffHT > 0 ? 'text-red-400' : diffHT < 0 ? 'text-green-400' : 'text-gray-500'}`}>
                      {diffHT > 0 ? <TrendingUp size={14} /> : diffHT < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                      {diffHT > 0 ? '+' : ''}{diffHT.toLocaleString('fr-FR')} &euro;
                      <span className="text-xs text-gray-500 ml-1">({diffPercent > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)</span>
                    </div>
                  )}
                </div>

                {/* Liste menuiseries résumée */}
                <div className="px-5 py-3 border-t border-[#2a2d35] space-y-2 max-h-60 overflow-y-auto">
                  {v.menuiseries.map((m, idx) => {
                    const produit = TYPES_PRODUITS.find((p) => p.id === m.typeProduit);
                    const prix = calculerPrix(m);
                    return (
                      <div key={m.id} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-600">{idx + 1}.</span>
                          <span className="text-gray-300">{produit?.label ?? '—'}</span>
                          <span className="text-gray-600">{m.materiau?.toUpperCase()}</span>
                        </div>
                        <span className="text-gray-400">{prix.totalHT.toLocaleString('fr-FR')} &euro;</span>
                      </div>
                    );
                  })}
                </div>

                {/* Bouton activer */}
                {!isActive && (
                  <div className="px-5 py-3 border-t border-[#2a2d35]">
                    <button
                      onClick={() => handleActivate(v.id)}
                      className="w-full py-2 text-sm font-medium text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors"
                    >
                      Activer cette variante
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Placeholder ajout variante */}
          {variantes.length < 3 && (
            <button
              onClick={() => setShowCreate(true)}
              className="border-2 border-dashed border-[#353840] rounded-xl flex flex-col items-center justify-center gap-3 py-16 hover:border-[#505560] hover:bg-[#181a20]/50 transition-all"
            >
              <Plus size={24} className="text-gray-600" />
              <span className="text-sm text-gray-500">Ajouter une variante</span>
            </button>
          )}
        </div>

        {/* Tableau comparatif détaillé */}
        {variantesAvecPrix.length > 1 && (
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
            <div className="px-5 py-4 bg-[#1c1e24] border-b border-[#2a2d35]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft size={16} className="text-blue-400" />
                Comparaison détaillée
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2a2d35]">
                    <th className="text-left px-5 py-3 text-xs text-gray-500 uppercase">Critère</th>
                    {variantesAvecPrix.map((v) => (
                      <th key={v.id} className={`text-center px-5 py-3 text-xs uppercase ${v.id === varianteActive ? 'text-blue-400' : 'text-gray-500'}`}>
                        Variante {v.id}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#2a2d35]/50">
                    <td className="px-5 py-2.5 text-gray-400">Nb menuiseries</td>
                    {variantesAvecPrix.map((v) => <td key={v.id} className="text-center text-white">{v.menuiseries.length}</td>)}
                  </tr>
                  <tr className="border-b border-[#2a2d35]/50">
                    <td className="px-5 py-2.5 text-gray-400">Total HT</td>
                    {variantesAvecPrix.map((v) => <td key={v.id} className="text-center text-white font-semibold">{v.totalHT.toLocaleString('fr-FR')} &euro;</td>)}
                  </tr>
                  <tr className="border-b border-[#2a2d35]/50">
                    <td className="px-5 py-2.5 text-gray-400">Total TTC</td>
                    {variantesAvecPrix.map((v) => <td key={v.id} className="text-center text-white">{v.totalTTC.toLocaleString('fr-FR')} &euro;</td>)}
                  </tr>
                  <tr className="border-b border-[#2a2d35]/50">
                    <td className="px-5 py-2.5 text-gray-400">Écart vs A</td>
                    {variantesAvecPrix.map((v) => {
                      const diff = v.totalHT - refTotalHT;
                      return (
                        <td key={v.id} className={`text-center font-medium ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-gray-500'}`}>
                          {v.id === 'A' ? '—' : `${diff > 0 ? '+' : ''}${diff.toLocaleString('fr-FR')} €`}
                        </td>
                      );
                    })}
                  </tr>
                  <tr>
                    <td className="px-5 py-2.5 text-gray-400">Matériaux utilisés</td>
                    {variantesAvecPrix.map((v) => {
                      const mats = [...new Set(v.menuiseries.map((m) => m.materiau))];
                      return <td key={v.id} className="text-center text-gray-300 text-xs">{mats.map((m) => m.toUpperCase()).join(', ')}</td>;
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Modal création variante */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#2a2d35]">
              <h3 className="text-base font-bold text-white">Créer une variante</h3>
              <p className="text-xs text-gray-500 mt-0.5">Dupliquez et transformez des menuiseries</p>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Périmètre */}
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Périmètre</h4>
                <div className="flex gap-2">
                  {([{ id: 'affaire' as const, label: 'Toute l\'affaire' }, { id: 'selection' as const, label: 'Sélection' }]).map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setPerimetre(p.id)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all
                        ${perimetre === p.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-[#252830] text-gray-400 border border-[#353840]'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sélection menuiseries si périmètre = selection */}
              {perimetre === 'selection' && (
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {affaire.menuiseries.map((m, i) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#252830] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedMenuiseries.includes(m.id)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMenuiseries([...selectedMenuiseries, m.id]);
                          else setSelectedMenuiseries(selectedMenuiseries.filter((id) => id !== m.id));
                        }}
                        className="w-4 h-4 rounded border-[#353840] bg-[#252830] text-blue-600"
                      />
                      <span className="text-sm text-gray-300">{i + 1}. {TYPES_PRODUITS.find((p) => p.id === m.typeProduit)?.label} — {m.materiau?.toUpperCase()}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Action */}
              <div>
                <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Transformation</h4>
                <div className="space-y-2">
                  {([
                    { id: 'remplacer_materiau' as const, label: 'Remplacer le matériau' },
                    { id: 'remplacer_vitrage' as const, label: 'Remplacer le vitrage' },
                    { id: 'ajouter_volet' as const, label: 'Ajouter volet roulant' },
                    { id: 'retirer_volet' as const, label: 'Retirer volet roulant' },
                    { id: 'changer_securite' as const, label: 'Passer en sécurité RC2' },
                  ]).map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAction(a.id)}
                      className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all
                        ${action === a.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40' : 'bg-[#252830] text-gray-400 border border-[#353840] hover:border-[#404550]'}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paramètre selon l'action */}
              {action === 'remplacer_materiau' && (
                <div>
                  <h4 className="text-xs text-gray-500 mb-2">Nouveau matériau</h4>
                  <select
                    value={newMateriau}
                    onChange={(e) => setNewMateriau(e.target.value as MateriauId)}
                    className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                  >
                    {MATERIAUX.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              )}
              {action === 'remplacer_vitrage' && (
                <div>
                  <h4 className="text-xs text-gray-500 mb-2">Nouveau vitrage</h4>
                  <select
                    value={newVitrage}
                    onChange={(e) => setNewVitrage(e.target.value as TypeVitrageId)}
                    className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
                  >
                    {VITRAGES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-[#2a2d35] flex justify-end gap-3">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
                Annuler
              </button>
              <button
                onClick={handleCreateVariante}
                disabled={perimetre === 'selection' && selectedMenuiseries.length === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold px-5 py-2 rounded-lg transition-colors text-sm"
              >
                <Plus size={14} /> Créer la variante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
