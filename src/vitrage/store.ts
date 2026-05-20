import type { VitrageStore, Vitrage, Plaque } from './types';
import { DEFAULT_AVERY, DEFAULT_WE } from './types';

const STORAGE_KEY = 'sial_vitrage_store';

export function loadVitrageStore(): VitrageStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as VitrageStore;
  } catch { /* ignore */ }
  return {
    vitrages: [],
    plaques: [],
    commandeLabel: '',
    averySettings: { ...DEFAULT_AVERY },
    weSettings: { ...DEFAULT_WE },
  };
}

export function saveVitrageStore(store: VitrageStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addVitrages(store: VitrageStore, vitrages: Vitrage[]): VitrageStore {
  return { ...store, vitrages: [...store.vitrages, ...vitrages] };
}

export function setPlaques(store: VitrageStore, plaques: Plaque[]): VitrageStore {
  return { ...store, plaques };
}

export function clearStore(): VitrageStore {
  return {
    vitrages: [],
    plaques: [],
    commandeLabel: '',
    averySettings: { ...DEFAULT_AVERY },
    weSettings: { ...DEFAULT_WE },
  };
}
