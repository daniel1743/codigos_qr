import re

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Assign the image to Cafe Fit Cappuccino
pattern1 = r'(id:\s*"fuxion_cafe_cafe_fit_cappuccino",\s*)image:\s*null,\s*imageState:\s*"empty"'
repl1 = r'\1image: "/productos-fuxion/productos/gano+-cappuccino.png",\n    imageState: "ready"'
content = re.sub(pattern1, repl1, content)

# Remove the image from Gano Cappuccino
pattern2 = r'(id:\s*"fuxion_gano_cappuccino",\s*)image:\s*"/productos-fuxion/productos/gano\+-cappuccino\.png",\s*imageState:\s*"ready"'
repl2 = r'\1image: null,\n    imageState: "empty"'
content = re.sub(pattern2, repl2, content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Images swapped successfully.")
