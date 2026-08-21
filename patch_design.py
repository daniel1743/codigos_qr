import re

with open('src/components/editor/DesignSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_styles_updated = '''              {[
                { id: "solid", label: "Sólido" },
                { id: "outline", label: "Outline" },
                { id: "soft", label: "Soft" },
                { id: "pill", label: "Pill" },
                { id: "minimal", label: "Minimal" },
                { id: "line", label: "Line" },
                { id: "card", label: "Card" },
                { id: "premium_image_right", label: "Pro Derecha" },
                { id: "premium_image_left", label: "Pro Izquierda" },
                { id: "premium_detail_arrow", label: "Pro Detalle" },
                { id: "premium_classic_card", label: "Pro Tarjeta" },
                { id: "premium_minimal_badge", label: "Pro Badge" },
              ].map((style) => {'''

content = re.sub(r'\{\[\s*\{\s*id:\s*"solid"[\s\S]*?\]', new_styles_updated.replace('.map((style) => {', ']'), content)

with open('src/components/editor/DesignSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
