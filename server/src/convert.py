import sys
import os
import io
import zipfile
import subprocess
import pymupdf as fitz
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn

def inspect_pdf_metadata(pdf_path: str):
    """
    Inspects PDF pages to classify structure:
    - Page count and dimensions
    - Total selectable text length (detect scanned/flat PDFs)
    - Full-page background templates / letterheads
    - Candidate / profile photos & logos
    """
    pdf_doc = fitz.open(pdf_path)
    page_count = len(pdf_doc)
    pages_meta = []
    total_text_len = 0

    for page_idx in range(page_count):
        page = pdf_doc[page_idx]
        rect = page.rect
        w = rect.width
        h = rect.height
        text = page.get_text().strip()
        total_text_len += len(text)

        bg_image = None
        photos = []
        all_images = []

        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref")
            bbox = info.get("bbox")
            if xref and xref > 0 and bbox:
                try:
                    img_dict = pdf_doc.extract_image(xref)
                    if img_dict and img_dict.get("image"):
                        img_data = {
                            "xref": xref,
                            "bbox": bbox,
                            "bytes": img_dict["image"],
                            "ext": img_dict.get("ext", "png"),
                            "w_pts": bbox[2] - bbox[0],
                            "h_pts": bbox[3] - bbox[1],
                            "x0": bbox[0], "y0": bbox[1],
                            "x1": bbox[2], "y1": bbox[3]
                        }
                        all_images.append(img_data)
                        # Check if image covers majority of page (full-page background template/frame)
                        if bbox[0] < 60 and bbox[1] < 60 and bbox[2] > w * 0.85 and bbox[3] > h * 0.85:
                            bg_image = img_data
                        elif bbox[0] > w * 0.40 and bbox[1] < h * 0.60:
                            photos.append(img_data)
                except Exception:
                    pass

        # Text blocks
        text_dict = page.get_text("dict")
        blocks = []
        for b in text_dict.get("blocks", []):
            if b.get("type") == 0:
                blocks.append(b)

        pages_meta.append({
            "page_idx": page_idx,
            "width": w,
            "height": h,
            "bg_image": bg_image,
            "photos": photos,
            "all_images": all_images,
            "blocks_count": len(blocks),
            "text_len": len(text)
        })

    pdf_doc.close()
    is_scanned = (total_text_len < 20 and len(pages_meta) > 0 and any(len(p["all_images"]) > 0 for p in pages_meta))
    return {
        "page_count": page_count,
        "is_scanned": is_scanned,
        "pages": pages_meta
    }

def post_process_docx(pdf_path: str, docx_path: str, meta: dict):
    """
    Reconciles the generated docx with original PDF:
    1. Full-page background templates: If a page in the PDF had a background frame
       (e.g., golden ornate border / letterhead) that pdf2docx dropped,
       embeds it into the Word section header as a behind-document anchor (behindDoc="1").
    2. Missing Photos / Logos: Ensures candidate photos and images are present in the docx.
    """
    try:
        if not os.path.exists(docx_path) or os.path.getsize(docx_path) < 100:
            return

        doc = docx.Document(docx_path)
        modified = False

        # 1. Check full-page background images
        for page_idx, p_meta in enumerate(meta.get("pages", [])):
            bg = p_meta.get("bg_image")
            if bg:
                section_idx = min(page_idx, len(doc.sections) - 1)
                sec = doc.sections[section_idx]
                header = sec.header

                # Check if header already has this background drawing
                has_bg_drawing = any("<wp:anchor" in p._element.xml and "behindDoc" in p._element.xml for p in header.paragraphs)
                if not has_bg_drawing:
                    p_head = header.paragraphs[0]
                    p_head.paragraph_format.space_before = Pt(0)
                    p_head.paragraph_format.space_after = Pt(0)
                    run_head = p_head.add_run()
                    
                    w_in = sec.page_width.inches if sec.page_width else 8.27
                    h_in = sec.page_height.inches if sec.page_height else 11.69
                    pic = run_head.add_picture(io.BytesIO(bg["bytes"]), width=Inches(w_in), height=Inches(h_in))

                    inline = pic._inline
                    cx = int(w_in * 914400)
                    cy = int(h_in * 914400)
                    graphic = inline.find(qn('a:graphic'))

                    anchor = parse_xml(f'''
                    <wp:anchor xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
                               distT="0" distB="0" distL="0" distR="0" simplePos="0" relativeHeight="0"
                               behindDoc="1" locked="1" layoutInCell="0" allowOverlap="1">
                        <wp:simplePos x="0" y="0"/>
                        <wp:positionH relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionH>
                        <wp:positionV relativeFrom="page"><wp:posOffset>0</wp:posOffset></wp:positionV>
                        <wp:extent cx="{cx}" cy="{cy}"/>
                        <wp:effectExtent l="0" t="0" r="0" b="0"/>
                        <wp:wrapNone/>
                        <wp:docPr id="{1000 + page_idx}" name="PageBackground_{page_idx}"/>
                        <wp:cNvGraphicFramePr/>
                    </wp:anchor>
                    ''')
                    anchor.append(graphic)
                    inline.getparent().replace(inline, anchor)
                    modified = True

        # 2. Check candidate photos in tables
        for page_idx, p_meta in enumerate(meta.get("pages", [])):
            photos = p_meta.get("photos", [])
            if photos and doc.tables:
                for photo in photos:
                    # Check if any table cell or paragraph has drawing
                    drawing_found = False
                    for t in doc.tables:
                        for row in t.rows:
                            for cell in row.cells:
                                if any("<w:drawing" in p._element.xml for p in cell.paragraphs):
                                    drawing_found = True
                                    break
                            if drawing_found: break
                        if drawing_found: break

                    if not drawing_found:
                        # Find table with 2+ columns on this page
                        for t in doc.tables:
                            if len(t.columns) >= 2:
                                right_cell = t.cell(0, len(t.columns) - 1)
                                p = right_cell.paragraphs[0]
                                p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
                                p.paragraph_format.space_before = Pt(2)
                                p.paragraph_format.space_after = Pt(4)
                                run = p.add_run()
                                w_in = min(2.4, photo["w_pts"] / 72.0)
                                h_in = (photo["h_pts"] / photo["w_pts"]) * w_in if photo["w_pts"] > 0 else 2.8
                                run.add_picture(io.BytesIO(photo["bytes"]), width=Inches(w_in), height=Inches(h_in))
                                modified = True
                                break

        if modified:
            doc.save(docx_path)
            print(f"Reconciled {docx_path} with original PDF assets successfully.", file=sys.stderr)
    except Exception as recon_err:
        print(f"Post-processing warning: {recon_err}", file=sys.stderr)

def convert_scanned_pdf_to_docx(pdf_path: str, docx_path: str):
    """
    Fallback for 100% scanned or flat image PDFs:
    Renders every page at 300 DPI high resolution and embeds as full-page canvas in DOCX.
    Ensures zero blank pages and 1:1 image visual preservation.
    """
    pdf_doc = fitz.open(pdf_path)
    doc = docx.Document()

    for idx, page in enumerate(pdf_doc):
        rect = page.rect
        w_in = rect.width / 72.0
        h_in = rect.height / 72.0

        if idx == 0:
            sec = doc.sections[0]
        else:
            doc.add_page_break()
            sec = doc.add_section()

        sec.page_width = Inches(w_in)
        sec.page_height = Inches(h_in)
        sec.top_margin = Inches(0)
        sec.bottom_margin = Inches(0)
        sec.left_margin = Inches(0)
        sec.right_margin = Inches(0)

        # Render 300 DPI pixmap
        pix = page.get_pixmap(dpi=300)
        img_bytes = pix.tobytes("png")

        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run()
        run.add_picture(io.BytesIO(img_bytes), width=Inches(w_in), height=Inches(h_in))

    pdf_doc.close()
    doc.save(docx_path)
    print(f"Scanned PDF converted as high-resolution DOCX: {docx_path}", file=sys.stderr)

def convert_with_pdf2docx_engine(pdf_path: str, docx_path: str, meta: dict):
    """
    Executes pdf2docx converter with stream tables, lattice tables, and vector border support.
    """
    from pdf2docx import Converter
    cv = Converter(pdf_path)
    try:
        cv.convert(
            docx_path,
            multi_processing=False,
            parse_lattice_table=True,
            parse_stream_table=True,
            extract_stream_table=True,
            line_overlap_threshold=0.9,
            connected_border_tolerance=0.5,
            float_image_ignorable_gap=5.0
        )
    finally:
        cv.close()

    # Reconcile backgrounds & photos
    post_process_docx(pdf_path, docx_path, meta)

def convert_pdf_to_docx_universal(pdf_path: str, docx_path: str):
    """
    Master entry point for Universal PDF to Word conversion.
    Pipelines:
    1. Pre-Analysis (Structure, images, scanned vs vector)
    2. Scanned PDF Handler (300 DPI high-res canvas if scanned)
    3. Core Engine: pdf2docx with multi-column, table, vector borders & image reconciliation
    4. Fallback Engine: Resilient block-by-block layout reconstruction
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"Input PDF not found: {pdf_path}")

    meta = inspect_pdf_metadata(pdf_path)

    # 1. Scanned Document Pipeline
    if meta.get("is_scanned"):
        try:
            convert_scanned_pdf_to_docx(pdf_path, docx_path)
            if os.path.exists(docx_path) and os.path.getsize(docx_path) > 1000:
                return
        except Exception as scan_err:
            print(f"Scanned handler error: {scan_err}", file=sys.stderr)

    # 2. Universal Core Engine (pdf2docx + asset reconciliation)
    try:
        convert_with_pdf2docx_engine(pdf_path, docx_path, meta)
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 500:
            return
    except Exception as core_err:
        print(f"Core pdf2docx engine note: {core_err}; activating fallback engine...", file=sys.stderr)

    # 3. Resilient Fallback Engine
    from pdf_to_docx import convert_pdf_to_docx_layout_aware
    convert_pdf_to_docx_layout_aware(pdf_path, docx_path)
    post_process_docx(pdf_path, docx_path, meta)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        convert_pdf_to_docx_universal(input_file, output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            print(f"SUCCESS: Converted {input_file} -> {output_file}")
            sys.exit(0)
        else:
            print("ERROR: Output file was not generated or is empty.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
