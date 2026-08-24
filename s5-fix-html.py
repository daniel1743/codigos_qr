import re

with open('public/template-builder.html', 'r', encoding='latin-1') as f:
    content = f.read()

theme_ui_html = """                  <!-- S5 THEME SELECTOR -->
                      <div class="bg-slate-900/70 p-4 rounded-2xl border border-slate-800">
                          <h3 class="text-xs font-bold tracking-wider text-pink-400 uppercase flex items-center gap-2 mb-3">
                              <i class="fa-solid fa-wand-magic-sparkles"></i> Temas Premium
                          </h3>
                          <div id="theme-swatches-container" class="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 snap-x hide-scrollbar">
                              <!-- Swatches rendered via JS -->
                          </div>
                      </div>

                      <!-- Background Config -->"""

content = content.replace("<!-- Background Config -->", theme_ui_html)

with open('public/template-builder.html', 'w', encoding='latin-1') as f:
    f.write(content)
