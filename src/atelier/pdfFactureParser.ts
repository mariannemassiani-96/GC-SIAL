import type { GlobalWorkerOptions, getDocument as GetDocumentFn } from 'pdfjs-dist';

interface LigneFactureParsed {
  ref: string;
  designation: string;
  coloris: string;
  conditionnement: string;
  qte: number;
  prixUnitaireHT: number;
  totalLigneHT: number;
}

export interface FactureParsed {
  fournisseur: string;
  dateFacture: string;
  numFacture: string;
  lignes: LigneFactureParsed[];
  texteBrut: string;
  pages: number[];
}

const FOURNISSEURS_PATTERNS: { nom: string; patterns: RegExp[] }[] = [
  { nom: 'Wurth', patterns: [/w[üu]rth/i, /adolf\s*wurth/i] },
  { nom: 'Ferco', patterns: [/ferco/i, /g-u\s*ferco/i, /gretsch.unitas/i] },
  { nom: 'Rehau', patterns: [/rehau/i] },
  { nom: 'Kawneer', patterns: [/kawneer/i, /alcoa.*kawneer/i] },
  { nom: 'PRO Equipe', patterns: [/pro\s*[ée]quipe/i, /proequip/i] },
  { nom: 'Foussier', patterns: [/foussier/i] },
  { nom: 'Boschat Laveix', patterns: [/boschat/i, /laveix/i] },
  { nom: 'Rey', patterns: [/ets\s*rey/i, /rey\s*s\.?a/i] },
  { nom: 'Nerfs', patterns: [/nerfs/i] },
  { nom: 'Saint-Gobain', patterns: [/saint.gobain/i, /sglass/i] },
  { nom: 'Somfy', patterns: [/somfy/i] },
  { nom: 'Hoppe', patterns: [/hoppe/i] },
  { nom: 'Sika', patterns: [/\bsika\b/i] },
  { nom: 'Isula Vitrage', patterns: [/isula\s*vitrage/i, /vitrage\s*insulaire/i] },
  { nom: 'Manitou', patterns: [/\bmanitou\b/i] },
  { nom: 'Marcantoni', patterns: [/marcantoni/i] },
  { nom: 'Synerglass', patterns: [/synerglass/i] },
];

// Words that indicate a line is NOT an article
const BLACKLIST_WORDS = [
  /\bgreffe\b/i, /\btribunal\b/i, /\bcommerce\b/i, /\bsiret\b/i,
  /\bsiren\b/i, /\bape\b/i, /\brcs\b/i, /\btva\s*intracom/i,
  /\bn[°o]\s*tva/i, /\badresse\b/i, /\blivraison\b/i, /\bfacture\b.*n[°o]/i,
  /\bpage\b/i, /\bclient\b/i, /\bbonlivraison\b/i, /\bbon\s*de\s*livraison/i,
  /\btotal\s*(ht|ttc|tva)/i, /\bsous.total/i, /\bmontant/i,
  /\bconditions\b/i, /\breglement\b/i, /\bpaiement\b/i, /\becheance\b/i,
  /\biban\b/i, /\bbic\b/i, /\bbanque\b/i, /\bswift\b/i,
  /\bdate\b.*\b(facture|emission|commande)\b/i,
  /\breferences?\b.*\b(client|commande)\b/i, /\bvos\s*ref/i, /\bnos\s*ref/i,
  /\bcode\s*postal/i, /\btel[:\s]/i, /\bfax\b/i, /\bemail\b/i, /\bwww\./i,
  /\bcapital\b/i, /\bfondee?\b/i, /\bsociete\b/i,
  /\bprotection\s*individuel/i, /\bhandling\b/i,
  /^\s*date\s*$/i, /^\s*siret\s*$/i, /^\s*n[°o]\s*$/i,
];

function isBlacklisted(text: string): boolean {
  return BLACKLIST_WORDS.some(p => p.test(text));
}

// A valid article ref typically has letters+numbers, not just words
function isValidRef(ref: string): boolean {
  if (ref.length < 3 || ref.length > 30) return false;
  // Must contain at least one digit
  if (!/\d/.test(ref)) return false;
  // Must not be a common non-ref pattern
  if (/^(page|date|siret|total|sous|tva|ht|ttc|net)\b/i.test(ref)) return false;
  return true;
}

function detectFournisseur(text: string): string {
  for (const f of FOURNISSEURS_PATTERNS) {
    if (f.patterns.some(p => p.test(text))) return f.nom;
  }
  return '';
}

function detectDate(text: string): string {
  const m = text.match(/(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${d}`;
  }
  const m2 = text.match(/(\d{4})[/.\-](\d{2})[/.\-](\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}-${m2[3]}`;
  return '';
}

function detectNumFacture(text: string): string {
  const patterns = [
    /(?:facture|invoice|fact\.?)\s*(?:n[°o.]?\s*)?[:\s]*([A-Z0-9][\w\-/]{3,20})/i,
    /(?:n[°o.]?\s*(?:de\s*)?(?:facture|fact))\s*[:\s]*([A-Z0-9][\w\-/]{3,20})/i,
    /\b(ISULV\d{2}\s*\d+)\b/i,
    /\b(FA[- ]?\d{4,})\b/i,
    /\b(BL[- ]?\d{4,})\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

function parseNumber(s: string): number {
  const cleaned = s.replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function parseLignes(text: string): LigneFactureParsed[] {
  const lignes: LigneFactureParsed[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    if (isBlacklisted(line)) continue;

    // Pattern 1: REF DESIGNATION QTE PU_HT TOTAL_HT
    const m1 = line.match(/^([A-Z0-9][\w\-./]{2,25})\s+(.{8,80}?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s*$/);
    if (m1 && isValidRef(m1[1]) && !isBlacklisted(m1[2])) {
      const qte = parseNumber(m1[3]);
      const pu = parseNumber(m1[4]);
      const total = parseNumber(m1[5]);
      if (qte > 0 && pu > 0.01 && qte <= 99999) {
        lignes.push({ ref: m1[1].trim(), designation: m1[2].trim(), coloris: '', conditionnement: '', qte, prixUnitaireHT: pu, totalLigneHT: total || qte * pu });
        continue;
      }
    }

    // Pattern 2: REF DESIGNATION QTE PU (no total)
    const m2 = line.match(/^([A-Z0-9][\w\-./]{2,25})\s+(.{8,80}?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s*$/);
    if (m2 && isValidRef(m2[1]) && !isBlacklisted(m2[2])) {
      const qte = parseNumber(m2[3]);
      const pu = parseNumber(m2[4]);
      if (qte > 0 && pu > 0.01 && qte <= 99999) {
        lignes.push({ ref: m2[1].trim(), designation: m2[2].trim(), coloris: '', conditionnement: '', qte, prixUnitaireHT: pu, totalLigneHT: qte * pu });
        continue;
      }
    }

    // Pattern 3: spaced tokens — REF ... numbers at end
    const m3 = line.match(/^([A-Z0-9][\w\-./]{2,25})\s+(.+?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d{2})(?:\s+(\d+[.,]\d{2}))?\s*$/);
    if (m3 && isValidRef(m3[1]) && !isBlacklisted(m3[2])) {
      const des = m3[2].trim();
      const qte = parseNumber(m3[3]);
      const pu = parseNumber(m3[4]);
      const total = m3[5] ? parseNumber(m3[5]) : qte * pu;
      if (qte > 0 && pu > 0.01 && qte <= 99999 && des.length >= 5) {
        lignes.push({ ref: m3[1].trim(), designation: des, coloris: '', conditionnement: '', qte, prixUnitaireHT: pu, totalLigneHT: total });
      }
    }
  }

  // Deduplicate by ref+designation
  const seen = new Set<string>();
  return lignes.filter(l => {
    const key = `${l.ref}|${l.designation}|${l.qte}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

interface PageText { pageNum: number; text: string; }

async function extractPagesFromPDF(file: File): Promise<PageText[]> {
  const pdfjsLib = await import('pdfjs-dist');
  const version = (pdfjsLib as unknown as { version: string }).version;
  const gwo = pdfjsLib as unknown as { GlobalWorkerOptions: typeof GlobalWorkerOptions };
  gwo.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const getDoc = (pdfjsLib as unknown as { getDocument: typeof GetDocumentFn }).getDocument;
  const pdf = await getDoc({ data: new Uint8Array(buffer) }).promise;

  const pages: PageText[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group text items by Y position to reconstruct lines
    const items = content.items
      .filter(item => 'str' in item && 'transform' in item)
      .map(item => {
        const ti = item as unknown as { str: string; transform: number[] };
        return { str: ti.str, x: ti.transform[4], y: Math.round(ti.transform[5]) };
      });

    if (items.length === 0) { pages.push({ pageNum: i, text: '' }); continue; }

    // Sort by Y descending (top of page first), then X ascending
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // Group items within 3px Y tolerance into same line
    const lines: string[] = [];
    let currentY = items[0].y;
    let currentLine: string[] = [];

    for (const item of items) {
      if (Math.abs(item.y - currentY) > 3) {
        lines.push(currentLine.join(' ').trim());
        currentLine = [];
        currentY = item.y;
      }
      if (item.str.trim()) currentLine.push(item.str.trim());
    }
    if (currentLine.length > 0) lines.push(currentLine.join(' ').trim());

    pages.push({ pageNum: i, text: lines.filter(Boolean).join('\n') });
  }
  return pages;
}

export async function parseFacturePDF(file: File): Promise<FactureParsed[]> {
  const pages = await extractPagesFromPDF(file);

  // Group consecutive pages by detected supplier
  const groups: { fournisseur: string; pages: PageText[] }[] = [];

  for (const page of pages) {
    const fournisseur = detectFournisseur(page.text);
    const last = groups[groups.length - 1];
    if (last && last.fournisseur === fournisseur && fournisseur !== '') {
      last.pages.push(page);
    } else {
      groups.push({ fournisseur, pages: [page] });
    }
  }

  // Merge unknown-supplier groups into previous known group
  const merged: typeof groups = [];
  for (const g of groups) {
    if (g.fournisseur === '' && merged.length > 0) {
      merged[merged.length - 1].pages.push(...g.pages);
    } else {
      merged.push(g);
    }
  }
  const finalGroups = merged.length > 0 ? merged : groups;

  const results = finalGroups.map(g => {
    const fullText = g.pages.map(p => p.text).join('\n');
    return {
      fournisseur: g.fournisseur || '',
      dateFacture: detectDate(fullText),
      numFacture: detectNumFacture(fullText),
      lignes: parseLignes(fullText),
      texteBrut: fullText,
      pages: g.pages.map(p => p.pageNum),
    };
  });

  // Remove groups with no lines and no detected supplier (pure noise)
  return results.filter(r => r.lignes.length > 0 || r.fournisseur !== '');
}
