import { useMemo } from 'react';
import { AlertTriangle, Users, Package, Route, Ruler } from 'lucide-react';
import type { Plan, ViolationContrainte } from './types';
import { surface, longueurFlux } from './geometry';
import { CATALOG } from './catalog';

interface StatsProps {
  plan: Plan;
  violations: ViolationContrainte[];
  onFocus: (id: string) => void;
}

export function Stats({ plan, violations, onFocus }: StatsProps) {
  const stats = useMemo(() => {
    const batSurface = plan.batiment.largeur * plan.batiment.hauteur;
    const siteSurface = plan.largeurSite * plan.hauteurSite;
    const occupe = plan.objets
      .filter((o) => ['machine', 'poste', 'stock', 'stock_tampon', 'bureau', 'armoire', 'equipement', 'convoyeur'].includes(o.type))
      .reduce((acc, o) => acc + surface(o), 0);

    const operateurs = new Map<string, string[]>();
    for (const o of plan.objets) {
      for (const op of o.operateurs) {
        if (!operateurs.has(op)) operateurs.set(op, []);
        operateurs.get(op)!.push(o.nom);
      }
    }

    const stocksTampon = plan.objets.filter((o) => o.type === 'stock_tampon');

    const flux = plan.flux.map((f) => ({
      f,
      dist: longueurFlux(plan, f) ?? 0,
    }));
    const distanceTotaleFlux = flux.reduce((acc, x) => acc + x.dist * (x.f.debit / 100), 0);
    const distanceUnitaireFlux = flux.reduce((acc, x) => acc + x.dist, 0);

    const countByType = new Map<string, number>();
    for (const o of plan.objets) {
      countByType.set(o.type, (countByType.get(o.type) ?? 0) + 1);
    }

    return {
      batSurface,
      siteSurface,
      occupe,
      occupePct: batSurface > 0 ? (occupe / batSurface) * 100 : 0,
      operateurs,
      stocksTampon,
      flux,
      distanceUnitaireFlux,
      distanceTotaleFlux,
      countByType,
    };
  }, [plan]);

  return (
    <div className="h-full bg-[#14161d] border-l border-[#252830] overflow-y-auto">
      <div className="p-3 border-b border-[#252830]">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Analyse</h2>
      </div>

      {/* Surfaces */}
      <Block icon={<Ruler size={13} />} title="Surfaces">
        <StatRow label="Site" value={`${(stats.siteSurface / 10000).toFixed(0)} m²`} />
        <StatRow label="Bâtiment" value={`${(stats.batSurface / 10000).toFixed(0)} m²`} />
        <StatRow label="Équipements" value={`${(stats.occupe / 10000).toFixed(1)} m²`} />
        <StatRow
          label="Remplissage bâtiment"
          value={`${stats.occupePct.toFixed(0)} %`}
          warning={stats.occupePct > 70}
        />
      </Block>

      {/* Violations */}
      {violations.length > 0 && (
        <Block icon={<AlertTriangle size={13} className="text-red-400" />} title={`${violations.length} violation(s)`}>
          {violations.map((v, i) => (
            <div key={i} className="text-[11px] text-red-300 bg-red-500/5 border-l-2 border-red-500/40 px-2 py-1 mb-1">
              {v.message}
            </div>
          ))}
        </Block>
      )}

      {/* Opérateurs */}
      <Block icon={<Users size={13} />} title={`Opérateurs (${stats.operateurs.size})`}>
        {stats.operateurs.size === 0 && (
          <p className="text-[11px] text-gray-600 italic">Aucun opérateur assigné.</p>
        )}
        {Array.from(stats.operateurs.entries()).map(([op, postes]) => (
          <div key={op} className="flex items-start justify-between gap-2 text-[11px] py-0.5">
            <span className="text-gray-300 font-medium">{op}</span>
            <span className="text-gray-500 text-right">{postes.join(', ')}</span>
          </div>
        ))}
      </Block>

      {/* Stocks tampon */}
      {stats.stocksTampon.length > 0 && (
        <Block icon={<Package size={13} />} title={`Stocks tampon (${stats.stocksTampon.length})`}>
          {stats.stocksTampon.map((s) => {
            const pct = s.capacite && s.stockActuel !== undefined
              ? Math.min(1, s.stockActuel / Math.max(1, s.capacite))
              : null;
            return (
              <button
                key={s.id}
                onClick={() => onFocus(s.id)}
                className="w-full text-left mb-1.5 hover:bg-[#181c25] rounded px-1.5 py-1"
              >
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <span className="text-gray-300 truncate">{s.nom}</span>
                  {pct !== null && (
                    <span className="text-gray-500 font-mono">{s.stockActuel}/{s.capacite}</span>
                  )}
                </div>
                {pct !== null && (
                  <div className="h-1 bg-[#252830] rounded overflow-hidden">
                    <div
                      className="h-full"
                      style={{
                        width: `${pct * 100}%`,
                        background: pct > 0.9 ? '#ef4444' : pct > 0.7 ? '#f59e0b' : '#22c55e',
                      }}
                    />
                  </div>
                )}
              </button>
            );
          })}
        </Block>
      )}

      {/* Flux */}
      {stats.flux.length > 0 && (
        <Block icon={<Route size={13} />} title={`Flux (${stats.flux.length})`}>
          <StatRow label="Distance unitaire totale" value={`${(stats.distanceUnitaireFlux / 100).toFixed(1)} m`} />
          <StatRow label="Distance × débit" value={`${(stats.distanceTotaleFlux / 100).toFixed(1)} m·(u/h)/100`} />
          <div className="mt-1.5 space-y-0.5">
            {stats.flux.map(({ f, dist }) => {
              const a = plan.objets.find((o) => o.id === f.from);
              const b = plan.objets.find((o) => o.id === f.to);
              return (
                <div key={f.id} className="text-[10px] text-gray-500 font-mono flex justify-between">
                  <span className="truncate">{a?.nom} → {b?.nom}</span>
                  <span>{(dist / 100).toFixed(1)}m</span>
                </div>
              );
            })}
          </div>
        </Block>
      )}

      {/* Inventaire */}
      <Block title="Inventaire" icon={null}>
        {Array.from(stats.countByType.entries()).map(([type, n]) => (
          <StatRow key={type} label={CATALOG[type as keyof typeof CATALOG]?.label ?? type} value={String(n)} />
        ))}
      </Block>
    </div>
  );
}

function Block({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-3 border-b border-[#1e2029]">
      <h3 className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
        {icon}{title}
      </h3>
      {children}
    </div>
  );
}

function StatRow({ label, value, warning }: { label: string; value: string; warning?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[11px] py-0.5">
      <span className="text-gray-500">{label}</span>
      <span className={`font-mono ${warning ? 'text-amber-400' : 'text-gray-200'}`}>{value}</span>
    </div>
  );
}
