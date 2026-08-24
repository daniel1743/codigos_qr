import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

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
                        
content = re.sub(r'<div>\s*<label class="text-\[11px\] text-slate-400 mb-1 block font-medium">URL de Imagen \(Fusi.*?con fondo\)</label>.*?</div>', banner_html, content, flags=re.DOTALL)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
