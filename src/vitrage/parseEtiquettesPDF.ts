import type { GlobalWorkerOptions, getDocument as GetDocumentFn } from 'pdfjs-dist';
import type { Vitrage } from './types';
import { parseVitrageSpec, extractProtoNum } from './parseVitrageSpec';
import { v4 as uuid } from 'uuid';

async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  const version = (pdfjsLib as unknown as { version: string }).version;
  const gwo = pdfjsLib as unknown as { GlobalWorkerOptions: typeof GlobalWorkerOptions };
  gwo.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  return (pdfjsLib as unknown as { getDocument: typeof GetDocumentFn }).getDocument;
}

export async function parseEtiquettesPDF(file: File): Promise<Vitrage[]> {
  const getDocument = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;

  const allText: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item) allText.push((item as { str: string }).str);
    }
  }

  const fullText = allText.join('\n');
  const blocks = fullText.split(/SI-?AL/i).filter(b => b.trim().length > 10);
  const vitrages: Vitrage[] = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);

    let commande = '';
    let proto = '';
    let variante: 'V1' | 'V2' = 'V1';
    let largeur = 0;
    let hauteur = 0;
    let composition = '';
    let couleur = '012 (Noir)';

    for (const line of lines) {
      if (/^O_\d{4}-\d+/.test(line)) commande = line.trim();

      const pm = line.match(/(?:Prototype\s+)?(\d+\s*-\s*P\d+\s+\w+)/i);
      if (pm) proto = pm[1].trim();
      if (!proto && /^[A-Z]{3,}/.test(line) && !/^(Commande|Prototype|couleur)/i.test(line)) {
        const m = line.match(/^([A-Z][A-Z0-9\s]+(?:REP\s+\d+)?)/);
        if (m) proto = m[1].trim();
      }

      if (/^V[12]$/.test(line)) variante = line as 'V1' | 'V2';

      const dm = line.match(/(\d+)\s*[xX×]\s*(\d+)\s*(?:mm)?/);
      if (dm) { largeur = parseInt(dm[1]); hauteur = parseInt(dm[2]); }

      const cm = line.match(/(?:couleur\s+intercalaire\s*:\s*)(.+)/i);
      if (cm) couleur = cm[1].trim();

      if (/\bARG\b/i.test(line) && /\bWE\b/i.test(line)) composition = line.trim();
    }

    if (largeur > 0 && hauteur > 0 && composition) {
      const parsed = parseVitrageSpec(composition);
      vitrages.push({
        id: uuid(),
        commande,
        proto,
        protoNum: extractProtoNum(proto),
        variante,
        largeur,
        hauteur,
        composition,
        intercalaireEpaisseur: parsed.epaisseur,
        intercalaireCouleur: couleur,
        outerGlass: parsed.outer,
        innerGlass: parsed.inner,
      });
    }
  }

  return vitrages;
}
