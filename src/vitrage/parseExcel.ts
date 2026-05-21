import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { Vitrage } from './types';
import { parseVitrageSpec } from './parseVitrageSpec';

function normalise(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_\-.()/]+/g, '');
}

type Field = 'reference' | 'variante' | 'largeur' | 'hauteur' | 'dimensions' | 'composition' | 'couleur' | 'qte';

const FIELD_PATTERNS: Record<Field, RegExp[]> = {
  reference: [/^ref/, /^proto/, /^repere/, /^designation/, /^n[o°]?$/, /^nom/, /^piece/, /^code/, /^id$/],
  variante: [/^v$/, /^v[12]/, /^variante/, /^type$/],
  largeur: [/^largeur/, /^larg/, /^l$/, /^width/, /^w$/],
  hauteur: [/^hauteur/, /^haut/, /^h$/, /^height/],
  dimensions: [/^dim/, /^taille/, /^size/, /^lxh/, /^hxl/],
  composition: [/^compo/, /^vitrage/, /^spec/, /^verre/, /^glass/, /^type.*vitr/],
  couleur: [/^couleur/, /^intercalaire/, /^color/, /^we$/, /^joint/],
  qte: [/^qt[eé]?$/, /^quantit/, /^qty/, /^nb/],
};

function matchField(header: string): Field | null {
  const n = normalise(header);
  if (!n) return null;
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [Field, RegExp[]][]) {
    if (patterns.some(p => p.test(n))) return field;
  }
  return null;
}

export interface ParseResult {
  vitrages: Vitrage[];
  columnsDetected: Record<string, string>;
  allHeaders: string[];
  totalRows: number;
  skippedRows: number;
}

function buildColumnMap(headers: string[]): Record<Field, string | null> {
  const map: Record<Field, string | null> = {
    reference: null, variante: null, largeur: null, hauteur: null,
    dimensions: null, composition: null, couleur: null, qte: null,
  };
  for (const h of headers) {
    const f = matchField(h);
    if (f && map[f] === null) map[f] = h;
  }
  return map;
}

function parseDimensions(raw: string): { largeur: number; hauteur: number } | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { largeur: parseFloat(m[1].replace(',', '.')), hauteur: parseFloat(m[2].replace(',', '.')) };
  return null;
}

function rowToVitrages(
  row: Record<string, unknown>,
  col: Record<Field, string | null>,
): Vitrage[] {
  const get = (f: Field): string => col[f] != null ? String(row[col[f]!] ?? '').trim() : '';

  let reference = get('reference');
  const compositionRaw = get('composition');
  let largeur = parseFloat(get('largeur')) || 0;
  let hauteur = parseFloat(get('hauteur')) || 0;

  if (largeur === 0 && hauteur === 0) {
    const dimStr = get('dimensions');
    if (dimStr) {
      const parsed = parseDimensions(dimStr);
      if (parsed) { largeur = parsed.largeur; hauteur = parsed.hauteur; }
    }
  }

  if (largeur === 0 && hauteur === 0 && !reference) return [];

  if (!reference) reference = `${largeur}x${hauteur}`;

  const varianteRaw = get('variante').toUpperCase();
  const variante: 'V1' | 'V2' = varianteRaw === 'V2' ? 'V2' : 'V1';
  const couleur = get('couleur') || '012 (Noir)';
  const { outer, inner, epaisseur } = compositionRaw ? parseVitrageSpec(compositionRaw) : { outer: '', inner: '', epaisseur: 10 };

  const qte = parseInt(get('qte')) || 1;
  const result: Vitrage[] = [];
  for (let i = 0; i < qte; i++) {
    result.push({
      id: uuid(), reference, variante, largeur, hauteur,
      composition: compositionRaw, intercalaireEpaisseur: epaisseur,
      intercalaireCouleur: couleur, outerGlass: outer, innerGlass: inner,
    });
  }
  return result;
}

export async function parseExcelFile(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return { vitrages: [], columnsDetected: {}, allHeaders: [], totalRows: 0, skippedRows: 0 };

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]);
  if (rows.length === 0) return { vitrages: [], columnsDetected: {}, allHeaders: [], totalRows: 0, skippedRows: 0 };

  const headers = Object.keys(rows[0]);
  const col = buildColumnMap(headers);
  const columnsDetected: Record<string, string> = {};
  for (const [field, header] of Object.entries(col)) {
    if (header) columnsDetected[field] = header;
  }

  const vitrages: Vitrage[] = [];
  let skipped = 0;
  for (const row of rows) {
    const vs = rowToVitrages(row, col);
    if (vs.length > 0) vitrages.push(...vs);
    else skipped++;
  }

  return { vitrages, columnsDetected, allHeaders: headers, totalRows: rows.length, skippedRows: skipped };
}

export function parseCSVText(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return { vitrages: [], columnsDetected: {}, allHeaders: [], totalRows: 0, skippedRows: 0 };

  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));
  const col = buildColumnMap(headers);
  const columnsDetected: Record<string, string> = {};
  for (const [field, header] of Object.entries(col)) {
    if (header) columnsDetected[field] = header;
  }

  const vitrages: Vitrage[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
    const vs = rowToVitrages(row, col);
    if (vs.length > 0) vitrages.push(...vs);
    else skipped++;
  }

  return { vitrages, columnsDetected, allHeaders: headers, totalRows: lines.length - 1, skippedRows: skipped };
}
