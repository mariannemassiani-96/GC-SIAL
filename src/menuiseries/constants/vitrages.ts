import type { VitrageDef } from '../types';

// ─── Vitrages calqués sur fenetre24.com ───────────────────────────────
// IMPORTANT : les coefPrix ici DOIVENT correspondre à COEF_VITRAGE dans prix.ts
// Le moteur calcPrix.ts utilise COEF_VITRAGE de prix.ts, mais ces coefPrix
// sont affichés dans l'UI (Step5Vitrage). Ils doivent être synchronisés.

export const VITRAGES: VitrageDef[] = [
  // ── Double vitrage ──────────────────────────────────
  {
    id: 'double_standard',
    label: 'Double vitrage standard',
    description: '4/16/4 argon — Isolation thermique courante, inclus dans le prix de base',
    ug: 1.1,
    affaiblissement: 29,
    coefPrix: 1.0,
  },
  {
    id: 'double_phonique_cl2',
    label: 'Double vitrage phonique Cl. 2 (32 dB)',
    description: '6/16/4 argon — Classe phonique 2, quasi-inclus',
    ug: 1.1,
    affaiblissement: 32,
    coefPrix: 1.08,
  },
  {
    id: 'double_phonique_cl3_36',
    label: 'Double vitrage phonique Cl. 3 (36 dB)',
    description: '8/16/4 argon — Classe phonique 3',
    ug: 1.1,
    affaiblissement: 36,
    coefPrix: 1.18,
  },
  {
    id: 'double_phonique_cl3_38',
    label: 'Double vitrage phonique Cl. 3 (38 dB)',
    description: '10/16/4 argon — Classe phonique 3 renforcée, verre asymétrique',
    ug: 1.1,
    affaiblissement: 38,
    coefPrix: 1.25,
  },
  {
    id: 'double_phonique_cl4',
    label: 'Double vitrage phonique Cl. 4 (42 dB)',
    description: '10/16/6 argon — Classe phonique 4 (sources DE: +40-50€/m²)',
    ug: 1.1,
    affaiblissement: 42,
    coefPrix: 1.35,
  },
  {
    id: 'double_phonique_cl5',
    label: 'Double vitrage phonique Cl. 5 (45 dB)',
    description: '12/16/8 argon — Classe phonique 5 maximum (sources DE: 150-200€/m²)',
    ug: 1.1,
    affaiblissement: 45,
    coefPrix: 1.55,
  },
  {
    id: 'double_securite_a1',
    label: 'Double vitrage sécurité A1',
    description: '33.1/16/4 argon — Verre feuilleté classe A1 (anti-blessure)',
    ug: 1.1,
    affaiblissement: 31,
    classeSecurite: 'A1',
    coefPrix: 1.20,
  },
  {
    id: 'double_securite_a3',
    label: 'Double vitrage sécurité A3',
    description: '44.2/16/4 argon — Verre feuilleté classe A3 (anti-effraction, chute 9m)',
    ug: 1.1,
    affaiblissement: 33,
    classeSecurite: 'A3',
    coefPrix: 1.40,
  },
  {
    id: 'double_solaire',
    label: 'Double vitrage contrôle solaire',
    description: '4/16/4 argon + couche solaire — Réduit les apports solaires en été',
    ug: 1.1,
    affaiblissement: 29,
    coefPrix: 1.22,
  },
  {
    id: 'double_structure',
    label: 'Double vitrage structuré / opaque',
    description: '4/16/4 structuré argon — Verre dépoli ou ornemental pour intimité',
    ug: 1.1,
    affaiblissement: 29,
    coefPrix: 1.10,
  },

  // ── Triple vitrage ─────────────────────────────────
  {
    id: 'triple_standard',
    label: 'Triple vitrage standard',
    description: '4/12/4/12/4 argon — Isolation thermique maximale (+40% consensus marché)',
    ug: 0.7,
    affaiblissement: 32,
    coefPrix: 1.40,
  },
  {
    id: 'triple_phonique',
    label: 'Triple vitrage phonique',
    description: '8/12/4/12/6 argon — Isolation thermique et acoustique maximale',
    ug: 0.7,
    affaiblissement: 42,
    coefPrix: 1.65,
  },
  {
    id: 'triple_securite',
    label: 'Triple vitrage sécurité',
    description: '44.2/12/4/12/4 argon — Feuilleté A3 + isolation maximale',
    ug: 0.7,
    affaiblissement: 35,
    classeSecurite: 'A3',
    coefPrix: 1.80,
  },
  {
    id: 'triple_solaire',
    label: 'Triple vitrage contrôle solaire',
    description: '4/12/4/12/4 argon + couche solaire — Maximum isolation + protection solaire',
    ug: 0.7,
    affaiblissement: 32,
    coefPrix: 1.55,
  },
];

export function getVitrageDef(id: string): VitrageDef | undefined {
  return VITRAGES.find((v) => v.id === id);
}
