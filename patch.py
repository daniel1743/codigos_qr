import re

with open('src/components/profile/PublicProfileView.tsx', 'r') as f:
    content = f.read()

# Add mapping variables
mappings = """
  const titleColor = profile.title_color || textColor;
  const titleSize = profile.title_size === "sm" ? "text-xl md:text-2xl" : profile.title_size === "md" ? "text-2xl md:text-3xl" : profile.title_size === "xl" ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl";
  const titleWeight = profile.title_weight === "light" ? "font-light" : profile.title_weight === "normal" ? "font-normal" : profile.title_weight === "semibold" ? "font-semibold" : "font-extrabold";
  const titleAlign = profile.title_align === "left" ? "text-left items-start" : profile.title_align === "right" ? "text-right items-end" : "text-center items-center";

  const bioColor = profile.bio_color || textColor;
  const bioSize = profile.bio_size === "sm" ? "text-sm" : profile.bio_size === "lg" ? "text-lg" : "text-base";
  const bioWeight = profile.bio_weight === "light" ? "font-light" : profile.bio_weight === "semibold" ? "font-semibold" : "font-medium";
  const bioAlign = profile.bio_align === "left" ? "text-left" : profile.bio_align === "right" ? "text-right" : "text-center";

  const btnTextSize = profile.button_text_size === "sm" ? "text-sm" : profile.button_text_size === "lg" ? "text-lg md:text-xl" : "text-base";
  const btnTextWeight = profile.button_text_weight === "normal" ? "font-normal" : profile.button_text_weight === "bold" ? "font-bold" : "font-semibold";
  const btnContentAlign = profile.button_content_align || "left";
  const btnIconPos = profile.button_icon_position || "left";
"""

content = content.replace('const radiusClass = buttonStyle === "pill" ? "rounded-full" : buttonRadiusClass;', 'const radiusClass = buttonStyle === "pill" ? "rounded-full" : buttonRadiusClass;\n' + mappings)

# Encabezado
header_regex = r'<div\s+className={`text-center w-full px-4 mb-10 space-y-3 \${profile\.avatar_shape === "none" && profile\.banner_url \? "mt-8" : ""}`}\s*>\s*<h1\s+className="break-words text-2xl font-extrabold tracking-tight md:text-3xl"\s+style={{ color: textColor }}\s*>\s*{profile\.display_name \|\| "Tu Nombre"}\s*</h1>\s*{profile\.bio && \(\s*<p\s+className="mx-auto max-w-\[320px\] break-words text-base font-medium leading-relaxed opacity-80 md:text-lg"\s+style={{ color: textColor }}\s*>\s*{profile\.bio}\s*</p>\s*\)}\s*</div>'

header_replacement = """<div
            className={`flex flex-col w-full px-4 mb-10 space-y-3 ${profile.avatar_shape === "none" && profile.banner_url ? "mt-8" : ""} ${titleAlign}`}
          >
            <h1
              className={`break-words tracking-tight ${titleSize} ${titleWeight}`}
              style={{ color: titleColor }}
            >
              {profile.display_name || "Tu Nombre"}
            </h1>
            {profile.bio && (
              <p
                className={`max-w-[320px] break-words leading-relaxed opacity-80 ${bioSize} ${bioWeight} ${bioAlign}`}
                style={{ color: bioColor }}
              >
                {profile.bio}
              </p>
            )}
          </div>"""

content = re.sub(header_regex, header_replacement, content, flags=re.DOTALL)

# Button
button_regex = r'<div className="relative z-10 flex items-center gap-3\.5 flex-1 min-w-0 pr-4">.*?<ChevronRight className="w-5 h-5" aria-hidden="true" />\s*</div>'

button_replacement = """<div className={`relative z-10 flex items-center w-full ${btnContentAlign === 'center' ? 'justify-center px-8' : btnContentAlign === 'right' ? 'justify-end' : 'justify-start'} gap-3`}>
                      {btnIconPos === 'left' && (
                        <div className={`shrink-0 ${btnContentAlign === 'center' ? 'absolute left-0' : ''}`}>
                          {buttonStyle === "card" ? (
                            <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 shadow-inner">
                              {getPlatformIcon(link.platform || "other", "w-5 h-5")}
                            </div>
                          ) : (
                            getPlatformIcon(link.platform || "other", "w-5 h-5 shrink-0")
                          )}
                        </div>
                      )}
                      
                      <span
                        className={`break-words leading-snug ${btnTextSize} ${btnTextWeight} ${buttonStyle === "minimal" || buttonStyle === "line" ? "tracking-tight" : ""} ${btnContentAlign === 'center' ? 'text-center' : btnContentAlign === 'right' ? 'text-right' : 'text-left'} ${btnContentAlign === 'center' ? 'w-full' : 'flex-1'}`}
                      >
                        {link.label || "Enlace"}
                      </span>

                      {btnIconPos === 'right' && (
                        <div className={`shrink-0 ${btnContentAlign === 'center' ? 'absolute right-0' : ''}`}>
                          {buttonStyle === "card" ? (
                            <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 shadow-inner">
                              {getPlatformIcon(link.platform || "other", "w-5 h-5")}
                            </div>
                          ) : (
                            getPlatformIcon(link.platform || "other", "w-5 h-5 shrink-0")
                          )}
                        </div>
                      )}

                      {btnIconPos !== 'right' && (
                        <div className={`shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${btnContentAlign === 'center' ? 'absolute right-0' : ''}`}>
                          <ChevronRight className="w-5 h-5" aria-hidden="true" />
                        </div>
                      )}
                    </div>"""

content = re.sub(button_regex, button_replacement, content, flags=re.DOTALL)

with open('src/components/profile/PublicProfileView.tsx', 'w') as f:
    f.write(content)
