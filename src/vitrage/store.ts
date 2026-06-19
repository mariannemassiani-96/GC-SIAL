import type { Commande, AverySettings, WESettings, GlassSettings, GlassProduct, StockPlate, StockRemnant } from './types';
import { DEFAULT_AVERY, DEFAULT_WE, DEFAULT_GLASS, EMPTY_LOT } from './types';

const API = import.meta.env.VITE_ISULA_API_URL as string || '';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return res.json();
}

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path}: ${res.status}`);
}

async function patch(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PATCH ${path}: ${res.status}`);
}

async function del(path: string) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path}: ${res.status}`);
}

// ── Settings ─────────────────────────────────────────────────────────

export interface Settings {
  averySettings: AverySettings;
  weSettings: WESettings;
  glassSettings: GlassSettings;
}

function defaultSettings(): Settings {
  return { averySettings: { ...DEFAULT_AVERY }, weSettings: { ...DEFAULT_WE }, glassSettings: { ...DEFAULT_GLASS } };
}

export async function fetchSettings(): Promise<Settings> {
  if (!API) return defaultSettings();
  try {
    const row = await get<Record<string, unknown>>('/api/settings');
    return {
      averySettings: row.avery && typeof row.avery === 'object' ? { ...DEFAULT_AVERY, ...(row.avery as object) } : { ...DEFAULT_AVERY },
      weSettings: row.we && typeof row.we === 'object' ? { ...DEFAULT_WE, ...(row.we as object) } : { ...DEFAULT_WE },
      glassSettings: row.glass && typeof row.glass === 'object' ? { ...DEFAULT_GLASS, ...(row.glass as object) } : { ...DEFAULT_GLASS },
    };
  } catch { return defaultSettings(); }
}

export async function saveSettings(s: Settings): Promise<void> {
  if (!API) return;
  await patch('/api/settings', { avery: s.averySettings, we: s.weSettings, glass: s.glassSettings });
}

// ── Commandes ────────────────────────────────────────────────────────

function rowToCommande(row: Record<string, unknown>): Commande {
  return {
    id: row.id as string,
    reference: row.reference as string || '',
    client: row.client as string || '',
    dateCreation: String(row.date_creation || ''),
    semaineFabrication: row.semaine_fabrication as string || '',
    semaineLivraison: row.semaine_livraison as string || '',
    statut: (row.statut as Commande['statut']) || 'en_attente',
    vitrages: Array.isArray(row.vitrages) ? row.vitrages as Commande['vitrages'] : [],
    lotFabrication: row.lot_fabrication && typeof row.lot_fabrication === 'object'
      ? { ...EMPTY_LOT, ...(row.lot_fabrication as Record<string, string>) } : { ...EMPTY_LOT },
    notes: row.notes as string || '',
  };
}

export async function fetchCommandes(): Promise<Commande[]> {
  if (!API) return [];
  const rows = await get<Record<string, unknown>[]>('/api/commandes');
  return rows.map(rowToCommande);
}

export async function insertCommande(cmd: Commande): Promise<void> {
  if (!API) return;
  await post('/api/commandes', {
    id: cmd.id, reference: cmd.reference, client: cmd.client,
    date_creation: cmd.dateCreation, semaine_fabrication: cmd.semaineFabrication,
    semaine_livraison: cmd.semaineLivraison, statut: cmd.statut,
    vitrages: cmd.vitrages, lot_fabrication: cmd.lotFabrication, notes: cmd.notes,
  });
}

export async function patchCommande(id: string, p: Partial<Commande>): Promise<void> {
  if (!API) return;
  const updates: Record<string, unknown> = {};
  if (p.reference !== undefined) updates.reference = p.reference;
  if (p.client !== undefined) updates.client = p.client;
  if (p.statut !== undefined) updates.statut = p.statut;
  if (p.semaineFabrication !== undefined) updates.semaine_fabrication = p.semaineFabrication;
  if (p.semaineLivraison !== undefined) updates.semaine_livraison = p.semaineLivraison;
  if (p.vitrages !== undefined) updates.vitrages = p.vitrages;
  if (p.lotFabrication !== undefined) updates.lot_fabrication = p.lotFabrication;
  if (p.notes !== undefined) updates.notes = p.notes;
  if (Object.keys(updates).length === 0) return;
  await patch(`/api/commandes/${id}`, updates);
}

export async function removeCommande(id: string): Promise<void> {
  if (!API) return;
  await del(`/api/commandes/${id}`);
}

// ── Catalogue verres ─────────────────────────────────────────────────

export async function fetchGlassProducts(): Promise<GlassProduct[]> {
  if (!API) return [];
  return get<GlassProduct[]>('/api/glass-products');
}

export async function upsertGlassProduct(p: Partial<GlassProduct> & { code: string }): Promise<void> {
  if (!API) return;
  await post('/api/glass-products', p);
}

export async function deleteGlassProduct(id: string): Promise<void> {
  if (!API) return;
  await del(`/api/glass-products/${id}`);
}

// ── Stock plaques ────────────────────────────────────────────────────

export async function fetchStockPlates(): Promise<StockPlate[]> {
  if (!API) return [];
  return get<StockPlate[]>('/api/stock-plates');
}

export async function upsertStockPlate(p: Partial<StockPlate>): Promise<void> {
  if (!API) return;
  await post('/api/stock-plates', p);
}

export async function deleteStockPlate(id: string): Promise<void> {
  if (!API) return;
  await del(`/api/stock-plates/${id}`);
}

// ── Stock chutes ─────────────────────────────────────────────────────

export async function fetchStockRemnants(): Promise<StockRemnant[]> {
  if (!API) return [];
  return get<StockRemnant[]>('/api/stock-remnants');
}

export async function insertStockRemnant(r: Omit<StockRemnant, 'id'>): Promise<void> {
  if (!API) return;
  await post('/api/stock-remnants', r);
}

export async function deleteStockRemnant(id: string): Promise<void> {
  if (!API) return;
  await del(`/api/stock-remnants/${id}`);
}
