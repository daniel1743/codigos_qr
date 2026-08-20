const fs = require('fs');
const file = 'src/components/profile/PublicProfileView.tsx';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
  const layout = profile.theme_layout || "classic_center";
  const surfaceColor = profile.theme_surface && profile.theme_surface !== "transparent" ? profile.theme_surface : undefined;
  const spacing = profile.theme_spacing || "standard";

  const paddingClass = spacing === "compact" ? "space-y-2" : spacing === "generous" ? "space-y-6" : "space-y-3.5";
  const containerWidthClass = layout === "professional_card" ? "max-w-[600px]" : "max-w-[520px]";
  const alignmentClass = layout === "editorial_left" ? "items-start" : "items-center";
  
  const coverSection = profile.banner_url ? (
    <ContextWrapper type="cover">
      <div className="w-full h-32 sm:h-40 shrink-0 relative bg-black/5">
        <img
          src={profile.banner_url}
          alt="Portada"
          className="w-full h-full object-cover"
        />
      </div>
    </ContextWrapper>
  ) : (
    <ContextWrapper type="cover">
      <div className={\`w-full shrink-0 \${layout === 'cover_overlap' ? 'h-16' : 'pt-10 sm:pt-16'}\`} />
    </ContextWrapper>
  );

  const avatarSection = profile.avatar_shape !== "none" && (
    <ContextWrapper type="avatar">
      <div className={\`relative group \${layout === 'cover_overlap' || profile.banner_url ? "-mt-14 mb-4" : "mb-6"}\`}>
        <div className={\`absolute -inset-0.5 bg-gradient-to-r from-black/5 to-black/10 blur opacity-75 \${avatarShapeClass}\`}></div>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name || "Avatar"}
            style={ringStyle}
            className={\`relative w-28 h-28 object-cover shadow-lg border-[3px] border-white/40 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none bg-white \${avatarShapeClass}\`}
          />
        ) : (
          <div
            style={ringStyle}
            className={\`relative w-28 h-28 bg-white flex items-center justify-center shadow-inner border-[3px] border-white/40 \${avatarShapeClass}\`}
          >
            <svg className="w-10 h-10 text-black/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
        )}
      </div>
    </ContextWrapper>
  );

  const headerSection = (
    <div className={\`flex flex-col w-full px-4 mb-10 space-y-3 \${profile.avatar_shape === "none" && profile.banner_url ? "mt-8" : ""} \${layout === 'editorial_left' ? 'text-left items-start' : titleAlign}\`}>
      <ContextWrapper type="title">
        <h1 className={\`break-words tracking-tight \${titleSize} \${titleWeight}\`} style={{ color: titleColor }}>
          {profile.display_name || "Tu Nombre"}
        </h1>
      </ContextWrapper>
      {profile.bio && (
        <ContextWrapper type="bio">
          <p className={\`max-w-[320px] break-words leading-relaxed opacity-80 \${bioSize} \${bioWeight} \${layout === 'editorial_left' ? 'text-left' : bioAlign}\`} style={{ color: bioColor }}>
            {profile.bio.split(/(\\**.*?\\**)/g).map((part, index) => {
              if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
                return <strong key={index} className="font-bold">{part.slice(2, -2)}</strong>;
              }
              return <React.Fragment key={index}>{part}</React.Fragment>;
            })}
          </p>
        </ContextWrapper>
      )}
    </div>
  );

  const linksSection = (
    <div className={\`w-full px-4 sm:px-6 flex-1 flex flex-col \${layout === 'editorial_left' ? 'items-start' : 'items-center'} \${paddingClass}\`}>
      {links.filter((l) => l.enabled).map((link, i) => {
        let btnClassName = \`group relative flex w-full items-center justify-between p-4 px-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 \${radiusClass}\`;
        let btnStyle: React.CSSProperties = {};

        if (buttonStyle === "solid" || buttonStyle === "pill") {
          btnClassName += \` border border-transparent hover:shadow-md\`;
          btnStyle = { backgroundColor: buttonColor, color: buttonTextColor };
          if (isNeon) {
            btnStyle.boxShadow = \`0 0 20px \${buttonColor}80, 0 0 40px \${buttonColor}40\`;
            btnStyle.border = \`1px solid \${buttonColor}\`;
          }
        } else if (buttonStyle === "outline") {
          btnClassName += \` border-2 bg-transparent hover:bg-black/5\`;
          btnStyle = { borderColor: buttonColor, color: buttonColor };
        } else if (buttonStyle === "soft") {
          btnClassName += \` border border-transparent hover:bg-black/5\`;
          btnStyle = { backgroundColor: \`\${buttonColor}15\`, color: buttonColor };
        } else if (buttonStyle === "minimal") {
          btnClassName += \` bg-transparent border-transparent hover:bg-black/5 shadow-none hover:shadow-none\`;
          btnStyle = { color: buttonColor };
        } else if (buttonStyle === "line") {
          btnClassName = \`group relative flex w-full items-center justify-between p-4 px-2 text-left transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none h-[56px] focus-visible:outline-none rounded-none border-b border-transparent bg-transparent hover:bg-black/5 shadow-none\`;
          btnStyle = { borderBottomColor: \`\${buttonColor}30\`, color: buttonColor };
        } else if (buttonStyle === "card") {
          btnClassName += \` bg-white/90 backdrop-blur-sm shadow-md border hover:shadow-lg\`;
          btnStyle = { color: buttonColor, borderColor: \`\${buttonColor}20\` };
        }

        return (
          <ContextWrapper type="link" {...(link.id ? { linkId: link.id } : {})} key={link.id || i}>
            <a
              href={isPreview ? undefined : link.url}
              target={isPreview ? undefined : "_blank"}
              rel={isPreview ? undefined : "noopener noreferrer"}
              onClick={(e) => {
                if (isPreview) e.preventDefault();
              }}
              className={btnClassName}
              style={btnStyle}
            >
              {(buttonStyle === "solid" || buttonStyle === "pill") && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
                  <div className="absolute inset-y-0 w-1/4 h-full bg-white/20 -skew-x-12 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:animate-[shine_1.5s_ease-out] motion-reduce:hidden"></div>
                </div>
              )}

              <div className={\`relative z-10 flex items-center w-full \${btnContentAlign === "center" ? "justify-center px-10" : btnContentAlign === "right" ? "justify-end" : "justify-start"} gap-3\`}>
                {btnIconPos === "left" && (
                  <div className={\`shrink-0 \${btnContentAlign === "center" ? "absolute left-0 w-10 flex items-center justify-start" : ""}\`}>
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
                  title={link.label || "Enlace"}
                  className={\`min-w-0 truncate leading-snug \${btnTextSize} \${btnTextWeight} \${buttonStyle === "minimal" || buttonStyle === "line" ? "tracking-tight" : ""} \${btnContentAlign === "center" ? "text-center" : btnContentAlign === "right" ? "text-right" : "text-left"} \${btnContentAlign === "center" ? "w-full" : "flex-1"}\`}
                >
                  {link.label || "Enlace"}
                </span>

                {btnIconPos === "right" && (
                  <div className={\`shrink-0 \${btnContentAlign === "center" ? "absolute right-0 w-10 flex items-center justify-end" : ""}\`}>
                    {buttonStyle === "card" ? (
                      <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center bg-black/5 shadow-inner">
                        {getPlatformIcon(link.platform || "other", "w-5 h-5")}
                      </div>
                    ) : (
                      getPlatformIcon(link.platform || "other", "w-5 h-5 shrink-0")
                    )}
                  </div>
                )}

                {btnIconPos !== "right" && (
                  <div className={\`shrink-0 opacity-50 group-hover:opacity-100 transition-opacity \${btnContentAlign === "center" ? "absolute right-0 w-10 flex items-center justify-end" : ""}\`}>
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </div>
                )}
              </div>
            </a>
          </ContextWrapper>
        );
      })}
    </div>
  );

  return (
    <ContextWrapper type="background">
      <div
        className={containerClasses}
        style={{
          ...backgroundStyle,
          fontFamily: fontFamily,
        }}
      >
        <div className={\`relative z-10 flex w-full \${containerWidthClass} flex-1 flex-col \${alignmentClass} pb-12 pt-0 sm:pb-16\`}>
          {coverSection}

          {layout === 'professional_card' && surfaceColor ? (
             <div className="w-full flex flex-col items-center px-4 sm:px-6">
               <div className="w-full bg-white/10 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-white/20 flex flex-col items-center mt-[-2rem] z-20" style={{ backgroundColor: surfaceColor }}>
                  {avatarSection}
                  {headerSection}
                  {linksSection}
               </div>
             </div>
          ) : layout === 'minimal_center' ? (
             <div className={\`w-full flex flex-col \${alignmentClass} px-4 sm:px-12 mt-12\`}>
               {avatarSection}
               {headerSection}
               {linksSection}
             </div>
          ) : layout === 'dark_statement' ? (
             <div className={\`w-full flex flex-col \${alignmentClass} px-4 sm:px-6 mt-8\`}>
               {avatarSection}
               {headerSection}
               {linksSection}
             </div>
          ) : (
             <div className={\`w-full flex flex-col \${alignmentClass} px-4 sm:px-6\`}>
                {layout === 'editorial_left' ? (
                   <div className="flex flex-col sm:flex-row w-full gap-4 items-start sm:items-center mb-8">
                      {avatarSection}
                      {headerSection}
                   </div>
                ) : (
                   <>
                     {avatarSection}
                     {headerSection}
                   </>
                )}
                {linksSection}
             </div>
          )}
        </div>
      </div>
    </ContextWrapper>
  );
`;

const startIndex = code.indexOf('<ContextWrapper type="background">');
const endIndex = code.lastIndexOf('</ContextWrapper>') + '</ContextWrapper>'.length;
if (startIndex !== -1 && endIndex !== -1) {
  code = code.substring(0, startIndex) + replacement + code.substring(endIndex);
  fs.writeFileSync(file, code);
  console.log("Replaced render block in PublicProfileView.tsx");
} else {
  console.error("Could not find replacement block");
}
