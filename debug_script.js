
        // Initial Template State Data
        
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
// Available FontAwesome Icons for dropdown picker
        const availableIcons = [
            { name: 'Facebook', class: 'fa-brands fa-facebook-f' },
            { name: 'Instagram', class: 'fa-brands fa-instagram' },
            { name: 'Whatsapp', class: 'fa-brands fa-whatsapp' },
            { name: 'Email', class: 'fa-regular fa-envelope' },
            { name: 'Ubicación', class: 'fa-solid fa-location-dot' },
            { name: 'TikTok', class: 'fa-brands fa-tiktok' },
            { name: 'YouTube', class: 'fa-brands fa-youtube' },
            { name: 'Twitter/X', class: 'fa-brands fa-x-twitter' },
            { name: 'Sitio Web', class: 'fa-solid fa-globe' },
            { name: 'Teléfono', class: 'fa-solid fa-phone' },
            { name: 'Tienda', class: 'fa-solid fa-bag-shopping' }
        ];

        // Init on DOM Content Loaded
        document.addEventListener('DOMContentLoaded', () => {
            renderControlsList();
            renderCanvas();
            setupSortable();
            applyResponsiveDeviceView();
            window.addEventListener('resize', applyResponsiveDeviceView);        });

        // Tab Switching Engine
        function switchTab(tab) {
            ['content', 'styles', 'layout'].forEach(t => {
                document.getElementById(`tab-${t}`).classList.add('hidden');
                document.getElementById(`tab-btn-${t}`).classList.remove('border-pink-500', 'text-pink-400');
                document.getElementById(`tab-btn-${t}`).classList.add('border-transparent', 'text-slate-400');
            });

            document.getElementById(`tab-${tab}`).classList.remove('hidden');
            document.getElementById(`tab-btn-${tab}`).classList.add('border-pink-500', 'text-pink-400');
            document.getElementById(`tab-btn-${tab}`).classList.remove('border-transparent', 'text-slate-400');
        }

        function applyResponsiveDeviceView() {
            const container = document.getElementById('phone-container');
            if (!container) return;
            if (window.innerWidth <= 900) {
                container.classList.remove('w-[850px]', 'h-[780px]', 'rounded-3xl', 'desktop-view');
                container.classList.add('w-[390px]', 'h-[780px]', 'rounded-[48px]');
            }
        }
        // Device View Switcher
        function setDeviceView(mode) {
            appState.layout.devicePreview = mode;
            const container = document.getElementById('phone-container');
            const btnMobile = document.getElementById('view-mobile');
            const btnDesktop = document.getElementById('view-desktop');

            if (mode === 'desktop') {
                container.classList.remove('w-[390px]', 'h-[780px]', 'rounded-[48px]');
                container.classList.add('w-[850px]', 'h-[780px]', 'rounded-3xl', 'desktop-view');
                btnDesktop.classList.add('bg-pink-600', 'text-white');
                btnDesktop.classList.remove('text-slate-400');
                btnMobile.classList.remove('bg-pink-600', 'text-white');
                btnMobile.classList.add('text-slate-400');
            } else {
                container.classList.remove('w-[850px]', 'h-[780px]', 'rounded-3xl', 'desktop-view');
                container.classList.add('w-[390px]', 'h-[780px]', 'rounded-[48px]');
                btnMobile.classList.add('bg-pink-600', 'text-white');
                btnMobile.classList.remove('text-slate-400');
                btnDesktop.classList.remove('bg-pink-600', 'text-white');
                btnDesktop.classList.add('text-slate-400');
            }
        }

        // Render Button Controls List in Left Sidebar
        function renderControlsList() {
            const container = document.getElementById('buttons-control-list');
            container.innerHTML = '';

            appState.links.forEach((btn, index) => {
                const card = document.createElement('div');
                card.className = 'bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 relative group';
                card.setAttribute('data-id', btn.id);

                card.innerHTML = `
                    <div class="flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2 cursor-grab drag-handle text-slate-500 hover:text-slate-300">
                            <i class="fa-solid fa-grip-vertical"></i>
                            <span class="text-xs font-bold text-slate-300">#${index + 1}</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button onclick="toggleFullWidth('${btn.id}')" title="Alternar Ancho Completo" class="text-[10px] px-2 py-1 rounded ${btn.fullWidth ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30' : 'bg-slate-800 text-slate-400'}">
                                ${btn.fullWidth ? 'Ancho Completo' : 'Normal'}
                            </button>
                            <button onclick="removeButton('${btn.id}')" class="text-slate-500 hover:text-rose-400 p-1">
                                <i class="fa-solid fa-trash-can text-xs"></i>
                            </button>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="text" value="${btn.text}" oninput="updateButtonData('${btn.id}', 'text', this.value)" placeholder="Texto" class="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-pink-500">
                        <select onchange="updateButtonData('${btn.id}', 'icon', this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-pink-500">
                            ${availableIcons.map(i => `<option value="${i.class}" ${i.class === btn.icon ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>
                    <input type="text" value="${btn.url}" oninput="updateButtonData('${btn.id}', 'url', this.value)" placeholder="URL de Destino / Link" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400 focus:outline-none focus:border-pink-500">
                `;
                container.appendChild(card);
            });
        }

        // Setup Drag & Drop using SortableJS
        function setupSortable() {
            const el = document.getElementById('buttons-control-list');
            Sortable.create(el, {
                handle: '.drag-handle',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: function () {
                    const newOrderIds = Array.from(el.children).map(child => child.getAttribute('data-id'));
                    appState.links.sort((a, b) => newOrderIds.indexOf(a.id) - newOrderIds.indexOf(b.id));
                    renderCanvas();
                    renderControlsList();
                }
            });
        }

        // Button Data Manipulations
        function addButton() {
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
        }

        function removeButton(id) {
            appState.links = appState.links.filter(b => b.id !== id);
            renderControlsList();
            renderCanvas();
        }

        function toggleFullWidth(id) {
            const btn = appState.links.find(b => b.id === id);
            if (btn) {
                btn.fullWidth = !btn.fullWidth;
                renderControlsList();
                renderCanvas();
            }
        }

        function updateButtonData(id, key, val) {
            const btn = appState.links.find(b => b.id === id);
            if(btn) {
                btn[key] = val;
                renderCanvas();
            }
        }

        // Live Text Content Update
        function updateContent() {
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
        }

        // Live Style Custom Properties Update
        function updateStyles() {
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
        }

        function updateLayoutSizes() {
            appState.layout.logoSize = document.getElementById('range-logo-size').value;
            appState.layout.profileSize = document.getElementById('range-profile-size').value;
            appState.layout.titleSize = document.getElementById('range-title-size').value;
            appState.layout.profileBorder = document.getElementById('range-profile-border').value;

            document.getElementById('val-logo-size').textContent = `${appState.layout.logoSize}rem`;
            document.getElementById('val-profile-size').textContent = `${appState.layout.profileSize}px`;
            document.getElementById('val-title-size').textContent = `${appState.layout.titleSize}rem`;
            document.getElementById('val-profile-border').textContent = `${appState.layout.profileBorder}px`;
            
            applyStateToCSS();
        }

        function setGridCols(cols, btnElement) {
            appState.layout.gridCols = cols;
            appState.layout.gridCols = cols;
            const btn1 = document.getElementById('btn-col-1');
            const btn2 = document.getElementById('btn-col-2');

            if (cols === 1) {
                btn1.className = 'py-2 px-3 text-xs border border-pink-500 bg-pink-500/20 rounded-xl text-pink-300 font-medium transition';
                btn2.className = 'py-2 px-3 text-xs border border-slate-700 bg-slate-950 rounded-xl text-slate-300 font-medium hover:border-pink-500 transition';
            } else {
                btn2.className = 'py-2 px-3 text-xs border border-pink-500 bg-pink-500/20 rounded-xl text-pink-300 font-medium transition';
                btn1.className = 'py-2 px-3 text-xs border border-slate-700 bg-slate-950 rounded-xl text-slate-300 font-medium hover:border-pink-500 transition';
            }
            renderCanvas();
        }

        function setBtnRadius(radius, btnElement) {
            appState.appearance.btnRadius = radius;
            applyStateToCSS();
            document.querySelectorAll('.btn-radius-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            if(btnElement) btnElement.classList.add('ring-2', 'ring-pink-500');
            
        }

        function setAvatarShape(radius, btnElement) {
            appState.appearance.profileRadius = radius;
            applyStateToCSS();
            document.querySelectorAll('.avatar-shape-btn').forEach(btn => btn.classList.remove('ring-2', 'ring-pink-500'));
            if(btnElement) btnElement.classList.add('ring-2', 'ring-pink-500');
            
        }

        // Helper Hex to RGBA
        

        // Render Live Preview
        function renderCanvas() {
            document.documentElement.style.setProperty('--banner-img', appState.identity.bannerImg ? `url('${appState.identity.bannerImg}')` : 'none');
            
            document.getElementById('view-logo').textContent = appState.identity.logoText;
            document.getElementById('view-subtitle').textContent = appState.identity.subtitleText;
            document.getElementById('view-title').textContent = appState.identity.titleText;
            document.getElementById('view-profile-img').src = appState.identity.profileImg;
            document.getElementById('view-footer-text').textContent = appState.content.footerText;

            // Render Social Icons
            const socialContainer = document.getElementById('view-social-icons');
            socialContainer.innerHTML = '';
            let hasSocials = false;
            
            const socialMap = [
                { id: 'ig', icon: 'fa-brands fa-instagram' },
                { id: 'tk', icon: 'fa-brands fa-tiktok' },
                { id: 'yt', icon: 'fa-brands fa-youtube' },
                { id: 'li', icon: 'fa-brands fa-linkedin-in' }
            ];

            socialMap.forEach(s => {
                if(appState.socials[s.id]) {
                    hasSocials = true;
                    socialContainer.innerHTML += `<a href="${appState.socials[s.id]}" class="social-icon-link" target="_blank"><i class="${s.icon}"></i></a>`;
                }
            });

            if(hasSocials) {
                socialContainer.classList.remove('hidden');
            } else {
                socialContainer.classList.add('hidden');
            }

            const gridContainer = document.getElementById('view-buttons-grid');
            gridContainer.className = `w-full z-10 grid gap-3 mb-8 transition-all ${appState.layout.gridCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}`;
            gridContainer.innerHTML = '';

            appState.links.forEach(btn => {
                const a = document.createElement('a');
                a.href = btn.url || '#';
                a.onclick = (e) => e.preventDefault(); // Prevent navigation inside studio
                a.className = `render-btn flex items-stretch overflow-hidden text-decoration-none ${btn.fullWidth ? 'col-span-full justify-self-center w-[70%]' : 'w-full'}`;
                
                a.innerHTML = `
                    <span class="flex-1 py-2.5 px-3 text-xs font-medium flex items-center justify-center border-r border-white/20 truncate">
                        ${btn.text}
                    </span>
                    <div class="render-btn-icon min-w-[42px] flex items-center justify-center px-2">
                        <i class="${btn.icon} text-base"></i>
                    </div>
                `;
                gridContainer.appendChild(a);
            });
        }

        // EXPORT ENGINE: Build dynamic standalone HTML Code
        function openExportModal() {
            const root = getComputedStyle(document.documentElement);
            
            const generatedHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appState.identity.titleText} - Perfil Bio Link</title>
    <script src="https://cdn.tailwindcss.com"><\/script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@400;600;800&family=Oswald:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,600;1,400&family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    
    <style>
        :root {
            --bg-start: ${root.getPropertyValue('--bg-start')};
            --bg-mid: ${root.getPropertyValue('--bg-mid')};
            --bg-end: ${root.getPropertyValue('--bg-end')};
            --bg-angle: ${root.getPropertyValue('--bg-angle')};
            --bg-image: ${root.getPropertyValue('--bg-image')};
            --bg-overlay: ${root.getPropertyValue('--bg-overlay')};
            --banner-img: ${root.getPropertyValue('--banner-img')};

            --text-primary: ${root.getPropertyValue('--text-primary')};
            --text-subtitle: ${root.getPropertyValue('--text-subtitle')};
            --btn-text-color: ${root.getPropertyValue('--btn-text-color')};

            --btn-bg-start: ${root.getPropertyValue('--btn-bg-start')};
            --btn-bg-end: ${root.getPropertyValue('--btn-bg-end')};
            --btn-border-color: ${root.getPropertyValue('--btn-border-color')};
            
            --accent-bg-start: ${root.getPropertyValue('--accent-bg-start')};
            --accent-bg-end: ${root.getPropertyValue('--accent-bg-end')};
            --accent-icon-color: ${root.getPropertyValue('--accent-icon-color')};

            --profile-border-color: ${root.getPropertyValue('--profile-border-color')};
            --profile-border-width: ${root.getPropertyValue('--profile-border-width')};
            --profile-size: ${root.getPropertyValue('--profile-size')};
            --profile-radius: ${root.getPropertyValue('--profile-radius')};

            --font-logo: ${root.getPropertyValue('--font-logo')};
            --font-heading: ${root.getPropertyValue('--font-heading')};
            --font-subtitle: ${root.getPropertyValue('--font-subtitle')};
            --font-body: ${root.getPropertyValue('--font-body')};

            --btn-radius: ${root.getPropertyValue('--btn-radius')};

            --logo-size: ${root.getPropertyValue('--logo-size')};
            --title-size: ${root.getPropertyValue('--title-size')};
        }

        body {
            font-family: var(--font-body);
            background-image: var(--bg-image);
            background-size: cover;
            background-position: center;
            background-color: var(--bg-mid);
            color: var(--text-primary);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            position: relative;
        }

        body::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(var(--bg-angle), var(--bg-start) 0%, var(--bg-mid) 50%, var(--bg-end) 100%);
            opacity: calc(1 - var(--bg-overlay));
            pointer-events: none;
            z-index: 0;
        }

        .render-banner {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 250px;
            background-image: var(--banner-img);
            background-size: cover;
            background-position: center;
            -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
            mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%);
            z-index: 1;
            opacity: 0.8;
        }

        .main-container {
            width: 100%;
            max-width: 450px;
            min-height: 100vh;
            padding: 2.5rem 1.5rem 3rem 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            position: relative;
            z-index: 10;
        }

        .social-icon-link {
            transition: all 0.2s ease;
            color: var(--text-primary);
            opacity: 0.8;
        }
        .social-icon-link:hover {
            transform: translateY(-2px);
            opacity: 1;
        }

        .render-logo {
            font-family: var(--font-logo);
            font-size: var(--logo-size);
        }

        .render-subtitle {
            font-family: var(--font-subtitle);
            color: var(--text-subtitle);
        }

        .render-title {
            font-family: var(--font-heading);
            font-size: var(--title-size);
        }

        .render-btn {
            background: linear-gradient(90deg, var(--btn-bg-start) 0%, var(--btn-bg-end) 100%);
            border: 1px solid var(--btn-border-color);
            border-radius: var(--btn-radius);
            color: var(--btn-text-color);
            transition: all 0.2s ease;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.2);
        }

        .render-btn-icon {
            background: linear-gradient(135deg, var(--accent-bg-start) 0%, var(--accent-bg-end) 100%);
            color: var(--accent-icon-color);
            box-shadow: inset 0 2px 4px rgba(255,255,255,0.6), inset 0 -2px 4px rgba(0,0,0,0.15);
        }
    </style>
</head>
<body>
    <div class="render-banner"></div>
    <main class="main-container text-center flex flex-col items-center">
        <!-- BRAND LOGO -->
        <div class="render-logo mb-4 tracking-tight leading-none">${appState.identity.logoText}</div>

        <!-- PROFILE PICTURE -->
        <div class="mb-4 bg-transparent shadow-2xl" style="border: var(--profile-border-width) solid var(--profile-border-color); border-radius: var(--profile-radius); width: var(--profile-size); height: var(--profile-size); padding: 4px;">
            <img src="${appState.identity.profileImg}" class="w-full h-full object-cover shadow-inner" style="border-radius: calc(var(--profile-radius) * 0.9);">
        </div>

        <!-- SUBTITLE -->
        <h2 class="render-subtitle uppercase tracking-[0.25em] font-semibold mb-1 text-sm">${appState.identity.subtitleText}</h2>

        <!-- MAIN TITLE -->
        <h1 class="render-title uppercase font-medium tracking-wide mb-3">${appState.identity.titleText}</h1>

        <!-- SOCIAL ICONS -->
        <div class="flex items-center justify-center gap-4 mb-6 z-10 text-xl">
            ${document.getElementById('view-social-icons').innerHTML}
        </div>

        <!-- BUTTONS GRID -->
        <div class="w-full grid gap-3 mb-8 ${appState.layout.gridCols === 1 ? 'grid-cols-1' : 'grid-cols-2'}">
            ${appState.links.map(btn => `
            <a href="${btn.url}" class="render-btn flex items-stretch overflow-hidden text-decoration-none ${btn.fullWidth ? 'col-span-full justify-self-center w-[70%]' : 'w-full'}">
                <span class="flex-1 py-2.5 px-3 text-xs font-medium flex items-center justify-center border-r border-white/20 truncate">
                    ${btn.text}
                </span>
                <div class="render-btn-icon min-w-[42px] flex items-center justify-center px-2">
                    <i class="${btn.icon} text-base"></i>
                </div>
            </a>`).join('')}
        </div>

        <!-- FOOTER CTA -->
        <div class="mt-auto flex items-center gap-2 text-white/90 text-xs font-medium animate-pulse">
            <i class="fa-solid fa-hand-pointer"></i>
            <span>${appState.content.footerText}</span>
        </div>
    </main>
</body>
</html>`;

            document.getElementById('export-code-content').textContent = generatedHtml;
            document.getElementById('export-modal').classList.remove('hidden');
        }

        function closeExportModal() {
            document.getElementById('export-modal').classList.add('hidden');
        }

        function copyToClipboard() {
            const code = document.getElementById('export-code-content').textContent;
            navigator.clipboard.writeText(code).then(() => {
                alert('¡Código HTML copiado al portapapeles!');
            }).catch(() => {
                // Fallback for document.execCommand
                const textarea = document.createElement('textarea');
                textarea.value = code;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('¡Código HTML copiado al portapapeles!');
            });
        }

        function resetTemplate() {
            if(confirm('?Deseas restablecer la plantilla a sus valores iniciales?')) {
                window.loadTemplateConfig(DEFAULT_TEMPLATE_CONFIG);
            }
        }
    