import re

with open('src/components/editor/DesignSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(
    r'button_style:\s*style\.id\s*as\s*"solid"\s*\|\s*"line"\s*\|\s*"minimal"\s*\|\s*"pill"\s*\|\s*"card",?', 
    'button_style: style.id as any,', 
    content
)

with open('src/components/editor/DesignSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
