import fitz
import os

os.makedirs("test_fixtures", exist_ok=True)

# 1. Valid sample PDF with 2 pages and text
doc = fitz.open()
p1 = doc.new_page(width=595, height=842)
p1.insert_text((50, 100), "Hello UIKEY AI PDF Editor!", fontsize=24)
p1.insert_text((50, 150), "This is page 1 of our test document.", fontsize=14)

p2 = doc.new_page(width=595, height=842)
p2.insert_text((50, 100), "Page 2 - Advanced Annotations & Tools", fontsize=20)
p2.insert_text((50, 150), "Testing export, merge, split, and compression.", fontsize=14)

valid_path = os.path.join("test_fixtures", "valid_sample.pdf")
doc.save(valid_path)
doc.close()
print(f"Created: {valid_path}")

# 2. Password protected PDF
doc_enc = fitz.open(valid_path)
enc_path = os.path.join("test_fixtures", "protected_sample.pdf")
doc_enc.save(enc_path, encryption=fitz.PDF_ENCRYPT_AES_256, user_pw="Secret123", owner_pw="Owner123")
doc_enc.close()
print(f"Created: {enc_path}")

# 3. Invalid corrupted PDF
corrupt_path = os.path.join("test_fixtures", "corrupt_sample.pdf")
with open(corrupt_path, "wb") as f:
    f.write(b"%PDF-1.4\n%Invalid garbage bytes that break pdf parsing\x00\xff\xfe\xca\xfe\xba\xbe")
print(f"Created: {corrupt_path}")

# 4. Non-pdf invalid file
non_pdf_path = os.path.join("test_fixtures", "fake_file.txt")
with open(non_pdf_path, "w", encoding="utf-8") as f:
    f.write("This is a plain text file, not a PDF.")
print(f"Created: {non_pdf_path}")
