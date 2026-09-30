
import sys
path = 'src/isolated/magic-page-editor/components/editor/controls/CtaTreatmentPicker.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(
    'onChange: (key: \'shape\' | \'size\' | \'iconPosition\' | \'kind\', value: string) => void;',
    'onChange: (key: \'shape\' | \'size\' | \'iconPosition\' | \'kind\', value: string) => void;\n  hideIconPosition?: boolean;'
)
code = code.replace('onChange }: Props', 'onChange, hideIconPosition = false }: Props')
code = code.replace('<PanelSection title=\
Icono\>', '{!hideIconPosition && <PanelSection title=\Icono\>')
code = code.replace('</PanelSection>\n  </div>', '</PanelSection>}\n  </div>')

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)

