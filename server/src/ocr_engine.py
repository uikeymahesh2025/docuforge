import sys
import os
import io
import pymupdf as fitz
import docx
from docx.shared import Pt, RGBColor

def perform_ocr_extraction(input_path: str, output_path: str, target_format: str = "txt", language: str = "eng"):
    ext = os.path.splitext(input_path)[1].lower()
    
    if ext in [".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"]:
        # Image input: wrap into temporary single-page PDF
        img_doc = fitz.open()
        img = fitz.open(input_path)
        rect = img[0].rect
        pdf_bytes = img.convert_to_pdf()
        img.close()
        pdf_doc = fitz.open("pdf", pdf_bytes)
    else:
        pdf_doc = fitz.open(input_path)

    extracted_pages_text = []

    for page_idx, page in enumerate(pdf_doc):
        # 1. Try native text
        text = page.get_text().strip()
        
        # 2. If page has little or no text, run OCR
        if len(text) < 30:
            try:
                # Try fitz integrated OCR if available
                tess_lang = "hin+eng" if "hin" in language else "eng"
                tp = page.get_textpage_ocr(language=tess_lang, dpi=200, full=True)
                ocr_text = page.get_text(textpage=tp).strip()
                if ocr_text:
                    text = ocr_text
            except Exception as ocr_err:
                # Fallback: heuristic text from image rendering or report
                print(f"Page {page_idx+1} OCR notice: {ocr_err}", file=sys.stderr)
                if not text:
                    text = f"[Scanned page {page_idx + 1} - Image content]"

        extracted_pages_text.append({
            "page_num": page_idx + 1,
            "text": text
        })

    pdf_doc.close()

    if target_format == "docx":
        # Create Word document
        doc = docx.Document()
        for p_info in extracted_pages_text:
            p_head = doc.add_paragraph()
            r_head = p_head.add_run(f"--- Page {p_info['page_num']} ---")
            r_head.bold = True
            r_head.font.size = Pt(13)
            r_head.font.color.rgb = RGBColor(0, 52, 121)

            for line in p_info["text"].splitlines():
                if line.strip():
                    p = doc.add_paragraph(line.strip())
                    p.paragraph_format.space_after = Pt(3)

        doc.save(output_path)
    else:
        # Save as TXT / Markdown
        with open(output_path, "w", encoding="utf-8") as f:
            for p_info in extracted_pages_text:
                f.write(f"=== Page {p_info['page_num']} ===\n\n")
                f.write(p_info["text"])
                f.write("\n\n")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python ocr_engine.py <input_file> <output_file> [target_format: txt|docx] [language]", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]
    fmt = sys.argv[3] if len(sys.argv) > 3 else "txt"
    lang = sys.argv[4] if len(sys.argv) > 4 else "eng"

    try:
        perform_ocr_extraction(input_file, output_file, target_format=fmt, language=lang)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 10:
            print("SUCCESS: OCR extraction complete.")
            sys.exit(0)
        else:
            print("ERROR: Output file is empty.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
