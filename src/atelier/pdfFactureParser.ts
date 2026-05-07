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
  { nom: 'Foussier', patterns: [/foussier/i] },
  { nom: 'Ferco', patterns: [/ferco/i, /g-u\s*ferco/i, /gretsch.unitas/i] },
  { nom: 'Wurth', patterns: [/w[üu]rth/i, /adolf\s*wurth/i] },
  { nom: 'Rehau', patterns: [/rehau/i] },
  { nom: 'Kawneer', patterns: [/kawneer/i] },
  { nom: 'PRO Equipe', patterns: [/pro\s*[ée]quipe/i, /proequip/i] },
  { nom: 'Boschat Laveix', patterns: [/boschat/i, /laveix/i] },
  { nom: 'Rey', patterns: [/ets\s*rey/i, /rey\s*s\.?a/i] },
  { nom: 'Nerfs', patterns: [/nerfs/i] },
  { nom: 'Saint-Gobain', patterns: [/saint.gobain/i, /sglass/i] },
  { nom: 'Somfy', patterns: [/somfy/i] },
  { nom: 'Hoppe', patterns: [/hoppe/i] },
  { nom: 'Sika', patterns: [/\bsika\b/i] },
  { nom: 'Isula Vitrage', patterns: [/isula\s*vitrage/i, /vitrage\s*insulaire/i] },
  { nom: 'SETEC Transport', patterns: [/s\.?a\.?s\s*setec/i, /transport.setec/i] },
  { nom: 'AM Environnement', patterns: [/am\s*environnement/i, /am.groupe/i] },
  { nom: 'LAE Location', patterns: [/lae\s*location/i] },
  { nom: 'Advance Emploi', patterns: [/advance\s*emploi/i] },
  { nom: 'Transports Nicoletti', patterns: [/nicoletti/i, /groupe\s*kds/i] },
  { nom: 'CAP 20 Peinture', patterns: [/cap\s*vingt/i, /cap\s*20/i, /cap\.vingt/i] },
  { nom: 'Thermo Sud', patterns: [/thermo\s*sud/i] },
  { nom: 'Hilti', patterns: [/\bhilti\b/i] },
  { nom: 'FIF Volets', patterns: [/sarl\s*fif/i, /\bf\.?i\.?f\b/i, /sarlfif/i] },
  { nom: 'Yesss Electrique', patterns: [/yesss/i] },
  { nom: 'Synerglass', patterns: [/synerglass/i] },
  { nom: 'Manitou', patterns: [/\bmanitou\b/i] },
  { nom: 'Cortizo', patterns: [/cortizo/i] },
  { nom: 'Emaver', patterns: [/emaver/i, /miroiterie\s*martin/i] },
  { nom: 'Gaspari Nettoyage', patterns: [/gaspari/i] },
  { nom: 'Marana Golo', patterns: [/marana\s*golo/i] },
];

const BLACKLIST_LINES = [
  /\b(siret|siren|ape|rcs|iban|bic|swift|tva\s*intra|n[°o]\s*tva)\b/i,
  /\b(conditions\s*gen|reserve\s*de\s*propriete|penalite|escompte|recouvrement)\b/i,
  /\b(tribunal|greffe|juridiction)\b/i,
  /\btotal\s*(ht|ttc|tva|net)\b/i,
  /\b(sous.total|montant\s*(ht|ttc|tva))\b/i,
  /\b(net\s*[àa]\s*payer|valeur\s*nette)\b/i,
  /\b(reglement|paiement|echeance|virement\s*euro)\b/i,
  /\b(credit\s*(agricole|mutuel)|caisse\s*d.epargne|societe\s*generale|banque\s*populaire)\b/i,
  /\badresse\s*de\s*livraison\b/i,
  /\bvotre\s*(dossier|contact|reference)\b/i,
  /\bcode\s*client\b/i,
  /\bn[°o]\s*client\b/i,
  /\bmode\s*de\s*(reglement|livraison)\b/i,
  /\bfacture\s*n[°o]/i,
  /\bbon\s*de\s*livraison\b/i,
  /\bpage\s*\d/i,
  /\bpage\s*suivante/i,
  /\bpage\s*precedente/i,
  /^\s*date\s*$/i,
  /^####DEMAT/i,
  /\barticle\s*\d/i,
  /\bconditions\s*(de|generales)\b/i,
  /\bcapital\s*de\b/i,
  /\bloi\s*n[°o]/i,
  /\bfr\d{2}\s*\d/i,
  /\bdocument\s*cree\b/i,
  /\bfrais\s*de\s*(gestion|facturation)\b/i,
  /\bsuivi\s*par\b/i,
  /\bsuite\s+page\b/i,
  /^\s*S\.?A\.?S\.?\s/i,
  /^\s*SARL\s/i,
  /\bmise\s*en\s*garde/i,
  /\bimperatif\b/i,
  /\bstandar?d\s*\d+%/i,
  /^[\s@;#]+$/,
  /\b(désignation|designation)\s+(ref|quantit|qte|prix)/i,
  /\b(coordonn[ée]es|comptabilit[ée]|agence)\b/i,
  /\baffaire\s*suivie/i,
  /\breference\s*client/i,
  /\bcommande\s+CCL/i,
  /\bextrait\s*du\s*titre/i,
  /\bvoies\s*de\s*recours/i,
  /\bref\.\s*abonnement/i,
  /\bbranchement\s+\d/i,
  /\bconsom\.\s*date/i,
  /\bprix\s*de\s*revient/i,
  /\battribution\s*de\s*juridiction/i,
  /\bnote\s*pour\s*le\s*verre/i,
  /\btol[ée]rances?\s*de\s*fabrication/i,
  /\bweb\s*emaver/i,
  /\bce\s*devis\s*est/i,
  /\bpassage\s*en\s*commande/i,
  /\binformation\s*livr/i,
  /\bdelai\s*standard/i,
  /\bferme\s*ses\s*portes/i,
  /\bnos\s*agences\b/i,
  /\bconforme\s*au\s*devis/i,
];

function isBlacklisted(text: string): boolean {
  return BLACKLIST_LINES.some(p => p.test(text));
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
    /facture\s*(?:n[°o.]?\s*)?[:\s]*([A-Z0-9][\w\-/]{3,20})/i,
    /(?:n[°o.]?\s*(?:de\s*)?facture)\s*[:\s]*([A-Z0-9][\w\-/]{3,20})/i,
    /\bfacture\s+([A-Z]\d{4,})\b/i,
    /\b(T\d{8,})\b/,
    /\b(FA\d{5,})\b/i,
    /\b(FC\d{7,})\b/i,
    /\b(F\d{7,})\b/i,
    /\b(BAS-\d{6})\b/i,
    /pi[eè]ce\s*n\s*[°o]?\s*[:\s]*([A-Z0-9][\w\-]{4,})/i,
    /\b(\d{2}\/\d{3})\b/,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return '';
}

function parseNum(s: string): number {
  const cleaned = s.replace(/\s/g, '').replace(/€/g, '').replace(',', '.').replace(/[†]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function extractNumbers(line: string): { nums: number[]; textPart: string } {
  // Clean line: strip unit markers (TND, PI, P, S, U, M, ML, etc.)
  const cleaned = line
    .replace(/\bTND\b/g, '')
    .replace(/\bPI\b/g, '')
    .replace(/\b€\/m\s*²\b/gi, '')
    .replace(/\b\d+\s*€\/m²\b/gi, '')
    .replace(/€/g, '')
    .replace(/[†│|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = cleaned.split(/\s+/);
  const nums: number[] = [];
  let lastTextIdx = tokens.length;

  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i].replace(/[%,]/g, '').replace(',', '.').trim();
    if (!t || /^[PSUTM]$/.test(t) || t === 'ML' || t === '/T' || t === '/U' || t === '/M') {
      continue;
    }
    const n = parseNum(t);
    if (n !== 0 || t === '0' || t === '0,00' || t === '0.00') {
      nums.unshift(n);
      lastTextIdx = i;
    } else if (nums.length > 0) {
      break;
    }
  }

  const textPart = tokens.slice(0, lastTextIdx).join(' ').trim();
  return { nums, textPart };
}

function parseProEquip(text: string): LigneFactureParsed[] {
  const lignes: LigneFactureParsed[] = [];
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // PRO Equipe format: REF on one line, DESIGNATION on next, numbers on a following line
  // Numbers line: QTE Url QTE Uni [PRIX_BASE] [%] PRIX_NET MONTANT
  const refPattern = /^([A-Z]{2,6}[\s-]?[\w\-./]{3,25})$/;
  const numbersPattern = /(\d+[.,]\d{3})\s+\w+\s+(\d+[.,]\d{3})\s+\w+\s+.*?(\d+[.,]\d{2,3})\s+(\d+[.,]\d{2})\s*/;

  let currentRef = '';
  let currentDesignation = '';
  let state: 'seek_ref' | 'seek_desc' | 'seek_numbers' = 'seek_ref';

  for (const line of lines) {
    if (isBlacklisted(line)) continue;
    if (/^LIVRAISON\s*N/i.test(line) || /^COMMANDE\s*N/i.test(line)) { state = 'seek_ref'; continue; }

    if (state === 'seek_ref') {
      const m = line.match(refPattern);
      if (m && /\d/.test(m[1]) && !/^\d{1,2}[/.\-]\d{1,2}/.test(m[1])) {
        currentRef = m[1].trim();
        currentDesignation = '';
        state = 'seek_desc';
        continue;
      }
    }

    if (state === 'seek_desc') {
      const nm = line.match(numbersPattern);
      if (nm) {
        const qte = parseNum(nm[1]);
        const pu = parseNum(nm[3]);
        const total = parseNum(nm[4]);
        if (qte > 0 && total > 0 && currentDesignation.length > 2) {
          lignes.push({ ref: currentRef, designation: currentDesignation, coloris: '', conditionnement: '', qte, prixUnitaireHT: Math.round(pu * 100) / 100, totalLigneHT: Math.round(total * 100) / 100 });
        }
        state = 'seek_ref';
      } else {
        if (currentDesignation) currentDesignation += ' ';
        currentDesignation += line;
      }
      continue;
    }
  }
  return lignes;
}

function parseKawneer(text: string): LigneFactureParsed[] {
  const lignes: LigneFactureParsed[] = [];
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);

  // Kawneer format: data is duplicated in 2 mirror columns
  // Line 1: NUM NUM  REF COLORIS [SUFFIX]  REF COLORIS [SUFFIX]  QTE QTE  UNIT UNIT  PRIX PRIX  REM REM
  // Line 2: DESIGNATION  LENGTH  TOTAL TOTAL

  // Pattern for article line (ref + qte + prix): "NUM  REF COLORIS  REF COLORIS  QTE QTE  UNIT UNIT  PRIX PRIX  REM REM"
  const refLine = /^\d+\s+\d+\s+(\d{4,10})\s+\w+\s+(?:\w+\s+)?(?:\d{4,10})\s+\w+\s+(?:\w+\s+)?([\d.,]+)\s+[\d.,]+\s+\w+\s+\w+\s+([\d.,]+)\s+[\d.,]+\s+([\d.,]+)\s+[\d.,]+/;
  // Simpler pattern: just find REF QTE UNIT PRIX REM duplicated
  const simpleRef = /(\d{4,10})\s+\d+\s+(?:\w{2,4}\s+)?(?:\d{4,10})\s+\d+\s+(?:\w{2,4}\s+)?([\d.,]+)\s+[\d.,]+\s+(?:BAR|UN)\s+(?:BAR|UN)\s+([\d.,]+)\s+[\d.,]+\s+([\d.,]+)\s+[\d.,]+/;

  let pendingRef = '';
  let pendingQte = 0;
  let pendingPrix = 0;
  let pendingRem = 0;

  for (const line of lines) {
    if (isBlacklisted(line)) continue;
    if (/^_{5,}|^\|Lig|^\|Cde|^CORRESPONDANT|^DEVISE|^FACTURE\s+(N|FACTURE)|^ref\s+(non|en\s+cours)/i.test(line)) continue;

    // Try to match article reference line
    const m1 = line.match(simpleRef);
    if (m1) {
      pendingRef = m1[1];
      pendingQte = parseNum(m1[2]);
      pendingPrix = parseNum(m1[3]);
      pendingRem = parseNum(m1[4]);
      continue;
    }

    // If we have a pending ref, next meaningful line is designation + total
    if (pendingRef && pendingQte > 0) {
      // Extract last number(s) as total — format: "DESIGNATION  LENGTH  TOTAL TOTAL"
      const totalMatch = line.match(/([\d.,]+)\s+([\d.,]+)\s*$/);
      if (totalMatch) {
        const total = parseNum(totalMatch[1]);
        const designation = line.replace(/[\d.,]+\s+[\d.,]+\s*$/, '').trim();
        if (total > 0 && designation.length > 3) {
          const pu = pendingRem > 0 ? pendingPrix * (1 - pendingRem / 100) : pendingPrix;
          lignes.push({
            ref: pendingRef,
            designation,
            coloris: '',
            conditionnement: '',
            qte: pendingQte,
            prixUnitaireHT: Math.round(pu * 100) / 100,
            totalLigneHT: Math.round(total * 100) / 100,
          });
        }
      }
      pendingRef = '';
      pendingQte = 0;
      pendingPrix = 0;
      pendingRem = 0;
    }
  }

  // Deduplicate (mirror columns may produce dupes)
  const seen = new Set<string>();
  return lignes.filter(l => {
    const key = `${l.ref}|${l.qte}|${l.totalLigneHT}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseLignes(text: string, fournisseur: string): LigneFactureParsed[] {
  // Supplier-specific parsers
  if (/kawneer/i.test(fournisseur) || /kawneer/i.test(text)) {
    const specific = parseKawneer(text);
    if (specific.length > 0) return specific;
  }
  if (/pro\s*[ée]quipe?/i.test(fournisseur) || /proequip/i.test(text)) {
    const specific = parseProEquip(text);
    if (specific.length > 0) return specific;
  }

  const lignes: LigneFactureParsed[] = [];
  const lines = text.split('\n').map(l => l.replace(/\s+/g, ' ').trim()).filter(l => l.length > 5);

  for (const rawLine of lines) {
    if (isBlacklisted(rawLine)) continue;
    if (rawLine.length > 300) continue;

    // Boschat Laveix: strip "TND PI" unit markers inline
    const line = rawLine.replace(/\bTND\s*PI\b/g, '').replace(/\s+/g, ' ').trim();

    const { nums, textPart } = extractNumbers(line);

    // Need at least 2 numbers (qte + price) and some text
    if (nums.length < 2 || textPart.length < 3) continue;

    let ref = '';
    let designation = textPart;
    let qte = 0;
    let pu = 0;
    let total = 0;

    // Check if first word looks like a reference (has digits, not a date)
    const firstWord = textPart.split(/\s+/)[0];
    if (/\d/.test(firstWord) && firstWord.length >= 3 && firstWord.length <= 25 && !/^\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}$/.test(firstWord)) {
      ref = firstWord;
      designation = textPart.slice(firstWord.length).trim();
    }

    // Emaver pattern: "QTE TOTAL DESIGNATION" — numbers at start, text at end
    if (nums.length >= 2 && designation.length < 3) {
      const emMatch = line.match(/^(\d+)\s+(\d+[\d.,]*)\s+(.{5,})$/);
      if (emMatch) {
        qte = parseNum(emMatch[1]);
        total = parseNum(emMatch[2]);
        designation = emMatch[3].trim();
        if (qte > 0 && total > 0) pu = total / qte;
      }
    }

    // Standard: last number = total, second-to-last = PU, earlier = QTE
    if (qte === 0) {
      if (nums.length >= 3) {
        total = nums[nums.length - 1];
        pu = nums[nums.length - 2];
        for (let i = 0; i < nums.length - 2; i++) {
          if (nums[i] > 0 && nums[i] <= 99999) { qte = nums[i]; break; }
        }
      } else if (nums.length === 2) {
        qte = nums[0];
        total = nums[1];
        if (qte > 0) pu = total / qte;
      }
    }

    if (qte <= 0 || qte > 99999) continue;
    if (total <= 0 && pu <= 0) continue;
    if (total === 0 && pu > 0) total = qte * pu;
    if (pu === 0 && total > 0 && qte > 0) pu = total / qte;

    if (designation.length < 3) continue;
    if (/^\d+$/.test(designation)) continue;
    if (/^(sous|total|net|base|taux|dont|acompte|solde|frais|montant|port)\b/i.test(designation)) continue;
    if (isBlacklisted(designation)) continue;

    lignes.push({ ref, designation, coloris: '', conditionnement: '', qte, prixUnitaireHT: Math.round(pu * 100) / 100, totalLigneHT: Math.round(total * 100) / 100 });
  }

  // Deduplicate
  const seen = new Set<string>();
  return lignes.filter(l => {
    const key = `${l.ref}|${l.designation}|${l.qte}|${l.totalLigneHT}`;
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

    const items = content.items
      .filter(item => 'str' in item && 'transform' in item)
      .map(item => {
        const ti = item as unknown as { str: string; transform: number[] };
        return { str: ti.str, x: ti.transform[4], y: Math.round(ti.transform[5]) };
      });

    if (items.length === 0) { pages.push({ pageNum: i, text: '' }); continue; }

    items.sort((a, b) => b.y - a.y || a.x - b.x);

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
      lignes: parseLignes(fullText, g.fournisseur),
      texteBrut: fullText,
      pages: g.pages.map(p => p.pageNum),
    };
  });

  return results.filter(r => r.lignes.length > 0 || r.fournisseur !== '');
}
