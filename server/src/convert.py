import sys
import os
import io
import math
import zipfile
import subprocess
import pymupdf as fitz
import docx
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import parse_xml, OxmlElement
from docx.oxml.ns import nsdecls, qn

A4_W_PT = 595.28
A4_H_PT = 841.89

def map_font_name(pdf_font: str) -> str:
    name = (pdf_font or "").lower()
    if "times" in name:
        return "Times New Roman"
    elif "arial" in name:
        return "Arial"
    elif "calibri" in name:
        return "Calibri"
    elif "helvetica" in name or "helv" in name:
        return "Helvetica"
    elif "courier" in name:
        return "Courier New"
    elif "georgia" in name:
        return "Georgia"
    elif "verdana" in name:
        return "Verdana"
    elif "tahoma" in name:
        return "Tahoma"
    elif "cambria" in name:
        return "Cambria"
    elif "garamond" in name:
        return "Garamond"
    return "Times New Roman" if "roman" in name else "Arial"

def int_to_rgb(color_int: int):
    if color_int is None or color_int < 0:
        return RGBColor(0, 0, 0)
    r = (color_int >> 16) & 255
    g = (color_int >> 8) & 255
    b = color_int & 255
    return RGBColor(r, g, b)

def remove_table_borders(table):
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="none"/><w:left w:val="none"/><w:bottom w:val="none"/><w:right w:val="none"/>
            <w:insideH w:val="none"/><w:insideV w:val="none"/>
        </w:tblBorders>
    ''')
    tblPr.append(tblBorders)

def set_table_grid_borders(table, color="B0C4DE", sz="6"):
    tblPr = table._tbl.tblPr
    tblBorders = parse_xml(f'''
        <w:tblBorders {nsdecls("w")}>
            <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideH w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
            <w:insideV w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>
        </w:tblBorders>
    ''')
    tblPr.append(tblBorders)

def set_cell_margins(cell, top=30, bottom=30, left=40, right=40):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''
        <w:tcMar {nsdecls("w")}>
            <w:top w:w="{top}" w:type="dxa"/>
            <w:bottom w:w="{bottom}" w:type="dxa"/>
            <w:left w:w="{left}" w:type="dxa"/>
            <w:right w:w="{right}" w:type="dxa"/>
        </w:tcMar>
    ''')
    tcPr.append(tcMar)

def convert_scanned_pdf_to_docx(pdf_path: str, docx_path: str):
    """Fallback for 100% scanned PDFs: 300 DPI high-resolution canvas."""
    pdf_doc = fitz.open(pdf_path)
    doc = docx.Document()

    for idx, page in enumerate(pdf_doc):
        rect = page.rect
        w_in = rect.width / 72.0
        h_in = rect.height / 72.0
        if w_in > 20.0 or h_in > 20.0:
            scale = A4_W_PT / rect.width
            w_in = A4_W_PT / 72.0
            h_in = (rect.height * scale) / 72.0

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

        pix = page.get_pixmap(dpi=300)
        p = doc.add_paragraph()
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(0)
        run = p.add_run()
        run.add_picture(io.BytesIO(pix.tobytes("png")), width=Inches(w_in), height=Inches(h_in))

    pdf_doc.close()
    doc.save(docx_path)

def convert_universal_pdf_to_docx(pdf_path: str, docx_path: str):
    pdf_doc = fitz.open(pdf_path)
    total_text = ""
    for p in pdf_doc:
        total_text += p.get_text().strip()

    if len(total_text) < 10 and len(pdf_doc) > 0:
        pdf_doc.close()
        convert_scanned_pdf_to_docx(pdf_path, docx_path)
        return

    doc = docx.Document()

    for page_idx, page in enumerate(pdf_doc):
        rect = page.rect
        orig_w = rect.width
        orig_h = rect.height

        # Geometry Normalization
        if orig_w > 1200 or orig_h > 1200:
            scale = A4_W_PT / orig_w
            target_w_in = A4_W_PT / 72.0
            target_h_in = (orig_h * scale) / 72.0
        else:
            scale = 1.0
            target_w_in = orig_w / 72.0
            target_h_in = orig_h / 72.0

        page_w_pt = orig_w * scale
        page_h_pt = orig_h * scale

        if page_idx == 0:
            sec = doc.sections[0]
        else:
            doc.add_page_break()
            sec = doc.add_section()

        sec.page_width = Inches(target_w_in)
        sec.page_height = Inches(target_h_in)
        sec.orientation = docx.enum.section.WD_ORIENT.LANDSCAPE if target_w_in > target_h_in else docx.enum.section.WD_ORIENT.PORTRAIT
        
        margin_in = 0.75 if target_w_in <= 8.5 else 0.95
        sec.top_margin = Inches(0.65)
        sec.bottom_margin = Inches(0.65)
        sec.left_margin = Inches(margin_in)
        sec.right_margin = Inches(margin_in)
        sec.header_distance = Inches(0)
        sec.footer_distance = Inches(0)

        # 1. Images
        bg_image = None
        content_images = []
        for info in page.get_image_info(xrefs=True):
            xref = info.get("xref")
            bbox = info.get("bbox")
            if not xref or not bbox: continue
            try:
                extracted = pdf_doc.extract_image(xref)
                if not extracted or not extracted.get("image"): continue
                s_bbox = [c * scale for c in bbox]
                img_data = {
                    "xref": xref,
                    "bbox": s_bbox,
                    "bytes": extracted["image"],
                    "w_pts": s_bbox[2] - s_bbox[0],
                    "h_pts": s_bbox[3] - s_bbox[1],
                    "x0": s_bbox[0], "y0": s_bbox[1],
                    "x1": s_bbox[2], "y1": s_bbox[3]
                }
                if (s_bbox[0] < page_w_pt * 0.08 and s_bbox[1] < page_h_pt * 0.08 and 
                    s_bbox[2] > page_w_pt * 0.85 and s_bbox[3] > page_h_pt * 0.85):
                    bg_image = img_data
                else:
                    content_images.append(img_data)
            except Exception:
                pass

        if bg_image:
            header = sec.header
            p_head = header.paragraphs[0]
            p_head.paragraph_format.space_before = Pt(0)
            p_head.paragraph_format.space_after = Pt(0)
            run_head = p_head.add_run()
            pic = run_head.add_picture(io.BytesIO(bg_image["bytes"]), width=Inches(target_w_in), height=Inches(target_h_in))
            inline = pic._inline
            cx = int(target_w_in * 914400)
            cy = int(target_h_in * 914400)
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

        # 2. Extract Grid Tables
        detected_tables = []
        try:
            tabs = page.find_tables()
            for t in tabs.tables:
                t_bbox = [c * scale for c in t.bbox]
                rows_data = t.extract()
                if rows_data and len(rows_data) > 0 and len(rows_data[0]) > 1:
                    detected_tables.append({
                        "bbox": t_bbox,
                        "rows": rows_data,
                        "col_count": len(rows_data[0]),
                        "row_count": len(rows_data),
                        "y0": t_bbox[1],
                        "y1": t_bbox[3]
                    })
        except Exception:
            pass

        # 3. Extract Drawings & Highlight Rectangles
        highlights = []
        for d in page.get_drawings():
            fill = d.get("fill")
            if fill:
                r = [c * scale for c in d["rect"]]
                fill_hex = f"{int(fill[0]*255):02X}{int(fill[1]*255):02X}{int(fill[2]*255):02X}"
                highlights.append({
                    "bbox": r,
                    "fill_hex": fill_hex,
                    "w": r[2] - r[0],
                    "h": r[3] - r[1]
                })

        # 4. Extract Text Spans
        text_dict = page.get_text("dict")
        raw_spans = []
        for b in text_dict.get("blocks", []):
            if b.get("type") == 0:
                for l in b.get("lines", []):
                    for s in l.get("spans", []):
                        t = s.get("text", "")
                        if t.strip():
                            c_int = s.get("color", 0)
                            rgb = int_to_rgb(c_int)
                            s_bbox = [c * scale for c in s.get("bbox", [0,0,0,0])]
                            inside_grid_table = any(
                                dt["bbox"][0] <= s_bbox[0] and dt["bbox"][2] >= s_bbox[2] and
                                dt["bbox"][1] <= s_bbox[1] and dt["bbox"][3] >= s_bbox[3]
                                for dt in detected_tables
                            )
                            if not inside_grid_table:
                                raw_spans.append({
                                    "text": t,
                                    "font": map_font_name(s.get("font", "")),
                                    "size_pt": s.get("size", 12) * scale,
                                    "bold": bool(s.get("flags", 0) & 2) or "bold" in s.get("font", "").lower(),
                                    "italic": bool(s.get("flags", 0) & 1) or "italic" in s.get("font", "").lower(),
                                    "rgb": rgb,
                                    "bbox": s_bbox,
                                    "x0": s_bbox[0], "y0": s_bbox[1],
                                    "x1": s_bbox[2], "y1": s_bbox[3]
                                })

        raw_spans.sort(key=lambda s: (s["y0"], s["x0"]))
        lines_by_y = []
        for s in raw_spans:
            placed = False
            for line in lines_by_y:
                avg_y = sum(item["y0"] for item in line) / len(line)
                if abs(s["y0"] - avg_y) <= 5.0:
                    line.append(s)
                    line.sort(key=lambda item: item["x0"])
                    placed = True
                    break
            if not placed:
                lines_by_y.append([s])

        lines_by_y.sort(key=lambda line: sum(item["y0"] for item in line) / len(line))

        # Check side-by-side floating image (e.g. photo/badge in upper right)
        photo_img = None
        other_images = []
        for img in content_images:
            if img["x0"] > page_w_pt * 0.45 and img["y0"] < page_h_pt * 0.55:
                photo_img = img
            else:
                other_images.append(img)

        usable_w_in = target_w_in - (2 * margin_in)

        # 3 VERTICAL ZONES for side-by-side image:
        # Zone 1: Above image
        # Zone 2: Alongside image (left of image)
        # Zone 3: Below image
        lines_above_photo = []
        lines_alongside_photo = []
        lines_below_photo = []

        if photo_img:
            photo_y_start = photo_img["y0"] - 8.0
            photo_y_end = photo_img["y1"] + 8.0

            for line in lines_by_y:
                line_y = sum(s["y0"] for s in line) / len(line)
                line_x_max = max(s["x1"] for s in line)

                if line_y < photo_y_start:
                    lines_above_photo.append(line)
                elif line_y <= photo_y_end:
                    if line_x_max <= photo_img["x0"] + 15:
                        lines_alongside_photo.append(line)
                    else:
                        lines_above_photo.append(line)
                else:
                    lines_below_photo.append(line)
        else:
            lines_below_photo = lines_by_y

        def render_section_lines(container, lines_to_render, container_w_in, is_table_cell=False):
            idx = 0
            while idx < len(lines_to_render):
                line = lines_to_render[idx]
                line_txt = " ".join(s["text"] for s in line).strip()
                f0 = line[0]

                # 1. Section Header Banner with highlight background
                hl_match = None
                for hl in highlights:
                    if (hl["bbox"][0] <= f0["x0"] + 25 and hl["bbox"][2] >= line[-1]["x1"] - 25 and
                        hl["bbox"][1] <= f0["y0"] + 12 and hl["bbox"][3] >= f0["y1"] - 12):
                        hl_match = hl
                        break

                if hl_match:
                    p = container.add_paragraph()
                    p.paragraph_format.space_before = Pt(6)
                    p.paragraph_format.space_after = Pt(2)
                    pPr = p._p.get_or_add_pPr()
                    pPr.append(parse_xml(f'<w:shd {nsdecls("w")} w:val="clear" w:color="auto" w:fill="{hl_match["fill_hex"]}"/>'))
                    
                    r = p.add_run("  " + line_txt + "  ")
                    r.bold = True
                    r.font.name = f0["font"]
                    r.font.size = Pt(f0["size_pt"])
                    r.font.color.rgb = f0["rgb"]
                    idx += 1
                    continue

                # 2. Key-Value Rows (e.g., "Name" -> "Shakuntala", "Father's Name" -> "Bhaiyalal")
                kv_group = []
                while idx < len(lines_to_render):
                    cur_line = lines_to_render[idx]
                    cur_f0 = cur_line[0]
                    is_next_hl = any(
                        hl["bbox"][0] <= cur_f0["x0"] + 25 and hl["bbox"][2] >= cur_line[-1]["x1"] - 25 and
                        hl["bbox"][1] <= cur_f0["y0"] + 12 and hl["bbox"][3] >= cur_line[-1]["y1"] - 12
                        for hl in highlights
                    )
                    if is_next_hl:
                        break

                    # Check for Key-Value pattern
                    if len(cur_line) >= 2 and (cur_line[1]["x0"] - cur_line[0]["x1"]) > 18:
                        k_span = cur_line[0]
                        v_spans = cur_line[1:]
                        k_txt = k_span["text"].strip()
                        v_txt = " ".join(s["text"] for s in v_spans).strip()
                        kv_group.append([k_txt, v_txt, k_span, v_spans[0]])
                        idx += 1
                    elif ":" in " ".join(s["text"] for s in cur_line):
                        parts = " ".join(s["text"] for s in cur_line).split(":", 1)
                        kv_group.append([parts[0].strip(), parts[1].strip(), cur_line[0], cur_line[-1]])
                        idx += 1
                    elif kv_group and cur_f0["x0"] >= 260 * scale:
                        cont_txt = " ".join(s["text"] for s in cur_line).strip()
                        kv_group[-1][1] += " " + cont_txt
                        idx += 1
                    else:
                        break

                if kv_group:
                    if is_table_cell:
                        # Inside a table cell, render key-values as clean paragraphs with bold label
                        for (k_txt, v_txt, k_s, v_s) in kv_group:
                            p = container.add_paragraph()
                            p.paragraph_format.space_before = Pt(1.5)
                            p.paragraph_format.space_after = Pt(1.5)
                            rk = p.add_run(k_txt + ": ")
                            rk.bold = True
                            rk.font.name = k_s["font"]
                            rk.font.size = Pt(k_s["size_pt"])
                            rk.font.color.rgb = k_s["rgb"]
                            rv = p.add_run(v_txt)
                            rv.bold = v_s["bold"]
                            rv.font.name = v_s["font"]
                            rv.font.size = Pt(v_s["size_pt"])
                            rv.font.color.rgb = v_s["rgb"]
                    else:
                        # In document body, render as clean 2-column Word table
                        tbl_kv = container.add_table(rows=len(kv_group), cols=2)
                        tbl_kv.alignment = WD_TABLE_ALIGNMENT.LEFT
                        remove_table_borders(tbl_kv)
                        
                        lbl_w_in = min(1.75, container_w_in * 0.42)
                        val_w_in = container_w_in - lbl_w_in

                        for r_idx, (k_txt, v_txt, k_s, v_s) in enumerate(kv_group):
                            row = tbl_kv.rows[r_idx]
                            c_k = row.cells[0]
                            c_v = row.cells[1]
                            c_k.width = Inches(lbl_w_in)
                            c_v.width = Inches(val_w_in)
                            set_cell_margins(c_k, top=25, bottom=25, left=20, right=20)
                            set_cell_margins(c_v, top=25, bottom=25, left=20, right=20)

                            pk = c_k.paragraphs[0]
                            pk.paragraph_format.space_before = Pt(1.5)
                            pk.paragraph_format.space_after = Pt(1.5)
                            rk = pk.add_run(k_txt)
                            rk.bold = True
                            rk.font.name = k_s["font"]
                            rk.font.size = Pt(k_s["size_pt"])
                            rk.font.color.rgb = k_s["rgb"]

                            pv = c_v.paragraphs[0]
                            pv.paragraph_format.space_before = Pt(1.5)
                            pv.paragraph_format.space_after = Pt(1.5)
                            rv = pv.add_run(v_txt)
                            rv.bold = v_s["bold"]
                            rv.font.name = v_s["font"]
                            rv.font.size = Pt(v_s["size_pt"])
                            rv.font.color.rgb = v_s["rgb"]
                    continue

                # 3. Regular Paragraph
                cur_line = lines_to_render[idx]
                p = container.add_paragraph()
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.space_after = Pt(2)
                
                line_txt = " ".join(s["text"] for s in cur_line).strip()
                mid_x = (cur_line[0]["x0"] + cur_line[-1]["x1"]) / 2.0
                if abs(mid_x - (page_w_pt / 2.0)) < 40 and ("http" in line_txt or ".in" in line_txt or ".com" in line_txt or "page" in line_txt.lower()):
                    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                    p.paragraph_format.space_before = Pt(20)

                for s in cur_line:
                    r = p.add_run(s["text"] + " ")
                    r.bold = s["bold"]
                    r.italic = s["italic"]
                    r.font.name = s["font"]
                    r.font.size = Pt(s["size_pt"])
                    r.font.color.rgb = s["rgb"]
                idx += 1

        # Execution Sequence per Page:
        # Zone 1: Above Photo (Title, Subtitle, Headers)
        if lines_above_photo:
            render_section_lines(doc, lines_above_photo, usable_w_in, is_table_cell=False)

        # Zone 2: Side-by-Side Photo Band (Left Overview/Details + Right Photo)
        if photo_img and lines_alongside_photo:
            photo_w_in = photo_img["w_pts"] / 72.0
            left_w_in = usable_w_in - photo_w_in - 0.2

            top_tbl = doc.add_table(rows=1, cols=2)
            top_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
            remove_table_borders(top_tbl)
            
            c_left = top_tbl.cell(0, 0)
            c_right = top_tbl.cell(0, 1)
            c_left.width = Inches(left_w_in)
            c_right.width = Inches(photo_w_in + 0.2)
            set_cell_margins(c_left, top=0, bottom=0, left=0, right=80)
            set_cell_margins(c_right, top=0, bottom=0, left=80, right=0)

            render_section_lines(c_left, lines_alongside_photo, left_w_in, is_table_cell=True)

            p_pic = c_right.paragraphs[0]
            p_pic.alignment = WD_ALIGN_PARAGRAPH.RIGHT
            p_pic.paragraph_format.space_before = Pt(0)
            p_pic.paragraph_format.space_after = Pt(0)
            run_pic = p_pic.add_run()
            photo_h_in = photo_img["h_pts"] / 72.0
            run_pic.add_picture(io.BytesIO(photo_img["bytes"]), width=Inches(photo_w_in), height=Inches(photo_h_in))

        # Zone 3: Interleaved Grid Tables & Content below photo
        # Merge Grid Tables and Remaining Lines by Y-coordinate
        events = []
        for dt in detected_tables:
            events.append({"type": "table", "y": dt["y0"], "data": dt})
        
        # Group remaining lines into blocks
        if lines_below_photo:
            events.append({"type": "lines", "y": lines_below_photo[0][0]["y0"], "data": lines_below_photo})

        events.sort(key=lambda e: e["y"])

        for ev in events:
            if ev["type"] == "table":
                dt = ev["data"]
                grid_tbl = doc.add_table(rows=dt["row_count"], cols=dt["col_count"])
                grid_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
                set_table_grid_borders(grid_tbl, color="B0C4DE", sz="6")
                
                col_w_in = usable_w_in / dt["col_count"]
                for r_i, row_data in enumerate(dt["rows"]):
                    row = grid_tbl.rows[r_i]
                    is_header = (r_i == 0)
                    for c_i, val in enumerate(row_data):
                        cell = row.cells[c_i]
                        cell.width = Inches(col_w_in)
                        set_cell_margins(cell, top=50, bottom=50, left=60, right=60)
                        if is_header:
                            cell._tc.get_or_add_tcPr().append(parse_xml(r'<w:shd %s w:val="clear" w:color="auto" w:fill="EBF2FA"/>' % nsdecls('w')))
                        
                        cp = cell.paragraphs[0]
                        cp.paragraph_format.space_before = Pt(2)
                        cp.paragraph_format.space_after = Pt(2)
                        c_run = cp.add_run(str(val or "").strip())
                        c_run.font.name = "Arial"
                        c_run.font.size = Pt(9.5)
                        if is_header:
                            c_run.bold = True
                            c_run.font.color.rgb = RGBColor(0, 52, 121)
                        else:
                            txt_str = str(val or "").strip()
                            if txt_str in ["PASSED", "EXCELLENT", "PERFECT"]:
                                c_run.bold = True
                                c_run.font.color.rgb = RGBColor(0, 128, 50)
            elif ev["type"] == "lines":
                render_section_lines(doc, ev["data"], usable_w_in, is_table_cell=False)

        # Other content images (logos, illustrations)
        for img in other_images:
            p_img = doc.add_paragraph()
            p_img.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p_img.paragraph_format.space_before = Pt(4)
            p_img.paragraph_format.space_after = Pt(4)
            r_img = p_img.add_run()
            img_w_in = min(usable_w_in, img["w_pts"] / 72.0)
            img_h_in = (img["h_pts"] / img["w_pts"]) * img_w_in if img["w_pts"] > 0 else 2.0
            r_img.add_picture(io.BytesIO(img["bytes"]), width=Inches(img_w_in), height=Inches(img_h_in))

    pdf_doc.close()
    doc.save(docx_path)
def convert_pdf_to_docx_engine(pdf_path: str, docx_path: str):
    # Step 1: Inspect the source PDF to count images and detect special visual layouts
    total_images = 0
    has_photo_or_bg = False
    try:
        pdf_inspect = fitz.open(pdf_path)
        for page in pdf_inspect:
            rect = page.rect
            img_infos = page.get_image_info(xrefs=True)
            total_images += len(img_infos)
            for info in img_infos:
                bbox = info.get("bbox", [0, 0, 0, 0])
                w = bbox[2] - bbox[0]
                h = bbox[3] - bbox[1]
                # Check for full-page background frame or right-side photo
                if (w > rect.width * 0.7 and h > rect.height * 0.7) or (bbox[0] > rect.width * 0.4 and bbox[1] < rect.height * 0.6):
                    has_photo_or_bg = True
        pdf_inspect.close()
    except Exception as e:
        print(f"PDF inspection notice: {e}", file=sys.stderr)

    # If the PDF has background frames, floating photo, or visual profile layout,
    # universal engine is guaranteed to preserve 100% of images and side-by-side formatting
    if has_photo_or_bg:
        try:
            print("Detected visual profile/photo/background layout: prioritizing universal engine...", file=sys.stderr)
            convert_universal_pdf_to_docx(pdf_path, docx_path)
            if os.path.exists(docx_path) and os.path.getsize(docx_path) > 500:
                with zipfile.ZipFile(docx_path) as z:
                    docx_media = [f for f in z.namelist() if f.startswith('word/media/')]
                if len(docx_media) >= total_images or total_images == 0:
                    print(f"SUCCESS: Universal layout conversion complete with all {len(docx_media)} visuals: {docx_path}")
                    return
        except Exception as e:
            print(f"Universal layout engine notice: {e}, falling back to pdf2docx...", file=sys.stderr)

    # Tier 1: Try pdf2docx
    try:
        from pdf2docx import Converter
        cv = Converter(pdf_path)
        cv.convert(docx_path)
        cv.close()
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 500:
            with zipfile.ZipFile(docx_path) as z:
                docx_media = [f for f in z.namelist() if f.startswith('word/media/')]
            # Ensure pdf2docx did not drop images
            if len(docx_media) >= total_images:
                print(f"SUCCESS: pdf2docx conversion complete with all {len(docx_media)} visuals: {docx_path}")
                return
            else:
                print(f"pdf2docx dropped images ({len(docx_media)} in docx vs {total_images} in PDF); falling back to universal engine...", file=sys.stderr)
    except Exception as e:
        print(f"pdf2docx notice: {e}, falling back to universal engine...", file=sys.stderr)

    # Tier 2: PyMuPDF universal heuristic layout parser (with embedded images & tables)
    try:
        convert_universal_pdf_to_docx(pdf_path, docx_path)
        if os.path.exists(docx_path) and os.path.getsize(docx_path) > 500:
            print(f"SUCCESS: Universal layout conversion complete: {docx_path}")
            return
    except Exception as e:
        print(f"Universal layout engine notice: {e}, falling back to high-res visual engine...", file=sys.stderr)

    # Tier 3: 300 DPI High-Resolution Visual Layout Engine
    convert_scanned_pdf_to_docx(pdf_path, docx_path)
    print(f"SUCCESS: High-res visual conversion complete: {docx_path}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python convert.py <input_pdf> <output_docx>", file=sys.stderr)
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2]

    try:
        convert_pdf_to_docx_engine(input_file, output_file)
        if os.path.exists(output_file) and os.path.getsize(output_file) > 100:
            sys.exit(0)
        else:
            print("ERROR: Output file not created or is empty.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)

