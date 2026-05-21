import * as XLSX from 'xlsx';
import { v4 as uuid } from 'uuid';
import type { Vitrage } from './types';
import { parseVitrageSpec } from './parseVitrageSpec';

// ---------------------------------------------------------------------------
// Column name normalisation & matching
// ---------------------------------------------------------------------------

/** Remove accents, lowercase, strip spaces/underscores/hyphens. */
function normalise(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[\s_\-]+/g, '');
}

type Field =
  | 'reference'
  | 'variante'
  | 'largeur'
  | 'hauteur'
  | 'composition'
  | 'couleur';

const FIELD_PATTERNS: Record<Field, RegExp[]> = {
  reference: [/^ref/, /^proto/, /^reference/, /^repere/],
  variante: [/^v$/, /^variante/, /^v1v2/],
  largeur: [/^largeur/, /^l$/, /^width/],
  hauteur: [/^hauteur/, /^h$/, /^height/],
  composition: [/^composition/, /^vitrage/, /^spec/],
  couleur: [/^couleur/, /^intercalaire/, /^color/],
};

function matchField(header: string): Field | null {
  const n = normalise(header);
  for (const [field, patterns] of Object.entries(FIELD_PATTERNS) as [
    Field,
    RegExp[],
  ][]) {
    if (patterns.some((p) => p.test(n))) return field;
  }
  return null;
}

/** Build a mapping from Field to the original column key found in the row objects. */
function buildColumnMap(headers: string[]): Record<Field, string | null> {
  const map: Record<Field, string | null> = {
    reference: null,
    variante: null,
    largeur: null,
    hauteur: null,
    composition: null,
    couleur: null,
  };
  for (const h of headers) {
    const f = matchField(h);
    if (f && map[f] === null) {
      map[f] = h;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Row → Vitrage conversion
// ---------------------------------------------------------------------------

function rowToVitrage(
  row: Record<string, unknown>,
  col: Record<Field, string | null>,
): Vitrage | null {
  const get = (f: Field): string =>
    col[f] != null ? String(row[col[f]!] ?? '').trim() : '';

  const reference = get('reference');
  const compositionRaw = get('composition');
  if (!reference || !compositionRaw) return null;

  const varianteRaw = get('variante').toUpperCase();
  const variante: 'V1' | 'V2' = varianteRaw === 'V2' ? 'V2' : 'V1';

  const largeur = parseFloat(get('largeur')) || 0;
  const hauteur = parseFloat(get('hauteur')) || 0;

  const couleur = get('couleur') || '012 (Noir)';

  const { outer, inner, epaisseur } = parseVitrageSpec(compositionRaw);

  return {
    id: uuid(),
    reference,
    variante,
    largeur,
    hauteur,
    composition: compositionRaw,
    intercalaireEpaisseur: epaisseur,
    intercalaireCouleur: couleur,
    outerGlass: outer,
    innerGlass: inner,
  };
}

// ---------------------------------------------------------------------------
// Excel parser
// ---------------------------------------------------------------------------

export async function parseExcelFile(file: File): Promise<Vitrage[]> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
    wb.Sheets[sheetName],
  );
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  const col = buildColumnMap(headers);

  const vitrages: Vitrage[] = [];
  for (const row of rows) {
    const v = rowToVitrage(row, col);
    if (v) vitrages.push(v);
  }
  return vitrages;
}

// ---------------------------------------------------------------------------
// CSV / TSV parser
// ---------------------------------------------------------------------------

function detectSeparator(firstLine: string): string {
  if (firstLine.includes('\t')) return '\t';
  if (firstLine.includes(';')) return ';';
  return ',';
}

export function parseCSVText(text: string): Vitrage[] {
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) return [];

  const sep = detectSeparator(lines[0]);
  const headers = lines[0].split(sep).map((h) => h.trim());
  const col = buildColumnMap(headers);

  const vitrages: Vitrage[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep);
    const row: Record<string, unknown> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? '';
    });
    const v = rowToVitrage(row, col);
    if (v) vitrages.push(v);
  }
  return vitrages;
}
