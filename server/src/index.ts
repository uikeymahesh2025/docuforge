import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import multer from 'multer';
import { PDFDocument } from 'pdf-lib';
import dotenv from 'dotenv';
import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execFileAsync = promisify(execFile);
const app = express();
const PORT = process.env.PORT || 4000;

function getPythonPath(): string {
  const explicitPaths = [
    'C:\\Python314\\python.exe',
    path.resolve(__dirname, '..', '.venv', 'Scripts', 'python.exe'),
    path.resolve(__dirname, '..', '.venv', 'bin', 'python'),
  ];
  for (const p of explicitPaths) {
    if (fs.existsSync(p)) return p;
  }
  return process.platform === 'win32' ? 'python' : 'python3';
}

function getPythonScriptPath(scriptName: string): string {
  const inDist = path.resolve(__dirname, scriptName);
  if (fs.existsSync(inDist)) return inDist;
  const inSrc = path.resolve(__dirname, '..', 'src', scriptName);
  if (fs.existsSync(inSrc)) return inSrc;
  const inRoot = path.resolve(__dirname, 'src', scriptName);
  if (fs.existsSync(inRoot)) return inRoot;
  return inDist;
}

// Enable CORS for frontend
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
}));

app.use(express.json());

// In-memory upload buffer (max 100MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

// Helper for temporary file lifecycle
async function withTempFiles<T>(
  prefix: string,
  fn: (tempDir: string) => Promise<T>
): Promise<T> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), `uikey_${prefix}_`));
  try {
    return await fn(tempDir);
  } finally {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}

// Health check endpoint (required by Render)
const handleHealth = (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'PDF EDITOR BY UIKEY AI Backend',
    features: ['layout-aware-docx', 'aes-256-security', 'raw-image-extractor', 'stream-compress', 'excel-to-pdf', 'word-to-pdf', 'pdf-to-excel', 'ocr-engine']
  });
};
app.get('/health', handleHealth);
app.get('/api/health', handleHealth);

// 1. Layout-Aware PDF to Word Conversion (pdf2docx)
app.post('/api/convert/pdf-to-word', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    let scriptPath = getPythonScriptPath('convert.py');
    if (!fs.existsSync(scriptPath)) {
      scriptPath = getPythonScriptPath('pdf_to_docx.py');
    }

    await withTempFiles('pdf2docx', async (tempDir) => {
      const inputPdfPath = path.join(tempDir, 'input.pdf');
      const outputDocxPath = path.join(tempDir, 'output.docx');

      fs.writeFileSync(inputPdfPath, req.file!.buffer);

      // Execute pdf2docx python worker
      await execFileAsync(pythonExe, [scriptPath, inputPdfPath, outputDocxPath], {
        timeout: 120000 // 2 minutes max
      });

      if (!fs.existsSync(outputDocxPath)) {
        throw new Error('Word document generation failed to emit output file.');
      }

      const docxBytes = fs.readFileSync(outputDocxPath);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="converted_document.docx"');
      res.send(docxBytes);
    });
  } catch (err: any) {
    console.error('pdf-to-word error:', err);
    res.status(500).json({
      error: 'Layout-aware conversion failed',
      details: err?.message || 'Engine error',
      suggestion: 'Browser-based fallback conversion is available in the editor.'
    });
  }
});

// 1b. Excel to PDF Conversion (openpyxl + PyMuPDF)
app.post('/api/convert/excel-to-pdf', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No Excel file uploaded' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('excel_to_pdf.py');

    await withTempFiles('excel2pdf', async (tempDir) => {
      const origExt = path.extname(req.file!.originalname) || '.xlsx';
      const inputExcelPath = path.join(tempDir, `input${origExt}`);
      const outputPdfPath = path.join(tempDir, 'output.pdf');

      fs.writeFileSync(inputExcelPath, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, inputExcelPath, outputPdfPath], {
        timeout: 120000
      });

      if (!fs.existsSync(outputPdfPath)) {
        throw new Error('PDF document generation failed to emit output file.');
      }

      const pdfBytes = fs.readFileSync(outputPdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="converted_spreadsheet.pdf"');
      res.send(pdfBytes);
    });
  } catch (err: any) {
    console.error('excel-to-pdf error:', err);
    res.status(500).json({
      error: 'Excel to PDF conversion failed',
      details: err?.message || 'Engine error'
    });
  }
});

// 1c. Word to PDF Conversion (python-docx + PyMuPDF)
app.post('/api/convert/word-to-pdf', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No Word file uploaded' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('word_to_pdf.py');

    await withTempFiles('word2pdf', async (tempDir) => {
      const inputDocxPath = path.join(tempDir, 'input.docx');
      const outputPdfPath = path.join(tempDir, 'output.pdf');

      fs.writeFileSync(inputDocxPath, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, inputDocxPath, outputPdfPath], {
        timeout: 120000
      });

      if (!fs.existsSync(outputPdfPath)) {
        throw new Error('PDF generation failed to emit output file.');
      }

      const pdfBytes = fs.readFileSync(outputPdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="converted_document.pdf"');
      res.send(pdfBytes);
    });
  } catch (err: any) {
    console.error('word-to-pdf error:', err);
    res.status(500).json({
      error: 'Word to PDF conversion failed',
      details: err?.message || 'Engine error'
    });
  }
});

// 1d. PDF to Excel Table Extraction (PyMuPDF + openpyxl)
app.post('/api/convert/pdf-to-excel', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('pdf_to_excel.py');

    await withTempFiles('pdf2excel', async (tempDir) => {
      const inputPdfPath = path.join(tempDir, 'input.pdf');
      const outputXlsxPath = path.join(tempDir, 'output.xlsx');

      fs.writeFileSync(inputPdfPath, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, inputPdfPath, outputXlsxPath], {
        timeout: 120000
      });

      if (!fs.existsSync(outputXlsxPath)) {
        throw new Error('Excel workbook generation failed to emit output file.');
      }

      const xlsxBytes = fs.readFileSync(outputXlsxPath);
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="extracted_tables.xlsx"');
      res.send(xlsxBytes);
    });
  } catch (err: any) {
    console.error('pdf-to-excel error:', err);
    res.status(500).json({
      error: 'PDF to Excel conversion failed',
      details: err?.message || 'Engine error'
    });
  }
});

// 1e. OCR Document Text & Word Extraction (PyMuPDF OCR)
app.post('/api/ocr/extract', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded for OCR' });
    return;
  }

  const format = req.body.format === 'docx' ? 'docx' : 'txt';
  const language = req.body.language || 'eng';

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('ocr_engine.py');

    await withTempFiles('ocr', async (tempDir) => {
      const origExt = path.extname(req.file!.originalname) || '.pdf';
      const inputPath = path.join(tempDir, `input${origExt}`);
      const outputPath = path.join(tempDir, `output.${format}`);

      fs.writeFileSync(inputPath, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, inputPath, outputPath, format, language], {
        timeout: 180000
      });

      if (!fs.existsSync(outputPath)) {
        throw new Error('OCR process failed to emit output file.');
      }

      const resultBytes = fs.readFileSync(outputPath);
      if (format === 'docx') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        res.setHeader('Content-Disposition', 'attachment; filename="ocr_extracted_document.docx"');
      } else {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename="ocr_extracted_text.txt"');
      }
      res.send(resultBytes);
    });
  } catch (err: any) {
    console.error('ocr error:', err);
    res.status(500).json({
      error: 'OCR extraction failed',
      details: err?.message || 'Engine error'
    });
  }
});

// 2. Protect PDF with AES-128 / AES-256 Encryption
app.post('/api/pdf/protect', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  const password = req.body.password;
  const keyLen = req.body.keyLen === '128' ? '128' : '256';

  if (!password || password.length < 4) {
    res.status(400).json({ error: 'Password must be at least 4 characters.' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('pdf_security.py');

    await withTempFiles('protect', async (tempDir) => {
      const inputPdf = path.join(tempDir, 'input.pdf');
      const outputPdf = path.join(tempDir, 'protected.pdf');

      fs.writeFileSync(inputPdf, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, 'protect', inputPdf, outputPdf, password, keyLen], {
        timeout: 60000
      });

      const encryptedBytes = fs.readFileSync(outputPdf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="protected.pdf"');
      res.send(encryptedBytes);
    });
  } catch (err: any) {
    console.error('protect error:', err);
    res.status(500).json({ error: 'Failed to encrypt PDF', details: err?.message });
  }
});

// 3. Unlock Encrypted PDF
app.post('/api/pdf/unlock', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  const password = req.body.password;
  if (!password) {
    res.status(400).json({ error: 'Password is required to unlock document.' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('pdf_security.py');

    await withTempFiles('unlock', async (tempDir) => {
      const inputPdf = path.join(tempDir, 'input.pdf');
      const outputPdf = path.join(tempDir, 'unlocked.pdf');

      fs.writeFileSync(inputPdf, req.file!.buffer);

      try {
        await execFileAsync(pythonExe, [scriptPath, 'unlock', inputPdf, outputPdf, password], {
          timeout: 60000
        });
      } catch (subErr: any) {
        if (subErr?.stderr?.includes('Invalid password') || subErr?.stdout?.includes('Invalid password')) {
          res.status(401).json({ error: 'Incorrect password. Please verify and try again.' });
          return;
        }
        throw subErr;
      }

      const unlockedBytes = fs.readFileSync(outputPdf);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="unlocked.pdf"');
      res.send(unlockedBytes);
    });
  } catch (err: any) {
    console.error('unlock error:', err);
    res.status(500).json({ error: 'Failed to decrypt PDF', details: err?.message });
  }
});

// 4. Extract Raw Embedded Images
app.post('/api/pdf/extract-images', upload.single('file'), async (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No PDF file uploaded' });
    return;
  }

  try {
    const pythonExe = getPythonPath();
    const scriptPath = getPythonScriptPath('extract_images.py');

    await withTempFiles('extract_imgs', async (tempDir) => {
      const inputPdf = path.join(tempDir, 'input.pdf');
      const outputZip = path.join(tempDir, 'images.zip');

      fs.writeFileSync(inputPdf, req.file!.buffer);

      await execFileAsync(pythonExe, [scriptPath, inputPdf, outputZip], {
        timeout: 90000
      });

      const zipBytes = fs.readFileSync(outputZip);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="extracted_images.zip"');
      res.send(zipBytes);
    });
  } catch (err: any) {
    console.error('extract-images error:', err);
    res.status(500).json({ error: 'Failed to extract images', details: err?.message });
  }
});

// 5. Stateless PDF Compress endpoint (Preserves vector text)
app.post('/api/pdf/compress', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No PDF file uploaded' });
      return;
    }

    const pdfDoc = await PDFDocument.load(req.file.buffer, { ignoreEncryption: true });
    // Optimize object streams and deflate content streams
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

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: 'An internal processing error occurred.',
    message: err?.message || 'Server error'
  });
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`UIKEY AI PDF Backend service running on port ${PORT} (0.0.0.0)`);
});
