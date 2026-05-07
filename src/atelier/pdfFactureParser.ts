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
  { nom: 'PRO Equipe', patterns: [/pro\s*[ée]quipe/i, /pro\s*equipe/i] },
  { nom: 'Foussier', patterns: [/foussier/i] },
  { nom: 'Boschat Laveix', patterns: [/boschat/i, /laveix/i] },
  { nom: 'Rey', patterns: [/ets\s*rey/i, /rey\s*s\.?a/i] },
  { nom: 'Nerfs', patterns: [/nerfs/i] },
  { nom: 'Saint-Gobain', patterns: [/saint.gobain/i, /sglass/i] },
  { nom: 'Somfy', patterns: [/somfy/i] },
  { nom: 'Hoppe', patterns: [/hoppe/i] },
  { nom: 'Sika', patterns: [/sika/i] },
  { nom: 'Vitrage Insulaire', patterns: [/vitrage\s*insulaire/i] },
];

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
    /(?:BL|bon)\s*(?:n[°o.]?\s*)?[:\s]*([A-Z0-9][\w\-/]{3,20})/i,
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

  const linePattern = /^([A-Z0-9][\w\-./]{2,20})\s+(.{10,80}?)\s+(\d+[.,]?\d*)\s+(\d+[.,]\d{2})\s+(\d+[.,]\d{2})\s*$/;

  for (const line of lines) {
    const m = line.match(linePattern);
    if (m) {
      const ref = m[1].trim();
      const designation = m[2].trim();
      const qte = parseNumber(m[3]);
      const pu = parseNumber(m[4]);
      const total = parseNumber(m[5]);
      if (qte > 0 && pu > 0) {
        lignes.push({ ref, designation, coloris: '', conditionnement: '', qte, prixUnitaireHT: pu, totalLigneHT: total || qte * pu });
      }
    }
  }

  if (lignes.length === 0) {
    const loosePattern = /([A-Z0-9][\w\-./]{2,20})\s+(.{5,}?)\s+(\d+)\s+(\d+[.,]\d{2})/;
    for (const line of lines) {
      const m = line.match(loosePattern);
      if (m) {
        const ref = m[1].trim();
        const des = m[2].trim();
        const qte = parseNumber(m[3]);
        const pu = parseNumber(m[4]);
        if (qte > 0 && pu > 0 && des.length > 3) {
          lignes.push({ ref, designation: des, coloris: '', conditionnement: '', qte, prixUnitaireHT: pu, totalLigneHT: qte * pu });
        }
      }
    }
  }

  return lignes;
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
    const text = content.items
      .map(item => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pages.push({ pageNum: i, text });
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

  // Merge groups with unknown supplier ('') into previous group if exists
  const merged: typeof groups = [];
  for (const g of groups) {
    if (g.fournisseur === '' && merged.length > 0) {
      merged[merged.length - 1].pages.push(...g.pages);
    } else {
      merged.push(g);
    }
  }
  const finalGroups = merged.length > 0 ? merged : groups;

  return finalGroups.map(g => {
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
}
