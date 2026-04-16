import type { AffaireAper } from '../store/menuiserieStore';
import type { ConfigMenuiserie } from '../types';
import { calculerPrix } from '../engine/calcPrix';
import { TYPES_PRODUITS } from '../constants/produits';
import { MATERIAUX } from '../constants/materiaux';
import { Plus, ArrowLeft, Copy, Trash2, Edit3, FileText, Download, Settings, ChevronRight, GitBranch, BarChart3, FileSpreadsheet } from 'lucide-react';

interface ListeMenuiseriesProps {
  affaire: AffaireAper;
  onBack: () => void;
  onEditAffaire: () => void;
  onAddMenuiserie: () => void;
  onEditMenuiserie: (menuiserieId: string) => void;
  onDuplicateMenuiserie: (menuiserieId: string) => void;
  onDeleteMenuiserie: (menuiserieId: string) => void;
  onExportDevis: () => void;
  onExportCSV?: () => void;
  onVariantes?: () => void;
  onAnalyse?: () => void;
}

export function ListeMenuiseries({
  affaire, onBack, onEditAffaire,
  onAddMenuiserie, onEditMenuiserie, onDuplicateMenuiserie, onDeleteMenuiserie,
  onExportDevis, onExportCSV, onVariantes, onAnalyse,
}: ListeMenuiseriesProps) {
  const totalHT = affaire.menuiseries.reduce((acc, m) => acc + calculerPrix(m).totalHT, 0);
  const totalTTC = Math.round(totalHT * 1.2);

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm">
                <ArrowLeft size={16} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-white">{affaire.nom || 'Sans nom'}</h1>
                <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                  <span>{affaire.ref}</span>
                  <span>{affaire.client}</span>
                  <span>{affaire.menuiseries.length} menuiserie{affaire.menuiseries.length > 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onEditAffaire} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] rounded-lg transition-colors">
                <Settings size={14} /> Paramètres
              </button>
              {onVariantes && (
                <button onClick={onVariantes} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] rounded-lg transition-colors">
                  <GitBranch size={14} /> Variantes
                </button>
              )}
              {onAnalyse && (
                <button onClick={onAnalyse} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] rounded-lg transition-colors">
                  <BarChart3 size={14} /> Analyse
                </button>
              )}
              <button onClick={onExportDevis} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] rounded-lg transition-colors">
                <Download size={14} /> PDF
              </button>
              {onExportCSV && (
                <button onClick={onExportCSV} className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white border border-[#353840] rounded-lg transition-colors">
                  <FileSpreadsheet size={14} /> CSV
                </button>
              )}
              <button
                onClick={onAddMenuiserie}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
              >
                <Plus size={16} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
          {/* Liste des menuiseries */}
          <div className="space-y-3">
            {affaire.menuiseries.length === 0 ? (
              <div className="text-center py-16 bg-[#181a20] border border-[#2a2d35] rounded-xl">
                <FileText size={40} className="mx-auto text-gray-700 mb-3" />
                <p className="text-gray-500 mb-4">Aucune menuiserie dans cette affaire</p>
                <button
                  onClick={onAddMenuiserie}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
                >
                  <Plus size={16} /> Configurer une menuiserie
                </button>
              </div>
            ) : (
              affaire.menuiseries.map((menu, index) => (
                <MenuiserieCard
                  key={menu.id}
                  menu={menu}
                  index={index}
                  onEdit={() => onEditMenuiserie(menu.id)}
                  onDuplicate={() => onDuplicateMenuiserie(menu.id)}
                  onDelete={() => onDeleteMenuiserie(menu.id)}
                />
              ))
            )}
          </div>

          {/* Sidebar résumé */}
          <div className="space-y-4">
            {/* Résumé projet */}
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-5 sticky top-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-3">Résumé projet</h3>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Menuiseries</span>
                  <span className="text-white font-semibold">{affaire.menuiseries.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Quantité totale</span>
                  <span className="text-white font-semibold">{affaire.menuiseries.reduce((acc, m) => acc + (m.qte ?? 1), 0)}</span>
                </div>

                <div className="border-t border-[#2a2d35] pt-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total HT</span>
                    <span className="text-white font-bold">{totalHT.toLocaleString('fr-FR')} &euro;</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">TVA 20%</span>
                    <span className="text-gray-400">{Math.round(totalHT * 0.2).toLocaleString('fr-FR')} &euro;</span>
                  </div>
                  <div className="flex justify-between text-base mt-2 pt-2 border-t border-[#353840]">
                    <span className="text-gray-300 font-semibold">Total TTC</span>
                    <span className="text-blue-400 font-bold">{totalTTC.toLocaleString('fr-FR')} &euro;</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 space-y-2">
                <button onClick={onExportDevis} className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm">
                  <Download size={16} /> Générer le devis PDF
                </button>
              </div>
            </div>

            {/* Paramètres communs */}
            <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
              <h3 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Paramètres communs</h3>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Matériau</span>
                  <span className="text-gray-300">{affaire.parametresCommuns.materiau.toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pose</span>
                  <span className="text-gray-300">{affaire.parametresCommuns.typePose.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Vitrage</span>
                  <span className="text-gray-300">{affaire.parametresCommuns.vitrage.replace(/_/g, ' ')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Carte menuiserie ──────────────────────────────────────────────────

function MenuiserieCard({ menu, index, onEdit, onDuplicate, onDelete }: {
  menu: ConfigMenuiserie;
  index: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const prix = calculerPrix(menu);
  const produit = TYPES_PRODUITS.find((p) => p.id === menu.typeProduit);
  const materiau = MATERIAUX.find((m) => m.id === menu.materiau);

  return (
    <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4 hover:border-[#404550] transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {/* Index */}
          <div className="w-8 h-8 rounded-lg bg-[#252830] flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">
            {index + 1}
          </div>

          {/* Infos */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-white">{produit?.label ?? 'Menuiserie'}</h4>
              <span className="text-xs px-2 py-0.5 rounded bg-[#252830] text-gray-400 border border-[#353840]">
                {materiau?.label ?? '—'}
              </span>
              {(menu.qte ?? 1) > 1 && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  &times;{menu.qte}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
              <span>{menu.largeur}×{menu.hauteur} mm</span>
              <span>{menu.nbVantaux} vantail{menu.nbVantaux > 1 ? 'x' : ''}</span>
              <span>{menu.vitrage?.replace(/_/g, ' ') ?? '—'}</span>
            </div>
          </div>

          {/* Prix */}
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white">{prix.totalHT.toLocaleString('fr-FR')} &euro; HT</p>
            {(menu.qte ?? 1) > 1 && (
              <p className="text-xs text-gray-500">{prix.prixUnitaireHT.toLocaleString('fr-FR')} &euro;/u</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-3">
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 rounded-lg transition-colors" title="Modifier">
            <Edit3 size={14} />
          </button>
          <button onClick={onDuplicate} className="p-2 text-gray-400 hover:text-green-400 hover:bg-green-600/10 rounded-lg transition-colors" title="Dupliquer">
            <Copy size={14} />
          </button>
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-600/10 rounded-lg transition-colors" title="Supprimer">
            <Trash2 size={14} />
          </button>
          <button onClick={onEdit} className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors" title="Configurer">
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
