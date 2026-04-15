import type { AffaireAper, ContexteChantier, ParametresCommuns, TypeBatiment, TypeTerrain, TypePose } from '../store/menuiserieStore';
import { MATERIAUX } from '../constants/materiaux';
import { VITRAGES } from '../constants/vitrages';
import { COULEURS } from '../constants/couleurs';
import { POIGNEES } from '../constants/ouvertures';
import { ArrowLeft, MapPin, Building2, Mountain, Waves, Save } from 'lucide-react';
import { useState } from 'react';

interface CreationAffaireProps {
  affaire: AffaireAper;
  onUpdate: (updates: Partial<AffaireAper>) => void;
  onBack: () => void;
  onContinue: () => void;
}

const TYPES_BATIMENT: { id: TypeBatiment; label: string }[] = [
  { id: 'maison', label: 'Maison individuelle' },
  { id: 'immeuble', label: 'Immeuble collectif' },
  { id: 'tertiaire', label: 'Bâtiment tertiaire' },
  { id: 'erp', label: 'ERP' },
  { id: 'industriel', label: 'Industriel' },
];

const TYPES_TERRAIN: { id: TypeTerrain; label: string; desc: string }[] = [
  { id: 'abrite', label: 'Abrité', desc: 'Zone urbaine protégée, vallée' },
  { id: 'normal', label: 'Normal', desc: 'Rase campagne, plaine' },
  { id: 'expose', label: 'Exposé', desc: 'Hauteur, littoral, col' },
];

const TYPES_POSE: { id: TypePose; label: string }[] = [
  { id: 'neuf_applique', label: 'Neuf — Applique' },
  { id: 'neuf_tunnel', label: 'Neuf — Tunnel' },
  { id: 'neuf_feuillure', label: 'Neuf — Feuillure' },
  { id: 'renovation_depose_totale', label: 'Rénovation — Dépose totale' },
  { id: 'renovation_sur_dormant', label: 'Rénovation — Sur dormant' },
];

export function CreationAffaire({ affaire, onUpdate, onBack, onContinue }: CreationAffaireProps) {
  const [applyAll, setApplyAll] = useState(true);

  const updateContexte = (updates: Partial<ContexteChantier>) => {
    onUpdate({ contexte: { ...affaire.contexte, ...updates } });
  };

  const updateParams = (updates: Partial<ParametresCommuns>) => {
    onUpdate({ parametresCommuns: { ...affaire.parametresCommuns, ...updates } });
  };

  const isValid = affaire.nom.trim().length > 0;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
            <ArrowLeft size={16} /> Retour
          </button>
          <h1 className="text-sm font-semibold text-white">
            {affaire.nom ? `Affaire : ${affaire.nom}` : 'Nouvelle affaire'}
          </h1>
          <span className="font-mono text-xs text-gray-500">{affaire.ref}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Bloc 1 — Infos projet */}
        <section className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Building2 size={18} className="text-blue-400" />
            Informations projet
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nom de l'affaire *</label>
              <input
                type="text"
                value={affaire.nom}
                onChange={(e) => onUpdate({ nom: e.target.value })}
                placeholder="Ex: Résidence Les Ormes — Lot menuiseries"
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Client</label>
              <input
                type="text"
                value={affaire.client}
                onChange={(e) => onUpdate({ client: e.target.value })}
                placeholder="Nom du client / maître d'ouvrage"
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none placeholder-gray-600"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Adresse du chantier</label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={affaire.adresse}
                  onChange={(e) => onUpdate({ adresse: e.target.value })}
                  placeholder="Adresse complète du chantier"
                  className="w-full pl-9 pr-4 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none placeholder-gray-600"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Bloc 2 — Contexte chantier */}
        <section className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Mountain size={18} className="text-green-400" />
            Contexte chantier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type de bâtiment</label>
              <select
                value={affaire.contexte.typeBatiment}
                onChange={(e) => updateContexte({ typeBatiment: e.target.value as TypeBatiment })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {TYPES_BATIMENT.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hauteur bâtiment (m)</label>
              <input
                type="number"
                value={affaire.contexte.hauteurBatiment}
                onChange={(e) => updateContexte({ hauteurBatiment: Number(e.target.value) })}
                min={0}
                max={200}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-2">Terrain</label>
              <div className="flex gap-2">
                {TYPES_TERRAIN.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => updateContexte({ terrain: t.id })}
                    className={`flex-1 p-3 rounded-lg border text-center transition-all
                      ${affaire.contexte.terrain === t.id
                        ? 'border-blue-500 bg-blue-600/10 text-blue-400'
                        : 'border-[#353840] text-gray-400 hover:border-[#404550]'
                      }`}
                  >
                    <p className="text-xs font-medium">{t.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{t.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-[#252830] border border-[#353840] rounded-lg w-full hover:border-[#404550] transition-colors">
                <Waves size={18} className={affaire.contexte.bordDeMer ? 'text-blue-400' : 'text-gray-500'} />
                <div className="flex-1">
                  <p className="text-sm text-white">Bord de mer</p>
                  <p className="text-xs text-gray-500">Moins de 3 km du littoral</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={affaire.contexte.bordDeMer}
                    onChange={(e) => updateContexte({ bordDeMer: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#353840] peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-checked:after:bg-white" />
                </div>
              </label>
            </div>
          </div>
        </section>

        {/* Bloc 3 — Paramètres communs */}
        <section className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-6">
          <h2 className="text-base font-bold text-white mb-1 flex items-center gap-2">
            <Save size={18} className="text-purple-400" />
            Paramètres communs par défaut
          </h2>
          <p className="text-xs text-gray-500 mb-4">Ces valeurs seront pré-remplies pour chaque nouvelle menuiserie</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Matériau */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Matériau par défaut</label>
              <select
                value={affaire.parametresCommuns.materiau}
                onChange={(e) => updateParams({ materiau: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {MATERIAUX.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>

            {/* Type de pose */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type de pose</label>
              <select
                value={affaire.parametresCommuns.typePose}
                onChange={(e) => updateParams({ typePose: e.target.value as TypePose })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {TYPES_POSE.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            {/* Coloris extérieur */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coloris extérieur</label>
              <select
                value={affaire.parametresCommuns.colorisExterieur}
                onChange={(e) => updateParams({ colorisExterieur: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {COULEURS.filter((c) => c.id !== 'ral_sur_mesure').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {/* Coloris intérieur */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Coloris intérieur</label>
              <select
                value={affaire.parametresCommuns.colorisInterieur}
                onChange={(e) => updateParams({ colorisInterieur: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {COULEURS.filter((c) => c.id !== 'ral_sur_mesure').map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>

            {/* Vitrage */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Vitrage</label>
              <select
                value={affaire.parametresCommuns.vitrage}
                onChange={(e) => updateParams({ vitrage: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {VITRAGES.map((v) => <option key={v.id} value={v.id}>{v.label}</option>)}
              </select>
            </div>

            {/* Quincaillerie */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Quincaillerie / Poignée</label>
              <select
                value={affaire.parametresCommuns.quincaillerie}
                onChange={(e) => updateParams({ quincaillerie: e.target.value })}
                className="w-full px-3 py-2.5 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm focus:border-blue-500 outline-none"
              >
                {POIGNEES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>

            {/* Toggles accessoires */}
            <label className="flex items-center gap-3 p-3 bg-[#252830] border border-[#353840] rounded-lg cursor-pointer hover:border-[#404550]">
              <input type="checkbox" checked={affaire.parametresCommuns.voletRoulant} onChange={(e) => updateParams({ voletRoulant: e.target.checked })}
                className="w-4 h-4 rounded border-[#353840] bg-[#1c1e24] text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-white">Volet roulant par défaut</span>
            </label>
            <label className="flex items-center gap-3 p-3 bg-[#252830] border border-[#353840] rounded-lg cursor-pointer hover:border-[#404550]">
              <input type="checkbox" checked={affaire.parametresCommuns.moustiquaire} onChange={(e) => updateParams({ moustiquaire: e.target.checked })}
                className="w-4 h-4 rounded border-[#353840] bg-[#1c1e24] text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-white">Moustiquaire par défaut</span>
            </label>
          </div>

          {/* Apply all */}
          <div className="mt-4 p-3 bg-blue-600/10 border border-blue-500/30 rounded-lg">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={applyAll}
                onChange={(e) => setApplyAll(e.target.checked)}
                className="w-4 h-4 rounded border-blue-500 bg-blue-600/20 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-blue-300 font-medium">Appliquer ces paramètres à toutes les menuiseries existantes</span>
            </label>
          </div>
        </section>

        {/* CTA */}
        <div className="flex justify-end">
          <button
            onClick={onContinue}
            disabled={!isValid}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            {affaire.menuiseries.length > 0 ? 'Continuer vers les menuiseries' : 'Créer l\'affaire'}
          </button>
        </div>
      </main>
    </div>
  );
}
