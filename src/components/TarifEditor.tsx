import { useState } from 'react';
import type { TarifKawneer, TarifItem, ClasseColoris } from '../types';
import { PROFILS, ACCESSOIRES } from '../constants/profils';
import { CLASSES_LABELS } from '../store/tarif';

interface Props {
  tarif: TarifKawneer;
  onUpdate: (ref: string, item: Partial<TarifItem>) => void;
  onClose: () => void;
}

type Section = 'profils' | 'accessoires';

const ALL_REFS: { ref: string; label: string; section: Section; isBrut: boolean }[] = [
  ...Object.entries(PROFILS).map(([ref, p]) => ({ ref, label: p.label, section: 'profils' as Section, isBrut: false })),
  ...Object.entries(ACCESSOIRES).map(([ref, a]) => ({ ref, label: a.label, section: 'accessoires' as Section, isBrut: true })),
];

export function TarifEditor({ tarif, onUpdate, onClose }: Props) {
  const [section, setSection] = useState<Section>('profils');
  const items = ALL_REFS.filter(r => r.section === section);
  const classes: ClasseColoris[] = [1, 2, 3, 4];

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-[#14161d] border border-[#252830] rounded-xl w-full max-w-5xl mx-4 mb-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[#252830]">
          <div>
            <h2 className="text-sm font-bold text-gray-200">Tarif Kawneer — Prix d'achat</h2>
            {tarif.dateMAJ && <p className="text-[10px] text-gray-500">Dernière MAJ : {tarif.dateMAJ}</p>}
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg px-2">✕</button>
        </div>

        {/* Section tabs */}
        <div className="flex gap-1 px-5 pt-3">
          {(['profils', 'accessoires'] as const).map(s => (
            <button key={s} onClick={() => setSection(s)}
              className={`px-3 py-1.5 text-xs rounded font-medium transition-colors ${section === s ? 'bg-blue-600 text-white' : 'bg-[#1e2028] text-gray-400 hover:text-gray-200'}`}>
              {s === 'profils' ? 'Profilés (par barre 6.4m)' : 'Accessoires (unitaire)'}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="p-5 overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-gray-500 border-b border-[#252830]">
                <th className="text-left py-2 px-2 w-20">Réf</th>
                <th className="text-left py-2 px-2">Désignation</th>
                {section === 'profils' ? (
                  classes.map(c => (
                    <th key={c} className="text-right py-2 px-2 w-28">
                      <span className="text-[9px] text-gray-600 block">Cl. {c}</span>
                      <span className="text-[8px] text-gray-700">{CLASSES_LABELS[c].split('—')[1]?.trim()}</span>
                    </th>
                  ))
                ) : (
                  <th className="text-right py-2 px-2 w-28">Prix unitaire €</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map(item => {
                const prix = tarif.prix[item.ref] ?? { classe1: 0, classe2: 0, classe3: 0, classe4: 0 };
                return (
                  <tr key={item.ref} className="border-b border-[#1e2028] hover:bg-[#1e2028]/50">
                    <td className="py-1.5 px-2 text-blue-400">{item.ref}</td>
                    <td className="py-1.5 px-2 text-gray-300 text-[11px]">{item.label}</td>
                    {section === 'profils' ? (
                      classes.map(c => (
                        <td key={c} className="py-1 px-1 text-right">
                          <input
                            type="number" step="0.01" min="0"
                            value={prix[`classe${c}`] || ''}
                            onChange={(e) => onUpdate(item.ref, { [`classe${c}`]: parseFloat(e.target.value) || 0 })}
                            placeholder="0.00"
                            className="w-24 bg-[#0f1117] border border-[#252830] rounded px-2 py-1 text-right text-gray-200 text-xs outline-none focus:border-blue-500/50"
                          />
                        </td>
                      ))
                    ) : (
                      <td className="py-1 px-1 text-right">
                        <input
                          type="number" step="0.01" min="0"
                          value={prix.classe1 || ''}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            onUpdate(item.ref, { classe1: v, classe2: v, classe3: v, classe4: v });
                          }}
                          placeholder="0.00"
                          className="w-24 bg-[#0f1117] border border-[#252830] rounded px-2 py-1 text-right text-gray-200 text-xs outline-none focus:border-blue-500/50"
                        />
                      </td>
                    )}
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
