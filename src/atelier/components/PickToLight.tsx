import { useState } from 'react';
import { CASIERS } from '../types';
import type { CasierConfig } from '../types';
import { ArrowLeft, Lightbulb, LightbulbOff, Zap, Settings } from 'lucide-react';

interface PickToLightProps {
  onBack: () => void;
}

interface LedState {
  on: boolean;
  color: string;
}

export function PickToLight({ onBack }: PickToLightProps) {
  const [leds, setLeds] = useState<Record<number, LedState>>(
    Object.fromEntries(CASIERS.map((c) => [c.id, { on: false, color: c.couleur }])),
  );
  const [luminosite, setLuminosite] = useState(128);
  const [testMode, setTestMode] = useState(false);

  const toggleLed = (casier: number) => {
    setLeds((prev) => ({
      ...prev,
      [casier]: { ...prev[casier], on: !prev[casier]?.on },
    }));
  };

  const allOn = () => {
    setLeds((prev) => {
      const next = { ...prev };
      for (const c of CASIERS) next[c.id] = { on: true, color: c.couleur };
      return next;
    });
  };

  const allOff = () => {
    setLeds((prev) => {
      const next = { ...prev };
      for (const c of CASIERS) next[c.id] = { ...next[c.id], on: false };
      return next;
    });
  };

  // Test séquentiel
  const runTest = () => {
    setTestMode(true);
    allOff();
    let i = 0;
    const interval = setInterval(() => {
      if (i >= CASIERS.length) {
        clearInterval(interval);
        setTimeout(() => { allOff(); setTestMode(false); }, 500);
        return;
      }
      setLeds((prev) => {
        const next = { ...prev };
        // Éteindre le précédent
        if (i > 0) next[CASIERS[i - 1].id] = { ...next[CASIERS[i - 1].id], on: false };
        // Allumer le courant
        next[CASIERS[i].id] = { on: true, color: CASIERS[i].couleur };
        return next;
      });
      i++;
    }, 300);
  };

  const nbOn = Object.values(leds).filter((l) => l.on).length;

  return (
    <div className="min-h-screen bg-[#07090c] flex flex-col">
      {/* Header */}
      <header className="bg-[#0d1117] border-b border-[#263447] px-4 h-[52px] flex items-center justify-between shrink-0 relative">
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#c84b7a] to-[#4bc87a]" />
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-[#6b8099] hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <span className="text-sm font-bold tracking-widest text-[#c84b7a]">SIAL</span>
            <span className="text-[8px] text-[#6b8099] tracking-wider ml-1">PICK-TO-LIGHT</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6b8099]">
          <div className={`w-2 h-2 rounded-full ${nbOn > 0 ? 'bg-[#4bc87a]' : 'bg-[#3a4f65]'}`} />
          {nbOn} LED{nbOn > 1 ? 's' : ''} active{nbOn > 1 ? 's' : ''}
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* ── Grille des casiers ── */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white tracking-wider">CASIERS (14)</h2>
            <div className="flex gap-2">
              <button onClick={allOn} className="px-3 py-1.5 text-xs bg-[#4bc87a]/10 border border-[#4bc87a]/30 text-[#4bc87a] rounded-lg hover:bg-[#4bc87a]/20 transition-colors">
                <Lightbulb size={12} className="inline mr-1" /> Tout allumer
              </button>
              <button onClick={allOff} className="px-3 py-1.5 text-xs bg-[#c84b4b]/10 border border-[#c84b4b]/30 text-[#c84b4b] rounded-lg hover:bg-[#c84b4b]/20 transition-colors">
                <LightbulbOff size={12} className="inline mr-1" /> Tout eteindre
              </button>
              <button onClick={runTest} disabled={testMode} className="px-3 py-1.5 text-xs bg-[#4b8fc8]/10 border border-[#4b8fc8]/30 text-[#4b8fc8] rounded-lg hover:bg-[#4b8fc8]/20 transition-colors disabled:opacity-40">
                <Zap size={12} className="inline mr-1" /> Test séquentiel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {CASIERS.map((casier) => {
              const led = leds[casier.id];
              const isOn = led?.on ?? false;
              return (
                <CasierCard
                  key={casier.id}
                  casier={casier}
                  isOn={isOn}
                  luminosite={luminosite}
                  onToggle={() => toggleLed(casier.id)}
                />
              );
            })}
          </div>
        </div>

        {/* ── Panneau config ── */}
        <div className="lg:w-72 bg-[#0d1117] border-t lg:border-t-0 lg:border-l border-[#1e2a3a] p-4 shrink-0">
          <h3 className="text-xs tracking-widest text-[#6b8099] font-semibold mb-4 flex items-center gap-2">
            <Settings size={12} /> CONFIGURATION
          </h3>

          {/* Luminosité */}
          <div className="mb-4">
            <label className="text-xs text-[#6b8099] block mb-2">Luminosité : {luminosite}/255</label>
            <input
              type="range"
              min={10}
              max={255}
              value={luminosite}
              onChange={(e) => setLuminosite(Number(e.target.value))}
              className="w-full h-2 bg-[#1e2a3a] rounded-lg appearance-none cursor-pointer accent-[#c84b7a]"
            />
          </div>

          {/* Infos hardware */}
          <div className="bg-[#131a23] border border-[#1e2a3a] rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between"><span className="text-[#6b8099]">GPIO</span><span className="text-white font-mono">18</span></div>
            <div className="flex justify-between"><span className="text-[#6b8099]">LEDs</span><span className="text-white font-mono">20 pixels WS2812B</span></div>
            <div className="flex justify-between"><span className="text-[#6b8099]">Casiers</span><span className="text-white font-mono">{CASIERS.length}</span></div>
            <div className="flex justify-between"><span className="text-[#6b8099]">Mode</span><span className="text-[#c8a84b] font-mono">Simulation web</span></div>
          </div>

          {/* Mapping casiers */}
          <h4 className="text-xs tracking-widest text-[#6b8099] font-semibold mt-4 mb-2">MAPPING LED</h4>
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {CASIERS.map((c) => (
              <div key={c.id} className="flex items-center gap-2 text-[10px] px-2 py-1 rounded bg-[#131a23]">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: c.couleur }} />
                <span className="text-[#6b8099] w-4">{c.id}</span>
                <span className="text-white flex-1 truncate">{c.label}</span>
                <span className="text-[#3a4f65] font-mono">LED {c.ledIndex}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Carte casier ─────────────────────────────────────────────────────

function CasierCard({ casier, isOn, luminosite, onToggle }: {
  casier: CasierConfig;
  isOn: boolean;
  luminosite: number;
  onToggle: () => void;
}) {
  const opacity = isOn ? luminosite / 255 : 0;
  return (
    <button
      onClick={onToggle}
      className={`relative p-4 rounded-xl border-2 text-left transition-all
        ${isOn ? 'border-opacity-60 bg-opacity-10' : 'border-[#1e2a3a] bg-[#0d1117]'}
        hover:scale-[1.02]`}
      style={isOn ? {
        borderColor: casier.couleur,
        backgroundColor: casier.couleur + '15',
        boxShadow: `0 0 20px ${casier.couleur}33`,
      } : undefined}
    >
      {/* LED virtuelle */}
      <div
        className="w-6 h-6 rounded-full mb-3 transition-all duration-200"
        style={{
          backgroundColor: isOn ? casier.couleur : '#1e2a3a',
          boxShadow: isOn ? `0 0 12px ${casier.couleur}, 0 0 24px ${casier.couleur}66` : 'none',
          opacity: isOn ? opacity : 0.3,
        }}
      />
      <p className="text-xs font-bold text-white mb-0.5">Casier {casier.id}</p>
      <p className="text-[10px] text-[#6b8099]">{casier.label}</p>
      <p className="text-[9px] text-[#3a4f65] mt-1 truncate">{casier.contenu}</p>

      {/* Status */}
      <div className={`absolute top-2 right-2 w-2 h-2 rounded-full ${isOn ? 'bg-[#4bc87a]' : 'bg-[#1e2a3a]'}`} />
    </button>
  );
}
