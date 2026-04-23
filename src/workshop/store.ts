import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Plan, Objet, ObjetType, Contrainte, Flux, NiveauId } from './types';
import { CATALOG } from './catalog';

const STORAGE_KEY = 'sial-workshop-plans';

/** Niveau par défaut pour migrations d'anciens plans */
const DEFAULT_NIVEAU: NiveauId = 'rdc';

function migratePlan(p: any): Plan {
  const niveaux = p.niveaux
    ? p.niveaux.map((n: any) => ({ ...n, hauteurSousPlafond: n.hauteurSousPlafond ?? 350 }))
    : [
        { id: 'rdc', nom: 'RDC', ordre: 0, hauteurSousPlafond: 350 },
        { id: 'r1', nom: 'Mezzanine', ordre: 1, hauteurSousPlafond: 250 },
      ];

  const objets: Objet[] = (p.objets ?? []).map((o: any) => ({
    ...o,
    niveau: o.niveau ?? DEFAULT_NIVEAU,
  }));

  // Migration : si l'ancien plan avait largeurAtelier/hauteurAtelier, on en fait le bâtiment dans un site plus grand
  const largeurBatiment = p.batiment?.largeur ?? p.largeurAtelier ?? 3000;
  const hauteurBatiment = p.batiment?.hauteur ?? p.hauteurAtelier ?? 2000;
  const largeurSite = p.largeurSite ?? Math.max(largeurBatiment + 2000, 8000);
  const hauteurSite = p.hauteurSite ?? Math.max(hauteurBatiment + 2000, 5000);

  const batiment = p.batiment ?? {
    x: Math.round((largeurSite - largeurBatiment) / 2),
    y: Math.round((hauteurSite - hauteurBatiment) / 2),
    largeur: largeurBatiment,
    hauteur: hauteurBatiment,
    epaisseurMurs: 20,
  };

  return {
    id: p.id,
    nom: p.nom,
    date: p.date,
    largeurSite,
    hauteurSite,
    batiment,
    tailleGrille: p.tailleGrille ?? 10,
    niveaux,
    objets,
    contraintes: p.contraintes ?? [],
    flux: p.flux ?? [],
    annotations: p.annotations ?? [],
    cotations: p.cotations ?? [],
  };
}

function loadPlans(): Plan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return (parsed as any[]).map(migratePlan);
    }
  } catch {
    /* ignore */
  }
  return [];
}

function savePlans(plans: Plan[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
}

export function createEmptyPlan(nom = 'Nouveau site'): Plan {
  // Site 50×30m, bâtiment 30×20m centré
  return {
    id: uuidv4(),
    nom,
    date: new Date().toISOString().slice(0, 10),
    largeurSite: 5000,
    hauteurSite: 3000,
    batiment: {
      x: 1000,
      y: 500,
      largeur: 3000,
      hauteur: 2000,
      epaisseurMurs: 20,
    },
    tailleGrille: 10,
    niveaux: [
      { id: 'rdc', nom: 'RDC', ordre: 0, hauteurSousPlafond: 350 },
      { id: 'r1', nom: 'Mezzanine', ordre: 1, hauteurSousPlafond: 250 },
    ],
    objets: [],
    contraintes: [],
    flux: [],
    annotations: [],
    cotations: [],
  };
}

export function createObjet(type: ObjetType, niveau: NiveauId, x: number, y: number, index: number): Objet {
  const cat = CATALOG[type];
  return {
    id: uuidv4(),
    type,
    nom: `${cat.label} ${index}`,
    niveau,
    x,
    y,
    largeur: cat.defaultLargeur,
    hauteur: cat.defaultHauteur,
    rotation: 0,
    couleur: cat.couleur,
    operateurs: [],
  };
}

export function createContrainte(type: Contrainte['type'], objetA: string, objetB: string, valeur?: number): Contrainte {
  return { id: uuidv4(), type, objetA, objetB, valeur };
}

export function createFlux(from: string, to: string, debit = 100): Flux {
  return { id: uuidv4(), from, to, debit };
}

// =========================================================================
// Bibliothèque de préréglages personnalisés (localStorage)
// =========================================================================

import type { Preset } from './presets';
const CUSTOM_PRESETS_KEY = 'sial-workshop-custom-presets';

function loadCustomPresets(): Preset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (raw) return JSON.parse(raw) as Preset[];
  } catch {
    /* ignore */
  }
  return [];
}

export function useCustomPresets() {
  const [customs, setCustoms] = useState<Preset[]>(loadCustomPresets);

  useEffect(() => {
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(customs));
  }, [customs]);

  const addCustom = useCallback((p: Preset) => {
    setCustoms((prev) => [p, ...prev.filter((x) => x.nom !== p.nom)]);
  }, []);

  const removeCustom = useCallback((nom: string) => {
    setCustoms((prev) => prev.filter((p) => p.nom !== nom));
  }, []);

  return { customs, addCustom, removeCustom };
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(loadPlans);

  useEffect(() => {
    savePlans(plans);
  }, [plans]);

  const addPlan = useCallback((plan?: Plan) => {
    const p = plan ?? createEmptyPlan();
    setPlans((prev) => [p, ...prev]);
    return p;
  }, []);

  const updatePlan = useCallback((id: string, updates: Partial<Plan> | ((p: Plan) => Plan)) => {
    setPlans((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        return typeof updates === 'function' ? updates(p) : { ...p, ...updates };
      })
    );
  }, []);

  const deletePlan = useCallback((id: string) => {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const duplicatePlan = useCallback((id: string) => {
    setPlans((prev) => {
      const src = prev.find((p) => p.id === id);
      if (!src) return prev;
      const clone: Plan = JSON.parse(JSON.stringify(src));
      clone.id = uuidv4();
      clone.nom = `${src.nom} (copie)`;
      clone.date = new Date().toISOString().slice(0, 10);
      return [clone, ...prev];
    });
  }, []);

  const createVariante = useCallback((id: string, label?: string) => {
    setPlans((prev) => {
      const src = prev.find((p) => p.id === id);
      if (!src) return prev;
      const parentId = src.parentId ?? src.id;
      const siblings = prev.filter((p) => p.parentId === parentId || p.id === parentId);
      const maxVersion = Math.max(...siblings.map((p) => p.version ?? 1), 0);
      const clone: Plan = JSON.parse(JSON.stringify(src));
      clone.id = uuidv4();
      clone.parentId = parentId;
      clone.version = maxVersion + 1;
      clone.varianteLabel = label ?? `Variante ${maxVersion + 1}`;
      clone.nom = `${src.nom.replace(/ \(v\d+\)$/, '')} (v${maxVersion + 1})`;
      clone.date = new Date().toISOString().slice(0, 10);
      return [clone, ...prev];
    });
  }, []);

  return { plans, addPlan, updatePlan, deletePlan, duplicatePlan, createVariante };
}
