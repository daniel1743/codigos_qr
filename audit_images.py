import json
import os
import re
from PIL import Image

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find all valid image paths
images = re.findall(r'image:\s*"(?!null)([^"]+)"', content)

results = []
total_bytes = 0

for img in images:
    path = "public" + img.replace("/", os.sep)
    if os.path.exists(path):
        sz = os.path.getsize(path)
        total_bytes += sz
        try:
            with Image.open(path) as pil_img:
                w, h = pil_img.size
                fmt = pil_img.format
            results.append({
                "product": os.path.basename(img).split('.')[0],
                "file": os.path.basename(img),
                "bytes": sz,
                "kb": sz / 1024,
                "w": w,
                "h": h,
                "fmt": fmt
            })
        except Exception as e:
            results.append({"file": img, "error": str(e)})

results.sort(key=lambda x: x.get("bytes", 0), reverse=True)

report = {
    "total_images": len(results),
    "total_mb": total_bytes / (1024 * 1024),
    "largest_kb": results[0]["kb"] if results else 0,
    "median_kb": results[len(results)//2]["kb"] if results else 0,
    "average_kb": (total_bytes / 1024) / len(results) if results else 0,
    "over_300": len([r for r in results if r.get("kb", 0) > 300]),
    "over_500": len([r for r in results if r.get("kb", 0) > 500]),
    "over_1mb": len([r for r in results if r.get("kb", 0) > 1024]),
    "over_2mb": len([r for r in results if r.get("kb", 0) > 2048]),
    "images": results
}

print(json.dumps(report, indent=2))
