import type { CalculPrix } from '../types';
import { ShoppingCart, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

interface PrixSidebarProps {
  prix: CalculPrix;
  typeProduit?: string;
  onAddToCart?: () => void;
}

export function PrixSidebar({ prix, typeProduit, onAddToCart }: PrixSidebarProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5 sticky top-4">
      {/* Prix principal */}
      <div className="text-center mb-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Prix unitaire HT</p>
        <p className="text-3xl font-bold text-white">
          {prix.prixUnitaireHT.toLocaleString('fr-FR')}<span className="text-lg text-gray-400 ml-1">&euro;</span>
        </p>
        {prix.qte > 1 && (
          <p className="text-sm text-gray-400 mt-1">
            &times; {prix.qte} = <span className="text-white font-semibold">{prix.totalHT.toLocaleString('fr-FR')} &euro; HT</span>
          </p>
        )}
      </div>

      {/* TTC */}
      <div className="bg-[#252830] rounded-lg p-3 mb-4 text-center">
        <p className="text-xs text-gray-500">TTC (TVA 20%)</p>
        <p className="text-xl font-bold text-blue-400">{prix.totalTTC.toLocaleString('fr-FR')} &euro;</p>
      </div>

      {/* Détail dépliable */}
      <button
        onClick={() => setShowDetail(!showDetail)}
        className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-300 mb-3 transition-colors"
      >
        <span>Détail du prix</span>
        {showDetail ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showDetail && (
        <div className="space-y-1.5 mb-4 border-t border-[#2a2d35] pt-3">
          {prix.details.map((ligne, i) => (
            <div key={i} className="flex justify-between text-xs">
              <span className="text-gray-400 truncate mr-2">{ligne.label}</span>
              <span className="text-gray-300 whitespace-nowrap">{ligne.prixTotal > 0 ? `+${Math.round(ligne.prixTotal).toLocaleString('fr-FR')} €` : '—'}</span>
            </div>
          ))}
          <div className="flex justify-between text-xs font-semibold border-t border-[#353840] pt-2 mt-2">
            <span className="text-gray-300">Total HT</span>
            <span className="text-white">{prix.totalHT.toLocaleString('fr-FR')} &euro;</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">TVA 20%</span>
            <span className="text-gray-300">{prix.tva.toLocaleString('fr-FR')} &euro;</span>
          </div>
          <div className="flex justify-between text-sm font-bold border-t border-[#353840] pt-2">
            <span className="text-gray-200">Total TTC</span>
            <span className="text-blue-400">{prix.totalTTC.toLocaleString('fr-FR')} &euro;</span>
          </div>
        </div>
      )}

      {/* Coefficients */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        {prix.coefMateriau !== 1 && (
          <div className="bg-[#252830] rounded px-2 py-1">
            <span className="text-gray-500">Matériau</span>
            <span className="text-gray-300 ml-1">&times;{prix.coefMateriau.toFixed(2)}</span>
          </div>
        )}
        {prix.coefVitrage !== 1 && (
          <div className="bg-[#252830] rounded px-2 py-1">
            <span className="text-gray-500">Vitrage</span>
            <span className="text-gray-300 ml-1">&times;{prix.coefVitrage.toFixed(2)}</span>
          </div>
        )}
        {prix.coefOuverture !== 1 && (
          <div className="bg-[#252830] rounded px-2 py-1">
            <span className="text-gray-500">Ouverture</span>
            <span className="text-gray-300 ml-1">&times;{prix.coefOuverture.toFixed(2)}</span>
          </div>
        )}
        {prix.coefCouleur !== 1 && (
          <div className="bg-[#252830] rounded px-2 py-1">
            <span className="text-gray-500">Couleur</span>
            <span className="text-gray-300 ml-1">&times;{prix.coefCouleur.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* CTA Ajouter au panier */}
      {onAddToCart && (
        <button
          onClick={onAddToCart}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          <ShoppingCart size={18} />
          Ajouter au panier
        </button>
      )}

      {/* Info produit */}
      {typeProduit && (
        <p className="text-xs text-gray-600 text-center mt-3">
          {typeProduit} sur mesure
        </p>
      )}
    </div>
  );
}
