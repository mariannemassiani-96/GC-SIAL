import type { Affaire, ResultatAffaire } from '../../types';
import { genererDevis, type LigneDevis } from '../../engine/devis';
import { useMemo } from 'react';

interface TabDevisProps {
  affaire: Affaire;
  resultat: ResultatAffaire;
}

function LigneTable({ ligne }: { ligne: LigneDevis }) {
  return (
    <tr className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
      <td className="py-1.5 px-2 text-blue-400 font-mono text-xs">{ligne.ref}</td>
      <td className="py-1.5 px-2 text-gray-300 text-xs">{ligne.designation}</td>
      <td className="py-1.5 px-2 text-right text-gray-200 font-mono text-xs">{ligne.qte}</td>
      <td className="py-1.5 px-2 text-gray-500 text-xs">{ligne.unite}</td>
      <td className="py-1.5 px-2 text-right text-gray-200 font-mono text-xs">{ligne.prixUnit.toFixed(2)} €</td>
      <td className="py-1.5 px-2 text-right text-gray-100 font-mono text-xs font-semibold">{ligne.montant.toFixed(2)} €</td>
    </tr>
  );
}

function SectionDevis({ titre, lignes, total }: { titre: string; lignes: LigneDevis[]; total: number }) {
  if (lignes.length === 0) return null;
  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{titre}</h4>
      <table className="w-full">
        <thead>
          <tr className="text-[10px] text-gray-500 border-b border-[#252830]">
            <th className="text-left py-1 px-2 w-20">Réf</th>
            <th className="text-left py-1 px-2">Désignation</th>
            <th className="text-right py-1 px-2 w-12">Qté</th>
            <th className="text-left py-1 px-2 w-24">Unité</th>
            <th className="text-right py-1 px-2 w-20">P.U.</th>
            <th className="text-right py-1 px-2 w-24">Montant</th>
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, i) => <LigneTable key={i} ligne={l} />)}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#353840]">
            <td colSpan={5} className="py-1.5 px-2 text-right text-xs text-gray-400">Sous-total {titre.toLowerCase()}</td>
            <td className="py-1.5 px-2 text-right text-xs font-mono font-semibold text-gray-200">{total.toFixed(2)} €</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export function TabDevis({ affaire, resultat }: TabDevisProps) {
  const devis = useMemo(() => genererDevis(affaire, resultat), [affaire, resultat]);

  return (
    <div className="space-y-4">
      {/* En-tête devis */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-200">Devis estimatif</h3>
          <p className="text-[10px] text-gray-500 mt-0.5">Prix indicatifs — à valider avec le tarif Kawneer en vigueur</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-400">{affaire.ref} — {affaire.chantier}</div>
          <div className="text-xs text-gray-500">{affaire.date}</div>
        </div>
      </div>

      <SectionDevis titre="Profilés aluminium" lignes={devis.lignesProfiles} total={devis.totalProfiles} />
      <SectionDevis titre="Accessoires" lignes={devis.lignesAccessoires} total={devis.totalAccessoires} />
      <SectionDevis titre="Autres (vitrages, main d'œuvre)" lignes={devis.lignesAutres} total={devis.totalAutres} />

      {/* Totaux */}
      <div className="border-t border-[#353840] pt-3 space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">Total HT</span>
          <span className="font-mono font-semibold text-gray-200">{devis.totalHT.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-400">TVA 20%</span>
          <span className="font-mono text-gray-400">{devis.tva.toFixed(2)} €</span>
        </div>
        <div className="flex justify-between text-base font-bold border-t border-[#353840] pt-2 mt-2">
          <span className="text-gray-200">Total TTC</span>
          <span className="font-mono text-blue-400">{devis.totalTTC.toFixed(2)} €</span>
        </div>
      </div>
    </div>
  );
}
