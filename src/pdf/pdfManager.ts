import * as pdfjsLib from 'pdfjs-dist';

// Configure worker using CDN fallback or standard bundle
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
}

export interface RenderPageResult {
  width: number;
  height: number;
  viewport: any;
}

export async function loadPdfDocument(data: Uint8Array | ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
  });

  return await loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale = 1.0,
  rotation = 0
): Promise<RenderPageResult> {
  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale, rotation: totalRotation });

  // Handle device pixel ratio for sharp rendering
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * dpr);
  canvas.height = Math.floor(viewport.height * dpr);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain 2D canvas context.');

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const renderContext = {
    canvasContext: ctx,
    viewport: viewport,
  };

  await page.render(renderContext).promise;

  return {
    width: viewport.width,
    height: viewport.height,
    viewport,
  };
}

export async function getPageThumbnail(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  maxWidth = 160
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const unscaledViewport = page.getViewport({ scale: 1.0 });
  const scale = maxWidth / unscaledViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  await page.render({
    canvasContext: ctx,
    viewport,
  }).promise;

  return canvas.toDataURL('image/jpeg', 0.8);
}

// Ligature and character encoding normalizer
export function normalizeLigatures(str: string): string {
  return str
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-');
}

export async function extractPageText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const items = textContent.items as Array<{
    str: string;
    transform: number[];
    width: number;
    height: number;
    hasEOL?: boolean;
  }>;

  if (!items || items.length === 0) return '';

  interface LineItem {
    str: string;
    x: number;
    y: number;
    fontSize: number;
    hasEOL: boolean;
  }

  const lineGroups: LineItem[][] = [];
  let currentGroup: LineItem[] = [];
  let lastY = -Infinity;

  for (const item of items) {
    if (!item.str && !item.hasEOL) continue;

    const tx = item.transform;
    const x = tx[4];
    const y = tx[5];
    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;
    const cleanStr = normalizeLigatures(item.str || '');

    if (Math.abs(y - lastY) > Math.max(4, fontSize * 0.4)) {
      if (currentGroup.length > 0) {
        lineGroups.push(currentGroup);
      }
      currentGroup = [];
      lastY = y;
    }

    currentGroup.push({
      str: cleanStr,
      x,
      y,
      fontSize,
      hasEOL: Boolean(item.hasEOL),
    });
  }

  if (currentGroup.length > 0) {
    lineGroups.push(currentGroup);
  }

  // Sort groups top to bottom (higher Y in PDF = higher on page)
  lineGroups.sort((a, b) => b[0].y - a[0].y);

  // Within each line group, sort left to right
  for (const group of lineGroups) {
    group.sort((a, b) => a.x - b.x);
  }

  const outputLines: string[] = [];
  let prevLineY: number | null = null;
  let prevFontSize = 12;

  for (const group of lineGroups) {
    const lineY = group[0].y;
    const lineFontSize = group[0].fontSize;

    if (prevLineY !== null) {
      const gap = Math.abs(prevLineY - lineY);
      if (gap > prevFontSize * 1.5) {
        outputLines.push('');
      }
    }

    const lineText = group.map((item) => item.str).join(' ').replace(/\s{2,}/g, ' ').trim();
    if (lineText) {
      outputLines.push(lineText);
    }

    prevLineY = lineY;
    prevFontSize = lineFontSize;
  }

  return outputLines.join('\n');
}

export async function extractAllText(
  pdfDoc: pdfjsLib.PDFDocumentProxy
): Promise<{ fullText: string; pages: { pageNumber: number; text: string }[] }> {
  const pages: { pageNumber: number; text: string }[] = [];
  let fullText = '';

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageText = await extractPageText(pdfDoc, i);
    pages.push({ pageNumber: i, text: pageText });
    fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
  }

  return { fullText, pages };
}

export async function searchPdf(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  query: string
): Promise<{ pageNumber: number; count: number; snippets: string[] }[]> {
  if (!query.trim()) return [];
  const cleanQuery = query.toLowerCase();
  const results: { pageNumber: number; count: number; snippets: string[] }[] = [];

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const pageText = await extractPageText(pdfDoc, i);
    const lower = pageText.toLowerCase();
    let index = 0;
    let count = 0;
    const snippets: string[] = [];

    while ((index = lower.indexOf(cleanQuery, index)) !== -1) {
      count++;
      const start = Math.max(0, index - 30);
      const end = Math.min(pageText.length, index + cleanQuery.length + 30);
      snippets.push(`...${pageText.substring(start, end).replace(/\s+/g, ' ')}...`);
      index += cleanQuery.length;
    }

    if (count > 0) {
      results.push({ pageNumber: i, count, snippets });
    }
  }

  return results;
}

export async function getPageTextItemsWithCoords(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  scale = 1.0,
  rotation = 0
): Promise<import('../types').ExtractedTextItem[]> {
  const page = await pdfDoc.getPage(pageNumber);
  const totalRotation = (page.rotate + rotation) % 360;
  const viewport = page.getViewport({ scale: 1.0, rotation: totalRotation });
  const textContent = await page.getTextContent();
  const results: import('../types').ExtractedTextItem[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i] as any;
    if (!item.str || !item.str.trim()) continue;

    const tx = item.transform;
    const pdfX = tx[4];
    const pdfY = tx[5];
    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;

    const viewPoint = viewport.convertToViewportPoint(pdfX, pdfY);
    const screenX = Math.round(viewPoint[0]);
    const screenY = Math.round(viewPoint[1] - fontSize * 0.9);
    const itemWidth = Math.max(item.width, item.str.length * (fontSize * 0.5));
    const itemHeight = Math.max(item.height, fontSize * 1.15);

    results.push({
      id: `text-${pageNumber}-${i}`,
      str: item.str,
      x: screenX,
      y: screenY,
      width: itemWidth,
      height: itemHeight,
      fontSize,
      fontName: item.fontName || 'Helvetica',
    });
  }

  return results;
}
