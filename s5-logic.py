import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. Update DEFAULT_TEMPLATE_CONFIG
new_appearance_props = """                themeId: 'custom',
                textPrimary: '#FFFFFF',
                textSubtitle: '#2C2C2C',
                profileBorderColor: '#5c2d47',
                profileRadius: '50%',
                btnRadius: '9999px',
                banner: {"""
content = re.sub(r"profileRadius: '50%',\s*btnRadius: '9999px',\s*banner: \{", new_appearance_props, content)

# 2. Add text color pickers in Estilos tab
color_pickers_html = """                        <!-- Texto Section -->
                        <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                            <h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2">
                                <i class="fa-solid fa-font"></i> Colores de Texto
                            </h3>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="text-[10px] text-slate-400 block mb-1">Texto Principal</label>
                                    <input type="color" id="color-text-primary" value="#FFFFFF" onchange="updateStyles()" class="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                                </div>
                                <div>
                                    <label class="text-[10px] text-slate-400 block mb-1">Subt?tulo</label>
                                    <input type="color" id="color-text-subtitle" value="#2C2C2C" onchange="updateStyles()" class="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                                </div>
                                <div>
                                    <label class="text-[10px] text-slate-400 block mb-1">Borde del Perfil</label>
                                    <input type="color" id="color-profile-border" value="#5c2d47" onchange="updateStyles()" class="w-full h-8 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer">
                                </div>
                            </div>
                        </div>

                        <!-- Botones Section -->"""
content = re.sub(r'<!-- Botones Section -->', color_pickers_html, content)


# 3. JS Registry and Logic
theme_js = """
        // ---------------------------------------------------------
        // S5 PREMIUM THEMES
        // ---------------------------------------------------------
        const PREMIUM_THEMES = [
            { id: 'black-gold', label: 'Black + Gold', bgClass: 'bg-black', accentClass: 'bg-[#D4AF37]', appearance: { bgStart: '#000000', bgMid: '#0a0a0a', bgEnd: '#111111', textPrimary: '#FFFFFF', textSubtitle: '#D4AF37', btnBgStart: '#1a1a1a', btnBgEnd: '#111111', btnBorderColor: '#D4AF37', btnTextColor: '#FFFFFF', accentBgStart: '#D4AF37', accentBgEnd: '#B5952F', accentIconColor: '#000000', profileBorderColor: '#D4AF37', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 80, fusionPreset: 'deep', fusionStrength: 80 } } },
            { id: 'black-silver', label: 'Black + Silver', bgClass: 'bg-[#121212]', accentClass: 'bg-[#C0C0C0]', appearance: { bgStart: '#121212', bgMid: '#1a1a1a', bgEnd: '#0f0f0f', textPrimary: '#FFFFFF', textSubtitle: '#C0C0C0', btnBgStart: '#222222', btnBgEnd: '#1a1a1a', btnBorderColor: '#C0C0C0', btnTextColor: '#FFFFFF', accentBgStart: '#e0e0e0', accentBgEnd: '#a0a0a0', accentIconColor: '#121212', profileBorderColor: '#C0C0C0', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 70, fusionPreset: 'deep', fusionStrength: 90 } } },
            { id: 'platinum', label: 'Platinum', bgClass: 'bg-[#e5e4e2]', accentClass: 'bg-[#8a8d8f]', appearance: { bgStart: '#e5e4e2', bgMid: '#d8d7d5', bgEnd: '#c4c3c0', textPrimary: '#222222', textSubtitle: '#555555', btnBgStart: '#ffffff', btnBgEnd: '#f0f0f0', btnBorderColor: '#8a8d8f', btnTextColor: '#111111', accentBgStart: '#a0a3a5', accentBgEnd: '#7a7d7f', accentIconColor: '#ffffff', profileBorderColor: '#8a8d8f', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 90, fusionPreset: 'soft', fusionStrength: 50 } } },
            { id: 'rose-gold', label: 'Rose Gold', bgClass: 'bg-[#faf0e6]', accentClass: 'bg-[#b76e79]', appearance: { bgStart: '#faf0e6', bgMid: '#fdf5e6', bgEnd: '#f5ebe0', textPrimary: '#4a3b3c', textSubtitle: '#b76e79', btnBgStart: '#ffffff', btnBgEnd: '#fffbfb', btnBorderColor: '#b76e79', btnTextColor: '#4a3b3c', accentBgStart: '#c98a93', accentBgEnd: '#a45763', accentIconColor: '#ffffff', profileBorderColor: '#b76e79', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 100, fusionPreset: 'medium', fusionStrength: 60 } } },
            { id: 'emerald-luxury', label: 'Emerald Luxury', bgClass: 'bg-[#042A2B]', accentClass: 'bg-[#D4AF37]', appearance: { bgStart: '#042A2B', bgMid: '#063A3C', bgEnd: '#021A1B', textPrimary: '#FFFFFF', textSubtitle: '#E8D595', btnBgStart: '#084A4D', btnBgEnd: '#053133', btnBorderColor: '#D4AF37', btnTextColor: '#FFFFFF', accentBgStart: '#D4AF37', accentBgEnd: '#B5952F', accentIconColor: '#042A2B', profileBorderColor: '#D4AF37', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 85, fusionPreset: 'deep', fusionStrength: 85 } } },
            { id: 'executive-blue', label: 'Executive Blue', bgClass: 'bg-[#001f3f]', accentClass: 'bg-[#7FDBFF]', appearance: { bgStart: '#001f3f', bgMid: '#002b59', bgEnd: '#001122', textPrimary: '#FFFFFF', textSubtitle: '#7FDBFF', btnBgStart: '#003366', btnBgEnd: '#001f3f', btnBorderColor: '#0074D9', btnTextColor: '#FFFFFF', accentBgStart: '#7FDBFF', accentBgEnd: '#39CCCC', accentIconColor: '#001f3f', profileBorderColor: '#7FDBFF', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 90, fusionPreset: 'medium', fusionStrength: 70 } } },
            { id: 'burgundy-elegant', label: 'Burgundy Elegant', bgClass: 'bg-[#4a0404]', accentClass: 'bg-[#e5b382]', appearance: { bgStart: '#4a0404', bgMid: '#5c0606', bgEnd: '#330202', textPrimary: '#FFFFFF', textSubtitle: '#e5b382', btnBgStart: '#6e0909', btnBgEnd: '#4a0404', btnBorderColor: '#e5b382', btnTextColor: '#FFFFFF', accentBgStart: '#e5b382', accentBgEnd: '#c49364', accentIconColor: '#4a0404', profileBorderColor: '#e5b382', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 85, fusionPreset: 'deep', fusionStrength: 90 } } },
            { id: 'ivory-gold', label: 'Ivory + Gold', bgClass: 'bg-[#FFFFF0]', accentClass: 'bg-[#CFB53B]', appearance: { bgStart: '#FFFFF0', bgMid: '#FDFFF5', bgEnd: '#F0F0D8', textPrimary: '#2b2b2b', textSubtitle: '#CFB53B', btnBgStart: '#ffffff', btnBgEnd: '#fcfcfc', btnBorderColor: '#CFB53B', btnTextColor: '#111111', accentBgStart: '#E8D595', accentBgEnd: '#CFB53B', accentIconColor: '#ffffff', profileBorderColor: '#CFB53B', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 100, fusionPreset: 'soft', fusionStrength: 40 } } },
            { id: 'graphite', label: 'Graphite', bgClass: 'bg-[#2b2b2b]', accentClass: 'bg-[#111111]', appearance: { bgStart: '#2b2b2b', bgMid: '#333333', bgEnd: '#1a1a1a', textPrimary: '#FFFFFF', textSubtitle: '#a0a0a0', btnBgStart: '#444444', btnBgEnd: '#2b2b2b', btnBorderColor: '#555555', btnTextColor: '#FFFFFF', accentBgStart: '#ffffff', accentBgEnd: '#e0e0e0', accentIconColor: '#111111', profileBorderColor: '#555555', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 70, fusionPreset: 'medium', fusionStrength: 75 } } },
            { id: 'premium-white', label: 'Premium White', bgClass: 'bg-[#FFFFFF]', accentClass: 'bg-[#000000]', appearance: { bgStart: '#FFFFFF', bgMid: '#FAFAFA', bgEnd: '#F0F0F0', textPrimary: '#111111', textSubtitle: '#555555', btnBgStart: '#FFFFFF', btnBgEnd: '#F9F9F9', btnBorderColor: '#DDDDDD', btnTextColor: '#111111', accentBgStart: '#222222', accentBgEnd: '#000000', accentIconColor: '#FFFFFF', profileBorderColor: '#E0E0E0', banner: { enabled: true, heightPreset: 'medium', positionY: 50, imageOpacity: 100, fusionPreset: 'soft', fusionStrength: 30 } } }
        ];

        function renderThemeSelector() {
            const container = document.getElementById('theme-swatches-container');
            if(!container) return;
            container.innerHTML = PREMIUM_THEMES.map(theme => {
                const isActive = appState.appearance.themeId === theme.id;
                return `
                <div class="flex flex-col items-center gap-1 cursor-pointer" onclick="applyTheme('${theme.id}')">
                    <div class="w-12 h-12 rounded-xl flex overflow-hidden shadow-lg border-2 transition ${isActive ? 'border-pink-500 scale-110' : 'border-slate-800 hover:border-slate-500'}">
                        <div class="flex-1 ${theme.bgClass}"></div>
                        <div class="w-4 ${theme.accentClass}"></div>
                    </div>
                    <span class="text-[9px] text-center font-medium ${isActive ? 'text-pink-400' : 'text-slate-400'} whitespace-nowrap">${theme.label}</span>
                </div>
                `;
            }).join('');
        }

        function applyTheme(themeId) {
            const theme = PREMIUM_THEMES.find(t => t.id === themeId);
            if (!theme) return;
            
            // Deep merge theme appearance over appState.appearance
            for (const key in theme.appearance) {
                if (typeof theme.appearance[key] === 'object') {
                    appState.appearance[key] = { ...appState.appearance[key], ...theme.appearance[key] };
                } else {
                    appState.appearance[key] = theme.appearance[key];
                }
            }
            appState.appearance.themeId = theme.id;
            
            syncControlsFromState();
            applyStateToCSS();
        }
"""
content = content.replace("function updateBannerSettings() {", theme_js + "\n        function updateBannerSettings() {")


# 4. Insert Theme UI in HTML
theme_ui_html = """                  <!-- S5 THEME SELECTOR -->
                  <div id="tab-styles" class="hidden space-y-6">
                      
                      <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                          <h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2 mb-3">
                              <i class="fa-solid fa-wand-magic-sparkles"></i> Temas Premium
                          </h3>
                          <div id="theme-swatches-container" class="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x hide-scrollbar">
                              <!-- Swatches rendered via JS -->
                          </div>
                      </div>

                      <!-- Fondo General Section -->"""
content = content.replace("<!-- Fondo General Section -->", theme_ui_html)


# 5. Modify updateStyles and updateBannerSettings to set themeId = 'custom'
# Using regex to inject `appState.appearance.themeId = 'custom';` at the top of these functions
content = re.sub(r'function updateStyles\(\) \{', r"function updateStyles() {\n            appState.appearance.themeId = 'custom';\n            renderThemeSelector();", content)
content = re.sub(r'function updateBannerSettings\(\) \{', r"function updateBannerSettings() {\n            appState.appearance.themeId = 'custom';\n            renderThemeSelector();", content)


# 6. Update syncControlsFromState
sync_html = """
              document.getElementById('color-bg-start').value = appState.appearance.bgStart;
              document.getElementById('color-bg-mid').value = appState.appearance.bgMid;
              document.getElementById('color-bg-end').value = appState.appearance.bgEnd;
              document.getElementById('range-bg-angle').value = appState.appearance.bgAngle;
              document.getElementById('angle-val').textContent = appState.appearance.bgAngle;

              // Appearance - Text & Profile
              document.getElementById('color-text-primary').value = appState.appearance.textPrimary;
              document.getElementById('color-text-subtitle').value = appState.appearance.textSubtitle;
              document.getElementById('color-profile-border').value = appState.appearance.profileBorderColor;

              // Appearance - Buttons"""
content = re.sub(r"document\.getElementById\('color-bg-start'\).*?// Appearance - Buttons", sync_html, content, flags=re.DOTALL)

# Add renderThemeSelector call inside syncControlsFromState
content = re.sub(r"function syncControlsFromState\(\) \{", r"function syncControlsFromState() {\n              renderThemeSelector();", content)

# 7. Update applyStateToCSS
apply_css = """
            root.style.setProperty('--bg-image', a.bgImage ? `url('${a.bgImage}')` : 'none');
            root.style.setProperty('--bg-overlay', a.bgOverlay / 100);
            root.style.setProperty('--bg-start', a.bgStart);
            root.style.setProperty('--bg-mid', a.bgMid);
            root.style.setProperty('--bg-end', a.bgEnd);
            root.style.setProperty('--bg-angle', `${a.bgAngle}deg`);
            root.style.setProperty('--text-primary', a.textPrimary);
            root.style.setProperty('--text-subtitle', a.textSubtitle);
            root.style.setProperty('--profile-border-color', a.profileBorderColor);
            root.style.setProperty('--btn-bg-start', hexToRgba(a.btnBgStart, 0.15));"""
content = re.sub(r"root\.style\.setProperty\('--bg-image'.*?hexToRgba\(a\.btnBgStart, 0\.15\)\);", apply_css, content, flags=re.DOTALL)

# 8. Modify updateStyles to read the new text color inputs
update_styles_new = """
              appState.appearance.bgStart = document.getElementById('color-bg-start').value;
              appState.appearance.bgMid = document.getElementById('color-bg-mid').value;
              appState.appearance.bgEnd = document.getElementById('color-bg-end').value;
              appState.appearance.bgAngle = document.getElementById('range-bg-angle').value;
              
              appState.appearance.textPrimary = document.getElementById('color-text-primary').value;
              appState.appearance.textSubtitle = document.getElementById('color-text-subtitle').value;
              appState.appearance.profileBorderColor = document.getElementById('color-profile-border').value;

              appState.appearance.btnBgStart = document.getElementById('color-btn-start').value;"""
content = re.sub(r"appState\.appearance\.bgStart = .*?appState\.appearance\.btnBgStart =", update_styles_new, content, flags=re.DOTALL)


# Add CSS to hide scrollbar
css_hide_scrollbar = """        .hide-scrollbar::-webkit-scrollbar {
            display: none;
        }
        .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
        }
        </style>"""
content = content.replace("</style>", css_hide_scrollbar)


with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
