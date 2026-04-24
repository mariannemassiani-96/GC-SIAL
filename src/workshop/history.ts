// ── Système d'historique Undo/Redo pour le Plan Atelier ───────────────
import { useState, useCallback, useRef } from 'react';
import type { Plan } from './types';

const MAX_HISTORY = 50;

export function useHistory(initialPlan: Plan, onUpdate: (updates: Partial<Plan> | ((p: Plan) => Plan)) => void) {
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const lastSnapshot = useRef<string>(JSON.stringify(initialPlan));
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);

  const snapshot = useCallback((plan: Plan) => {
    const json = JSON.stringify(plan);
    if (json !== lastSnapshot.current) {
      undoStack.current.push(lastSnapshot.current);
      if (undoStack.current.length > MAX_HISTORY) undoStack.current.shift();
      redoStack.current = [];
      lastSnapshot.current = json;
      setUndoCount(undoStack.current.length);
      setRedoCount(0);
    }
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(lastSnapshot.current);
    lastSnapshot.current = prev;
    const plan = JSON.parse(prev) as Plan;
    onUpdate(() => plan);
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
  }, [onUpdate]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(lastSnapshot.current);
    lastSnapshot.current = next;
    const plan = JSON.parse(next) as Plan;
    onUpdate(() => plan);
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
  }, [onUpdate]);

  return { snapshot, undo, redo, canUndo: undoCount > 0, canRedo: redoCount > 0 };
}
