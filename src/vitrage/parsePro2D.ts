import type { GlobalWorkerOptions, getDocument as GetDocumentFn } from 'pdfjs-dist';
import type { Plaque } from './types';

async function loadPdfjs() {
  const pdfjsLib = await import('pdfjs-dist');
  const version = (pdfjsLib as unknown as { version: string }).version;
  const gwo = pdfjsLib as unknown as { GlobalWorkerOptions: typeof GlobalWorkerOptions };
  gwo.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
  return (pdfjsLib as unknown as { getDocument: typeof GetDocumentFn }).getDocument;
}

export async function parsePro2D(file: File): Promise<Plaque[]> {
  const getDocument = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await getDocument({ data: buffer }).promise;

  const allLines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    for (const item of content.items) {
      if ('str' in item) {
        const s = (item as { str: string }).str.trim();
        if (s.length > 0) allLines.push(s);
      }
    }
  }

  const fullText = allLines.join('\n');
  const plaques: Plaque[] = [];
  const feuilleBlocks = fullText.split(/(?=Feuille\s*:)/i);

  for (const block of feuilleBlocks) {
    const hm = block.match(
      /Feuille\s*:\s*(\d+)\s*\(Qt[eé]\.\s*(\d+)\)\s*Mat[eé]riel\s*:\s*(.+?)\s*Dimensions?\s*:\s*(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)/i,
    );
    if (!hm) continue;

    const plaque: Plaque = {
      numero: parseInt(hm[1]),
      qte: parseInt(hm[2]),
      materiau: hm[3].trim(),
      largeur: parseFloat(hm[4].replace(',', '.')),
      hauteur: parseFloat(hm[5].replace(',', '.')),
      pieces: [],
    };

    const afterHeader = block.substring(block.indexOf(hm[0]) + hm[0].length);
    const pieceRx = /(\d+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s*[xX×]\s*(\d+(?:[.,]\d+)?)\s+(\d+)/g;
    let pm;
    while ((pm = pieceRx.exec(afterHeader)) !== null) {
      plaque.pieces.push({
        numero: parseInt(pm[1]),
        reference: pm[2].trim(),
        largeur: parseFloat(pm[3].replace(',', '.')),
        hauteur: parseFloat(pm[4].replace(',', '.')),
        qte: parseInt(pm[5]),
      });
    }

    if (plaque.pieces.length > 0) plaques.push(plaque);
  }

  return plaques;
}
