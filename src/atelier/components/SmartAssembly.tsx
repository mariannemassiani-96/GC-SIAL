import { useState, useEffect, useRef, useCallback } from 'react';
import type { FicheMontage, FercoPiece } from '../types';
import { DEMO_FICHE } from '../types';
import { ArrowLeft, ScanBarcode, CheckCircle2, RotateCcw, Keyboard } from 'lucide-react';

interface SmartAssemblyProps {
  onBack: () => void;
}

type Screen = 'scan' | 'guide' | 'complet';

export function SmartAssembly({ onBack }: SmartAssemblyProps) {
  const [screen, setScreen] = useState<Screen>('scan');
  const [fiche, setFiche] = useState<FicheMontage | null>(null);
  const [scanError, setScanError] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [statJour, setStatJour] = useState(0);
  const scanRef = useRef<HTMLInputElement>(null);

  // ── Stocker les fiches en localStorage ──
  const getDB = useCallback((): Record<string, FicheMontage> => {
    try { return JSON.parse(localStorage.getItem('sial-assembly-db') ?? '{}'); } catch { return {}; }
  }, []);

  const saveDB = useCallback((db: Record<string, FicheMontage>) => {
    localStorage.setItem('sial-assembly-db', JSON.stringify(db));
  }, []);

  // ── Focus auto sur l'input scanner ──
  useEffect(() => {
    if (screen === 'scan') scanRef.current?.focus();
  }, [screen]);

  // ── Traiter un code-barres ──
  const processBarcode = useCallback((code: string) => {
    setScanError('');
    const db = getDB();
    const data = db[code];
    if (!data) {
      setScanError(`Code non trouvé : ${code}. Utilisez le mode démo (bouton ci-dessous) ou importez des fiches.`);
      setTimeout(() => setScanError(''), 5000);
      return;
    }
    setFiche({ ...data });
    setStatJour((s) => s + 1);
    setScreen('guide');
  }, [getDB]);

  // ── Charger la démo ──
  const loadDemo = useCallback(() => {
    const demoData = structuredClone(DEMO_FICHE);
    demoData.etape_courante = 0;
    demoData.ferco.forEach((f) => { f.fait = false; });
    const db = getDB();
    db[demoData.barcode] = demoData;
    saveDB(db);
    setFiche(demoData);
    setStatJour((s) => s + 1);
    setScreen('guide');
  }, [getDB, saveDB]);

  // ── Valider une étape ──
  const validerEtape = useCallback(() => {
    if (!fiche) return;
    const next = structuredClone(fiche);
    const etape = next.etape_courante;
    if (etape < next.ferco.length) {
      next.ferco[etape].fait = true;
      next.etape_courante = etape + 1;
    }
    // Persist
    const db = getDB();
    db[next.barcode] = next;
    saveDB(db);
    setFiche(next);
    if (next.etape_courante >= next.ferco.length) setScreen('complet');
  }, [fiche, getDB, saveDB]);

  // ── Sauter à une étape ──
  const jumpEtape = useCallback((i: number) => {
    if (!fiche) return;
    const next = { ...fiche, etape_courante: i };
    setFiche(next);
  }, [fiche]);

  // ── Reset ──
  const resetMontage = useCallback(() => {
    if (!fiche) return;
    const next = structuredClone(fiche);
    next.ferco.forEach((f) => { f.fait = false; });
    next.etape_courante = 0;
    const db = getDB();
    db[next.barcode] = next;
    saveDB(db);
    setFiche(next);
    setScreen('guide');
  }, [fiche, getDB, saveDB]);

  // ── Scan input handler ──
  const handleScanInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const code = (e.target as HTMLInputElement).value.trim();
      if (code.length >= 6) {
        processBarcode(code);
        (e.target as HTMLInputElement).value = '';
      }
    }
    if (e.key === 'F1') {
      e.preventDefault();
      loadDemo();
    }
  }, [processBarcode, loadDemo]);

  // ── ÉCRAN SCAN ──
  if (screen === 'scan') {
    return (
      <div className="min-h-screen bg-[#07090c] flex flex-col">
        <Header onBack={onBack} ficheInfo="" />
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#c8a84b]" style={{ fontFamily: 'system-ui' }}>SIAL</h1>
            <p className="text-sm text-[#6b8099] tracking-widest mt-1">ATELIER MONTAGE</p>
          </div>

          <div className="bg-[#131a23] border-2 border-[#263447] rounded-xl p-6 text-center max-w-sm w-full">
            <ScanBarcode size={48} className="mx-auto text-[#4b8fc8] mb-3" />
            <h2 className="text-lg font-bold text-white mb-1">SCANNER LA FICHE</h2>
            <p className="text-sm text-[#6b8099]">Pointez le lecteur vers le code-barres PRO F2</p>
            <input
              ref={scanRef}
              type="text"
              autoComplete="off"
              onKeyDown={handleScanInput}
              className="absolute opacity-0 w-px h-px"
            />
          </div>

          {scanError && (
            <div className="bg-[#c84b4b]/10 border border-[#c84b4b] rounded-lg p-3 text-sm text-[#c84b4b] text-center max-w-sm w-full">
              {scanError}
            </div>
          )}

          <div className="flex gap-3">
            <div className="bg-[#131a23] border border-[#1e2a3a] rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-[#c8a84b]">{statJour}</p>
              <p className="text-[10px] text-[#6b8099] tracking-wider">AUJOURD'HUI</p>
            </div>
            <div className="bg-[#131a23] border border-[#1e2a3a] rounded-lg px-4 py-3 text-center">
              <p className="text-2xl font-bold text-[#c8a84b]">{Object.keys(getDB()).length}</p>
              <p className="text-[10px] text-[#6b8099] tracking-wider">EN MEMOIRE</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setShowManual(true)} className="flex items-center gap-2 px-4 py-2.5 border border-[#263447] rounded-lg text-sm text-[#6b8099] hover:text-[#4b8fc8] hover:border-[#4b8fc8] transition-colors">
              <Keyboard size={14} /> Saisie manuelle
            </button>
            <button onClick={loadDemo} className="flex items-center gap-2 px-4 py-2.5 bg-[#c8a84b]/10 border border-[#c8a84b]/30 rounded-lg text-sm text-[#c8a84b] hover:bg-[#c8a84b]/20 transition-colors">
              Mode démo (F1)
            </button>
          </div>
        </div>

        {/* Modal saisie manuelle */}
        {showManual && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowManual(false)}>
            <div className="bg-[#131a23] border border-[#263447] rounded-xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-3">Saisie manuelle</h3>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && manualCode.length >= 6) { processBarcode(manualCode); setShowManual(false); setManualCode(''); } }}
                placeholder="Code-barres..."
                autoFocus
                className="w-full px-4 py-3 bg-[#0d1117] border border-[#263447] rounded-lg text-[#c8a84b] text-center text-xl font-mono focus:border-[#4b8fc8] outline-none mb-3"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowManual(false)} className="flex-1 py-2.5 border border-[#263447] rounded-lg text-sm text-[#6b8099]">Annuler</button>
                <button onClick={() => { if (manualCode.length >= 6) { processBarcode(manualCode); setShowManual(false); setManualCode(''); } }} className="flex-1 py-2.5 bg-[#c8a84b] rounded-lg text-sm font-bold text-black">VALIDER</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── ÉCRAN COMPLET ──
  if (screen === 'complet' && fiche) {
    return (
      <div className="min-h-screen bg-[#07090c] flex flex-col">
        <Header onBack={onBack} ficheInfo={`${fiche.lot} pos${fiche.pos}`} />
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center">
          <CheckCircle2 size={72} className="text-[#4bc87a]" />
          <h2 className="text-3xl font-bold text-[#4bc87a] tracking-wider">MONTAGE TERMINE</h2>
          <p className="text-sm text-[#6b8099]">
            {fiche.lot} | {fiche.type_ouverture} | {fiche.lff_mm}x{fiche.hff_mm}mm | {fiche.ferco.length} pieces
          </p>
          <div className="flex gap-3">
            <button onClick={resetMontage} className="flex items-center gap-2 px-5 py-3 border border-[#263447] rounded-lg text-sm text-[#6b8099] hover:text-white transition-colors">
              <RotateCcw size={14} /> Recommencer
            </button>
            <button onClick={() => { setFiche(null); setScreen('scan'); }} className="px-6 py-3 bg-[#c8a84b] rounded-lg text-sm font-bold text-black tracking-wider">
              MENUISERIE SUIVANTE
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── ÉCRAN GUIDAGE ──
  if (!fiche) return null;
  const etape = fiche.etape_courante;
  const piece = fiche.ferco[etape];
  const nbFait = fiche.ferco.filter((f) => f.fait).length;

  return (
    <div className="min-h-screen bg-[#07090c] flex flex-col">
      <Header onBack={onBack} ficheInfo={`${fiche.lot} pos${fiche.pos}`} />

      <div className="flex-1 flex overflow-hidden">
        {/* ── Gauche: schéma SVG ── */}
        <div className="w-[42%] bg-[#0d1117] border-r border-[#1e2a3a] flex flex-col shrink-0">
          <div className="px-3 py-2 border-b border-[#1e2a3a] text-[10px] tracking-widest text-[#6b8099] font-semibold">
            SCHEMA DE MONTAGE
          </div>
          <div className="flex-1 flex items-center justify-center p-3">
            <SchemaSVG fiche={fiche} activePiece={piece} />
          </div>
          <div className="px-3 py-2 border-t border-[#1e2a3a] text-[10px] text-[#3a4f65]">
            {[fiche.matiere, fiche.conf, fiche.teinte, fiche.poids_kg ? `${fiche.poids_kg}kg` : ''].filter(Boolean).join(' | ')}
          </div>
        </div>

        {/* ── Droite: info + étapes ── */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Bannière OF */}
          <div className="bg-[#131a23] border-b border-[#1e2a3a] px-4 py-2.5 shrink-0">
            <p className="text-[10px] text-[#c8a84b] font-mono tracking-wider">{fiche.commande} | {fiche.barcode.slice(-6)}</p>
            <p className="text-base font-bold text-white mt-0.5">{fiche.type_ouverture}</p>
            <p className="text-xs text-[#6b8099] mt-0.5">
              {[fiche.gamme, `${fiche.lff_mm}x${fiche.hff_mm}mm`, fiche.sens ? `Sens ${fiche.sens}` : '', fiche.local].filter(Boolean).join(' | ')}
            </p>
          </div>

          {/* Étape courante */}
          {piece && (
            <div className="mx-3 mt-3 bg-[#131a23] border border-[#263447] rounded-xl p-4 shrink-0">
              <p className="text-[10px] tracking-widest text-[#6b8099] font-semibold mb-1">
                ETAPE {etape + 1} / {fiche.ferco.length}
              </p>
              <p className="text-sm font-bold font-mono text-[#c8a84b]">{piece.ref}</p>
              <p className="text-sm text-white mt-1">{piece.desc}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#4bc87a] text-[#4bc87a] bg-[#4bc87a]/8 font-mono">x{piece.qte}</span>
                <span className="text-[10px] px-2 py-0.5 rounded border border-[#4b8fc8] text-[#4b8fc8] bg-[#4b8fc8]/8 font-mono">{piece.finition}</span>
                {piece.casier > 0 && <span className="text-[10px] px-2 py-0.5 rounded border border-[#c8a84b] text-[#c8a84b] bg-[#c8a84b]/8 font-mono">CASIER {piece.casier}</span>}
              </div>
              {/* LED indicator */}
              <div className="flex items-center gap-2 mt-3 px-2 py-2 bg-[#0d1117] rounded-lg border border-[#1e2a3a]" style={{ borderColor: piece.couleur + '44' }}>
                <div className="w-3.5 h-3.5 rounded-full shrink-0" style={{ backgroundColor: piece.couleur, boxShadow: `0 0 8px ${piece.couleur}` }} />
                <span className="text-xs text-[#6b8099]">Casier <strong className="text-white">{piece.casier} — {piece.label}</strong></span>
              </div>
            </div>
          )}

          {/* Bouton FAIT */}
          <button
            onClick={validerEtape}
            className="mx-3 mt-3 py-4 bg-[#4bc87a] rounded-xl text-black font-bold text-xl tracking-widest shrink-0 active:scale-[0.98] transition-transform"
          >
            FAIT
          </button>

          {/* Liste pièces */}
          <div className="px-3 py-2 border-t border-[#1e2a3a] mt-3 text-[10px] tracking-widest text-[#6b8099] font-semibold shrink-0">
            PIECES — {nbFait}/{fiche.ferco.length}
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            {fiche.ferco.map((p, i) => (
              <button
                key={`${p.ref}-${i}`}
                onClick={() => jumpEtape(i)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 text-left transition-all border
                  ${i === etape ? 'bg-[#131a23] border-[#c8a84b]' : p.fait ? 'opacity-35 border-transparent' : 'border-transparent hover:bg-[#131a23]/50'}`}
              >
                <div className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: p.couleur }} />
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-mono font-semibold text-[#c8a84b] ${p.fait ? 'line-through' : ''}`}>{p.ref}</p>
                  <p className="text-[11px] text-[#6b8099] truncate">{p.desc}</p>
                </div>
                <span className="text-sm font-bold text-white shrink-0">x{p.qte}</span>
                <span className="text-sm shrink-0">{p.fait ? '✅' : i === etape ? '👉' : '○'}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────

function Header({ onBack, ficheInfo }: { onBack: () => void; ficheInfo: string }) {
  return (
    <header className="bg-[#0d1117] border-b border-[#263447] px-4 h-[52px] flex items-center justify-between shrink-0 relative">
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#c8a84b] to-[#4b8fc8]" />
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-[#6b8099] hover:text-white transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <span className="text-sm font-bold tracking-widest text-[#c8a84b]">SIAL</span>
          <span className="text-[8px] text-[#6b8099] tracking-wider ml-1">SMART ASSEMBLY</span>
        </div>
      </div>
      {ficheInfo && <span className="text-[10px] font-mono text-[#6b8099]">{ficheInfo}</span>}
    </header>
  );
}

// ── Schéma SVG dynamique ─────────────────────────────────────────────

function SchemaSVG({ fiche, activePiece }: { fiche: FicheMontage; activePiece?: FercoPiece }) {
  const W = 300, H = 380;
  const sensR = fiche.sens !== 'L';
  const fr = { x: 22, y: 26, w: 256, h: 330 };
  const vx = fr.x + 10, vy = fr.y + 10, vw = fr.w - 20, vh = fr.h - 20;
  const fraX = sensR ? vx + vw : vx;

  const getPiecePos = (p: FercoPiece): { x: number; y: number; w: number; h: number } | null => {
    const desc = p.desc.toLowerCase();
    if (/cremone/i.test(desc)) { const cH = Math.min(vh * 0.6, 200); return { x: sensR ? fraX - 7 : fraX, y: vy + (vh - cH) / 2, w: 7, h: cH }; }
    if (/renvoi.angle/i.test(desc)) return { x: sensR ? vx + 2 : vx + vw - 42, y: vy, w: 40, h: 8 };
    if (/compas/i.test(desc) && !/cache|palier|support|axe|douille|fiche/i.test(desc)) return { x: sensR ? vx : vx + vw - 7, y: vy + 12, w: 7, h: Math.min(vh * 0.4, 160) };
    if (/verrouillage lat/i.test(desc)) return { x: sensR ? vx : vx + vw - 7, y: vy + 18, w: 7, h: Math.min(vh * 0.35, 140) };
    if (/verrouilleur anti/i.test(desc)) return { x: sensR ? fraX - 7 : fraX, y: vy + 12, w: 7, h: 20 };
    if (/gache galet|gache ad/i.test(desc)) return { x: sensR ? fr.x : fr.x + fr.w - 8, y: vy + vh * 0.35, w: 8, h: 10 };
    if (/gache tringle|gache batt/i.test(desc)) return { x: sensR ? fr.x : fr.x + fr.w - 8, y: vy + vh * 0.65, w: 8, h: 14 };
    if (/limiteur|verrou/i.test(desc)) return { x: sensR ? fraX - 6 : fraX, y: vy + vh - 60, w: 6, h: 20 };
    return null;
  };

  const pgX = sensR ? fraX - 20 : fraX + 12;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full max-h-[340px]">
      <rect width={W} height={H} fill="#07090c" rx="4" />
      <text x={W / 2} y="18" fill="#3a4f65" fontFamily="system-ui" fontSize="11" fontWeight="600" textAnchor="middle">
        {fiche.lff_mm}x{fiche.hff_mm}mm {fiche.conf}
      </text>
      {/* Dormant */}
      <rect x={fr.x} y={fr.y} width={fr.w} height={fr.h} fill="none" stroke="#253d55" strokeWidth="16" rx="2" />
      <rect x={fr.x} y={fr.y} width={fr.w} height={fr.h} fill="none" stroke="#1a2a3a" strokeWidth="10" rx="2" />
      {/* Vantail */}
      <rect x={vx} y={vy} width={vw} height={vh} fill="#060b12" stroke="#1e2d3d" strokeWidth="6" rx="1" />
      <rect x={vx + 10} y={vy + 10} width={vw - 20} height={vh - 20} fill="#040810" stroke="#0f1820" strokeWidth="1" rx="1" />
      {/* Poignée */}
      <rect x={pgX} y={vy + vh / 2 - 20} width="9" height="40" fill="#2a3848" rx="4" opacity=".7" />

      {/* Pièces */}
      {fiche.ferco.map((p, i) => {
        const pos = getPiecePos(p);
        if (!pos) return null;
        const isActive = activePiece?.ref === p.ref;
        return (
          <rect
            key={`${p.ref}-${i}`}
            x={pos.x} y={pos.y} width={pos.w} height={pos.h}
            fill={p.couleur} rx="2"
            opacity={isActive ? 1 : 0.15}
            style={isActive ? { filter: `drop-shadow(0 0 6px ${p.couleur})` } : undefined}
          />
        );
      })}

      {/* Cote largeur */}
      <line x1={fr.x} y1={fr.y + fr.h + 14} x2={fr.x + fr.w} y2={fr.y + fr.h + 14} stroke="#1e2d3d" strokeWidth="1" />
      <text x={fr.x + fr.w / 2} y={fr.y + fr.h + 26} fill="#2a4060" fontFamily="monospace" fontSize="9" textAnchor="middle">
        {fiche.lff_mm} mm
      </text>
    </svg>
  );
}
