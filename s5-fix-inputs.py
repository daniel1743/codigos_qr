import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

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

                        <!-- Botones Config -->"""

content = re.sub(r'<\!-- Botones Config -->|(<div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800 space-y-3">\s*<h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2">\s*<i class="fa-solid fa-cubes"></i> Estilo de Botones)', r"%s\n\n\1" % color_pickers_html, content)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
