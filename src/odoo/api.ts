const ODOO_API = import.meta.env.VITE_API_URL as string || 'https://pro.groupe-vista.fr/api-sial';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${ODOO_API}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ODOO_API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

async function patch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${ODOO_API}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Connection test ──────────────────────────────────────────────────

export interface OdooStatus {
  status: string;
  odoo_version?: string;
  uid?: number;
  url?: string;
  db?: string;
  error?: string;
}

export async function testOdooConnection(): Promise<OdooStatus> {
  return get<OdooStatus>('/api/odoo/test');
}

// ── Products ─────────────────────────────────────────────────────────

export interface OdooProduct {
  id: number;
  name: string;
  default_code: string;
  list_price: number;
  standard_price: number;
  qty_available: number;
  categ_id: [number, string];
  barcode: string | false;
  type: string;
}

export async function searchProducts(q = '', limit = 100): Promise<OdooProduct[]> {
  return get(`/api/odoo/products?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function getProduct(id: number): Promise<OdooProduct> {
  return get(`/api/odoo/products/${id}`);
}

export async function createProduct(vals: Record<string, unknown>): Promise<{ id: number }> {
  return post('/api/odoo/products', vals);
}

// ── Stock ────────────────────────────────────────────────────────────

export interface OdooStockQuant {
  id: number;
  product_id: [number, string];
  location_id: [number, string];
  quantity: number;
  reserved_quantity: number;
  lot_id: [number, string] | false;
}

export async function getStockQuants(productId?: number): Promise<OdooStockQuant[]> {
  const params = productId ? `?product_id=${productId}` : '';
  return get(`/api/odoo/stock${params}`);
}

export interface OdooLocation {
  id: number;
  name: string;
  complete_name: string;
  barcode: string | false;
}

export async function getLocations(): Promise<OdooLocation[]> {
  return get('/api/odoo/locations');
}

export async function adjustStock(productId: number, locationId: number, quantity: number): Promise<{ ok: boolean }> {
  return patch(`/api/odoo/stock/${productId}`, { location_id: locationId, quantity });
}

// ── Suppliers ────────────────────────────────────────────────────────

export interface OdooPartner {
  id: number;
  name: string;
  ref: string | false;
  email: string | false;
  phone: string | false;
  supplier_rank: number;
  customer_rank: number;
}

export async function getSuppliers(q = ''): Promise<OdooPartner[]> {
  return get(`/api/odoo/suppliers?q=${encodeURIComponent(q)}`);
}

// ── Purchase Orders ──────────────────────────────────────────────────

export interface OdooPurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  date_order: string;
  amount_total: number;
  state: string;
}

export async function getPurchaseOrders(state = ''): Promise<OdooPurchaseOrder[]> {
  return get(`/api/odoo/purchases?state=${encodeURIComponent(state)}`);
}

export async function getPurchaseOrder(id: number): Promise<OdooPurchaseOrder & { lines: unknown[] }> {
  return get(`/api/odoo/purchases/${id}`);
}

export async function createPurchaseOrder(partnerId: number, lines: { product_id: number; qty: number; price: number; name: string }[]): Promise<{ id: number }> {
  return post('/api/odoo/purchases', { partner_id: partnerId, lines });
}

// ── Invoices ─────────────────────────────────────────────────────────

export interface OdooInvoice {
  id: number;
  name: string;
  partner_id: [number, string];
  invoice_date: string;
  amount_total: number;
  state: string;
  move_type: string;
  payment_state: string;
}

export async function getInvoices(moveType = ''): Promise<OdooInvoice[]> {
  return get(`/api/odoo/invoices?move_type=${encodeURIComponent(moveType)}`);
}
