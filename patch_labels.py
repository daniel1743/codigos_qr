import re

with open('src/components/editor/DesignSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('label: "Pro Derecha"', 'label: "Pro Max: Derecha"')
content = content.replace('label: "Pro Izquierda"', 'label: "Pro Max: Izquierda"')
content = content.replace('label: "Pro Detalle"', 'label: "Pro Max: Detalle"')
content = content.replace('label: "Pro Tarjeta"', 'label: "Pro Max: Tarjeta"')
content = content.replace('label: "Pro Badge"', 'label: "Pro Max: Badge"')

with open('src/components/editor/DesignSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
