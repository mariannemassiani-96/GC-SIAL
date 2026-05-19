import type { TypeGCId, MCId } from '../types';

export interface TypeGCDef {
  label: string;
  hasBarreaux: boolean;
  hasRemplissage: boolean;
  nbTubesRonds: number;
  hasLisseInter: boolean;
  hMax: number | null;
}

export const TYPES_GC: Record<TypeGCId, TypeGCDef> = {
  barreau: {
    label: 'Barreaudé vertical',
    hasBarreaux: true,
    hasRemplissage: false,
    nbTubesRonds: 0,
    hasLisseInter: false,
    hMax: null,
  },
  barreau_vide: {
    label: 'Barreaudé avec vide sous lisse',
    hasBarreaux: true,
    hasRemplissage: false,
    nbTubesRonds: 0,
    hasLisseInter: true,
    hMax: null,
  },
  remplissage: {
    label: 'Remplissage Stadip 44.2',
    hasBarreaux: false,
    hasRemplissage: true,
    nbTubesRonds: 0,
    hasLisseInter: false,
    hMax: null,
  },
  remplissage_1lisse: {
    label: 'Remplissage + 1 lisse ronde',
    hasBarreaux: false,
    hasRemplissage: true,
    nbTubesRonds: 1,
    hasLisseInter: false,
    hMax: null,
  },
  remplissage_2lisses: {
    label: 'Remplissage + 2 lisses rondes (Paquebot)',
    hasBarreaux: false,
    hasRemplissage: true,
    nbTubesRonds: 2,
    hasLisseInter: false,
    hMax: null,
  },
  bateau1: {
    label: 'Bateau 1 lisse ronde',
    hasBarreaux: false,
    hasRemplissage: false,
    nbTubesRonds: 1,
    hasLisseInter: false,
    hMax: 400,
  },
  bateau2: {
    label: 'Bateau 2 lisses rondes',
    hasBarreaux: false,
    hasRemplissage: false,
    nbTubesRonds: 2,
    hasLisseInter: false,
    hMax: 560,
  },
};

export interface MCDef {
  label: string;
  ref: string;
  bouchon: string;
  hauteur: number;
  debits: {
    dalle: { raidisseur: number; barreau: number };
    anglaise: { raidisseur: number; barreau: number };
  };
}

export const TYPES_MC: Record<MCId, MCDef> = {
  std: {
    label: 'MC 25mm plate — 180030',
    ref: '180030',
    bouchon: '127143',
    hauteur: 25,
    debits: {
      dalle:    { raidisseur: -30, barreau: -53 },
      anglaise: { raidisseur: 102, barreau: -53 },
    },
  },
  mc80: {
    label: 'MC 80mm — 180031',
    ref: '180031',
    bouchon: '127143',
    hauteur: 80,
    debits: {
      dalle:    { raidisseur: -85, barreau: -78 },
      anglaise: { raidisseur: 47,  barreau: -78 },
    },
  },
  design: {
    label: 'MC Design ogive 90×25 — 180032',
    ref: '180032',
    bouchon: '127143',
    hauteur: 25,
    debits: {
      dalle:    { raidisseur: -30, barreau: -43 },
      anglaise: { raidisseur: 102, barreau: -43 },
    },
  },
  ronde: {
    label: 'MC Ronde Ø60 — 180033',
    ref: '180033',
    bouchon: '127158',
    hauteur: 48,
    debits: {
      dalle:    { raidisseur: -53, barreau: -46 },
      anglaise: { raidisseur: 79,  barreau: -46 },
    },
  },
};

export interface PoseDef {
  label: string;
  sabot: string;
}

export const POSE_DATA: Record<'dalle' | 'anglaise', PoseDef> = {
  dalle: {
    label: 'Sur dalle — à la française',
    sabot: '6003992',
  },
  anglaise: {
    label: 'Sur nez de dalle — à l\'anglaise',
    sabot: '6004105',
  },
};
