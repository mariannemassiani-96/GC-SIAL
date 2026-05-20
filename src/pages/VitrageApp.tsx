import { useState, useEffect, useCallback } from 'react';
import type { Vitrage, Plaque, VitrageStore, AverySettings, WESettings, WEGroupe } from '../vitrage/types';
import { DEFAULT_AVERY, DEFAULT_WE } from '../vitrage/types';
import { parseEtiquettesPDF } from '../vitrage/parseEtiquettesPDF';
import { parsePro2D } from '../vitrage/parsePro2D';
import { parseVitrageSpec, extractProtoNum } from '../vitrage/parseVitrageSpec';
import { optimizeWE } from '../vitrage/optimizeWE';
import { generateLabelsA, generateLabelsB, generateLabelsC } from '../vitrage/generateLabels';
import { generateFicheWE } from '../vitrage/generateFicheWE';
import { loadVitrageStore, saveVitrageStore, clearStore } from '../vitrage/store';
import { v4 as uuid } from 'uuid';

// ── Helpers ──────────────────────────────────────────────────────────

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if ((ch === ',' || ch === ';' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCSVVitrages(text: string): Vitrage[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];
  const vitrages: Vitrage[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    if (cols.length < 7) continue;
    const [commande, proto, variante, largStr, hautStr, composition, couleur] = cols;
    const parsed = parseVitrageSpec(composition);
    vitrages.push({
      id: uuid(),
      commande,
      proto,
      protoNum: extractProtoNum(proto),
      variante: (variante === 'V2' ? 'V2' : 'V1'),
      largeur: parseInt(largStr) || 0,
      hauteur: parseInt(hautStr) || 0,
      composition,
      intercalaireEpaisseur: parsed.epaisseur,
      intercalaireCouleur: couleur || '012 (Noir)',
      outerGlass: parsed.outer,
      innerGlass: parsed.inner,
    });
  }
  return vitrages;
}

// ── Step Components ──────────────────────────────────────────────────

function StepImport({
  vitrages,
  onAddVitrages,
  onClear,
}: {
  vitrages: Vitrage[];
  onAddVitrages: (v: Vitrage[]) => void;
  onClear: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePDF = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const parsed = await parseEtiquettesPDF(file);
      if (parsed.length === 0) setError('Aucun vitrage detecte dans ce PDF');
      else onAddVitrages(parsed);
    } catch (err) {
      setError(`Erreur parsing PDF : ${err}`);
    }
    setLoading(false);
  };

  const handleCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const parsed = parseCSVVitrages(reader.result as string);
      if (parsed.length === 0) setError('Aucun vitrage dans le CSV');
      else onAddVitrages(parsed);
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">1. Importer les vitrages</h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-blue-500/50 transition-colors">
          <input type="file" accept=".pdf" onChange={handlePDF} className="hidden" />
          <div className="text-blue-400 text-sm font-semibold">Upload PDF etiquettes</div>
          <div className="text-xs text-gray-500 mt-1">Format SI-AL</div>
        </label>

        <label className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-green-500/50 transition-colors">
          <input type="file" accept=".csv,.txt,.tsv" onChange={handleCSV} className="hidden" />
          <div className="text-green-400 text-sm font-semibold">Import CSV</div>
          <div className="text-xs text-gray-500 mt-1">commande;proto;V1/V2;L;H;compo;couleur</div>
        </label>

        <button
          onClick={() => {
            const v: Vitrage = {
              id: uuid(), commande: '', proto: '', protoNum: '', variante: 'V1',
              largeur: 0, hauteur: 0, composition: '', intercalaireEpaisseur: 10,
              intercalaireCouleur: '012 (Noir)', outerGlass: '', innerGlass: '',
            };
            onAddVitrages([v]);
          }}
          className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
        >
          <div className="text-amber-400 text-sm font-semibold">Saisie manuelle</div>
          <div className="text-xs text-gray-500 mt-1">Ajouter une ligne vide</div>
        </button>
      </div>

      {loading && <div className="text-blue-400 text-sm">Analyse du PDF en cours...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-400">{vitrages.length} vitrage(s) charge(s)</span>
        {vitrages.length > 0 && (
          <button onClick={onClear} className="text-xs text-red-400 hover:text-red-300">Tout effacer</button>
        )}
      </div>
    </div>
  );
}

function StepTableau({
  vitrages,
  onUpdate,
  commandeLabel,
  onCommandeLabel,
}: {
  vitrages: Vitrage[];
  onUpdate: (vitrages: Vitrage[]) => void;
  commandeLabel: string;
  onCommandeLabel: (s: string) => void;
}) {
  const updateRow = (id: string, field: keyof Vitrage, value: string | number) => {
    onUpdate(vitrages.map(v => {
      if (v.id !== id) return v;
      const updated = { ...v, [field]: value };
      if (field === 'composition' && typeof value === 'string') {
        const parsed = parseVitrageSpec(value);
        updated.outerGlass = parsed.outer;
        updated.innerGlass = parsed.inner;
        updated.intercalaireEpaisseur = parsed.epaisseur;
      }
      if (field === 'proto' && typeof value === 'string') {
        updated.protoNum = extractProtoNum(value);
      }
      return updated;
    }));
  };

  const deleteRow = (id: string) => onUpdate(vitrages.filter(v => v.id !== id));

  if (vitrages.length === 0) return <p className="text-gray-500 text-sm">Aucun vitrage — importez d'abord.</p>;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">2. Tableau des vitrages</h3>

      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-400">Renommer commande :</label>
        <input
          value={commandeLabel}
          onChange={e => onCommandeLabel(e.target.value)}
          placeholder="Ex: Querciu BAT B"
          className="bg-[#1e2028] border border-[#2a2d35] rounded px-3 py-1.5 text-sm text-white w-60"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-gray-400 border-b border-[#2a2d35]">
              <th className="text-left py-2 px-1">Commande</th>
              <th className="text-left py-2 px-1">Proto</th>
              <th className="text-left py-2 px-1 w-12">V</th>
              <th className="text-right py-2 px-1 w-16">L (mm)</th>
              <th className="text-right py-2 px-1 w-16">H (mm)</th>
              <th className="text-left py-2 px-1">Composition</th>
              <th className="text-left py-2 px-1">Couleur WE</th>
              <th className="text-left py-2 px-1 w-20">EXT</th>
              <th className="text-left py-2 px-1 w-20">INT</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {vitrages.map(v => (
              <tr key={v.id} className="border-b border-[#1e2028] hover:bg-[#1e2028]">
                <td className="py-1 px-1">
                  <input value={v.commande} onChange={e => updateRow(v.id, 'commande', e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" />
                </td>
                <td className="py-1 px-1">
                  <input value={v.proto} onChange={e => updateRow(v.id, 'proto', e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" />
                </td>
                <td className="py-1 px-1">
                  <select value={v.variante} onChange={e => updateRow(v.id, 'variante', e.target.value)}
                    className="bg-[#181a20] border border-[#2a2d35] rounded text-white text-xs px-1 py-0.5">
                    <option value="V1">V1</option>
                    <option value="V2">V2</option>
                  </select>
                </td>
                <td className="py-1 px-1">
                  <input type="number" value={v.largeur || ''} onChange={e => updateRow(v.id, 'largeur', parseInt(e.target.value) || 0)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white text-right outline-none" />
                </td>
                <td className="py-1 px-1">
                  <input type="number" value={v.hauteur || ''} onChange={e => updateRow(v.id, 'hauteur', parseInt(e.target.value) || 0)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white text-right outline-none" />
                </td>
                <td className="py-1 px-1">
                  <input value={v.composition} onChange={e => updateRow(v.id, 'composition', e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" />
                </td>
                <td className="py-1 px-1">
                  <input value={v.intercalaireCouleur} onChange={e => updateRow(v.id, 'intercalaireCouleur', e.target.value)}
                    className="bg-transparent border-b border-transparent hover:border-[#2a2d35] focus:border-blue-500 w-full px-1 py-0.5 text-white outline-none" />
                </td>
                <td className="py-1 px-1 text-red-400">{v.outerGlass}</td>
                <td className="py-1 px-1 text-blue-400">{v.innerGlass}</td>
                <td className="py-1 px-1">
                  <button onClick={() => deleteRow(v.id)} className="text-red-500 hover:text-red-300">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StepPro2D({
  plaques,
  onPlaques,
}: {
  plaques: Plaque[];
  onPlaques: (p: Plaque[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const parsed = await parsePro2D(file);
      if (parsed.length === 0) setError('Aucune plaque detectee');
      else onPlaques(parsed);
    } catch (err) {
      setError(`Erreur parsing : ${err}`);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-white">3. Optimisation Pro2D (optionnel)</h3>
      <p className="text-sm text-gray-500">Necessaire pour la Variante C (ordre de coupe).</p>

      <label className="border-2 border-dashed border-[#2a2d35] rounded-lg p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors inline-block">
        <input type="file" accept=".pdf,.odt" onChange={handleFile} className="hidden" />
        <div className="text-purple-400 text-sm font-semibold">Upload PDF Pro2D</div>
      </label>

      {loading && <div className="text-blue-400 text-sm">Analyse...</div>}
      {error && <div className="text-red-400 text-sm">{error}</div>}

      {plaques.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm text-gray-400">{plaques.length} plaque(s) — {plaques.reduce((s, p) => s + p.pieces.length, 0)} piece(s)</div>
          <div className="overflow-x-auto max-h-48 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-[#2a2d35]">
                  <th className="text-left py-1 px-2">N°</th>
                  <th className="text-left py-1 px-2">Materiau</th>
                  <th className="text-right py-1 px-2">Dimensions</th>
                  <th className="text-right py-1 px-2">Pieces</th>
                </tr>
              </thead>
              <tbody>
                {plaques.map(p => (
                  <tr key={p.numero} className="border-b border-[#1e2028]">
                    <td className="py-1 px-2 text-white">{p.numero}</td>
                    <td className="py-1 px-2 text-amber-400">{p.materiau}</td>
                    <td className="py-1 px-2 text-white text-right">{p.largeur} x {p.hauteur}</td>
                    <td className="py-1 px-2 text-white text-right">{p.pieces.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StepSettings({
  avery,
  we,
  onAvery,
  onWE,
}: {
  avery: AverySettings;
  we: WESettings;
  onAvery: (s: AverySettings) => void;
  onWE: (s: WESettings) => void;
}) {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Parametres</h3>

      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Padding etiquettes Avery (mm)</h4>
        <div className="grid grid-cols-4 gap-3">
          {(['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'] as const).map(k => (
            <div key={k}>
              <label className="text-xs text-gray-500 block mb-1">{k.replace('padding', '')}</label>
              <input
                type="number" step="0.5" value={avery[k]}
                onChange={e => onAvery({ ...avery, [k]: parseFloat(e.target.value) || 0 })}
                className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white w-full"
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Warm Edge</h4>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Barre (mm)</label>
            <input type="number" value={we.barreLength}
              onChange={e => onWE({ ...we, barreLength: parseInt(e.target.value) || 6000 })}
              className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Marge (mm)</label>
            <input type="number" value={we.marge}
              onChange={e => onWE({ ...we, marge: parseInt(e.target.value) || 20 })}
              className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white w-full" />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Trait de scie (mm)</label>
            <input type="number" value={we.kerf}
              onChange={e => onWE({ ...we, kerf: parseInt(e.target.value) || 5 })}
              className="bg-[#1e2028] border border-[#2a2d35] rounded px-2 py-1 text-sm text-white w-full" />
          </div>
        </div>
      </div>

      {/* Preview box */}
      <div>
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Apercu etiquette (70 x 35 mm)</h4>
        <div className="inline-block bg-white rounded border border-gray-300"
          style={{ width: 70 * 2.5, height: 35 * 2.5, position: 'relative' }}>
          <div className="absolute border border-dashed border-blue-300"
            style={{
              left: avery.paddingLeft * 2.5,
              right: avery.paddingRight * 2.5,
              top: avery.paddingTop * 2.5,
              bottom: avery.paddingBottom * 2.5,
            }}>
            <div className="text-[8px] text-gray-800 p-0.5 leading-tight">
              <div className="font-bold">SI-AL <span className="text-red-500">V1</span></div>
              <div className="font-bold text-[7px]">Cde : O_2026-0023</div>
              <div className="font-bold text-[11px]">19</div>
              <div className="font-bold text-[7px]">967 x 1894 mm</div>
              <div className="text-[6px] text-gray-500">44.2 /10 ARG WE /44.2</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StepGenerate({
  vitrages,
  plaques,
  commandeLabel,
  avery,
  we,
}: {
  vitrages: Vitrage[];
  plaques: Plaque[];
  commandeLabel: string;
  avery: AverySettings;
  we: WESettings;
}) {
  const [generating, setGenerating] = useState('');
  const [weResult, setWeResult] = useState<WEGroupe[] | null>(null);

  useEffect(() => {
    if (vitrages.length > 0) {
      setWeResult(optimizeWE(vitrages, we));
    }
  }, [vitrages, we]);

  const gen = async (type: string) => {
    setGenerating(type);
    try {
      const label = commandeLabel || vitrages[0]?.commande || 'export';
      switch (type) {
        case 'A': {
          const blob = await generateLabelsA(vitrages, commandeLabel, avery);
          download(blob, `${label}_etiquettes_A.pdf`);
          break;
        }
        case 'B': {
          const blob = await generateLabelsB(vitrages, commandeLabel, avery);
          download(blob, `${label}_etiquettes_B.pdf`);
          break;
        }
        case 'C': {
          const blob = await generateLabelsC(vitrages, plaques, commandeLabel, avery);
          download(blob, `${label}_etiquettes_C.pdf`);
          break;
        }
        case 'WE': {
          const groupes = optimizeWE(vitrages, we);
          const blob = await generateFicheWE(groupes, commandeLabel || label, we);
          download(blob, `${label}_WE.pdf`);
          break;
        }
      }
    } catch (err) {
      alert(`Erreur generation : ${err}`);
    }
    setGenerating('');
  };

  const hasVitrages = vitrages.length > 0;
  const hasPlaques = plaques.length > 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">4. Generer les documents</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DocCard
          title="A — Etiquettes assemblees"
          desc={`1 etiquette par vitrage (${vitrages.length} etiquettes)`}
          enabled={hasVitrages}
          loading={generating === 'A'}
          onGenerate={() => gen('A')}
          color="blue"
        />
        <DocCard
          title="B — Etiquettes EXT / INT"
          desc={`2 etiquettes par vitrage (${vitrages.length * 2} etiquettes)`}
          enabled={hasVitrages}
          loading={generating === 'B'}
          onGenerate={() => gen('B')}
          color="green"
        />
        <DocCard
          title="C — Ordre de coupe"
          desc={hasPlaques ? `${plaques.length} plaques` : 'Necessite Pro2D'}
          enabled={hasVitrages && hasPlaques}
          loading={generating === 'C'}
          onGenerate={() => gen('C')}
          color="purple"
        />
        <DocCard
          title="Fiche Warm Edge"
          desc={weResult ? `${weResult.reduce((s, g) => s + g.totalBarres, 0)} barres` : 'Calculer...'}
          enabled={hasVitrages}
          loading={generating === 'WE'}
          onGenerate={() => gen('WE')}
          color="amber"
        />
      </div>

      {/* WE Summary */}
      {weResult && weResult.length > 0 && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-semibold text-gray-300">Resume Warm Edge</h4>
          {weResult.map((g, i) => (
            <div key={i} className="bg-[#1e2028] rounded-lg p-4 border border-[#2a2d35]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-amber-400">
                  {g.epaisseur}mm — {g.couleur}
                </span>
                <span className="text-xs text-gray-400">
                  {g.totalPieces} pcs / {g.totalBarres} barres / {(g.tauxUtilisation * 100).toFixed(1)}%
                </span>
              </div>
              <div className="overflow-x-auto max-h-60 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#2a2d35]">
                      <th className="text-left py-1 px-2 w-12">N°</th>
                      <th className="text-left py-1 px-2">Coupes</th>
                      <th className="text-right py-1 px-2 w-16">Utilise</th>
                      <th className="text-right py-1 px-2 w-16">Chute</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.barres.map(b => (
                      <tr key={b.numero} className="border-b border-[#181a20]">
                        <td className="py-1 px-2 text-white">{b.numero}</td>
                        <td className="py-1 px-2 text-gray-300">
                          {b.pieces.map((p, j) => (
                            <span key={j}>
                              {j > 0 && <span className="text-gray-600"> + 5 + </span>}
                              <span>{p.longueur}</span>
                              <span className="text-gray-500 text-[10px]"> ({p.vitrageRef} {p.cote === 'court' ? 'C' : 'L'})</span>
                            </span>
                          ))}
                        </td>
                        <td className="py-1 px-2 text-white text-right">{b.utilise}</td>
                        <td className="py-1 px-2 text-gray-400 text-right">{b.chute}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocCard({
  title,
  desc,
  enabled,
  loading,
  onGenerate,
  color,
}: {
  title: string;
  desc: string;
  enabled: boolean;
  loading: boolean;
  onGenerate: () => void;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: 'border-blue-500/30 hover:border-blue-500/60',
    green: 'border-green-500/30 hover:border-green-500/60',
    purple: 'border-purple-500/30 hover:border-purple-500/60',
    amber: 'border-amber-500/30 hover:border-amber-500/60',
  };
  const textColors: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <button
      onClick={onGenerate}
      disabled={!enabled || loading}
      className={`text-left p-5 rounded-xl border-2 bg-[#181a20] transition-all ${
        enabled ? colors[color] + ' cursor-pointer' : 'border-[#2a2d35] opacity-40 cursor-not-allowed'
      }`}
    >
      <div className={`text-sm font-semibold ${textColors[color]}`}>{title}</div>
      <div className="text-xs text-gray-500 mt-1">{loading ? 'Generation...' : desc}</div>
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────

const STEPS = ['Import', 'Tableau', 'Pro2D', 'Parametres', 'Generer'] as const;

export function VitrageApp({ onBack }: { onBack: () => void }) {
  const [store, setStoreRaw] = useState<VitrageStore>(loadVitrageStore);
  const [step, setStep] = useState(0);

  const setStore = useCallback((s: VitrageStore | ((prev: VitrageStore) => VitrageStore)) => {
    setStoreRaw(prev => {
      const next = typeof s === 'function' ? s(prev) : s;
      saveVitrageStore(next);
      return next;
    });
  }, []);

  const handleAddVitrages = (v: Vitrage[]) => {
    setStore(s => ({ ...s, vitrages: [...s.vitrages, ...v] }));
  };

  const handleClear = () => setStore(clearStore());

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="bg-[#181a20] border-b border-[#2a2d35] px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="text-sm text-gray-500 hover:text-white transition-colors">
              Accueil
            </button>
            <span className="text-gray-700">/</span>
            <span className="text-sm font-semibold text-blue-400">Etiquettes Vitrage & WE</span>
          </div>
          <span className="text-xs text-gray-600">{store.vitrages.length} vitrages</span>
        </div>
      </header>

      {/* Steps nav */}
      <div className="bg-[#181a20] border-b border-[#2a2d35] px-6">
        <div className="max-w-6xl mx-auto flex gap-1">
          {STEPS.map((label, i) => (
            <button
              key={label}
              onClick={() => setStep(i)}
              className={`px-4 py-2.5 text-sm transition-colors border-b-2 ${
                i === step
                  ? 'border-blue-500 text-blue-400 font-semibold'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-6">
        {step === 0 && (
          <StepImport
            vitrages={store.vitrages}
            onAddVitrages={handleAddVitrages}
            onClear={handleClear}
          />
        )}
        {step === 1 && (
          <StepTableau
            vitrages={store.vitrages}
            onUpdate={v => setStore(s => ({ ...s, vitrages: v }))}
            commandeLabel={store.commandeLabel}
            onCommandeLabel={l => setStore(s => ({ ...s, commandeLabel: l }))}
          />
        )}
        {step === 2 && (
          <StepPro2D
            plaques={store.plaques}
            onPlaques={p => setStore(s => ({ ...s, plaques: p }))}
          />
        )}
        {step === 3 && (
          <StepSettings
            avery={store.averySettings}
            we={store.weSettings}
            onAvery={a => setStore(s => ({ ...s, averySettings: a }))}
            onWE={w => setStore(s => ({ ...s, weSettings: w }))}
          />
        )}
        {step === 4 && (
          <StepGenerate
            vitrages={store.vitrages}
            plaques={store.plaques}
            commandeLabel={store.commandeLabel}
            avery={store.averySettings}
            we={store.weSettings}
          />
        )}
      </main>
    </div>
  );
}
