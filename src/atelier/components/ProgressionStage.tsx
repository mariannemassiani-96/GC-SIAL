import { useState, useCallback } from 'react';
import { Check } from 'lucide-react';
import { useApiState } from '../../useApiState';

const STORAGE_KEY = 'sial-progression-s1s8';

interface SemaineTache {
  label: string;
  taches: string[];
  livrable: string;
}

const PROGRAMME: SemaineTache[] = [
  { label: 'S1 — Demarrage', livrable: 'Fichier Excel consolide + Dotation postes V1', taches: [
    'Exporter liste articles depuis PRO F2',
    'Inventaire physique complet du magasin',
    'Croiser export F2 et inventaire physique',
    'Construire fichier Excel de collecte 11 colonnes',
    'Lister accessoires par poste → Dotation V1',
    'Validation fichier par Marianne',
  ]},
  { label: 'S2 — Structuration', livrable: 'Excel V2 + Emplacements Odoo + Dotations V2', taches: [
    'Completer fichier Excel (famille, sous-famille, emplacement)',
    'Definir zones A-E magasin + Zone P postes',
    'Creer structure emplacements dans Odoo',
    'Creer emplacements postes (P/POSTE/N)',
    'Finaliser dotations par poste avec Ange-Joseph → V2',
    'Validation complete Marianne avant import',
  ]},
  { label: 'S3 — 5S Trier & Ranger', livrable: 'Plan magasin + Bacs postes + Excel V3', taches: [
    '1S : eliminer obsolete, inidentifiable, doublons',
    '1S : quarantaine rouge (etiquette rouge)',
    '2S : ranger chaque article dans sa zone',
    'Attribuer code emplacement MAG/X/XX/X',
    'Mettre a jour colonne EMPLACEMENT → Excel V3',
    'Installer bacs de dotation zones P',
    'Point avec Ange-Joseph validation rangement',
  ]},
  { label: 'S4 — 5S Nettoyer & Standardiser', livrable: 'Magasin 4S + Postes etiquetes + Fiche regles + Excel V4', taches: [
    '3S : nettoyage complet etageres, bacs, zones, postes',
    '4S : niveaux min/max visuels sur les bacs',
    '4S : etiquetage bacs dotation aux postes',
    'Rediger fiche regles magasin (1 page A4 plastifiee)',
    'Remplir colonne QTE_MIN_REAPPRO → Excel V4',
    'Photos avant/apres chaque zone',
  ]},
  { label: 'S5 — Integration Odoo', livrable: '100% articles importes + Orderpoints + Dotations Odoo', taches: [
    'Preparer fichier CSV import template Odoo',
    'Import par lot, famille par famille',
    'Relier chaque article a son fournisseur (Achats Odoo)',
    'Saisir regles reassort Kanban (orderpoints)',
    'Saisir dotations postes dans Odoo (emplacement P)',
    'Controle : 100% lignes Excel = article Odoo',
  ]},
  { label: 'S6 — Etiquetage & Tests', livrable: 'Magasin 100% etiquete + Stock initial Odoo + Scan valide', taches: [
    'Configurer format etiquette Odoo (nom/ref/emplacement/Code128)',
    'Imprimer et poser etiquettes sur chaque bac',
    'Creer etiquettes emplacement (plaquettes etageres)',
    'Saisir inventaire initial dans Odoo (Ajustements)',
    'Tester scan chaque etiquette avec douchette',
    'Reimprimer et corriger etiquettes illisibles',
  ]},
  { label: 'S7 — Prelevement scannable', livrable: 'Prelevement scannable + 2 procedures', taches: [
    'Configurer Odoo validation par scan',
    'Creer type operation prelevement magasin',
    '3 tests complets prelevement conditions reelles',
    'Tester reception livraison fournisseur avec scan',
    'Rediger procedure prelevement (1 page plastifiee)',
    'Rediger procedure reception fournisseur (1 page)',
  ]},
  { label: 'S8 — Formation & Bilan', livrable: 'Formations + Audit 5S + Rapport stage + Demo', taches: [
    'Former Ange-Joseph et magasinier au scan',
    'Former a consultation stock et alertes Odoo',
    'Rediger procedure audit 5S mensuel (grille plastifiee)',
    'Parametrer rapport Odoo hebdomadaire',
    'Rapport de stage finalise',
    'Presentation finale Marianne : demo scan + tour magasin',
  ]},
];

export function ProgressionStage() {
  const [checked, setChecked] = useApiState<Record<string, boolean>>('stock', 'progression', STORAGE_KEY, {});

  const toggle = useCallback((key: string) => {
    setChecked((prev: Record<string, boolean>) => ({ ...prev, [key]: !prev[key] }));
  }, [setChecked]);

  const totalTaches = PROGRAMME.reduce((s, sem) => s + sem.taches.length, 0);
  const totalFaites = Object.values(checked).filter(Boolean).length;
  const pctGlobal = totalTaches > 0 ? Math.round((totalFaites / totalTaches) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Progression globale */}
      <div className="bg-[#181a20] border border-[#2a2d35] rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-white">Progression du stage</h3>
          <span className={`text-lg font-bold ${pctGlobal === 100 ? 'text-green-400' : pctGlobal >= 50 ? 'text-blue-400' : 'text-amber-400'}`}>{pctGlobal}%</span>
        </div>
        <div className="h-3 bg-[#252830] rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${pctGlobal}%` }} />
        </div>
        <p className="text-xs text-gray-500 mt-1">{totalFaites}/{totalTaches} taches completees</p>
      </div>

      {/* Semaines */}
      {PROGRAMME.map((sem, si) => {
        const semFaites = sem.taches.filter((_, ti) => checked[`${si}-${ti}`]).length;
        const semPct = sem.taches.length > 0 ? Math.round((semFaites / sem.taches.length) * 100) : 0;
        return (
          <div key={si} className="bg-[#181a20] border border-[#2a2d35] rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-[#1c1e24] border-b border-[#2a2d35]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{sem.label}</span>
                <span className={`text-xs font-bold ${semPct === 100 ? 'text-green-400' : 'text-gray-400'}`}>{semFaites}/{sem.taches.length}</span>
              </div>
              <div className="h-1.5 bg-[#252830] rounded-full overflow-hidden mt-1.5">
                <div className={`h-full rounded-full transition-all ${semPct === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${semPct}%` }} />
              </div>
            </div>
            <div className="px-4 py-2 space-y-1">
              {sem.taches.map((tache, ti) => {
                const key = `${si}-${ti}`;
                const done = !!checked[key];
                return (
                  <button key={ti} onClick={() => toggle(key)}
                    className={`w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg text-left transition-all hover:bg-[#252830]/50 ${done ? 'opacity-50' : ''}`}>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${done ? 'bg-green-600 border-green-500' : 'border-[#404550]'}`}>
                      {done && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`text-xs ${done ? 'text-gray-500 line-through' : 'text-gray-300'}`}>{tache}</span>
                  </button>
                );
              })}
            </div>
            <div className="px-4 py-2 bg-[#0f1117] border-t border-[#2a2d35]">
              <p className="text-[10px] text-gray-600">Livrable : {sem.livrable}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
