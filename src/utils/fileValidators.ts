export interface ValidationResult {
  valid: boolean;
  error?: string;
  isPasswordProtected?: boolean;
}

export const MAX_FILE_SIZE_MB = 100;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export function validatePdfFile(file: File): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The uploaded file is empty (0 bytes). Please choose a valid PDF.',
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File exceeds the maximum limit of ${MAX_FILE_SIZE_MB}MB. Please optimize or choose a smaller file.`,
    };
  }

  const name = file.name.toLowerCase();
  const isPdfExt = name.endsWith('.pdf');
  const isPdfMime = file.type === 'application/pdf' || file.type === '';

  if (!isPdfExt && !isPdfMime) {
    return {
      valid: false,
      error: 'Invalid file format. Please upload a standard .pdf document.',
    };
  }

  return { valid: true };
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
