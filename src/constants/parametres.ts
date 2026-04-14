export const ESPACEMENT_BARREAU = 130; // mm axe/axe (espace libre 105mm ≤ 110mm NF P01-012)
export const DEPASSEMENT_LISSE = 130; // mm de chaque côté

export const ENTRAXE: Record<string, Record<number, number>> = {
  prive: {
    0: 1560,
    10: 1560,
    20: 1560,
    30: 1351,
  },
  public: {
    0: 1040,
    10: 1040,
    20: 1040,
    30: 900,
  },
};

export interface UsinageAngleDef {
  fraisageDiametre: number;
  longueurFraisage: number;
  contrepercageDiametre: number;
  goupilleRaidY: number;
  goupilleDiametre: number;
}

export const USINAGE_ANGLE: Record<number, UsinageAngleDef> = {
  0: {
    fraisageDiametre: 5,
    longueurFraisage: 130,
    contrepercageDiametre: 4.5,
    goupilleRaidY: 5.5,
    goupilleDiametre: 6,
  },
  10: {
    fraisageDiametre: 5.5,
    longueurFraisage: 132,
    contrepercageDiametre: 4.5,
    goupilleRaidY: 5.5,
    goupilleDiametre: 6,
  },
  20: {
    fraisageDiametre: 6.5,
    longueurFraisage: 138.3,
    contrepercageDiametre: 5,
    goupilleRaidY: 5.5,
    goupilleDiametre: 6,
  },
  30: {
    fraisageDiametre: 7.5,
    longueurFraisage: 150,
    contrepercageDiametre: 5.5,
    goupilleRaidY: 4.5,
    goupilleDiametre: 3.9,
  },
};
