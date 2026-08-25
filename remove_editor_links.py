import re

with open("src/routes/editor.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Pattern to remove global links from editor.tsx desktop header
pattern = r'<div className="mx-1 h-6 w-px bg-border" />\s*<Link.*?to="/encrypted-documents".*?</Link>\s*<Link.*?to="/template-builder".*?</Link>\s*<Link.*?to="/template-bank".*?</Link>\s*<Link.*?to="/profile".*?</Link>\s*\{isAdmin && \(\s*<Link.*?to="/admin".*?</Link>\s*\)\}\s*<button.*?Salir\s*</button>'

# Let's replace the whole block with nothing!
new_content = re.sub(pattern, "", content, flags=re.DOTALL)

with open("src/routes/editor.tsx", "w", encoding="utf-8") as f:
    f.write(new_content)
