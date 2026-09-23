import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

let cachedSampleBytes: Uint8Array | null = null;

/**
 * Generates an offline, clean, professional sample PDF document
 * with multiple pages, text blocks, and a signature line.
 * Cached in memory so subsequent calls are instant.
 */
export async function getSamplePdfBytes(): Promise<Uint8Array> {
  if (cachedSampleBytes) {
    return cachedSampleBytes;
  }

  const doc = await PDFDocument.create();
  const helvetica = await doc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
  const helveticaOblique = await doc.embedFont(StandardFonts.HelveticaOblique);

  // --- PAGE 1 ---
  const page1 = doc.addPage([595.28, 841.89]); // A4
  const { width: p1W, height: p1H } = page1.getSize();

  // Top header bar
  page1.drawRectangle({
    x: 40,
    y: p1H - 60,
    width: p1W - 80,
    height: 2,
    color: rgb(0.83, 0.69, 0.22), // Gold
  });

  page1.drawText('UIKEY AI DOCUFORGE • SAMPLE DOCUMENT', {
    x: 40,
    y: p1H - 50,
    size: 9,
    font: helveticaBold,
    color: rgb(0.83, 0.69, 0.22),
  });

  page1.drawText('PRIVATE CLIENT-SIDE DEMO', {
    x: p1W - 175,
    y: p1H - 50,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Document Title
  page1.drawText('Service Agreement & Document Review', {
    x: 40,
    y: p1H - 100,
    size: 20,
    font: helveticaBold,
    color: rgb(0.08, 0.08, 0.12),
  });

  page1.drawText('Document ID: UF-2026-DEMO • Date: September 2026 • Status: Draft Review', {
    x: 40,
    y: p1H - 120,
    size: 10,
    font: helveticaOblique,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Callout Box
  page1.drawRectangle({
    x: 40,
    y: p1H - 195,
    width: p1W - 80,
    height: 55,
    color: rgb(0.97, 0.96, 0.91),
    borderColor: rgb(0.83, 0.69, 0.22),
    borderWidth: 1,
  });

  page1.drawText('TRY EDITING THIS DOCUMENT:', {
    x: 55,
    y: p1H - 160,
    size: 10,
    font: helveticaBold,
    color: rgb(0.55, 0.44, 0.1),
  });

  page1.drawText(
    '1. Use "Add Text" or "Direct Edit" to modify wording. 2. Use "Highlight" to mark keywords.',
    { x: 55, y: p1H - 175, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) }
  );
  page1.drawText(
    '3. Draw an e-signature in the box below. 4. Click "Save & Download" to export your finalized PDF.',
    { x: 55, y: p1H - 188, size: 9, font: helvetica, color: rgb(0.2, 0.2, 0.2) }
  );

  // Section 1
  page1.drawText('1. Scope of Digital Privacy', {
    x: 40,
    y: p1H - 225,
    size: 13,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.15),
  });

  const p1Text = [
    'This sample document demonstrates the high-performance local processing capabilities of DocuForge.',
    'All text insertion, shapes, drawings, and signatures are rendered on an in-memory HTML5 Canvas and baked',
    'directly into the PDF byte stream using WebAssembly and client-side JavaScript. None of your data',
    'or annotations are ever transmitted to any remote server or cloud infrastructure.',
  ];

  let currentY = p1H - 245;
  for (const line of p1Text) {
    page1.drawText(line, {
      x: 40,
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.25, 0.25, 0.25),
      lineHeight: 14,
    });
    currentY -= 15;
  }

  // Section 2
  currentY -= 15;
  page1.drawText('2. Terms and Sign-Off Requirement', {
    x: 40,
    y: currentY,
    size: 13,
    font: helveticaBold,
    color: rgb(0.1, 0.1, 0.15),
  });

  currentY -= 20;
  const p2Text = [
    'The recipient may review, annotate, and append comments or approval stamps to this document.',
    'Once reviewed, please place your authorized digital signature in the designated signing quadrant below.',
  ];

  for (const line of p2Text) {
    page1.drawText(line, {
      x: 40,
      y: currentY,
      size: 10,
      font: helvetica,
      color: rgb(0.25, 0.25, 0.25),
      lineHeight: 14,
    });
    currentY -= 15;
  }

  // Signature Quadrant
  currentY -= 40;
  page1.drawRectangle({
    x: 40,
    y: currentY - 80,
    width: 250,
    height: 80,
    borderColor: rgb(0.7, 0.7, 0.75),
    borderWidth: 1,
    borderDashArray: [4, 4],
    color: rgb(0.99, 0.99, 1.0),
  });

  page1.drawText('Place Authorized Signature Here', {
    x: 55,
    y: currentY - 70,
    size: 9,
    font: helveticaOblique,
    color: rgb(0.55, 0.55, 0.6),
  });

  page1.drawText('Signature of Authorized Representative', {
    x: 40,
    y: currentY - 95,
    size: 9,
    font: helveticaBold,
    color: rgb(0.3, 0.3, 0.3),
  });

  page1.drawText('Date: ________________________', {
    x: 40,
    y: currentY - 110,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  // Footer
  page1.drawText('Page 1 of 2 • DocuForge Private PDF Suite', {
    x: 40,
    y: 35,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  // --- PAGE 2 ---
  const page2 = doc.addPage([595.28, 841.89]);
  const { width: p2W, height: p2H } = page2.getSize();

  page2.drawRectangle({
    x: 40,
    y: p2H - 60,
    width: p2W - 80,
    height: 2,
    color: rgb(0.83, 0.69, 0.22),
  });

  page2.drawText('EXHIBIT A — TECHNICAL SPECIFICATIONS & NOTES', {
    x: 40,
    y: p2H - 50,
    size: 9,
    font: helveticaBold,
    color: rgb(0.83, 0.69, 0.22),
  });

  page2.drawText('Page 2 of 2', {
    x: p2W - 85,
    y: p2H - 50,
    size: 9,
    font: helvetica,
    color: rgb(0.4, 0.4, 0.4),
  });

  page2.drawText('System Specifications & Annotation Verification', {
    x: 40,
    y: p2H - 100,
    size: 16,
    font: helveticaBold,
    color: rgb(0.08, 0.08, 0.12),
  });

  const p3Text = [
    '• Search Verification: Try pressing Ctrl+F and typing "Specifications" or "DocuForge" to find matches.',
    '• Thumbnail Navigation: Open the left sidebar to quickly switch between Page 1 and Page 2.',
    '• Shapes & Arrows: Test adding a rectangle around this bullet point or drawing an arrow towards it.',
    '• Offline Verification: You can disconnect from Wi-Fi and all editing functions continue working locally.',
  ];

  let p2Y = p2H - 130;
  for (const line of p3Text) {
    page2.drawText(line, {
      x: 40,
      y: p2Y,
      size: 10,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.25),
    });
    p2Y -= 22;
  }

  page2.drawText('Page 2 of 2 • DocuForge Private PDF Suite', {
    x: 40,
    y: 35,
    size: 8,
    font: helvetica,
    color: rgb(0.6, 0.6, 0.6),
  });

  const bytes = await doc.save();
  cachedSampleBytes = bytes;
  return bytes;
}
