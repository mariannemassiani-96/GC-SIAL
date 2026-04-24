// ── Synchronisation Pick-to-Light ↔ Smart Assembly ───────────────────
// Canal de communication via localStorage entre les deux apps.
// Smart Assembly écrit l'état du casier actif.
// Pick-to-Light lit et allume le bon casier.

const PTL_STATE_KEY = 'sial-ptl-active';

export interface PtlState {
  casier: number;
  couleur: string;
  label: string;
  ref: string;
  qte: number;
  timestamp: number;
  barcode: string;
  etape: number;
  totalEtapes: number;
}

/** Smart Assembly appelle ça quand l'étape change */
export function ptlSetActive(state: PtlState | null): void {
  if (state) {
    localStorage.setItem(PTL_STATE_KEY, JSON.stringify(state));
  } else {
    localStorage.removeItem(PTL_STATE_KEY);
  }
  // Dispatch un event pour que les autres onglets/composants soient notifiés
  window.dispatchEvent(new CustomEvent('ptl-update', { detail: state }));
}

/** Pick-to-Light appelle ça pour lire l'état actuel */
export function ptlGetActive(): PtlState | null {
  try {
    const raw = localStorage.getItem(PTL_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** Éteindre tous les casiers */
export function ptlAllOff(): void {
  localStorage.removeItem(PTL_STATE_KEY);
  window.dispatchEvent(new CustomEvent('ptl-update', { detail: null }));
}
