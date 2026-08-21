import re

with open('src/components/editor/DesignSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(']].map((style) => {', '].map((style) => {')

with open('src/components/editor/DesignSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
