import type { Objet, Flux, Plan, ViolationContrainte } from './types';

/** Encombrement réel après rotation (toujours rectangle axis-aligned puisque 0/90/180/270) */
export function bbox(o: Objet): { x: number; y: number; w: number; h: number } {
  const swap = o.rotation === 90 || o.rotation === 270;
  const w = swap ? o.hauteur : o.largeur;
  const h = swap ? o.largeur : o.hauteur;
  // x,y est le coin supérieur gauche avant rotation — on le conserve comme coin bbox
  return { x: o.x, y: o.y, w, h };
}

export function center(o: Objet): { x: number; y: number } {
  const b = bbox(o);
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}

export function surface(o: Objet): number {
  return o.largeur * o.hauteur;
}

/** Distance minimale (bord à bord) entre 2 rectangles ; 0 si overlap */
export function distanceBords(a: Objet, b: Objet): number {
  const A = bbox(a);
  const B = bbox(b);
  const dx = Math.max(0, Math.max(A.x - (B.x + B.w), B.x - (A.x + A.w)));
  const dy = Math.max(0, Math.max(A.y - (B.y + B.h), B.y - (A.y + A.h)));
  return Math.hypot(dx, dy);
}

/** Distance centre à centre */
export function distanceCentres(a: Objet, b: Objet): number {
  const cA = center(a);
  const cB = center(b);
  return Math.hypot(cA.x - cB.x, cA.y - cB.y);
}

export function overlap(a: Objet, b: Objet): boolean {
  const A = bbox(a);
  const B = bbox(b);
  return !(A.x + A.w <= B.x || B.x + B.w <= A.x || A.y + A.h <= B.y || B.y + B.h <= A.y);
}

/** Snap coordonnée vers pas grille */
export function snap(v: number, grille: number): number {
  return Math.round(v / grille) * grille;
}

export function clampSite(o: Objet, plan: Plan): Objet {
  const b = bbox(o);
  const x = Math.max(0, Math.min(o.x, plan.largeurSite - b.w));
  const y = Math.max(0, Math.min(o.y, plan.hauteurSite - b.h));
  return { ...o, x, y };
}

export function verifierContraintes(plan: Plan): ViolationContrainte[] {
  const byId = new Map(plan.objets.map((o) => [o.id, o]));
  const violations: ViolationContrainte[] = [];

  for (const c of plan.contraintes) {
    const a = byId.get(c.objetA);
    const b = byId.get(c.objetB);
    if (!a || !b) continue;
    const d = distanceBords(a, b);

    switch (c.type) {
      case 'distance_min':
        if (d < (c.valeur ?? 0)) {
          violations.push({
            contrainte: c,
            distance: d,
            message: `${a.nom} ↔ ${b.nom} : ${(d / 100).toFixed(2)} m < ${((c.valeur ?? 0) / 100).toFixed(2)} m min`,
          });
        }
        break;
      case 'distance_max':
        if (d > (c.valeur ?? 0)) {
          violations.push({
            contrainte: c,
            distance: d,
            message: `${a.nom} ↔ ${b.nom} : ${(d / 100).toFixed(2)} m > ${((c.valeur ?? 0) / 100).toFixed(2)} m max`,
          });
        }
        break;
      case 'alignement_x': {
        const cA = center(a);
        const cB = center(b);
        if (Math.abs(cA.x - cB.x) > 10) {
          violations.push({
            contrainte: c,
            message: `${a.nom} & ${b.nom} non alignés verticalement (Δ ${Math.abs(cA.x - cB.x).toFixed(0)} cm)`,
          });
        }
        break;
      }
      case 'alignement_y': {
        const cA = center(a);
        const cB = center(b);
        if (Math.abs(cA.y - cB.y) > 10) {
          violations.push({
            contrainte: c,
            message: `${a.nom} & ${b.nom} non alignés horizontalement (Δ ${Math.abs(cA.y - cB.y).toFixed(0)} cm)`,
          });
        }
        break;
      }
      case 'adjacent':
        if (d > 20) {
          violations.push({
            contrainte: c,
            distance: d,
            message: `${a.nom} & ${b.nom} non adjacents (${(d / 100).toFixed(2)} m d'écart)`,
          });
        }
        break;
    }
  }

  // Overlaps entre objets "solides" (pas zones)
  const solides = plan.objets.filter((o) => o.type !== 'zone');
  for (let i = 0; i < solides.length; i++) {
    for (let j = i + 1; j < solides.length; j++) {
      const a = solides[i];
      const b = solides[j];
      if (overlap(a, b)) {
        violations.push({
          contrainte: {
            id: `__overlap_${a.id}_${b.id}`,
            type: 'distance_min',
            objetA: a.id,
            objetB: b.id,
          },
          message: `${a.nom} chevauche ${b.nom}`,
        });
      }
    }
  }

  return violations;
}

export function longueurFlux(plan: Plan, f: Flux): number | null {
  const a = plan.objets.find((o) => o.id === f.from);
  const b = plan.objets.find((o) => o.id === f.to);
  if (!a || !b) return null;
  return distanceCentres(a, b);
}

export function longueurTotaleFlux(plan: Plan): number {
  return plan.flux.reduce((acc, f) => acc + (longueurFlux(plan, f) ?? 0), 0);
}

export function surfaceOccupee(plan: Plan): number {
  return plan.objets
    .filter((o) => o.type !== 'zone' && o.type !== 'porte')
    .reduce((acc, o) => acc + surface(o), 0);
}

export function surfaceBatiment(plan: Plan): number {
  return plan.batiment.largeur * plan.batiment.hauteur;
}

export function surfaceSite(plan: Plan): number {
  return plan.largeurSite * plan.hauteurSite;
}

// ── Opérations de groupe ─────────────────────────────────────────────


/** Rotation d'un groupe d'objets de `angle` degrés autour de leur centre commun */
export function rotateGroup(objets: Objet[], angle: number): Partial<Objet>[] {
  if (objets.length === 0) return [];
  const cx = objets.reduce((s, o) => s + o.x + o.largeur / 2, 0) / objets.length;
  const cy = objets.reduce((s, o) => s + o.y + o.hauteur / 2, 0) / objets.length;
  const rad = (angle * Math.PI) / 180;
  return objets.map(o => {
    const ocx = o.x + o.largeur / 2 - cx;
    const ocy = o.y + o.hauteur / 2 - cy;
    const nx = cx + ocx * Math.cos(rad) - ocy * Math.sin(rad) - o.largeur / 2;
    const ny = cy + ocx * Math.sin(rad) + ocy * Math.cos(rad) - o.hauteur / 2;
    return { id: o.id, x: Math.round(nx), y: Math.round(ny), rotation: ((o.rotation ?? 0) + angle) % 360 };
  });
}

/** Miroir horizontal d'un groupe (flip autour de l'axe vertical central) */
export function mirrorGroupH(objets: Objet[]): Partial<Objet>[] {
  if (objets.length === 0) return [];
  const minX = Math.min(...objets.map(o => o.x));
  const maxX = Math.max(...objets.map(o => o.x + o.largeur));
  return objets.map(o => ({
    id: o.id,
    x: Math.round(maxX - (o.x - minX) - o.largeur),
    rotation: (360 - (o.rotation ?? 0)) % 360,
  }));
}

/** Miroir vertical d'un groupe (flip autour de l'axe horizontal central) */
export function mirrorGroupV(objets: Objet[]): Partial<Objet>[] {
  if (objets.length === 0) return [];
  const minY = Math.min(...objets.map(o => o.y));
  const maxY = Math.max(...objets.map(o => o.y + o.hauteur));
  return objets.map(o => ({
    id: o.id,
    y: Math.round(maxY - (o.y - minY) - o.hauteur),
    rotation: (180 - (o.rotation ?? 0) + 360) % 360,
  }));
}

/** Déplacement d'un groupe */
export function moveGroup(objets: Objet[], dx: number, dy: number): Partial<Objet>[] {
  return objets.map(o => ({ id: o.id, x: o.x + dx, y: o.y + dy }));
}
