import urllib.request
import urllib.parse
import json
import os
import io

BASE_URL = "http://127.0.0.1:4000"

def test_health():
    req = urllib.request.Request(f"{BASE_URL}/health")
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print(f"Health Check Status: {resp.status} -> {data}", flush=True)
        assert data.get("status") == "ok"
        assert "layout-aware-docx" in data.get("features", [])
        assert "aes-256-security" in data.get("features", [])

def test_pdf_creation_and_protect():
    import fitz # PyMuPDF
    
    # 1. Create a sample PDF in memory
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)
    page.insert_text((50, 80), "UIKEY AI Enterprise Audit Document", fontsize=18)
    page.insert_text((50, 120), "Confidential and Encrypted with AES-256.", fontsize=12)
    
    # Insert a sample image into the page
    # Create simple 100x100 RGB image
    import zlib
    img_data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00\x08\x06\x06\x07\x06\x05\x08\x07\x07\x07\t\t\x08\n\x0c\x14\r\x0c\x0b\x0b\x0c\x19\x12\x13\x0f\x14\x1d\x1a\x1f\x1e\x1d\x1a\x1c\x1c $.' \",#\x1c\x1c(7),01444\x1f'9=82<.342\xff\xc0\x00\x0b\x08\x00\x08\x00\x08\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    try:
        page.insert_image(fitz.Rect(50, 150, 150, 250), stream=img_data)
    except Exception as e:
        print("Note on sample image insert:", e)

    pdf_bytes = doc.tobytes()
    print(f"Generated sample test PDF: {len(pdf_bytes)} bytes")
    
    # 2. Test /api/convert/pdf-to-word
    boundary = "----WebKitFormBoundaryUikeyAiTest"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="audit_doc.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + pdf_bytes + f"\r\n--{boundary}--\r\n".encode('utf-8')
    
    req = urllib.request.Request(
        f"{BASE_URL}/api/convert/pdf-to-word",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req) as resp:
        docx_bytes = resp.read()
        print(f"POST /api/convert/pdf-to-word: HTTP {resp.status} -> Received {len(docx_bytes)} bytes (.docx)")
        assert len(docx_bytes) > 500
        assert docx_bytes[:2] == b"PK" # Zip header of docx

    # 3. Test /api/pdf/protect
    protect_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="audit_doc.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + pdf_bytes + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="password"\r\n\r\nSecret@123\r\n'
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="keyLen"\r\n\r\n256\r\n'
        f"--{boundary}--\r\n"
    ).encode('utf-8')

    req_protect = urllib.request.Request(
        f"{BASE_URL}/api/pdf/protect",
        data=protect_body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req_protect) as resp:
        protected_bytes = resp.read()
        print(f"POST /api/pdf/protect: HTTP {resp.status} -> Encrypted PDF ({len(protected_bytes)} bytes)")
        assert len(protected_bytes) > 200
        # Verify document is actually encrypted
        check_doc = fitz.open(stream=protected_bytes, filetype="pdf")
        assert check_doc.is_encrypted, "PDF must be encrypted"
        assert not check_doc.is_repaired
        # Test authenticating with password
        assert check_doc.authenticate("Secret@123") > 0, "Password Secret@123 must authenticate"
        check_doc.close()

    # 4. Test /api/pdf/unlock
    unlock_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="protected.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + protected_bytes + (
        f"\r\n--{boundary}\r\n"
        f'Content-Disposition: form-data; name="password"\r\n\r\nSecret@123\r\n'
        f"--{boundary}--\r\n"
    ).encode('utf-8')

    req_unlock = urllib.request.Request(
        f"{BASE_URL}/api/pdf/unlock",
        data=unlock_body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req_unlock) as resp:
        unlocked_bytes = resp.read()
        print(f"POST /api/pdf/unlock: HTTP {resp.status} -> Unlocked PDF ({len(unlocked_bytes)} bytes)")
        unlocked_doc = fitz.open(stream=unlocked_bytes, filetype="pdf")
        assert not unlocked_doc.is_encrypted, "Unlocked PDF must not be encrypted"
        unlocked_doc.close()

    # 5. Test /api/pdf/extract-images
    extract_body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="doc_with_images.pdf"\r\n'
        f"Content-Type: application/pdf\r\n\r\n"
    ).encode('utf-8') + pdf_bytes + f"\r\n--{boundary}--\r\n".encode('utf-8')

    req_extract = urllib.request.Request(
        f"{BASE_URL}/api/pdf/extract-images",
        data=extract_body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req_extract) as resp:
        zip_bytes = resp.read()
        print(f"POST /api/pdf/extract-images: HTTP {resp.status} -> ZIP Archive ({len(zip_bytes)} bytes)")
        assert len(zip_bytes) > 50
        assert zip_bytes[:2] == b"PK"

if __name__ == "__main__":
    print("=== STARTING FULL BACKEND INTEGRATION TEST ===")
    test_health()
    test_pdf_creation_and_protect()
    print("=== ALL PRODUCTION INTEGRATION TESTS PASSED 100% ===")
