import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { Vitrage } from './types';
import { parseVitrageSpec } from './parseVitrageSpec';

export interface ParseResult {
  vitrages: Vitrage[];
  columnsDetected: Record<string, string>;
  allHeaders: string[];
  lotInfo: string;
  totalRows: number;
  skippedRows: number;
}

function normalise(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[\s_\-.()/]+/g, '');
}

type Field = 'reference' | 'variante' | 'largeur' | 'hauteur' | 'dimensions' | 'composition' | 'couleur' | 'qte';

const FIELD_PATTERNS: Record<Field, RegExp[]> = {
  reference: [/^code$/, /^ref/, /^proto/, /^repere/, /^designation/, /^nom/, /^piece/, /^id$/],
  variante: [/^v$/, /^v[12]/, /^variante/],
  largeur: [/^largeur/, /^larg/, /^l$/, /^width/, /^w$/],
  hauteur: [/^hauteur/, /^haut/, /^h$/, /^height/],
  dimensions: [/^dim/, /^taille/, /^size/, /^lxh/],
  composition: [/^compo/, /^vitrage/, /^spec/, /^verre/, /^glass/, /^description/],
  couleur: [/^couleur/, /^intercalaire/, /^color/, /^couleurintercalaire/],
  qte: [/^qt[eé]?$/, /^quantit/, /^qty/, /^nb/],
};

function matchField(header: string): Field | null {
  const n = normalise(header);
  if (!n || n === 'empty') return null;
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [Field, RegExp[]][]) {
    if (patterns.some(p => p.test(n))) return field;
  }
  return null;
}

function emptyResult(): ParseResult {
  return { vitrages: [], columnsDetected: {}, allHeaders: [], lotInfo: '', totalRows: 0, skippedRows: 0 };
}

function parseDimStr(raw: string): { largeur: number; hauteur: number } | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/);
  if (m) return { largeur: parseFloat(m[1].replace(',', '.')), hauteur: parseFloat(m[2].replace(',', '.')) };
  return null;
}

function findHeaderRow(data: unknown[][]): { rowIdx: number; colMap: Map<number, Field>; headers: string[] } | null {
  for (let r = 0; r < Math.min(data.length, 30); r++) {
    const row = data[r];
    if (!row) continue;
    const cells = row.map(c => String(c ?? '').trim());
    const colMap = new Map<number, Field>();
    const headers: string[] = [];

    for (let c = 0; c < cells.length; c++) {
      const cell = cells[c];
      if (!cell) continue;
      headers.push(cell);
      const field = matchField(cell);
      if (field && !Array.from(colMap.values()).includes(field)) {
        colMap.set(c, field);
      }
    }

    if (colMap.size >= 2) {
      return { rowIdx: r, colMap, headers };
    }
  }
  return null;
}

function extractLotInfo(data: unknown[][]): string {
  for (let r = 0; r < Math.min(data.length, 15); r++) {
    const row = data[r];
    if (!row) continue;
    for (const cell of row) {
      const s = String(cell ?? '');
      const m = s.match(/[LO][-_]\d{4}[-_]\d+.*$/i);
      if (m) return m[0].trim();
    }
  }
  return '';
}

function rowToVitrages(
  row: unknown[],
  colMap: Map<number, Field>,
): Vitrage[] {
  const get = (f: Field): string => {
    for (const [idx, field] of colMap.entries()) {
      if (field === f) return String(row[idx] ?? '').trim();
    }
    return '';
  };

  const refRaw = get('reference');
  if (!refRaw || /^totaux$/i.test(refRaw) || /^\(/.test(refRaw)) return [];

  const compositionRaw = get('composition');
  let largeur = parseFloat(get('largeur')) || 0;
  let hauteur = parseFloat(get('hauteur')) || 0;

  if (largeur === 0 && hauteur === 0) {
    const dimStr = get('dimensions');
    if (dimStr) {
      const parsed = parseDimStr(dimStr);
      if (parsed) { largeur = parsed.largeur; hauteur = parsed.hauteur; }
    }
  }

  if (largeur === 0 && hauteur === 0) return [];

  const reference = refRaw;
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
  if (!sheetName) return emptyResult();

  const data = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], { header: 1 });
  if (data.length === 0) return emptyResult();

  const lotInfo = extractLotInfo(data);
  const found = findHeaderRow(data);
  if (!found) {
    const allCells: string[] = [];
    for (let r = 0; r < Math.min(data.length, 25); r++) {
      const row = data[r];
      if (row) {
        for (const cell of row) {
          const s = String(cell ?? '').trim();
          if (s && s !== '__EMPTY') allCells.push(s);
        }
      }
    }
    return { ...emptyResult(), allHeaders: allCells.slice(0, 30), totalRows: data.length };
  }

  const { rowIdx, colMap, headers } = found;
  const columnsDetected: Record<string, string> = {};
  for (const [idx, field] of colMap.entries()) {
    columnsDetected[field] = String(data[rowIdx][idx] ?? '');
  }

  const vitrages: Vitrage[] = [];
  let skipped = 0;
  let dataRows = 0;

  for (let r = rowIdx + 1; r < data.length; r++) {
    const row = data[r];
    if (!row || row.every(c => !c || String(c).trim() === '')) continue;

    const firstCell = String(row[0] ?? '').trim().toLowerCase();
    if (firstCell.startsWith('(') || firstCell === '') {
      const hasContent = row.some(c => String(c ?? '').trim().length > 0);
      if (!hasContent) continue;
      if (firstCell.startsWith('(')) continue;
    }

    dataRows++;
    const vs = rowToVitrages(row, colMap);
    if (vs.length > 0) vitrages.push(...vs);
    else skipped++;
  }

  return { vitrages, columnsDetected, allHeaders: headers, lotInfo, totalRows: dataRows, skippedRows: skipped };
}

export function parseCSVText(text: string): ParseResult {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
  if (lines.length < 2) return emptyResult();

  const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
  const headerCells = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''));

  const colMap = new Map<number, Field>();
  for (let c = 0; c < headerCells.length; c++) {
    const field = matchField(headerCells[c]);
    if (field && !Array.from(colMap.values()).includes(field)) {
      colMap.set(c, field);
    }
  }

  const columnsDetected: Record<string, string> = {};
  for (const [idx, field] of colMap.entries()) {
    columnsDetected[field] = headerCells[idx];
  }

  const vitrages: Vitrage[] = [];
  let skipped = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map(v => v.trim().replace(/^"|"$/g, ''));
    const vs = rowToVitrages(values, colMap);
    if (vs.length > 0) vitrages.push(...vs);
    else skipped++;
  }

  return { vitrages, columnsDetected, allHeaders: headerCells, lotInfo: '', totalRows: lines.length - 1, skippedRows: skipped };
}
