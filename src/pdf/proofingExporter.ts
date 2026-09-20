import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { copyDocumentMetadata } from './pdfModifier';

export interface ProofingPageSelection {
  originalIndex: number; // 0-based page index
  rating: number; // 0 (unrated) to 5
  rejected: boolean;
}

export interface ProofingExportOptions {
  sortStarWise: boolean; // 5 stars first, then 4, 3, etc.
  exportOnlySelected: boolean; // Exclude 0-star and rejected
  stampStarBadge: boolean; // Clean star stamp on page corner
}

/**
 * STRICT LOSSLESS PDF EXPORT
 * Uses pdf-lib's native `copyPages` to copy raw PDF content streams and embedded high-res images
 * without decoding, recompressing, or downscaling. 100% of original print DPI is preserved.
 */
export async function exportProofedPdf(
  sourceBytes: Uint8Array,
  selections: ProofingPageSelection[],
  options: ProofingExportOptions,
  onProgress?: (progress: number, status: string) => void
): Promise<Uint8Array> {
  onProgress?.(10, 'Loading source document...');
  const sourceDoc = await PDFDocument.load(sourceBytes, { ignoreEncryption: true });
  const totalPages = sourceDoc.getPageCount();

  onProgress?.(25, 'Filtering and sorting pages...');

  // 1. Filter pages based on options
  let targetPages = [...selections];

  if (options.exportOnlySelected) {
    targetPages = targetPages.filter((p) => p.rating > 0 && !p.rejected);
  } else {
    // Drop explicitly rejected pages
    targetPages = targetPages.filter((p) => !p.rejected);
  }

  // 2. Sort if requested: 5-star -> 4-star -> 3-star -> 2-star -> 1-star -> 0-star
  if (options.sortStarWise) {
    targetPages.sort((a, b) => {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return a.originalIndex - b.originalIndex;
    });
  }

  if (targetPages.length === 0) {
    throw new Error('No pages matched your export criteria. Please select at least one page.');
  }

  // Sanity check indices
  targetPages = targetPages.filter((p) => p.originalIndex >= 0 && p.originalIndex < totalPages);

  onProgress?.(45, 'Creating lossless PDF container...');
  const newDoc = await PDFDocument.create();
  copyDocumentMetadata(sourceDoc, newDoc);

  onProgress?.(60, `Copying ${targetPages.length} high-resolution pages without compression...`);
  const pageIndicesToCopy = targetPages.map((p) => p.originalIndex);
  const copiedPages = await newDoc.copyPages(sourceDoc, pageIndicesToCopy);

  let font: any = null;
  if (options.stampStarBadge) {
    try {
      font = await newDoc.embedFont(StandardFonts.HelveticaBold);
    } catch {
      font = null;
    }
  }

  onProgress?.(75, 'Finalizing pages...');
  for (let idx = 0; idx < copiedPages.length; idx++) {
    const page = copiedPages[idx];
    const pageInfo = targetPages[idx];

    // Optional stamp: subtle and sleek corner badge with rating
    if (options.stampStarBadge && font && pageInfo.rating > 0) {
      const { width, height } = page.getSize();
      const badgeText = `${pageInfo.rating} STAR PHOTO`;
      const fontSize = 11;
      const textW = font.widthOfTextAtSize(badgeText, fontSize);
      const badgeW = textW + 18;
      const badgeH = 24;
      const margin = 16;
      const badgeX = width - badgeW - margin;
      const badgeY = height - badgeH - margin;

      // Draw dark semi-translucent rounded pill with gold border
      page.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: badgeW,
        height: badgeH,
        color: rgb(0.06, 0.06, 0.08),
        opacity: 0.88,
        borderColor: rgb(0.96, 0.77, 0.26), // brand gold
        borderWidth: 1.2,
      });

      page.drawText(badgeText, {
        x: badgeX + 9,
        y: badgeY + 7,
        size: fontSize,
        font,
        color: rgb(0.96, 0.77, 0.26),
      });
    }

    newDoc.addPage(page);
  }

  onProgress?.(90, 'Generating binary output stream...');
  const resultBytes = await newDoc.save({ useObjectStreams: true });
  onProgress?.(100, 'Complete!');

  return resultBytes;
}
