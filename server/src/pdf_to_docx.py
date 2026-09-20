from convert import convert_pdf_to_docx_engine

def convert_pdf_to_docx(pdf_path: str, docx_path: str):
    convert_pdf_to_docx_engine(pdf_path, docx_path)

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 3:
        sys.exit(1)
    convert_pdf_to_docx(sys.argv[1], sys.argv[2])

