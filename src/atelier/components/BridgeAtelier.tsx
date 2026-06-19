import { useState, useCallback } from 'react';
import type { FicheMontage } from '../types';
import { DEMO_FICHE } from '../types';
import { ArrowLeft, Upload, Database, Trash2, Search, FileJson, Download, Plus } from 'lucide-react';

interface BridgeAtelierProps {
  onBack: () => void;
}

const STORAGE_KEY = 'sial-assembly-db';

function getDB(): Record<string, FicheMontage> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { return {}; }
}

function saveDB(db: Record<string, FicheMontage>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function BridgeAtelier({ onBack }: BridgeAtelierProps) {
  const [db, setDb] = useState<Record<string, FicheMontage>>(getDB);
  const [search, setSearch] = useState('');
  const [selectedBarcode, setSelectedBarcode] = useState<string | null>(null);

  const fiches = Object.values(db);
  const filtered = fiches.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return f.barcode.includes(q) || f.lot?.toLowerCase().includes(q) ||
      f.commande?.toLowerCase().includes(q) || f.gamme?.toLowerCase().includes(q);
  });

  const refresh = useCallback(() => setDb(getDB()), []);

  // ── Charger la démo ──
  const loadDemo = useCallback(() => {
    const current = getDB();
    const demo = structuredClone(DEMO_FICHE);
    demo.etape_courante = 0;
    demo.ferco.forEach((f) => { f.fait = false; });
    current[demo.barcode] = demo;
    saveDB(current);
    refresh();
  }, [refresh]);

  // ── Import JSON ──
  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.multiple = true;
    input.onchange = () => {
      const files = input.files;
      if (!files) return;
      const current = getDB();
      let imported = 0;
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(reader.result as string);
            // Support tableau ou objet unique
            const items: FicheMontage[] = Array.isArray(data) ? data : [data];
            items.forEach((item) => {
              if (item.barcode && item.ferco) {
                current[item.barcode] = item;
                imported++;
              }
            });
            saveDB(current);
            refresh();
          } catch (e) {
            alert(`Erreur parsing ${file.name}: ${e}`);
          }
        };
        reader.readAsText(file);
      });
    };
    input.click();
  }, [refresh]);

  // ── Export JSON ──
  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify(Object.values(db), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sial_assembly_db_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [db]);

  // ── Supprimer une fiche ──
  const deleteFiche = useCallback((barcode: string) => {
    const current = getDB();
    delete current[barcode];
    saveDB(current);
    refresh();
    if (selectedBarcode === barcode) setSelectedBarcode(null);
  }, [refresh, selectedBarcode]);

  // ── Vider la base ──
  const clearAll = useCallback(() => {
    if (confirm('Supprimer toutes les fiches en mémoire ?')) {
      saveDB({});
      refresh();
      setSelectedBarcode(null);
    }
  }, [refresh]);

  const selected = selectedBarcode ? db[selectedBarcode] : null;

  return (
    <div className="min-h-screen bg-[#07090c] flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1117] border-b border-[#263447] px-4 h-[52px] flex items-center justify-between shrink-0 relative">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#4b8fc8] to-[#4bc87a]" />
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#6b8099] hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-sm font-bold tracking-widest text-[#4b8fc8]">SIAL</span>
            <span className="text-[8px] text-[#6b8099] tracking-wider ml-1">BRIDGE ATELIER</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b8099]">
          <Database size={12} /> {fiches.length} fiche{fiches.length > 1 ? 's' : ''}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* ── Liste des fiches ── */}
        <div className="w-full lg:w-[400px] flex flex-col border-r border-[#1e2a3a] shrink-0">
          {/* Actions */}
          <div className="p-3 border-b border-[#1e2a3a] flex flex-wrap gap-2">
            <button onClick={handleImport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#4b8fc8]/10 border border-[#4b8fc8]/30 text-[#4b8fc8] rounded-lg hover:bg-[#4b8fc8]/20 transition-colors">
              <Upload size={12} /> Importer JSON
            </button>
            <button onClick={handleExport} disabled={fiches.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#4bc87a]/10 border border-[#4bc87a]/30 text-[#4bc87a] rounded-lg hover:bg-[#4bc87a]/20 transition-colors disabled:opacity-40">
              <Download size={12} /> Exporter
            </button>
            <button onClick={loadDemo} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#c8a84b]/10 border border-[#c8a84b]/30 text-[#c8a84b] rounded-lg hover:bg-[#c8a84b]/20 transition-colors">
              <Plus size={12} /> Demo
            </button>
            {fiches.length > 0 && (
              <button onClick={clearAll} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[#c84b4b]/10 border border-[#c84b4b]/30 text-[#c84b4b] rounded-lg hover:bg-[#c84b4b]/20 transition-colors">
                <Trash2 size={12} /> Vider
              </button>
            )}
          </div>

          {/* Recherche */}
          <div className="px-3 py-2 border-b border-[#1e2a3a]">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#3a4f65]" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher barcode, lot, commande..."
                className="w-full pl-8 pr-3 py-2 bg-[#131a23] border border-[#1e2a3a] rounded-lg text-xs text-white placeholder-[#3a4f65] focus:border-[#4b8fc8] outline-none"
              />
            </div>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
                <FileJson size={32} className="text-[#1e2a3a]" />
                <p className="text-sm text-[#3a4f65]">
                  {fiches.length === 0 ? 'Aucune fiche en memoire' : 'Aucun resultat'}
                </p>
                <p className="text-xs text-[#263447]">
                  Importez des fiches JSON ou chargez la demo
                </p>
              </div>
            ) : (
              filtered.map((f) => {
                const isSelected = selectedBarcode === f.barcode;
                const progress = f.ferco.filter((p) => p.fait).length;
                const total = f.ferco.length;
                const pct = total > 0 ? Math.round((progress / total) * 100) : 0;
                return (
                  <button
                    key={f.barcode}
                    onClick={() => setSelectedBarcode(f.barcode)}
                    className={`w-full text-left px-3 py-3 border-b border-[#1e2a3a]/50 transition-all
                      ${isSelected ? 'bg-[#131a23] border-l-2 border-l-[#4b8fc8]' : 'hover:bg-[#0d1117]'}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#c8a84b]">{f.barcode.slice(-8)}</span>
                      <span className="text-[10px] text-[#3a4f65]">{f.parsed_at?.slice(0, 10)}</span>
                    </div>
                    <p className="text-xs text-white font-semibold mt-1">{f.lot} pos{f.pos}</p>
                    <p className="text-[10px] text-[#6b8099] mt-0.5">{f.gamme} | {f.lff_mm}x{f.hff_mm}mm</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-[#1e2a3a] rounded-full overflow-hidden">
                        <div className="h-full bg-[#4bc87a] rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[9px] text-[#6b8099] font-mono">{progress}/{total}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Detail fiche ── */}
        <div className="hidden lg:flex flex-1 flex-col overflow-y-auto">
          {selected ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">{selected.lot} — pos {selected.pos}</h2>
                  <p className="text-xs text-[#6b8099] mt-0.5">{selected.commande} | Barcode: {selected.barcode}</p>
                </div>
                <button onClick={() => deleteFiche(selected.barcode)} className="p-2 text-[#c84b4b] hover:bg-[#c84b4b]/10 rounded-lg transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              {/* Infos */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Type', value: selected.type_ouverture },
                  { label: 'Gamme', value: selected.gamme },
                  { label: 'Dimensions', value: `${selected.lff_mm}x${selected.hff_mm}mm` },
                  { label: 'Matiere', value: selected.matiere },
                  { label: 'Config', value: selected.conf },
                  { label: 'Sens', value: selected.sens },
                  { label: 'Teinte', value: selected.teinte },
                  { label: 'Local', value: selected.local || '—' },
                ].map((item) => (
                  <div key={item.label} className="bg-[#131a23] border border-[#1e2a3a] rounded-lg p-3">
                    <p className="text-[9px] text-[#3a4f65] tracking-wider">{item.label.toUpperCase()}</p>
                    <p className="text-xs text-white mt-0.5 font-medium">{item.value}</p>
                  </div>
                ))}
              </div>

              {/* Pieces */}
              <div>
                <h3 className="text-xs tracking-widest text-[#6b8099] font-semibold mb-2">
                  PIECES FERCO ({selected.ferco.length})
                </h3>
                <div className="bg-[#0d1117] border border-[#1e2a3a] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-[#1e2a3a] text-[#3a4f65]">
                        <th className="text-left px-3 py-2">Ref</th>
                        <th className="text-left px-3 py-2">Description</th>
                        <th className="text-center px-3 py-2">Qte</th>
                        <th className="text-center px-3 py-2">Finition</th>
                        <th className="text-center px-3 py-2">Casier</th>
                        <th className="text-center px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.ferco.map((p, i) => (
                        <tr key={`${p.ref}-${i}`} className={`border-b border-[#1e2a3a]/50 ${p.fait ? 'opacity-40' : ''}`}>
                          <td className="px-3 py-2 font-mono text-[#c8a84b]">{p.ref}</td>
                          <td className="px-3 py-2 text-[#6b8099]">{p.desc}</td>
                          <td className="px-3 py-2 text-center text-white font-bold">{p.qte}</td>
                          <td className="px-3 py-2 text-center"><span className="px-1.5 py-0.5 rounded bg-[#4b8fc8]/10 text-[#4b8fc8] text-[10px]">{p.finition}</span></td>
                          <td className="px-3 py-2 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: p.couleur }} />
                              <span className="text-white">{p.casier}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">{p.fait ? '✅' : '○'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#263447] text-sm">
              Selectionnez une fiche pour voir les details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
