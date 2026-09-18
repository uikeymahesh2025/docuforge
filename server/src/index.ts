import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json());

// In-memory upload buffer (max 50MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Health check endpoint (required by Render)
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', service: 'PDF EDITOR BY UIKEY AI Backend' });
});

// Stateless PDF Compress endpoint
app.post('/api/pdf/compress', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
    // Optimize object streams
    const compressedBytes = await pdfDoc.save({ useObjectStreams: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document_compressed.pdf"');
    res.send(Buffer.from(compressedBytes));
  } catch (err: any) {
    res.status(500).json({
      error: 'PDF compression encountered an unexpected issue.',
      reason: err?.message || 'Unsupported PDF stream structure',
      suggestion: 'Try our browser-based client compression mode.'
    });
  }
});

// Stateless PDF Repair endpoint
app.post('/api/pdf/repair', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    // Attempt loading with loose parser and save back clean XRef and trailer
    const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true, throwOnInvalidObject: false });
    const repairedBytes = await pdfDoc.save({ useObjectStreams: true });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="document_repaired.pdf"');
    res.send(Buffer.from(repairedBytes));
  } catch (err: any) {
    res.status(422).json({
      error: 'This PDF could not be repaired automatically.',
      reason: 'The file appears to be severely damaged or incomplete.',
      suggestion: 'Please verify the source file or export it again.'
    });
  }
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: 'An internal processing error occurred.',
    message: err?.message || 'Server error'
  });
});

app.listen(PORT, () => {
  console.log(`UIKEY AI PDF Backend service running on port ${PORT}`);
});
