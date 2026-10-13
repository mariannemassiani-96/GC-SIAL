import { useState, useCallback, useRef } from 'react';
import { ArrowLeft, Upload, Printer, Eye, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { parseFstlineFile, type FstJob, type FstBar, type FstCut } from '../fstlineParser';
import JsBarcode from 'jsbarcode';

interface Props {
  onBack: () => void;
}

// ── Label dimensions Brother QL-1050 DK-22205 (62mm continuous) ─────
const LABEL_W_MM = 62;
const LABEL_H_MM = 34;

// ── Angle SVG helper ────────────────────────────────────────────────
function AngleSvg({ left, right, size = 28 }: { left: number; right: number; size?: number }) {
  const norm = (a: number) => (a === 135 ? 45 : a === 90 ? 90 : a === 45 ? 45 : a);
  const lAngle = norm(left);
  const rAngle = norm(right);
  const margin = 3;
  const yTop = margin;
  const yBot = size - margin;
  const lOff = lAngle === 45 ? (yBot - yTop) : 0;
  const rOff = rAngle === 45 ? (yBot - yTop) : 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <polygon
        points={`${margin + lOff},${yTop} ${size - margin - rOff},${yTop} ${size - margin},${yBot} ${margin},${yBot}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      {left === 135 && <line x1={margin} y1={yBot} x2={margin + lOff} y2={yTop} stroke="currentColor" strokeWidth="0.7" strokeDasharray="2,1" />}
      {right === 135 && <line x1={size - margin} y1={yBot} x2={size - margin - rOff} y2={yTop} stroke="currentColor" strokeWidth="0.7" strokeDasharray="2,1" />}
    </svg>
  );
}

// ── Generate barcode as data URL ────────────────────────────────────
function barcodeDataUrl(text: string, w = 1.2, h = 30): string {
  if (!text) return '';
  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, text, {
      format: 'CODE128',
      width: w,
      height: h,
      displayValue: false,
      margin: 0,
    });
    return canvas.toDataURL('image/png');
  } catch {
    return '';
  }
}

// ── Extract REP number from LBL[0] ─────────────────────────────────
function getRepNumber(cut: FstCut): string {
  return cut.labels[0] || '';
}

// ── Extract position lines (P:x, O:x, Q:x, TRANCHE:x) from LBL ───
function getPosLines(cut: FstCut): string[] {
  return cut.labels
    .slice(1)
    .filter(l => l && /^[POQT]/i.test(l.trim()))
    .map(l => l.trim());
}

// ── Print labels HTML ───────────────────────────────────────────────
function generatePrintHTML(cuts: { cut: FstCut; bar: FstBar }[], jobName: string): string {
  const labels = cuts.map(({ cut, bar }) => {
    const bcSrc = barcodeDataUrl(cut.bcod, 1.0, 16);
    const rep = getRepNumber(cut);
    const posLines = getPosLines(cut);

    return `
      <div class="label">
        <div class="body">
          <div class="col-left">
            <div class="cid">${cut.cid || cut.ref || '—'}</div>
            <div class="chantier">${cut.chantier || jobName}</div>
            <div class="dims">${cut.il}mm · ${cut.angleLeft}/${cut.angleRight}°</div>
            <div class="order">${cut.orderCode} · ${bar.code} · ${bar.brand}</div>
          </div>
          <div class="col-right">
            <div class="rep-label">REP</div>
            <div class="rep-box">${rep}</div>
            ${posLines.map(l => `<div class="pos">${l}</div>`).join('')}
          </div>
        </div>
        ${bcSrc ? `<div class="row-barcode"><img src="${bcSrc}" /><span class="bc-text">${cut.bcod}</span></div>` : ''}
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Etiquettes Coupe — ${jobName}</title>
<style>
@page {
  size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm;
  margin: 1mm 1.5mm;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; }
.label {
  width: ${LABEL_W_MM - 3}mm;
  height: ${LABEL_H_MM - 2}mm;
  page-break-after: always;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.body { display: flex; flex: 1; min-height: 0; }
.col-left { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 0.3mm; }
.cid { font-size: 9pt; font-weight: 900; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chantier { font-size: 8pt; font-weight: 900; color: #000; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dims { font-size: 8pt; font-weight: 900; color: #000; }
.order { font-size: 5.5pt; color: #666; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-right { width: 18mm; display: flex; flex-direction: column; align-items: center; justify-content: center; border-left: 0.5pt solid #ccc; padding-left: 1.5mm; margin-left: 1mm; }
.rep-label { font-size: 5.5pt; font-weight: 700; color: #666; letter-spacing: 0.5px; }
.rep-box { font-size: 22pt; font-weight: 900; line-height: 1; border: 1.5pt solid #000; padding: 0.5mm 2mm; text-align: center; min-width: 12mm; }
.pos { font-size: 6pt; font-weight: 700; color: #444; margin-top: 0.5mm; }
.row-barcode { display: flex; align-items: center; gap: 1mm; margin-top: auto; }
.row-barcode img { flex: 1; height: 6mm; object-fit: contain; }
.bc-text { font-size: 4.5pt; color: #555; font-family: monospace; white-space: nowrap; }
@media print {
  .label:last-child { page-break-after: avoid; }
}
</style>
</head>
<body>${labels}</body>
</html>`;
}

// ── Component ───────────────────────────────────────────────────────

export function EtiquettesCoupe({ onBack }: Props) {
  const [job, setJob] = useState<FstJob | null>(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedBars, setExpandedBars] = useState<Set<string>>(new Set());
  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(new Set());
  const [previewMode, setPreviewMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError('');
    try {
      const parsed = await parseFstlineFile(file);
      if (parsed.totalCuts === 0) {
        setError('Aucune piece trouvee dans le fichier.');
        setLoading(false);
        return;
      }
      setJob(parsed);
      setFileName(file.name);
      const allCutIds = new Set<string>();
      parsed.bars.forEach(bar => bar.cuts.forEach(cut => allCutIds.add(cut.bcod)));
      setSelectedCuts(allCutIds);
      const allBarIds = new Set(parsed.bars.map(b => b.id));
      setExpandedBars(allBarIds);
    } catch (e) {
      setError(`Erreur de lecture : ${e instanceof Error ? e.message : 'fichier invalide'}`);
    }
    setLoading(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const toggleBar = (barId: string) => {
    setExpandedBars(prev => {
      const next = new Set(prev);
      if (next.has(barId)) next.delete(barId);
      else next.add(barId);
      return next;
    });
  };

  const toggleCut = (bcod: string) => {
    setSelectedCuts(prev => {
      const next = new Set(prev);
      if (next.has(bcod)) next.delete(bcod);
      else next.add(bcod);
      return next;
    });
  };

  const toggleAllBar = (bar: FstBar) => {
    const allSelected = bar.cuts.every(c => selectedCuts.has(c.bcod));
    setSelectedCuts(prev => {
      const next = new Set(prev);
      bar.cuts.forEach(c => {
        if (allSelected) next.delete(c.bcod);
        else next.add(c.bcod);
      });
      return next;
    });
  };

  const selectAll = () => {
    if (!job) return;
    const allCutIds = new Set<string>();
    job.bars.forEach(bar => bar.cuts.forEach(cut => allCutIds.add(cut.bcod)));
    setSelectedCuts(allCutIds);
  };

  const selectNone = () => setSelectedCuts(new Set());

  const getSelectedCutsWithBars = (): { cut: FstCut; bar: FstBar }[] => {
    if (!job) return [];
    const result: { cut: FstCut; bar: FstBar }[] = [];
    job.bars.forEach(bar => {
      bar.cuts.forEach(cut => {
        if (selectedCuts.has(cut.bcod)) {
          result.push({ cut, bar });
        }
      });
    });
    return result;
  };

  const handlePrint = () => {
    const cutsWithBars = getSelectedCutsWithBars();
    if (cutsWithBars.length === 0) return;
    const html = generatePrintHTML(cutsWithBars, job?.chantier || fileName);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  };

  const totalSelected = selectedCuts.size;

  return (
    <div className="fixed inset-0 bg-[#0a0c10] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-none bg-[#181a20] border-b border-[#2a2d35] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white flex items-center gap-2">
              <Printer size={20} className="text-pink-400" />
              Etiquettes Coupe — Brother QL-1050
            </h1>
            <p className="text-xs text-gray-500">Import fichier machine LMT65 (.xmlt) — impression etiquettes DK-22205 (62mm)</p>
          </div>
        </div>
        {job && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{totalSelected} / {job.totalCuts} etiquettes</span>
            <button
              onClick={() => setPreviewMode(!previewMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${previewMode ? 'bg-pink-600/20 text-pink-400 border-pink-500/30' : 'bg-white/5 text-gray-400 border-[#2a2d35] hover:border-gray-500'}`}
            >
              <Eye size={14} className="inline mr-1" />
              Apercu
            </button>
            <button
              onClick={handlePrint}
              disabled={totalSelected === 0}
              className="px-4 py-1.5 text-sm font-bold rounded-lg bg-pink-600 hover:bg-pink-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <Printer size={16} />
              Imprimer ({totalSelected})
            </button>
          </div>
        )}
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {!job ? (
          /* Drop zone */
          <div className="max-w-2xl mx-auto mt-16">
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-[#2a2d35] hover:border-pink-500/50 rounded-2xl p-16 text-center cursor-pointer transition-colors group"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-pink-600/10 border border-pink-500/20 flex items-center justify-center group-hover:bg-pink-600/20 transition-colors">
                <Upload size={36} className="text-pink-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Importer un fichier machine</h2>
              <p className="text-sm text-gray-500 mb-4">
                Glissez-deposez un fichier <code className="text-pink-400 bg-pink-600/10 px-1.5 py-0.5 rounded">.xmlt</code> ou <code className="text-pink-400 bg-pink-600/10 px-1.5 py-0.5 rounded">.xml</code> de la LMT65
              </p>
              <p className="text-xs text-gray-600">Format FSTLINE — UTF-16 ou UTF-8</p>
              {loading && <p className="text-sm text-pink-400 mt-4 animate-pulse">Lecture en cours...</p>}
              {error && <p className="text-sm text-red-400 mt-4">{error}</p>}
            </div>
            <input ref={fileRef} type="file" accept=".xml,.xmlt" className="hidden" onChange={handleInputChange} />

            <div className="mt-10 bg-[#181a20] rounded-xl border border-[#2a2d35] p-6">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Printer size={16} className="text-pink-400" />
                Configuration imprimante Brother QL-1050
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d35]">
                  <span className="text-gray-500 block mb-1">Rouleau</span>
                  <span className="text-white font-semibold">DK-22205 — 62mm continu</span>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d35]">
                  <span className="text-gray-500 block mb-1">Taille etiquette</span>
                  <span className="text-white font-semibold">{LABEL_W_MM} x {LABEL_H_MM} mm</span>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d35]">
                  <span className="text-gray-500 block mb-1">Connexion</span>
                  <span className="text-white font-semibold">USB — selectionner "Brother QL-1050" dans le dialogue d'impression</span>
                </div>
                <div className="bg-[#0f1117] rounded-lg p-3 border border-[#2a2d35]">
                  <span className="text-gray-500 block mb-1">Code-barres</span>
                  <span className="text-white font-semibold">Code 128 — scannable</span>
                </div>
              </div>
            </div>
          </div>
        ) : previewMode ? (
          /* Label preview */
          <div className="max-w-3xl mx-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Apercu des etiquettes ({totalSelected})</h2>
              <button onClick={() => setPreviewMode(false)} className="text-xs text-gray-500 hover:text-white">Retour a la liste</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {getSelectedCutsWithBars().map(({ cut, bar }, i) => (
                <LabelPreview key={`${cut.bcod}_${i}`} cut={cut} bar={bar} jobName={job.chantier || fileName} />
              ))}
            </div>
          </div>
        ) : (
          /* Cut list */
          <div className="max-w-5xl mx-auto">
            {/* Job summary */}
            <div className="bg-[#181a20] rounded-xl border border-[#2a2d35] p-5 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <FileText size={18} className="text-pink-400" />
                    <h2 className="text-base font-bold text-white">{fileName}</h2>
                  </div>
                  <div className="flex gap-6 text-xs text-gray-400">
                    <span>Chantier : <strong className="text-white">{job.chantier || '—'}</strong></span>
                    <span>Commande : <strong className="text-white">{job.orderCode || '—'}</strong></span>
                    <span>{job.totalBars} barres — {job.totalCuts} coupes</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={selectAll} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-[#2a2d35] hover:border-gray-500 transition-colors">Tout</button>
                  <button onClick={selectNone} className="text-xs text-gray-500 hover:text-white px-2 py-1 rounded border border-[#2a2d35] hover:border-gray-500 transition-colors">Aucun</button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="text-xs text-gray-500 hover:text-pink-400 px-2 py-1 rounded border border-[#2a2d35] hover:border-pink-500/30 transition-colors"
                  >
                    Autre fichier
                  </button>
                </div>
              </div>
            </div>
            <input ref={fileRef} type="file" accept=".xml,.xmlt" className="hidden" onChange={handleInputChange} />

            {/* Bar list */}
            <div className="space-y-3">
              {job.bars.map((bar) => {
                const expanded = expandedBars.has(bar.id);
                const selectedCount = bar.cuts.filter(c => selectedCuts.has(c.bcod)).length;
                const allSelected = selectedCount === bar.cuts.length;

                return (
                  <div key={bar.id} className="bg-[#181a20] rounded-xl border border-[#2a2d35] overflow-hidden">
                    {/* Bar header */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors"
                      onClick={() => toggleBar(bar.id)}
                    >
                      {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{bar.code}</span>
                          <span className="text-xs text-gray-500">{bar.description}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400 border border-blue-500/30">{bar.brand}</span>
                        </div>
                        <div className="text-[11px] text-gray-500 mt-0.5">
                          Barre {bar.length}mm — {bar.cuts.length} pieces — couleur {bar.innerColor}/{bar.outerColor}
                        </div>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); toggleAllBar(bar); }}
                        className={`text-[10px] font-semibold px-2 py-1 rounded border transition-colors ${allSelected ? 'bg-pink-600/20 text-pink-400 border-pink-500/30' : 'bg-white/5 text-gray-500 border-[#2a2d35] hover:border-gray-500'}`}
                      >
                        {selectedCount}/{bar.cuts.length}
                      </button>
                    </div>

                    {/* Cuts */}
                    {expanded && (
                      <div className="border-t border-[#2a2d35]">
                        {bar.cuts.map((cut, ci) => {
                          const selected = selectedCuts.has(cut.bcod);
                          return (
                            <div
                              key={`${cut.bcod}_${ci}`}
                              className={`flex items-center gap-3 px-5 py-2.5 border-b border-[#1a1d24] last:border-b-0 cursor-pointer transition-colors ${selected ? 'bg-pink-600/5' : 'hover:bg-white/[0.02]'}`}
                              onClick={() => toggleCut(cut.bcod)}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex-none flex items-center justify-center transition-colors ${selected ? 'bg-pink-600 border-pink-500' : 'border-[#3a3d45]'}`}>
                                {selected && (
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2.5 6L5 8.5L9.5 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div className="w-6 text-center">
                                <AngleSvg left={cut.angleLeft} right={cut.angleRight} size={22} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-white">{cut.cid || cut.ref || '—'}</span>
                                  <span className="text-xs text-gray-500">{cut.chantier}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-bold text-white">{cut.il} mm</span>
                                <span className="text-xs text-gray-500 ml-2">{cut.angleLeft === 90 ? '90' : 180 - cut.angleLeft}/{cut.angleRight === 90 ? '90' : 180 - cut.angleRight}°</span>
                              </div>
                              <div className="text-[10px] text-gray-600 font-mono w-24 text-right truncate">{cut.bcod}</div>
                              {cut.labels[0] && (
                                <span className="text-base font-black text-pink-400 border border-pink-500/40 px-1.5 py-0.5 rounded min-w-[28px] text-center leading-none">{cut.labels[0]}</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Label preview card ──────────────────────────────────────────────

function LabelPreview({ cut, bar, jobName }: { cut: FstCut; bar: FstBar; jobName: string }) {
  const bcSrc = barcodeDataUrl(cut.bcod, 0.6, 12);
  const rep = getRepNumber(cut);
  const posLines = getPosLines(cut);

  return (
    <div className="bg-white text-black rounded-lg border border-gray-300 shadow-sm flex flex-col overflow-hidden" style={{ aspectRatio: `${LABEL_W_MM}/${LABEL_H_MM}` }}>
      <div className="flex flex-1 min-h-0 p-2 gap-2">
        {/* Left column: info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="text-[10px] font-black leading-tight truncate">{cut.cid || cut.ref || '—'}</div>
          <div className="text-[9px] font-black text-black truncate">{cut.chantier || jobName}</div>
          <div className="text-[9px] font-black text-black">{cut.il}mm · {cut.angleLeft}/{cut.angleRight}°</div>
          <div className="text-[6px] text-gray-500 truncate">{cut.orderCode} · {bar.code} · {bar.brand}</div>
        </div>
        {/* Right column: REP box */}
        <div className="flex flex-col items-center justify-center border-l border-gray-200 pl-2" style={{ width: '30%' }}>
          <span className="text-[6px] font-bold text-gray-500 tracking-wide">REP</span>
          <span className="text-xl font-black leading-none border-2 border-black px-1.5 py-0.5 min-w-[24px] text-center">{rep}</span>
          {posLines.map((l, i) => <span key={i} className="text-[7px] font-bold text-gray-500 mt-0.5">{l}</span>)}
        </div>
      </div>
      {bcSrc && (
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <img src={bcSrc} alt="" className="flex-1 h-3 object-contain" />
          <span className="text-[5px] text-gray-500 font-mono whitespace-nowrap">{cut.bcod}</span>
        </div>
      )}
    </div>
  );
}
