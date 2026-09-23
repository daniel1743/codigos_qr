import re

file_path = "src/features/experimental-premium-editor/data/products-fuxion.ts"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace space with hyphen in the URL
content = content.replace('"/productos fuxion/', '"/productos-fuxion/')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Paths updated.")
