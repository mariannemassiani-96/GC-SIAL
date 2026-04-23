import { useEffect, useMemo, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import type { Plan, Objet, Flux, ViolationContrainte, NiveauId, Annotation, MurDessine } from './types';
import { bbox, center, snap, distanceBords } from './geometry';
import { murToPolygon, getEndpointHit, snapAngle, longueurMur } from './murTool';

interface CanvasProps {
  plan: Plan;
  selectedId: string | null;
  /** Niveau actif — seuls ces objets sont interactifs */
  niveauActif: NiveauId;
  violations: ViolationContrainte[];
  onSelect: (id: string | null) => void;
  onUpdateObjet: (id: string, patch: Partial<Objet>) => void;
  onDeleteObjet: (id: string) => void;
  /** Appelé au drop depuis la bibliothèque : coord site (cm) */
  onDropAt?: (clientX: number, clientY: number) => void;
  /** Annotations */
  onUpdateAnnotation?: (id: string, patch: Partial<Annotation>) => void;
  onSelectAnnotation?: (id: string | null) => void;
  selectedAnnotationId?: string | null;
  /** Mode outil */
  tool?: 'select' | 'annotation' | 'mur_ext' | 'cloison' | 'cloison_legere' | 'poteau_dessine';
  /** Appelé pour poser une annotation à x,y en cm */
  onPlaceAnnotation?: (x: number, y: number) => void;
  /** Murs dessinés */
  murs?: MurDessine[];
  selectedMurId?: string | null;
  onSelectMur?: (id: string | null) => void;
  onUpdateMur?: (id: string, patch: Partial<MurDessine>) => void;
  onDeleteMur?: (id: string) => void;
  onMurDrawn?: (x1: number, y1: number, x2: number, y2: number) => void;
  showFlux: boolean;
  showContraintes: boolean;
  showOperateurs: boolean;
  /** Afficher les autres niveaux en fantôme */
  showAutresNiveaux: boolean;
}

export interface CanvasHandle {
  /** Zoom in (×0.8) */
  zoomIn: () => void;
  /** Zoom out (×1.25) */
  zoomOut: () => void;
  /** Recadrer pour voir tout le site */
  fitSite: () => void;
  /** Recadrer pour voir le bâtiment */
  fitBatiment: () => void;
  /** Recadrer sur un objet */
  fitObjet: (id: string) => void;
  /** Convertit un événement client (clientX, clientY) en coordonnée site (cm) */
  clientToSite: (clientX: number, clientY: number) => { x: number; y: number } | null;
}

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragState =
  | { kind: 'move'; id: string; startX: number; startY: number; origX: number; origY: number }
  | { kind: 'resize'; id: string; handle: 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; origBbox: { x: number; y: number; w: number; h: number }; origRot: number }
  | { kind: 'mur_endpoint'; murId: string; endpoint: 'start' | 'end'; startX: number; startY: number }
  | { kind: 'pan'; startClientX: number; startClientY: number; origVb: ViewBox }
  | null;

export const Canvas = forwardRef<CanvasHandle, CanvasProps>(function Canvas(props, ref) {
  const {
    plan, selectedId, niveauActif, violations,
    onSelect, onUpdateObjet, onDeleteObjet, onDropAt,
    onUpdateAnnotation, onSelectAnnotation, selectedAnnotationId,
    tool = 'select', onPlaceAnnotation,
    murs = [], selectedMurId, onSelectMur, onUpdateMur, onDeleteMur: _onDeleteMur, onMurDrawn,
    showFlux, showContraintes, showOperateurs, showAutresNiveaux,
  } = props;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState>(null);
  const [vb, setVb] = useState<ViewBox>(() => ({
    x: -500,
    y: -500,
    w: plan.largeurSite + 1000,
    h: plan.hauteurSite + 1000,
  }));
  const [cursor, setCursor] = useState<string>('default');
  const [murDrawStart, setMurDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [murDrawPreview, setMurDrawPreview] = useState<{ x: number; y: number } | null>(null);

  // Recenter when site dimensions change significantly
  useEffect(() => {
    setVb((v) => {
      if (v.x > plan.largeurSite || v.y > plan.hauteurSite) {
        return { x: -500, y: -500, w: plan.largeurSite + 1000, h: plan.hauteurSite + 1000 };
      }
      return v;
    });
  }, [plan.largeurSite, plan.hauteurSite]);

  const screenToSVG = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    return { x: vb.x + px * vb.w, y: vb.y + py * vb.h };
  }, [vb]);

  // --- Zoom ---
  const zoomAt = useCallback((factor: number, sx?: number, sy?: number) => {
    const p = sx !== undefined && sy !== undefined ? screenToSVG(sx, sy) : { x: vb.x + vb.w / 2, y: vb.y + vb.h / 2 };
    setVb((v) => {
      // Zoom from 50 cm (0.5m) to 50 000 cm (500m) visible width
      const newW = Math.max(50, Math.min(50000, v.w * factor));
      const newH = Math.max(50, Math.min(50000, v.h * factor));
      return {
        x: p.x - ((p.x - v.x) * newW) / v.w,
        y: p.y - ((p.y - v.y) * newH) / v.h,
        w: newW,
        h: newH,
      };
    });
  }, [screenToSVG, vb]);

  const onWheel = useCallback((e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    zoomAt(Math.exp(e.deltaY * 0.001), e.clientX, e.clientY);
  }, [zoomAt]);

  // --- API exposée via ref ---
  useImperativeHandle(ref, () => ({
    zoomIn: () => zoomAt(0.8),
    zoomOut: () => zoomAt(1.25),
    fitSite: () =>
      setVb({ x: -500, y: -500, w: plan.largeurSite + 1000, h: plan.hauteurSite + 1000 }),
    fitBatiment: () => {
      const b = plan.batiment;
      const pad = 200;
      setVb({ x: b.x - pad, y: b.y - pad, w: b.largeur + 2 * pad, h: b.hauteur + 2 * pad });
    },
    fitObjet: (id: string) => {
      const o = plan.objets.find((x) => x.id === id);
      if (!o) return;
      const bb = bbox(o);
      const pad = Math.max(bb.w, bb.h) * 0.5;
      setVb({ x: bb.x - pad, y: bb.y - pad, w: bb.w + 2 * pad, h: bb.h + 2 * pad });
    },
    clientToSite: (clientX: number, clientY: number) => {
      if (!svgRef.current) return null;
      return screenToSVG(clientX, clientY);
    },
  }), [zoomAt, screenToSVG, plan.largeurSite, plan.hauteurSite, plan.batiment, plan.objets]);

  // --- Mouse move / up (global listeners while dragging) ---
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      // Preview mur en cours de dessin
      if (murDrawStart && !dragRef.current) {
        const p = screenToSVG(e.clientX, e.clientY);
        const snapped = { x: snap(p.x, plan.tailleGrille), y: snap(p.y, plan.tailleGrille) };
        const end = e.shiftKey ? snapAngle(murDrawStart.x, murDrawStart.y, snapped.x, snapped.y) : snapped;
        setMurDrawPreview(end);
      }

      const d = dragRef.current;
      if (!d) return;

      if (d.kind === 'pan') {
        const rect = svgRef.current!.getBoundingClientRect();
        const dx = ((e.clientX - d.startClientX) / rect.width) * d.origVb.w;
        const dy = ((e.clientY - d.startClientY) / rect.height) * d.origVb.h;
        setVb({ x: d.origVb.x - dx, y: d.origVb.y - dy, w: d.origVb.w, h: d.origVb.h });
        return;
      }

      const p = screenToSVG(e.clientX, e.clientY);

      if (d.kind === 'mur_endpoint') {
        const snapped = { x: snap(p.x, plan.tailleGrille), y: snap(p.y, plan.tailleGrille) };
        const patch = d.endpoint === 'start' ? { x1: snapped.x, y1: snapped.y } : { x2: snapped.x, y2: snapped.y };
        onUpdateMur?.(d.murId, patch);
        return;
      }

      if (d.kind === 'move') {
        const dx = p.x - d.startX;
        const dy = p.y - d.startY;
        const nx = snap(d.origX + dx, plan.tailleGrille);
        const ny = snap(d.origY + dy, plan.tailleGrille);
        if (d.id.startsWith('annot-')) {
          onUpdateAnnotation?.(d.id.slice(6), { x: nx, y: ny });
        } else {
          onUpdateObjet(d.id, { x: nx, y: ny });
        }
      }

      if (d.kind === 'resize') {
        const obj = plan.objets.find((o) => o.id === d.id);
        if (!obj) return;
        let { x, y, w, h } = d.origBbox;
        const px = snap(p.x, plan.tailleGrille);
        const py = snap(p.y, plan.tailleGrille);

        if (d.handle === 'se') {
          w = Math.max(plan.tailleGrille, px - x);
          h = Math.max(plan.tailleGrille, py - y);
        } else if (d.handle === 'sw') {
          const right = x + w;
          x = Math.min(px, right - plan.tailleGrille);
          w = right - x;
          h = Math.max(plan.tailleGrille, py - y);
        } else if (d.handle === 'ne') {
          const bot = y + h;
          w = Math.max(plan.tailleGrille, px - x);
          y = Math.min(py, bot - plan.tailleGrille);
          h = bot - y;
        } else if (d.handle === 'nw') {
          const right = x + w;
          const bot = y + h;
          x = Math.min(px, right - plan.tailleGrille);
          y = Math.min(py, bot - plan.tailleGrille);
          w = right - x;
          h = bot - y;
        }

        // Map bbox (w,h) back to largeur/hauteur given rotation
        const swap = d.origRot === 90 || d.origRot === 270;
        const largeur = swap ? h : w;
        const hauteur = swap ? w : h;
        onUpdateObjet(d.id, { x, y, largeur, hauteur });
      }
    };

    const onUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        setCursor('default');
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [plan.tailleGrille, plan.objets, onUpdateObjet, screenToSVG]);

  // --- Keyboard ---
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;

      const obj = plan.objets.find((o) => o.id === selectedId);
      if (!obj) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDeleteObjet(selectedId);
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        const rot = ((obj.rotation + 90) % 360) as 0 | 90 | 180 | 270;
        onUpdateObjet(selectedId, { rotation: rot });
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const step = e.shiftKey ? plan.tailleGrille * 10 : plan.tailleGrille;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        onUpdateObjet(selectedId, { x: obj.x + dx, y: obj.y + dy });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, plan.objets, plan.tailleGrille, onUpdateObjet, onDeleteObjet]);

  // --- Event handlers on objects ---
  const onObjetMouseDown = (e: React.MouseEvent, o: Objet) => {
    e.stopPropagation();
    onSelect(o.id);
    const p = screenToSVG(e.clientX, e.clientY);
    dragRef.current = {
      kind: 'move',
      id: o.id,
      startX: p.x,
      startY: p.y,
      origX: o.x,
      origY: o.y,
    };
    setCursor('grabbing');
  };

  const onHandleMouseDown = (e: React.MouseEvent, o: Objet, handle: 'nw' | 'ne' | 'sw' | 'se') => {
    e.stopPropagation();
    const p = screenToSVG(e.clientX, e.clientY);
    dragRef.current = {
      kind: 'resize',
      id: o.id,
      handle,
      startX: p.x,
      startY: p.y,
      origBbox: bbox(o),
      origRot: o.rotation,
    };
  };

  const onCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    // Si on est en mode annotation, clic = poser une annotation
    if (e.button === 0 && tool === 'annotation' && onPlaceAnnotation) {
      const p = screenToSVG(e.clientX, e.clientY);
      onPlaceAnnotation(Math.round(p.x), Math.round(p.y));
      return;
    }

    // Mode dessin mur : premier clic = départ, deuxième = fin
    if (e.button === 0 && (tool === 'mur_ext' || tool === 'cloison' || tool === 'cloison_legere')) {
      const p = screenToSVG(e.clientX, e.clientY);
      const snapped = { x: snap(p.x, plan.tailleGrille), y: snap(p.y, plan.tailleGrille) };
      if (!murDrawStart) {
        setMurDrawStart(snapped);
        setMurDrawPreview(snapped);
      } else {
        const end = e.shiftKey ? snapAngle(murDrawStart.x, murDrawStart.y, snapped.x, snapped.y) : snapped;
        onMurDrawn?.(murDrawStart.x, murDrawStart.y, end.x, end.y);
        setMurDrawStart(null);
        setMurDrawPreview(null);
      }
      return;
    }

    // Mode poteau : clic unique
    if (e.button === 0 && tool === 'poteau_dessine') {
      const p = screenToSVG(e.clientX, e.clientY);
      const snapped = { x: snap(p.x, plan.tailleGrille), y: snap(p.y, plan.tailleGrille) };
      onMurDrawn?.(snapped.x, snapped.y, snapped.x + 30, snapped.y + 30);
      return;
    }

    // Left click on empty = deselect + pan
    if (e.button === 0) {
      onSelect(null);
      onSelectAnnotation?.(null);
      onSelectMur?.(null);
      dragRef.current = {
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        origVb: vb,
      };
      setCursor('grabbing');
    } else if (e.button === 1) {
      e.preventDefault();
      dragRef.current = {
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        origVb: vb,
      };
      setCursor('grabbing');
    }
  };

  // --- Flux paths ---
  const fluxLines = useMemo(() => {
    if (!showFlux) return [];
    const map = new Map(plan.objets.map((o) => [o.id, o]));
    return plan.flux
      .map((f) => {
        const a = map.get(f.from);
        const b = map.get(f.to);
        if (!a || !b) return null;
        const cA = center(a);
        const cB = center(b);
        return { f, ax: cA.x, ay: cA.y, bx: cB.x, by: cB.y };
      })
      .filter((x): x is { f: Flux; ax: number; ay: number; bx: number; by: number } => x !== null);
  }, [plan.flux, plan.objets, showFlux]);

  // --- Cotations ---
  const cotations = useMemo(() => {
    const objMap = new Map(plan.objets.map((o) => [o.id, o]));
    return (plan.cotations ?? [])
      .filter((c) => c.niveau === niveauActif)
      .map((c) => {
        const getPt = (id?: string, pt?: { x: number; y: number }) => {
          if (pt) return pt;
          if (id) {
            const o = objMap.get(id);
            if (o) return center(o);
          }
          return null;
        };
        const a = getPt(c.fromObjetId, c.fromPoint);
        const b = getPt(c.toObjetId, c.toPoint);
        if (!a || !b) return null;
        const oA = c.fromObjetId ? objMap.get(c.fromObjetId) : null;
        const oB = c.toObjetId ? objMap.get(c.toObjetId) : null;
        const dist = oA && oB ? distanceBords(oA, oB) : Math.hypot(a.x - b.x, a.y - b.y);
        return { c, ax: a.x, ay: a.y, bx: b.x, by: b.y, dist };
      })
      .filter(<T,>(x: T | null): x is T => x !== null);
  }, [plan.cotations, plan.objets, niveauActif]);

  // --- Contraintes violées ---
  const violationPairs = useMemo(() => {
    if (!showContraintes) return [];
    const map = new Map(plan.objets.map((o) => [o.id, o]));
    return violations
      .map((v) => {
        const a = map.get(v.contrainte.objetA);
        const b = map.get(v.contrainte.objetB);
        if (!a || !b) return null;
        const cA = center(a);
        const cB = center(b);
        return { ax: cA.x, ay: cA.y, bx: cB.x, by: cB.y, id: v.contrainte.id };
      })
      .filter((x): x is { ax: number; ay: number; bx: number; by: number; id: string } => x !== null);
  }, [violations, plan.objets, showContraintes]);

  // --- Render grid ---
  const gridSize = plan.tailleGrille;
  const majorGrid = gridSize * 10;

  // Cote: converter px
  const strokeBase = vb.w / 1000; // relative

  const b = plan.batiment;
  const niveauActifObj = plan.niveaux.find((n) => n.id === niveauActif);

  // Pas des règles en mètres adapté au zoom
  const rulerStep = vb.w > 20000 ? 1000 : vb.w > 5000 ? 500 : vb.w > 1000 ? 100 : 50;

  return (
    <div
      className="w-full h-full bg-[#0a0b0f] relative"
      style={{ cursor }}
      onDragOver={(e) => {
        if (onDropAt) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={(e) => {
        if (onDropAt) {
          e.preventDefault();
          onDropAt(e.clientX, e.clientY);
        }
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full select-none"
        onWheel={onWheel}
        onMouseDown={onCanvasMouseDown}
        onContextMenu={(e) => e.preventDefault()}
      >
        <defs>
          <pattern id="grid-minor" width={gridSize} height={gridSize} patternUnits="userSpaceOnUse">
            <path d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`} fill="none" stroke="#15181f" strokeWidth={strokeBase * 0.5} />
          </pattern>
          <pattern id="grid-major" width={majorGrid} height={majorGrid} patternUnits="userSpaceOnUse">
            <rect width={majorGrid} height={majorGrid} fill="url(#grid-minor)" />
            <path d={`M ${majorGrid} 0 L 0 0 0 ${majorGrid}`} fill="none" stroke="#242938" strokeWidth={strokeBase * 1} />
          </pattern>
          <pattern id="site-pattern" width={majorGrid} height={majorGrid} patternUnits="userSpaceOnUse">
            <rect width={majorGrid} height={majorGrid} fill="#10131b" />
            <path d={`M ${majorGrid} 0 L 0 0 0 ${majorGrid}`} fill="none" stroke="#1a1f2e" strokeWidth={strokeBase * 1} />
          </pattern>
          <marker id="flux-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#fbbf24" />
          </marker>
        </defs>

        {/* Site (zone extérieure) */}
        <rect
          x={0}
          y={0}
          width={plan.largeurSite}
          height={plan.hauteurSite}
          fill="url(#site-pattern)"
          stroke="#3b4252"
          strokeWidth={strokeBase * 2}
          strokeDasharray={`${strokeBase * 10} ${strokeBase * 6}`}
        />

        {/* Bâtiment — murs épais */}
        <rect
          x={b.x}
          y={b.y}
          width={b.largeur}
          height={b.hauteur}
          fill="#3b4252"
          stroke="#4b5563"
          strokeWidth={strokeBase * 1.5}
        />
        <rect
          x={b.x + b.epaisseurMurs}
          y={b.y + b.epaisseurMurs}
          width={Math.max(0, b.largeur - 2 * b.epaisseurMurs)}
          height={Math.max(0, b.hauteur - 2 * b.epaisseurMurs)}
          fill="url(#grid-major)"
          stroke="#64748b"
          strokeWidth={strokeBase * 1}
        />

        {/* Cotes bâtiment */}
        <g pointerEvents="none">
          <text
            x={b.x + b.largeur / 2}
            y={b.y - 20 * strokeBase}
            fontSize={34 * strokeBase}
            fill="#94a3b8"
            textAnchor="middle"
            fontWeight="600"
          >
            {(b.largeur / 100).toFixed(1)} m
          </text>
          <text
            x={b.x - 20 * strokeBase}
            y={b.y + b.hauteur / 2}
            fontSize={34 * strokeBase}
            fill="#94a3b8"
            textAnchor="end"
            fontWeight="600"
            transform={`rotate(-90 ${b.x - 20 * strokeBase} ${b.y + b.hauteur / 2})`}
          >
            {(b.hauteur / 100).toFixed(1)} m
          </text>
        </g>

        {/* Règles en mètres sur le site */}
        <g pointerEvents="none">
          {Array.from({ length: Math.floor(plan.largeurSite / rulerStep) + 1 }).map((_, i) => {
            const x = i * rulerStep;
            return (
              <g key={`hx${i}`}>
                <line x1={x} y1={-5 * strokeBase} x2={x} y2={5 * strokeBase} stroke="#475569" strokeWidth={strokeBase * 1} />
                <text x={x} y={-15 * strokeBase} fontSize={24 * strokeBase} fill="#64748b" textAnchor="middle">
                  {(x / 100).toFixed(0)}m
                </text>
              </g>
            );
          })}
          {Array.from({ length: Math.floor(plan.hauteurSite / rulerStep) + 1 }).map((_, i) => {
            const y = i * rulerStep;
            return (
              <g key={`vy${i}`}>
                <line x1={-5 * strokeBase} y1={y} x2={5 * strokeBase} y2={y} stroke="#475569" strokeWidth={strokeBase * 1} />
                <text x={-15 * strokeBase} y={y + 8 * strokeBase} fontSize={24 * strokeBase} fill="#64748b" textAnchor="end">
                  {(y / 100).toFixed(0)}m
                </text>
              </g>
            );
          })}
        </g>

        {/* Objets des autres niveaux, en fantôme (sous tout) */}
        {showAutresNiveaux &&
          plan.objets
            .filter((o) => o.niveau !== niveauActif)
            .map((o) => (
              <ObjetShape
                key={`ghost-${o.id}`}
                objet={o}
                selected={false}
                strokeBase={strokeBase}
                showOperateurs={false}
                ghost
                onMouseDown={() => {}}
                onHandleMouseDown={() => {}}
              />
            ))}

        {/* Zones (rendues sous les objets) */}
        {plan.objets
          .filter((o) => o.niveau === niveauActif && o.type === 'zone')
          .map((o) => (
            <ObjetShape
              key={o.id}
              objet={o}
              selected={o.id === selectedId}
              strokeBase={strokeBase}
              showOperateurs={showOperateurs}
              onMouseDown={(e) => onObjetMouseDown(e, o)}
              onHandleMouseDown={(e, handle) => onHandleMouseDown(e, o, handle)}
            />
          ))}

        {/* Flux dessinés sous objets (pour ne pas masquer) */}
        {fluxLines.map(({ f, ax, ay, bx, by }) => {
          const col = f.couleur ?? '#fbbf24';
          const ep = f.epaisseur ?? 3;
          return (
            <g key={f.id} pointerEvents="none">
              <defs>
                <marker
                  id={`flux-arrow-${f.id}`}
                  viewBox="0 0 10 10"
                  refX="9"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill={col} />
                </marker>
              </defs>
              <line
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke={col}
                strokeWidth={strokeBase * ep}
                strokeOpacity={0.75}
                markerEnd={`url(#flux-arrow-${f.id})`}
              />
              <text
                x={(ax + bx) / 2}
                y={(ay + by) / 2 - 8 * strokeBase}
                fontSize={22 * strokeBase}
                fill={col}
                textAnchor="middle"
                fontWeight="600"
              >
                {f.label ? `${f.label} · ` : ''}{f.debit} u/h
              </text>
            </g>
          );
        })}

        {/* Cotations (niveau actif uniquement) */}
        {cotations.map(({ c, ax, ay, bx, by, dist }) => {
          const col = c.couleur ?? '#22d3ee';
          const mx = (ax + bx) / 2;
          const my = (ay + by) / 2;
          return (
            <g key={c.id} pointerEvents="none">
              <line
                x1={ax}
                y1={ay}
                x2={bx}
                y2={by}
                stroke={col}
                strokeWidth={strokeBase * 1.5}
                strokeDasharray={`${strokeBase * 4} ${strokeBase * 3}`}
              />
              <circle cx={ax} cy={ay} r={strokeBase * 4} fill={col} />
              <circle cx={bx} cy={by} r={strokeBase * 4} fill={col} />
              <rect
                x={mx - 60 * strokeBase}
                y={my - 16 * strokeBase}
                width={120 * strokeBase}
                height={24 * strokeBase}
                rx={strokeBase * 4}
                fill="#0f1117"
                stroke={col}
                strokeWidth={strokeBase * 1}
              />
              <text
                x={mx}
                y={my + 2 * strokeBase}
                fontSize={20 * strokeBase}
                fill={col}
                textAnchor="middle"
                fontWeight="700"
              >
                {(dist / 100).toFixed(2)} m
              </text>
            </g>
          );
        })}

        {/* Annotations du niveau actif */}
        {(plan.annotations ?? [])
          .filter((a) => a.niveau === niveauActif)
          .map((a) => (
            <AnnotationShape
              key={a.id}
              annotation={a}
              strokeBase={strokeBase}
              selected={a.id === selectedAnnotationId}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectAnnotation?.(a.id);
                const p = screenToSVG(e.clientX, e.clientY);
                dragRef.current = {
                  kind: 'move',
                  id: `annot-${a.id}`,
                  startX: p.x,
                  startY: p.y,
                  origX: a.x,
                  origY: a.y,
                };
                setCursor('grabbing');
              }}
            />
          ))}

        {/* Contraintes violées */}
        {violationPairs.map((vp) => (
          <line
            key={vp.id}
            x1={vp.ax}
            y1={vp.ay}
            x2={vp.bx}
            y2={vp.by}
            stroke="#ef4444"
            strokeWidth={strokeBase * 2}
            strokeDasharray={`${strokeBase * 8} ${strokeBase * 5}`}
            pointerEvents="none"
          />
        ))}

        {/* ── Murs dessinés ── */}
        {murs.filter(m => m.niveau === niveauActif).map(m => {
          const poly = murToPolygon(m);
          if (!poly) return null;
          const isSel = m.id === selectedMurId;
          const len = longueurMur(m);
          const mx = (m.x1 + m.x2) / 2;
          const my = (m.y1 + m.y2) / 2;
          return (
            <g key={m.id}
              onMouseDown={(e) => {
                e.stopPropagation();
                onSelectMur?.(m.id);
                onSelect(null);
                const ep = getEndpointHit(screenToSVG(e.clientX, e.clientY).x, screenToSVG(e.clientX, e.clientY).y, m, strokeBase * 20);
                if (ep) {
                  dragRef.current = { kind: 'mur_endpoint', murId: m.id, endpoint: ep, startX: ep === 'start' ? m.x1 : m.x2, startY: ep === 'start' ? m.y1 : m.y2 };
                  setCursor('grab');
                }
              }}
              onDoubleClick={() => {
                const val = prompt(`Longueur du mur (cm) — actuel: ${len}cm`, String(len));
                if (val) {
                  const newLen = parseInt(val, 10);
                  if (newLen > 0) {
                    const dx = m.x2 - m.x1, dy = m.y2 - m.y1;
                    const curLen = Math.sqrt(dx*dx + dy*dy);
                    if (curLen > 0) {
                      const ratio = newLen / curLen;
                      onUpdateMur?.(m.id, { x2: Math.round(m.x1 + dx * ratio), y2: Math.round(m.y1 + dy * ratio) });
                    }
                  }
                }
              }}
              style={{ cursor: 'pointer' }}>
              <polygon points={poly} fill={m.couleur} stroke={isSel ? '#60a5fa' : '#1e293b'} strokeWidth={isSel ? strokeBase * 3 : strokeBase} opacity={0.85} />
              {/* Endpoints */}
              {isSel && (
                <>
                  <circle cx={m.x1} cy={m.y1} r={strokeBase * 8} fill="#60a5fa" stroke="#fff" strokeWidth={strokeBase * 2} style={{ cursor: 'grab' }} />
                  <circle cx={m.x2} cy={m.y2} r={strokeBase * 8} fill="#60a5fa" stroke="#fff" strokeWidth={strokeBase * 2} style={{ cursor: 'grab' }} />
                </>
              )}
              {/* Label longueur */}
              <text x={mx} y={my - strokeBase * 12} textAnchor="middle" fontSize={strokeBase * 10} fill="#94a3b8" fontFamily="monospace">
                {(len / 100).toFixed(2)}m
              </text>
            </g>
          );
        })}

        {/* Preview mur en cours de dessin */}
        {murDrawStart && murDrawPreview && (
          <line x1={murDrawStart.x} y1={murDrawStart.y} x2={murDrawPreview.x} y2={murDrawPreview.y}
            stroke="#60a5fa" strokeWidth={strokeBase * 4} strokeDasharray={`${strokeBase * 6} ${strokeBase * 4}`} opacity={0.7} />
        )}

        {/* Objets non-zone */}
        {plan.objets.filter((o) => o.type !== 'zone').map((o) => (
          <ObjetShape
            key={o.id}
            objet={o}
            selected={o.id === selectedId}
            strokeBase={strokeBase}
            showOperateurs={showOperateurs}
            onMouseDown={(e) => onObjetMouseDown(e, o)}
            onHandleMouseDown={(e, handle) => onHandleMouseDown(e, o, handle)}
          />
        ))}
      </svg>

      {/* Overlay instructions */}
      <div className="absolute bottom-3 left-3 text-[11px] text-gray-500 font-mono pointer-events-none">
        Molette = zoom • Glisser fond = pan • Glisser objet = déplacer • R = rotation • Suppr = supprimer
      </div>
      {niveauActifObj && (
        <div className="absolute top-3 left-3 bg-[#14161d] border border-[#252830] rounded px-3 py-1.5 text-xs text-gray-300 font-mono">
          Niveau : <span className="text-gray-100 font-semibold">{niveauActifObj.nom}</span>
          <span className="text-gray-500 ml-2">HSP {(niveauActifObj.hauteurSousPlafond / 100).toFixed(2)} m</span>
        </div>
      )}
    </div>
  );
});

function AnnotationShape({
  annotation, strokeBase, selected, onMouseDown,
}: { annotation: Annotation; strokeBase: number; selected: boolean; onMouseDown: (e: React.MouseEvent) => void }) {
  const couleur = annotation.couleur ?? '#f9fafb';
  const size = annotation.taille ?? 40; // cm
  return (
    <g onMouseDown={onMouseDown} style={{ cursor: 'grab' }}>
      <text
        x={annotation.x}
        y={annotation.y}
        fontSize={size}
        fill={couleur}
        fontWeight="600"
        textAnchor="start"
      >
        {annotation.texte}
      </text>
      {selected && (
        <rect
          x={annotation.x - 4 * strokeBase}
          y={annotation.y - size - 2 * strokeBase}
          width={annotation.texte.length * size * 0.6 + 8 * strokeBase}
          height={size + 8 * strokeBase}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={strokeBase * 1.5}
          strokeDasharray={`${strokeBase * 3} ${strokeBase * 2}`}
        />
      )}
    </g>
  );
}

interface ObjetShapeProps {
  objet: Objet;
  selected: boolean;
  strokeBase: number;
  showOperateurs: boolean;
  ghost?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
  onHandleMouseDown: (e: React.MouseEvent, handle: 'nw' | 'ne' | 'sw' | 'se') => void;
}

function ObjetShape({ objet, selected, strokeBase, showOperateurs, ghost = false, onMouseDown, onHandleMouseDown }: ObjetShapeProps) {
  const b = bbox(objet);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const couleur = objet.couleur ?? '#3b82f6';
  const isZone = objet.type === 'zone' || objet.type === 'exterieur' || objet.type === 'salle' || objet.type === 'piece';
  const isThin = objet.type === 'mur' || objet.type === 'porte' || objet.type === 'fenetre';
  const showSurface = objet.type === 'piece' || objet.type === 'salle' || objet.type === 'zone';
  const surfaceM2 = (objet.largeur * objet.hauteur) / 10000; // cm² → m²
  const opacityMul = ghost ? 0.25 : 1;

  // Handle size in cm
  const handleSize = Math.max(12, strokeBase * 16);

  const remplissage = objet.capacite && objet.stockActuel !== undefined
    ? Math.min(1, objet.stockActuel / Math.max(1, objet.capacite))
    : null;

  return (
    <g style={{ cursor: selected ? 'grab' : 'pointer' }}>
      <g
        transform={`translate(${cx}, ${cy}) rotate(${objet.rotation}) translate(${-objet.largeur / 2}, ${-objet.hauteur / 2})`}
        onMouseDown={onMouseDown}
      >
        <rect
          x={0}
          y={0}
          width={objet.largeur}
          height={objet.hauteur}
          fill={couleur}
          fillOpacity={(isZone ? 0.1 : isThin ? 0.9 : 0.25) * opacityMul}
          stroke={selected ? '#f9fafb' : couleur}
          strokeOpacity={ghost ? 0.35 : 1}
          strokeWidth={selected ? strokeBase * 3 : strokeBase * 1.5}
          strokeDasharray={isZone ? `${strokeBase * 6} ${strokeBase * 4}` : undefined}
        />
        {/* Remplissage stock tampon */}
        {remplissage !== null && (
          <rect
            x={4 * strokeBase}
            y={objet.hauteur - 8 * strokeBase - 10 * strokeBase}
            width={(objet.largeur - 8 * strokeBase) * remplissage}
            height={10 * strokeBase}
            fill={remplissage > 0.9 ? '#ef4444' : remplissage > 0.7 ? '#f59e0b' : '#22c55e'}
            fillOpacity={0.9}
          />
        )}
        {/* Indicateur type (petit point en haut à gauche) pour repère visuel */}
        <circle cx={8 * strokeBase} cy={8 * strokeBase} r={4 * strokeBase} fill={couleur} />
      </g>

      {/* Label (non-rotated, centered) */}
      {!isThin && (
        <g pointerEvents="none">
          <text
            x={cx}
            y={cy - 4 * strokeBase}
            fontSize={Math.max(18 * strokeBase, 14)}
            fill="#f9fafb"
            fillOpacity={ghost ? 0.4 : 1}
            textAnchor="middle"
            fontWeight="600"
          >
            {objet.nom}
          </text>
          {showSurface && (
            <text
              x={cx}
              y={cy + 16 * strokeBase}
              fontSize={Math.max(14 * strokeBase, 11)}
              fill="#22d3ee"
              fillOpacity={ghost ? 0.4 : 1}
              textAnchor="middle"
              fontWeight="600"
            >
              {surfaceM2.toFixed(1)} m²
            </text>
          )}
          {showOperateurs && objet.operateurs.length > 0 && (
            <text
              x={cx}
              y={cy + (showSurface ? 32 : 16) * strokeBase}
              fontSize={Math.max(14 * strokeBase, 11)}
              fill="#d1d5db"
              fillOpacity={ghost ? 0.4 : 1}
              textAnchor="middle"
            >
              👤 {objet.operateurs.join(', ')}
            </text>
          )}
          {objet.capacite !== undefined && objet.stockActuel !== undefined && (
            <text
              x={cx}
              y={cy + (showSurface ? 48 : 32) * strokeBase}
              fontSize={Math.max(13 * strokeBase, 10)}
              fill="#d1d5db"
              fillOpacity={ghost ? 0.4 : 1}
              textAnchor="middle"
            >
              {objet.stockActuel}/{objet.capacite}
            </text>
          )}
        </g>
      )}

      {/* Handles de redimensionnement */}
      {selected && (
        <g>
          {(['nw', 'ne', 'sw', 'se'] as const).map((h) => {
            const hx = h.includes('w') ? b.x : b.x + b.w;
            const hy = h.includes('n') ? b.y : b.y + b.h;
            const cursor = h === 'nw' || h === 'se' ? 'nwse-resize' : 'nesw-resize';
            return (
              <rect
                key={h}
                x={hx - handleSize / 2}
                y={hy - handleSize / 2}
                width={handleSize}
                height={handleSize}
                fill="#f9fafb"
                stroke="#3b82f6"
                strokeWidth={strokeBase * 1.5}
                style={{ cursor }}
                onMouseDown={(e) => onHandleMouseDown(e, h)}
              />
            );
          })}
        </g>
      )}
    </g>
  );
}
