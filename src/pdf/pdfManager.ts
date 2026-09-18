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

export async function extractPageText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const textContent = await page.getTextContent();
  const textItems = textContent.items as Array<{ str: string }>;
  return textItems.map((item) => item.str).join(' ');
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
