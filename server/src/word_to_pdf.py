import sys
import os
import io
import docx
from docx.shared import Inches, Pt, RGBColor
import pymupdf as fitz

A4_W = 595.28
A4_H = 841.89

def convert_word_to_pdf(docx_path: str, pdf_path: str):
    doc = docx.Document(docx_path)
    pdf_doc = fitz.open()

    margin_left = 46.0
    margin_right = 46.0
    margin_top = 50.0
    margin_bottom = 50.0
    content_w = A4_W - margin_left - margin_right

    current_page = pdf_doc.new_page(width=A4_W, height=A4_H)
    current_y = margin_top
    page_num = 1

    def ensure_space(needed_h: float):
        nonlocal current_page, current_y, page_num
        if (current_y + needed_h) > (A4_H - margin_bottom):
            # Draw footer on finished page
            current_page.insert_text(
                (margin_left, A4_H - 24),
                f"Page {page_num}",
                fontsize=8,
                fontname="helv",
                color=(0.5, 0.5, 0.5)
            )
            current_page = pdf_doc.new_page(width=A4_W, height=A4_H)
            current_y = margin_top
            page_num += 1

    for elem in doc.element.body:
        tag = elem.tag.split("}")[-1] if "}" in elem.tag else elem.tag

        if tag == "p":
            p = docx.text.paragraph.Paragraph(elem, doc)
            text = p.text.strip()
            if not text:
                current_y += 8.0 # Empty line spacing
                continue

            style_name = (p.style.name or "").lower() if p.style else ""
            
            # Determine typography
            font_size = 10.5
            is_bold = False
            is_heading = False
            text_color = (0.15, 0.15, 0.18)

            if "title" in style_name:
                font_size = 20.0
                is_bold = True
                is_heading = True
                text_color = (0.06, 0.25, 0.49) # Brand Navy
            elif "heading 1" in style_name:
                font_size = 15.0
                is_bold = True
                is_heading = True
                text_color = (0.06, 0.25, 0.49)
            elif "heading 2" in style_name:
                font_size = 13.0
                is_bold = True
                is_heading = True
                text_color = (0.1, 0.2, 0.35)
            elif "heading 3" in style_name:
                font_size = 11.5
                is_bold = True
                is_heading = True
            else:
                # Check run-level formatting
                if p.runs and any(r.bold for r in p.runs):
                    is_bold = True

            line_height = font_size * 1.35
            before_space = 14.0 if is_heading else 4.0
            after_space = 8.0 if is_heading else 4.0

            ensure_space(before_space + line_height + after_space)
            current_y += before_space

            # Wrap long paragraph into lines
            max_chars_per_line = int(content_w / (font_size * 0.52))
            words = text.split()
            lines = []
            cur_line = []
            cur_len = 0
            for w in words:
                if cur_len + len(w) + 1 <= max_chars_per_line:
                    cur_line.append(w)
                    cur_len += len(w) + 1
                else:
                    if cur_line:
                        lines.append(" ".join(cur_line))
                    cur_line = [w]
                    cur_len = len(w)
            if cur_line:
                lines.append(" ".join(cur_line))

            for l in lines:
                ensure_space(line_height)
                font_key = "helv"
                current_page.insert_text(
                    (margin_left, current_y + font_size),
                    l,
                    fontsize=font_size,
                    fontname=font_key,
                    color=text_color
                )
                current_y += line_height

            current_y += after_space

        elif tag == "tbl":
            table = docx.table.Table(elem, doc)
            rows = table.rows
            if not rows:
                continue

            col_count = len(table.columns)
            if col_count == 0:
                continue

            col_w = content_w / col_count
            row_h = 22.0

            ensure_space(row_h * min(len(rows), 3) + 10.0)
            current_y += 6.0

            for r_idx, row in enumerate(rows):
                ensure_space(row_h)
                is_header_row = (r_idx == 0)
                bg_color = (0.10, 0.22, 0.38) if is_header_row else ((0.97, 0.98, 1.0) if r_idx % 2 == 1 else (1, 1, 1))
                txt_color = (1, 1, 1) if is_header_row else (0.15, 0.15, 0.18)

                # Draw row background
                row_rect = fitz.Rect(margin_left, current_y, margin_left + content_w, current_y + row_h)
                current_page.draw_rect(row_rect, color=None, fill=bg_color)

                x_cur = margin_left
                for c_idx, cell in enumerate(row.cells):
                    cell_txt = cell.text.strip()
                    display_txt = cell_txt if len(cell_txt) <= 28 else cell_txt[:26] + ".."
                    
                    current_page.insert_text(
                        (x_cur + 6, current_y + 15),
                        display_txt,
                        fontsize=9 if is_header_row else 8.5,
                        fontname="helv",
                        color=txt_color
                    )

                    # Vertical border
                    if c_idx < col_count - 1:
                        current_page.draw_line(
                            fitz.Point(x_cur + col_w, current_y),
                            fitz.Point(x_cur + col_w, current_y + row_h),
                            color=(0.85, 0.88, 0.92),
                            width=0.5
                        )
                    x_cur += col_w

                # Bottom horizontal line
                current_page.draw_line(
                    fitz.Point(margin_left, current_y + row_h),
                    fitz.Point(margin_left + content_w, current_y + row_h),
                    color=(0.80, 0.84, 0.88),
                    width=0.5
                )

                current_y += row_h

            # Outer table border
            current_y += 8.0

    # Final page footer
    current_page.insert_text(
        (margin_left, A4_H - 24),
        f"Page {page_num}",
        fontsize=8,
        fontname="helv",
        color=(0.5, 0.5, 0.5)
    )

    pdf_doc.save(pdf_path)
    pdf_doc.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python word_to_pdf.py <input_docx> <output_pdf>", file=sys.stderr)
        sys.exit(1)
    try:
        convert_word_to_pdf(sys.argv[1], sys.argv[2])
        if os.path.exists(sys.argv[2]) and os.path.getsize(sys.argv[2]) > 100:
            print("SUCCESS: Word to PDF conversion complete.")
            sys.exit(0)
        else:
            print("ERROR: Generated PDF is empty.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
