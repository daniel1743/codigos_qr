import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# We need to inject the Config Foundation logic.

new_config_logic = """
        // ---------------------------------------------------------
        // S2 CONFIG FOUNDATION
        // ---------------------------------------------------------
        const DEFAULT_TEMPLATE_CONFIG = {
            schemaVersion: 1,
            identity: {
                logoText: 'Eudora',
                subtitleText: 'CONSULTORA',
                titleText: 'VANESA ALVES',
                profileImg: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop',
                bannerImg: ''
            },
            socials: { ig: '', tk: '', yt: '', li: '' },
            content: {
                footerText: 'Clique para interagir'
            },
            links: [
                { id: 'b1', text: 'Facebook', icon: 'fa-brands fa-facebook-f', url: '#', fullWidth: true },
                { id: 'b2', text: 'Instagram', icon: 'fa-brands fa-instagram', url: '#', fullWidth: false },
                { id: 'b3', text: 'E-mail', icon: 'fa-regular fa-envelope', url: 'mailto:ejemplo@correo.com', fullWidth: false },
                { id: 'b4', text: 'Whatsapp', icon: 'fa-brands fa-whatsapp', url: '#', fullWidth: false },
                { id: 'b5', text: 'Localiza??o', icon: 'fa-solid fa-location-dot', url: '#', fullWidth: false }
            ],
            appearance: {
                bgImage: '',
                bgOverlay: 0,
                bgStart: '#95547B',
                bgMid: '#B46A94',
                bgEnd: '#8C476E',
                bgAngle: 180,
                btnBgStart: '#ffffff',
                btnBgEnd: '#ffffff',
                btnBorderColor: '#ffffff',
                accentBgStart: '#f5d1e6',
                accentBgEnd: '#e0a3c7',
                accentIconColor: '#5c2d47',
                btnTextColor: '#ffffff',
                fontLogo: 'Cinzel',
                fontHeading: 'Cinzel',
                fontSubtitle: 'Oswald',
                fontBody: 'Oswald',
                profileRadius: '50%',
                btnRadius: '9999px'
            },
            layout: {
                gridCols: 2,
                profileBorder: 4,
                profileSize: 170,
                logoSize: 3.2,
                titleSize: 2.2,
                devicePreview: 'mobile'
            }
        };

        // Current volatile state
        let appState = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG));

        window.validateTemplateConfig = function(config) {
            if (!config || typeof config !== 'object') return { valid: false, errors: ['Config is null or not an object'] };
            if (config.schemaVersion !== 1) return { valid: false, errors: ['Unsupported schemaVersion'] };
            const errors = [];
            if (config.links && !Array.isArray(config.links)) errors.push('links must be an array');
            if (config.links) {
                config.links.forEach((l, i) => {
                    if (!l.id) errors.push(`Link at index ${i} is missing an id`);
                });
            }
            if (config.layout && config.layout.gridCols && typeof config.layout.gridCols !== 'number') errors.push('gridCols must be a number');
            return { valid: errors.length === 0, errors };
        };

        window.normalizeTemplateConfig = function(config) {
            const def = JSON.parse(JSON.stringify(DEFAULT_TEMPLATE_CONFIG));
            if (!config || typeof config !== 'object') return def;
            
            const merge = (target, source) => {
                for (const key in source) {
                    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                        if (!target[key]) target[key] = {};
                        merge(target[key], source[key]);
                    } else if (Array.isArray(source[key])) {
                        // For links, ensure each has an ID
                        target[key] = source[key].map(item => {
                            if (!item.id) item.id = 'id_' + Math.random().toString(36).substr(2, 9);
                            return item;
                        });
                    } else {
                        target[key] = source[key];
                    }
                }
            };
            
            merge(def, config);
            return def;
        };

        window.getTemplateConfig = function() {
            return JSON.parse(JSON.stringify(appState));
        };

        window.loadTemplateConfig = function(config) {
            const validation = window.validateTemplateConfig(config);
            if (!validation.valid) {
                console.error("Config validation failed:", validation.errors);
                // We shouldn't crash, we just normalize
            }
            appState = window.normalizeTemplateConfig(config);
            
            syncControlsFromState();
            applyStateToCSS();
            renderCanvas();
            renderControlsList();
            setDeviceView(appState.layout.devicePreview);
        };

        function hexToRgba(hex, alpha) {
            let r = 0, g = 0, b = 0;
            if(hex.length === 4){
                r = parseInt(hex[1]+hex[1], 16);
                g = parseInt(hex[2]+hex[2], 16);
                b = parseInt(hex[3]+hex[3], 16);
            } else if(hex.length === 7){
                r = parseInt(hex[1]+hex[2], 16);
                g = parseInt(hex[3]+hex[4], 16);
                b = parseInt(hex[5]+hex[6], 16);
            }
            return `rgba(${r},${g},${b},${alpha})`;
        }

        function applyStateToCSS() {
            const root = document.documentElement;
            const a = appState.appearance;
            const l = appState.layout;
            
            root.style.setProperty('--bg-image', a.bgImage ? `url('${a.bgImage}')` : 'none');
            root.style.setProperty('--bg-overlay', a.bgOverlay / 100);
            root.style.setProperty('--bg-start', a.bgStart);
            root.style.setProperty('--bg-mid', a.bgMid);
            root.style.setProperty('--bg-end', a.bgEnd);
            root.style.setProperty('--bg-angle', `${a.bgAngle}deg`);

            root.style.setProperty('--btn-bg-start', hexToRgba(a.btnBgStart, 0.15));
            root.style.setProperty('--btn-bg-end', hexToRgba(a.btnBgEnd, 0.35));
            root.style.setProperty('--btn-border-color', hexToRgba(a.btnBorderColor, 0.7));

            root.style.setProperty('--accent-bg-start', a.accentBgStart);
            root.style.setProperty('--accent-bg-end', a.accentBgEnd);
            root.style.setProperty('--accent-icon-color', a.accentIconColor);

            root.style.setProperty('--btn-text-color', a.btnTextColor);

            root.style.setProperty('--font-logo', a.fontLogo);
            root.style.setProperty('--font-heading', a.fontHeading);
            root.style.setProperty('--font-subtitle', a.fontSubtitle);
            root.style.setProperty('--font-body', a.fontBody);

            root.style.setProperty('--profile-radius', a.profileRadius);
            root.style.setProperty('--btn-radius', a.btnRadius);
            
            root.style.setProperty('--profile-border-width', `${l.profileBorder}px`);
            root.style.setProperty('--profile-size', `${l.profileSize}px`);
            root.style.setProperty('--logo-size', `${l.logoSize}rem`);
            root.style.setProperty('--title-size', `${l.titleSize}rem`);
        }

        function syncControlsFromState() {
            // Identity
            document.getElementById('input-logo-text').value = appState.identity.logoText;
            document.getElementById('input-subtitle-text').value = appState.identity.subtitleText;
            document.getElementById('input-title-text').value = appState.identity.titleText;
            document.getElementById('input-profile-img').value = appState.identity.profileImg;
            document.getElementById('input-banner-img').value = appState.identity.bannerImg;

            // Content
            document.getElementById('input-footer-text').value = appState.content.footerText;

            // Socials
            document.getElementById('social-ig').value = appState.socials.ig;
            document.getElementById('social-tk').value = appState.socials.tk;
            document.getElementById('social-yt').value = appState.socials.yt;
            document.getElementById('social-li').value = appState.socials.li;

            // Appearance - Background
            document.getElementById('input-bg-image').value = appState.appearance.bgImage;
            document.getElementById('range-bg-overlay').value = appState.appearance.bgOverlay;
            document.getElementById('overlay-val').textContent = appState.appearance.bgOverlay;
            document.getElementById('color-bg-start').value = appState.appearance.bgStart;
            document.getElementById('color-bg-mid').value = appState.appearance.bgMid;
            document.getElementById('color-bg-end').value = appState.appearance.bgEnd;
            document.getElementById('range-bg-angle').value = appState.appearance.bgAngle;
            document.getElementById('angle-val').textContent = appState.appearance.bgAngle;

            // Appearance - Buttons
            document.getElementById('color-btn-start').value = appState.appearance.btnBgStart;
            document.getElementById('color-btn-end').value = appState.appearance.btnBgEnd;
            document.getElementById('color-btn-border').value = appState.appearance.btnBorderColor;
            document.getElementById('color-btn-text').value = appState.appearance.btnTextColor;
            
            // Appearance - Accents
            document.getElementById('color-accent-start').value = appState.appearance.accentBgStart;
            document.getElementById('color-accent-end').value = appState.appearance.accentBgEnd;
            document.getElementById('color-accent-icon').value = appState.appearance.accentIconColor;

            // Typography
            document.getElementById('select-font-logo').value = appState.appearance.fontLogo;
            document.getElementById('select-font-heading').value = appState.appearance.fontHeading;

            // Layout
            document.getElementById('range-profile-border').value = appState.layout.profileBorder;
            document.getElementById('val-profile-border').textContent = `${appState.layout.profileBorder}px`;
            document.getElementById('range-profile-size').value = appState.layout.profileSize;
            document.getElementById('val-profile-size').textContent = `${appState.layout.profileSize}px`;
            document.getElementById('range-logo-size').value = appState.layout.logoSize;
            document.getElementById('val-logo-size').textContent = `${appState.layout.logoSize}rem`;
            document.getElementById('range-title-size').value = appState.layout.titleSize;
            document.getElementById('val-title-size').textContent = `${appState.layout.titleSize}rem`;

            // Active Shape buttons
            document.querySelectorAll('.avatar-shape-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            const avatarBtns = Array.from(document.querySelectorAll('.avatar-shape-btn'));
            const activeAvatar = avatarBtns.find(b => b.getAttribute('onclick').includes(appState.appearance.profileRadius));
            if(activeAvatar) activeAvatar.classList.add('ring-2', 'ring-pink-500');

            document.querySelectorAll('.btn-radius-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            const radiusBtns = Array.from(document.querySelectorAll('.btn-radius-btn'));
            const activeRadius = radiusBtns.find(b => b.getAttribute('onclick').includes(appState.appearance.btnRadius));
            if(activeRadius) activeRadius.classList.add('ring-2', 'ring-pink-500');
            
            // Grid cols
            document.querySelectorAll('.grid-col-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            const activeGrid = Array.from(document.querySelectorAll('.grid-col-btn')).find(b => b.getAttribute('onclick').includes(appState.layout.gridCols));
            if(activeGrid) activeGrid.classList.add('ring-2', 'ring-pink-500');
        }
        // ---------------------------------------------------------
"""

# Replace the old `appState` with the new one
old_appstate_regex = re.compile(r"let appState = \{.*?\};\s*", re.DOTALL)
content = old_appstate_regex.sub(new_config_logic, content)

# ---------------------------------------------------------
# UPDATE EXISTING FUNCTIONS TO USE appState

# updateContent()
new_update_content = """function updateContent() {
            appState.identity.logoText = document.getElementById('input-logo-text').value;
            appState.identity.subtitleText = document.getElementById('input-subtitle-text').value;
            appState.identity.titleText = document.getElementById('input-title-text').value;
            appState.identity.profileImg = document.getElementById('input-profile-img').value;
            appState.identity.bannerImg = document.getElementById('input-banner-img').value;
            appState.content.footerText = document.getElementById('input-footer-text').value;

            appState.socials = {
                ig: document.getElementById('social-ig').value,
                tk: document.getElementById('social-tk').value,
                yt: document.getElementById('social-yt').value,
                li: document.getElementById('social-li').value
            };

            renderCanvas();
        }"""
content = re.sub(r"function updateContent\(\) \{.*?renderCanvas\(\);\s*\}", new_update_content, content, flags=re.DOTALL)


# updateStyles()
new_update_styles = """function updateStyles() {
            appState.appearance.bgImage = document.getElementById('input-bg-image').value;
            appState.appearance.bgOverlay = document.getElementById('range-bg-overlay').value;
            appState.appearance.bgStart = document.getElementById('color-bg-start').value;
            appState.appearance.bgMid = document.getElementById('color-bg-mid').value;
            appState.appearance.bgEnd = document.getElementById('color-bg-end').value;
            appState.appearance.bgAngle = document.getElementById('range-bg-angle').value;

            appState.appearance.btnBgStart = document.getElementById('color-btn-start').value;
            appState.appearance.btnBgEnd = document.getElementById('color-btn-end').value;
            appState.appearance.btnBorderColor = document.getElementById('color-btn-border').value;
            
            appState.appearance.accentBgStart = document.getElementById('color-accent-start').value;
            appState.appearance.accentBgEnd = document.getElementById('color-accent-end').value;
            appState.appearance.accentIconColor = document.getElementById('color-accent-icon').value;

            appState.appearance.btnTextColor = document.getElementById('color-btn-text').value;

            appState.appearance.fontLogo = document.getElementById('select-font-logo').value;
            appState.appearance.fontHeading = document.getElementById('select-font-heading').value;
            
            document.getElementById('overlay-val').textContent = appState.appearance.bgOverlay;
            document.getElementById('angle-val').textContent = appState.appearance.bgAngle;

            applyStateToCSS();
        }"""
# Need a specific regex because of hexToRgba which we removed from updateStyles and added globally earlier
content = re.sub(r"function updateStyles\(\) \{.*?document\.getElementById\('select-font-heading'\)\.value\);\s*\}", new_update_styles, content, flags=re.DOTALL)


# updateLayoutSizes()
new_update_layout = """function updateLayoutSizes() {
            appState.layout.logoSize = document.getElementById('range-logo-size').value;
            appState.layout.profileSize = document.getElementById('range-profile-size').value;
            appState.layout.titleSize = document.getElementById('range-title-size').value;
            appState.layout.profileBorder = document.getElementById('range-profile-border').value;

            document.getElementById('val-logo-size').textContent = `${appState.layout.logoSize}rem`;
            document.getElementById('val-profile-size').textContent = `${appState.layout.profileSize}px`;
            document.getElementById('val-title-size').textContent = `${appState.layout.titleSize}rem`;
            document.getElementById('val-profile-border').textContent = `${appState.layout.profileBorder}px`;
            
            applyStateToCSS();
        }"""
content = re.sub(r"function updateLayoutSizes\(\) \{.*?\n        \}", new_update_layout, content, flags=re.DOTALL)


# renderCanvas()
# It was using appState.logoText directly, now it's appState.identity.logoText
content = content.replace("appState.logoText", "appState.identity.logoText")
content = content.replace("appState.subtitleText", "appState.identity.subtitleText")
content = content.replace("appState.titleText", "appState.identity.titleText")
content = content.replace("appState.profileImg", "appState.identity.profileImg")
content = content.replace("appState.footerText", "appState.content.footerText")
content = content.replace("appState.bannerImg", "appState.identity.bannerImg")
content = content.replace("appState.buttons", "appState.links")
content = content.replace("appState.gridCols", "appState.layout.gridCols")


# setDeviceView()
# Track it in state
content = content.replace(
    "function setDeviceView(mode) {",
    "function setDeviceView(mode) {\n            appState.layout.devicePreview = mode;"
)

# setGridCols()
content = content.replace(
    "function setGridCols(cols, btnElement) {",
    "function setGridCols(cols, btnElement) {\n            appState.layout.gridCols = cols;"
)
content = content.replace(
    "function setGridCols(cols) {",
    "function setGridCols(cols, btnElement) {\n            appState.layout.gridCols = cols;"
)

# Buttons
# addBtn logic
new_add_button = """function addButton() {
            const id = 'b' + Date.now() + Math.random().toString(36).substr(2, 5);
            appState.links.push({
                id: id,
                text: 'Nuevo Bot?n',
                icon: 'fa-solid fa-link',
                url: '#',
                fullWidth: false
            });
            renderControlsList();
            renderCanvas();
        }"""
content = re.sub(r"function addButton\(\) \{.*?renderCanvas\(\);\s*\}", new_add_button, content, flags=re.DOTALL)

new_remove_button = """function removeButton(id) {
            appState.links = appState.links.filter(b => b.id !== id);
            renderControlsList();
            renderCanvas();
        }"""
content = re.sub(r"function removeButton\(id\) \{.*?renderCanvas\(\);\s*\}", new_remove_button, content, flags=re.DOTALL)

new_toggle_width = """function toggleFullWidth(id) {
            const btn = appState.links.find(b => b.id === id);
            if (btn) {
                btn.fullWidth = !btn.fullWidth;
                renderControlsList();
                renderCanvas();
            }
        }"""
content = re.sub(r"function toggleFullWidth\(id\) \{.*?renderCanvas\(\);\s*\}", new_toggle_width, content, flags=re.DOTALL)

new_update_btn_data = """function updateButtonData(id, key, val) {
            const btn = appState.links.find(b => b.id === id);
            if(btn) {
                btn[key] = val;
                renderCanvas();
            }
        }"""
content = re.sub(r"function updateButtonData\(id, key, val\) \{.*?renderCanvas\(\);\s*\}", new_update_btn_data, content, flags=re.DOTALL)


# Avatar / btn radius update state
content = content.replace(
    "function setBtnRadius(radius, btnElement) {",
    "function setBtnRadius(radius, btnElement) {\n            appState.appearance.btnRadius = radius;\n            applyStateToCSS();"
)
content = content.replace(
    "document.documentElement.style.setProperty('--btn-radius', radius);",
    ""
)

content = content.replace(
    "function setAvatarShape(radius, btnElement) {",
    "function setAvatarShape(radius, btnElement) {\n            appState.appearance.profileRadius = radius;\n            applyStateToCSS();"
)
content = content.replace(
    "document.documentElement.style.setProperty('--profile-radius', radius);",
    ""
)

# Make resetTemplate use loadTemplateConfig
new_reset = """function resetTemplate() {
            if(confirm('?Deseas restablecer la plantilla a sus valores iniciales?')) {
                window.loadTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
            }
        }"""
content = re.sub(r"function resetTemplate\(\) \{.*?\}", new_reset, content, flags=re.DOTALL)


# Need to add initialization on window load
init_call = """
        // Initialize on load
        window.addEventListener('DOMContentLoaded', () => {
            window.loadTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
        });
"""
content = content.replace("renderControlsList();\n        setupSortable();\n        renderCanvas();", init_call + "\n        setupSortable();")


# Let's fix hexToRgba removal that might happen if we regexed it accidentally
# I'll just write it back using a script.
with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)

print("Modifications applied successfully.")
