import type { TarifKawneer, TarifItem, ClasseColoris } from '../types';
import { PROFILS, ACCESSOIRES } from '../constants/profils';
import { useApiState } from '../useApiState';

const STORAGE_KEY = 'sial-gc-tarif';

const CLASSES_LABELS: Record<ClasseColoris, string> = {
  1: 'Classe 1 — Brut / Standard',
  2: 'Classe 2 — Laqué standard',
  3: 'Classe 3 — Laqué spécial',
  4: 'Classe 4 — Anodisé / Texturé',
};

export { CLASSES_LABELS };

function defaultTarif(): TarifKawneer {
  const prix: Record<string, TarifItem> = {};
  for (const ref of Object.keys(PROFILS)) {
    prix[ref] = { classe1: 0, classe2: 0, classe3: 0, classe4: 0 };
  }
  for (const ref of Object.keys(ACCESSOIRES)) {
    prix[ref] = { classe1: 0, classe2: 0, classe3: 0, classe4: 0 };
  }
  return { dateMAJ: '', prix };
}

export function useTarif() {
  const [tarif, setTarif] = useApiState<TarifKawneer>(STORAGE_KEY, defaultTarif());

  const updatePrix = (ref: string, item: Partial<TarifItem>) => {
    setTarif({
      ...tarif,
      dateMAJ: new Date().toISOString().slice(0, 10),
      prix: { ...tarif.prix, [ref]: { ...(tarif.prix[ref] ?? { classe1: 0, classe2: 0, classe3: 0, classe4: 0 }), ...item } },
    });
  };

  const getPrix = (ref: string, classe: ClasseColoris): number => {
    const item = tarif.prix[ref];
    if (!item) return 0;
    return item[`classe${classe}`];
  };

  return { tarif, setTarif, updatePrix, getPrix };
}
