import type { ResultatAffaire } from '../../types';
import { USINAGE_ANGLE } from '../../constants/parametres';

interface TabUsinagesProps {
  resultat: ResultatAffaire;
  angle: number;
}

export function TabUsinages({ resultat, angle }: TabUsinagesProps) {
  const usinageAngle = USINAGE_ANGLE[angle] ?? USINAGE_ANGLE[0];

  return (
    <div className="space-y-6">
      {resultat.travees.map((rt) => {
        const lisseLabels = ['INF', 'SUP', 'MED'];
        return (
          <div key={rt.travee.id}>
            <h3 className="text-sm font-semibold text-gray-300 mb-2">
              Travée {rt.travee.repere} — {rt.travee.etage}
            </h3>

            {rt.usinages.map((u, li) => (
              <div key={li} className="mb-4">
                <h4 className="text-xs font-medium text-blue-400 mb-1.5">
                  Lisse {lisseLabels[li]} (180010) — L = {rt.longueurLisse.toFixed(1)} mm
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="text-gray-500 border-b border-[#252830]">
                        <th className="text-left py-1 px-2">Type</th>
                        <th className="text-left py-1 px-2">Opération</th>
                        <th className="text-left py-1 px-2">Position(s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Goupilles d'extrémité */}
                      <tr className="border-b border-[#1e2028]">
                        <td className="py-1 px-2 text-gray-400">LISSE</td>
                        <td className="py-1 px-2 text-gray-300">Perçage Lisse (goupille ext.)</td>
                        <td className="py-1 px-2 text-gray-200">
                          X = 68.3mm ; X = {(rt.longueurLisse - 68.3).toFixed(1)}mm
                        </td>
                      </tr>
                      {/* Barreaux */}
                      <tr className="border-b border-[#1e2028]">
                        <td className="py-1 px-2 text-gray-400">LISSE</td>
                        <td className="py-1 px-2 text-gray-300">Perçage Lisse (barreaux)</td>
                        <td className="py-1 px-2 text-gray-200">
                          {u.percageLisse
                            .filter((p) => p !== 68.3 && Math.abs(p - (rt.longueurLisse - 68.3)) > 0.05)
                            .map((p) => `${p.toFixed(1)}`)
                            .join(', ')}
                          mm
                        </td>
                      </tr>
                      {/* Raidisseurs */}
                      <tr className="border-b border-[#1e2028]">
                        <td className="py-1 px-2 text-gray-400">LISSE</td>
                        <td className="py-1 px-2 text-amber-400">Perçage Lisse_Raidisseur</td>
                        <td className="py-1 px-2 text-gray-200">
                          {u.percageLisseRaidisseur.map((p) => `${p.toFixed(1)}`).join(', ')}mm
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Raidisseur info */}
            <div className="mt-3 p-3 bg-[#1e2028] rounded border border-[#252830]">
              <h4 className="text-xs font-medium text-amber-400 mb-2">
                RAIDISSEUR (180000) — info atelier — angle {angle}°
              </h4>
              <div className="text-xs text-gray-400 space-y-1">
                <p>Trou goupille lisse basse (110306) : X=15mm depuis bord, Y={usinageAngle.goupilleRaidY}mm du bas, Ø{usinageAngle.goupilleDiametre}mm</p>
                <p>Fraisage lisse : Ø{usinageAngle.fraisageDiametre}mm, longueur {usinageAngle.longueurFraisage}mm</p>
                <p>Contreperçage blocage raidisseur : Ø{usinageAngle.contrepercageDiametre}mm</p>
              </div>
            </div>
          </div>
        );
      })}

      {resultat.travees.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-6">Aucune travée à afficher.</p>
      )}
    </div>
  );
}
