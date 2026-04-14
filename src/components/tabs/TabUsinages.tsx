import type { ResultatAffaire } from '../../types';
import { USINAGE_ANGLE } from '../../constants/parametres';
import { SchemaLisse } from '../SchemaLisse';

interface TabUsinagesProps {
  resultat: ResultatAffaire;
  angle: number;
}

export function TabUsinages({ resultat, angle }: TabUsinagesProps) {
  const usinageAngle = USINAGE_ANGLE[angle] ?? USINAGE_ANGLE[0];

  return (
    <div className="space-y-8">
      {resultat.travees.map((rt) => {
        const lisseLabels = ['INF', 'SUP', 'MED'];
        const raidSet = new Set(rt.posRaidisseurs.map((p) => Math.round(p * 10) / 10));
        const goupilleG = 68.3;
        const goupilleD = Math.round((rt.longueurLisse - 68.3) * 10) / 10;

        return (
          <div key={rt.travee.id} className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">
              Travée {rt.travee.repere} — {rt.travee.etage} — L={rt.travee.largeur}mm — {rt.nbRaid} raidisseurs — entraxe {rt.entraxeEff.toFixed(1)}mm
            </h3>

            {rt.usinages.map((u, li) => {
              // Classify each percageLisse position
              const goupillesExt = u.percageLisse.filter(
                (p) => Math.abs(p - goupilleG) < 0.05 || Math.abs(p - goupilleD) < 0.05
              );
              const posRaid = u.percageLisse.filter((p) => raidSet.has(Math.round(p * 10) / 10));
              const posBarreaux = u.percageLisse.filter(
                (p) =>
                  !raidSet.has(Math.round(p * 10) / 10) &&
                  Math.abs(p - goupilleG) > 0.05 &&
                  Math.abs(p - goupilleD) > 0.05
              );

              return (
                <div key={li} className="space-y-3">
                  <h4 className="text-xs font-medium text-blue-400">
                    Lisse {lisseLabels[li]} (180010) — L = {rt.longueurLisse.toFixed(1)} mm
                  </h4>

                  {/* SVG Schema */}
                  <SchemaLisse rt={rt} lisseIndex={li} lisseLabel={lisseLabels[li]} />

                  {/* Detail table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-gray-500 border-b border-[#252830]">
                          <th className="text-left py-1.5 px-2 w-32">Opération</th>
                          <th className="text-right py-1.5 px-2 w-12">Nb</th>
                          <th className="text-left py-1.5 px-2">Positions X (mm)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Goupilles extrémité */}
                        <tr className="border-b border-[#1e2028]">
                          <td className="py-1.5 px-2">
                            <span className="text-green-400">Perçage Lisse</span>
                            <span className="text-gray-500 ml-1">(goupilles ext.)</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-300">{goupillesExt.length}</td>
                          <td className="py-1.5 px-2 text-green-300">
                            {goupillesExt.map((p) => p.toFixed(1)).join(' ; ')}
                          </td>
                        </tr>

                        {/* Barreaux */}
                        <tr className="border-b border-[#1e2028]">
                          <td className="py-1.5 px-2">
                            <span className="text-blue-400">Perçage Lisse</span>
                            <span className="text-gray-500 ml-1">(barreaux)</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-300">{posBarreaux.length}</td>
                          <td className="py-1.5 px-2 text-blue-300 break-all leading-5">
                            {posBarreaux.map((p) => p.toFixed(1)).join(' ; ')}
                          </td>
                        </tr>

                        {/* Raidisseurs — Perçage Lisse (goupille raidisseur) */}
                        <tr className="border-b border-[#1e2028]">
                          <td className="py-1.5 px-2">
                            <span className="text-red-400">Perçage Lisse</span>
                            <span className="text-gray-500 ml-1">(raidisseurs)</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-300">{posRaid.length}</td>
                          <td className="py-1.5 px-2 text-red-300">
                            {posRaid.map((p) => p.toFixed(1)).join(' ; ')}
                          </td>
                        </tr>

                        {/* Raidisseurs — Perçage Lisse_Raidisseur (fraisage traversant) */}
                        <tr className="border-b border-[#1e2028] bg-[#1a1520]">
                          <td className="py-1.5 px-2">
                            <span className="text-amber-400 font-semibold">Perçage Lisse_Raidisseur</span>
                            <span className="text-gray-500 ml-1">(fraisage)</span>
                          </td>
                          <td className="py-1.5 px-2 text-right text-gray-300">{u.percageLisseRaidisseur.length}</td>
                          <td className="py-1.5 px-2 text-amber-300">
                            {u.percageLisseRaidisseur.map((p) => p.toFixed(1)).join(' ; ')}
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr className="text-gray-500">
                          <td className="py-1.5 px-2 font-semibold">Total perçages</td>
                          <td className="py-1.5 px-2 text-right font-semibold text-gray-300">
                            {u.percageLisse.length + u.percageLisseRaidisseur.length}
                          </td>
                          <td className="py-1.5 px-2 text-gray-500 text-[10px]">
                            ({u.percageLisse.length} Perçage Lisse + {u.percageLisseRaidisseur.length} Perçage Lisse_Raidisseur)
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}

            {/* Raidisseur workshop info */}
            <div className="p-3 bg-[#1e2028] rounded border border-[#353840]">
              <h4 className="text-xs font-semibold text-amber-400 mb-2">
                RAIDISSEUR (180000) — Usinages atelier — Angle {angle}°
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2 bg-[#14161d] rounded border border-[#252830]">
                  <div className="text-gray-500 mb-1">Goupille lisse basse (110306)</div>
                  <div className="text-gray-200 font-mono">
                    X = 15mm, Y = {usinageAngle.goupilleRaidY}mm, <span className="text-blue-400">Ø{usinageAngle.goupilleDiametre}mm</span>
                  </div>
                </div>
                <div className="p-2 bg-[#14161d] rounded border border-[#252830]">
                  <div className="text-gray-500 mb-1">Fraisage lisse</div>
                  <div className="text-gray-200 font-mono">
                    <span className="text-blue-400">Ø{usinageAngle.fraisageDiametre}mm</span>, L = {usinageAngle.longueurFraisage}mm
                  </div>
                </div>
                <div className="p-2 bg-[#14161d] rounded border border-[#252830]">
                  <div className="text-gray-500 mb-1">Contreperçage blocage</div>
                  <div className="text-gray-200 font-mono">
                    <span className="text-blue-400">Ø{usinageAngle.contrepercageDiametre}mm</span>
                  </div>
                </div>
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
