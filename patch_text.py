import re

with open('src/components/editor/TextSection.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update SegmentControl to accept and render 'title' and 'aria-label'
segment_control_regex = r'function SegmentControl\({ options, value, onChange }: \{ options: \{id: string, label\?: string, icon\?: React\.ElementType\}\[\], value: string, onChange: \(v: string\) => void \}\) \{.*?\n\s+return \(\n\s+<div className="flex bg-muted/50 p-1 rounded-lg w-full">\n\s+\{options\.map\(\(opt\) => \(\n\s+<button\n\s+key=\{opt\.id\}\n\s+onClick=\{.*?\n\s+className=\{.*?\n\s+>\n\s+\{opt\.icon \? <opt\.icon className="w-4 h-4" /> : opt\.label\}\n\s+</button>\n\s+\)\)\}\n\s+</div>\n\s+\);\n\}'

segment_control_replacement = '''function SegmentControl({ options, value, onChange }: { options: {id: string, label?: string, icon?: React.ElementType, title?: string}[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex bg-muted/50 p-1 rounded-lg w-full">
      {options.map((opt) => {
        const isSelected = value === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            title={opt.title || opt.label}
            aria-label={opt.title || opt.label}
            aria-pressed={isSelected}
            className={lex-1 flex items-center justify-center py-1.5 px-2 text-xs font-medium rounded-md transition-all duration-200 }
          >
            {opt.icon ? <opt.icon className="w-4 h-4" /> : opt.label}
          </button>
        );
      })}
    </div>
  );
}'''

content = re.sub(segment_control_regex, segment_control_replacement, content, flags=re.DOTALL)

# 2. Fix labels and titles in Name section
content = content.replace(
    "options={[{ id: \"sm\", label: \"S\" }, { id: \"md\", label: \"M\" }, { id: \"lg\", label: \"L\" }, { id: \"xl\", label: \"XL\" }]}",
    "options={[{ id: \"sm\", label: \"S\", title: \"Pequeño\" }, { id: \"md\", label: \"M\", title: \"Medio\" }, { id: \"lg\", label: \"L\", title: \"Grande\" }, { id: \"xl\", label: \"XL\", title: \"Muy grande\" }]}"
)

content = content.replace(
    "options={[{ id: \"light\", label: \"Light\" }, { id: \"normal\", label: \"Regular\" }, { id: \"semibold\", label: \"Semi\" }, { id: \"bold\", label: \"Bold\" }]}",
    "options={[{ id: \"light\", label: \"Fina\" }, { id: \"normal\", label: \"Normal\" }, { id: \"semibold\", label: \"Seminegrita\" }, { id: \"bold\", label: \"Negrita\" }]}"
)

content = content.replace(
    "options={[{ id: \"left\", icon: AlignLeft }, { id: \"center\", icon: AlignCenter }, { id: \"right\", icon: AlignRight }]}",
    "options={[{ id: \"left\", icon: AlignLeft, title: \"Izquierda\" }, { id: \"center\", icon: AlignCenter, title: \"Centro\" }, { id: \"right\", icon: AlignRight, title: \"Derecha\" }]}"
)

# 3. Fix labels and titles in Bio section
content = content.replace(
    "options={[{ id: \"sm\", label: \"S\" }, { id: \"md\", label: \"M\" }, { id: \"lg\", label: \"L\" }]}",
    "options={[{ id: \"sm\", label: \"S\", title: \"Pequeño\" }, { id: \"md\", label: \"M\", title: \"Medio\" }, { id: \"lg\", label: \"L\", title: \"Grande\" }]}"
)

content = content.replace(
    "options={[{ id: \"light\", label: \"Light\" }, { id: \"normal\", label: \"Regular\" }, { id: \"semibold\", label: \"Semi\" }]}",
    "options={[{ id: \"light\", label: \"Fina\" }, { id: \"normal\", label: \"Normal\" }, { id: \"semibold\", label: \"Seminegrita\" }]}"
)

# 4. Grouping buttons section
buttons_regex = r'<SectionGroup title="Botones" icon=\{PanelBottom\}>\s*<div className="space-y-4">\s*<div className="space-y-2">\s*<Label className="text-xs">Tamaño de texto</Label>.*?onChange\{\(v\) => onChange\(\{ button_icon_position: v \}\)\}\s*/>\s*</div>\s*</div>\s*</SectionGroup>'

buttons_replacement = '''<SectionGroup title="Botones" icon={PanelBottom}>
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Texto</h4>
            <div className="space-y-2">
              <Label className="text-xs">Tamaño</Label>
              <SegmentControl
                options={[{ id: "sm", label: "Pequeño" }, { id: "md", label: "Medio" }, { id: "lg", label: "Grande" }]}
                value={profile.button_text_size || "md"}
                onChange={(v) => onChange({ button_text_size: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Peso</Label>
              <SegmentControl
                options={[{ id: "normal", label: "Normal" }, { id: "semibold", label: "Seminegrita" }, { id: "bold", label: "Negrita" }]}
                value={profile.button_text_weight || "semibold"}
                onChange={(v) => onChange({ button_text_weight: v })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground border-b pb-1">Composición</h4>
            <div className="space-y-2">
              <Label className="text-xs">Alineación</Label>
              <SegmentControl
                options={[{ id: "left", icon: AlignLeft, title: "Izquierda" }, { id: "center", icon: AlignCenter, title: "Centro" }, { id: "right", icon: AlignRight, title: "Derecha" }]}
                value={profile.button_content_align || "left"}
                onChange={(v) => onChange({ button_content_align: v })}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Posición del icono</Label>
              <SegmentControl
                options={[{ id: "left", label: "Izquierda" }, { id: "right", label: "Derecha" }]}
                value={profile.button_icon_position || "left"}
                onChange={(v) => onChange({ button_icon_position: v })}
              />
            </div>
          </div>
        </div>
      </SectionGroup>'''

content = re.sub(buttons_regex, buttons_replacement, content, flags=re.DOTALL)

# 5. Fix Alert messages
alert_regex = r'<Alert variant="destructive" className="py-2 px-3">\s*<AlertTriangle className="h-4 w-4" />\s*<AlertDescription className="text-xs flex items-center justify-between ml-2">\s*<span>Contraste insuficiente</span>\s*<button onClick=\{.*?\} className="underline font-semibold ml-2">\s*Corregir\s*</button>\s*</AlertDescription>\s*</Alert>'

alert_replacement_title = '''<Alert variant="destructive" className="py-2 px-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs flex flex-col gap-2 ml-2">
                  <div className="font-semibold">Contraste bajo</div>
                  <div className="opacity-90">Este texto puede ser difícil de leer.</div>
                  <button onClick={() => onChange({ title_color: titleContrastFix })} className="underline font-semibold text-left mt-1">Usar color recomendado</button>
                </AlertDescription>
              </Alert>'''

alert_replacement_bio = '''<Alert variant="destructive" className="py-2 px-3">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs flex flex-col gap-2 ml-2">
                  <div className="font-semibold">Contraste bajo</div>
                  <div className="opacity-90">Este texto puede ser difícil de leer.</div>
                  <button onClick={() => onChange({ bio_color: bioContrastFix })} className="underline font-semibold text-left mt-1">Usar color recomendado</button>
                </AlertDescription>
              </Alert>'''

# Apply title
content = re.sub(r'<button onClick=\{\(\) => onChange\(\{ title_color: titleContrastFix \}\)\} className="underline font-semibold ml-2">\s*Corregir\s*</button>', 'REPLACE_TITLE_BTN', content)
content = re.sub(r'<Alert variant="destructive" className="py-2 px-3">\s*<AlertTriangle className="h-4 w-4" />\s*<AlertDescription className="text-xs flex items-center justify-between ml-2">\s*<span>Contraste insuficiente</span>\s*REPLACE_TITLE_BTN\s*</AlertDescription>\s*</Alert>', alert_replacement_title, content, flags=re.DOTALL)

# Apply bio
content = re.sub(r'<button onClick=\{\(\) => onChange\(\{ bio_color: bioContrastFix \}\)\} className="underline font-semibold ml-2">\s*Corregir\s*</button>', 'REPLACE_BIO_BTN', content)
content = re.sub(r'<Alert variant="destructive" className="py-2 px-3">\s*<AlertTriangle className="h-4 w-4" />\s*<AlertDescription className="text-xs flex items-center justify-between ml-2">\s*<span>Contraste insuficiente</span>\s*REPLACE_BIO_BTN\s*</AlertDescription>\s*</Alert>', alert_replacement_bio, content, flags=re.DOTALL)

with open('src/components/editor/TextSection.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
