import type { ResultatAffaire } from '../../types';
import { LG_BARRE_MM, ACCESSOIRES } from '../../constants/profils';
import { Badge } from '../ui/Badge';

interface TabDebitsProps {
  resultat: ResultatAffaire;
}

export function TabDebits({ resultat }: TabDebitsProps) {
  // Consolidate accessories across all travees
  const accessGlobal = new Map<string, { ref: string; label: string; totalQte: number }>();
  for (const rt of resultat.travees) {
    for (const item of rt.nomenclature) {
      if (item.type === 'accessoire') {
        const existing = accessGlobal.get(item.ref);
        if (existing) {
          existing.totalQte += item.qte * rt.travee.qte;
        } else {
          accessGlobal.set(item.ref, {
            ref: item.ref,
            label: item.label,
            totalQte: item.qte * rt.travee.qte,
          });
        }
      }
    }
  }
  const accessories = [...accessGlobal.values()].sort((a, b) => a.ref.localeCompare(b.ref));

  return (
    <div className="space-y-6">
      {/* Per-travee profile breakdown */}
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

          {/* Accessories per travee */}
          {rt.nomenclature.filter((n) => n.type === 'accessoire').length > 0 && (
            <div className="mt-2">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-gray-500 border-b border-[#252830]">
                    <th className="text-left py-1.5 px-2">Réf</th>
                    <th className="text-left py-1.5 px-2">Accessoire</th>
                    <th className="text-right py-1.5 px-2">Qté</th>
                    <th className="text-right py-1.5 px-2">Cond.</th>
                  </tr>
                </thead>
                <tbody>
                  {rt.nomenclature
                    .filter((n) => n.type === 'accessoire')
                    .map((n, i) => (
                      <tr key={i} className="border-b border-[#1e2028] hover:bg-[#1e2028]/30">
                        <td className="py-1 px-2 text-amber-400">{n.ref}</td>
                        <td className="py-1 px-2 text-gray-400">{n.label}</td>
                        <td className="py-1 px-2 text-right text-gray-300">{n.qte}</td>
                        <td className="py-1 px-2 text-right text-gray-500">{ACCESSOIRES[n.ref]?.cond ?? '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}

      {/* Consolidated bar optimization */}
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
                      <span className="ml-1"><Badge variant="attention">{'> 20%'}</Badge></span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Consolidated accessories */}
      {accessories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Récapitulatif accessoires</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="text-gray-500 border-b border-[#252830]">
                  <th className="text-left py-1.5 px-2">Réf</th>
                  <th className="text-left py-1.5 px-2">Désignation</th>
                  <th className="text-right py-1.5 px-2">Qté totale</th>
                  <th className="text-right py-1.5 px-2">Conditionnement</th>
                  <th className="text-right py-1.5 px-2">Nb colis</th>
                </tr>
              </thead>
              <tbody>
                {accessories.map((acc) => {
                  const cond = ACCESSOIRES[acc.ref]?.cond ?? 1;
                  return (
                    <tr key={acc.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                      <td className="py-1 px-2 text-amber-400">{acc.ref}</td>
                      <td className="py-1 px-2 text-gray-300">{acc.label}</td>
                      <td className="py-1 px-2 text-right text-gray-200">{acc.totalQte}</td>
                      <td className="py-1 px-2 text-right text-gray-400">{cond}</td>
                      <td className="py-1 px-2 text-right text-gray-200 font-semibold">{Math.ceil(acc.totalQte / cond)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
