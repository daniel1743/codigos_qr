import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

# 1. Update HTML for inputs
banner_html = """                        <div>
                            <input type="file" id="file-banner-img" accept="image/jpeg, image/png, image/webp, image/avif, image/heic" class="hidden" onchange="handleImageUpload(event, 'banner')">
                            <div class="flex gap-2 mb-2">
                                <button onclick="document.getElementById('file-banner-img').click()" id="btn-upload-banner" class="flex-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-upload mr-1"></i> Subir banner
                                </button>
                                <button onclick="removeImage('banner')" class="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            <details class="text-xs text-slate-500 group">
                                <summary class="cursor-pointer hover:text-slate-300">O usar URL de imagen...</summary>
                                <div class="mt-2">
                                    <input type="text" id="input-banner-img" value="" placeholder="Dejar en blanco para omitir" oninput="updateContent()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none transition">
                                </div>
                            </details>
                        </div>"""
content = re.sub(r'<div>\s*<label class="text-\[11px\] text-slate-400 mb-1 block font-medium">URL de Imagen \(Fusi\?n con fondo\)</label>.*?</div>', banner_html, content, flags=re.DOTALL)

profile_html = """                        <div>
                            <input type="file" id="file-profile-img" accept="image/jpeg, image/png, image/webp, image/avif, image/heic" class="hidden" onchange="handleImageUpload(event, 'profile')">
                            <div class="flex gap-2 mb-2">
                                <button onclick="document.getElementById('file-profile-img').click()" id="btn-upload-profile" class="flex-1 bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-upload mr-1"></i> Subir foto
                                </button>
                                <button onclick="removeImage('profile')" class="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            <details class="text-xs text-slate-500 group">
                                <summary class="cursor-pointer hover:text-slate-300">O usar URL de imagen...</summary>
                                <div class="mt-2">
                                    <input type="text" id="input-profile-img" value="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400&auto=format&fit=crop" oninput="updateContent()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none transition">
                                </div>
                            </details>
                        </div>"""
content = re.sub(r'<div>\s*<label class="text-\[11px\] text-slate-400 mb-1 block font-medium">URL de Imagen</label>.*?</div>', profile_html, content, flags=re.DOTALL)

bg_html = """                        <div>
                            <input type="file" id="file-bg-img" accept="image/jpeg, image/png, image/webp, image/avif, image/heic" class="hidden" onchange="handleImageUpload(event, 'background')">
                            <div class="flex gap-2 mb-2">
                                <button onclick="document.getElementById('file-bg-img').click()" id="btn-upload-background" class="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-upload mr-1"></i> Subir fondo
                                </button>
                                <button onclick="removeImage('background')" class="bg-slate-800 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 text-xs font-bold py-2 px-3 rounded-xl transition">
                                    <i class="fa-solid fa-trash-can"></i>
                                </button>
                            </div>
                            <details class="text-xs text-slate-500 group mb-3">
                                <summary class="cursor-pointer hover:text-slate-300">O usar URL de imagen...</summary>
                                <div class="mt-2">
                                    <input type="text" id="input-bg-image" value="" placeholder="La imagen se ver? detr?s del degradado" oninput="updateStyles()" class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-pink-500 focus:outline-none transition mb-2">
                                </div>
                            </details>
                            
                            <label class="text-[11px] text-slate-400 mb-1 block font-medium">Fuerza de la Imagen (0% = Solo Degradado): <span id="overlay-val">0</span>%</label>
                            <input type="range" id="range-bg-overlay" min="0" max="100" value="0" oninput="updateStyles()" class="w-full accent-pink-500">
                        </div>"""
content = re.sub(r'<div>\s*<label class="text-\[11px\] text-slate-400 mb-1 block font-medium">URL de Imagen de Fondo \(Opcional\)</label>.*?<input type="range".*?</div>', bg_html, content, flags=re.DOTALL)


# 2. JS logic for image processing
js_upload_logic = """
        // ---------------------------------------------------------
        // S3 IMAGE OPTIMIZATION
        // ---------------------------------------------------------
        window.activeObjectUrls = {};

        function revokeObjectUrl(slot) {
            if (window.activeObjectUrls[slot]) {
                URL.revokeObjectURL(window.activeObjectUrls[slot]);
                delete window.activeObjectUrls[slot];
            }
        }

        async function optimizeImage(file, options) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                const url = URL.createObjectURL(file);
                
                img.onload = () => {
                    URL.revokeObjectURL(url);
                    
                    let targetWidth = img.width;
                    let targetHeight = img.height;
                    const maxDim = options.maxDimension || 1920;
                    
                    if (targetWidth > maxDim || targetHeight > maxDim) {
                        if (targetWidth > targetHeight) {
                            targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
                            targetWidth = maxDim;
                        } else {
                            targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
                            targetHeight = maxDim;
                        }
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = targetWidth;
                    canvas.height = targetHeight;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    
                    canvas.toBlob((blob) => {
                        if(!blob) return reject(new Error("Fallo en compresi?n de imagen"));
                        
                        resolve({
                            blob: blob,
                            metadata: {
                                originalName: file.name,
                                originalType: file.type,
                                originalBytes: file.size,
                                optimizedType: blob.type,
                                optimizedBytes: blob.size,
                                reductionPercent: Math.round((1 - (blob.size / file.size)) * 100),
                                width: targetWidth,
                                height: targetHeight
                            }
                        });
                    }, options.format || 'image/webp', options.quality || 0.85);
                };
                
                img.onerror = () => {
                    URL.revokeObjectURL(url);
                    reject(new Error("No pudimos leer esa imagen."));
                };
                
                img.src = url;
            });
        }

        window.prepareImageForUpload = function(slot, blob, metadata) {
            // Stub for S4 backend upload
            console.log(`[Backend Stub] Image ready for slot: ${slot}`, metadata);
        };

        async function handleImageUpload(event, slot) {
            const file = event.target.files[0];
            if (!file) return;

            const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'];
            if (!validTypes.includes(file.type)) {
                alert("Ese formato de imagen no es compatible.");
                event.target.value = '';
                return;
            }

            const btnId = `btn-upload-${slot}`;
            const btn = document.getElementById(btnId);
            const originalText = btn.innerHTML;
            btn.innerHTML = `<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Optimizando...`;
            btn.disabled = true;

            try {
                const maxDim = slot === 'profile' ? 1200 : 1920;
                const result = await optimizeImage(file, { maxDimension: maxDim, format: 'image/webp', quality: 0.85 });
                
                console.log("Optimization Result:", result.metadata);
                // Save to output for Playwright verification
                if (!window.optimizationResults) window.optimizationResults = [];
                window.optimizationResults.push({ slot: slot, ...result.metadata });

                revokeObjectUrl(slot);
                const objectUrl = URL.createObjectURL(result.blob);
                window.activeObjectUrls[slot] = objectUrl;

                if (slot === 'profile') {
                    appState.identity.profileImg = objectUrl;
                } else if (slot === 'banner') {
                    appState.identity.bannerImg = objectUrl;
                } else if (slot === 'background') {
                    appState.appearance.bgImage = objectUrl;
                }

                window.prepareImageForUpload(slot, result.blob, result.metadata);
                
                syncControlsFromState();
                if (slot === 'background') {
                    applyStateToCSS();
                } else {
                    renderCanvas();
                }
            } catch (err) {
                alert(err.message || "Error al procesar la imagen.");
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
                event.target.value = '';
            }
        }

        function removeImage(slot) {
            revokeObjectUrl(slot);
            if (slot === 'profile') {
                appState.identity.profileImg = DEFAULT_TEMPLATE_CONFIG.identity.profileImg;
            } else if (slot === 'banner') {
                appState.identity.bannerImg = '';
            } else if (slot === 'background') {
                appState.appearance.bgImage = '';
            }
            syncControlsFromState();
            if(slot === 'background') applyStateToCSS();
            else renderCanvas();
        }
        
        // ---------------------------------------------------------
"""

content = content.replace("// ---------------------------------------------------------\n        // S2 CONFIG FOUNDATION", js_upload_logic + "\n        // ---------------------------------------------------------\n        // S2 CONFIG FOUNDATION")

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
