/**
 * Parser FSTLINE XML — extrait barres, pièces, profilés, usinages
 * Format: UTF-16 XML exporté par FSTLINE (Rehau Aralya, Kawneer, etc.)
 */

export interface FstMachining {
  wcode: string;
  offset: number;
}

export interface FstCut {
  bcod: string;
  il: number;
  ol: number;
  angleLeft: number;
  angleRight: number;
  ref: string;
  orderCode: string;
  chantier: string;
  dimensions: string;
  description: string;
  cid: string;
  labels: string[];
  machinings: FstMachining[];
  statut: 'a_couper' | 'coupe' | 'nc' | 'casse';
  coupePar: string;
  dateCoupe: string | null;
}

export interface FstBar {
  id: string;
  brand: string;
  system: string;
  code: string;
  description: string;
  length: number;
  position: number;
  width: number;
  height: number;
  innerColor: string;
  outerColor: string;
  cuts: FstCut[];
  used: number;
  waste: number;
}

export interface FstProfile {
  code: string;
  description: string;
  barCount: number;
  innerColor: string;
  outerColor: string;
}

export interface FstJob {
  jobNumber: string;
  chantier: string;
  orderCode: string;
  profiles: FstProfile[];
  bars: FstBar[];
  totalBars: number;
  totalCuts: number;
  totalProfiles: number;
}

function textOf(el: Element | null, tag: string): string {
  const child = el?.getElementsByTagName(tag)[0];
  return child?.textContent?.trim() ?? '';
}

function numOf(el: Element | null, tag: string): number {
  return parseFloat(textOf(el, tag)) || 0;
}

let idCounter = 0;
function nextId(): string {
  return `fst_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;
}

export function parseFstlineXML(content: string): FstJob {
  idCounter = 0;

  let xml = content;
  if (xml.charCodeAt(0) === 0xFEFF) xml = xml.slice(1);
  if (xml.includes('encoding="UTF-16"')) {
    xml = xml.replace('encoding="UTF-16"', 'encoding="UTF-8"');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const root = doc.documentElement;

  const jobNumber = textOf(root.querySelector('JINF'), 'NUM');

  const profiles: FstProfile[] = [];
  for (const pdat of root.querySelectorAll('HEAD > PDAT')) {
    profiles.push({
      code: textOf(pdat, 'CODE'),
      description: textOf(pdat, 'DESC'),
      barCount: numOf(pdat, 'BQTY'),
      innerColor: textOf(pdat, 'DICL'),
      outerColor: textOf(pdat, 'DOCL'),
    });
  }

  let chantier = '';
  let orderCode = '';

  const bars: FstBar[] = [];
  for (const barEl of root.querySelectorAll('BODY > BAR')) {
    const code = textOf(barEl, 'CODE');
    const barLength = numOf(barEl, 'LEN');

    const cuts: FstCut[] = [];
    for (const cutEl of barEl.querySelectorAll(':scope > CUT')) {
      const labels: string[] = [];
      for (const lbl of cutEl.querySelectorAll('LBL')) {
        labels.push(lbl.textContent?.trim() ?? '');
      }

      const machinings: FstMachining[] = [];
      for (const m of cutEl.querySelectorAll('MACHINING')) {
        machinings.push({
          wcode: m.getAttribute('WCODE') ?? '',
          offset: parseFloat(m.getAttribute('OFFSET') ?? '0'),
        });
      }

      const cutChantier = labels[2] || '';
      const cutOrder = textOf(cutEl, 'ORCD');
      if (!chantier && cutChantier) chantier = cutChantier;
      if (!orderCode && cutOrder) orderCode = cutOrder;

      cuts.push({
        bcod: textOf(cutEl, 'BCOD'),
        il: numOf(cutEl, 'IL'),
        ol: numOf(cutEl, 'OL'),
        angleLeft: numOf(cutEl, 'ANGL'),
        angleRight: numOf(cutEl, 'ANGR'),
        ref: textOf(cutEl, 'TINA'),
        orderCode: cutOrder,
        chantier: cutChantier,
        dimensions: labels[3] || '',
        description: textOf(cutEl, 'DESC'),
        cid: textOf(cutEl, 'CID'),
        labels,
        machinings,
        statut: 'a_couper',
        coupePar: '',
        dateCoupe: null,
      });
    }

    const used = cuts.reduce((s, c) => s + c.ol, 0);

    bars.push({
      id: nextId(),
      brand: textOf(barEl, 'BRAN'),
      system: textOf(barEl, 'SYST'),
      code,
      description: textOf(barEl, 'DESC'),
      length: barLength,
      position: numOf(barEl, 'POS'),
      width: numOf(barEl, 'W'),
      height: numOf(barEl, 'H'),
      innerColor: textOf(barEl, 'DICL'),
      outerColor: textOf(barEl, 'DOCL'),
      cuts,
      used,
      waste: barLength - used,
    });
  }

  return {
    jobNumber,
    chantier,
    orderCode,
    profiles,
    bars,
    totalBars: bars.length,
    totalCuts: bars.reduce((s, b) => s + b.cuts.length, 0),
    totalProfiles: profiles.length,
  };
}

export async function parseFstlineFile(file: File): Promise<FstJob> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let text: string;
  if (bytes[0] === 0xFF && bytes[1] === 0xFE) {
    const decoder = new TextDecoder('utf-16le');
    text = decoder.decode(buffer);
  } else if (bytes[0] === 0xFE && bytes[1] === 0xFF) {
    const decoder = new TextDecoder('utf-16be');
    text = decoder.decode(buffer);
  } else {
    text = new TextDecoder('utf-8').decode(buffer);
  }

  return parseFstlineXML(text);
}
