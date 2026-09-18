import sys
import os
import zipfile
import pymupdf

def extract_images_from_pdf(input_pdf: str, output_zip: str):
    if not os.path.exists(input_pdf):
        raise FileNotFoundError(f"Input file not found: {input_pdf}")
    
    doc = pymupdf.open(input_pdf)
    extracted_count = 0
    
    with zipfile.ZipFile(output_zip, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
        seen_xrefs = set()
        for page_num in range(len(doc)):
            page = doc[page_num]
            image_list = page.get_images(full=True)
            
            for img_index, img_info in enumerate(image_list):
                xref = img_info[0]
                if xref in seen_xrefs:
                    continue
                seen_xrefs.add(xref)
                
                base_image = doc.extract_image(xref)
                if not base_image:
                    continue
                
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                image_filename = f"image_p{page_num + 1}_{img_index + 1}.{image_ext}"
                
                zf.writestr(image_filename, image_bytes)
                extracted_count += 1
                
    doc.close()
    return extracted_count

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python extract_images.py <input_pdf> <output_zip>", file=sys.stderr)
        sys.exit(1)
        
    input_pdf = sys.argv[1]
    output_zip = sys.argv[2]
    
    try:
        count = extract_images_from_pdf(input_pdf, output_zip)
        print(f"SUCCESS: Extracted {count} images into {output_zip}")
        sys.exit(0)
    except Exception as e:
        print(f"ERROR: {str(e)}", file=sys.stderr)
        sys.exit(1)
