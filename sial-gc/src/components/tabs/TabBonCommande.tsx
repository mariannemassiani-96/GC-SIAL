import type { ResultatAffaire } from '../../types';
import { ACCESSOIRES } from '../../constants/profils';

interface TabBonCommandeProps {
  resultat: ResultatAffaire;
}

export function TabBonCommande({ resultat }: TabBonCommandeProps) {
  // Regroup nomenclature by ref
  const profilMap = new Map<string, { ref: string; label: string; longueur: number; totalQte: number }>();
  const accessMap = new Map<string, { ref: string; label: string; totalQte: number }>();

  for (const item of resultat.nomenclatureGlobale) {
    if (item.type === 'profil') {
      const key = `${item.ref}_${item.longueur}`;
      const existing = profilMap.get(key);
      if (existing) {
        existing.totalQte += item.qte;
      } else {
        profilMap.set(key, { ref: item.ref, label: item.label, longueur: item.longueur, totalQte: item.qte });
      }
    } else {
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
      {/* Profilés */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Profilés</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-1.5 px-2">Réf</th>
                <th className="text-left py-1.5 px-2">Désignation</th>
                <th className="text-right py-1.5 px-2">L pièce (mm)</th>
                <th className="text-right py-1.5 px-2">Nb pièces</th>
                <th className="text-right py-1.5 px-2">Nb barres 6400</th>
                <th className="text-right py-1.5 px-2">Chute (mm)</th>
                <th className="text-right py-1.5 px-2">Taux chute</th>
              </tr>
            </thead>
            <tbody>
              {resultat.optimBarres.map((opt) => (
                <tr key={opt.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                  <td className="py-1 px-2 text-blue-400">{opt.ref}</td>
                  <td className="py-1 px-2 text-gray-300">{opt.label}</td>
                  <td className="py-1 px-2 text-right text-gray-200">—</td>
                  <td className="py-1 px-2 text-right text-gray-200">{opt.totalPieces}</td>
                  <td className="py-1 px-2 text-right text-gray-200 font-semibold">{opt.nbBarres}</td>
                  <td className="py-1 px-2 text-right text-gray-400">
                    {opt.barres.reduce((s, b) => s + b.chute, 0).toFixed(0)}
                  </td>
                  <td className="py-1 px-2 text-right">
                    <span className={opt.tauxChute > 0.2 ? 'text-amber-400' : 'text-green-400'}>
                      {(opt.tauxChute * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Accessoires */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Accessoires</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-1.5 px-2">Réf</th>
                <th className="text-left py-1.5 px-2">Désignation</th>
                <th className="text-right py-1.5 px-2">Qté unitaire</th>
                <th className="text-right py-1.5 px-2">Conditionnement</th>
                <th className="text-right py-1.5 px-2">Nb colis</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((acc) => {
                const cond = ACCESSOIRES[acc.ref]?.cond ?? 1;
                const nbColis = Math.ceil(acc.totalQte / cond);
                return (
                  <tr key={acc.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                    <td className="py-1 px-2 text-blue-400">{acc.ref}</td>
                    <td className="py-1 px-2 text-gray-300">{acc.label}</td>
                    <td className="py-1 px-2 text-right text-gray-200">{acc.totalQte}</td>
                    <td className="py-1 px-2 text-right text-gray-400">{cond}</td>
                    <td className="py-1 px-2 text-right text-gray-200 font-semibold">{nbColis}</td>
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
