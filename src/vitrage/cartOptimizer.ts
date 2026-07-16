/**
 * Cart Optimizer — Affectation des pieces coupees sur les chariots
 *
 * Objectifs (par priorite) :
 * 1. Garder EXT + INT du meme vitrage sur le meme chariot
 * 2. Ne pas melanger les clients
 * 3. Remplir les chariots au maximum
 * 4. Les plus grands verres en premier (stabilite rack en A)
 *
 * Approche : greedy first-fit decreasing + regroupement par client + pairing IGU
 */

export interface CutPieceForCart {
  id: string;
  vitrageId: string;
  vitrageRef: string;
  clientRef: string;
  position: 'EXT' | 'INT';
  material: string;
  width: number;
  height: number;
  area: number;
  plateNo: number;
}

export interface CartAssignment {
  cartId: string;
  cartLabel: string;
  clientRef: string;
  pieces: CutPieceForCart[];
  totalPieces: number;
  fillRate: number;
  iguPaired: number;
  iguTotal: number;
}

export interface CartOptimResult {
  carts: CartAssignment[];
  totalCarts: number;
  avgFillRate: number;
  iguPairingRate: number;
  clientMixingScore: number;
}

export interface CartOptimSettings {
  maxPiecesPerCart: number;
  maxAreaPerCart: number;
  preferClientGrouping: boolean;
}

const DEFAULT_SETTINGS: CartOptimSettings = {
  maxPiecesPerCart: 25,
  maxAreaPerCart: 15_000_000,
  preferClientGrouping: true,
};

export function optimizeCarts(
  pieces: CutPieceForCart[],
  settings: CartOptimSettings = DEFAULT_SETTINGS,
): CartOptimResult {
  if (pieces.length === 0) return { carts: [], totalCarts: 0, avgFillRate: 0, iguPairingRate: 1, clientMixingScore: 0 };

  const { maxPiecesPerCart, maxAreaPerCart, preferClientGrouping } = settings;

  // Phase 1 : Grouper par vitrage (pairing EXT+INT)
  const byVitrage = new Map<string, CutPieceForCart[]>();
  for (const p of pieces) {
    const arr = byVitrage.get(p.vitrageId) || [];
    arr.push(p);
    byVitrage.set(p.vitrageId, arr);
  }

  // Phase 2 : Grouper les vitrages par client
  const byClient = new Map<string, { vitrageId: string; pieces: CutPieceForCart[]; area: number }[]>();
  for (const [vid, vPieces] of byVitrage) {
    const client = vPieces[0]?.clientRef || 'INCONNU';
    const arr = byClient.get(client) || [];
    arr.push({ vitrageId: vid, pieces: vPieces, area: vPieces.reduce((s, p) => s + p.area, 0) });
    byClient.set(client, arr);
  }

  // Phase 3 : Trier les clients par nombre de pieces (plus gros client d'abord)
  const clientOrder = [...byClient.entries()]
    .sort((a, b) => {
      const aPcs = a[1].reduce((s, v) => s + v.pieces.length, 0);
      const bPcs = b[1].reduce((s, v) => s + v.pieces.length, 0);
      return bPcs - aPcs;
    });

  // Phase 4 : Affecter aux chariots
  const carts: CartAssignment[] = [];
  let cartCounter = 0;

  function createCart(clientRef: string): CartAssignment {
    cartCounter++;
    return {
      cartId: `CART-${String(cartCounter).padStart(2, '0')}`,
      cartLabel: `Chariot ${cartCounter}`,
      clientRef,
      pieces: [],
      totalPieces: 0,
      fillRate: 0,
      iguPaired: 0,
      iguTotal: 0,
    };
  }

  function cartArea(cart: CartAssignment): number {
    return cart.pieces.reduce((s, p) => s + p.area, 0);
  }

  function canFit(cart: CartAssignment, piecesToAdd: CutPieceForCart[]): boolean {
    return (
      cart.totalPieces + piecesToAdd.length <= maxPiecesPerCart &&
      cartArea(cart) + piecesToAdd.reduce((s, p) => s + p.area, 0) <= maxAreaPerCart
    );
  }

  if (preferClientGrouping) {
    // Un client = un ou plusieurs chariots dedies
    for (const [clientRef, vitrages] of clientOrder) {
      // Trier les vitrages par surface decroissante (stabilite rack A)
      vitrages.sort((a, b) => b.area - a.area);

      let currentCart = createCart(clientRef);

      for (const vGroup of vitrages) {
        if (canFit(currentCart, vGroup.pieces)) {
          for (const p of vGroup.pieces) currentCart.pieces.push(p);
          currentCart.totalPieces += vGroup.pieces.length;
        } else {
          // Chariot plein, en creer un nouveau pour ce client
          if (currentCart.totalPieces > 0) carts.push(currentCart);
          currentCart = createCart(clientRef);
          for (const p of vGroup.pieces) currentCart.pieces.push(p);
          currentCart.totalPieces += vGroup.pieces.length;
        }
      }
      if (currentCart.totalPieces > 0) carts.push(currentCart);
    }
  } else {
    // Mode sans preference client : first-fit decreasing par area
    const allVitrages = [...byVitrage.entries()]
      .map(([vid, pcs]) => ({ vitrageId: vid, pieces: pcs, area: pcs.reduce((s, p) => s + p.area, 0) }))
      .sort((a, b) => b.area - a.area);

    for (const vGroup of allVitrages) {
      let placed = false;
      for (const cart of carts) {
        if (canFit(cart, vGroup.pieces)) {
          for (const p of vGroup.pieces) cart.pieces.push(p);
          cart.totalPieces += vGroup.pieces.length;
          placed = true;
          break;
        }
      }
      if (!placed) {
        const cart = createCart(vGroup.pieces[0]?.clientRef || '');
        for (const p of vGroup.pieces) cart.pieces.push(p);
        cart.totalPieces += vGroup.pieces.length;
        carts.push(cart);
      }
    }
  }

  // Phase 5 : Calculer les metriques
  for (const cart of carts) {
    cart.fillRate = cart.totalPieces / maxPiecesPerCart;
    // Compter le pairing IGU
    const vitragesInCart = new Map<string, Set<string>>();
    for (const p of cart.pieces) {
      const set = vitragesInCart.get(p.vitrageId) || new Set();
      set.add(p.position);
      vitragesInCart.set(p.vitrageId, set);
    }
    cart.iguTotal = vitragesInCart.size;
    cart.iguPaired = [...vitragesInCart.values()].filter(s => s.has('EXT') && s.has('INT')).length;
  }

  const totalPairingPossible = carts.reduce((s, c) => s + c.iguTotal, 0);
  const totalPaired = carts.reduce((s, c) => s + c.iguPaired, 0);

  // Client mixing : combien de chariots ont plus d'un client
  const mixedCarts = carts.filter(c => {
    const clients = new Set(c.pieces.map(p => p.clientRef));
    return clients.size > 1;
  }).length;

  return {
    carts,
    totalCarts: carts.length,
    avgFillRate: carts.length > 0 ? carts.reduce((s, c) => s + c.fillRate, 0) / carts.length : 0,
    iguPairingRate: totalPairingPossible > 0 ? totalPaired / totalPairingPossible : 1,
    clientMixingScore: carts.length > 0 ? mixedCarts / carts.length : 0,
  };
}

/**
 * Sequencement des coupes — minimiser les changements de plaque
 * Utilise un heuristique nearest-neighbor sur les types de verre
 */
export interface CuttingRun {
  material: string;
  machine: 'lisec' | 'bottero';
  pieces: CutPieceForCart[];
  plateCount: number;
  sequenceOrder: number;
}

export function sequenceCuttingRuns(
  pieces: CutPieceForCart[],
  getMachine: (material: string) => 'lisec' | 'bottero',
): CuttingRun[] {
  // Grouper par materiau
  const byMaterial = new Map<string, CutPieceForCart[]>();
  for (const p of pieces) {
    const arr = byMaterial.get(p.material) || [];
    arr.push(p);
    byMaterial.set(p.material, arr);
  }

  // Creer les runs
  const runs: CuttingRun[] = [...byMaterial.entries()].map(([mat, pcs]) => ({
    material: mat,
    machine: getMachine(mat),
    pieces: pcs,
    plateCount: 0, // sera calcule par l'optimiseur 2D
    sequenceOrder: 0,
  }));

  // Separer par machine
  const lisecRuns = runs.filter(r => r.machine === 'lisec');
  const botteroRuns = runs.filter(r => r.machine === 'bottero');

  // Nearest-neighbor : trier par nombre de pieces decroissant
  // (le plus gros lot d'abord, puis enchainer les lots similaires)
  const sortBySize = (a: CuttingRun, b: CuttingRun) => b.pieces.length - a.pieces.length;
  lisecRuns.sort(sortBySize);
  botteroRuns.sort(sortBySize);

  // Assigner l'ordre
  let order = 0;
  for (const r of lisecRuns) { r.sequenceOrder = ++order; }
  order = 0;
  for (const r of botteroRuns) { r.sequenceOrder = ++order; }

  return [...lisecRuns, ...botteroRuns];
}
