import type { ResultatAffaire } from '../../types';
import { ACCESSOIRES, LG_BARRE_MM } from '../../constants/profils';

interface TabBonCommandeProps {
  resultat: ResultatAffaire;
}

export function TabBonCommande({ resultat }: TabBonCommandeProps) {
  const accessMap = new Map<string, { ref: string; label: string; totalQte: number }>();
  for (const item of resultat.nomenclatureGlobale) {
    if (item.type === 'accessoire') {
      const existing = accessMap.get(item.ref);
      if (existing) {
        existing.totalQte += item.qte;
      } else {
        accessMap.set(item.ref, { ref: item.ref, label: item.label, totalQte: item.qte });
      }
    }
  }
  const accessories = [...accessMap.values()].sort((a, b) => a.ref.localeCompare(b.ref));

  return (
    <div className="space-y-6">
      <h2 className="text-sm font-bold text-gray-200">Bon de commande Kawneer</h2>

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Profilés à commander</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-1.5 px-2">Réf</th>
                <th className="text-left py-1.5 px-2">Désignation</th>
                <th className="text-right py-1.5 px-2">Nb barres {(LG_BARRE_MM / 1000).toFixed(1)}m</th>
                <th className="text-right py-1.5 px-2">Total ml</th>
              </tr>
            </thead>
            <tbody>
              {resultat.optimBarres.map((opt) => (
                <tr key={opt.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                  <td className="py-1.5 px-2 text-blue-400">{opt.ref}</td>
                  <td className="py-1.5 px-2 text-gray-300">{opt.label}</td>
                  <td className="py-1.5 px-2 text-right text-white font-semibold">{opt.nbBarres}</td>
                  <td className="py-1.5 px-2 text-right text-gray-400">{((opt.nbBarres * LG_BARRE_MM) / 1000).toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Accessoires à commander</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-1.5 px-2">Réf</th>
                <th className="text-left py-1.5 px-2">Désignation</th>
                <th className="text-right py-1.5 px-2">Qté nécessaire</th>
                <th className="text-right py-1.5 px-2">Cond.</th>
                <th className="text-right py-1.5 px-2">Nb colis</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((acc) => {
                const cond = ACCESSOIRES[acc.ref]?.cond ?? 1;
                const nbColis = Math.ceil(acc.totalQte / cond);
                return (
                  <tr key={acc.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                    <td className="py-1.5 px-2 text-blue-400">{acc.ref}</td>
                    <td className="py-1.5 px-2 text-gray-300">{acc.label}</td>
                    <td className="py-1.5 px-2 text-right text-gray-200">{acc.totalQte}</td>
                    <td className="py-1.5 px-2 text-right text-gray-500">{cond}</td>
                    <td className="py-1.5 px-2 text-right text-white font-semibold">{nbColis}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
