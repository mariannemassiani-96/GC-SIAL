import type { ConfigMenuiserie, CalculPrix, WizardStep } from '../../types';
import { TYPES_PRODUITS } from '../../constants/produits';
import { MATERIAUX, PROFILS } from '../../constants/materiaux';
import { VITRAGES } from '../../constants/vitrages';
import { COULEURS } from '../../constants/couleurs';
import { TYPES_OUVERTURES, POIGNEES, NIVEAUX_SECURITE, VOLETS_ROULANTS, POSES_VOLET } from '../../constants/ouvertures';
import { ArrowLeft, ShoppingCart, Edit3, CheckCircle2 } from 'lucide-react';

interface StepRecapProps {
  config: Partial<ConfigMenuiserie>;
  prix: CalculPrix;
  onGoTo: (step: WizardStep) => void;
  onPrev: () => void;
  onAddToCart: () => void;
}

export function StepRecap({ config, prix, onGoTo, onPrev, onAddToCart }: StepRecapProps) {
  const produit = TYPES_PRODUITS.find((p) => p.id === config.typeProduit);
  const materiau = MATERIAUX.find((m) => m.id === config.materiau);
  const profil = PROFILS.find((p) => p.id === config.profil);
  const vitrage = VITRAGES.find((v) => v.id === config.vitrage);
  const couleurExt = COULEURS.find((c) => c.id === config.couleurExterieure);
  const couleurInt = COULEURS.find((c) => c.id === config.couleurInterieure);
  const poignee = POIGNEES.find((p) => p.id === config.poignee);
  const securite = NIVEAUX_SECURITE.find((s) => s.id === config.securite);

  const sections: { label: string; step: WizardStep; items: { key: string; value: string }[] }[] = [
    {
      label: 'Produit',
      step: 1,
      items: [{ key: 'Type', value: produit?.label ?? '—' }],
    },
    {
      label: 'Matériau & Profilé',
      step: 2,
      items: [
        { key: 'Matériau', value: materiau?.label ?? '—' },
        { key: 'Profilé', value: profil?.label ?? '—' },
        { key: 'Uw', value: profil ? `${profil.uw} W/m²K` : '—' },
      ],
    },
    {
      label: 'Dimensions',
      step: 3,
      items: [
        { key: 'Largeur', value: `${config.largeur ?? 0} mm` },
        { key: 'Hauteur', value: `${config.hauteur ?? 0} mm` },
        { key: 'Surface', value: `${(((config.largeur ?? 0) / 1000) * ((config.hauteur ?? 0) / 1000)).toFixed(2)} m²` },
        { key: 'Vantaux', value: `${config.nbVantaux ?? 1}` },
        ...(config.imposte ? [{ key: 'Imposte', value: `${config.hauteurImposte ?? 300} mm` }] : []),
        ...(config.allege ? [{ key: 'Allège', value: `${config.hauteurAllege ?? 400} mm` }] : []),
      ],
    },
    {
      label: 'Ouverture',
      step: 4,
      items: (config.vantaux ?? []).map((v, i) => ({
        key: `Vantail ${i + 1}`,
        value: TYPES_OUVERTURES.find((o) => o.id === v.ouverture)?.label ?? '—',
      })),
    },
    {
      label: 'Vitrage',
      step: 5,
      items: [
        { key: 'Type', value: vitrage?.label ?? '—' },
        ...(vitrage ? [
          { key: 'Ug', value: `${vitrage.ug} W/m²K` },
          { key: 'Rw', value: `${vitrage.affaiblissement} dB` },
        ] : []),
      ],
    },
    {
      label: 'Couleurs',
      step: 6,
      items: [
        { key: 'Extérieur', value: couleurExt?.label ?? '—' },
        ...(config.bicolore ? [{ key: 'Intérieur', value: couleurInt?.label ?? '—' }] : []),
        ...(config.bicolore ? [{ key: 'Bicolore', value: 'Oui' }] : []),
      ],
    },
    {
      label: 'Quincaillerie',
      step: 7,
      items: [
        { key: 'Sécurité', value: securite?.label ?? '—' },
        { key: 'Poignée', value: poignee?.label ?? '—' },
      ],
    },
    {
      label: 'Accessoires',
      step: 8,
      items: [
        ...(config.voletRoulant ? [
          { key: 'Volet roulant', value: VOLETS_ROULANTS.find((v) => v.id === config.voletRoulant?.type)?.label ?? '—' },
          { key: 'Coffre', value: POSES_VOLET.find((p) => p.id === config.voletRoulant?.pose)?.label ?? '—' },
        ] : []),
        ...(config.croisillons ? [{ key: 'Croisillons', value: config.typeCroisillon ?? '—' }] : []),
        ...(config.appuiFenetre ? [{ key: 'Appui', value: config.appuiFenetre.toUpperCase() }] : []),
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-white mb-1">Récapitulatif de votre configuration</h2>
        <p className="text-sm text-gray-400">Vérifiez tous les détails avant d'ajouter au panier</p>
      </div>

      {/* Statut global */}
      <div className="bg-green-600/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
        <CheckCircle2 size={18} className="text-green-400" />
        <p className="text-sm text-green-300">Configuration complète et valide</p>
      </div>

      {/* Sections récapitulatives */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div key={section.label} className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-[#181a20]">
              <h3 className="text-sm font-semibold text-gray-300">{section.label}</h3>
              <button
                onClick={() => onGoTo(section.step)}
                className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Edit3 size={12} />
                Modifier
              </button>
            </div>
            <div className="px-4 py-3">
              {section.items.length === 0 ? (
                <p className="text-xs text-gray-600">Aucune option sélectionnée</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5">
                  {section.items.map((item) => (
                    <div key={item.key} className="flex justify-between text-xs">
                      <span className="text-gray-500">{item.key}</span>
                      <span className="text-gray-200 font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Quantité */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Quantité</h3>
        <div className="flex items-center gap-4">
          <input
            type="number"
            value={config.qte ?? 1}
            min={1}
            max={100}
            className="w-20 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-white text-center text-sm focus:border-blue-500 outline-none"
            readOnly
          />
          <span className="text-sm text-gray-400">
            {(config.qte ?? 1) > 1
              ? `${prix.prixUnitaireHT.toLocaleString('fr-FR')} € x ${config.qte} = ${prix.totalHT.toLocaleString('fr-FR')} € HT`
              : `${prix.prixUnitaireHT.toLocaleString('fr-FR')} € HT`}
          </span>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-[#1c1e24] border border-[#2a2d35] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Notes / Commentaires</h3>
        <textarea
          placeholder="Notes internes sur cette menuiserie..."
          className="w-full h-20 px-3 py-2 bg-[#252830] border border-[#353840] rounded-lg text-white text-sm resize-none focus:border-blue-500 outline-none placeholder-gray-600"
          value={config.notes ?? ''}
        />
      </div>

      {/* Prix final */}
      <div className="bg-gradient-to-r from-blue-600/10 to-blue-600/5 border border-blue-500/30 rounded-xl p-6">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-gray-500">Prix unitaire HT</p>
            <p className="text-xl font-bold text-white">{prix.prixUnitaireHT.toLocaleString('fr-FR')} &euro;</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">TVA 20%</p>
            <p className="text-xl font-bold text-gray-400">{prix.tva.toLocaleString('fr-FR')} &euro;</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total TTC</p>
            <p className="text-2xl font-bold text-blue-400">{prix.totalTTC.toLocaleString('fr-FR')} &euro;</p>
          </div>
        </div>

        {/* Détail lignes */}
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">Détail du calcul</summary>
          <div className="mt-2 space-y-1 border-t border-blue-500/20 pt-2">
            {prix.details.map((ligne, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-400">{ligne.label}</span>
                <span className="text-gray-300">{Math.round(ligne.prixTotal).toLocaleString('fr-FR')} &euro;</span>
              </div>
            ))}
          </div>
        </details>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button onClick={onPrev} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
          <ArrowLeft size={18} /> Retour
        </button>
        <button
          onClick={onAddToCart}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-bold px-8 py-3 rounded-lg transition-colors shadow-lg shadow-green-600/20"
        >
          <ShoppingCart size={18} />
          Ajouter à l'affaire
        </button>
      </div>
    </div>
  );
}
