import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Navbar } from './components/common/Navbar';
import { Footer } from './components/common/Footer';
import { ToastContainer } from './components/common/ToastContainer';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useThemeStore } from './stores/useThemeStore';

// Page Imports
import { Home } from './pages/Home';
import { EditorPage } from './pages/EditorPage';
import { MergePage } from './pages/MergePage';
import { SplitPage } from './pages/SplitPage';
import { OrganizePage } from './pages/OrganizePage';
import { CompressPage } from './pages/CompressPage';
import { WatermarkPage } from './pages/WatermarkPage';
import { RemoveWatermarkPage } from './pages/RemoveWatermarkPage';
import { PageNumbersPage } from './pages/PageNumbersPage';
import { HeaderFooterPage } from './pages/HeaderFooterPage';
import { CropPage } from './pages/CropPage';
import { RotatePage } from './pages/RotatePage';
import { ResizePage } from './pages/ResizePage';
import { PdfToImagesPage } from './pages/PdfToImagesPage';
import { ImageToPdfPage } from './pages/ImageToPdfPage';
import { ScanToPdfPage } from './pages/ScanToPdfPage';
import { ExcelToPdfPage } from './pages/ExcelToPdfPage';
import { PdfToExcelPage } from './pages/PdfToExcelPage';
import { OcrPage } from './pages/OcrPage';
import { PdfToWordPage } from './pages/PdfToWordPage';
import { WordToPdfPage } from './pages/WordToPdfPage';
import { HtmlToPdfPage } from './pages/HtmlToPdfPage';
import { PdfToTextPage } from './pages/PdfToTextPage';
import { SecurityPage } from './pages/SecurityPage';
import { RedactPage } from './pages/RedactPage';
import { MetadataPage } from './pages/MetadataPage';
import { ComparePage } from './pages/ComparePage';
import { BatesPage } from './pages/BatesPage';
import { ExtractImagesPage } from './pages/ExtractImagesPage';
import { AboutPage } from './pages/AboutPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Layout wrapper conditionally displaying footer
function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isEditor = location.pathname === '/pdf-editor';

  return (
    <div className="flex flex-col min-h-screen bg-[#09090C]">
      <Navbar />
      <main className="flex-1">{children}</main>
      {!isEditor && <Footer />}
    </div>
  );
}

export const App: React.FC = () => {
  const initTheme = useThemeStore((state) => state.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <LayoutWrapper>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/pdf-editor" element={<EditorPage />} />
            <Route path="/merge-pdf" element={<MergePage />} />
            <Route path="/split-pdf" element={<SplitPage />} />
            <Route path="/organize-pdf" element={<OrganizePage />} />
            <Route path="/compress-pdf" element={<CompressPage />} />
            <Route path="/add-watermark" element={<WatermarkPage />} />
            <Route path="/remove-watermark" element={<RemoveWatermarkPage />} />
            <Route path="/page-numbers" element={<PageNumbersPage />} />
            <Route path="/header-footer" element={<HeaderFooterPage />} />
            <Route path="/crop-pdf" element={<CropPage />} />
            <Route path="/rotate-pdf" element={<RotatePage />} />
            <Route path="/resize-pdf" element={<ResizePage />} />
            <Route path="/pdf-to-images" element={<PdfToImagesPage />} />
            <Route path="/image-to-pdf" element={<ImageToPdfPage />} />
            <Route path="/scan-to-pdf" element={<ScanToPdfPage />} />
            <Route path="/excel-to-pdf" element={<ExcelToPdfPage />} />
            <Route path="/pdf-to-excel" element={<PdfToExcelPage />} />
            <Route path="/ocr-pdf" element={<OcrPage />} />
            <Route path="/pdf-to-word" element={<PdfToWordPage />} />
            <Route path="/word-to-pdf" element={<WordToPdfPage />} />
            <Route path="/html-to-pdf" element={<HtmlToPdfPage />} />
            <Route path="/pdf-to-text" element={<PdfToTextPage />} />
            <Route path="/protect-pdf" element={<SecurityPage mode="protect" />} />
            <Route path="/unlock-pdf" element={<SecurityPage mode="unlock" />} />
            <Route path="/redact-pdf" element={<RedactPage />} />
            <Route path="/metadata" element={<MetadataPage />} />
            <Route path="/compare-pdf" element={<ComparePage />} />
            <Route path="/bates-numbering" element={<BatesPage />} />
            <Route path="/extract-images" element={<ExtractImagesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            {/* Fallback route */}
            <Route path="*" element={<Home />} />
          </Routes>
        </LayoutWrapper>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
};
