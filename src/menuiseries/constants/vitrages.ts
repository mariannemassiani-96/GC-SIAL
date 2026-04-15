import type { VitrageDef } from '../types';

export const VITRAGES: VitrageDef[] = [
  {
    id: 'double_standard',
    label: 'Double vitrage standard',
    description: '4/16/4 argon — Isolation thermique courante',
    ug: 1.1,
    affaiblissement: 29,
    coefPrix: 1.0,
  },
  {
    id: 'double_phonique',
    label: 'Double vitrage phonique',
    description: '10/16/4 argon — Isolation acoustique renforcée (classe 4)',
    ug: 1.1,
    affaiblissement: 37,
    coefPrix: 1.25,
  },
  {
    id: 'double_securite',
    label: 'Double vitrage sécurité',
    description: '44.2/16/4 argon — Verre feuilleté anti-effraction',
    ug: 1.1,
    affaiblissement: 33,
    classeSecurite: 'P2A',
    coefPrix: 1.4,
  },
  {
    id: 'double_solaire',
    label: 'Double vitrage contrôle solaire',
    description: '4/16/4 argon + couche solaire — Limite la chaleur en été',
    ug: 1.1,
    affaiblissement: 29,
    coefPrix: 1.3,
  },
  {
    id: 'triple_standard',
    label: 'Triple vitrage standard',
    description: '4/12/4/12/4 argon — Isolation thermique maximale',
    ug: 0.7,
    affaiblissement: 32,
    coefPrix: 1.45,
  },
  {
    id: 'triple_phonique',
    label: 'Triple vitrage phonique',
    description: '8/12/4/12/6 argon — Isolation thermique et acoustique maximale',
    ug: 0.7,
    affaiblissement: 40,
    coefPrix: 1.65,
  },
  {
    id: 'triple_securite',
    label: 'Triple vitrage sécurité',
    description: '44.2/12/4/12/4 argon — Feuilleté + isolation maximale',
    ug: 0.7,
    affaiblissement: 35,
    classeSecurite: 'P2A',
    coefPrix: 1.8,
  },
];

export function getVitrageDef(id: string): VitrageDef | undefined {
  return VITRAGES.find((v) => v.id === id);
}
