import re

file_path = "src/features/experimental-premium-editor/components/Workspace.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find <ProductCard and add priority
content = re.sub(r'<ProductCard([^>]+)key=\{product\.id\}', r'<ProductCard\1key={product.id} priority={index < 2}', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
