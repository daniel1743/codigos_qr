import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# Remove the SECOND hexToRgba function
second_hex_to_rgba_regex = r"function hexToRgba\(hex, alpha\) \{.*?\n        \}"
# Find all occurrences
matches = list(re.finditer(second_hex_to_rgba_regex, content, flags=re.DOTALL))
if len(matches) > 1:
    # Remove the second match
    m = matches[1]
    content = content[:m.start()] + content[m.end():]

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
