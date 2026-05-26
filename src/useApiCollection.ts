import { useState, useEffect, useRef, useCallback } from 'react';
import { getData, getDoc, saveDoc, deleteDoc } from './api';

const DEBOUNCE_MS = 800;
const SAVED_FLASH_MS = 2000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

interface PendingTask<T> {
  type: 'save' | 'delete';
  id: string;
  item?: T;
}

/**
 * Hook gérant une collection de documents stockés un-par-un sur le serveur OVH.
 *
 * Avantages vs `useApiState` :
 *  - Chaque modification ne renvoie qu'un seul document (plus de payload XL)
 *  - Suppression réelle côté serveur
 *  - Indicateur de sync exposé (idle/saving/saved/error/offline)
 *  - Cache localStorage protégé contre QuotaExceededError
 *  - Migration automatique depuis l'ancien format `{ payload: T[] }` sous docId 'state'
 *
 * Le caller continue d'utiliser `setItems(prev => ...)` comme un useState. Le diff
 * se fait par référence (repose sur l'immutabilité des updates React).
 */
export function useApiCollection<T>(
  app: string,
  collection: string,
  getId: (item: T) => string,
  localKey: string,
  fallback: T[],
): {
  items: T[];
  setItems: (next: T[] | ((prev: T[]) => T[])) => void;
  loading: boolean;
  syncStatus: SyncStatus;
  lastError: string | null;
  flushNow: () => Promise<void>;
} {
  const [items, setItemsRaw] = useState<T[]>(() => {
    try {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  });

  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const pendingRef = useRef<Map<string, PendingTask<T>>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flushInFlight = useRef<Promise<void> | null>(null);

  const safeSetLocalStorage = useCallback((data: T[]) => {
    try {
      localStorage.setItem(localKey, JSON.stringify(data));
    } catch {
      // Quota dépassé → on ignore, le serveur reste source de vérité
    }
  }, [localKey]);

  // ── Chargement initial + migration ancien format ──
  useEffect(() => {
    mountedRef.current = true;
    setLoading(true);

    (async () => {
      try {
        const serverItems = await getData<unknown>(app, collection);
        // Détection de l'ancien format : un seul doc avec { payload: T[] }
        const isLegacy = Array.isArray(serverItems) && serverItems.length === 1 &&
          typeof serverItems[0] === 'object' && serverItems[0] !== null &&
          'payload' in (serverItems[0] as object) &&
          Array.isArray((serverItems[0] as { payload: unknown }).payload);
        if (isLegacy) {
          // Migration : on sauve chaque item séparément puis on supprime 'state'
          const legacy = await getDoc<{ payload: T[] }>(app, collection, 'state').catch(() => null);
          if (legacy?.payload && Array.isArray(legacy.payload)) {
            const migrated = legacy.payload;
            if (mountedRef.current) {
              setItemsRaw(migrated);
              safeSetLocalStorage(migrated);
              // Programmer la migration côté serveur (sauve chaque item puis supprime 'state')
              for (const item of migrated) {
                pendingRef.current.set(getId(item), { type: 'save', id: getId(item), item });
              }
              pendingRef.current.set('state', { type: 'delete', id: 'state' });
            }
            // On force le flush immédiatement (migration)
            queueMicrotask(() => { void doFlush(); });
            return;
          }
        }

        if (Array.isArray(serverItems)) {
          const clean = serverItems as T[];
          if (mountedRef.current) {
            setItemsRaw(clean);
            safeSetLocalStorage(clean);
          }
        }
      } catch (e) {
        if (mountedRef.current) {
          setSyncStatus('offline');
          setLastError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    })();

    return () => {
      mountedRef.current = false;
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app, collection]);

  // ── Flush des tâches en attente ──
  const doFlush = useCallback(async (): Promise<void> => {
    if (flushInFlight.current) return flushInFlight.current;
    if (pendingRef.current.size === 0) return;
    const tasks = [...pendingRef.current.values()];
    pendingRef.current.clear();

    const promise = (async () => {
      if (mountedRef.current) setSyncStatus('saving');
      let errorMsg: string | null = null;
      for (const task of tasks) {
        try {
          if (task.type === 'save' && task.item !== undefined) {
            await saveDoc(app, collection, task.id, task.item);
          } else if (task.type === 'delete') {
            await deleteDoc(app, collection, task.id).catch(() => {/* ok si déjà absent */});
          }
        } catch (e) {
          errorMsg = e instanceof Error ? e.message : String(e);
          // En cas d'erreur, on re-met la tâche dans la file pour réessayer
          pendingRef.current.set(task.id, task);
        }
      }
      if (!mountedRef.current) return;
      if (errorMsg) {
        setSyncStatus('error');
        setLastError(errorMsg);
      } else {
        setSyncStatus('saved');
        setLastError(null);
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSyncStatus('idle');
        }, SAVED_FLASH_MS);
      }
    })();
    flushInFlight.current = promise;
    try { await promise; } finally { flushInFlight.current = null; }
  }, [app, collection]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => { void doFlush(); }, DEBOUNCE_MS);
  }, [doFlush]);

  // ── Sauvegarde immédiate avant fermeture / refresh ──
  useEffect(() => {
    const handler = () => {
      // Annule debounce, flush immédiat (le navigateur peut couper, mais on tente)
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
      void doFlush();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [doFlush]);

  // ── setItems avec diff par référence ──
  const setItems = useCallback((next: T[] | ((prev: T[]) => T[])) => {
    setItemsRaw(prev => {
      const newItems = typeof next === 'function' ? (next as (p: T[]) => T[])(prev) : next;

      const prevMap = new Map<string, T>();
      for (const it of prev) prevMap.set(getId(it), it);
      const nextMap = new Map<string, T>();
      for (const it of newItems) nextMap.set(getId(it), it);

      // Sauvegardes : items dont la référence a changé OU nouveaux items
      for (const [id, item] of nextMap) {
        const old = prevMap.get(id);
        if (old !== item) pendingRef.current.set(id, { type: 'save', id, item });
      }
      // Suppressions
      for (const id of prevMap.keys()) {
        if (!nextMap.has(id)) pendingRef.current.set(id, { type: 'delete', id });
      }

      safeSetLocalStorage(newItems);
      scheduleFlush();
      return newItems;
    });
  }, [getId, safeSetLocalStorage, scheduleFlush]);

  const flushNow = useCallback(async () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    await doFlush();
  }, [doFlush]);

  return { items, setItems, loading, syncStatus, lastError, flushNow };
}
