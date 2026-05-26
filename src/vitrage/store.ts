import { supabase, isConfigured } from './supabase';
import type { Commande, AverySettings, WESettings, GlassSettings, GlassProduct, StockPlate, StockRemnant } from './types';
import { DEFAULT_AVERY, DEFAULT_WE, DEFAULT_GLASS, EMPTY_LOT } from './types';

// ── Settings (Supabase — table settings, 1 seule ligne) ─────────────

export interface Settings {
  averySettings: AverySettings;
  weSettings: WESettings;
  glassSettings: GlassSettings;
}

function defaultSettings(): Settings {
  return {
    averySettings: { ...DEFAULT_AVERY },
    weSettings: { ...DEFAULT_WE },
    glassSettings: { ...DEFAULT_GLASS },
  };
}

export async function fetchSettings(): Promise<Settings> {
  if (!isConfigured) return defaultSettings();
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error || !data) return defaultSettings();
  return {
    averySettings: data.avery && typeof data.avery === 'object' ? { ...DEFAULT_AVERY, ...(data.avery as object) } : { ...DEFAULT_AVERY },
    weSettings: data.we && typeof data.we === 'object' ? { ...DEFAULT_WE, ...(data.we as object) } : { ...DEFAULT_WE },
    glassSettings: data.glass && typeof data.glass === 'object' ? { ...DEFAULT_GLASS, ...(data.glass as object) } : { ...DEFAULT_GLASS },
  };
}

export async function saveSettings(s: Settings): Promise<void> {
  if (!isConfigured) return;
  await supabase.from('settings').update({
    avery: s.averySettings,
    we: s.weSettings,
    glass: s.glassSettings,
  }).eq('id', 1);
}

// ── Commandes (Supabase) ─────────────────────────────────────────────

interface DbRow {
  id: string;
  reference: string;
  client: string;
  date_creation: string;
  semaine_fabrication: string;
  semaine_livraison: string;
  statut: string;
  vitrages: unknown;
  lot_fabrication: unknown;
  notes: string;
}

function rowToCommande(row: DbRow): Commande {
  return {
    id: row.id,
    reference: row.reference,
    client: row.client,
    dateCreation: row.date_creation,
    semaineFabrication: row.semaine_fabrication ?? '',
    semaineLivraison: row.semaine_livraison ?? '',
    statut: (row.statut as Commande['statut']) ?? 'en_attente',
    vitrages: Array.isArray(row.vitrages) ? row.vitrages as Commande['vitrages'] : [],
    lotFabrication: row.lot_fabrication && typeof row.lot_fabrication === 'object'
      ? { ...EMPTY_LOT, ...(row.lot_fabrication as Record<string, string>) }
      : { ...EMPTY_LOT },
    notes: row.notes ?? '',
  };
}

function commandeToRow(c: Commande) {
  return {
    id: c.id,
    reference: c.reference,
    client: c.client,
    date_creation: c.dateCreation,
    semaine_fabrication: c.semaineFabrication,
    semaine_livraison: c.semaineLivraison,
    statut: c.statut,
    vitrages: c.vitrages,
    lot_fabrication: c.lotFabrication,
    notes: c.notes,
  };
}

export async function fetchCommandes(): Promise<Commande[]> {
  if (!isConfigured) return [];
  const { data, error } = await supabase
    .from('commandes')
    .select('*')
    .order('date_creation', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as DbRow[]).map(rowToCommande);
}

export async function insertCommande(cmd: Commande): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('commandes').insert(commandeToRow(cmd));
  if (error) throw new Error(error.message);
}

export async function patchCommande(id: string, patch: Partial<Commande>): Promise<void> {
  if (!isConfigured) return;
  const updates: Record<string, unknown> = {};
  if (patch.reference !== undefined) updates.reference = patch.reference;
  if (patch.client !== undefined) updates.client = patch.client;
  if (patch.statut !== undefined) updates.statut = patch.statut;
  if (patch.semaineFabrication !== undefined) updates.semaine_fabrication = patch.semaineFabrication;
  if (patch.semaineLivraison !== undefined) updates.semaine_livraison = patch.semaineLivraison;
  if (patch.vitrages !== undefined) updates.vitrages = patch.vitrages;
  if (patch.lotFabrication !== undefined) updates.lot_fabrication = patch.lotFabrication;
  if (patch.notes !== undefined) updates.notes = patch.notes;
  if (Object.keys(updates).length === 0) return;
  const { error } = await supabase.from('commandes').update(updates).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function removeCommande(id: string): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('commandes').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Catalogue verres (Supabase) ──────────────────────────────────────

export async function fetchGlassProducts(): Promise<GlassProduct[]> {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from('glass_products').select('*').order('code');
  if (error) throw new Error(error.message);
  return (data ?? []) as GlassProduct[];
}

export async function upsertGlassProduct(p: Partial<GlassProduct> & { code: string }): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('glass_products').upsert(p, { onConflict: 'code' });
  if (error) throw new Error(error.message);
}

export async function deleteGlassProduct(id: string): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('glass_products').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Stock plaques (Supabase) ─────────────────────────────────────────

export async function fetchStockPlates(): Promise<StockPlate[]> {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from('stock_plates').select('*').order('glass_code');
  if (error) throw new Error(error.message);
  return (data ?? []) as StockPlate[];
}

export async function upsertStockPlate(p: Partial<StockPlate>): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('stock_plates').upsert(p);
  if (error) throw new Error(error.message);
}

export async function deleteStockPlate(id: string): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('stock_plates').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ── Stock chutes (Supabase) ──────────────────────────────────────────

export async function fetchStockRemnants(): Promise<StockRemnant[]> {
  if (!isConfigured) return [];
  const { data, error } = await supabase.from('stock_remnants').select('*').order('glass_code');
  if (error) throw new Error(error.message);
  return (data ?? []) as StockRemnant[];
}

export async function insertStockRemnant(r: Omit<StockRemnant, 'id'>): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('stock_remnants').insert(r);
  if (error) throw new Error(error.message);
}

export async function deleteStockRemnant(id: string): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('stock_remnants').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
