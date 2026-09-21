export interface RoleCategory {
  id: string;
  name: string;
  emoji: string;
  label: string;
  description: string;
  badge?: string;
  toolIds: string[];
}

export const ROLES: RoleCategory[] = [
  {
    id: 'all',
    name: 'All Tools',
    emoji: '✨',
    label: 'All Tools',
    description: 'Complete catalog of 35+ browser-based PDF, document, and studio tools.',
    toolIds: [], // Empty means all
  },
  {
    id: 'wedding',
    name: 'Wedding & Events',
    emoji: '📸',
    label: '📸 Wedding & Events',
    description: 'Client photo proofing, wedding quotation generator, guest badges & tent cards, and WhatsApp compression.',
    badge: 'Studio Pro',
    toolIds: [
      'wedding-studio',
      'photo-proofing',
      'wedding-quotation',
      'guest-cards',
      'compress-pdf',
      'image-to-pdf',
      'add-watermark',
      'pdf-to-images',
    ],
  },
  {
    id: 'legal',
    name: 'Legal & Law Firms',
    emoji: '⚖️',
    label: '⚖️ Legal & Law Firms',
    description: 'Court-compliant tools: Sequential Bates numbering, permanent redaction, direct text edit, e-signatures, and comparison.',
    badge: 'Court Compliant',
    toolIds: [
      'bates-numbering',
      'redact-pdf',
      'pdf-editor',
      'sign-pdf',
      'merge-pdf',
      'protect-pdf',
      'compare-pdf',
      'metadata',
    ],
  },
  {
    id: 'finance',
    name: 'CA & Finance',
    emoji: '💼',
    label: '💼 CA & Finance',
    description: 'Tabular PDF to Excel, invoice stamp watermarking, password encryption/unlock, and optical character recognition.',
    badge: 'Auditor Grade',
    toolIds: [
      'pdf-to-excel',
      'excel-to-pdf',
      'add-watermark',
      'protect-pdf',
      'unlock-pdf',
      'ocr-pdf',
      'split-pdf',
      'merge-pdf',
    ],
  },
  {
    id: 'printing',
    name: 'Cyber Cafe & Printing',
    emoji: '🖨️',
    label: '🖨️ Cyber Cafe & Printing',
    description: 'Aadhaar / PAN ID card print layout (4-in-1 & 8-in-1), bulk watermark stamps, camera scanner, and photo prints.',
    badge: 'Quick Print',
    toolIds: [
      'id-card-layout',
      'scan-to-pdf',
      'image-to-pdf',
      'add-watermark',
      'resize-pdf',
      'crop-pdf',
      'pdf-to-images',
      'compress-pdf',
    ],
  },
  {
    id: 'education',
    name: 'Students & Education',
    emoji: '🎓',
    label: '🎓 Students & Education',
    description: 'Mobile homework/notes camera scanner, compress to 200KB for exam forms, merge lectures, and Word conversion.',
    badge: 'Free for All',
    toolIds: [
      'scan-to-pdf',
      'compress-pdf',
      'merge-pdf',
      'pdf-to-word',
      'word-to-pdf',
      'ocr-pdf',
      'pdf-to-text',
      'organize-pdf',
    ],
  },
];
