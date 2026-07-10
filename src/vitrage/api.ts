const API_URL = import.meta.env.VITE_ISULA_API_URL as string || '';

export const hasBackend = Boolean(API_URL);

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

async function getBlob(path: string, body: unknown): Promise<Blob> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${path}: ${res.status} ${await res.text()}`);
  return res.blob();
}

export interface ApiOptimizeRequest {
  pieces: Array<{
    id: string;
    vitrage_ref: string;
    width: number;
    height: number;
    material: string;
    face: 'EXT' | 'INT';
    no_rotation: boolean;
    treatment?: string;
  }>;
  plate_width: number;
  plate_height: number;
  edge_margin: number;
  cutting_gap: number;
  algorithm?: 'staged_dp' | 'greedy';
  machine?: 'lisec' | 'bottero';
}

export async function apiOptimize(req: ApiOptimizeRequest) {
  return post<{ results: unknown[] }>('/api/optimize', req);
}

export async function apiExportDXF(plates: unknown[], machine = 'bottero'): Promise<Blob> {
  return getBlob('/api/export-machine', { plates, format: 'dxf', machine });
}

export async function apiExportOPT(plates: unknown[]): Promise<Blob> {
  return getBlob('/api/export-machine', { plates, format: 'opt', machine: 'bottero' });
}

export async function apiLabelsZPL(labels: unknown[], labelType = 'ce', dpi = 203): Promise<Blob> {
  return getBlob('/api/labels-zpl', { labels, label_type: labelType, dpi });
}
