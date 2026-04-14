import type { ResultatAffaire } from '../../types';
import { LG_BARRE_MM } from '../../constants/profils';
import { Badge } from '../ui/Badge';

interface TabDebitsProps {
  resultat: ResultatAffaire;
}

export function TabDebits({ resultat }: TabDebitsProps) {
  return (
    <div className="space-y-6">
      {/* Per-travee breakdown */}
      {resultat.travees.map((rt) => (
        <div key={rt.travee.id}>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Travée {rt.travee.repere} — {rt.travee.etage} — L={rt.travee.largeur}mm × {rt.travee.qte}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-[#252830]">
                  <th className="text-left py-1.5 px-2">Réf</th>
                  <th className="text-left py-1.5 px-2">Désignation</th>
                  <th className="text-right py-1.5 px-2">L pièce (mm)</th>
                  <th className="text-center py-1.5 px-2">Angle G</th>
                  <th className="text-center py-1.5 px-2">Angle D</th>
                  <th className="text-right py-1.5 px-2">Qté</th>
                  <th className="text-right py-1.5 px-2">Total ml</th>
                </tr>
              </thead>
              <tbody>
                {rt.nomenclature
                  .filter((n) => n.type === 'profil')
                  .map((n, i) => (
                    <tr key={i} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                      <td className="py-1 px-2 text-blue-400">{n.ref}</td>
                      <td className="py-1 px-2 text-gray-300">{n.label}</td>
                      <td className="py-1 px-2 text-right text-gray-200">{n.longueur.toFixed(1)}</td>
                      <td className="py-1 px-2 text-center text-gray-400">{rt.travee.coupeG}°</td>
                      <td className="py-1 px-2 text-center text-gray-400">{rt.travee.coupeD}°</td>
                      <td className="py-1 px-2 text-right text-gray-200">{n.qte}</td>
                      <td className="py-1 px-2 text-right text-gray-200">{(n.longueur * n.qte / 1000).toFixed(2)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {/* Consolidated summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Récapitulatif optimisation barres</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-1.5 px-2">Réf</th>
                <th className="text-left py-1.5 px-2">Désignation</th>
                <th className="text-right py-1.5 px-2">Nb pièces</th>
                <th className="text-right py-1.5 px-2">Nb barres {LG_BARRE_MM}</th>
                <th className="text-right py-1.5 px-2">Taux chute</th>
              </tr>
            </thead>
            <tbody>
              {resultat.optimBarres.map((opt) => (
                <tr key={opt.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                  <td className="py-1 px-2 text-blue-400">{opt.ref}</td>
                  <td className="py-1 px-2 text-gray-300">{opt.label}</td>
                  <td className="py-1 px-2 text-right text-gray-200">{opt.totalPieces}</td>
                  <td className="py-1 px-2 text-right text-gray-200">{opt.nbBarres}</td>
                  <td className="py-1 px-2 text-right">
                    <span className={opt.tauxChute > 0.2 ? 'text-amber-400' : 'text-green-400'}>
                      {(opt.tauxChute * 100).toFixed(1)}%
                    </span>
                    {opt.tauxChute > 0.2 && (
                      <Badge variant="attention">{'> 20%'}</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
