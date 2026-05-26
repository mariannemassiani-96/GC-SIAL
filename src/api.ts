const API_URL = import.meta.env.VITE_API_URL || 'https://pro.groupe-vista.fr/api-sial';

let token: string | null = localStorage.getItem('sial_token');

function headers(): HeadersInit {
  const h: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && token) {
    token = null;
    localStorage.removeItem('sial_token');
    localStorage.removeItem('sial_user');
    window.location.reload();
    throw new Error('Session expirée');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────────────

export interface User {
  id: number;
  email: string;
  nom: string;
  role: string;
  apps_autorisees: string[];
  pin_enabled?: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
}

export async function login(email: string, password: string): Promise<User> {
  const data = await request<LoginResponse>('POST', '/api/auth/login', { email, password });
  token = data.token;
  localStorage.setItem('sial_token', data.token);
  localStorage.setItem('sial_user', JSON.stringify(data.user));
  return data.user;
}

export async function loginPin(nom: string, pin: string): Promise<User> {
  const data = await request<LoginResponse>('POST', '/api/auth/login-pin', { nom, pin });
  token = data.token;
  localStorage.setItem('sial_token', data.token);
  localStorage.setItem('sial_user', JSON.stringify(data.user));
  return data.user;
}

export async function fetchPinUsers(): Promise<string[]> {
  const res = await fetch(`${API_URL}/api/auth/pin-users`);
  return res.json();
}

export function logout() {
  token = null;
  localStorage.removeItem('sial_token');
  localStorage.removeItem('sial_user');
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('sial_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isLoggedIn(): boolean {
  return !!token;
}

export async function fetchMe(): Promise<User> {
  return request<User>('GET', '/api/auth/me');
}

// ── Generic Data CRUD ────────────────────────────────────────────────

export async function getData<T = Record<string, unknown>>(app: string, collection: string): Promise<T[]> {
  return request<T[]>('GET', `/api/data/${app}/${collection}`);
}

export async function getDoc<T = Record<string, unknown>>(app: string, collection: string, docId: string): Promise<T> {
  return request<T>('GET', `/api/data/${app}/${collection}/${encodeURIComponent(docId)}`);
}

export async function saveDoc(app: string, collection: string, docId: string, data: unknown): Promise<void> {
  await request('PUT', `/api/data/${app}/${collection}/${encodeURIComponent(docId)}`, data);
}

export async function deleteDoc(app: string, collection: string, docId: string): Promise<void> {
  await request('DELETE', `/api/data/${app}/${collection}/${encodeURIComponent(docId)}`);
}

export async function bulkSave(app: string, collection: string, items: unknown[]): Promise<{ ok: boolean; count: number }> {
  return request('PUT', `/api/data/${app}/${collection}`, items);
}

// ── Users (admin) ────────────────────────────────────────────────────

export interface UserFull extends User {
  actif: boolean;
  created_at: string;
}

export async function listUsers(): Promise<UserFull[]> {
  return request<UserFull[]>('GET', '/api/users');
}

export async function createUser(data: { email?: string; password?: string; nom: string; role: string; apps_autorisees: string[]; pin?: string; pin_enabled?: boolean }): Promise<{ id: number }> {
  return request('POST', '/api/users', data);
}

export async function updateUser(id: number, data: Partial<{ nom: string; role: string; apps_autorisees: string[]; actif: boolean; password: string; pin: string; pin_enabled: boolean }>): Promise<void> {
  await request('PUT', `/api/users/${id}`, data);
}

// ── Production Events (time tracking) ─────────────────────────────

export async function logProductionEvent(data: { commande_ref: string; poste: string; action: string; piece_ref?: string; detail?: string }): Promise<void> {
  await request('POST', '/api/production-events', data);
}

export async function getProductionEvents(ref: string): Promise<{ poste: string; action: string; user_nom: string; piece_ref: string; created_at: string }[]> {
  return request('GET', `/api/production-events/${encodeURIComponent(ref)}`);
}

export async function getProductionStatsByCommande(ref: string): Promise<{ poste: string; action: string; user_nom: string; count: number; first_at: string; last_at: string }[]> {
  return request('GET', `/api/production-stats/by-commande/${encodeURIComponent(ref)}`);
}

// ── Profile Images Library ─────────────────────────────────────────

export async function getProfileImages(codes: string[]): Promise<Record<string, string>> {
  if (codes.length === 0) return {};
  return request<Record<string, string>>('GET', `/api/profile-images/batch/${codes.join(',')}`);
}

export async function extractAndCacheProfileImages(pdf: File, profileCodes: string[]): Promise<{ code: string; base64: string }[]> {
  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('profileCodes', JSON.stringify(profileCodes));
  const res = await fetch(`${API_URL}/api/extract-profile-images`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error('Erreur extraction images');
  const data = await res.json();
  return data.profileImages || [];
}

// ── Commandes Globales ──────────────────────────────────────────────

export interface ModuleStatus {
  total?: number;
  fait?: number;
  nc?: number;
  bloque?: number;
  statut?: 'attente' | 'en_cours' | 'termine' | 'bloque';
  [key: string]: unknown;
}

export interface CommandeGlobale {
  ref: string;
  client: string;
  chantier: string;
  date_creation: string;
  semaine_fab: string;
  semaine_liv: string;
  reception: ModuleStatus;
  coupe_profiles: ModuleStatus;
  vitrage: ModuleStatus;
  assemblage: ModuleStatus;
  livraison: ModuleStatus;
  notes: string;
  updated_at: string;
}

export async function listCommandesGlobales(): Promise<CommandeGlobale[]> {
  return request<CommandeGlobale[]>('GET', '/api/commandes-globales');
}

export async function getCommandeGlobale(ref: string): Promise<CommandeGlobale> {
  return request<CommandeGlobale>('GET', `/api/commandes-globales/${encodeURIComponent(ref)}`);
}

export async function upsertCommandeGlobale(ref: string, data: Partial<CommandeGlobale>): Promise<void> {
  await request('PUT', `/api/commandes-globales/${encodeURIComponent(ref)}`, data);
}

export async function patchCommandeModule(ref: string, module: string, data: ModuleStatus): Promise<void> {
  await request('PATCH', `/api/commandes-globales/${encodeURIComponent(ref)}/${module}`, data);
}

// ── Health ───────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; users: number; documents: number }> {
  const res = await fetch(`${API_URL}/api/health`);
  return res.json();
}
