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
  barreauDelta: number;
  raidKey: 'std' | 'ronde';
  hauteur: number;
}

export const TYPES_MC: Record<MCId, MCDef> = {
  std: {
    label: 'Standard plate 52×25',
    ref: '180030',
    bouchon: '127143',
    barreauDelta: -23,
    raidKey: 'std',
    hauteur: 25,
  },
  design: {
    label: 'Design ogive 90×25',
    ref: '180032',
    bouchon: '127143',
    barreauDelta: -23,
    raidKey: 'std',
    hauteur: 25,
  },
  ronde: {
    label: 'Ronde Ø60',
    ref: '180033',
    bouchon: '127158',
    barreauDelta: -46,
    raidKey: 'ronde',
    hauteur: 48,
  },
};

export interface PoseDef {
  label: string;
  sabot: string;
  offsets: {
    std: number;
    ronde: number;
  };
}

export const POSE_DATA: Record<'dalle' | 'anglaise', PoseDef> = {
  dalle: {
    label: 'Sur dalle — à la française',
    sabot: '6003992',
    offsets: { std: -30, ronde: -53 },
  },
  anglaise: {
    label: 'Sur nez de dalle — à l\'anglaise',
    sabot: '6004105',
    offsets: { std: 102, ronde: 79 },
  },
};
