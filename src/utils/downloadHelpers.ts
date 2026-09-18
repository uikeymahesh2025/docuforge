import confetti from 'canvas-confetti';

export function sanitizeFilename(originalName: string, suffix: string, extension = 'pdf'): string {
  const base = originalName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanBase = base.substring(0, 40) || 'document';
  return `${cleanBase}_${suffix}.${extension}`;
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up object URL after a brief delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1500);

  // Trigger subtle celebratory confetti
  try {
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.85 },
      colors: ['#D4AF37', '#F3E5AB', '#FFFFFF'],
    });
  } catch {
    // Ignore if blocked or unavailable
  }
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
