import { useState, useEffect, useRef, useCallback } from 'react';
import { saveDoc, getDoc } from './api';

const DEBOUNCE_MS = 800;

export function useApiState<T>(
  app: string,
  collection: string,
  localKey: string,
  fallback: T,
): [T, (v: T | ((prev: T) => T)) => void, boolean] {
  const [data, setDataRaw] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(localKey);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    getDoc<{ payload: T }>(app, collection, 'state')
      .then((doc) => {
        if (mountedRef.current && doc.payload !== undefined) {
          setDataRaw(doc.payload);
          localStorage.setItem(localKey, JSON.stringify(doc.payload));
        }
      })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return () => { mountedRef.current = false; };
  }, [app, collection, localKey]);

  const setData = useCallback((v: T | ((prev: T) => T)) => {
    setDataRaw((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      localStorage.setItem(localKey, JSON.stringify(next));
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        saveDoc(app, collection, 'state', { payload: next }).catch(() => {});
      }, DEBOUNCE_MS);
      return next;
    });
  }, [app, collection, localKey]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return [data, setData, loading];
}
