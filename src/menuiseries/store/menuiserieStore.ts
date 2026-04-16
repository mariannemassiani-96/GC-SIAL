import { useState, useCallback } from 'react';
import { v4 as uuid } from 'uuid';
import type { ConfigMenuiserie, Panier, PanierItem, ClientInfo, WizardStep, VarianteId, Variante } from '../types';
import { BRANDING } from '../config/branding';
import { calculerPrix } from '../engine/calcPrix';

const STORAGE_KEY = 'sial-aper-affaires';

// ── Types affaire APER ───────────────────────────────────────────────

export type StatutAffaireAper = 'brouillon' | 'en_cours' | 'a_valider' | 'validee' | 'commandee';

export type TypeBatiment = 'maison' | 'immeuble' | 'tertiaire' | 'erp' | 'industriel';
export type TypeTerrain = 'abrite' | 'normal' | 'expose';
export type TypePose = 'neuf_applique' | 'neuf_tunnel' | 'neuf_feuillure' | 'renovation_depose_totale' | 'renovation_sur_dormant';

export interface ContexteChantier {
  typeBatiment: TypeBatiment;
  hauteurBatiment: number; // mètres
  terrain: TypeTerrain;
  bordDeMer: boolean;
}

export interface ParametresCommuns {
  materiau: string;
  typePose: TypePose;
  colorisInterieur: string;
  colorisExterieur: string;
  vitrage: string;
  quincaillerie: string;
  voletRoulant: boolean;
  moustiquaire: boolean;
}

export interface AffaireAper {
  id: string;
  ref: string;
  nom: string;
  client: string;
  adresse: string;
  dateCreation: string;
  dateModification: string;
  statut: StatutAffaireAper;
  contexte: ContexteChantier;
  parametresCommuns: ParametresCommuns;
  menuiseries: ConfigMenuiserie[];
  variantes: Variante[];
  varianteActive: VarianteId;
  panier: Panier | null;
}

// ── Valeurs par défaut ───────────────────────────────────────────────

function createEmptyAffaireAper(): AffaireAper {
  const now = new Date().toISOString().slice(0, 10);
  const refNum = Date.now().toString(36).toUpperCase().slice(-5);
  return {
    id: uuid(),
    ref: `${BRANDING.devisPrefix}-${now.replace(/-/g, '').slice(2)}-${refNum}`,
    nom: '',
    client: '',
    adresse: '',
    dateCreation: now,
    dateModification: now,
    statut: 'brouillon',
    contexte: {
      typeBatiment: 'maison',
      hauteurBatiment: 6,
      terrain: 'normal',
      bordDeMer: false,
    },
    parametresCommuns: {
      materiau: 'pvc',
      typePose: 'neuf_applique',
      colorisInterieur: 'blanc_9016',
      colorisExterieur: 'blanc_9016',
      vitrage: 'double_standard',
      quincaillerie: 'std_blanc',
      voletRoulant: false,
      moustiquaire: false,
    },
    menuiseries: [],
    variantes: [
      { id: 'A', label: 'Variante A', menuiseries: [], totalHT: 0, totalTTC: 0 },
    ],
    varianteActive: 'A',
    panier: null,
  };
}

export function createEmptyMenuiserie(defaults?: ParametresCommuns): ConfigMenuiserie {
  return {
    id: uuid(),
    typeProduit: 'fenetre',
    materiau: defaults?.materiau as never ?? 'pvc',
    profil: 'pvc_std_70',
    forme: 'rectangulaire',
    nbVantaux: 1,
    imposte: false,
    allege: false,
    largeur: 1000,
    hauteur: 1200,
    vantaux: [{ ouverture: 'oscillo_battant_droit', largeur: 1000 }],
    vitrage: defaults?.vitrage as never ?? 'double_standard',
    couleurExterieure: defaults?.colorisExterieur ?? 'blanc_9016',
    couleurInterieure: defaults?.colorisInterieur ?? 'blanc_9016',
    bicolore: false,
    poignee: defaults?.quincaillerie ?? 'std_blanc',
    croisillons: false,
    securite: 'standard',
    qte: 1,
  };
}

// ── Persistence ──────────────────────────────────────────────────────

function loadAffaires(): AffaireAper[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAffaires(affaires: AffaireAper[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(affaires));
}

// ── Hook principal ───────────────────────────────────────────────────

export function useAffairesAper() {
  const [affaires, setAffaires] = useState<AffaireAper[]>(loadAffaires);

  const persist = useCallback((next: AffaireAper[]) => {
    setAffaires(next);
    saveAffaires(next);
  }, []);

  const addAffaire = useCallback(() => {
    const newAffaire = createEmptyAffaireAper();
    const next = [...loadAffaires(), newAffaire];
    persist(next);
    return newAffaire;
  }, [persist]);

  const updateAffaire = useCallback((id: string, updates: Partial<AffaireAper>) => {
    const next = loadAffaires().map((a) =>
      a.id === id ? { ...a, ...updates, dateModification: new Date().toISOString().slice(0, 10) } : a,
    );
    persist(next);
  }, [persist]);

  const deleteAffaire = useCallback((id: string) => {
    const next = loadAffaires().filter((a) => a.id !== id);
    persist(next);
  }, [persist]);

  const duplicateAffaire = useCallback((id: string) => {
    const source = loadAffaires().find((a) => a.id === id);
    if (!source) return;
    const dup: AffaireAper = {
      ...structuredClone(source),
      id: uuid(),
      ref: `${BRANDING.devisPrefix}-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${Date.now().toString(36).toUpperCase().slice(-5)}`,
      nom: `${source.nom} (copie)`,
      dateCreation: new Date().toISOString().slice(0, 10),
      dateModification: new Date().toISOString().slice(0, 10),
      statut: 'brouillon',
    };
    const next = [...loadAffaires(), dup];
    persist(next);
  }, [persist]);

  // ── Gestion menuiseries dans une affaire ──

  const addMenuiserie = useCallback((affaireId: string) => {
    const all = loadAffaires();
    const affaire = all.find((a) => a.id === affaireId);
    if (!affaire) return;
    const newMenu = createEmptyMenuiserie(affaire.parametresCommuns);
    const next = all.map((a) =>
      a.id === affaireId
        ? { ...a, menuiseries: [...a.menuiseries, newMenu], dateModification: new Date().toISOString().slice(0, 10) }
        : a,
    );
    persist(next);
    return newMenu;
  }, [persist]);

  const updateMenuiserie = useCallback((affaireId: string, menuiserieId: string, updates: Partial<ConfigMenuiserie>) => {
    const all = loadAffaires();
    const next = all.map((a) =>
      a.id === affaireId
        ? {
          ...a,
          menuiseries: a.menuiseries.map((m) => (m.id === menuiserieId ? { ...m, ...updates } : m)),
          dateModification: new Date().toISOString().slice(0, 10),
        }
        : a,
    );
    persist(next);
  }, [persist]);

  const deleteMenuiserie = useCallback((affaireId: string, menuiserieId: string) => {
    const all = loadAffaires();
    const next = all.map((a) =>
      a.id === affaireId
        ? { ...a, menuiseries: a.menuiseries.filter((m) => m.id !== menuiserieId), dateModification: new Date().toISOString().slice(0, 10) }
        : a,
    );
    persist(next);
  }, [persist]);

  const duplicateMenuiserie = useCallback((affaireId: string, menuiserieId: string) => {
    const all = loadAffaires();
    const affaire = all.find((a) => a.id === affaireId);
    const source = affaire?.menuiseries.find((m) => m.id === menuiserieId);
    if (!affaire || !source) return;
    const dup = { ...structuredClone(source), id: uuid() };
    const next = all.map((a) =>
      a.id === affaireId
        ? { ...a, menuiseries: [...a.menuiseries, dup], dateModification: new Date().toISOString().slice(0, 10) }
        : a,
    );
    persist(next);
  }, [persist]);

  // ── Calculer le panier ──

  const calculerPanier = useCallback((affaireId: string, clientInfo: ClientInfo): Panier | null => {
    const affaire = loadAffaires().find((a) => a.id === affaireId);
    if (!affaire || affaire.menuiseries.length === 0) return null;

    const items: PanierItem[] = affaire.menuiseries.map((config) => {
      const prix = calculerPrix(config);
      return {
        config,
        prixUnitaire: prix.prixUnitaireHT,
        prixTotal: prix.totalHT,
        lignesDetail: prix.details,
      };
    });

    const totalHT = items.reduce((acc, i) => acc + i.prixTotal, 0);
    const tva = Math.round(totalHT * 0.2);

    return {
      id: uuid(),
      items,
      client: clientInfo,
      dateCreation: new Date().toISOString().slice(0, 10),
      totalHT,
      tva,
      totalTTC: totalHT + tva,
    };
  }, []);

  return {
    affaires,
    addAffaire,
    updateAffaire,
    deleteAffaire,
    duplicateAffaire,
    addMenuiserie,
    updateMenuiserie,
    deleteMenuiserie,
    duplicateMenuiserie,
    calculerPanier,
  };
}

// ── Hook wizard pour une menuiserie ──────────────────────────────────

export function useWizard(initial?: Partial<ConfigMenuiserie>) {
  const [step, setStep] = useState<WizardStep>(1);
  const [maxStep, setMaxStep] = useState<WizardStep>(1);
  const [config, setConfig] = useState<Partial<ConfigMenuiserie>>(initial ?? {});

  const goTo = useCallback((s: WizardStep) => {
    if (s <= maxStep) setStep(s);
  }, [maxStep]);

  const next = useCallback(() => {
    const nextStep = Math.min(step + 1, 8) as WizardStep;
    setStep(nextStep);
    if (nextStep > maxStep) setMaxStep(nextStep);
  }, [step, maxStep]);

  const prev = useCallback(() => {
    setStep(Math.max(step - 1, 1) as WizardStep);
  }, [step]);

  const updateConfig = useCallback((updates: Partial<ConfigMenuiserie>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  }, []);

  const prix = calculerPrix(config);

  return { step, maxStep, config, prix, goTo, next, prev, updateConfig, setConfig };
}
