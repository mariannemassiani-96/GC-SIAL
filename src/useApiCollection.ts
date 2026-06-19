/**
 * Hook for persisting a collection of documents to the OVH API.
 * Each document is saved independently (PUT /api/data/:app/:collection/:docId).
 * Includes auto-save on changes with debounce, and flush on beforeunload.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getData, saveDoc, deleteDoc } from './api';

interface SyncState {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  lastSaved: string | null;
}

export function useApiCollection<T extends { id: string }>(
  app: string,
  collection: string,
  fallbackKey?: string,
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [sync, setSync] = useState<SyncState>({ status: 'idle', lastSaved: null });
  const pendingRef = useRef<Set<string>>(new Set());
  const deletedRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const itemsRef = useRef<T[]>([]);

  itemsRef.current = items;

  const load = useCallback(async () => {
    try {
      const data = await getData<T>(app, collection);
      setItems(data);
      setLoading(false);
    } catch {
      if (fallbackKey) {
        try {
          const raw = localStorage.getItem(fallbackKey);
          if (raw) setItems(JSON.parse(raw));
        } catch { /* ignore */ }
      }
      setSync({ status: 'offline', lastSaved: null });
      setLoading(false);
    }
  }, [app, collection, fallbackKey]);

  useEffect(() => { load(); }, [load]);

  const flush = useCallback(async () => {
    const toSave = [...pendingRef.current];
    const toDelete = [...deletedRef.current];
    if (toSave.length === 0 && toDelete.length === 0) return;

    setSync(s => ({ ...s, status: 'saving' }));
    try {
      for (const id of toSave) {
        const item = itemsRef.current.find(i => i.id === id);
        if (item) await saveDoc(app, collection, id, item);
      }
      for (const id of toDelete) {
        await deleteDoc(app, collection, id);
      }
      pendingRef.current.clear();
      deletedRef.current.clear();
      setSync({ status: 'saved', lastSaved: new Date().toISOString() });
    } catch {
      setSync(s => ({ ...s, status: 'error' }));
    }
  }, [app, collection]);

  const scheduleFlush = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flush, 1500);
  }, [flush]);

  useEffect(() => {
    const onUnload = () => {
      if (pendingRef.current.size > 0 || deletedRef.current.size > 0) {
        const toSave = [...pendingRef.current];
        for (const id of toSave) {
          const item = itemsRef.current.find(i => i.id === id);
          if (item) {
            navigator.sendBeacon(
              `${import.meta.env.VITE_API_URL || ''}/api/data/${app}/${collection}/${id}`,
              JSON.stringify(item),
            );
          }
        }
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [app, collection]);

  const upsert = useCallback((item: T) => {
    setItems(prev => {
      const idx = prev.findIndex(i => i.id === item.id);
      return idx >= 0 ? prev.map(i => i.id === item.id ? item : i) : [...prev, item];
    });
    pendingRef.current.add(item.id);
    scheduleFlush();
  }, [scheduleFlush]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    pendingRef.current.delete(id);
    deletedRef.current.add(id);
    scheduleFlush();
  }, [scheduleFlush]);

  return { items, loading, sync, upsert, remove, reload: load, flush };
}
