import React from "react";
import type { Profile, ProfileLink } from "../../types/database";
import { getPlatformDef } from "../../constants/platforms";
import { ChevronRight, ExternalLink } from "lucide-react";

interface PremiumCustomLinkCardProps {
  link: ProfileLink;
  buttonStyle: string;
  profile: Partial<Profile>;
  isPreview?: boolean;
}

export function PremiumCustomLinkCard({
  link,
  buttonStyle,
  profile,
  isPreview,
}: PremiumCustomLinkCardProps) {
  const platform = getPlatformDef(link.platform || "other");
  const PlatformIcon = platform.icon;
  
  const bg = profile.button_color || "#ffffff";
  const text = profile.button_text_color || "#000000";
  const radius = profile.button_radius === "full" ? "999px" : profile.button_radius === "none" ? "0px" : "24px";
  
  const imageUrl = link.social_cover_image_url || null;
  const hasImage = !!imageUrl;

  const handleLink = (e: React.MouseEvent) => {
    if (isPreview) e.preventDefault();
  };

  // Helper for premium gradient over any color
  const premiumGradient = "linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 100%)";
  const premiumShadow = "inset 0 1px 1px rgba(255,255,255,0.4), inset 0 -1px 1px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.12)";

  // Image 1 Style: Classic Card (Fernanda)
  if (buttonStyle === "premium_classic_card") {
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={handleLink}
        className="group flex flex-col overflow-hidden transition-all hover:scale-[1.01] mb-6"
        style={{ 
          backgroundColor: bg, 
          color: text, 
          borderRadius: radius, 
          boxShadow: premiumShadow,
          backgroundImage: premiumGradient
        }}
      >
        {hasImage && (
          <div className="w-full h-40 shrink-0 overflow-hidden">
            <img src={imageUrl} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
        )}
        <div className="flex-1 p-6 text-left flex flex-col justify-center">
          <h3 className="text-xl font-light mb-2 tracking-wide">{link.label}</h3>
          {link.subtitle && <p className="text-[13px] opacity-80 mb-5 leading-relaxed font-light">{link.subtitle}</p>}
          <div>
            <span 
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.15em] transition-colors" 
              style={{ backgroundColor: "rgba(0,0,0,0.05)", color: text, border: "1px solid rgba(255,255,255,0.2)" }}
            >
              Acessar <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // Image 2/3 Style: Image Right/Left (Barbara)
  if (buttonStyle === "premium_image_right" || buttonStyle === "premium_image_left") {
    const isRight = buttonStyle === "premium_image_right";
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={handleLink}
        className="group block w-full overflow-hidden transition-all hover:scale-[1.02] mb-5"
        style={{ 
          backgroundColor: bg, 
          color: text, 
          borderRadius: radius, 
          boxShadow: premiumShadow,
          backgroundImage: premiumGradient
        }}
      >
        <div className={"flex flex-col sm:flex-row h-full " + (!isRight ? "sm:flex-row-reverse" : "")}>
          <div className="flex-1 p-6 text-left flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 shadow-sm" style={{ backgroundColor: "rgba(255,255,255,0.2)", backdropFilter: "blur(4px)" }}>
                <PlatformIcon className="w-4 h-4" strokeWidth={1.5} />
              </div>
              <h3 className="text-[13px] font-bold uppercase tracking-[0.12em]">{link.label}</h3>
            </div>
            {link.subtitle && <p className="text-[13px] opacity-90 mb-5 leading-relaxed font-light">{link.subtitle}</p>}
            <div>
              <span 
                className="inline-flex font-bold items-center gap-2 px-6 py-2.5 rounded text-[10px] uppercase tracking-wider shadow-sm" 
                style={{ backgroundColor: text, color: bg }}
              >
                Acessar
              </span>
            </div>
          </div>
          {hasImage ? (
            <div className="w-full sm:w-[150px] min-h-[160px] shrink-0 relative overflow-hidden">
              <img src={imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
          ) : null}
        </div>
      </a>
    );
  }

  // Image 4 Style: Detail Arrow (Larissa Almeida)
  if (buttonStyle === "premium_detail_arrow") {
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={handleLink}
        className="group flex items-center justify-between w-full p-4 sm:px-6 sm:py-5 mb-4 transition-all hover:scale-[1.01]"
        style={{ 
          backgroundColor: bg, 
          color: text, 
          borderRadius: radius, 
          boxShadow: premiumShadow,
          backgroundImage: premiumGradient
        }}
      >
        <div className="flex items-center gap-5 text-left">
          <PlatformIcon className="w-6 h-6 opacity-90 shrink-0" strokeWidth={1.2} />
          <div className="flex flex-col justify-center">
            <h3 className="text-[14px] font-semibold tracking-[0.06em] uppercase">{link.label}</h3>
            {link.subtitle && <p className="text-[12px] opacity-75 mt-0.5 max-w-[220px] leading-snug font-light">{link.subtitle}</p>}
          </div>
        </div>
        <div 
          className="w-9 h-9 rounded-full border flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-1" 
          style={{ borderColor: "rgba(255,255,255,0.4)", backgroundColor: "rgba(255,255,255,0.1)" }}
        >
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        </div>
      </a>
    );
  }

  // Image 5 Style: Minimal Badge (Aline Costa)
  if (buttonStyle === "premium_minimal_badge") {
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={handleLink}
        className="group flex flex-col items-center justify-center w-full px-4 py-3.5 mb-3 transition-all hover:scale-105"
        style={{ 
          backgroundColor: "transparent", 
          color: text, 
          border: "1px solid rgba(255,255,255,0.25)", 
          borderRadius: radius,
          backdropFilter: "blur(8px)",
          boxShadow: "inset 0 1px 1px rgba(255,255,255,0.1)"
        }}
      >
        <div className="flex items-center gap-2">
          <PlatformIcon className="w-3.5 h-3.5 opacity-80" strokeWidth={1.5} />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.15em]">{link.label}</h3>
        </div>
      </a>
    );
  }

  return null;
}
