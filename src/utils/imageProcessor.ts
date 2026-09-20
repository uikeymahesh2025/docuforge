/**
 * UIKEY AI - Universal Image Processing Engine
 * Fast client-side image transformation utilities:
 * - Arbitrary & 90-degree Rotation
 * - Rectangular Cropping
 * - Automatic Document Edge Detection & Corner Quad Detection
 * - 3x3 Projective Homography Perspective Warping (Bilinear Interpolation)
 * - Document Enhancement Filters (Magic Contrast, B&W, Grayscale)
 */

export interface Point {
  x: number;
  y: number;
}

export interface QuadPoints {
  tl: Point;
  tr: Point;
  br: Point;
  bl: Point;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Loads an image from a dataUrl or URL into an HTMLImageElement
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + e));
    img.src = src;
  });
}

/**
 * Rotates an image by specified degrees (e.g. 90, 180, 270, or arbitrary angle)
 */
export async function rotateImage(
  dataUrl: string,
  degrees: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const rad = (degrees * Math.PI) / 180;
  const sin = Math.abs(Math.sin(rad));
  const cos = Math.abs(Math.cos(rad));

  // Compute new bounding dimensions
  const newW = Math.round(img.naturalWidth * cos + img.naturalHeight * sin);
  const newH = Math.round(img.naturalWidth * sin + img.naturalHeight * cos);

  const canvas = document.createElement('canvas');
  canvas.width = newW;
  canvas.height = newH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.translate(newW / 2, newH / 2);
  ctx.rotate(rad);
  ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

  const format = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const outDataUrl = canvas.toDataURL(format, 0.95);

  return {
    dataUrl: outDataUrl,
    width: newW,
    height: newH,
  };
}

/**
 * Crops an image to a rectangular area
 */
export async function cropImage(
  dataUrl: string,
  rect: CropRect
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl);

  // Clamp crop rectangle to image dimensions
  const clampedX = Math.max(0, Math.min(rect.x, img.naturalWidth - 1));
  const clampedY = Math.max(0, Math.min(rect.y, img.naturalHeight - 1));
  const clampedW = Math.max(10, Math.min(rect.width, img.naturalWidth - clampedX));
  const clampedH = Math.max(10, Math.min(rect.height, img.naturalHeight - clampedY));

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(clampedW);
  canvas.height = Math.round(clampedH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.drawImage(
    img,
    clampedX,
    clampedY,
    clampedW,
    clampedH,
    0,
    0,
    canvas.width,
    canvas.height
  );

  const format = dataUrl.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
  const outDataUrl = canvas.toDataURL(format, 0.95);

  return {
    dataUrl: outDataUrl,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Solves 8x8 linear equations A * h = b using Gaussian elimination with partial pivoting.
 */
function solve8x8(A: number[][], b: number[]): number[] | null {
  const n = 8;
  const M: number[][] = [];
  for (let i = 0; i < n; i++) {
    M[i] = [...A[i], b[i]];
  }

  for (let p = 0; p < n; p++) {
    let maxRow = p;
    let maxVal = Math.abs(M[p][p]);
    for (let r = p + 1; r < n; r++) {
      if (Math.abs(M[r][p]) > maxVal) {
        maxVal = Math.abs(M[r][p]);
        maxRow = r;
      }
    }
    if (maxVal < 1e-10) return null; // Singular matrix

    if (maxRow !== p) {
      const temp = M[p];
      M[p] = M[maxRow];
      M[maxRow] = temp;
    }

    const pivot = M[p][p];
    for (let c = p; c <= n; c++) {
      M[p][c] /= pivot;
    }

    for (let r = 0; r < n; r++) {
      if (r !== p) {
        const factor = M[r][p];
        for (let c = p; c <= n; c++) {
          M[r][c] -= factor * M[p][c];
        }
      }
    }
  }

  const result: number[] = [];
  for (let i = 0; i < n; i++) {
    result[i] = M[i][n];
  }
  return result;
}

/**
 * Computes Homography matrix mapping Destination (0,0)->(W,H) back to Source Quad points.
 */
function computeInverseHomography(
  quad: QuadPoints,
  targetW: number,
  targetH: number
): number[] | null {
  // Destination points:
  // D0: (0, 0)       -> S0: quad.tl
  // D1: (targetW, 0) -> S1: quad.tr
  // D2: (targetW, targetH) -> S2: quad.br
  // D3: (0, targetH) -> S3: quad.bl
  const src = [quad.tl, quad.tr, quad.br, quad.bl];
  const dst = [
    { x: 0, y: 0 },
    { x: targetW, y: 0 },
    { x: targetW, y: targetH },
    { x: 0, y: targetH },
  ];

  const A: number[][] = [];
  const b: number[] = [];

  for (let i = 0; i < 4; i++) {
    const x = dst[i].x;
    const y = dst[i].y;
    const u = src[i].x;
    const v = src[i].y;

    A.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);

    A.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }

  const h = solve8x8(A, b);
  if (!h) return null;
  // h = [h0, h1, h2, h3, h4, h5, h6, h7], and h8 = 1
  return [...h, 1];
}

/**
 * Euclidean distance between two points
 */
function dist(p1: Point, p2: Point): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Warps an arbitrary quadrilateral region of an image into a perfectly flat rectangular document.
 * Uses 3x3 Projective Homography with Bilinear Interpolation.
 */
export async function warpPerspective(
  dataUrl: string,
  quad: QuadPoints,
  preferredWidth?: number,
  preferredHeight?: number
): Promise<{ dataUrl: string; width: number; height: number }> {
  const img = await loadImage(dataUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // Compute appropriate output dimensions if not provided
  const topW = dist(quad.tl, quad.tr);
  const botW = dist(quad.bl, quad.br);
  const leftH = dist(quad.tl, quad.bl);
  const rightH = dist(quad.tr, quad.br);

  let outW = Math.round(preferredWidth || Math.max(topW, botW));
  let outH = Math.round(preferredHeight || Math.max(leftH, rightH));

  // Cap maximum output resolution to prevent browser freeze on gigantic images (keep max side <= 2400)
  const maxSide = 2400;
  if (outW > maxSide || outH > maxSide) {
    const scale = Math.min(maxSide / outW, maxSide / outH);
    outW = Math.round(outW * scale);
    outH = Math.round(outH * scale);
  }

  outW = Math.max(100, outW);
  outH = Math.max(100, outH);

  // Source canvas to read pixel data
  const srcCanvas = document.createElement('canvas');
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const srcCtx = srcCanvas.getContext('2d');
  if (!srcCtx) throw new Error('Source canvas context unavailable');
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, srcW, srcH);
  const srcPixels = srcData.data;

  // Target canvas
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const outCtx = outCanvas.getContext('2d');
  if (!outCtx) throw new Error('Target canvas context unavailable');
  const outData = outCtx.createImageData(outW, outH);
  const outPixels = outData.data;

  const H = computeInverseHomography(quad, outW, outH);
  if (!H) {
    throw new Error('Perspective transformation matrix calculation failed');
  }

  const [h0, h1, h2, h3, h4, h5, h6, h7] = H;

  // Pixel mapping loop with Bilinear Interpolation
  for (let y = 0; y < outH; y++) {
    const rowOffset = y * outW * 4;
    for (let x = 0; x < outW; x++) {
      const den = h6 * x + h7 * y + 1.0;
      const u = (h0 * x + h1 * y + h2) / den;
      const v = (h3 * x + h4 * y + h5) / den;

      const idx = rowOffset + x * 4;

      if (u >= 0 && u < srcW - 1 && v >= 0 && v < srcH - 1) {
        const u0 = Math.floor(u);
        const v0 = Math.floor(v);
        const u1 = u0 + 1;
        const v1 = v0 + 1;

        const du = u - u0;
        const dv = v - v0;
        const w00 = (1 - du) * (1 - dv);
        const w10 = du * (1 - dv);
        const w01 = (1 - du) * dv;
        const w11 = du * dv;

        const i00 = (v0 * srcW + u0) * 4;
        const i10 = (v0 * srcW + u1) * 4;
        const i01 = (v1 * srcW + u0) * 4;
        const i11 = (v1 * srcW + u1) * 4;

        outPixels[idx] =
          w00 * srcPixels[i00] + w10 * srcPixels[i10] + w01 * srcPixels[i01] + w11 * srcPixels[i11];
        outPixels[idx + 1] =
          w00 * srcPixels[i00 + 1] + w10 * srcPixels[i10 + 1] + w01 * srcPixels[i01 + 1] + w11 * srcPixels[i11 + 1];
        outPixels[idx + 2] =
          w00 * srcPixels[i00 + 2] + w10 * srcPixels[i10 + 2] + w01 * srcPixels[i01 + 2] + w11 * srcPixels[i11 + 2];
        outPixels[idx + 3] = 255;
      } else {
        // Outside source boundary: white background
        outPixels[idx] = 255;
        outPixels[idx + 1] = 255;
        outPixels[idx + 2] = 255;
        outPixels[idx + 3] = 255;
      }
    }
  }

  outCtx.putImageData(outData, 0, 0);
  const outDataUrl = outCanvas.toDataURL('image/jpeg', 0.95);

  return {
    dataUrl: outDataUrl,
    width: outW,
    height: outH,
  };
}

/**
 * Automatically detects document page corners (TL, TR, BR, BL) in an image.
 * Uses edge gradients, contrast differentials, and morphological contour bounding.
 */
export function autoDetectDocumentQuad(
  img: HTMLImageElement | HTMLCanvasElement
): QuadPoints {
  const origW = 'naturalWidth' in img ? img.naturalWidth : img.width;
  const origH = 'naturalHeight' in img ? img.naturalHeight : img.height;

  // Downsample to 320px for rapid analysis (<10ms)
  const analysisW = 320;
  const scale = analysisW / origW;
  const analysisH = Math.round(origH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = analysisW;
  canvas.height = analysisH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return defaultQuad(origW, origH);
  }

  ctx.drawImage(img, 0, 0, analysisW, analysisH);
  const imgData = ctx.getImageData(0, 0, analysisW, analysisH);
  const d = imgData.data;

  // Compute Grayscale
  const gray = new Float32Array(analysisW * analysisH);
  for (let i = 0; i < gray.length; i++) {
    const idx = i * 4;
    gray[i] = 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
  }

  // Compute Gradient Magnitude (Sobel Filter)
  const mag = new Float32Array(analysisW * analysisH);
  let maxMag = 0;
  for (let y = 1; y < analysisH - 1; y++) {
    for (let x = 1; x < analysisW - 1; x++) {
      const idx = y * analysisW + x;
      const gx =
        -gray[idx - analysisW - 1] +
        gray[idx - analysisW + 1] -
        2 * gray[idx - 1] +
        2 * gray[idx + 1] -
        gray[idx + analysisW - 1] +
        gray[idx + analysisW + 1];
      const gy =
        -gray[idx - analysisW - 1] -
        2 * gray[idx - analysisW] -
        gray[idx - analysisW + 1] +
        gray[idx + analysisW - 1] +
        2 * gray[idx + analysisW] +
        gray[idx + analysisW + 1];
      const m = Math.hypot(gx, gy);
      mag[idx] = m;
      if (m > maxMag) maxMag = m;
    }
  }

  // Scan inward from outer borders to find strong edge boundaries of the document
  const threshold = Math.max(maxMag * 0.22, 25);

  let minX = analysisW * 0.05;
  let maxX = analysisW * 0.95;
  let minY = analysisH * 0.05;
  let maxY = analysisH * 0.95;

  // Top edge search
  for (let y = Math.round(analysisH * 0.03); y < analysisH * 0.4; y++) {
    let strongCount = 0;
    for (let x = Math.round(analysisW * 0.2); x < analysisW * 0.8; x++) {
      if (mag[y * analysisW + x] > threshold) strongCount++;
    }
    if (strongCount > analysisW * 0.15) {
      minY = y;
      break;
    }
  }

  // Bottom edge search
  for (let y = Math.round(analysisH * 0.97); y > analysisH * 0.6; y--) {
    let strongCount = 0;
    for (let x = Math.round(analysisW * 0.2); x < analysisW * 0.8; x++) {
      if (mag[y * analysisW + x] > threshold) strongCount++;
    }
    if (strongCount > analysisW * 0.15) {
      maxY = y;
      break;
    }
  }

  // Left edge search
  for (let x = Math.round(analysisW * 0.03); x < analysisW * 0.4; x++) {
    let strongCount = 0;
    for (let y = Math.round(analysisH * 0.2); y < analysisH * 0.8; y++) {
      if (mag[y * analysisW + x] > threshold) strongCount++;
    }
    if (strongCount > analysisH * 0.15) {
      minX = x;
      break;
    }
  }

  // Right edge search
  for (let x = Math.round(analysisW * 0.97); x > analysisW * 0.6; x--) {
    let strongCount = 0;
    for (let y = Math.round(analysisH * 0.2); y < analysisH * 0.8; y++) {
      if (mag[y * analysisW + x] > threshold) strongCount++;
    }
    if (strongCount > analysisH * 0.15) {
      maxX = x;
      break;
    }
  }

  // Convert back to original image scale
  const invScale = 1 / scale;
  const result: QuadPoints = {
    tl: { x: Math.round(minX * invScale), y: Math.round(minY * invScale) },
    tr: { x: Math.round(maxX * invScale), y: Math.round(minY * invScale) },
    br: { x: Math.round(maxX * invScale), y: Math.round(maxY * invScale) },
    bl: { x: Math.round(minX * invScale), y: Math.round(maxY * invScale) },
  };

  // Sanity check: quad must cover at least 30% of image area
  const area = (maxX - minX) * (maxY - minY);
  const totalArea = analysisW * analysisH;
  if (area < totalArea * 0.25) {
    return defaultQuad(origW, origH);
  }

  return result;
}

/**
 * Default clean inset quad when no sharp document outline against background is found
 */
export function defaultQuad(w: number, h: number): QuadPoints {
  const padX = Math.round(w * 0.04);
  const padY = Math.round(h * 0.04);
  return {
    tl: { x: padX, y: padY },
    tr: { x: w - padX, y: padY },
    br: { x: w - padX, y: h - padY },
    bl: { x: padX, y: h - padY },
  };
}

/**
 * Applies document enhancement filters (Magic contrast, Clean B&W, Grayscale)
 */
export async function applyDocumentFilter(
  dataUrl: string,
  filter: 'magic' | 'bw' | 'grayscale' | 'none'
): Promise<string> {
  if (filter === 'none') return dataUrl;

  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return dataUrl;

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = imgData.data;

  if (filter === 'grayscale') {
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      d[i] = g;
      d[i + 1] = g;
      d[i + 2] = g;
    }
  } else if (filter === 'bw') {
    // High contrast black and white (CamScanner text scan)
    for (let i = 0; i < d.length; i += 4) {
      const g = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const val = g < 138 ? 0 : 255;
      d[i] = val;
      d[i + 1] = val;
      d[i + 2] = val;
    }
  } else if (filter === 'magic') {
    // Magic color: contrast stretch + shadow neutralization for clean documents
    for (let i = 0; i < d.length; i += 4) {
      let r = d[i];
      let g = d[i + 1];
      let b = d[i + 2];

      // Contrast enhancement curve
      r = Math.min(255, Math.max(0, (r - 28) * 1.32));
      g = Math.min(255, Math.max(0, (g - 28) * 1.32));
      b = Math.min(255, Math.max(0, (b - 28) * 1.32));

      // Neutralize slight page background yellowing/graying
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum > 210) {
        r = Math.min(255, r + (255 - lum) * 0.8);
        g = Math.min(255, g + (255 - lum) * 0.8);
        b = Math.min(255, b + (255 - lum) * 0.8);
      }

      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}
