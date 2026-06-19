/**
 * ODT (Pro2D) report parser.
 *
 * Pro2D exports optimization reports as ODT files (OpenDocument Text).
 * ODT is a ZIP archive containing `content.xml` with ODF XML markup.
 *
 * The content contains tables with:
 *   - Summary: plaques count, utilisation %
 *   - Panel list (Recapitulatif des panneaux): Reference, Material, Dimensions, Qty
 *   - Material list (Lista Layout): material codes + plate counts
 *   - Plate layouts (Feuille): each plate with pieces placed on it
 *
 * This parser extracts both vitrages (for import) and plate layouts
 * (for using Pro2D's optimization directly instead of re-optimizing).
 */

import JSZip from 'jszip';
import { v4 as uuid } from 'uuid';
import type { Vitrage, GlassOptimResult, OptimizedPlate, PlacedPiece, Remnant } from './types';
import { parseVitrageSpec } from './parseVitrageSpec';
import type { ParseResult } from './parseExcel';

// ── ODT XML Parsing ─────────────────────────────────────────────────

/**
 * Extract text content from an ODF table cell element.
 * Handles nested <text:p> elements and repeated columns.
 */
function getCellText(cell: Element): string {
  const paragraphs: string[] = [];
  const ps = cell.getElementsByTagNameNS('urn:oasis:names:tc:opendocument:xmlns:text:1.0', 'p');
  for (let i = 0; i < ps.length; i++) {
    paragraphs.push(ps[i].textContent?.trim() ?? '');
  }
  return paragraphs.join(' ').trim();
}

/**
 * Get the number of times a column is repeated (table:number-columns-repeated).
 */
function getColumnRepeat(cell: Element): number {
  const rep = cell.getAttributeNS(
    'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'number-columns-repeated',
  );
  return rep ? parseInt(rep) || 1 : 1;
}

/**
 * Extract all tables from ODF content.xml as string[][][].
 * Each table is an array of rows, each row is an array of cell strings.
 */
function extractOdfTables(xmlStr: string): string[][][] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlStr, 'application/xml');

  const TABLE_NS = 'urn:oasis:names:tc:opendocument:xmlns:table:1.0';
  const tables: string[][][] = [];

  const tableEls = doc.getElementsByTagNameNS(TABLE_NS, 'table');
  for (let t = 0; t < tableEls.length; t++) {
    const rows: string[][] = [];
    const rowEls = tableEls[t].getElementsByTagNameNS(TABLE_NS, 'table-row');

    for (let r = 0; r < rowEls.length; r++) {
      const cells: string[] = [];
      const cellEls = rowEls[r].childNodes;

      for (let c = 0; c < cellEls.length; c++) {
        const node = cellEls[c];
        if (node.nodeType !== 1) continue; // skip non-elements
        const el = node as Element;
        const localName = el.localName;

        if (localName === 'table-cell' || localName === 'covered-table-cell') {
          const text = getCellText(el);
          const repeat = getColumnRepeat(el);
          for (let rep = 0; rep < repeat; rep++) {
            cells.push(text);
          }
        }
      }

      // Skip fully empty rows (but keep rows with at least one non-empty cell)
      if (cells.some(c => c.length > 0)) {
        rows.push(cells);
      }
    }

    if (rows.length > 0) {
      tables.push(rows);
    }
  }

  return tables;
}

// ── Dimension / Number Parsing ──────────────────────────────────────

function parseDimStr(raw: string): { largeur: number; hauteur: number } | null {
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*[xX×*]\s*(\d+(?:[.,]\d+)?)/);
  if (m) {
    return {
      largeur: parseFloat(m[1].replace(',', '.')),
      hauteur: parseFloat(m[2].replace(',', '.')),
    };
  }
  return null;
}

function parseFrenchFloat(s: string): number {
  return parseFloat(s.replace(',', '.').replace(/\s/g, '')) || 0;
}

// ── Plate Header Parsing ────────────────────────────────────────────

interface PlateHeader {
  plateNumber: number;
  quantity: number;
  material: string;
  width: number;
  height: number;
  utilisation: number;
}

/**
 * Parse plate header like:
 *   "Feuille: 1 (Qte. 1) Materiel: 44.2 Clair Dimensions: 3210 x 2550"
 *   "Utiliser les pourcentages: 83,5 %"
 *
 * The header may be split across multiple cells/rows, so we concatenate
 * all text in the first rows of each plate table.
 */
function parsePlateHeader(text: string): PlateHeader | null {
  // Normalise: remove accented characters for easier matching
  const n = text.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Match plate number: "Feuille: N" or "Feuille : N"
  const numMatch = n.match(/Feuille\s*:\s*(\d+)/i);
  if (!numMatch) return null;
  const plateNumber = parseInt(numMatch[1]);

  // Match quantity: "(Qte. N)" or "(Qt. N)" or "(Qté. N)"
  const qtyMatch = n.match(/\(Qt[eé]?\.\s*(\d+)\)/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  // Match material: "Materiel: ..." up to "Dimensions:"
  const matMatch = n.match(/Mat[eé]riel\s*:\s*(.+?)(?:\s+Dimensions?\s*:|$)/i);
  const material = matMatch ? matMatch[1].trim() : '';

  // Match dimensions: "Dimensions: W x H"
  const dimMatch = n.match(/Dimensions?\s*:\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/i);
  const width = dimMatch ? parseFrenchFloat(dimMatch[1]) : 0;
  const height = dimMatch ? parseFrenchFloat(dimMatch[2]) : 0;

  // Match utilisation: "Utiliser les pourcentages: 83,5 %" or "Utilisation: 83,5%"
  const utilMatch = n.match(/(?:Utiliser\s+les\s+pourcentages|Utilisation)\s*:\s*(\d+[.,]?\d*)\s*%/i);
  const utilisation = utilMatch ? parseFrenchFloat(utilMatch[1]) : 0;

  return { plateNumber, quantity, material, width, height, utilisation };
}

// ── Piece Row Parsing ───────────────────────────────────────────────

interface PieceRow {
  index: number;
  reference: string;
  width: number;
  height: number;
  quantity: number;
}

/**
 * Parse a piece row from a plate table.
 * Expected columns: N. | Riferimento/Reference | Dimensioni/Dimensions | Qt./Qty
 */
function parsePieceRow(row: string[], colMap: PieceColumnMap): PieceRow | null {
  const idxStr = row[colMap.index]?.trim();
  const index = parseInt(idxStr);
  if (isNaN(index)) return null;

  const reference = row[colMap.reference]?.trim() ?? '';
  const dimStr = row[colMap.dimensions]?.trim() ?? '';
  const qtyStr = row[colMap.quantity]?.trim() ?? '1';

  const dims = parseDimStr(dimStr);
  if (!dims) return null;

  return {
    index,
    reference,
    width: dims.largeur,
    height: dims.hauteur,
    quantity: parseInt(qtyStr) || 1,
  };
}

interface PieceColumnMap {
  index: number;
  reference: number;
  dimensions: number;
  quantity: number;
}

/**
 * Detect column mapping for piece rows.
 * Headers like: "N." "Riferimento"/"Reference" "Dimensioni"/"Dimensions" "Qt."/"Qty"
 */
function detectPieceColumns(headerRow: string[]): PieceColumnMap | null {
  let index = -1, reference = -1, dimensions = -1, quantity = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (/^n\.?$/.test(h) || h === 'no' || h === 'num') index = c;
    else if (h.includes('rifer') || h.includes('rence') || h.includes('ref')) reference = c;
    else if (h.includes('dimen') || h.includes('dim')) dimensions = c;
    else if (h.includes('qt') || h.includes('qty')) quantity = c;
  }

  if (index >= 0 && dimensions >= 0) {
    // Reference defaults to column after index if not found
    if (reference < 0) reference = index + 1;
    // Quantity defaults to column after dimensions if not found
    if (quantity < 0) quantity = dimensions + 1;
    return { index, reference, dimensions, quantity };
  }
  return null;
}

// ── Panel List Parsing (Vitrages) ───────────────────────────────────

interface PanelColumnMap {
  reference: number;
  material: number;
  dimensions: number;
  quantity: number;
}

function detectPanelColumns(headerRow: string[]): PanelColumnMap | null {
  let reference = -1, material = -1, dimensions = -1, quantity = -1;

  for (let c = 0; c < headerRow.length; c++) {
    const h = headerRow[c].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (h.includes('rence') || h.includes('rifer') || h.includes('ref')) reference = c;
    else if (h.includes('mat') || h.includes('riel') || h.includes('comp') || h.includes('verre')) material = c;
    else if (h.includes('dimen') || h.includes('dim')) dimensions = c;
    else if (h.includes('qt') || h.includes('qty')) quantity = c;
  }

  if (dimensions >= 0) {
    if (reference < 0) reference = 0;
    if (material < 0) material = reference + 1;
    if (quantity < 0) quantity = dimensions + 1;
    return { reference, material, dimensions, quantity };
  }
  return null;
}

// ── Main ODT Parsing ────────────────────────────────────────────────

export interface ODTParseResult extends ParseResult {
  /** Plate layouts extracted from Pro2D Feuille sections */
  optimResults: GlassOptimResult[];
}

/**
 * Parse an ODT file from Pro2D optimization report.
 *
 * Returns both vitrages (for import) and optimization results
 * (plate layouts for direct use instead of re-optimizing).
 */
export async function parseODTFile(file: File, chantier?: string): Promise<ODTParseResult> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const contentXml = zip.file('content.xml');
  if (!contentXml) {
    return {
      vitrages: [],
      columnsDetected: {},
      allHeaders: ['Fichier ODT invalide : content.xml non trouve'],
      lotInfo: '',
      totalRows: 0,
      skippedRows: 0,
      optimResults: [],
    };
  }

  const xmlStr = await contentXml.async('string');
  const tables = extractOdfTables(xmlStr);

  if (tables.length === 0) {
    return {
      vitrages: [],
      columnsDetected: {},
      allHeaders: ['Aucune table trouvee dans le fichier ODT'],
      lotInfo: '',
      totalRows: 0,
      skippedRows: 0,
      optimResults: [],
    };
  }

  // ── Step 1: Find and parse the panels table (vitrages) ──────────
  const vitrages: Vitrage[] = [];
  let totalRows = 0;
  let skipped = 0;
  let lotInfo = '';
  let allHeaders: string[] = [];
  const columnsDetected: Record<string, string> = {};

  // Look for the panels table: "Recapitulatif des panneaux" or has Reference/Dimensions headers
  let panneauxTable: string[][] | null = null;

  for (const table of tables) {
    // Check first few rows for "Recapitulatif" or "panneau"
    const firstRows = table.slice(0, 3).map(r => r.join(' ').toLowerCase());
    const combined = firstRows.join(' ');

    if (combined.includes('capitulatif') && combined.includes('panneau')) {
      panneauxTable = table;
      break;
    }
  }

  // Fallback: find a table with Reference + Dimensions columns
  if (!panneauxTable) {
    for (const table of tables) {
      for (let r = 0; r < Math.min(table.length, 5); r++) {
        const cols = detectPanelColumns(table[r]);
        if (cols) {
          panneauxTable = table;
          break;
        }
      }
      if (panneauxTable) break;
    }
  }

  if (panneauxTable) {
    // Find the header row
    let headerRowIdx = 0;
    let panelCols: PanelColumnMap | null = null;

    for (let r = 0; r < Math.min(panneauxTable.length, 5); r++) {
      panelCols = detectPanelColumns(panneauxTable[r]);
      if (panelCols) {
        headerRowIdx = r;
        break;
      }
    }

    if (panelCols) {
      allHeaders = panneauxTable[headerRowIdx];
      columnsDetected['reference'] = panneauxTable[headerRowIdx][panelCols.reference] ?? 'Reference';
      columnsDetected['composition'] = panneauxTable[headerRowIdx][panelCols.material] ?? 'Materiel';
      columnsDetected['dimensions'] = panneauxTable[headerRowIdx][panelCols.dimensions] ?? 'Dimensions';
      columnsDetected['qte'] = panneauxTable[headerRowIdx][panelCols.quantity] ?? 'Qt.';

      for (let r = headerRowIdx + 1; r < panneauxTable.length; r++) {
        const row = panneauxTable[r];
        if (!row || row.every(c => !c)) continue;

        const refRaw = row[panelCols.reference]?.trim() ?? '';
        const composition = row[panelCols.material]?.trim() ?? '';
        const dimStr = row[panelCols.dimensions]?.trim() ?? '';
        const qte = parseInt(row[panelCols.quantity]) || 1;

        // Skip summary/total rows
        if (!dimStr || /^total/i.test(refRaw)) continue;
        totalRows++;

        const dims = parseDimStr(dimStr);
        if (!dims) { skipped++; continue; }
        if (!composition) { skipped++; continue; }

        const { outer, inner, epaisseur } = parseVitrageSpec(composition);
        const chantierLabel = chantier ? chantier.replace(/\s+/g, '_') : '';
        const vitRef = chantierLabel ? `${refRaw}_${chantierLabel}` : refRaw || composition;

        for (let i = 0; i < qte; i++) {
          vitrages.push({
            id: uuid(),
            reference: vitRef,
            variante: 'V1',
            largeur: dims.largeur,
            hauteur: dims.hauteur,
            composition,
            intercalaireEpaisseur: epaisseur,
            intercalaireCouleur: '012 (Noir)',
            outerGlass: outer,
            innerGlass: inner,
            ug: '',
            gazType: 'Argon',
          });
        }
      }
    }
  }

  // ── Step 2: Parse plate layouts (Feuille sections) ──────────────
  const platesByMaterial = new Map<string, OptimizedPlate[]>();

  for (const table of tables) {
    // A plate table starts with a header row containing "Feuille:"
    // This may be in the first row or spread across first few rows
    let headerText = '';
    let dataStartRow = 0;

    // Collect all header text from rows before piece data starts
    for (let r = 0; r < Math.min(table.length, 5); r++) {
      const rowText = table[r].join(' ');
      if (/Feuille\s*:/i.test(rowText) || /Mat[eéé]riel\s*:/i.test(rowText) ||
          /Dimensions?\s*:/i.test(rowText) || /Utiliser\s+les\s+pourcentages/i.test(rowText) ||
          /Utilisation\s*:/i.test(rowText)) {
        headerText += ' ' + rowText;
      } else if (/^N\.?\s*$/i.test(table[r][0]?.trim() ?? '') ||
                 table[r].some(c => /rifer|rence|dimen/i.test(c.normalize('NFD').replace(/[̀-ͯ]/g, '')))) {
        dataStartRow = r;
        break;
      }
    }

    const plateInfo = parsePlateHeader(headerText);
    if (!plateInfo) continue;

    // Detect piece column mapping from the header row at dataStartRow
    const pieceColMap = detectPieceColumns(table[dataStartRow] ?? []);
    if (!pieceColMap) continue;

    // Parse piece rows
    const pieces: PlacedPiece[] = [];
    let currentX = 15; // edgeTrimMargin
    let currentY = 15;
    let rowHeight = 0;

    for (let r = dataStartRow + 1; r < table.length; r++) {
      const row = table[r];
      if (!row || row.every(c => !c)) continue;

      const piece = parsePieceRow(row, pieceColMap);
      if (!piece) continue;

      for (let q = 0; q < piece.quantity; q++) {
        // Estimate placement: simple left-to-right, top-to-bottom
        if (currentX + piece.width > plateInfo.width - 15) {
          // Move to next row
          currentX = 15;
          currentY += rowHeight + 5; // 5mm gap
          rowHeight = 0;
        }

        pieces.push({
          vitrageId: uuid(),
          vitrageRef: piece.reference,
          width: piece.width,
          height: piece.height,
          material: plateInfo.material,
          face: 'EXT',
          noRotation: false,
          x: currentX,
          y: currentY,
          rotated: false,
        });

        currentX += piece.width + 5; // 5mm gap
        rowHeight = Math.max(rowHeight, piece.height);
      }
    }

    if (pieces.length === 0) continue;

    // Calculate remnants (simplified: one remnant for unused area)
    const usedArea = pieces.reduce((sum, p) => sum + p.width * p.height, 0);
    const totalArea = plateInfo.width * plateInfo.height;
    const remnants: Remnant[] = [];

    if (usedArea < totalArea) {
      const unusedFraction = 1 - usedArea / totalArea;
      // Place a single remnant block to represent unused area
      const remnantW = plateInfo.width - 15;
      const remnantH = Math.round(unusedFraction * plateInfo.height);
      if (remnantH > 20) {
        remnants.push({
          x: 15,
          y: plateInfo.height - remnantH,
          w: remnantW,
          h: remnantH,
          classe: remnantH >= 300 ? 'stockable' : remnantH >= 100 ? 'surveiller' : 'poussiere',
        });
      }
    }

    // Create plates (handle quantity > 1 by duplicating)
    for (let q = 0; q < plateInfo.quantity; q++) {
      const plate: OptimizedPlate = {
        numero: 0, // will be renumbered below
        material: plateInfo.material,
        plateWidth: plateInfo.width,
        plateHeight: plateInfo.height,
        pieces: pieces.map(p => ({ ...p, vitrageId: uuid() })),
        utilisation: plateInfo.utilisation,
        remnants,
        hasInterdit: false,
      };

      const existing = platesByMaterial.get(plateInfo.material);
      if (existing) {
        existing.push(plate);
      } else {
        platesByMaterial.set(plateInfo.material, [plate]);
      }
    }
  }

  // ── Step 3: Build GlassOptimResult[] ──────────────────────────────
  const optimResults: GlassOptimResult[] = [];

  for (const [material, plates] of platesByMaterial.entries()) {
    // Renumber plates sequentially
    plates.forEach((p, i) => { p.numero = i + 1; });

    const totalPieces = plates.reduce((sum, p) => sum + p.pieces.length, 0);
    const avgUtil = plates.length > 0
      ? plates.reduce((sum, p) => sum + p.utilisation, 0) / plates.length
      : 0;

    optimResults.push({
      material,
      plates,
      totalPlates: plates.length,
      totalPieces,
      tauxUtilisation: Math.round(avgUtil * 10) / 10,
    });
  }

  return {
    vitrages,
    columnsDetected,
    allHeaders,
    lotInfo,
    totalRows,
    skippedRows: skipped,
    optimResults,
  };
}
