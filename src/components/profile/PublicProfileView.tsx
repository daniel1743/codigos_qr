import React from "react";
import type { Profile, ProfileLink } from "../../types/database";
import {
  SiInstagram,
  SiWhatsapp,
  SiFacebook,
  SiTiktok,
  SiYoutube,
  SiX,
  SiTelegram,
  SiGithub,
} from "@icons-pack/react-simple-icons";
import { Globe, Link as LinkIcon, Mail, ChevronRight, Linkedin } from "lucide-react";

import { ContextualToolbar } from "./ContextualToolbar";

interface PublicProfileViewProps {
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
  isPreview?: boolean;
  onProfileChange?: (updates: Partial<Profile>) => void;
  onLinkChange?: (linkId: string, updates: Partial<ProfileLink>) => void;
  onOpenSidebar?: (tabId: string) => void;
}

const getPlatformIcon = (platform: string, className: string) => {
  switch (platform.toLowerCase()) {
    case "instagram":
      return <SiInstagram className={className} aria-hidden="true" />;
    case "whatsapp":
      return <SiWhatsapp className={className} aria-hidden="true" />;
    case "facebook":
      return <SiFacebook className={className} aria-hidden="true" />;
    case "tiktok":
      return <SiTiktok className={className} aria-hidden="true" />;
    case "youtube":
      return <SiYoutube className={className} aria-hidden="true" />;
    case "twitter":
    case "x":
      return <SiX className={className} aria-hidden="true" />;
    case "linkedin":
      return <Linkedin className={className} aria-hidden="true" />;
    case "telegram":
      return <SiTelegram className={className} aria-hidden="true" />;
    case "github":
      return <SiGithub className={className} aria-hidden="true" />;
    case "website":
      return <Globe className={className} aria-hidden="true" />;
    case "email":
      return <Mail className={className} aria-hidden="true" />;
    case "other":
    default:
      return <LinkIcon className={className} aria-hidden="true" />;
  }
};

export function PublicProfileView({
  profile,
  links,
  isPreview = false,
  onProfileChange,
  onLinkChange,
  onOpenSidebar,
}: PublicProfileViewProps) {
  const ContextWrapper = ({
    type,
    linkId,
    children,
  }: {
    type: any;
    linkId?: string | undefined;
    children: React.ReactNode;
  }) => {
    if (!isPreview) return <>{children}</>;
    const toolbarProps = {
      ...(linkId ? { linkId } : {}),
      ...(onProfileChange ? { onProfileChange } : {}),
      ...(onLinkChange ? { onLinkChange } : {}),
      ...(onOpenSidebar ? { onOpenSidebar } : {}),
    };

    return (
      <ContextualToolbar type={type} {...toolbarProps} profile={profile as Profile}>
        {children}
      </ContextualToolbar>
    );
  };

  // Configuración de fuentes y colores principales
  const rawBgColor = profile.background_color || "#ffffff";

  const getFontFamily = (font?: string) => {
    if (!font) return '"Inter", sans-serif';
    const serif = [
      "Playfair Display",
      "Lora",
      "Cormorant Garamond",
      "Libre Baskerville",
      "Merriweather",
      "Bitter",
      "Crimson Text",
      "Fraunces",
    ];
    const cursive = [
      "Caveat",
      "Dancing Script",
      "Pacifico",
      "Lobster",
      "Sacramento",
      "Great Vibes",
      "Satisfy",
      "Permanent Marker",
      "Shadows Into Light",
      "Amatic SC",
    ];
    if (serif.includes(font)) return `"${font}", serif`;
    if (cursive.includes(font)) return `"${font}", cursive`;
    return `"${font}", sans-serif`;
  };
  const fontFamily = getFontFamily(profile.font_family);

  const rawButtonColor = profile.button_color || "#111111";
  const buttonTextColor = profile.button_text_color || "#ffffff";
  const buttonStyle = profile.button_style || "solid";

  // Helper para determinar el color del texto basado en el fondo
  const getContrastTextColor = (bgColor: string) => {
    // Si es un degradado, asumimos texto claro o analizamos el primer color.
    // Para simplificar, buscamos el primer hex.
    const hexMatch = bgColor.match(/#([0-9a-f]{3}|[0-9a-f]{6})/i);
    const hex = hexMatch ? hexMatch[0] : "#ffffff";

    let r = 255,
      g = 255,
      b = 255;
    if (hex.length === 4) {
      r = parseInt(hex.charAt(1) + hex.charAt(1), 16);
      g = parseInt(hex.charAt(2) + hex.charAt(2), 16);
      b = parseInt(hex.charAt(3) + hex.charAt(3), 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? "#1a1a1a" : "#fdfdfd";
  };

  const textColor = getContrastTextColor(rawBgColor);

  // Procesar estilos avanzados (Neon y Degradados)
  const isNeon = rawButtonColor.endsWith("_NEON");
  const buttonColor = isNeon ? rawButtonColor.replace("_NEON", "") : rawButtonColor;

  const isGradientBg = rawBgColor.includes("gradient");
  const backgroundStyle: React.CSSProperties = isGradientBg
    ? { background: rawBgColor, backgroundAttachment: "fixed" }
    : { backgroundColor: rawBgColor };

  const avatarShapeClass =
    profile.avatar_shape === "rounded" || profile.avatar_shape === "square"
      ? "rounded-2xl"
      : "rounded-full";

  const ringStyle = profile.ring_enabled
    ? {
        outline: `${profile.ring_thickness === "medium" ? "4px" : "2px"} solid ${profile.ring_color || "#111111"}`,
        outlineOffset: "3px",
      }
    : {};

  const containerClasses = isPreview
    ? "w-full h-full relative flex flex-col items-center overflow-y-auto"
    : "min-h-screen w-full flex flex-col items-center selection:bg-black/10 transition-colors";

  const buttonRadiusClass =
    profile.button_radius === "none"
      ? "rounded-none"
      : profile.button_radius === "full"
        ? "rounded-full"
        : "rounded-2xl";
  const radiusClass = buttonStyle === "pill" ? "rounded-full" : buttonRadiusClass;

  const titleColor = profile.title_color || textColor;
  const titleSize =
    profile.title_size === "sm"
      ? "text-xl md:text-2xl"
      : profile.title_size === "md"
        ? "text-2xl md:text-3xl"
        : profile.title_size === "xl"
          ? "text-4xl md:text-5xl"
          : "text-3xl md:text-4xl";
  const titleWeight =
    profile.title_weight === "light"
      ? "font-light"
      : profile.title_weight === "normal"
        ? "font-normal"
        : profile.title_weight === "semibold"
          ? "font-semibold"
          : "font-extrabold";
  const titleAlign =
    profile.title_align === "left"
      ? "text-left items-start"
      : profile.title_align === "right"
        ? "text-right items-end"
        : "text-center items-center";

  const bioColor = profile.bio_color || textColor;
  const bioSize =
    profile.bio_size === "sm" ? "text-sm" : profile.bio_size === "lg" ? "text-lg" : "text-base";
  const bioWeight =
    profile.bio_weight === "light"
      ? "font-light"
      : profile.bio_weight === "semibold"
        ? "font-semibold"
        : "font-medium";
  const bioAlign =
    profile.bio_align === "left"
      ? "text-left"
      : profile.bio_align === "right"
        ? "text-right"
        : "text-center";

  const btnTextSize =
    profile.button_text_size === "sm"
      ? "text-sm"
      : profile.button_text_size === "lg"
        ? "text-lg md:text-xl"
        : "text-base";
  const btnTextWeight =
    profile.button_text_weight === "normal"
      ? "font-normal"
      : profile.button_text_weight === "bold"
        ? "font-bold"
        : "font-semibold";
  const btnContentAlign = profile.button_content_align || "left";
  const btnIconPos = profile.button_icon_position || "left";

  return (
    <ContextWrapper type="background">
      <div
        className={containerClasses}
        style={{
          ...backgroundStyle,
          fontFamily: fontFamily,
        }}
      >
        <div className="relative z-10 flex w-full max-w-[520px] flex-1 flex-col items-center pb-12 pt-0 sm:pb-16">
          {/* Portada Section */}
          {profile.banner_url ? (
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
              <div className="w-full pt-10 sm:pt-16 shrink-0" />
            </ContextWrapper>
          )}

          <div className="w-full flex flex-col items-center px-4 sm:px-6">
            {/* Avatar Section */}
            {profile.avatar_shape !== "none" && (
              <ContextWrapper type="avatar">
                <div className={`relative group ${profile.banner_url ? "-mt-14 mb-4" : "mb-6"}`}>
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-black/5 to-black/10 blur opacity-75 ${avatarShapeClass}`}
                  ></div>
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || "Avatar"}
                      style={ringStyle}
                      className={`relative w-28 h-28 object-cover shadow-lg border-[3px] border-white/40 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.02] motion-reduce:transition-none motion-reduce:transform-none bg-white ${avatarShapeClass}`}
                    />
                  ) : (
                    <div
                      style={ringStyle}
                      className={`relative w-28 h-28 bg-white flex items-center justify-center shadow-inner border-[3px] border-white/40 ${avatarShapeClass}`}
                    >
                      <svg
                        className="w-10 h-10 text-black/20"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                  )}
                </div>
              </ContextWrapper>
            )}

            {/* Encabezado */}
            <div
              className={`flex flex-col w-full px-4 mb-10 space-y-3 ${profile.avatar_shape === "none" && profile.banner_url ? "mt-8" : ""} ${titleAlign}`}
            >
              <ContextWrapper type="title">
                <h1
                  className={`break-words tracking-tight ${titleSize} ${titleWeight}`}
                  style={{ color: titleColor }}
                >
                  {profile.display_name || "Tu Nombre"}
                </h1>
              </ContextWrapper>
              {profile.bio && (
                <ContextWrapper type="bio">
                  <p
                    className={`max-w-[320px] break-words leading-relaxed opacity-80 ${bioSize} ${bioWeight} ${bioAlign}`}
                    style={{ color: bioColor }}
                  >
                    {profile.bio.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                      if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
                        return (
                          <strong key={index} className="font-bold">
                            {part.slice(2, -2)}
                          </strong>
                        );
                      }
                      return <React.Fragment key={index}>{part}</React.Fragment>;
                    })}
                  </p>
                </ContextWrapper>
              )}
            </div>

            {/* Lista de Enlaces */}
            <div className="w-full px-4 sm:px-6 space-y-3.5 flex-1 flex flex-col items-center">
              {links
                .filter((l) => l.enabled)
                .map((link, i) => {
                  let btnClassName = `group relative flex w-full items-center justify-between p-4 px-5 text-left shadow-sm transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none h-[56px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${radiusClass}`;
                  let btnStyle: React.CSSProperties = {};

                  if (buttonStyle === "solid" || buttonStyle === "pill") {
                    btnClassName += ` border border-transparent hover:shadow-md`;
                    btnStyle = { backgroundColor: buttonColor, color: buttonTextColor };
                    if (isNeon) {
                      btnStyle.boxShadow = `0 0 20px ${buttonColor}80, 0 0 40px ${buttonColor}40`;
                      btnStyle.border = `1px solid ${buttonColor}`;
                    }
                  } else if (buttonStyle === "outline") {
                    btnClassName += ` border-2 bg-transparent hover:bg-black/5`;
                    btnStyle = { borderColor: buttonColor, color: buttonColor };
                  } else if (buttonStyle === "soft") {
                    btnClassName += ` border border-transparent hover:bg-black/5`;
                    btnStyle = { backgroundColor: `${buttonColor}15`, color: buttonColor };
                  } else if (buttonStyle === "minimal") {
                    btnClassName += ` bg-transparent border-transparent hover:bg-black/5 shadow-none hover:shadow-none`;
                    btnStyle = { color: buttonColor };
                  } else if (buttonStyle === "line") {
                    btnClassName = `group relative flex w-full items-center justify-between p-4 px-2 text-left transition-all duration-200 hover:-translate-y-[1px] active:scale-[0.985] motion-reduce:transition-none motion-reduce:transform-none h-[56px] focus-visible:outline-none rounded-none border-b border-transparent bg-transparent hover:bg-black/5 shadow-none`;
                    btnStyle = { borderBottomColor: `${buttonColor}30`, color: buttonColor };
                  } else if (buttonStyle === "card") {
                    btnClassName += ` bg-white/90 backdrop-blur-sm shadow-md border hover:shadow-lg`;
                    btnStyle = { color: buttonColor, borderColor: `${buttonColor}20` };
                  }

                  return (
                    <ContextWrapper
                      type="link"
                      {...(link.id ? { linkId: link.id } : {})}
                      key={link.id || i}
                    >
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
                        {buttonStyle === "solid" || buttonStyle === "pill" ? (
                          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit]">
                            <div className="absolute inset-y-0 w-1/4 h-full bg-white/20 -skew-x-12 opacity-0 group-hover:opacity-100 -translate-x-full group-hover:animate-[shine_1.5s_ease-out] motion-reduce:hidden"></div>
                          </div>
                        ) : null}

                        <div
                          className={`relative z-10 flex items-center w-full ${btnContentAlign === "center" ? "justify-center px-10" : btnContentAlign === "right" ? "justify-end" : "justify-start"} gap-3`}
                        >
                          {btnIconPos === "left" && (
                            <div
                              className={`shrink-0 ${btnContentAlign === "center" ? "absolute left-0 w-10 flex items-center justify-start" : ""}`}
                            >
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
                            className={`min-w-0 truncate leading-snug ${btnTextSize} ${btnTextWeight} ${buttonStyle === "minimal" || buttonStyle === "line" ? "tracking-tight" : ""} ${btnContentAlign === "center" ? "text-center" : btnContentAlign === "right" ? "text-right" : "text-left"} ${btnContentAlign === "center" ? "w-full" : "flex-1"}`}
                          >
                            {link.label || "Enlace"}
                          </span>

                          {btnIconPos === "right" && (
                            <div
                              className={`shrink-0 ${btnContentAlign === "center" ? "absolute right-0 w-10 flex items-center justify-end" : ""}`}
                            >
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
                            <div
                              className={`shrink-0 opacity-50 group-hover:opacity-100 transition-opacity ${btnContentAlign === "center" ? "absolute right-0 w-10 flex items-center justify-end" : ""}`}
                            >
                              <ChevronRight className="w-5 h-5" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                      </a>
                    </ContextWrapper>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </ContextWrapper>
  );
}
