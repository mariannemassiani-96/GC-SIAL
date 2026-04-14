import type { FixationId } from '../types';

export interface FixationDef {
  label: string;
}

export const FIXATIONS: Record<FixationId, FixationDef> = {
  libre: { label: 'Côté libre — bouchon' },
  mur_d: { label: 'Patte murale droite' },
  mur_g: { label: 'Patte murale gauche' },
  raccord90: { label: 'Raccord angle 90°' },
  raccord_droit: { label: 'Raccord droit / éclisse' },
};
