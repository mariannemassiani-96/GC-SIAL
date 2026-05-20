import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Affaire, Travee, TraveeConfig } from '../types';
import { useApiState } from '../useApiState';

const STORAGE_KEY = 'sial-gc-affaires';

const DEFAULT_CONFIG: TraveeConfig = {
  typeGC: 'barreau',
  pose: 'dalle',
  mc: 'std',
  lieu: 'prive',
  rampant: false,
  angle: 0,
  fixG: 'libre',
  fixD: 'libre',
  hauteur: 1050,
};

function migrateTraveeRaid(t: any): any {
  if (t.nbRaidForce != null || t.posRaidForce != null) {
    if (!t.raidCentre) {
      t.raidCentre = {};
      if (t.nbRaidForce) t.raidCentre.nb = t.nbRaidForce;
      if (t.posRaidForce) t.raidCentre.positions = t.posRaidForce;
    }
    delete t.nbRaidForce;
    delete t.posRaidForce;
  }
  return t;
}

/** Migrate old format (config on Affaire) to new format (config on Travee) */
function migrateAffaire(a: any): Affaire {
  if (a.travees) {
    a.travees = a.travees.map(migrateTraveeRaid);
  }
  // Already new format
  if (a.defaults) return a;

  // Old format: config fields on Affaire directly
  const defaults: TraveeConfig = {
    typeGC: a.typeGC ?? DEFAULT_CONFIG.typeGC,
    pose: a.pose ?? DEFAULT_CONFIG.pose,
    mc: a.mc ?? DEFAULT_CONFIG.mc,
    lieu: a.lieu ?? DEFAULT_CONFIG.lieu,
    rampant: a.rampant ?? DEFAULT_CONFIG.rampant,
    angle: a.angle ?? DEFAULT_CONFIG.angle,
    fixG: a.fixG ?? DEFAULT_CONFIG.fixG,
    fixD: a.fixD ?? DEFAULT_CONFIG.fixD,
    hauteur: a.hauteur ?? DEFAULT_CONFIG.hauteur,
  };

  // Migrate travees: inject config if missing
  const travees = (a.travees ?? []).map((t: any) => ({
    ...t,
    typeGC: t.typeGC ?? defaults.typeGC,
    pose: t.pose ?? defaults.pose,
    mc: t.mc ?? defaults.mc,
    lieu: t.lieu ?? defaults.lieu,
    rampant: t.rampant ?? defaults.rampant,
    angle: t.angle ?? defaults.angle,
    fixG: t.fixG ?? defaults.fixG,
    fixD: t.fixD ?? defaults.fixD,
    hauteur: t.hauteur ?? defaults.hauteur,
    largeur2: t.largeur2 ?? 0,
    largeur3: t.largeur3 ?? 0,
  }));

  return {
    id: a.id,
    ref: a.ref,
    client: a.client ?? '',
    chantier: a.chantier ?? '',
    date: a.date,
    coloris: a.coloris ?? 'RAL 7016',
    defaults,
    travees,
    statut: a.statut ?? 'brouillon',
  };
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
    defaults: { ...DEFAULT_CONFIG },
    travees: [],
    statut: 'brouillon',
  };
}

/** Crée une travée pré-remplie avec les défauts de l'affaire (ou de la travée source pour la duplication) */
export function createEmptyTravee(index: number, config: TraveeConfig): Travee {
  return {
    id: uuidv4(),
    etage: 'RDC',
    repere: `T${String(index).padStart(2, '0')}`,
    largeur: 2000,
    largeur2: 0,
    largeur3: 0,
    qte: 1,
    coupeG: '90',
    coupeD: '90',
    ...config,
  };
}

/** Duplique une travée existante avec un nouvel ID et repère */
export function duplicateTravee(source: Travee, newIndex: number): Travee {
  return {
    ...JSON.parse(JSON.stringify(source)),
    id: uuidv4(),
    repere: `T${String(newIndex).padStart(2, '0')}`,
  };
}

export function useAffaires() {
  const [rawAffaires, setAffaires] = useApiState<Affaire[]>('gc', 'affaires', STORAGE_KEY, []);
  const affaires = rawAffaires.map(migrateAffaire);

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
      dup.travees = dup.travees.map((t: Travee) => ({ ...t, id: uuidv4() }));
      return [dup, ...prev];
    });
  }, []);

  return { affaires, addAffaire, updateAffaire, deleteAffaire, duplicateAffaire };
}
