import sys
import os
import io
import csv
import math
import openpyxl
from openpyxl.utils import get_column_letter
import pymupdf as fitz

A4_PORTRAIT = (595.28, 841.89)
A4_LANDSCAPE = (841.89, 595.28)

def convert_excel_to_pdf(excel_path: str, pdf_path: str):
    ext = os.path.splitext(excel_path)[1].lower()
    
    sheets_data = [] # List of { name: str, rows: List[List[str]] }

    if ext == ".csv":
        # Handle CSV
        rows = []
        try:
            with open(excel_path, "r", encoding="utf-8-sig") as f:
                reader = csv.reader(f)
                for r in reader:
                    rows.append([str(c).strip() for c in r])
        except Exception:
            with open(excel_path, "r", encoding="latin-1") as f:
                reader = csv.reader(f)
                for r in reader:
                    rows.append([str(c).strip() for c in r])
        base_name = os.path.basename(excel_path)
        sheets_data.append({"name": os.path.splitext(base_name)[0], "rows": rows})
    else:
        # Handle XLSX / XLSM
        wb = openpyxl.load_workbook(excel_path, data_only=True)
        for sheet_name in wb.sheetnames:
            ws = wb[sheet_name]
            sheet_rows = []
            for row in ws.iter_rows(values_only=True):
                # Only include non-empty rows
                str_row = ["" if cell is None else str(cell).strip() for cell in row]
                if any(bool(c) for c in str_row):
                    sheet_rows.append(str_row)
            if sheet_rows:
                sheets_data.append({"name": sheet_name, "rows": sheet_rows})

    if not sheets_data:
        raise ValueError("The uploaded spreadsheet does not contain any readable data.")

    pdf_doc = fitz.open()

    for sheet_idx, sheet in enumerate(sheets_data):
        sheet_name = sheet["name"]
        rows = sheet["rows"]
        if not rows:
            continue

        # Standardize row lengths to max columns in this sheet
        max_cols = max(len(r) for r in rows)
        if max_cols == 0:
            continue

        norm_rows = []
        for r in rows:
            padded = r + [""] * (max_cols - len(r))
            norm_rows.append(padded)

        # Decide orientation: if > 6 columns, use Landscape; otherwise Portrait
        is_landscape = max_cols > 6
        page_w, page_h = A4_LANDSCAPE if is_landscape else A4_PORTRAIT

        # Margins
        margin_left = 36.0
        margin_right = 36.0
        margin_top = 40.0
        margin_bottom = 36.0
        content_w = page_w - margin_left - margin_right

        # Calculate column widths proportional to max string lengths
        col_max_lens = [3] * max_cols
        for r in norm_rows:
            for c_idx, val in enumerate(r):
                col_max_lens[c_idx] = max(col_max_lens[c_idx], min(len(val), 35))

        total_weight = sum(col_max_lens)
        col_widths = [(l / total_weight) * content_w for l in col_max_lens]
        # Ensure minimum column width
        min_col_w = 40.0
        for i in range(len(col_widths)):
            col_widths[i] = max(col_widths[i], min_col_w)
        # Rescale so total exactly fits content_w
        total_w = sum(col_widths)
        col_widths = [(w / total_w) * content_w for w in col_widths]

        # Row heights and styling constants
        header_h = 24.0
        row_h = 20.0
        title_h = 32.0

        current_row_idx = 0
        total_rows = len(norm_rows)
        headers = norm_rows[0]
        data_rows = norm_rows[1:] if len(norm_rows) > 1 else []

        page_num = 1
        while current_row_idx < len(norm_rows):
            page = pdf_doc.new_page(width=page_w, height=page_h)
            current_y = margin_top

            # Sheet Title Banner
            title_rect = fitz.Rect(margin_left, current_y, margin_left + content_w, current_y + title_h)
            page.draw_rect(title_rect, color=None, fill=fitz.pdfcolor["whitesmoke"])
            # Left decorative gold/navy bar
            accent_rect = fitz.Rect(margin_left, current_y, margin_left + 5, current_y + title_h)
            page.draw_rect(accent_rect, color=None, fill=(0.06, 0.25, 0.49)) # Navy
            
            # Title text
            page.insert_text(
                (margin_left + 14, current_y + 20),
                f"{sheet_name}" + (f"  (Continued - Page {page_num})" if page_num > 1 else ""),
                fontsize=13,
                fontname="helv",
                color=(0.06, 0.25, 0.49)
            )
            current_y += title_h + 10

            # Draw Header Row
            hdr_rect = fitz.Rect(margin_left, current_y, margin_left + content_w, current_y + header_h)
            page.draw_rect(hdr_rect, color=None, fill=(0.10, 0.22, 0.38)) # Dark Navy
            
            x_cursor = margin_left
            for c_idx, h_text in enumerate(headers):
                c_w = col_widths[c_idx]
                cell_rect = fitz.Rect(x_cursor, current_y, x_cursor + c_w, current_y + header_h)
                # Clip text to cell
                display_txt = h_text if len(h_text) <= 25 else h_text[:23] + ".."
                page.insert_text(
                    (x_cursor + 6, current_y + 16),
                    display_txt,
                    fontsize=9,
                    fontname="helv",
                    color=(1, 1, 1) # White bold-like
                )
                x_cursor += c_w
            current_y += header_h

            # If this is the very first page, we start from row 1 (the first data row)
            # If there are no data rows, we just break
            if current_row_idx == 0:
                current_row_idx = 1 # Already drew headers

            # Render data rows until page bottom
            max_y = page_h - margin_bottom - 20
            while current_row_idx < len(norm_rows) and (current_y + row_h) <= max_y:
                row_data = norm_rows[current_row_idx]
                # Alternating row background
                is_even = (current_row_idx % 2 == 0)
                bg_color = (0.97, 0.98, 1.0) if is_even else (1, 1, 1)
                
                row_rect = fitz.Rect(margin_left, current_y, margin_left + content_w, current_y + row_h)
                page.draw_rect(row_rect, color=None, fill=bg_color)

                x_cursor = margin_left
                for c_idx, cell_val in enumerate(row_data):
                    c_w = col_widths[c_idx]
                    # Right-align if numeric, else left-align
                    is_num = False
                    try:
                        float(cell_val.replace(",", "").replace("$", "").replace("₹", "").replace("%", ""))
                        is_num = True
                    except Exception:
                        is_num = False

                    display_val = cell_val if len(cell_val) <= 30 else cell_val[:28] + ".."
                    
                    if is_num and len(display_val) < 18:
                        text_w = len(display_val) * 5.0
                        pos_x = max(x_cursor + 4, x_cursor + c_w - text_w - 6)
                    else:
                        pos_x = x_cursor + 6

                    page.insert_text(
                        (pos_x, current_y + 14),
                        display_val,
                        fontsize=8.5,
                        fontname="helv",
                        color=(0.15, 0.15, 0.18)
                    )

                    # Subtle cell vertical right separator
                    if c_idx < max_cols - 1:
                        page.draw_line(
                            fitz.Point(x_cursor + c_w, current_y),
                            fitz.Point(x_cursor + c_w, current_y + row_h),
                            color=(0.88, 0.90, 0.93),
                            width=0.4
                        )

                    x_cursor += c_w

                # Subtle row bottom line
                page.draw_line(
                    fitz.Point(margin_left, current_y + row_h),
                    fitz.Point(margin_left + content_w, current_y + row_h),
                    color=(0.85, 0.88, 0.92),
                    width=0.5
                )

                current_y += row_h
                current_row_idx += 1

            # Outer table border
            page.draw_rect(
                fitz.Rect(margin_left, margin_top + title_h + 10, margin_left + content_w, current_y),
                color=(0.7, 0.75, 0.82),
                width=0.75
            )

            # Footer: Page number and branding
            footer_txt = f"PDF Editor by UIKEY AI  •  Sheet: {sheet_name}  •  Page {page_num}"
            page.insert_text(
                (margin_left, page_h - 18),
                footer_txt,
                fontsize=7.5,
                fontname="helv",
                color=(0.55, 0.58, 0.64)
            )

            page_num += 1

    pdf_doc.save(pdf_path)
    pdf_doc.close()

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python excel_to_pdf.py <input_excel> <output_pdf>", file=sys.stderr)
        sys.exit(1)
    try:
        convert_excel_to_pdf(sys.argv[1], sys.argv[2])
        if os.path.exists(sys.argv[2]) and os.path.getsize(sys.argv[2]) > 100:
            print("SUCCESS: Excel to PDF conversion complete.")
            sys.exit(0)
        else:
            print("ERROR: Generated PDF is empty.", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
