import type { AffaireAper } from '../store/menuiserieStore';
import type { ConfigMenuiserie } from '../types';
import { calculerPrix } from '../engine/calcPrix';
import { TYPES_PRODUITS } from '../constants/produits';
import { MATERIAUX } from '../constants/materiaux';
import { ArrowLeft, AlertTriangle, TrendingUp, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useState } from 'react';

interface AnalyseInterneProps {
  affaire: AffaireAper;
  onBack: () => void;
}

/** Estimation du coût de revient (simulation — à adapter avec vos vraies données) */
function estimerCout(m: ConfigMenuiserie): number {
  const prix = calculerPrix(m);
  // Ratio coût/prix estimé selon le matériau
  const ratiosCout: Record<string, number> = {
    pvc: 0.42,
    bois: 0.48,
    aluminium: 0.45,
    bois_alu: 0.50,
    pvc_alu: 0.44,
  };
  const ratio = ratiosCout[m.materiau] ?? 0.45;
  return Math.round(prix.prixUnitaireHT * ratio * (m.qte ?? 1));
}

export function AnalyseInterne({ affaire, onBack }: AnalyseInterneProps) {
  const [visible, setVisible] = useState(true);

  // Calculs globaux
  const lignes = affaire.menuiseries.map((m, i) => {
    const prix = calculerPrix(m);
    const cout = estimerCout(m);
    const totalHT = prix.totalHT;
    const marge = totalHT - cout;
    const margePercent = totalHT > 0 ? (marge / totalHT) * 100 : 0;
    return { menu: m, index: i, prix, cout, totalHT, marge, margePercent };
  });

  const totalPrixPublic = lignes.reduce((acc, l) => acc + l.totalHT, 0);
  const totalCout = lignes.reduce((acc, l) => acc + l.cout, 0);
  const totalMarge = totalPrixPublic - totalCout;
  const margeGlobale = totalPrixPublic > 0 ? (totalMarge / totalPrixPublic) * 100 : 0;

  // Alertes marge faible
  const alertes = lignes.filter((l) => l.margePercent < 30);

  // Estimation chute matière (simplifiée)
  const estimationChute = affaire.menuiseries.reduce((acc, m) => {
    const surface = (m.largeur / 1000) * (m.hauteur / 1000);
    // Estimation : 8-15% de chute selon la forme
    const tauxChute = m.forme === 'rectangulaire' ? 0.08 : m.forme === 'triangle' || m.forme === 'trapeze' ? 0.15 : 0.12;
    return acc + surface * tauxChute * (m.qte ?? 1);
  }, 0);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 size={20} className="text-purple-400" />
                Analyse interne — {affaire.nom}
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">Données confidentielles — usage interne uniquement</p>
            </div>
          </div>
          <button
            onClick={() => setVisible(!visible)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 border border-[#353840] rounded-lg hover:text-white transition-colors"
          >
            {visible ? <EyeOff size={14} /> : <Eye size={14} />}
            {visible ? 'Masquer' : 'Afficher'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <p className="text-xs text-gray-500">Prix public HT</p>
            <p className="text-xl font-bold text-white">{visible ? `${totalPrixPublic.toLocaleString('fr-FR')} €` : '•••'}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <p className="text-xs text-gray-500">Coût estimé</p>
            <p className="text-xl font-bold text-amber-400">{visible ? `${totalCout.toLocaleString('fr-FR')} €` : '•••'}</p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <p className="text-xs text-gray-500">Marge brute</p>
            <p className={`text-xl font-bold ${totalMarge > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {visible ? `${totalMarge.toLocaleString('fr-FR')} €` : '•••'}
            </p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <p className="text-xs text-gray-500">Taux de marge</p>
            <p className={`text-xl font-bold ${margeGlobale >= 40 ? 'text-green-400' : margeGlobale >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
              {visible ? `${margeGlobale.toFixed(1)}%` : '•••'}
            </p>
          </div>
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
            <p className="text-xs text-gray-500">Est. chute matière</p>
            <p className="text-xl font-bold text-gray-300">{visible ? `${estimationChute.toFixed(2)} m²` : '•••'}</p>
          </div>
        </div>

        {/* Alertes marge faible */}
        {alertes.length > 0 && visible && (
          <div className="bg-red-600/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-red-300">Alerte marge faible ({alertes.length} menuiserie{alertes.length > 1 ? 's' : ''})</h3>
            </div>
            <div className="space-y-1">
              {alertes.map((a) => (
                <p key={a.menu.id} className="text-xs text-red-300">
                  #{a.index + 1} {TYPES_PRODUITS.find((p) => p.id === a.menu.typeProduit)?.label} — Marge : {a.margePercent.toFixed(1)}% ({a.marge.toLocaleString('fr-FR')} €)
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tableau détaillé */}
        <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
          <div className="px-5 py-4 bg-[#1c1e24] border-b border-[#2a2d35]">
            <h3 className="text-sm font-semibold text-white">Détail par menuiserie</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#2a2d35]">
                  <th className="text-left px-4 py-3 text-xs text-gray-500">#</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Type</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Matériau</th>
                  <th className="text-left px-4 py-3 text-xs text-gray-500">Dim.</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500">Qté</th>
                  <th className="text-right px-4 py-3 text-xs text-gray-500">Prix public</th>
                  {visible && <th className="text-right px-4 py-3 text-xs text-gray-500">Remise</th>}
                  {visible && <th className="text-right px-4 py-3 text-xs text-gray-500">Prix net</th>}
                  {visible && <th className="text-right px-4 py-3 text-xs text-gray-500">Coût est.</th>}
                  {visible && <th className="text-right px-4 py-3 text-xs text-gray-500">Marge</th>}
                  {visible && <th className="text-right px-4 py-3 text-xs text-gray-500">%</th>}
                </tr>
              </thead>
              <tbody>
                {lignes.map((l) => {
                  const remise = Math.round(l.totalHT * 0.05); // Simulation remise 5%
                  const prixNet = l.totalHT - remise;
                  const margeNette = prixNet - l.cout;
                  const margePct = prixNet > 0 ? (margeNette / prixNet) * 100 : 0;

                  return (
                    <tr key={l.menu.id} className="border-b border-[#2a2d35]/50 hover:bg-[#1c1e24] transition-colors">
                      <td className="px-4 py-2.5 text-gray-500">{l.index + 1}</td>
                      <td className="px-4 py-2.5 text-gray-300">{TYPES_PRODUITS.find((p) => p.id === l.menu.typeProduit)?.label}</td>
                      <td className="px-4 py-2.5 text-gray-400">{MATERIAUX.find((m) => m.id === l.menu.materiau)?.label}</td>
                      <td className="px-4 py-2.5 text-gray-400 text-xs">{l.menu.largeur}×{l.menu.hauteur}</td>
                      <td className="px-4 py-2.5 text-gray-300 text-right">{l.menu.qte ?? 1}</td>
                      <td className="px-4 py-2.5 text-white text-right font-medium">{l.totalHT.toLocaleString('fr-FR')} €</td>
                      {visible && <td className="px-4 py-2.5 text-amber-400 text-right">-{remise.toLocaleString('fr-FR')} €</td>}
                      {visible && <td className="px-4 py-2.5 text-white text-right font-medium">{prixNet.toLocaleString('fr-FR')} €</td>}
                      {visible && <td className="px-4 py-2.5 text-amber-300 text-right">{l.cout.toLocaleString('fr-FR')} €</td>}
                      {visible && (
                        <td className={`px-4 py-2.5 text-right font-semibold ${margeNette > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {margeNette.toLocaleString('fr-FR')} €
                        </td>
                      )}
                      {visible && (
                        <td className={`px-4 py-2.5 text-right font-bold ${margePct >= 40 ? 'text-green-400' : margePct >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                          {margePct.toFixed(1)}%
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {visible && (
                <tfoot>
                  <tr className="border-t-2 border-[#353840] bg-[#1c1e24]">
                    <td colSpan={5} className="px-4 py-3 text-sm font-bold text-white">TOTAL</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-white">{totalPrixPublic.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-400">-{Math.round(totalPrixPublic * 0.05).toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-white">{Math.round(totalPrixPublic * 0.95).toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-sm text-amber-300">{totalCout.toLocaleString('fr-FR')} €</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-green-400">{(Math.round(totalPrixPublic * 0.95) - totalCout).toLocaleString('fr-FR')} €</td>
                    <td className={`px-4 py-3 text-right text-sm font-bold ${margeGlobale >= 40 ? 'text-green-400' : margeGlobale >= 30 ? 'text-amber-400' : 'text-red-400'}`}>
                      {margeGlobale.toFixed(1)}%
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Barre de marge visuelle */}
        {visible && (
          <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              Répartition coût / marge
            </h3>
            <div className="space-y-3">
              {lignes.map((l) => (
                <div key={l.menu.id} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-6">#{l.index + 1}</span>
                  <span className="text-xs text-gray-400 w-32 truncate">
                    {TYPES_PRODUITS.find((p) => p.id === l.menu.typeProduit)?.label}
                  </span>
                  <div className="flex-1 h-5 bg-[#252830] rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-amber-600/60 flex items-center justify-center"
                      style={{ width: `${l.totalHT > 0 ? (l.cout / l.totalHT) * 100 : 0}%` }}
                    >
                      <span className="text-[9px] text-white font-medium">{l.totalHT > 0 ? Math.round((l.cout / l.totalHT) * 100) : 0}%</span>
                    </div>
                    <div
                      className="h-full bg-green-600/60 flex items-center justify-center"
                      style={{ width: `${l.totalHT > 0 ? (l.marge / l.totalHT) * 100 : 0}%` }}
                    >
                      <span className="text-[9px] text-white font-medium">{l.margePercent.toFixed(0)}%</span>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 w-20 text-right">{l.totalHT.toLocaleString('fr-FR')} €</span>
                </div>
              ))}
              <div className="flex items-center gap-4 mt-2 pt-2 border-t border-[#2a2d35] text-xs text-gray-500">
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-amber-600/60" /> Coût estimé</div>
                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-green-600/60" /> Marge</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
