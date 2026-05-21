import type { IsulaStore, Commande } from './types';
import { DEFAULT_AVERY, DEFAULT_WE, DEFAULT_GLASS } from './types';

const STORAGE_KEY = 'isula_vitrage_store';

function emptyStore(): IsulaStore {
  return {
    commandes: [],
    averySettings: { ...DEFAULT_AVERY },
    weSettings: { ...DEFAULT_WE },
    glassSettings: { ...DEFAULT_GLASS },
  };
}

export function loadStore(): IsulaStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IsulaStore;
      return {
        ...emptyStore(),
        ...parsed,
      };
    }
  } catch { /* ignore */ }
  return emptyStore();
}

export function saveStore(store: IsulaStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function addCommande(store: IsulaStore, cmd: Commande): IsulaStore {
  return { ...store, commandes: [...store.commandes, cmd] };
}

export function updateCommande(store: IsulaStore, id: string, patch: Partial<Commande>): IsulaStore {
  return {
    ...store,
    commandes: store.commandes.map(c => c.id === id ? { ...c, ...patch } : c),
  };
}

export function deleteCommande(store: IsulaStore, id: string): IsulaStore {
  return { ...store, commandes: store.commandes.filter(c => c.id !== id) };
}
