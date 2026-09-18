import sys
import os
import io
import pymupdf as fitz
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def convert_pdf_to_docx_layout_aware(pdf_path: str, docx_path: str):
    """
    High-fidelity layout-aware PDF to Word (.docx) converter.
    - Extracts all raster images (JPEG/PNG) with exact coordinates.
    - Preserves two-column resume / biodata visual templates:
        * Left column: Personal & family text details
        * Right column top: Candidate photo at original aspect ratio & dimensions
        * Right column bottom: Address, website & contact text
    - Preserves typography, bold/italic formatting, font sizes, and colors.
    """
    if not os.path.exists(pdf_path):
        raise FileNotFoundError(f"PDF file not found: {pdf_path}")

    pdf_doc = fitz.open(pdf_path)
    doc = docx.Document()

    # Set 0.5-inch standard margins
    for section in doc.sections:
        section.top_margin = Inches(0.5)
        section.bottom_margin = Inches(0.5)
        section.left_margin = Inches(0.5)
        section.right_margin = Inches(0.5)

    for page_idx in range(len(pdf_doc)):
        page = pdf_doc[page_idx]
        page_rect = page.rect
        page_width = page_rect.width
        page_height = page_rect.height

        if page_idx > 0:
            doc.add_page_break()

        # 1. Parse and extract raster image streams with X/Y bounding coordinates
        images_on_page = []
        img_infos = page.get_image_info(xrefs=True)
        seen_xrefs = set()

        for info in img_infos:
            bbox = info.get("bbox")
            xref = info.get("xref")
            if xref and xref > 0 and xref not in seen_xrefs:
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
                except Exception as img_err:
                    print(f"Warning extracting image xref {xref}: {img_err}", file=sys.stderr)

        # Also inspect inline images from page dict
        text_dict = page.get_text("dict")
        for b in text_dict.get("blocks", []):
            if b.get("type") == 1 and "image" in b:
                b_box = b.get("bbox")
                already = any(abs(im["x0"] - b_box[0]) < 2 and abs(im["y0"] - b_box[1]) < 2 for im in images_on_page)
                if not already:
                    w_pts = b_box[2] - b_box[0]
                    h_pts = b_box[3] - b_box[1]
                    images_on_page.append({
                        "bbox": b_box,
                        "bytes": b["image"],
                        "ext": b.get("ext", "png"),
                        "x0": b_box[0], "y0": b_box[1], "x1": b_box[2], "y1": b_box[3],
                        "w_pts": w_pts, "h_pts": h_pts
                    })

        # 2. Extract Text Blocks with Spans & Styling
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
                                "text": line_text
                            })
                if lines:
                    text_blocks.append({
                        "bbox": b.get("bbox"),
                        "lines": lines,
                        "x0": b["bbox"][0], "y0": b["bbox"][1],
                        "x1": b["bbox"][2], "y1": b["bbox"][3],
                    })

        # 3. Detect Two-Column Template (e.g. Candidate Photo on Right, Details on Left)
        right_images = [img for img in images_on_page if (img["x0"] + img["x1"]) / 2 > page_width * 0.40]
        left_text_blocks = [b for b in text_blocks if b["x1"] < page_width * 0.68 and b["x0"] < page_width * 0.55]
        right_text_blocks = [b for b in text_blocks if b["x0"] >= page_width * 0.45]

        is_two_column_template = len(right_images) > 0 or (len(left_text_blocks) > 0 and len(right_text_blocks) > 0)

        if is_two_column_template:
            # Determine top header boundary
            first_col_y = min(
                [img["y0"] for img in right_images] +
                [b["y0"] for b in left_text_blocks if b["y0"] > 40] +
                [160]
            )

            # Determine split boundary between left and right column
            if right_images:
                split_x = min(img["x0"] for img in right_images) - 10
            elif right_text_blocks:
                split_x = min(b["x0"] for b in right_text_blocks) - 10
            else:
                split_x = page_width * 0.60

            split_x = max(page_width * 0.45, min(page_width * 0.70, split_x))

            header_blocks = []
            left_col_blocks = []
            right_col_blocks = []

            for b in text_blocks:
                is_full_width = b["x0"] < page_width * 0.4 and b["x1"] > page_width * 0.6
                if b["y1"] <= first_col_y or (is_full_width and b["y0"] < first_col_y + 15):
                    header_blocks.append(b)
                elif (b["x0"] + b["x1"]) / 2 < split_x:
                    left_col_blocks.append(b)
                else:
                    right_col_blocks.append(b)

            # A. Full-Width Top Header
            header_blocks.sort(key=lambda b: b["y0"])
            for b in header_blocks:
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
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

            # B. Two-Column Table Layout
            table = doc.add_table(rows=1, cols=2)
            table.alignment = WD_TABLE_ALIGNMENT.CENTER

            # Invisible borders for clean visual layout
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

            # Total width ~7.2 inches across page
            left_width_in = (split_x / page_width) * 7.2
            right_width_in = 7.2 - left_width_in

            cell_left = table.cell(0, 0)
            cell_right = table.cell(0, 1)
            cell_left.width = Inches(left_width_in)
            cell_right.width = Inches(right_width_in)

            # 1. Left column: Personal and family text details
            left_col_blocks.sort(key=lambda b: b["y0"])
            first_left_p = True
            for b in left_col_blocks:
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
                        if s["color"] != (0, 0, 0):
                            run.font.color.rgb = RGBColor(*s["color"])

            # 2. Right column top: Candidate photo
            first_right_p = True
            if right_images:
                photo = right_images[0]
                p_photo = cell_right.paragraphs[0]
                first_right_p = False
                p_photo.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p_photo.paragraph_format.space_before = Pt(2)
                p_photo.paragraph_format.space_after = Pt(8)

                # Maintain original aspect ratio and dimensions
                max_w_in = min(right_width_in * 0.92, 2.5)
                img_w_in = photo["w_pts"] / 72.0
                img_h_in = photo["h_pts"] / 72.0

                if img_w_in > max_w_in:
                    scale = max_w_in / img_w_in
                    img_w_in = max_w_in
                    img_h_in *= scale

                run_img = p_photo.add_run()
                run_img.add_picture(io.BytesIO(photo["bytes"]), width=Inches(img_w_in), height=Inches(img_h_in))

            # 3. Right column bottom: Address, website & contact text
            right_col_blocks.sort(key=lambda b: b["y0"])
            for b in right_col_blocks:
                for line in b["lines"]:
                    p = cell_right.paragraphs[0] if first_right_p else cell_right.add_paragraph()
                    first_right_p = False
                    p.paragraph_format.space_before = Pt(1)
                    p.paragraph_format.space_after = Pt(2)
                    p.paragraph_format.line_spacing = 1.15
                    for s in line["spans"]:
                        run = p.add_run(s["text"])
                        run.bold = s["bold"]
                        run.italic = s["italic"]
                        run.font.size = Pt(s["size"])
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
    Tries layout-aware converter first, with pdf2docx fallback.
    """
    try:
        convert_pdf_to_docx_layout_aware(pdf_path, docx_path)
        # Verify the docx was written
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 100:
            return
    except Exception as layout_err:
        print(f"Layout converter note: {layout_err}; trying pdf2docx fallback...", file=sys.stderr)

    # Fallback to pdf2docx
    from pdf2docx import Converter
    cv = Converter(pdf_path)
    try:
        cv.convert(docx_path, start=0, end=None)
    finally:
        cv.close()

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
