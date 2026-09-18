# PDF EDITOR BY UIKEY AI

> **"Powerful PDF Tools. Simple. Fast. Private."**  
> Edit, convert, organize, compress, and sign your PDF documents with browser-first, privacy-respecting technology.

---

## 🌟 Overview

**PDF EDITOR BY UIKEY AI** is a modern, full-stack, browser-first PDF suite engineered with a luxury black and subtle gold UIKEY AI visual identity.

### 🛡️ Core Business & Privacy Model
- **Zero Login / Registration**: No email, no password, no account required.
- **Zero Database Storage**: No document records, metadata databases, or user profiles.
- **Browser-First Execution**: PDF files are processed directly on your device using client-side WebAssembly, Canvas, and `pdf-lib`.
- **Ephemeral Backend**: For advanced server-assisted features on Render, operations are stateless in RAM and temporary files are automatically deleted immediately after stream delivery.
- **No Paid AI APIs Required**: Runs on open-source, local, and browser technologies without third-party API dependencies.

---

## 🚀 Supported Tools Catalog

| Category | Tools Included |
| :--- | :--- |
| **Organize PDF** | **Merge PDF**, **Split PDF** (by ranges or all pages to ZIP), **Organize PDF** (drag-and-drop reorder, duplicate, delete), **Remove Pages**, **Extract Pages**, **Rotate Pages**. |
| **Edit & Sign** | **Interactive PDF Canvas Editor**: Add text, edit overlay text, freehand drawing, highlighter, underline, strikethrough, shapes (rect, circle, arrow, line), image overlay, and signature (draw, type, or upload). |
| **Convert to PDF** | **Image to PDF** (JPG, PNG, WEBP with orientation & margins), **Word to PDF** (DOCX / text formatting), **HTML to PDF**. |
| **Convert from PDF**| **PDF to Images** (JPG & PNG at selectable quality with ZIP packaging), **PDF to Text** (clean extraction with copy, TXT and Markdown download), **PDF to Word** (generates genuine `.docx` files via `docx` library). |
| **Optimize PDF** | **Compress PDF** (real low, medium, high compression presets with exact before/after byte statistics), **Repair PDF** (recovers damaged xref structures), **Flatten PDF**. |
| **Page Tools** | **Watermark PDF** (Pre-filled by default with `UIKEY AI 8770912734`, custom angle, opacity, single or 3x3 tiled grid), **Remove Watermark** (visual redaction/cover mask), **Page Numbers** ("Page 1 of N" or standard), **Header & Footer**, **Crop PDF**, **Resize PDF** (A4, Letter, A3, Legal). |
| **PDF Security** | **Protect PDF** (password encryption), **Unlock PDF** (password decryption), **Redact PDF** (permanent visual & structural content blockout), **Metadata Editor** (Title, Author, Subject, Keywords, Creator). |
| **Other Tools** | **Compare PDF** (side-by-side synchronized document inspection), **Bates Numbering** (`UIKEY-000001` format), **Extract Images** (extracts embedded photos to ZIP). |

---

## 🏗️ Architecture & Technology Stack

### Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom UIKEY AI luxury gold accents (`#D4AF37`) & dark mode (default)
- **Icons**: Lucide React
- **State Management**: Zustand
- **PDF Manipulation**: `pdf-lib`
- **PDF Rendering & Text Extraction**: `pdfjs-dist`
- **DOCX Generation**: `docx`
- **Archive Generation**: `jszip` + `file-saver`
- **Celebration Effects**: `canvas-confetti`

### Backend (Stateless Render Service)
- **Runtime**: Node.js 22 + TypeScript
- **Framework**: Express + CORS + Multer (ephemeral memory storage)
- **Health Check**: `GET /health` -> `{"status":"ok"}`
- **Stateless Fallback Processing**: `/api/pdf/compress`, `/api/pdf/repair`

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- npm 10+

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/your-username/pdf-editor-by-uikey-ai.git
   cd pdf-editor-by-uikey-ai
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   npm --prefix server install
   ```

4. **Start local development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

5. **Start backend service (optional)**:
   ```bash
   npm run server
   ```
   Runs on `http://localhost:4000` with `GET /health`.

---

## 📦 Production Build

```bash
npm run build
```
Creates production-ready assets in `/dist` with optimized code splitting (`pdf-engine`, `export-engine`, `react-vendor`).

---

## 🌐 Deployment Instructions

### 1. GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit: PDF EDITOR BY UIKEY AI"
git branch -M main
git remote add origin https://github.com/YOUR_USER/pdf-editor-by-uikey-ai.git
git push -u origin main
```

### 2. Vercel Frontend Deployment
1. Go to [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Configure settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Set Environment Variables:
   - `VITE_API_BASE_URL` = your Render backend URL (optional)
5. Click **Deploy**. The included `vercel.json` ensures all client-side routes (`/pdf-editor`, `/merge-pdf`, etc.) work with single-page application routing.

### 3. Render Backend Deployment
1. Go to [Render Dashboard](https://render.com) and click **New > Blueprint**.
2. Connect your GitHub repository.
3. Render will automatically detect `render.yaml` and configure:
   - **Service Name**: `pdf-editor-by-uikey-ai-backend`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
4. Click **Apply**.

---

## 🔒 Security & Privacy Manifesto

- No secrets or keys are hardcoded in client source code.
- No `eval()` is used for document manipulation.
- Temporary files on the server are isolated and cleaned up automatically.
- Passwords entered in Protect/Unlock tools are never transmitted or saved.

---

## 📱 Mobile Responsiveness

The interface is specifically styled and tested for mobile devices (e.g. 360x800, 390x844, 412x915):
- Bottom floating toolbars with smooth horizontal scrolling.
- Slide-over drawers for "All Tools" mega menu, properties, and page thumbnails.
- Responsive canvas viewer with pinch/zoom and touch-friendly drawing.
- Zero horizontal layout overflow.

---

## 📄 License
MIT License. © 2026 UIKEY AI. All rights reserved.
