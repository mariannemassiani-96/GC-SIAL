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
  if (res.status === 401) {
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

// ── Health ───────────────────────────────────────────────────────────

export async function healthCheck(): Promise<{ status: string; users: number; documents: number }> {
  const res = await fetch(`${API_URL}/api/health`);
  return res.json();
}
