import os
from PIL import Image

src_dir = "public/productos-fuxion/productos"
dest_dir = "public/productos-fuxion/optimized"
os.makedirs(dest_dir, exist_ok=True)

widths = [640, 960, 1440]

for filename in os.listdir(src_dir):
    if not filename.endswith((".png", ".jpg")):
        continue
    
    src_path = os.path.join(src_dir, filename)
    name, ext = os.path.splitext(filename)
    
    try:
        with Image.open(src_path) as img:
            # We don't apply aggressive sharpening, we use LANCZOS which is standard and high quality
            
            for w in widths:
                dest_path = os.path.join(dest_dir, f"{name}-{w}.webp")
                
                if img.width <= w:
                    # Don't upscale, just save as WebP with original size if it's smaller
                    # or if it's exactly the size. Actually, let's just use original size but still save it with suffix or just original size
                    new_img = img.convert("RGBA")
                    new_w = img.width
                    new_h = img.height
                else:
                    ratio = w / img.width
                    new_h = int(img.height * ratio)
                    new_img = img.resize((w, new_h), Image.Resampling.LANCZOS).convert("RGBA")
                
                # Convert RGBA to RGB for webp to save space if there is no alpha, but Fuxion images might have transparency
                # Wait, PIL WebP supports RGBA.
                
                # We need to save it. Quality 84
                new_img.save(dest_path, "WEBP", quality=84)
                print(f"Generated {dest_path} (size: {os.path.getsize(dest_path)//1024} KB)")
    except Exception as e:
        print(f"Failed to process {filename}: {e}")

print("Image optimization complete.")
