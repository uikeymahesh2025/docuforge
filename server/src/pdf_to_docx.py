import sys
import os
import io
import zipfile
import pymupdf as fitz
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def extract_pdf_images(pdf_path: str):
    """
    Extracts all images with their bounding boxes and page indices from the PDF using PyMuPDF.
    """
    pdf_doc = fitz.open(pdf_path)
    images = []
    for page_idx in range(len(pdf_doc)):
        page = pdf_doc[page_idx]
        page_rect = page.rect
        img_infos = page.get_image_info(xrefs=True)
        seen_xrefs = set()

        for info in img_infos:
            bbox = info.get("bbox")
            xref = info.get("xref")
            if xref and xref > 0 and xref not in seen_xrefs and bbox:
                seen_xrefs.add(xref)
                try:
                    img_dict = pdf_doc.extract_image(xref)
                    if img_dict and img_dict.get("image"):
                        w_pts = bbox[2] - bbox[0]
                        h_pts = bbox[3] - bbox[1]
                        images.append({
                            "page_idx": page_idx,
                            "bbox": bbox,
                            "bytes": img_dict["image"],
                            "ext": img_dict.get("ext", "png"),
                            "x0": bbox[0], "y0": bbox[1], "x1": bbox[2], "y1": bbox[3],
                            "w_pts": w_pts, "h_pts": h_pts,
                            "page_w": page_rect.width,
                            "page_h": page_rect.height
                        })
                except Exception as img_err:
                    print(f"Warning extracting image xref {xref}: {img_err}", file=sys.stderr)

        # Also inspect inline images
        try:
            text_dict = page.get_text("dict")
            for b in text_dict.get("blocks", []):
                if b.get("type") == 1 and "image" in b:
                    b_box = b.get("bbox")
                    already = any(abs(im["x0"] - b_box[0]) < 3 and abs(im["y0"] - b_box[1]) < 3 for im in images if im["page_idx"] == page_idx)
                    if not already:
                        w_pts = b_box[2] - b_box[0]
                        h_pts = b_box[3] - b_box[1]
                        images.append({
                            "page_idx": page_idx,
                            "bbox": b_box,
                            "bytes": b["image"],
                            "ext": b.get("ext", "png"),
                            "x0": b_box[0], "y0": b_box[1], "x1": b_box[2], "y1": b_box[3],
                            "w_pts": w_pts, "h_pts": h_pts,
                            "page_w": page_rect.width,
                            "page_h": page_rect.height
                        })
        except Exception:
            pass

    pdf_doc.close()
    return images

def inject_missing_images_into_docx(pdf_path: str, docx_path: str):
    """
    Compares images in generated docx against original PDF.
    If any image (like candidate photo) was dropped by the converter,
    injects it at the correct table cell or paragraph position.
    """
    try:
        pdf_images = extract_pdf_images(pdf_path)
        if not pdf_images:
            return

        with zipfile.ZipFile(docx_path, 'r') as zf:
            docx_media = [f for f in zf.namelist() if f.startswith('word/media/')]

        # If docx has at least as many media files as PDF images, all good
        if len(docx_media) >= len(pdf_images):
            return

        print(f"Post-processing DOCX: {len(docx_media)} media files found vs {len(pdf_images)} PDF images. Injecting missing...", file=sys.stderr)
        doc = docx.Document(docx_path)
        modified = False

        for img in pdf_images:
            # Check if this is a right-side candidate photo
            is_right_photo = img["x0"] > img["page_w"] * 0.45 and img["y0"] < img["page_h"] * 0.55

            if is_right_photo and doc.tables:
                # Find a table on the first page
                target_table = doc.tables[0]
                # If table has 2 or more columns, rightmost cell is the photo container
                if len(target_table.columns) >= 2:
                    right_col_idx = len(target_table.columns) - 1
                    cell = target_table.cell(0, right_col_idx)
                    # Check if it already has a drawing
                    has_drawing = any("<w:drawing" in p._element.xml for p in cell.paragraphs)
                    if not has_drawing:
                        p = cell.paragraphs[0]
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p.paragraph_format.space_before = Pt(2)
                        p.paragraph_format.space_after = Pt(6)
                        run = p.add_run()
                        max_w = min(2.4, img["w_pts"] / 72.0)
                        max_h = (img["h_pts"] / img["w_pts"]) * max_w if img["w_pts"] > 0 else 2.5
                        run.add_picture(io.BytesIO(img["bytes"]), width=Inches(max_w), height=Inches(max_h))
                        modified = True
                        continue

            # Fallback for other missing images: append or insert in closest paragraph
            if not is_right_photo:
                p = doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                run = p.add_run()
                w_in = min(6.0, img["w_pts"] / 72.0)
                h_in = (img["h_pts"] / img["w_pts"]) * w_in if img["w_pts"] > 0 else 2.0
                run.add_picture(io.BytesIO(img["bytes"]), width=Inches(w_in), height=Inches(h_in))
                modified = True

        if modified:
            doc.save(docx_path)
            print("Successfully injected missing images into DOCX.", file=sys.stderr)
    except Exception as inject_err:
        print(f"Image injection note: {inject_err}", file=sys.stderr)

def convert_pdf_to_docx_layout_aware(pdf_path: str, docx_path: str):
    """
    Banded high-fidelity layout-aware converter.
    Divides page into horizontal bands (Header, 2-Column photo area, Full-width sections, Footers).
    Preserves exact font sizes, styles, colors, key-value table alignments, and photo aspect ratio.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    pdf_doc = fitz.open(pdf_path)
    doc = docx.Document()

    for page_idx in range(len(pdf_doc)):
        page = pdf_doc[page_idx]
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height

        # Section setup to match PDF page dimensions & margins
        if page_idx == 0:
            section = doc.sections[0]
        else:
            doc.add_page_break()
            section = doc.add_section()

        section.page_width = Pt(page_width)
        section.page_height = Pt(page_height)
        section.top_margin = Inches(0.55)
        section.bottom_margin = Inches(0.55)
        section.left_margin = Inches(0.6)
        section.right_margin = Inches(0.6)

        # 1. Images
        images_on_page = []
        img_infos = page.get_image_info(xrefs=True)
        seen_xrefs = set()
        for info in img_infos:
            bbox = info.get("bbox")
            xref = info.get("xref")
            if xref and xref > 0 and xref not in seen_xrefs and bbox:
                seen_xrefs.add(xref)
                try:
                    img_dict = pdf_doc.extract_image(xref)
                    if img_dict and img_dict.get("image"):
                        w_pts = bbox[2] - bbox[0]
                        h_pts = bbox[3] - bbox[1]
                        images_on_page.append({
                            "bbox": bbox,
                            "bytes": img_dict["image"],
                            "ext": img_dict.get("ext", "png"),
                            "x0": bbox[0], "y0": bbox[1], "x1": bbox[2], "y1": bbox[3],
                            "w_pts": w_pts, "h_pts": h_pts
                        })
                except Exception:
                    pass

        # 2. Text blocks
        text_dict = page.get_text("dict")
        text_blocks = []
        for b in text_dict.get("blocks", []):
            if b.get("type") == 0:
                lines = []
                for l in b.get("lines", []):
                    line_spans = []
                    for s in l.get("spans", []):
                        t = s.get("text", "")
                        if t:
                            flags = s.get("flags", 0)
                            color_int = s.get("color", 0)
                            r = (color_int >> 16) & 255
                            g = (color_int >> 8) & 255
                            b_c = color_int & 255
                            line_spans.append({
                                "text": t,
                                "size": s.get("size", 11),
                                "font": s.get("font", "Calibri"),
                                "bold": bool(flags & 16) or "bold" in s.get("font", "").lower(),
                                "italic": bool(flags & 2) or "italic" in s.get("font", "").lower(),
                                "color": (r, g, b_c)
                            })
                    if line_spans:
                        line_text = "".join(sp["text"] for sp in line_spans).strip()
                        if line_text:
                            lines.append({
                                "spans": line_spans,
                                "bbox": l.get("bbox"),
                                "text": line_text,
                                "y0": l.get("bbox")[1],
                                "y1": l.get("bbox")[3],
                                "x0": l.get("bbox")[0],
                                "x1": l.get("bbox")[2],
                            })
                if lines:
                    text_blocks.append({
                        "bbox": b.get("bbox"),
                        "lines": lines,
                        "x0": b["bbox"][0], "y0": b["bbox"][1],
                        "x1": b["bbox"][2], "y1": b["bbox"][3],
                    })

        # 3. Detect 2-column photo zone (Band)
        right_images = [img for img in images_on_page if (img["x0"] + img["x1"]) / 2 > page_width * 0.45]
        
        if right_images:
            photo = right_images[0]
            # Two-column band boundaries
            col_top_y = min(photo["y0"], min((b["y0"] for b in text_blocks if b["y0"] >= photo["y0"] - 60), default=photo["y0"]))
            
            # Find all right-hand text below photo that belongs to the right column
            right_blocks = [b for b in text_blocks if b["x0"] >= page_width * 0.45 and b["y0"] >= col_top_y - 20 and b["y1"] <= photo["y1"] + 250]
            col_bottom_y = max([photo["y1"]] + [b["y1"] for b in right_blocks]) + 15

            split_x = min(photo["x0"] - 10, page_width * 0.62)
            split_x = max(page_width * 0.48, min(page_width * 0.68, split_x))

            # Categorize blocks into 3 bands:
            # Band A: Header (above two-column band)
            # Band B: Two-column area (left personal details vs right photo + contact)
            # Band C: Full-width sections (below two-column band, e.g. Family details, tables, declarations)
            band_header_blocks = []
            band_left_blocks = []
            band_right_blocks = []
            band_footer_blocks = []

            for b in text_blocks:
                b_center_y = (b["y0"] + b["y1"]) / 2
                b_center_x = (b["x0"] + b["x1"]) / 2
                is_full_width = b["x0"] < page_width * 0.35 and b["x1"] > page_width * 0.65

                if b["y1"] <= col_top_y + 10 or (is_full_width and b["y0"] < col_top_y + 30):
                    band_header_blocks.append(b)
                elif b["y0"] >= col_bottom_y - 10:
                    band_footer_blocks.append(b)
                elif b_center_x < split_x:
                    band_left_blocks.append(b)
                else:
                    band_right_blocks.append(b)

            # --- A. Render Header Band ---
            band_header_blocks.sort(key=lambda b: b["y0"])
            for b in band_header_blocks:
                for line in b["lines"]:
                    p = doc.add_paragraph()
                    line_center = (b["x0"] + b["x1"]) / 2
                    if abs(line_center - page_width / 2) < 60:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(4)
                    for s in line["spans"]:
                        run = p.add_run(s["text"])
                        run.bold = s["bold"]
                        run.italic = s["italic"]
                        run.font.size = Pt(s["size"])
                        if s.get("font"):
                            run.font.name = s["font"]
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

            # --- B. Render 2-Column Band (Table) ---
            table = doc.add_table(rows=1, cols=2)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER
            tblPr = table._tbl.tblPr
            tblBorders = parse_xml(r'''
                <w:tblBorders %s>
                    <w:top w:val="none"/>
                    <w:left w:val="none"/>
                    <w:bottom w:val="none"/>
                    <w:right w:val="none"/>
                    <w:insideH w:val="none"/>
                    <w:insideV w:val="none"/>
                </w:tblBorders>
            ''' % nsdecls('w'))
            tblPr.append(tblBorders)

            left_width_in = (split_x / page_width) * 7.2
            right_width_in = 7.2 - left_width_in

            cell_left = table.cell(0, 0)
            cell_right = table.cell(0, 1)
            cell_left.width = Inches(left_width_in)
            cell_right.width = Inches(right_width_in)

            # B1. Left Column: Personal details with key-value alignment
            band_left_blocks.sort(key=lambda b: b["y0"])
            first_left_p = True
            for b in band_left_blocks:
                for line in b["lines"]:
                    p = cell_left.paragraphs[0] if first_left_p else cell_left.add_paragraph()
                    first_left_p = False
                    p.paragraph_format.space_before = Pt(1)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.15
                    for s in line["spans"]:
                        run = p.add_run(s["text"])
                        run.bold = s["bold"]
                        run.italic = s["italic"]
                        run.font.size = Pt(s["size"])
                        if s.get("font"):
                            run.font.name = s["font"]
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

            # B2. Right Column: Photo on top, then contact details
            p_photo = cell_right.paragraphs[0]
            p_photo.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_photo.paragraph_format.space_before = Pt(2)
            p_photo.paragraph_format.space_after = Pt(8)

            max_w_in = min(right_width_in * 0.92, 2.4)
            img_w_in = photo["w_pts"] / 72.0
            img_h_in = photo["h_pts"] / 72.0
            if img_w_in > max_w_in:
                scale = max_w_in / img_w_in
                img_w_in = max_w_in
                img_h_in *= scale

            run_img = p_photo.add_run()
            run_img.add_picture(io.BytesIO(photo["bytes"]), width=Inches(img_w_in), height=Inches(img_h_in))

            # Right Column contact text
            band_right_blocks.sort(key=lambda b: b["y0"])
            for b in band_right_blocks:
                for line in b["lines"]:
                    p = cell_right.add_paragraph()
                    p.paragraph_format.space_before = Pt(1)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.15
                    for s in line["spans"]:
                        run = p.add_run(s["text"])
                        run.bold = s["bold"]
                        run.italic = s["italic"]
                        run.font.size = Pt(s["size"])
                        if s.get("font"):
                            run.font.name = s["font"]
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

            # --- C. Render Full-Width Footer / Bottom Sections ---
            # These span the FULL page width (e.g. Family details, tables, declarations)
            band_footer_blocks.sort(key=lambda b: b["y0"])
            for b in band_footer_blocks:
                for line in b["lines"]:
                    p = doc.add_paragraph()
                    line_center = (b["x0"] + b["x1"]) / 2
                    if abs(line_center - page_width / 2) < 60:
                        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(2)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.15
                    for s in line["spans"]:
                        run = p.add_run(s["text"])
                        run.bold = s["bold"]
                        run.italic = s["italic"]
                        run.font.size = Pt(s["size"])
                        if s.get("font"):
                            run.font.name = s["font"]
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

        else:
            # Standard single-column flow with embedded images
            all_elements = []
            for b in text_blocks:
                all_elements.append({"type": "text", "y0": b["y0"], "data": b})
            for im in images_on_page:
                all_elements.append({"type": "image", "y0": im["y0"], "data": im})

            all_elements.sort(key=lambda el: el["y0"])

            for el in all_elements:
                if el["type"] == "text":
                    b = el["data"]
                    for line in b["lines"]:
                        p = doc.add_paragraph()
                        line_center = (b["x0"] + b["x1"]) / 2
                        if abs(line_center - page_width / 2) < 40:
                            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                        p.paragraph_format.space_before = Pt(1)
                        p.paragraph_format.space_after = Pt(2)
                        for s in line["spans"]:
                            run = p.add_run(s["text"])
                            run.bold = s["bold"]
                            run.italic = s["italic"]
                            run.font.size = Pt(s["size"])
                            if s.get("font"):
                                run.font.name = s["font"]
                            if s["color"] != (0, 0, 0):
                                run.font.color.rgb = RGBColor(*s["color"])
                elif el["type"] == "image":
                    im = el["data"]
                    p = doc.add_paragraph()
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    w_in = min(6.5, im["w_pts"] / 72.0)
                    h_in = (im["h_pts"] / im["w_pts"]) * w_in if im["w_pts"] > 0 else 2.0
                    p.add_run().add_picture(io.BytesIO(im["bytes"]), width=Inches(w_in), height=Inches(h_in))

    doc.save(docx_path)
    pdf_doc.close()

def convert_pdf_to_docx(pdf_path: str, docx_path: str):
    """
    Main entry point for converting PDF to Word DOCX.
    Strategy:
    1. Try pdf2docx converter with stream & lattice table parsing.
       pdf2docx provides exact typography, multi-column detection, and tables.
    2. Post-process to inject any missing images (e.g. photo on the right).
    3. If pdf2docx fails or produces invalid output, fallback to layout-aware banded converter.
    """
    converted_via_pdf2docx = False
    try:
        from pdf2docx import Converter
        cv = Converter(pdf_path)
        try:
            cv.convert(docx_path, multi_processing=False)
            converted_via_pdf2docx = os.path.exists(docx_path) and os.path.getsize(docx_path) > 200
        finally:
            cv.close()

        if converted_via_pdf2docx:
            # Post-process: ensure all images from the PDF are in the docx
            inject_missing_images_into_docx(pdf_path, docx_path)
            return
    except Exception as p2d_err:
        print(f"pdf2docx conversion note: {p2d_err}; switching to banded layout converter...", file=sys.stderr)

    # Fallback to banded layout-aware converter
    convert_pdf_to_docx_layout_aware(pdf_path, docx_path)

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_to_docx.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)

    input_pdf = sys.argv[1]
    output_docx = sys.argv[2]

    try:
        convert_pdf_to_docx(input_pdf, output_docx)
        print(f"SUCCESS: Converted {input_pdf} -> {output_docx}")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
