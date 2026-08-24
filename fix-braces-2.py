with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

content = content.replace("}\n        }\n        }", "}\n        }")

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
