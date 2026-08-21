import re

with open('src/components/editor/DesignSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

preview_replace = '''              } else if (style.id === "card") {
                btnClass += ${radiusClass} bg-white shadow-sm border;
                btnStyle = { color: demoBtn, borderColor: demoBorder };
              }'''

preview_new = '''              } else if (style.id === "card") {
                btnClass += ${radiusClass} bg-white shadow-sm border;
                btnStyle = { color: demoBtn, borderColor: demoBorder };
              } else if (style.id.startsWith("premium_")) {
                btnClass += ${radiusClass} bg-gradient-to-r from-amber-200 to-yellow-400 shadow-sm border-0 text-black font-bold;
                btnStyle = { color: "#000" };
              }'''

content = content.replace(preview_replace, preview_new)

with open('src/components/editor/DesignSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
