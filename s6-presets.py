import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. Update DEFAULT_TEMPLATE_CONFIG
new_appearance_props = """                themeId: 'custom',
                btnPresetId: 'glass',
                textPrimary:"""
content = re.sub(r"themeId: 'custom',\s*textPrimary:", new_appearance_props, content)

# 2. Update normalizeTemplateConfig for backward compat
normalization_fix = """
            if (config.appearance && config.appearance.btnBgStart && !config.appearance.btnPresetId) {
                def.appearance.btnPresetId = 'legacy';
            }
            
            merge(def, config);"""
content = content.replace("merge(def, config);", normalization_fix)

# 3. BUTTON_PRESETS Logic
presets_js = """
        // ---------------------------------------------------------
        // S6 BUTTON PRESETS
        // ---------------------------------------------------------
        const BUTTON_PRESETS = [
            { id: 'solid', label: 'Solid', bgStartOpacity: 1, bgEndOpacity: 1, borderOpacity: 0.1, borderWidth: '1px', shadow: '0 2px 4px rgba(0,0,0,0.05)', backdropFilter: 'none', hoverTransform: 'translateY(-1px)', hoverShadow: '0 4px 8px rgba(0,0,0,0.1)' },
            { id: 'glass', label: 'Glass', bgStartOpacity: 0.15, bgEndOpacity: 0.35, borderOpacity: 0.5, borderWidth: '1px', shadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'blur(12px)', hoverTransform: 'translateY(-2px)', hoverShadow: '0 6px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)' },
            { id: 'outline', label: 'Outline', bgStartOpacity: 0, bgEndOpacity: 0, borderOpacity: 0.6, borderWidth: '1.5px', shadow: 'none', backdropFilter: 'none', hoverTransform: 'translateY(-1px)', hoverShadow: '0 4px 12px rgba(0,0,0,0.08)' },
            { id: 'soft', label: 'Soft', bgStartOpacity: 0.1, bgEndOpacity: 0.1, borderOpacity: 0, borderWidth: '0px', shadow: 'none', backdropFilter: 'none', hoverTransform: 'scale(1.02)', hoverShadow: '0 2px 8px rgba(0,0,0,0.05)' },
            { id: 'premium', label: 'Premium', bgStartOpacity: 1, bgEndOpacity: 1, borderOpacity: 0.3, borderWidth: '1px', shadow: '0 8px 16px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'none', hoverTransform: 'translateY(-2px)', hoverShadow: '0 12px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.3)' },
            { id: 'minimal', label: 'Minimal', bgStartOpacity: 0.05, bgEndOpacity: 0.05, borderOpacity: 0.15, borderWidth: '1px', shadow: 'none', backdropFilter: 'none', hoverTransform: 'translateY(-1px)', hoverShadow: '0 2px 6px rgba(0,0,0,0.04)' },
            { id: 'legacy', label: 'Custom', bgStartOpacity: 0.15, bgEndOpacity: 0.35, borderOpacity: 0.7, borderWidth: '1px', shadow: '0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2)', backdropFilter: 'none', hoverTransform: 'translateY(-2px)', hoverShadow: '0 6px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3)' }
        ];

        function renderButtonPresetSelector() {
            const container = document.getElementById('btn-preset-swatches');
            if(!container) return;
            
            const visiblePresets = BUTTON_PRESETS.filter(p => p.id !== 'legacy');
            container.innerHTML = visiblePresets.map(preset => {
                const isActive = appState.appearance.btnPresetId === preset.id;
                return `
                <div class="flex flex-col items-center gap-1 cursor-pointer" onclick="applyButtonPreset('${preset.id}')">
                    <div class="w-10 h-6 rounded-md flex items-center justify-center transition border ${isActive ? 'border-pink-500 bg-pink-500/10' : 'border-slate-700 bg-slate-800 hover:border-slate-500'}">
                        <span class="text-[9px] font-medium ${isActive ? 'text-pink-400' : 'text-slate-400'}">${preset.label}</span>
                    </div>
                </div>
                `;
            }).join('');
        }

        function applyButtonPreset(presetId) {
            appState.appearance.btnPresetId = presetId;
            syncControlsFromState();
            applyStateToCSS();
        }
"""
content = content.replace("function renderThemeSelector() {", presets_js + "\n        function renderThemeSelector() {")

# 4. Insert UI inside Botones Section
btn_ui_html = """                          <h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2 mb-3">
                              <i class="fa-solid fa-cubes"></i> Estilo de Botones
                          </h3>
                          
                          <!-- S6 Presets -->
                          <div class="mb-4">
                              <div id="btn-preset-swatches" class="flex flex-wrap gap-2">
                                  <!-- Swatches rendered via JS -->
                              </div>
                          </div>
                          
                          <div class="grid grid-cols-2 gap-3">"""
content = re.sub(r'<h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2">\s*<i class="fa-solid fa-cubes"></i> Estilo de Botones\s*</h3>\s*<div class="grid grid-cols-2 gap-3">', btn_ui_html, content)


# 5. Modify updateStyles to set btnPresetId to legacy if user changes button colors
update_styles_new = """              appState.appearance.btnBgStart = document.getElementById('color-btn-start').value;
              appState.appearance.btnBgEnd = document.getElementById('color-btn-end').value;
              appState.appearance.btnBorderColor = document.getElementById('color-btn-border').value;
              appState.appearance.btnTextColor = document.getElementById('color-btn-text').value;
              
              appState.appearance.themeId = 'custom';
              appState.appearance.btnPresetId = 'legacy';
              renderThemeSelector();
              renderButtonPresetSelector();"""
content = re.sub(r"appState\.appearance\.btnBgStart = .*?renderThemeSelector\(\);", update_styles_new, content, flags=re.DOTALL)


# 6. Call renderButtonPresetSelector in syncControlsFromState
content = content.replace("renderThemeSelector();", "renderThemeSelector();\n              renderButtonPresetSelector();")


# 7. Update applyStateToCSS for the new button variables
apply_css_old = """            root.style.setProperty('--btn-bg-start', hexToRgba(a.btnBgStart, 0.15));
            root.style.setProperty('--btn-bg-end', hexToRgba(a.btnBgEnd, 0.35));
            root.style.setProperty('--btn-border-color', hexToRgba(a.btnBorderColor, 0.7));"""

apply_css_new = """            const btnPreset = BUTTON_PRESETS.find(p => p.id === (a.btnPresetId || 'legacy')) || BUTTON_PRESETS.find(p => p.id === 'legacy');
            root.style.setProperty('--btn-bg-start', hexToRgba(a.btnBgStart, btnPreset.bgStartOpacity));
            root.style.setProperty('--btn-bg-end', hexToRgba(a.btnBgEnd, btnPreset.bgEndOpacity));
            root.style.setProperty('--btn-border-color', hexToRgba(a.btnBorderColor, btnPreset.borderOpacity));
            root.style.setProperty('--btn-border-width', btnPreset.borderWidth);
            root.style.setProperty('--btn-shadow', btnPreset.shadow);
            root.style.setProperty('--btn-backdrop', btnPreset.backdropFilter);
            root.style.setProperty('--btn-hover-transform', btnPreset.hoverTransform);
            root.style.setProperty('--btn-hover-shadow', btnPreset.hoverShadow);"""
content = content.replace(apply_css_old, apply_css_new)


# 8. Modify the .render-btn CSS rule
old_btn_css = r"""\.render-btn \{
            background: linear-gradient\(90deg, var\(--btn-bg-start\) 0%, var\(--btn-bg-end\) 100%\);
            border: 1px solid var\(--btn-border-color\);
            border-radius: var\(--btn-radius\);
            color: var\(--btn-text-color\);
            (font-family: var\(--font-body\);\s*)?transition: all 0\.2s ease;
            box-shadow: 0 4px 6px rgba\(0,0,0,0\.1\), inset 0 1px 0 rgba\(255,255,255,0\.2\);
        \}

        \.render-btn:hover \{
            transform: translateY\(-2px\);
            box-shadow: 0 6px 12px rgba\(0,0,0,0\.18\), inset 0 1px 0 rgba\(255,255,255,0\.3\);
        \}"""

new_btn_css = r""".render-btn {
            background: linear-gradient(90deg, var(--btn-bg-start) 0%, var(--btn-bg-end) 100%);
            border: var(--btn-border-width, 1px) solid var(--btn-border-color);
            border-radius: var(--btn-radius);
            color: var(--btn-text-color);
            \1transition: all 0.2s ease;
            box-shadow: var(--btn-shadow, 0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2));
            backdrop-filter: var(--btn-backdrop, blur(8px));
            -webkit-backdrop-filter: var(--btn-backdrop, blur(8px));
        }

        .render-btn:hover {
            transform: var(--btn-hover-transform, translateY(-2px));
            box-shadow: var(--btn-hover-shadow, 0 6px 12px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.3));
        }"""
        
content = re.sub(old_btn_css, new_btn_css, content)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
