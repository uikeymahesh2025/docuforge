import sys
import os
import pymupdf

def protect_pdf(input_pdf: str, output_pdf: str, user_pw: str, owner_pw: str = None, key_len: int = 256):
    if not os.path.exists(input_pdf):
        raise FileNotFoundError(f"Input file not found: {input_pdf}")
    
    doc = pymupdf.open(input_pdf)
    if not owner_pw:
        owner_pw = user_pw + "_owner"
    
    # Select encryption standard: AES 256 or AES 128
    enc_method = pymupdf.PDF_ENCRYPT_AES_256 if key_len == 256 else pymupdf.PDF_ENCRYPT_AES_128
    
    doc.save(
        output_pdf,
        encryption=enc_method,
        user_pw=user_pw,
        owner_pw=owner_pw,
        permissions=pymupdf.PDF_PERM_PRINT | pymupdf.PDF_PERM_COPY | pymupdf.PDF_PERM_ANNOTATE,
    )
    doc.close()

def unlock_pdf(input_pdf: str, output_pdf: str, password: str):
    if not os.path.exists(input_pdf):
        raise FileNotFoundError(f"Input file not found: {input_pdf}")
    
    doc = pymupdf.open(input_pdf)
    if doc.is_encrypted:
        rc = doc.authenticate(password)
        if rc <= 0:
            doc.close()
            raise ValueError("Invalid password. Authentication failed.")
    
    # Save unencrypted PDF
    doc.save(output_pdf, encryption=pymupdf.PDF_ENCRYPT_NONE)
    doc.close()

if __name__ == "__main__":
    if len(sys.argv) < 5:
        print("Usage: python pdf_security.py <protect|unlock> <input_pdf> <output_pdf> <password> [key_len]", file=sys.stderr)
        sys.exit(1)
    
    action = sys.argv[1].lower()
    input_p = sys.argv[2]
    output_p = sys.argv[3]
    pw = sys.argv[4]
    
    try:
        if action == "protect":
            key_len = int(sys.argv[5]) if len(sys.argv) > 5 else 256
            protect_pdf(input_p, output_p, pw, key_len=key_len)
            print(f"SUCCESS: Protected with AES-{key_len}")
        elif action == "unlock":
            unlock_pdf(input_p, output_p, pw)
            print("SUCCESS: Unlocked successfully")
        else:
            raise ValueError(f"Unknown action: {action}")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
