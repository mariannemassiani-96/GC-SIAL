import { useRef, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Home, Settings, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Building2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Plan, Objet, Contrainte, Flux, ContrainteType, NiveauId } from './types';
import type { Preset } from './presets';
import { presetToObjet } from './presets';
import { Canvas, type CanvasHandle } from './Canvas';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Stats } from './Stats';
import { verifierContraintes } from './geometry';
import { useCustomPresets } from './store';

interface EditeurProps {
  plan: Plan;
  onUpdate: (updates: Partial<Plan> | ((p: Plan) => Plan)) => void;
  onBack: () => void;
  onHome: () => void;
}

export function Editeur({ plan, onUpdate, onBack, onHome }: EditeurProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [niveauActif, setNiveauActif] = useState<NiveauId>(plan.niveaux[0]?.id ?? 'rdc');
  const [showFlux, setShowFlux] = useState(true);
  const [showContraintes, setShowContraintes] = useState(true);
  const [showOperateurs, setShowOperateurs] = useState(true);
  const [showAutresNiveaux, setShowAutresNiveaux] = useState(true);
  const [showBatimentParams, setShowBatimentParams] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const dragPresetRef = useRef<Preset | null>(null);
  const { customs, addCustom, removeCustom } = useCustomPresets();

  const violations = useMemo(() => verifierContraintes(plan), [plan]);

  // --- Mutations ---
  const updateObjet = useCallback((id: string, patch: Partial<Objet>) => {
    onUpdate((p) => ({ ...p, objets: p.objets.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }, [onUpdate]);

  const addObjet = useCallback((o: Objet) => {
    onUpdate((p) => ({ ...p, objets: [...p.objets, o] }));
  }, [onUpdate]);

  const deleteObjet = useCallback((id: string) => {
    onUpdate((p) => ({
      ...p,
      objets: p.objets.filter((o) => o.id !== id),
      flux: p.flux.filter((f) => f.from !== id && f.to !== id),
      contraintes: p.contraintes.filter((c) => c.objetA !== id && c.objetB !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }, [onUpdate, selectedId]);

  const addPreset = useCallback((p: Preset) => {
    // Place au centre du bâtiment
    const cx = plan.batiment.x + plan.batiment.largeur / 2 - p.largeur / 2;
    const cy = plan.batiment.y + plan.batiment.hauteur / 2 - p.hauteur / 2;
    const obj = presetToObjet(p, uuidv4(), niveauActif, Math.round(cx), Math.round(cy));
    addObjet(obj);
    setSelectedId(obj.id);
  }, [addObjet, niveauActif, plan.batiment]);

  const onDragStart = useCallback((p: Preset, e: React.DragEvent) => {
    dragPresetRef.current = p;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', p.nom);
  }, []);

  const onDropAt = useCallback((clientX: number, clientY: number) => {
    const preset = dragPresetRef.current;
    if (!preset || !canvasRef.current) return;
    const coord = canvasRef.current.clientToSite(clientX, clientY);
    if (!coord) return;
    const x = Math.round(coord.x - preset.largeur / 2);
    const y = Math.round(coord.y - preset.hauteur / 2);
    const obj = presetToObjet(preset, uuidv4(), niveauActif, x, y);
    addObjet(obj);
    setSelectedId(obj.id);
    dragPresetRef.current = null;
  }, [addObjet, niveauActif]);

  const addFlux = useCallback((from: string, to: string, debit: number) => {
    const f: Flux = { id: uuidv4(), from, to, debit };
    onUpdate((p) => ({ ...p, flux: [...p.flux, f] }));
  }, [onUpdate]);

  const deleteFlux = useCallback((id: string) => {
    onUpdate((p) => ({ ...p, flux: p.flux.filter((f) => f.id !== id) }));
  }, [onUpdate]);

  const addContrainte = useCallback((type: ContrainteType, a: string, b: string, valeur?: number) => {
    const c: Contrainte = { id: uuidv4(), type, objetA: a, objetB: b, valeur };
    onUpdate((p) => ({ ...p, contraintes: [...p.contraintes, c] }));
  }, [onUpdate]);

  const deleteContrainte = useCallback((id: string) => {
    onUpdate((p) => ({ ...p, contraintes: p.contraintes.filter((c) => c.id !== id) }));
  }, [onUpdate]);

  const selectedObjet = plan.objets.find((o) => o.id === selectedId) ?? null;

  const duplicateSelected = useCallback(() => {
    if (!selectedObjet) return;
    const copy: Objet = {
      ...selectedObjet,
      id: uuidv4(),
      x: selectedObjet.x + 50,
      y: selectedObjet.y + 50,
    };
    addObjet(copy);
    setSelectedId(copy.id);
  }, [selectedObjet, addObjet]);

  const rotateSelected = useCallback(() => {
    if (!selectedObjet) return;
    const rot = ((selectedObjet.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    updateObjet(selectedObjet.id, { rotation: rot });
  }, [selectedObjet, updateObjet]);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f1117]">
      {/* Header */}
      <div className="border-b border-[#252830] bg-[#14161d] px-4 py-2 flex items-center gap-3 shrink-0">
        <button onClick={onHome} className="text-gray-500 hover:text-gray-200" title="Accueil">
          <Home size={16} />
        </button>
        <button onClick={onBack} className="text-gray-500 hover:text-gray-200 flex items-center gap-1 text-xs">
          <ArrowLeft size={14} /> Liste
        </button>
        <div className="h-4 w-px bg-[#252830]" />

        <input
          value={plan.nom}
          onChange={(e) => onUpdate({ nom: e.target.value })}
          className="bg-transparent text-sm font-semibold text-gray-100 outline-none border-b border-transparent focus:border-blue-500 min-w-0 flex-1"
        />

        {/* Niveau switcher */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          {plan.niveaux
            .sort((a, b) => a.ordre - b.ordre)
            .map((n) => (
              <button
                key={n.id}
                onClick={() => setNiveauActif(n.id)}
                className={`px-3 py-1 text-xs ${
                  n.id === niveauActif
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {n.nom}
              </button>
            ))}
        </div>

        {/* Zoom buttons */}
        <div className="flex items-center gap-0.5">
          <IconButton title="Zoom +" onClick={() => canvasRef.current?.zoomIn()}>
            <ZoomIn size={14} />
          </IconButton>
          <IconButton title="Zoom −" onClick={() => canvasRef.current?.zoomOut()}>
            <ZoomOut size={14} />
          </IconButton>
          <IconButton title="Voir tout le site" onClick={() => canvasRef.current?.fitSite()}>
            <Maximize size={14} />
          </IconButton>
          <IconButton title="Voir le bâtiment" onClick={() => canvasRef.current?.fitBatiment()}>
            <Building2 size={14} />
          </IconButton>
        </div>

        <div className="h-4 w-px bg-[#252830]" />

        {/* Toggles */}
        <Toggle on={showFlux} onToggle={() => setShowFlux(!showFlux)} label="Flux" />
        <Toggle on={showContraintes} onToggle={() => setShowContraintes(!showContraintes)} label="Contraintes" />
        <Toggle on={showOperateurs} onToggle={() => setShowOperateurs(!showOperateurs)} label="Opérateurs" />
        <Toggle on={showAutresNiveaux} onToggle={() => setShowAutresNiveaux(!showAutresNiveaux)} label="Autres niv." />

        <IconButton title="Paramètres bâtiment" onClick={() => setShowBatimentParams(!showBatimentParams)}>
          <Settings size={14} />
        </IconButton>
      </div>

      {/* Main area */}
      <div className="flex-1 flex min-h-0">
        <div className="w-64 shrink-0">
          <Library
            customs={customs}
            onAddCustom={addCustom}
            onRemoveCustom={removeCustom}
            onAddPreset={addPreset}
            onDragStart={onDragStart}
          />
        </div>

        <div className="flex-1 relative min-w-0">
          <Canvas
            ref={canvasRef}
            plan={plan}
            selectedId={selectedId}
            niveauActif={niveauActif}
            violations={violations}
            onSelect={setSelectedId}
            onUpdateObjet={updateObjet}
            onDeleteObjet={deleteObjet}
            onDropAt={onDropAt}
            showFlux={showFlux}
            showContraintes={showContraintes}
            showOperateurs={showOperateurs}
            showAutresNiveaux={showAutresNiveaux}
          />

          {showBatimentParams && (
            <BatimentParams
              plan={plan}
              niveauActif={niveauActif}
              onUpdate={onUpdate}
              onClose={() => setShowBatimentParams(false)}
            />
          )}
        </div>

        <div className="w-72 shrink-0">
          <Inspector
            plan={plan}
            objet={selectedObjet}
            onUpdate={(patch) => selectedObjet && updateObjet(selectedObjet.id, patch)}
            onDelete={() => selectedObjet && deleteObjet(selectedObjet.id)}
            onRotate={rotateSelected}
            onDuplicate={duplicateSelected}
            onSaveAsPreset={addCustom}
            onAddFlux={addFlux}
            onDeleteFlux={deleteFlux}
            onAddContrainte={addContrainte}
            onDeleteContrainte={deleteContrainte}
          />
        </div>

        <div className="w-64 shrink-0">
          <Stats
            plan={plan}
            violations={violations}
            onFocus={(id) => {
              setSelectedId(id);
              canvasRef.current?.fitObjet(id);
            }}
          />
        </div>
      </div>
    </div>
  );
}

function IconButton({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded text-gray-400 hover:bg-[#252830] hover:text-gray-200"
    >
      {children}
    </button>
  );
}

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] ${
        on ? 'bg-[#252830] text-gray-200' : 'text-gray-500 hover:text-gray-300'
      }`}
    >
      {on ? <Eye size={12} /> : <EyeOff size={12} />}
      {label}
    </button>
  );
}

// ------ Panneau paramètres bâtiment ------

interface BatimentParamsProps {
  plan: Plan;
  niveauActif: NiveauId;
  onUpdate: (updates: Partial<Plan> | ((p: Plan) => Plan)) => void;
  onClose: () => void;
}

function BatimentParams({ plan, niveauActif, onUpdate, onClose }: BatimentParamsProps) {
  const niveau = plan.niveaux.find((n) => n.id === niveauActif);

  return (
    <div className="absolute top-3 right-3 w-72 bg-[#14161d] border border-[#252830] rounded shadow-2xl z-10">
      <div className="flex items-center justify-between p-3 border-b border-[#252830]">
        <h3 className="text-xs font-semibold text-gray-300">Paramètres bâtiment & site</h3>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-200 text-lg leading-none">×</button>
      </div>
      <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
        <Section label="Site (cm)">
          <div className="grid grid-cols-2 gap-2">
            <MetersInput
              label="Largeur"
              valueCm={plan.largeurSite}
              onChange={(v) => onUpdate({ largeurSite: v })}
            />
            <MetersInput
              label="Hauteur"
              valueCm={plan.hauteurSite}
              onChange={(v) => onUpdate({ hauteurSite: v })}
            />
          </div>
        </Section>

        <Section label="Bâtiment">
          <div className="grid grid-cols-2 gap-2">
            <MetersInput
              label="Largeur"
              valueCm={plan.batiment.largeur}
              onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, largeur: v } }))}
            />
            <MetersInput
              label="Profondeur"
              valueCm={plan.batiment.hauteur}
              onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, hauteur: v } }))}
            />
            <MetersInput
              label="Position X"
              valueCm={plan.batiment.x}
              onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, x: v } }))}
            />
            <MetersInput
              label="Position Y"
              valueCm={plan.batiment.y}
              onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, y: v } }))}
            />
          </div>
          <MetersInput
            label="Épaisseur murs"
            valueCm={plan.batiment.epaisseurMurs}
            onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, epaisseurMurs: v } }))}
          />
        </Section>

        <Section label={`Niveau actif : ${niveau?.nom ?? ''}`}>
          {niveau && (
            <>
              <label className="block">
                <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Nom du niveau</span>
                <input
                  value={niveau.nom}
                  onChange={(e) =>
                    onUpdate((p) => ({
                      ...p,
                      niveaux: p.niveaux.map((n) => (n.id === niveau.id ? { ...n, nom: e.target.value } : n)),
                    }))
                  }
                  className="input"
                />
              </label>
              <MetersInput
                label="Hauteur sous plafond"
                valueCm={niveau.hauteurSousPlafond}
                onChange={(v) =>
                  onUpdate((p) => ({
                    ...p,
                    niveaux: p.niveaux.map((n) => (n.id === niveau.id ? { ...n, hauteurSousPlafond: v } : n)),
                  }))
                }
              />
            </>
          )}
        </Section>

        <Section label="Grille (cm)">
          <select
            value={plan.tailleGrille}
            onChange={(e) => onUpdate({ tailleGrille: Number(e.target.value) })}
            className="input"
          >
            <option value={5}>5 cm</option>
            <option value={10}>10 cm</option>
            <option value={25}>25 cm</option>
            <option value={50}>50 cm</option>
            <option value={100}>1 m</option>
          </select>
        </Section>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">{label}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function MetersInput({ label, valueCm, onChange }: { label: string; valueCm: number; onChange: (cm: number) => void }) {
  const [local, setLocal] = useState((valueCm / 100).toFixed(2));
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">{label} (m)</span>
      <input
        type="number"
        step={0.01}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(local.replace(',', '.'));
          if (!isNaN(n)) onChange(Math.round(n * 100));
          else setLocal((valueCm / 100).toFixed(2));
        }}
        onFocus={() => setLocal((valueCm / 100).toFixed(2))}
        className="input"
      />
    </label>
  );
}
