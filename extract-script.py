import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

script = re.search(r'<script>(.*?)</script>', content, re.DOTALL).group(1)

with open('debug_script.js', 'w', encoding='latin-1') as f:
    f.write(script)
