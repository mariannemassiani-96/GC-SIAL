import type { Affaire } from '../types';
import { TYPES_GC, POSE_DATA } from '../constants/typesGC';
import { FIXATIONS } from '../constants/fixations';

interface SchemaCotesProps {
  affaire: Affaire;
}

function fixLabel(id: string): string {
  return FIXATIONS[id as keyof typeof FIXATIONS]?.label ?? id;
}

export function SchemaCotes({ affaire }: SchemaCotesProps) {
  const travees = affaire.travees;

  // Build plan view geometry
  const totalWidth = travees.reduce((s, t) => {
    const w = t.largeur + (t.largeur2 > 0 ? t.largeur2 : 0);
    return s + w;
  }, 0);

  const svgW = 800;
  const svgH = 220;
  const pad = 40;
  const planY = 60;
  const scale = totalWidth > 0 ? (svgW - 2 * pad) / Math.max(totalWidth, 1000) : 0.5;

  let curX = pad;
  const segments: { x: number; w: number; w2: number; t: typeof travees[0]; angle: boolean }[] = [];
  for (const t of travees) {
    const hasAngle = t.largeur2 > 0 && (t.coupeG === '45' || t.coupeD === '45');
    segments.push({ x: curX, w: t.largeur * scale, w2: t.largeur2 * scale, t, angle: hasAngle });
    curX += t.largeur * scale + (hasAngle ? 4 : 8);
  }

  return (
    <div className="space-y-4">
      <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-1">Schéma de prise de cotes</h3>
        <p className="text-[10px] text-gray-500 mb-4">Vue en plan — Intérieur en bas, Extérieur en haut</p>

        {travees.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">Ajoutez des travées dans l'onglet Configuration.</p>
        ) : (
          <div className="overflow-x-auto">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[600px]" style={{ maxHeight: 220 }}>
              <rect width={svgW} height={svgH} fill="#14161d" rx={4} />

              {/* Exterior / Interior labels */}
              <text x={pad - 10} y={planY - 20} fill="#6b7280" fontSize={8} fontFamily="monospace" textAnchor="end">EXT.</text>
              <text x={pad - 10} y={planY + 60} fill="#6b7280" fontSize={8} fontFamily="monospace" textAnchor="end">INT.</text>

              {segments.map(({ x, w, w2, t, angle }) => {
                const leftWall = t.fixG === 'mur_g' || t.fixG === 'mur_d';
                const rightWall = t.fixD === 'mur_d' || t.fixD === 'mur_g';

                return (
                  <g key={t.id}>
                    {/* Wall indicators */}
                    {leftWall && (
                      <rect x={x - 4} y={planY - 15} width={4} height={50} fill="#4b5563" rx={1} />
                    )}
                    {rightWall && !angle && (
                      <rect x={x + w} y={planY - 15} width={4} height={50} fill="#4b5563" rx={1} />
                    )}

                    {/* Main GC line (branch 1) */}
                    <line x1={x} y1={planY + 10} x2={x + w} y2={planY + 10} stroke="#3b82f6" strokeWidth={3} />

                    {/* Branch 2 if angle */}
                    {angle && t.coupeD === '45' && (
                      <line x1={x + w} y1={planY + 10} x2={x + w} y2={planY + 10 - w2} stroke="#3b82f6" strokeWidth={3} />
                    )}
                    {angle && t.coupeG === '45' && (
                      <line x1={x} y1={planY + 10} x2={x} y2={planY + 10 - w2} stroke="#3b82f6" strokeWidth={3} />
                    )}

                    {/* Dimension: width */}
                    <line x1={x} y1={planY + 30} x2={x + w} y2={planY + 30} stroke="#f59e0b" strokeWidth={0.5} />
                    <line x1={x} y1={planY + 25} x2={x} y2={planY + 35} stroke="#f59e0b" strokeWidth={0.5} />
                    <line x1={x + w} y1={planY + 25} x2={x + w} y2={planY + 35} stroke="#f59e0b" strokeWidth={0.5} />
                    <text x={x + w / 2} y={planY + 43} textAnchor="middle" fill="#f59e0b" fontSize={8} fontFamily="monospace">
                      {t.largeur}
                    </text>

                    {/* Dimension: width2 if angle */}
                    {angle && w2 > 0 && (
                      <>
                        {t.coupeD === '45' && (
                          <>
                            <line x1={x + w + 8} y1={planY + 10} x2={x + w + 8} y2={planY + 10 - w2} stroke="#f59e0b" strokeWidth={0.5} />
                            <text x={x + w + 14} y={planY + 10 - w2 / 2} fill="#f59e0b" fontSize={7} fontFamily="monospace" dominantBaseline="middle">
                              {t.largeur2}
                            </text>
                          </>
                        )}
                        {t.coupeG === '45' && (
                          <>
                            <line x1={x - 8} y1={planY + 10} x2={x - 8} y2={planY + 10 - w2} stroke="#f59e0b" strokeWidth={0.5} />
                            <text x={x - 14} y={planY + 10 - w2 / 2} fill="#f59e0b" fontSize={7} fontFamily="monospace" dominantBaseline="middle" textAnchor="end">
                              {t.largeur2}
                            </text>
                          </>
                        )}
                      </>
                    )}

                    {/* Repere label */}
                    <text x={x + w / 2} y={planY - 2} textAnchor="middle" fill="#60a5fa" fontSize={9} fontFamily="monospace" fontWeight="bold">
                      {t.repere}
                    </text>

                    {/* Fixation labels */}
                    <text x={x + 2} y={planY + 55} fill="#9ca3af" fontSize={5} fontFamily="monospace">
                      {fixLabel(t.fixG).slice(0, 12)}
                    </text>
                    <text x={x + w - 2} y={planY + 55} fill="#9ca3af" fontSize={5} fontFamily="monospace" textAnchor="end">
                      {fixLabel(t.fixD).slice(0, 12)}
                    </text>
                  </g>
                );
              })}

              {/* Hauteur élévation mini */}
              {travees.length > 0 && (
                <g>
                  <text x={svgW - pad + 10} y={planY - 10} fill="#6b7280" fontSize={7} fontFamily="monospace" textAnchor="end">
                    H = {travees[0].hauteur} mm
                  </text>
                  <text x={svgW - pad + 10} y={planY} fill="#6b7280" fontSize={6} fontFamily="monospace" textAnchor="end">
                    {POSE_DATA[travees[0].pose]?.label}
                  </text>
                </g>
              )}

              {/* Legend */}
              <line x1={pad} y1={svgH - 20} x2={pad + 20} y2={svgH - 20} stroke="#3b82f6" strokeWidth={3} />
              <text x={pad + 24} y={svgH - 17} fill="#9ca3af" fontSize={7} fontFamily="monospace">Garde-corps</text>
              <rect x={pad + 100} y={svgH - 24} width={10} height={8} fill="#4b5563" rx={1} />
              <text x={pad + 114} y={svgH - 17} fill="#9ca3af" fontSize={7} fontFamily="monospace">Mur</text>
              <line x1={pad + 160} y1={svgH - 20} x2={pad + 180} y2={svgH - 20} stroke="#f59e0b" strokeWidth={0.5} />
              <text x={pad + 184} y={svgH - 17} fill="#9ca3af" fontSize={7} fontFamily="monospace">Cotation</text>
            </svg>
          </div>
        )}
      </div>

      {/* Tableau de prise de cotes */}
      <div className="bg-[#181c25] rounded-lg border border-[#252830] p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Dimensions à relever sur chantier</h3>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-500 border-b border-[#252830]">
              <th className="text-left py-2 px-2">Repère</th>
              <th className="text-left py-2 px-2">Étage</th>
              <th className="text-left py-2 px-2">Type GC</th>
              <th className="text-left py-2 px-2">Pose</th>
              <th className="text-right py-2 px-2">Côté 1 (mm)</th>
              <th className="text-right py-2 px-2">Côté 2 (mm)</th>
              <th className="text-right py-2 px-2">Hauteur (mm)</th>
              <th className="text-right py-2 px-2">Cote réelle L</th>
              <th className="text-right py-2 px-2">Cote réelle H</th>
              <th className="text-center py-2 px-2">Fix G</th>
              <th className="text-center py-2 px-2">Fix D</th>
            </tr>
          </thead>
          <tbody>
            {travees.map((t) => {
              const hasAngle = t.largeur2 > 0 && (t.coupeG === '45' || t.coupeD === '45');
              return (
                <tr key={t.id} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                  <td className="py-2 px-2 font-mono font-semibold text-blue-400">{t.repere}</td>
                  <td className="py-2 px-2 text-gray-400">{t.etage}</td>
                  <td className="py-2 px-2 text-gray-300">{TYPES_GC[t.typeGC]?.label.split(' ').slice(0, 2).join(' ')}</td>
                  <td className="py-2 px-2 text-gray-400">{t.pose === 'dalle' ? 'Dalle' : 'Nez dalle'}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-200">{t.largeur}</td>
                  <td className="py-2 px-2 text-right font-mono text-amber-400">{hasAngle ? t.largeur2 : '—'}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-200">{t.hauteur}</td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      placeholder="—"
                      className="w-20 bg-[#14161d] border border-dashed border-[#353840] rounded px-1.5 py-0.5 text-xs text-green-400 font-mono text-right focus:outline-none focus:border-green-500"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      placeholder="—"
                      className="w-20 bg-[#14161d] border border-dashed border-[#353840] rounded px-1.5 py-0.5 text-xs text-green-400 font-mono text-right focus:outline-none focus:border-green-500"
                    />
                  </td>
                  <td className="py-2 px-2 text-center text-[10px] text-gray-500">{fixLabel(t.fixG).slice(0, 10)}</td>
                  <td className="py-2 px-2 text-center text-[10px] text-gray-500">{fixLabel(t.fixD).slice(0, 10)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {travees.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">Aucune travée configurée.</p>
        )}
      </div>
    </div>
  );
}
