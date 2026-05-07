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

  // Pattern: reference + designation + quantite + prix unitaire + total
  // Many invoice formats have lines like: REF DESIGNATION QTE PU TOTAL
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

  // Fallback: looser pattern if nothing found
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

async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  (pdfjsLib as unknown as { GlobalWorkerOptions: typeof GlobalWorkerOptions }).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const buffer = await file.arrayBuffer();
  const pdf = await (pdfjsLib as unknown as { getDocument: typeof GetDocumentFn }).getDocument({ data: buffer }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .filter((item): item is { str: string } => 'str' in item)
      .map(item => item.str)
      .join(' ');
    pages.push(text);
  }
  return pages.join('\n');
}

export async function parseFacturePDF(file: File): Promise<FactureParsed> {
  const text = await extractTextFromPDF(file);

  return {
    fournisseur: detectFournisseur(text),
    dateFacture: detectDate(text),
    numFacture: detectNumFacture(text),
    lignes: parseLignes(text),
    texteBrut: text,
  };
}
