import { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { ArrowLeft, Home, Settings, Eye, EyeOff, ZoomIn, ZoomOut, Maximize, Building2, Type, Ruler, MousePointer2, Trash2, Undo2, Redo2, Download, FlipHorizontal2, FlipVertical2, RotateCw, Copy, Box } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { Plan, Objet, Contrainte, Flux, ContrainteType, NiveauId, Annotation, Cotation, MurDessine, TypeMur } from './types';
import type { Preset } from './presets';
import { presetToObjet } from './presets';
import { Canvas, type CanvasHandle } from './Canvas';
import { Library } from './Library';
import { Inspector } from './Inspector';
import { Stats } from './Stats';
import { verifierContraintes, rotateGroup, mirrorGroupH, mirrorGroupV } from './geometry';
import { useCustomPresets } from './store';
import { createMur } from './murTool';
import { useHistory } from './history';
import { exportSVG } from './exportPlan';
import { View3D } from './View3D';

interface EditeurProps {
  plan: Plan;
  onUpdate: (updates: Partial<Plan> | ((p: Plan) => Plan)) => void;
  onBack: () => void;
  onHome: () => void;
}

export function Editeur({ plan, onUpdate, onBack, onHome }: EditeurProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [niveauActif, setNiveauActif] = useState<NiveauId>(plan.niveaux[0]?.id ?? 'rdc');
  const [showFlux, setShowFlux] = useState(true);
  const [showContraintes, setShowContraintes] = useState(true);
  const [showOperateurs, setShowOperateurs] = useState(true);
  const [showAutresNiveaux, setShowAutresNiveaux] = useState(true);
  const [showBatimentParams, setShowBatimentParams] = useState(false);
  const [tool, setTool] = useState<'select' | 'annotation' | 'cotation' | 'mur_ext' | 'cloison' | 'cloison_legere' | 'poteau_dessine'>('select');
  const [cotationFirst, setCotationFirst] = useState<string | null>(null);
  const [selectedMurId, setSelectedMurId] = useState<string | null>(null);
  const [show3D, setShow3D] = useState(false);

  const canvasRef = useRef<CanvasHandle>(null);
  const dragPresetRef = useRef<Preset | null>(null);
  const { customs, addCustom, removeCustom } = useCustomPresets();
  const { snapshot, undo, redo, canUndo, canRedo } = useHistory(plan, onUpdate);

  const violations = useMemo(() => verifierContraintes(plan), [plan]);

  // --- Mutations ---
  const updateObjet = useCallback((id: string, patch: Partial<Objet>) => {
    snapshot(plan);
    onUpdate((p) => ({ ...p, objets: p.objets.map((o) => (o.id === id ? { ...o, ...patch } : o)) }));
  }, [onUpdate, snapshot, plan]);

  const addObjet = useCallback((o: Objet) => {
    snapshot(plan);
    onUpdate((p) => ({ ...p, objets: [...p.objets, o] }));
  }, [onUpdate, snapshot, plan]);

  const deleteObjet = useCallback((id: string) => {
    snapshot(plan);
    onUpdate((p) => ({
      ...p,
      objets: p.objets.filter((o) => o.id !== id),
      flux: p.flux.filter((f) => f.from !== id && f.to !== id),
      contraintes: p.contraintes.filter((c) => c.objetA !== id && c.objetB !== id),
    }));
    if (selectedId === id) setSelectedId(null);
  }, [onUpdate, selectedId, snapshot, plan]);

  // --- Mutations murs ---
  const addMur = useCallback((m: MurDessine) => {
    snapshot(plan);
    onUpdate((p) => ({ ...p, murs: [...(p.murs ?? []), m] }));
  }, [onUpdate, snapshot, plan]);

  const updateMur = useCallback((id: string, patch: Partial<MurDessine>) => {
    onUpdate((p) => ({ ...p, murs: (p.murs ?? []).map((m) => (m.id === id ? { ...m, ...patch } : m)) }));
  }, [onUpdate]);

  const deleteMur = useCallback((id: string) => {
    snapshot(plan);
    onUpdate((p) => ({ ...p, murs: (p.murs ?? []).filter((m) => m.id !== id) }));
    if (selectedMurId === id) setSelectedMurId(null);
  }, [onUpdate, selectedMurId, snapshot, plan]);

  const handleMurDrawn = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    const typeMap: Record<string, TypeMur> = { mur_ext: 'mur_exterieur', cloison: 'cloison', cloison_legere: 'cloison_legere', poteau_dessine: 'poteau' };
    const typeMur = typeMap[tool] ?? 'cloison';
    const m = createMur(typeMur, niveauActif, x1, y1, x2, y2);
    addMur(m);
    setSelectedMurId(m.id);
  }, [tool, niveauActif, addMur]);

  // --- Actions de groupe ---
  const selectedObjets = useMemo(() => plan.objets.filter(o => selectedIds.has(o.id)), [plan.objets, selectedIds]);


  const rotateSelection = useCallback((angle: number) => {
    snapshot(plan);
    if (selectedObjets.length > 0) {
      const patches = rotateGroup(selectedObjets, angle);
      onUpdate(p => ({ ...p, objets: p.objets.map(o => { const patch = patches.find(pp => pp.id === o.id); return patch ? { ...o, ...patch } : o; }) }));
    } else if (selectedId) {
      const obj = plan.objets.find(o => o.id === selectedId);
      if (obj) updateObjet(selectedId, { rotation: ((obj.rotation ?? 0) + angle) % 360 });
    }
  }, [selectedObjets, selectedId, plan, onUpdate, updateObjet, snapshot]);

  const mirrorH = useCallback(() => {
    snapshot(plan);
    const targets = selectedObjets.length > 0 ? selectedObjets : plan.objets.filter(o => o.id === selectedId);
    const patches = mirrorGroupH(targets);
    onUpdate(p => ({ ...p, objets: p.objets.map(o => { const patch = patches.find(pp => pp.id === o.id); return patch ? { ...o, ...patch } : o; }) }));
  }, [selectedObjets, selectedId, plan, onUpdate, snapshot]);

  const mirrorV = useCallback(() => {
    snapshot(plan);
    const targets = selectedObjets.length > 0 ? selectedObjets : plan.objets.filter(o => o.id === selectedId);
    const patches = mirrorGroupV(targets);
    onUpdate(p => ({ ...p, objets: p.objets.map(o => { const patch = patches.find(pp => pp.id === o.id); return patch ? { ...o, ...patch } : o; }) }));
  }, [selectedObjets, selectedId, plan, onUpdate, snapshot]);

  const duplicateSelection = useCallback(() => {
    snapshot(plan);
    const targets = selectedObjets.length > 0 ? selectedObjets : plan.objets.filter(o => o.id === selectedId);
    const clones = targets.map(o => ({ ...o, id: uuidv4(), nom: `${o.nom} (copie)`, x: o.x + 50, y: o.y + 50 }));
    onUpdate(p => ({ ...p, objets: [...p.objets, ...clones] }));
    setSelectedIds(new Set(clones.map(c => c.id)));
  }, [selectedObjets, selectedId, plan, onUpdate, snapshot]);

  // --- Raccourcis clavier globaux ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
        if (e.key === 'Z') { e.preventDefault(); redo(); }
        if (e.key === 'a') { e.preventDefault(); setSelectedIds(new Set(plan.objets.filter(o => o.niveau === niveauActif).map(o => o.id))); }
        if (e.key === 'd') { e.preventDefault(); duplicateSelection(); }
      }
      const hasSelection = selectedId || selectedObjets.length > 0;
      if (hasSelection && (e.key === 'r' || e.key === 'R')) rotateSelection(e.shiftKey ? -45 : 45);
      if (hasSelection && e.key === 'h') mirrorH();
      if (hasSelection && e.key === 'v' && !e.ctrlKey) mirrorV();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, rotateSelection, mirrorH, mirrorV, duplicateSelection, plan.objets, niveauActif]);

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

  const addFlux = useCallback((from: string, to: string, debit: number, couleur: string, categorie: string) => {
    const f: Flux = { id: uuidv4(), from, to, debit, couleur, categorie };
    onUpdate((p) => ({ ...p, flux: [...p.flux, f] }));
  }, [onUpdate]);

  const updateFlux = useCallback((id: string, patch: Partial<Flux>) => {
    onUpdate((p) => ({ ...p, flux: p.flux.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
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

  // --- Annotations ---
  const addAnnotation = useCallback((x: number, y: number) => {
    const texte = prompt('Texte de l\'annotation :', '');
    if (!texte) return;
    const a: Annotation = { id: uuidv4(), niveau: niveauActif, x, y, texte, couleur: '#f9fafb', taille: 40 };
    onUpdate((p) => ({ ...p, annotations: [...(p.annotations ?? []), a] }));
    setTool('select');
    setSelectedAnnotationId(a.id);
  }, [onUpdate, niveauActif]);

  const updateAnnotation = useCallback((id: string, patch: Partial<Annotation>) => {
    onUpdate((p) => ({
      ...p,
      annotations: (p.annotations ?? []).map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, [onUpdate]);

  const deleteAnnotation = useCallback((id: string) => {
    onUpdate((p) => ({ ...p, annotations: (p.annotations ?? []).filter((a) => a.id !== id) }));
    if (selectedAnnotationId === id) setSelectedAnnotationId(null);
  }, [onUpdate, selectedAnnotationId]);

  // --- Cotation : clic sur objet 1 puis objet 2 ---
  const handleObjectClick = useCallback((id: string | null) => {
    if (tool === 'cotation' && id) {
      if (!cotationFirst) {
        setCotationFirst(id);
      } else if (cotationFirst !== id) {
        const c: Cotation = {
          id: uuidv4(),
          niveau: niveauActif,
          fromObjetId: cotationFirst,
          toObjetId: id,
          couleur: '#22d3ee',
        };
        onUpdate((p) => ({ ...p, cotations: [...(p.cotations ?? []), c] }));
        setCotationFirst(null);
        setTool('select');
      }
    } else {
      setSelectedId(id);
    }
  }, [tool, cotationFirst, niveauActif, onUpdate]);

  const deleteCotation = useCallback((id: string) => {
    onUpdate((p) => ({ ...p, cotations: (p.cotations ?? []).filter((c) => c.id !== id) }));
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

        {/* Outils */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          <ToolButton active={tool === 'select'} onClick={() => { setTool('select'); setCotationFirst(null); }} title="Sélection">
            <MousePointer2 size={13} />
          </ToolButton>
          <ToolButton active={tool === 'annotation'} onClick={() => { setTool('annotation'); setCotationFirst(null); }} title="Annotation texte">
            <Type size={13} />
          </ToolButton>
          <ToolButton active={tool === 'cotation'} onClick={() => setTool('cotation')} title="Cotation (clic sur 2 objets)">
            <Ruler size={13} />
          </ToolButton>
        </div>

        {/* Outils murs */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          <ToolButton active={tool === 'mur_ext'} onClick={() => setTool('mur_ext')} title="Mur exterieur (20cm)">
            <svg width="13" height="13" viewBox="0 0 16 16"><rect x="1" y="5" width="14" height="6" rx="1" fill="currentColor" opacity=".8"/></svg>
          </ToolButton>
          <ToolButton active={tool === 'cloison'} onClick={() => setTool('cloison')} title="Cloison (10cm)">
            <svg width="13" height="13" viewBox="0 0 16 16"><rect x="1" y="6" width="14" height="4" rx="1" fill="currentColor" opacity=".6"/></svg>
          </ToolButton>
          <ToolButton active={tool === 'cloison_legere'} onClick={() => setTool('cloison_legere')} title="Cloison legere (7cm)">
            <svg width="13" height="13" viewBox="0 0 16 16"><rect x="1" y="6.5" width="14" height="3" rx="1" fill="currentColor" opacity=".4"/></svg>
          </ToolButton>
          <ToolButton active={tool === 'poteau_dessine'} onClick={() => setTool('poteau_dessine')} title="Poteau (30cm)">
            <svg width="13" height="13" viewBox="0 0 16 16"><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" opacity=".7"/></svg>
          </ToolButton>
        </div>

        <div className="h-4 w-px bg-[#252830]" />

        {/* Actions objet */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          <ToolButton active={false} onClick={() => rotateSelection(45)} title="Rotation +45deg">
            <RotateCw size={13} />
          </ToolButton>
          <ToolButton active={false} onClick={mirrorH} title="Miroir horizontal">
            <FlipHorizontal2 size={13} />
          </ToolButton>
          <ToolButton active={false} onClick={mirrorV} title="Miroir vertical">
            <FlipVertical2 size={13} />
          </ToolButton>
          <ToolButton active={false} onClick={duplicateSelection} title="Dupliquer selection">
            <Copy size={13} />
          </ToolButton>
        </div>

        <div className="h-4 w-px bg-[#252830]" />

        {/* Undo/Redo */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          <ToolButton active={false} onClick={undo} title="Annuler (Ctrl+Z)">
            <Undo2 size={13} className={canUndo ? '' : 'opacity-30'} />
          </ToolButton>
          <ToolButton active={false} onClick={redo} title="Retablir (Ctrl+Shift+Z)">
            <Redo2 size={13} className={canRedo ? '' : 'opacity-30'} />
          </ToolButton>
        </div>

        <div className="h-4 w-px bg-[#252830]" />

        {/* Vue 3D + Export */}
        <div className="flex items-center bg-[#0f1117] rounded border border-[#252830] overflow-hidden">
          <ToolButton active={show3D} onClick={() => setShow3D(!show3D)} title="Vue 3D isometrique">
            <Box size={13} />
          </ToolButton>
          <ToolButton active={false} onClick={() => { const svg = document.querySelector('svg') as SVGSVGElement; if (svg) exportSVG(svg, plan); }} title="Export SVG">
            <Download size={13} />
          </ToolButton>
        </div>

        <div className="h-4 w-px bg-[#252830]" />

        {/* Toggles */}
        <Toggle on={showFlux} onToggle={() => setShowFlux(!showFlux)} label="Flux" />
        <Toggle on={showContraintes} onToggle={() => setShowContraintes(!showContraintes)} label="Contraintes" />
        <Toggle on={showOperateurs} onToggle={() => setShowOperateurs(!showOperateurs)} label="Opérateurs" />
        <Toggle on={showAutresNiveaux} onToggle={() => setShowAutresNiveaux(!showAutresNiveaux)} label="Autres niv." />

        <IconButton title="Parametres batiment" onClick={() => setShowBatimentParams(!showBatimentParams)}>
          <Settings size={14} />
        </IconButton>
      </div>

      {/* Message mode outil actif */}
      {tool !== 'select' && (
        <div className="bg-blue-500/10 border-b border-blue-500/30 px-4 py-1.5 text-[11px] text-blue-300 flex items-center gap-2">
          {tool === 'annotation' && 'Cliquez sur le plan pour poser une annotation texte.'}
          {tool === 'cotation' && (cotationFirst
            ? 'Cliquez sur un second objet pour coter la distance.'
            : 'Cliquez sur un premier objet à coter.')}
          {(tool === 'mur_ext' || tool === 'cloison' || tool === 'cloison_legere') && 'Cliquez le point de depart du mur, puis le point de fin. Shift = snap 45deg.'}
          {tool === 'poteau_dessine' && 'Cliquez pour placer un poteau.'}
          <button onClick={() => { setTool('select'); setCotationFirst(null); }} className="ml-auto text-blue-400 hover:text-blue-200 underline">
            Annuler
          </button>
        </div>
      )}

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
          {show3D ? (
            <View3D plan={plan} niveauActif={niveauActif} onBack={() => setShow3D(false)} />
          ) : (
          <Canvas
            ref={canvasRef}
            plan={plan}
            selectedId={selectedId}
            niveauActif={niveauActif}
            violations={violations}
            onSelect={handleObjectClick}
            onUpdateObjet={updateObjet}
            onDeleteObjet={deleteObjet}
            onDropAt={onDropAt}
            onUpdateAnnotation={updateAnnotation}
            onSelectAnnotation={setSelectedAnnotationId}
            selectedAnnotationId={selectedAnnotationId}
            tool={tool === 'cotation' ? 'select' : tool}
            onPlaceAnnotation={addAnnotation}
            murs={plan.murs ?? []}
            selectedMurId={selectedMurId}
            onSelectMur={setSelectedMurId}
            onUpdateMur={updateMur}
            onDeleteMur={deleteMur}
            onMurDrawn={handleMurDrawn}
            showFlux={showFlux}
            showContraintes={showContraintes}
            showOperateurs={showOperateurs}
            showAutresNiveaux={showAutresNiveaux}
          />
          )}

          {showBatimentParams && (
            <BatimentParams
              plan={plan}
              niveauActif={niveauActif}
              onUpdate={onUpdate}
              onClose={() => setShowBatimentParams(false)}
            />
          )}

          {/* Éditeur d'annotation flottant */}
          {selectedAnnotationId && (() => {
            const annot = (plan.annotations ?? []).find((a) => a.id === selectedAnnotationId);
            if (!annot) return null;
            return (
              <div className="absolute bottom-10 left-3 bg-[#14161d] border border-[#252830] rounded shadow-2xl p-3 w-72 z-10">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold text-gray-300">Annotation</h3>
                  <button
                    onClick={() => deleteAnnotation(annot.id)}
                    className="text-red-400 hover:text-red-300 p-1"
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
                <textarea
                  value={annot.texte}
                  onChange={(e) => updateAnnotation(annot.id, { texte: e.target.value })}
                  className="input min-h-[50px] mb-2"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={annot.couleur ?? '#f9fafb'}
                    onChange={(e) => updateAnnotation(annot.id, { couleur: e.target.value })}
                    className="w-10 h-7 bg-[#0f1117] border border-[#252830] rounded cursor-pointer"
                  />
                  <label className="flex-1">
                    <span className="text-[10px] text-gray-500 block">Taille (cm)</span>
                    <input
                      type="number"
                      value={annot.taille ?? 40}
                      onChange={(e) => updateAnnotation(annot.id, { taille: Number(e.target.value) })}
                      min={10}
                      max={500}
                      className="input"
                    />
                  </label>
                </div>
              </div>
            );
          })()}

          {/* Liste des cotations si présentes */}
          {(plan.cotations ?? []).length > 0 && (
            <div className="absolute bottom-10 right-3 bg-[#14161d] border border-[#252830] rounded p-2 z-10 max-h-48 overflow-y-auto">
              <div className="text-[10px] uppercase text-gray-500 mb-1 px-1">Cotations</div>
              {(plan.cotations ?? []).map((c) => {
                const a = plan.objets.find((o) => o.id === c.fromObjetId);
                const b = plan.objets.find((o) => o.id === c.toObjetId);
                return (
                  <div key={c.id} className="flex items-center gap-2 text-[11px] px-1 py-0.5 hover:bg-[#181c25] rounded group">
                    <div className="w-2 h-2 rounded-sm" style={{ background: c.couleur ?? '#22d3ee' }} />
                    <span className="text-gray-400 truncate flex-1">
                      {a?.nom ?? '?'} ↔ {b?.nom ?? '?'}
                    </span>
                    <button
                      onClick={() => deleteCotation(c.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-72 shrink-0">
          {selectedMurId && (() => {
            const mur = (plan.murs ?? []).find(m => m.id === selectedMurId);
            if (!mur) return null;
            const len = Math.round(Math.sqrt((mur.x2 - mur.x1) ** 2 + (mur.y2 - mur.y1) ** 2));
            return (
              <div className="h-full bg-[#14161d] border-l border-[#252830] overflow-y-auto p-3 space-y-3">
                <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Mur selectionne</h2>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Nom</label>
                    <input value={mur.nom} onChange={e => updateMur(mur.id, { nom: e.target.value })}
                      className="w-full px-2 py-1 bg-[#0f1117] border border-[#252830] rounded text-xs text-gray-200 outline-none focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Type</label>
                    <select value={mur.type} onChange={e => { const t = e.target.value as any; const defs: Record<string, { epaisseur: number; couleur: string }> = { mur_exterieur: { epaisseur: 20, couleur: '#475569' }, cloison: { epaisseur: 10, couleur: '#64748b' }, cloison_legere: { epaisseur: 7, couleur: '#94a3b8' }, poteau: { epaisseur: 30, couleur: '#334155' } }; updateMur(mur.id, { type: t, epaisseur: defs[t]?.epaisseur ?? mur.epaisseur, couleur: defs[t]?.couleur ?? mur.couleur }); }}
                      className="w-full px-2 py-1 bg-[#0f1117] border border-[#252830] rounded text-xs text-gray-200 outline-none">
                      <option value="mur_exterieur">Mur exterieur (20cm)</option>
                      <option value="cloison">Cloison (10cm)</option>
                      <option value="cloison_legere">Cloison legere (7cm)</option>
                      <option value="poteau">Poteau (30cm)</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Epaisseur (cm)</label>
                      <input type="number" value={mur.epaisseur} min={1} max={100}
                        onChange={e => updateMur(mur.id, { epaisseur: Number(e.target.value) })}
                        className="w-full px-2 py-1 bg-[#0f1117] border border-[#252830] rounded text-xs text-gray-200 outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-500 block mb-0.5">Longueur</label>
                      <span className="text-xs text-white font-mono">{(len / 100).toFixed(2)} m</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Couleur</label>
                    <input type="color" value={mur.couleur} onChange={e => updateMur(mur.id, { couleur: e.target.value })}
                      className="w-8 h-6 rounded border border-[#252830] cursor-pointer" />
                  </div>
                  <button onClick={() => deleteMur(mur.id)}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-600/10">
                    <Trash2 size={12} /> Supprimer ce mur
                  </button>
                </div>
              </div>
            );
          })()}
          {!selectedMurId && (
          <Inspector
            plan={plan}
            objet={selectedObjet}
            onUpdate={(patch) => selectedObjet && updateObjet(selectedObjet.id, patch)}
            onDelete={() => selectedObjet && deleteObjet(selectedObjet.id)}
            onRotate={rotateSelected}
            onDuplicate={duplicateSelected}
            onSaveAsPreset={addCustom}
            onAddFlux={addFlux}
            onUpdateFlux={updateFlux}
            onDeleteFlux={deleteFlux}
            onAddContrainte={addContrainte}
            onDeleteContrainte={deleteContrainte}
          />
          )}
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

function ToolButton({ active, children, onClick, title }: { active: boolean; children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`px-2 py-1 ${active ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
    >
      {children}
    </button>
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
            label="Epaisseur murs"
            valueCm={plan.batiment.epaisseurMurs}
            onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, epaisseurMurs: v } }))}
          />
          <div>
            <span className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Forme</span>
            <select
              value={plan.batiment.forme ?? 'rectangle'}
              onChange={(e) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, forme: e.target.value as any } }))}
              className="w-full px-2 py-1 bg-[#0f1117] border border-[#252830] rounded text-xs text-gray-200 outline-none">
              <option value="rectangle">Rectangle</option>
              <option value="L">Forme en L</option>
              <option value="U">Forme en U</option>
            </select>
          </div>
          {plan.batiment.forme === 'L' && (
            <div className="grid grid-cols-2 gap-2">
              <MetersInput label="Branche X (L)" valueCm={plan.batiment.lBrancheX ?? Math.round(plan.batiment.largeur * 0.6)}
                onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, lBrancheX: v } }))} />
              <MetersInput label="Branche Y (L)" valueCm={plan.batiment.lBrancheY ?? Math.round(plan.batiment.hauteur * 0.6)}
                onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, lBrancheY: v } }))} />
            </div>
          )}
          {plan.batiment.forme === 'U' && (
            <div className="grid grid-cols-2 gap-2">
              <MetersInput label="Ouverture U" valueCm={plan.batiment.uOuverture ?? Math.round(plan.batiment.largeur * 0.4)}
                onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, uOuverture: v } }))} />
              <MetersInput label="Profondeur U" valueCm={plan.batiment.uProfondeur ?? Math.round(plan.batiment.hauteur * 0.5)}
                onChange={(v) => onUpdate((p) => ({ ...p, batiment: { ...p.batiment, uProfondeur: v } }))} />
            </div>
          )}
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
  const vStr = (valueCm / 100).toFixed(2);
  if (local !== vStr && document.activeElement?.tagName !== 'INPUT') { setLocal(vStr); }
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
