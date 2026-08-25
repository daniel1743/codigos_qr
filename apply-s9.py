import re

FILE = 'public/template-builder.html'
with open(FILE, 'r', encoding='utf-8') as f:
    content = f.read()

original = content

# ============================================================
# 1. Add ACTION_TYPES registry + resolveActionHref + helpers
#    Insert right after the availableIcons array (after line with 'Tienda')
# ============================================================

ACTION_BLOCK = """
        // S9: Smart Action Types Registry
        const ACTION_TYPES = [
            { id: 'url',      label: 'Sitio web',  icon: 'fa-solid fa-link',         placeholder: 'https://example.com' },
            { id: 'phone',    label: 'Llamar',      icon: 'fa-solid fa-phone',        placeholder: '+56912345678' },
            { id: 'email',    label: 'Email',       icon: 'fa-regular fa-envelope',   placeholder: 'contacto@example.com' },
            { id: 'whatsapp', label: 'WhatsApp',    icon: 'fa-brands fa-whatsapp',    placeholder: '+56912345678' },
            { id: 'location', label: 'Ubicación',   icon: 'fa-solid fa-location-dot', placeholder: 'https://maps.google.com/...' },
            { id: 'booking',  label: 'Reservar',    icon: 'fa-regular fa-calendar',   placeholder: 'https://calendly.com/...' },
            { id: 'download', label: 'Descargar',   icon: 'fa-solid fa-download',     placeholder: 'https://.../archivo.pdf' },
        ];

        // S9: Map action type to its default icon class
        function getActionDefaultIcon(actionType) {
            const at = ACTION_TYPES.find(a => a.id === actionType);
            return at ? at.icon : 'fa-solid fa-link';
        }

        // S9: Get placeholder for action type
        function getActionPlaceholder(actionType) {
            const at = ACTION_TYPES.find(a => a.id === actionType);
            return at ? at.placeholder : 'https://example.com';
        }

        // S9: Get contextual label for the target input
        function getActionFieldLabel(actionType) {
            switch (actionType) {
                case 'phone':    return 'Teléfono';
                case 'whatsapp': return 'Teléfono';
                case 'email':    return 'Email';
                case 'location': return 'Enlace de ubicación';
                case 'booking':  return 'Enlace de reserva';
                case 'download': return 'Enlace del archivo';
                default:         return 'URL';
            }
        }

        // S9: Resolve action type + target value into a safe href
        function resolveActionHref(btn) {
            const type = btn.actionType || 'url';
            const val = (btn.url || '').trim();
            if (!val || val === '#') return '#';

            // Safety check: block dangerous protocols
            const lower = val.toLowerCase();
            if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) {
                return '#';
            }

            switch (type) {
                case 'phone': {
                    const cleaned = val.replace(/[\\s\\-\\(\\)]/g, '');
                    return 'tel:' + cleaned;
                }
                case 'email': {
                    const addr = val.replace(/^mailto:/i, '');
                    return 'mailto:' + addr;
                }
                case 'whatsapp': {
                    const num = val.replace(/[\\s\\-\\(\\)\\+]/g, '');
                    const msg = btn.waMessage ? '&text=' + encodeURIComponent(btn.waMessage) : '';
                    return 'https://wa.me/' + num + '?' + msg;
                }
                case 'location':
                case 'booking':
                case 'download':
                case 'url':
                default:
                    return normalizeUrl(val);
            }
        }

        // S9: Basic input validation for action types
        function validateActionInput(actionType, value) {
            if (!value || value === '#') return { valid: true, msg: '' }; // empty is OK, just no link
            const v = value.trim();
            switch (actionType) {
                case 'phone':
                case 'whatsapp': {
                    const hasDigits = /\\d/.test(v);
                    const validChars = /^[\\+\\d\\s\\-\\(\\)]+$/.test(v);
                    if (!hasDigits || !validChars) return { valid: false, msg: 'Ingresa un número válido' };
                    return { valid: true, msg: '' };
                }
                case 'email': {
                    const cleaned = v.replace(/^mailto:/i, '');
                    if (!cleaned.includes('@') || !cleaned.includes('.')) return { valid: false, msg: 'Ingresa un email válido' };
                    return { valid: true, msg: '' };
                }
                case 'url':
                case 'location':
                case 'booking':
                case 'download': {
                    const lower = v.toLowerCase();
                    if (lower.startsWith('javascript:') || lower.startsWith('data:') || lower.startsWith('file:') || lower.startsWith('vbscript:')) {
                        return { valid: false, msg: 'Protocolo no permitido' };
                    }
                    return { valid: true, msg: '' };
                }
                default:
                    return { valid: true, msg: '' };
            }
        }

        // S9: Handle action type change with smart icon defaults
        function onActionTypeChange(btnId, newType) {
            const btn = appState.links.find(b => b.id === btnId);
            if (!btn) return;

            const oldType = btn.actionType || 'url';
            const oldDefaultIcon = getActionDefaultIcon(oldType);
            const newDefaultIcon = getActionDefaultIcon(newType);

            // Smart icon default: only auto-change if current icon was the old default
            if (btn.icon === oldDefaultIcon) {
                btn.icon = newDefaultIcon;
            }

            btn.actionType = newType;
            renderControlsList();
            renderCanvas();
        }
"""

# Insert after the closing of availableIcons array
anchor = "        ];\n\n        // Init on DOM Content Loaded"
assert anchor in content, "Could not find availableIcons closing anchor"
content = content.replace(anchor, "        ];\n" + ACTION_BLOCK + "\n        // Init on DOM Content Loaded")

# ============================================================
# 2. Update normalizeTemplateConfig for backward compat
#    After the S8 socials normalization block
# ============================================================

S9_NORMALIZE = """
            // S9: Normalize Smart Actions on links
            if (def.links && Array.isArray(def.links)) {
                def.links = def.links.map(btn => {
                    if (!btn.actionType) {
                        // Auto-detect from existing url
                        const u = (btn.url || '').toLowerCase();
                        if (u.startsWith('mailto:')) btn.actionType = 'email';
                        else if (u.startsWith('tel:')) btn.actionType = 'phone';
                        else if (u.includes('wa.me')) btn.actionType = 'whatsapp';
                        else btn.actionType = 'url';
                    }
                    if (typeof btn.waMessage === 'undefined') btn.waMessage = '';
                    return btn;
                });
            }
"""

anchor2 = "            return def;\n        };"
assert anchor2 in content, "Could not find return def anchor in normalizeTemplateConfig"
content = content.replace(anchor2, S9_NORMALIZE + "\n            return def;\n        };")

# ============================================================
# 3. Update addButton() to include actionType and waMessage
# ============================================================

old_add = """            appState.links.push({
                id: id,
                text: 'Nuevo Bot\u00f3n',
                icon: 'fa-solid fa-link',
                url: '#',
                fullWidth: false
            });"""

new_add = """            appState.links.push({
                id: id,
                text: 'Nuevo Botón',
                icon: 'fa-solid fa-link',
                url: '#',
                fullWidth: false,
                actionType: 'url',
                waMessage: ''
            });"""

# The file might have encoding issues with the ó character, try both
if old_add in content:
    content = content.replace(old_add, new_add)
else:
    # Try with the ? replacement
    old_add_alt = old_add.replace('Botón', 'Bot?n')
    new_add_alt = new_add.replace('Botón', 'Botón')
    if old_add_alt in content:
        content = content.replace(old_add_alt, new_add_alt)
    else:
        print("WARNING: Could not find addButton push block, trying regex")
        pattern = r"appState\.links\.push\(\{\s*id: id,\s*text: '[^']*',\s*icon: 'fa-solid fa-link',\s*url: '#',\s*fullWidth: false\s*\}\);"
        replacement = """appState.links.push({
                id: id,
                text: 'Nuevo Botón',
                icon: 'fa-solid fa-link',
                url: '#',
                fullWidth: false,
                actionType: 'url',
                waMessage: ''
            });"""
        content = re.sub(pattern, replacement, content)

# ============================================================
# 4. Update renderControlsList() to include action type selector
#    and contextual fields
# ============================================================

old_render = """                card.innerHTML = `
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
                `;"""

new_render = r"""                const actionType = btn.actionType || 'url';
                const fieldLabel = getActionFieldLabel(actionType);
                const fieldPlaceholder = getActionPlaceholder(actionType);
                const validation = validateActionInput(actionType, btn.url);
                const validationClass = (!validation.valid) ? 'border-red-500/60' : 'border-slate-800';
                const waMessageRow = actionType === 'whatsapp' ? `
                    <input type="text" value="${btn.waMessage || ''}" oninput="updateButtonData('${btn.id}', 'waMessage', this.value)" placeholder="Mensaje opcional para WhatsApp" class="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-400 focus:outline-none focus:border-pink-500 mt-1">
                ` : '';

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
                        <select onchange="onActionTypeChange('${btn.id}', this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-pink-500" title="Acción">
                            ${ACTION_TYPES.map(at => `<option value="${at.id}" ${at.id === actionType ? 'selected' : ''}>${at.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <input type="text" value="${btn.url === '#' ? '' : btn.url}" oninput="updateButtonData('${btn.id}', 'url', this.value)" placeholder="${fieldPlaceholder}" class="bg-slate-900 border ${validationClass} rounded-lg px-2.5 py-1 text-xs text-slate-400 focus:outline-none focus:border-pink-500" title="${fieldLabel}">
                        <select onchange="updateButtonData('${btn.id}', 'icon', this.value)" class="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-pink-500">
                            ${availableIcons.map(i => `<option value="${i.class}" ${i.class === btn.icon ? 'selected' : ''}>${i.name}</option>`).join('')}
                        </select>
                    </div>
                    ${!validation.valid ? `<p class="text-[10px] text-red-400 mt-0.5">${validation.msg}</p>` : ''}
                    ${waMessageRow}
                `;"""

assert old_render in content, "Could not find old renderControlsList innerHTML block"
content = content.replace(old_render, new_render)

# ============================================================
# 5. Update renderCanvas() to use resolveActionHref
# ============================================================

old_canvas_href = "                a.href = btn.url || '#';"
new_canvas_href = "                a.href = resolveActionHref(btn);\n                if ((btn.actionType || 'url') === 'download') a.setAttribute('download', '');"

assert old_canvas_href in content, "Could not find old canvas href line"
content = content.replace(old_canvas_href, new_canvas_href)

# ============================================================
# 6. Update normalizeUrl to also reject vbscript:
# ============================================================

old_normalize = "if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:') || url.toLowerCase().startsWith('file:')) return '';"
new_normalize = "if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:') || url.toLowerCase().startsWith('file:') || url.toLowerCase().startsWith('vbscript:')) return '';"

if old_normalize in content:
    content = content.replace(old_normalize, new_normalize)

# ============================================================
# 7. Also add download icon to availableIcons if not present
# ============================================================
if "'fa-solid fa-download'" not in content.split('availableIcons')[1].split('];')[0]:
    old_icons_end = "            { name: 'Tienda', class: 'fa-solid fa-bag-shopping' }\n        ];"
    new_icons_end = "            { name: 'Tienda', class: 'fa-solid fa-bag-shopping' },\n            { name: 'Descargar', class: 'fa-solid fa-download' },\n            { name: 'Calendario', class: 'fa-regular fa-calendar' }\n        ];"
    content = content.replace(old_icons_end, new_icons_end)

# ============================================================
# WRITE
# ============================================================
with open(FILE, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: All S9 changes applied to template-builder.html")
print(f"File size: {len(original)} -> {len(content)} bytes ({len(content) - len(original):+d})")
