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

export async function loadPdfDocument(
  data: Uint8Array | ArrayBuffer,
  password?: string
): Promise<pdfjsLib.PDFDocumentProxy> {
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    ...(password ? { password } : {}),
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

export function extractMatchesFromTextItems(
  textItems: import('../types').ExtractedTextItem[],
  query: string,
  pageNumber: number,
  startGlobalIndex = 0
): import('../types').SearchMatch[] {
  const cleanQuery = normalizeDevanagariText(query.trim()).toLowerCase();
  if (!cleanQuery) return [];

  const matches: import('../types').SearchMatch[] = [];
  let globalIndex = startGlobalIndex;
  let matchOnPage = 0;

  // Offscreen canvas for precise proportional font character measurements
  let measureCtx: CanvasRenderingContext2D | null = null;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      measureCtx = canvas.getContext('2d');
    } catch {
      measureCtx = null;
    }
  }

  const itemsToSearch = cleanQuery.includes(' ') ? getLineClusters(textItems) : textItems;

  for (let i = 0; i < itemsToSearch.length; i++) {
    const item = itemsToSearch[i];
    const str = normalizeDevanagariText(item.str || '');
    const lower = str.toLowerCase();
    let searchIdx = 0;

    while ((searchIdx = lower.indexOf(cleanQuery, searchIdx)) !== -1) {
      const matchStart = searchIdx;
      const matchLen = cleanQuery.length;
      const matchEnd = matchStart + matchLen;

      let matchX = item.x;
      let matchWidth = item.width;

      if (measureCtx) {
        try {
          measureCtx.font = `${item.fontSize}px ${item.fontName || 'Helvetica, Arial, sans-serif'}`;
          const preText = str.substring(0, matchStart);
          const matchSub = str.substring(matchStart, matchEnd);
          const preW = measureCtx.measureText(preText).width;
          const matchW = measureCtx.measureText(matchSub).width;
          const fullW = measureCtx.measureText(str).width;
          const ratio = fullW > 0 ? item.width / fullW : 1;
          matchX = item.x + preW * ratio;
          matchWidth = matchW * ratio;
        } catch {
          const charW = item.width / Math.max(str.length, 1);
          matchX = item.x + matchStart * charW;
          matchWidth = matchLen * charW;
        }
      } else {
        const charW = item.width / Math.max(str.length, 1);
        matchX = item.x + matchStart * charW;
        matchWidth = matchLen * charW;
      }

      const startSnippet = Math.max(0, matchStart - 25);
      const endSnippet = Math.min(str.length, matchEnd + 25);
      const snippet = `...${str.substring(startSnippet, endSnippet).trim()}...`;

      matches.push({
        id: `match-p${pageNumber}-${matchOnPage}-${globalIndex}`,
        pageNumber,
        matchIndexOnPage: matchOnPage,
        globalIndex,
        text: str.substring(matchStart, matchEnd),
        x: Math.round(matchX),
        y: Math.round(item.y),
        width: Math.max(Math.round(matchWidth), 8),
        height: Math.max(Math.round(item.height), Math.round(item.fontSize * 1.15)),
        snippet,
      });

      matchOnPage++;
      globalIndex++;
      searchIdx += Math.max(1, matchLen);
    }
  }

  return matches;
}

export async function findPdfSearchMatches(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  query: string,
  rotation = 0
): Promise<import('../types').SearchMatch[]> {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return [];

  const allMatches: import('../types').SearchMatch[] = [];
  let currentGlobalIdx = 0;

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const textItems = await getPageTextItemsWithCoords(pdfDoc, pageNum, 1.0, rotation);
    const pageMatches = extractMatchesFromTextItems(textItems, query, pageNum, currentGlobalIdx);
    allMatches.push(...pageMatches);
    currentGlobalIdx += pageMatches.length;
  }

  return allMatches;
}

export function normalizeDevanagariText(raw: string): string {
  if (!raw) return '';
  let text = raw;

  // 1. Initial Unicode NFC normalization
  try {
    text = text.normalize('NFC');
  } catch {
    // fallback
  }

  // 2. Only swap visual chhoti 'i' matra (\u093F) IF it is orphaned at word start or preceded by non-Devanagari
  // (In proper Unicode, \u093F ALWAYS follows its consonant in memory, e.g. \u0915\u093F = "कि". Never swap when already following a consonant!)
  text = text.replace(
    /(^|[^\u0900-\u097F])\u093F((?:[\u0915-\u0939\u0958-\u095F]\u094D)*[\u0915-\u0939\u0958-\u095F])/g,
    '$1$2\u093F'
  );

  // 3. Anusvara/Chandrabindu placed before orphan \u093F
  text = text.replace(
    /(^|[^\u0900-\u097F])\u093F([\u0901\u0902])((?:[\u0915-\u0939\u0958-\u095F]\u094D)*[\u0915-\u0939\u0958-\u095F])/g,
    '$1$3\u093F$2'
  );

  // 4. Re-associate isolated Nuktas (\u093C) with preceding consonants
  text = text.replace(/([\u0915-\u0939])\s+(\u093C)/g, '$1$2');

  // 5. Final Unicode NFC normalization
  try {
    text = text.normalize('NFC');
  } catch {
    // fallback
  }

  return text;
}

export function clusterPageTextItems(
  rawItems: import('../types').ExtractedTextItem[],
  pageNumber: number
): {
  items: import('../types').ExtractedTextItem[];
  wordClusters: import('../types').TextClusterInfo[];
  lineClusters: import('../types').TextClusterInfo[];
  paragraphClusters: import('../types').TextClusterInfo[];
} {
  if (!rawItems || rawItems.length === 0) {
    return { items: [], wordClusters: [], lineClusters: [], paragraphClusters: [] };
  }

  // Step 1: Sub-tokenize spans that contain internal spaces so each word can be individually addressed
  let measureCtx: CanvasRenderingContext2D | null = null;
  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      measureCtx = canvas.getContext('2d');
    } catch {
      measureCtx = null;
    }
  }

  const tokenizedSpans: import('../types').ExtractedTextItem[] = [];

  for (const item of rawItems) {
    const rawStr = item.str || '';
    if (rawStr.includes(' ') && rawStr.trim().includes(' ')) {
      const tokens = rawStr.split(/(\s+)/);
      let runningCharIdx = 0;
      const fullTextLen = Math.max(rawStr.length, 1);

      if (measureCtx) {
        try {
          measureCtx.font = `${item.fontSize}px 'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif`;
        } catch {
          // ignore
        }
      }

      const totalMeasuredW = measureCtx ? measureCtx.measureText(rawStr).width : item.width;
      const ratio = totalMeasuredW > 0 ? item.width / totalMeasuredW : 1;

      for (let w = 0; w < tokens.length; w++) {
        const token = tokens[w];
        if (!token) continue;

        if (/^\s+$/.test(token)) {
          runningCharIdx += token.length;
          if (tokenizedSpans.length > 0) {
            tokenizedSpans[tokenizedSpans.length - 1].wordBreakAfter = true;
          }
          continue;
        }

        const preStr = rawStr.substring(0, runningCharIdx);
        let tokenX: number;
        let tokenW: number;

        if (measureCtx) {
          const preW = measureCtx.measureText(preStr).width * ratio;
          const tokenMeasuredW = measureCtx.measureText(token).width * ratio;
          tokenX = Math.round(item.x + preW);
          tokenW = Math.max(Math.round(tokenMeasuredW), 4);
        } else {
          tokenX = Math.round(item.x + (runningCharIdx / fullTextLen) * item.width);
          tokenW = Math.max(Math.round((token.length / fullTextLen) * item.width), 4);
        }

        tokenizedSpans.push({
          id: `${item.id}-w${w}`,
          str: token,
          x: tokenX,
          y: item.y,
          width: tokenW,
          height: item.height,
          fontSize: item.fontSize,
          fontName: item.fontName,
          wordBreakBefore: w > 0 || Boolean(item.wordBreakBefore),
          wordBreakAfter: w < tokens.length - 1 || Boolean(item.wordBreakAfter),
        });

        runningCharIdx += token.length;
      }
    } else {
      const cleanStr = rawStr.trim();
      if (cleanStr.length > 0) {
        tokenizedSpans.push({
          ...item,
          str: cleanStr,
          wordBreakBefore: Boolean(item.wordBreakBefore) || /^\s/.test(rawStr),
          wordBreakAfter: Boolean(item.wordBreakAfter) || /\s$/.test(rawStr),
        });
      }
    }
  }

  const validSpans = tokenizedSpans.filter((s) => s.str.length > 0);

  // Step 2: Group spans into Lines sharing approximately the same vertical baseline Y
  const sortedSpans = [...validSpans].sort((a, b) => a.y - b.y || a.x - b.x);

  interface RawLine {
    baseY: number;
    fontSize: number;
    items: import('../types').ExtractedTextItem[];
  }

  const rawLines: RawLine[] = [];

  for (const span of sortedSpans) {
    const yTolerance = Math.max(3.5, span.fontSize * 0.32);
    let targetLine: RawLine | null = null;

    for (const line of rawLines) {
      if (Math.abs(span.y - line.baseY) <= yTolerance) {
        targetLine = line;
        break;
      }
    }

    if (targetLine) {
      targetLine.items.push(span);
      targetLine.baseY =
        (targetLine.baseY * (targetLine.items.length - 1) + span.y) / targetLine.items.length;
    } else {
      rawLines.push({
        baseY: span.y,
        fontSize: span.fontSize,
        items: [span],
      });
    }
  }

  // Step 3: Within each line, cluster adjacent spans into Words and build line data
  interface LineData {
    lineCluster: import('../types').TextClusterInfo;
    words: import('../types').TextClusterInfo[];
    spans: { span: import('../types').ExtractedTextItem; wordCluster: import('../types').TextClusterInfo }[];
  }

  const linesData: LineData[] = [];

  rawLines.forEach((line, lineIdx) => {
    line.items.sort((a, b) => a.x - b.x);

    const wordsInLine: import('../types').ExtractedTextItem[][] = [];
    let currentWord: import('../types').ExtractedTextItem[] = [];

    for (let i = 0; i < line.items.length; i++) {
      const span = line.items[i];
      if (currentWord.length === 0) {
        currentWord.push(span);
        continue;
      }

      const prev = currentWord[currentWord.length - 1];
      const gap = span.x - (prev.x + prev.width);

      // Explicit word breaks take absolute precedence (unless it's a Devanagari combining mark)
      const isDevanagariCombining = /^[\u0900-\u0903\u093A-\u094F\u0951-\u0957\u0962\u0963]/.test(span.str);
      const prevEndsWithHalant = /[\u094D]$/.test(prev.str);
      // Halant only binds a conjunct if there is no explicit space break and distance is sub-pixel (< 1.0px)
      const isMatraOrConjunct =
        isDevanagariCombining ||
        (prevEndsWithHalant && !prev.wordBreakAfter && !span.wordBreakBefore && gap < 1.0);

      const hasExplicitBreak = !isDevanagariCombining && Boolean(prev.wordBreakAfter || span.wordBreakBefore);

      // In typography, inter-word space gap is >= 1.4px (or >= 0.14 * fontSize).
      // Intra-word kerning is tight (<= 1.0px).
      const isSpaceGap = gap >= Math.max(prev.fontSize * 0.14, 1.4);
      const isBackwardsOverlap = gap < -Math.max(prev.fontSize * 0.45, 6);

      const isSameWord = isMatraOrConjunct || (!hasExplicitBreak && !isSpaceGap && !isBackwardsOverlap);

      if (isSameWord) {
        currentWord.push(span);
      } else {
        wordsInLine.push(currentWord);
        currentWord = [span];
      }
    }
    if (currentWord.length > 0) {
      wordsInLine.push(currentWord);
    }

    const lineMinX = Math.min(...line.items.map((i) => i.x));
    const lineMinY = Math.min(...line.items.map((i) => i.y));
    const lineMaxX = Math.max(...line.items.map((i) => i.x + i.width));
    const lineMaxY = Math.max(...line.items.map((i) => i.y + i.height));
    const lineMaxFontSize = Math.max(...line.items.map((i) => i.fontSize));
    const lineFontName = line.items[0]?.fontName || 'Helvetica';

    const wordsStrings = wordsInLine.map((wGroup) =>
      normalizeDevanagariText(wGroup.map((s) => s.str).join(''))
    );
    const lineNormalizedStr = wordsStrings.join(' ');

    const lineCluster: import('../types').TextClusterInfo = {
      id: `line-${pageNumber}-${lineIdx}`,
      str: lineNormalizedStr,
      x: lineMinX,
      y: lineMinY,
      width: Math.max(lineMaxX - lineMinX, 10),
      height: Math.max(lineMaxY - lineMinY, lineMaxFontSize * 1.15),
      fontSize: lineMaxFontSize,
      fontName: lineFontName,
    };

    const words: import('../types').TextClusterInfo[] = [];
    const spans: { span: import('../types').ExtractedTextItem; wordCluster: import('../types').TextClusterInfo }[] = [];

    wordsInLine.forEach((wGroup, wordIdx) => {
      const wordMinX = Math.min(...wGroup.map((i) => i.x));
      const wordMinY = Math.min(...wGroup.map((i) => i.y));
      const wordMaxX = Math.max(...wGroup.map((i) => i.x + i.width));
      const wordMaxY = Math.max(...wGroup.map((i) => i.y + i.height));
      const wordFontSize = Math.max(...wGroup.map((i) => i.fontSize));
      const wordFontName = wGroup[0]?.fontName || lineFontName;

      const combinedRaw = wGroup.map((i) => i.str).join('');
      const normalizedWordStr = normalizeDevanagariText(combinedRaw);

      const wordCluster: import('../types').TextClusterInfo = {
        id: `word-${pageNumber}-${lineIdx}-${wordIdx}`,
        str: normalizedWordStr,
        x: wordMinX,
        y: wordMinY,
        width: Math.max(wordMaxX - wordMinX, 6),
        height: Math.max(wordMaxY - wordMinY, wordFontSize * 1.15),
        fontSize: wordFontSize,
        fontName: wordFontName,
        lineCluster,
      };

      words.push(wordCluster);

      for (const span of wGroup) {
        spans.push({
          span,
          wordCluster,
        });
      }
    });

    linesData.push({
      lineCluster,
      words,
      spans,
    });
  });

  // Step 4: Cluster consecutive lines into Paragraphs based on vertical proximity and alignment
  linesData.sort((a, b) => a.lineCluster.y - b.lineCluster.y || a.lineCluster.x - b.lineCluster.x);

  const rawParagraphs: LineData[][] = [];
  let currentPara: LineData[] = [];

  for (const lineData of linesData) {
    if (currentPara.length === 0) {
      currentPara.push(lineData);
      continue;
    }

    const prevLineData = currentPara[currentPara.length - 1];
    const prevLine = prevLineData.lineCluster;
    const currLine = lineData.lineCluster;

    const gapY = currLine.y - (prevLine.y + prevLine.height);
    const avgFontSize = (prevLine.fontSize + currLine.fontSize) / 2;

    const xOverlap =
      Math.min(prevLine.x + prevLine.width, currLine.x + currLine.width) -
      Math.max(prevLine.x, currLine.x);
    const isHorizontalContinuity =
      xOverlap > 0 || Math.abs(currLine.x - prevLine.x) <= Math.max(avgFontSize * 4, 50);

    const isFontScaleSimilar =
      Math.abs(currLine.fontSize - prevLine.fontSize) <= Math.max(prevLine.fontSize * 0.45, 3.5);

    const isSameParagraph =
      gapY >= -prevLine.height * 0.4 &&
      gapY <= Math.max(avgFontSize * 0.95, 14) &&
      isHorizontalContinuity &&
      isFontScaleSimilar;

    if (isSameParagraph) {
      currentPara.push(lineData);
    } else {
      rawParagraphs.push(currentPara);
      currentPara = [lineData];
    }
  }

  if (currentPara.length > 0) {
    rawParagraphs.push(currentPara);
  }

  // Step 5: Finalize paragraph clusters and bind relations
  const finalItems: import('../types').ExtractedTextItem[] = [];
  const wordClusters: import('../types').TextClusterInfo[] = [];
  const lineClusters: import('../types').TextClusterInfo[] = [];
  const paragraphClusters: import('../types').TextClusterInfo[] = [];

  rawParagraphs.forEach((paraLines, paraIdx) => {
    const paraMinX = Math.min(...paraLines.map((l) => l.lineCluster.x));
    const paraMinY = Math.min(...paraLines.map((l) => l.lineCluster.y));
    const paraMaxX = Math.max(...paraLines.map((l) => l.lineCluster.x + l.lineCluster.width));
    const paraMaxY = Math.max(...paraLines.map((l) => l.lineCluster.y + l.lineCluster.height));
    const paraMaxFontSize = Math.max(...paraLines.map((l) => l.lineCluster.fontSize));
    const paraFontName = paraLines[0]?.lineCluster.fontName || 'Helvetica';

    const paraNormalizedStr = paraLines.map((l) => l.lineCluster.str).join('\n');

    const paragraphCluster: import('../types').TextClusterInfo = {
      id: `para-${pageNumber}-${paraIdx}`,
      str: paraNormalizedStr,
      x: paraMinX,
      y: paraMinY,
      width: Math.max(paraMaxX - paraMinX, 10),
      height: Math.max(paraMaxY - paraMinY, paraMaxFontSize * 1.2),
      fontSize: paraMaxFontSize,
      fontName: paraFontName,
    };

    paragraphClusters.push(paragraphCluster);

    for (const lData of paraLines) {
      lData.lineCluster.paragraphCluster = paragraphCluster;
      lineClusters.push(lData.lineCluster);

      for (const w of lData.words) {
        w.paragraphCluster = paragraphCluster;
        wordClusters.push(w);
      }

      for (const s of lData.spans) {
        finalItems.push({
          ...s.span,
          wordCluster: s.wordCluster,
          lineCluster: lData.lineCluster,
          paragraphCluster,
        });
      }
    }
  });

  return {
    items: finalItems,
    wordClusters,
    lineClusters,
    paragraphClusters,
  };
}

export function getWordClusters(
  items: import('../types').ExtractedTextItem[]
): import('../types').TextClusterInfo[] {
  const seen = new Set<string>();
  const list: import('../types').TextClusterInfo[] = [];
  for (const item of items) {
    if (item.wordCluster && !seen.has(item.wordCluster.id)) {
      seen.add(item.wordCluster.id);
      list.push(item.wordCluster);
    }
  }
  return list;
}

export function getLineClusters(
  items: import('../types').ExtractedTextItem[]
): import('../types').TextClusterInfo[] {
  const seen = new Set<string>();
  const list: import('../types').TextClusterInfo[] = [];
  for (const item of items) {
    if (item.lineCluster && !seen.has(item.lineCluster.id)) {
      seen.add(item.lineCluster.id);
      list.push(item.lineCluster);
    }
  }
  return list;
}

export function getParagraphClusters(
  items: import('../types').ExtractedTextItem[]
): import('../types').TextClusterInfo[] {
  const seen = new Set<string>();
  const list: import('../types').TextClusterInfo[] = [];
  for (const item of items) {
    if (item.paragraphCluster && !seen.has(item.paragraphCluster.id)) {
      seen.add(item.paragraphCluster.id);
      list.push(item.paragraphCluster);
    }
  }
  return list;
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
  const rawResults: import('../types').ExtractedTextItem[] = [];

  for (let i = 0; i < textContent.items.length; i++) {
    const item = textContent.items[i] as any;
    if (!item.str || !item.str.trim()) {
      if (item.str && /\s/.test(item.str) && rawResults.length > 0) {
        rawResults[rawResults.length - 1].wordBreakAfter = true;
      }
      continue;
    }

    const tx = item.transform;
    const pdfX = tx[4];
    const pdfY = tx[5];
    const fontSize = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]) || 12;

    const viewPoint = viewport.convertToViewportPoint(pdfX, pdfY);
    const screenX = Math.round(viewPoint[0]);
    const screenY = Math.round(viewPoint[1] - fontSize * 0.9);
    const itemWidth = item.width > 0 ? item.width : Math.max(item.str.length * (fontSize * 0.3), 4);
    const itemHeight = Math.max(item.height, fontSize * 1.15);

    const hasLeadingSpace = /^\s/.test(item.str);
    const hasTrailingSpace = /\s$/.test(item.str) || Boolean(item.hasEOL);

    rawResults.push({
      id: `text-${pageNumber}-${i}`,
      str: item.str,
      x: screenX,
      y: screenY,
      width: itemWidth,
      height: itemHeight,
      fontSize,
      fontName: item.fontName || 'Helvetica',
      wordBreakBefore: hasLeadingSpace,
      wordBreakAfter: hasTrailingSpace,
    });
  }

  const clustered = clusterPageTextItems(rawResults, pageNumber);
  return clustered.items;
}
