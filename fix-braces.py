with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

content = content.replace("}\n        }\n\n        function updateButtonData", "}\n\n        function updateButtonData")
content = content.replace("}\n        }\n\n        function removeButton", "}\n\n        function removeButton")

# Let's verify other ones that might have left an extra `}`
# addButton:
content = content.replace("}\n        }\n\n        function removeButton", "}\n\n        function removeButton")
# wait, let me just check debug_script.js instead of guessing
