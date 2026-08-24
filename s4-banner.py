import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. Update DEFAULT_TEMPLATE_CONFIG
new_appearance_props = """                profileRadius: '50%',
                btnRadius: '9999px',
                banner: {
                    enabled: true,
                    heightPreset: 'medium',
                    positionY: 50,
                    imageOpacity: 100,
                    fusionPreset: 'soft',
                    fusionStrength: 60
                }"""
content = re.sub(r"profileRadius: '50%',\s*btnRadius: '9999px'", new_appearance_props, content)

# 2. Add normalization for banner if it's missing
# Actually, `merge` will already merge objects, but we need to ensure the `banner` object exists with defaults if not present.
# The `merge(def, config)` already does this because `def` has `banner` and it merges `config.appearance.banner` on top. If it's missing in `config`, `def`'s banner remains. So it's safe.

# 3. Add UI controls in Banner section
banner_ui_html = """                        <div>
                            <input type="file" id="file-banner-img" accept="image/jpeg, image/png, image/webp, image/avif, image/heic" class="hidden" onchange="handleImageUpload(event, 'banner')">
                            <div class="flex gap-2 mb-2">
                                <button onclick="document.getElementById('file-banner-img').click()" id="btn-upload-banner" class="flex-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-upload mr-1"></i> Subir banner
                                </button>
                                <button onclick="removeImage('banner')" class="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            <details class="text-xs text-slate-500 group mb-3">
                                <summary class="cursor-pointer hover:text-slate-300">O usar URL de imagen...</summary>
                                <div class="mt-2">
                                    <input type="text" id="input-banner-img" value="" placeholder="Dejar en blanco para omitir" oninput="updateContent()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none transition">
                                </div>
                            </details>

                            <!-- S4: Premium Banner Controls -->
                            <div id="banner-controls" class="space-y-4 mt-4 pt-4 border-t border-slate-800">
                                <div>
                                    <label class="text-[11px] text-slate-400 mb-2 block font-medium">Altura del banner</label>
                                    <div class="flex gap-2">
                                        <button onclick="setBannerHeight('compact')" class="banner-height-btn flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1.5 rounded-xl transition">Compacto</button>
                                        <button onclick="setBannerHeight('medium')" class="banner-height-btn flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1.5 rounded-xl transition">Medio</button>
                                        <button onclick="setBannerHeight('large')" class="banner-height-btn flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-1.5 rounded-xl transition">Grande</button>
                                    </div>
                                </div>

                                <div>
                                    <label class="text-[11px] text-slate-400 mb-1 flex justify-between font-medium">
                                        <span>Posici?n de imagen</span>
                                        <span id="banner-pos-val" class="text-slate-500">Centro</span>
                                    </label>
                                    <input type="range" id="range-banner-pos" min="0" max="100" value="50" oninput="updateBannerSettings()" class="w-full accent-pink-500">
                                    <div class="flex justify-between text-[9px] text-slate-500 mt-1"><span>Arriba</span><span>Abajo</span></div>
                                </div>

                                <div>
                                    <label class="text-[11px] text-slate-400 mb-2 block font-medium">Fusi?n con el fondo</label>
                                    <div class="grid grid-cols-2 gap-2">
                                        <button onclick="setBannerFusion('none')" class="banner-fusion-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg transition">Sin fusi?n</button>
                                        <button onclick="setBannerFusion('soft')" class="banner-fusion-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg transition">Suave</button>
                                        <button onclick="setBannerFusion('medium')" class="banner-fusion-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg transition">Media</button>
                                        <button onclick="setBannerFusion('deep')" class="banner-fusion-btn bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 rounded-lg transition">Intensa</button>
                                    </div>
                                </div>

                                <div>
                                    <label class="text-[11px] text-slate-400 mb-1 flex justify-between font-medium">
                                        <span>Intensidad de fusi?n</span>
                                        <span id="banner-fusion-val" class="text-slate-500">60%</span>
                                    </label>
                                    <input type="range" id="range-banner-fusion" min="0" max="100" value="60" oninput="updateBannerSettings()" class="w-full accent-pink-500">
                                </div>

                                <div>
                                    <label class="text-[11px] text-slate-400 mb-1 flex justify-between font-medium">
                                        <span>Intensidad de imagen</span>
                                        <span id="banner-opacity-val" class="text-slate-500">100%</span>
                                    </label>
                                    <input type="range" id="range-banner-opacity" min="30" max="100" value="100" oninput="updateBannerSettings()" class="w-full accent-pink-500">
                                </div>
                            </div>
                        </div>"""
# I need to match the current banner div.
content = re.sub(r'<div>\s*<input type="file" id="file-banner-img".*?</details>\s*</div>', banner_ui_html, content, flags=re.DOTALL)


# 4. JS logic for banner
js_banner_logic = """
        // ---------------------------------------------------------
        // S4 PREMIUM BANNER FUSION
        // ---------------------------------------------------------
        function updateBannerSettings() {
            const b = appState.appearance.banner;
            b.positionY = document.getElementById('range-banner-pos').value;
            b.fusionStrength = document.getElementById('range-banner-fusion').value;
            b.imageOpacity = document.getElementById('range-banner-opacity').value;

            // Update Labels
            let posLabel = 'Centro';
            if (b.positionY < 33) posLabel = 'Arriba';
            else if (b.positionY > 66) posLabel = 'Abajo';
            document.getElementById('banner-pos-val').textContent = posLabel;

            document.getElementById('banner-fusion-val').textContent = `${b.fusionStrength}%`;
            document.getElementById('banner-opacity-val').textContent = `${b.imageOpacity}%`;

            applyStateToCSS();
        }

        function setBannerHeight(preset) {
            appState.appearance.banner.heightPreset = preset;
            syncBannerButtons();
            applyStateToCSS();
        }

        function setBannerFusion(preset) {
            appState.appearance.banner.fusionPreset = preset;
            syncBannerButtons();
            applyStateToCSS();
        }

        function syncBannerButtons() {
            const b = appState.appearance.banner;
            
            document.querySelectorAll('.banner-height-btn').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-pink-500');
                if (btn.getAttribute('onclick').includes(b.heightPreset)) btn.classList.add('ring-2', 'ring-pink-500');
            });

            document.querySelectorAll('.banner-fusion-btn').forEach(btn => {
                btn.classList.remove('ring-2', 'ring-pink-500');
                if (btn.getAttribute('onclick').includes(b.fusionPreset)) btn.classList.add('ring-2', 'ring-pink-500');
            });
            
            // Toggle visibility of banner controls if no image is present (Optional but nice)
            const controls = document.getElementById('banner-controls');
            if (appState.identity.bannerImg) {
                controls.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                controls.classList.add('opacity-50', 'pointer-events-none');
            }
        }
"""
content = content.replace("function setDeviceView(mode)", js_banner_logic + "\n        function setDeviceView(mode)")


# 5. update syncControlsFromState
sync_banner = """
            // Banner S4 Sync
            document.getElementById('range-banner-pos').value = appState.appearance.banner.positionY;
            document.getElementById('range-banner-fusion').value = appState.appearance.banner.fusionStrength;
            document.getElementById('range-banner-opacity').value = appState.appearance.banner.imageOpacity;
            syncBannerButtons();
            
            // Labels
            let posLabel = 'Centro';
            if (appState.appearance.banner.positionY < 33) posLabel = 'Arriba';
            else if (appState.appearance.banner.positionY > 66) posLabel = 'Abajo';
            document.getElementById('banner-pos-val').textContent = posLabel;
            document.getElementById('banner-fusion-val').textContent = `${appState.appearance.banner.fusionStrength}%`;
            document.getElementById('banner-opacity-val').textContent = `${appState.appearance.banner.imageOpacity}%`;
"""
content = content.replace("document.querySelectorAll('.grid-col-btn').forEach", sync_banner + "\n            document.querySelectorAll('.grid-col-btn').forEach")

# 6. applyStateToCSS logic
apply_banner_css = """
            // Banner CSS application
            const banner = a.banner;
            root.style.setProperty('--banner-pos-y', `${banner.positionY}%`);
            root.style.setProperty('--banner-opacity', banner.imageOpacity / 100);
            
            let heightPx = '250px';
            if (banner.heightPreset === 'compact') heightPx = '180px';
            else if (banner.heightPreset === 'large') heightPx = '350px';
            root.style.setProperty('--banner-height', heightPx);

            let mask = 'none';
            if (banner.fusionPreset !== 'none') {
                const strength = banner.fusionStrength / 100;
                let startFade = 100;
                let endFade = 100;
                if (banner.fusionPreset === 'soft') {
                    startFade = 100 - (30 * strength);
                    endFade = 100 - (70 * strength);
                } else if (banner.fusionPreset === 'medium') {
                    startFade = 100 - (50 * strength);
                    endFade = 100 - (90 * strength);
                } else if (banner.fusionPreset === 'deep') {
                    startFade = 100 - (70 * strength);
                    endFade = 100 - (100 * strength);
                }
                
                // e.g. linear-gradient(to bottom, rgba(0,0,0,1) startFade%, rgba(0,0,0,0) endFade%)
                mask = `linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) ${startFade}%, rgba(0,0,0,0) ${endFade}%)`;
            }
            
            // To ensure compatibility across browsers
            root.style.setProperty('--banner-mask', mask);
"""
content = content.replace("root.style.setProperty('--profile-border-width', `${l.profileBorder}px`);", apply_banner_css + "\n            root.style.setProperty('--profile-border-width', `${l.profileBorder}px`);")


# 7. update .render-banner CSS rule in the head
new_banner_css_rule = """        .render-banner {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: var(--banner-height, 250px);
            background-image: var(--banner-img);
            background-size: cover;
            background-position: center var(--banner-pos-y, 50%);
            -webkit-mask-image: var(--banner-mask, linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%));
            mask-image: var(--banner-mask, linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%));
            z-index: 1;
            opacity: var(--banner-opacity, 0.8);
            transition: all 0.3s ease;
        }"""
content = re.sub(r'\.render-banner \{.*?\}', new_banner_css_rule, content, flags=re.DOTALL)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
