import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. Update DEFAULT_TEMPLATE_CONFIG
old_socials_config = "socials: { ig: '', tk: '', yt: '', li: '' },"
new_socials_config = """socials: {
                enabled: true,
                displayMode: 'icons',
                items: []
            },"""
content = content.replace(old_socials_config, new_socials_config)

# 2. Add normalizer for backward compatibility
normalize_script = """function normalizeConfig(config) {
            // S2: Basic structure validation
            if (!config) config = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG));
            if (!config.appearance) config.appearance = DEFAULT_TEMPLATE_CONFIG.appearance;
            if (!config.content) config.content = DEFAULT_TEMPLATE_CONFIG.content;
            if (!config.links) config.links = [];"""

normalize_script_new = """function normalizeConfig(config) {
            // S2: Basic structure validation
            if (!config) config = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG));
            if (!config.appearance) config.appearance = DEFAULT_TEMPLATE_CONFIG.appearance;
            if (!config.content) config.content = DEFAULT_TEMPLATE_CONFIG.content;
            if (!config.links) config.links = [];
            
            // S8: Normalize Socials
            if (!config.socials || !config.socials.items || typeof config.socials.items.length === 'undefined') {
                config.socials = {
                    enabled: true,
                    displayMode: 'icons',
                    items: []
                };
            }"""
content = content.replace(normalize_script, normalize_script_new)

# 3. Add SOCIAL_PLATFORMS registry
registry_code = """
        // S8: Platform Registry
        const SOCIAL_PLATFORMS = {
            instagram: { id: 'instagram', label: 'Instagram', placeholder: 'instagram.com/usuario', icon: '<i class="fa-brands fa-instagram"></i>' },
            facebook: { id: 'facebook', label: 'Facebook', placeholder: 'facebook.com/usuario', icon: '<i class="fa-brands fa-facebook-f"></i>' },
            tiktok: { id: 'tiktok', label: 'TikTok', placeholder: 'tiktok.com/@usuario', icon: '<i class="fa-brands fa-tiktok"></i>' },
            youtube: { id: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@canal', icon: '<i class="fa-brands fa-youtube"></i>' },
            linkedin: { id: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/in/usuario', icon: '<i class="fa-brands fa-linkedin-in"></i>' },
            twitter: { id: 'twitter', label: 'X / Twitter', placeholder: 'twitter.com/usuario', icon: '<i class="fa-brands fa-x-twitter"></i>' },
            whatsapp: { id: 'whatsapp', label: 'WhatsApp', placeholder: 'wa.me/1234567890', icon: '<i class="fa-brands fa-whatsapp"></i>' },
            telegram: { id: 'telegram', label: 'Telegram', placeholder: 't.me/usuario', icon: '<i class="fa-brands fa-telegram"></i>' },
            email: { id: 'email', label: 'Email', placeholder: 'correo@dominio.com', icon: '<i class="fa-regular fa-envelope"></i>' },
            website: { id: 'website', label: 'Website', placeholder: 'https://www.dominio.com', icon: '<i class="fa-solid fa-globe"></i>' }
        };

        function addSocial(platformId) {
            const platform = SOCIAL_PLATFORMS[platformId];
            if (!platform) return;
            const newItem = {
                id: 'social_' + Math.random().toString(36).substr(2, 9),
                platform: platformId,
                label: platform.label,
                url: '',
                iconId: platform.id,
                enabled: true
            };
            appState.socials.items.push(newItem);
            renderSocialsEditor();
            updateContent();
        }

        function removeSocial(id) {
            appState.socials.items = appState.socials.items.filter(s => s.id !== id);
            renderSocialsEditor();
            updateContent();
        }

        function toggleSocial(id) {
            const item = appState.socials.items.find(s => s.id === id);
            if (item) {
                item.enabled = !item.enabled;
                renderSocialsEditor();
                updateContent();
            }
        }

        function updateSocialUrl(id, url) {
            const item = appState.socials.items.find(s => s.id === id);
            if (item) {
                item.url = url;
                updateContent();
            }
        }
        
        function normalizeUrl(url, platformId) {
            url = url.trim();
            if (!url) return '';
            if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:') || url.toLowerCase().startsWith('file:')) return '';
            if (platformId === 'email' && !url.startsWith('mailto:')) {
                if (url.includes('@')) return 'mailto:' + url;
            }
            if (!url.startsWith('http') && !url.startsWith('mailto:') && !url.startsWith('tel:')) {
                return 'https://' + url;
            }
            return url;
        }

        function renderSocialsEditor() {
            const container = document.getElementById('socials-list');
            if (!container) return;
            container.innerHTML = '';
            
            appState.socials.items.forEach((item, index) => {
                const platform = SOCIAL_PLATFORMS[item.platform];
                const iconHtml = platform ? platform.icon : '<i class="fa-solid fa-link"></i>';
                const el = document.createElement('div');
                el.className = `flex items-center gap-2 bg-slate-950 p-2 rounded-lg border ${item.enabled ? 'border-slate-800' : 'border-slate-800/50 opacity-50'}`;
                el.dataset.id = item.id;
                el.innerHTML = `
                    <div class="cursor-grab text-slate-600 px-1 hover:text-slate-400 drag-handle"><i class="fa-solid fa-grip-vertical"></i></div>
                    <div class="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-slate-400 shrink-0">
                        ${iconHtml}
                    </div>
                    <div class="flex-1 flex flex-col justify-center">
                        <div class="text-[10px] font-semibold text-slate-500 mb-0.5">${item.label}</div>
                        <input type="text" placeholder="${platform ? platform.placeholder : ''}" value="${item.url}" oninput="updateSocialUrl('${item.id}', this.value)" class="w-full bg-transparent text-xs text-white focus:outline-none">
                    </div>
                    <button onclick="toggleSocial('${item.id}')" class="w-7 h-7 flex items-center justify-center rounded bg-slate-900 text-slate-400 hover:text-white" title="${item.enabled ? 'Desactivar' : 'Activar'}">
                        <i class="fa-solid ${item.enabled ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                    <button onclick="removeSocial('${item.id}')" class="w-7 h-7 flex items-center justify-center rounded bg-red-900/30 text-red-400 hover:bg-red-900/50" aria-label="Eliminar">
                        <i class="fa-solid fa-trash-can text-xs"></i>
                    </button>
                `;
                container.appendChild(el);
            });
        }
        
        // Add to init controls
"""

content = content.replace("// S2: Config Initialization", registry_code + "\n        // S2: Config Initialization")

# 4. Modify initControls to init Sortable for Socials
init_controls = """            new Sortable(document.getElementById('buttons-list'), {
                animation: 150,
                handle: '.drag-handle',
                onEnd: function (evt) {
                    const item = appState.links.splice(evt.oldIndex, 1)[0];
                    appState.links.splice(evt.newIndex, 0, item);
                    updateContent();
                }
            });"""

init_controls_new = """            new Sortable(document.getElementById('buttons-list'), {
                animation: 150,
                handle: '.drag-handle',
                onEnd: function (evt) {
                    const item = appState.links.splice(evt.oldIndex, 1)[0];
                    appState.links.splice(evt.newIndex, 0, item);
                    updateContent();
                }
            });
            
            new Sortable(document.getElementById('socials-list'), {
                animation: 150,
                handle: '.drag-handle',
                onEnd: function (evt) {
                    const item = appState.socials.items.splice(evt.oldIndex, 1)[0];
                    appState.socials.items.splice(evt.newIndex, 0, item);
                    updateContent();
                }
            });"""
content = content.replace(init_controls, init_controls_new)

# 5. Modify syncControlsFromState
sync_controls = """document.getElementById('input-footer-text').value = appState.content.footerText;"""
sync_controls_new = """document.getElementById('input-footer-text').value = appState.content.footerText;
            renderSocialsEditor();"""
content = content.replace(sync_controls, sync_controls_new)

# 6. Replace the old Socials UI with the new UI
old_ui_regex = r"<!-- Redes Sociales Peque\?as Section -->.*?</div>\s*</div>"
new_ui = """<!-- S8: Redes Sociales Manager -->
                    <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">
                        <div class="flex justify-between items-center">
                            <h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2">
                                <i class="fa-solid fa-hashtag"></i> Redes Sociales
                            </h3>
                            <div class="relative group">
                                <button class="text-[10px] bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 px-2 py-1 rounded transition">
                                    + Añadir red
                                </button>
                                <div class="absolute right-0 mt-1 w-48 bg-slate-900 border border-slate-700 rounded-lg shadow-xl hidden group-hover:block z-50 p-2 grid grid-cols-2 gap-1">
                                    <button onclick="addSocial('instagram')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-instagram"></i> Instagram</button>
                                    <button onclick="addSocial('facebook')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-facebook-f"></i> Facebook</button>
                                    <button onclick="addSocial('tiktok')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-tiktok"></i> TikTok</button>
                                    <button onclick="addSocial('youtube')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-youtube"></i> YouTube</button>
                                    <button onclick="addSocial('linkedin')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-linkedin-in"></i> LinkedIn</button>
                                    <button onclick="addSocial('twitter')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-x-twitter"></i> X</button>
                                    <button onclick="addSocial('whatsapp')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-brands fa-whatsapp"></i> WhatsApp</button>
                                    <button onclick="addSocial('website')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2"><i class="fa-solid fa-globe"></i> Website</button>
                                    <button onclick="addSocial('email')" class="text-[10px] text-left px-2 py-1.5 hover:bg-slate-800 rounded text-slate-300 flex items-center gap-2 col-span-2"><i class="fa-regular fa-envelope"></i> Email</button>
                                </div>
                            </div>
                        </div>
                        <p class="text-[10px] text-slate-400">Añade y ordena los iconos sociales. Desactiva los que no quieras mostrar.</p>
                        
                        <div id="socials-list" class="space-y-2">
                            <!-- Injected by JS -->
                        </div>
                    </div>"""
content = re.sub(old_ui_regex, new_ui, content, flags=re.DOTALL)

# 7. Modify rendering of socials in updateContent
old_render_socials = """            // Social Icons
            const socialIcons = document.getElementById('view-social-icons');
            socialIcons.innerHTML = '';
            let hasSocials = false;
            
            const renderSocial = (val, iconClass) => {
                if (val && val.trim() !== '') {
                    hasSocials = true;
                    // Simple logic for links: if it doesn't start with http or mailto, add https://
                    let url = val;
                    if (!url.startsWith('http') && !url.startsWith('mailto:')) url = 'https://' + url;
                    
                    const a = document.createElement('a');
                    a.href = url;
                    a.target = '_blank';
                    a.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:-translate-y-1';
                    
                    // Uses the accent-icon-color via CSS
                    a.style.color = 'var(--accent-icon-color)';
                    a.innerHTML = `<i class="${iconClass}"></i>`;
                    socialIcons.appendChild(a);
                }
            };

            renderSocial(appState.socials.ig, 'fa-brands fa-instagram');
            renderSocial(appState.socials.tk, 'fa-brands fa-tiktok');
            renderSocial(appState.socials.yt, 'fa-brands fa-youtube');
            renderSocial(appState.socials.li, 'fa-brands fa-linkedin-in');

            if (hasSocials) {
                socialIcons.classList.remove('hidden');
            } else {
                socialIcons.classList.add('hidden');
            }"""

new_render_socials = """            // S8: Social Icons
            const socialIcons = document.getElementById('view-social-icons');
            socialIcons.innerHTML = '';
            
            if (appState.socials && appState.socials.enabled && appState.socials.items && appState.socials.items.length > 0) {
                let hasActiveSocials = false;
                appState.socials.items.forEach(item => {
                    if (item.enabled && item.url && item.url.trim() !== '') {
                        hasActiveSocials = true;
                        const platform = SOCIAL_PLATFORMS[item.platform];
                        const url = normalizeUrl(item.url, item.platform);
                        if (!url) return;
                        
                        const a = document.createElement('a');
                        a.href = url;
                        a.target = '_blank';
                        a.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-transform hover:-translate-y-1';
                        a.style.color = 'var(--accent-icon-color)';
                        a.innerHTML = platform ? platform.icon : '<i class="fa-solid fa-link"></i>';
                        a.setAttribute('aria-label', item.label);
                        socialIcons.appendChild(a);
                    }
                });
                
                if (hasActiveSocials) {
                    socialIcons.classList.remove('hidden');
                } else {
                    socialIcons.classList.add('hidden');
                }
            } else {
                socialIcons.classList.add('hidden');
            }"""
content = content.replace(old_render_socials, new_render_socials)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)

print("Applied S8 modifications.")
