export interface ValidationResult {
  valid: boolean;
  error?: string;
  isPasswordProtected?: boolean;
  isLargeFile?: boolean;
  fileSizeBytes?: number;
}

export const APP_CONFIG = {
  appName: 'UIKEY AI PDF Suite',
  brandName: 'DocuForge',
  positioning: 'Edit, sign, organize and convert PDFs privately in your browser.',
  maxFileSizeMB: 100,
  largeFileThresholdMB: 40,
  maxPagesRecommended: 250,
  privacyGuarantee: '100% Private — all processing happens directly in your browser without uploading files to any server.',
};

export const MAX_FILE_SIZE_MB = APP_CONFIG.maxFileSizeMB;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const LARGE_FILE_THRESHOLD_BYTES = APP_CONFIG.largeFileThresholdMB * 1024 * 1024;

export function validatePdfFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The uploaded file is empty (0 bytes). Please choose a valid PDF document.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB. Please compress or optimize the file before uploading.`,
      fileSizeBytes: file.size,
    };
  }

  const name = file.name.toLowerCase();
  const isPdfExt = name.endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf' || file.type === '';

  if (!isPdfExt && !isPdfMime) {
    return {
      valid: false,
      error: `"${file.name}" is not a valid PDF file. Please upload a document ending in .pdf.`,
      fileSizeBytes: file.size,
    };
  }

  const isLargeFile = file.size >= LARGE_FILE_THRESHOLD_BYTES;

  return {
    valid: true,
    isLargeFile,
    fileSizeBytes: file.size,
  };
}

export function validateImageFiles(files: File[]): ValidationResult {
  if (!files || files.length === 0) {
    return { valid: false, error: 'Please select at least one image.' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  for (const file of files) {
    if (file.size === 0) {
      return { valid: false, error: `Image "${file.name}" is empty.` };
    }
    if (file.size > 25 * 1024 * 1024) {
      return { valid: false, error: `Image "${file.name}" exceeds 25MB.` };
    }
    const lowerName = file.name.toLowerCase();
    const hasImageExt = /\.(jpe?g|png|webp)$/i.test(lowerName);
    if (!allowedTypes.includes(file.type) && !hasImageExt) {
      return {
        valid: false,
        error: `"${file.name}" is not a supported image format. Supported formats: JPG, PNG, WEBP.`,
      };
    }
  }

  return { valid: true };
}
