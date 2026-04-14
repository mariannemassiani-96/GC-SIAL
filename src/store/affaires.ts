import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Affaire, Travee } from '../types';

const STORAGE_KEY = 'sial-gc-affaires';

function loadAffaires(): Affaire[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return [];
}

function saveAffaires(affaires: Affaire[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(affaires));
}

export function createEmptyAffaire(): Affaire {
  const now = new Date();
  const year = now.getFullYear();
  const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');

  return {
    id: uuidv4(),
    ref: `GC-${year}-${num}`,
    client: '',
    chantier: '',
    date: now.toISOString().slice(0, 10),
    coloris: 'RAL 7016',
    typeGC: 'barreau',
    pose: 'dalle',
    mc: 'std',
    lieu: 'prive',
    rampant: false,
    angle: 0,
    fixG: 'libre',
    fixD: 'libre',
    hauteur: 1050,
    travees: [],
    statut: 'brouillon',
  };
}

export function createEmptyTravee(index: number): Travee {
  return {
    id: uuidv4(),
    etage: 'RDC',
    repere: `T${String(index).padStart(2, '0')}`,
    largeur: 2000,
    hauteur: 1050,
    qte: 1,
    coupeG: '90',
    coupeD: '90',
  };
}

export function useAffaires() {
  const [affaires, setAffaires] = useState<Affaire[]>(loadAffaires);

  useEffect(() => {
    saveAffaires(affaires);
  }, [affaires]);

  const addAffaire = useCallback((affaire?: Affaire) => {
    const newAffaire = affaire ?? createEmptyAffaire();
    setAffaires((prev) => [newAffaire, ...prev]);
    return newAffaire;
  }, []);

  const updateAffaire = useCallback((id: string, updates: Partial<Affaire>) => {
    setAffaires((prev) =>
      prev.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  }, []);

  const deleteAffaire = useCallback((id: string) => {
    setAffaires((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const duplicateAffaire = useCallback((id: string) => {
    setAffaires((prev) => {
      const source = prev.find((a) => a.id === id);
      if (!source) return prev;
      const now = new Date();
      const year = now.getFullYear();
      const num = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
      const dup: Affaire = {
        ...JSON.parse(JSON.stringify(source)),
        id: uuidv4(),
        ref: `GC-${year}-${num}`,
        date: now.toISOString().slice(0, 10),
        statut: 'brouillon',
      };
      // Regenerate travee IDs
      dup.travees = dup.travees.map((t: Travee) => ({ ...t, id: uuidv4() }));
      return [dup, ...prev];
    });
  }, []);

  return { affaires, addAffaire, updateAffaire, deleteAffaire, duplicateAffaire };
}
