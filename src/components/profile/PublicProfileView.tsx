import React from "react";
import type { Profile, ProfileLink } from "../../types/database";
import { ChevronRight } from "lucide-react";
import { SocialCover } from "./SocialCover";
import { ContextualToolbar } from "./ContextualToolbar";
import { getPlatformDef } from "../../constants/platforms";
import { PremiumMediaLinkCard } from "./PremiumMediaLinkCard";
import { isPremiumMediaLayout } from "../../lib/design/premium-media-layouts";

interface PublicProfileViewProps {
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
  isPreview?: boolean;
  onProfileChange?: (updates: Partial<Profile>) => void;
  onLinkChange?: (linkId: string, updates: Partial<ProfileLink>) => void;
  onOpenSidebar?: (tabId: string) => void;
}

import { PremiumCustomLinkCard } from "./PremiumCustomLinkCard";
import { PremiumDecorativeLayer } from "./PremiumDecorativeLayer";
import { loadGoogleFont } from "../../lib/fonts";

export function PublicProfileView({
  profile,
  links,
  isPreview = false,
  onProfileChange,
  onLinkChange,
  onOpenSidebar,
}: PublicProfileViewProps) {
  const renderPlatformIcon = (platform: string, className: string) => {
    const Icon = getPlatformDef(platform).icon;
    return <Icon className={className} aria-hidden="true" />;
  };
  const ContextWrapper = ({
    type,
    linkId,
    children,
  }: {
    type: "title" | "bio" | "avatar" | "cover" | "background" | "link";
    linkId?: string | undefined;
    children: React.ReactNode;
  }) => {
    if (!isPreview) return <>{children}</>;
    const currentLink = linkId ? links.find((l) => l.id === linkId) : undefined;
    const toolbarProps = {
      ...(linkId ? { linkId } : {}),
      ...(onProfileChange ? { onProfileChange } : {}),
      ...(onLinkChange ? { onLinkChange } : {}),
      ...(onOpenSidebar ? { onOpenSidebar } : {}),
      ...(currentLink ? { currentLink } : {}),
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

  // Load the font dynamically
  React.useEffect(() => {
    if (profile.font_family) {
      loadGoogleFont(profile.font_family);
    }
  }, [profile.font_family]);

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
  const linkSpacingClass =
    profile.theme_spacing === "compact"
      ? "gap-1.5"
      : profile.theme_spacing === "generous"
        ? "gap-4"
        : "gap-2.5";
  const premiumMediaLayout = isPremiumMediaLayout(profile.theme_layout)
    ? profile.theme_layout
    : null;
  // A surface belongs exclusively to the professional-card composition. Older
  // profiles can retain a surface after switching templates, so do not let it
  // create a floating panel in layouts that are meant to fill the screen.
  const hasSurface =
    profile.theme_layout === "professional_card" &&
    !!profile.theme_surface &&
    profile.theme_surface !== "transparent";
  const surfaceIsDark = profile.theme_surface === "#111827";
  const surfaceStyle: React.CSSProperties | undefined = hasSurface
    ? {
        backgroundColor: profile.theme_surface,
        color: surfaceIsDark ? "#ffffff" : undefined,
      }
    : undefined;
  const surfaceClass = hasSurface
    ? "rounded-[2rem] border border-white/30 py-8 shadow-xl backdrop-blur-sm"
    : "";

  if (profile.theme_layout === "media_larissa_luxury") {
    /* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02B */
    // Monogram letters
    const displayName = profile.display_name || "Larissa Almeida";
    const monogramLetters = displayName.split(" ").map(part => part.charAt(0).toUpperCase()).slice(0, 2);
    if (monogramLetters.length < 1) monogramLetters.push("L");
    if (monogramLetters.length < 2) monogramLetters.push("A");

    // Background images
    const topImage = profile.banner_url || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=800&auto=format&fit=crop";
    const bottomImage = profile.avatar_url || "https://images.unsplash.com/photo-1604654894610-df63bc536371?q=80&w=800&auto=format&fit=crop";

    // Social links
    const socialLinks = links.filter((l) => {
      const p = (l.platform || "").toLowerCase();
      return ["instagram", "whatsapp", "facebook", "twitter", "tiktok", "youtube", "linkedin", "telegram"].includes(p);
    });

    // Bio catchphrase divided
    const bioText = profile.bio || "Sua melhor versão, até nas unhas.";
    const bioParts = bioText.split(",");

    return (
      <ContextWrapper type="background">
        <style dangerouslySetInnerHTML={{__html: `
          @import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Montserrat:wght@300;400;500;600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400&display=swap');
          .font-serif { font-family: 'Playfair Display', serif; }
          .font-sans { font-family: 'Montserrat', sans-serif; }
          .font-script { font-family: 'Great Vibes', cursive; }
        `}} />

        <div
          className="relative w-full max-w-[480px] bg-[#0A0A0A] flex flex-col shadow-2xl mx-auto overflow-x-hidden min-h-screen text-white select-none selection:bg-[#D9BBA0] selection:text-black font-sans shrink-0 rounded-[3rem]"
        >
          {/* Top Background Image (Professional) */}
          <div className="absolute top-0 left-0 w-full h-[600px] z-0 opacity-80 pointer-events-none">
            <ContextWrapper type="cover">
              <div 
                className="absolute inset-0 bg-cover bg-left-top"
                style={{ backgroundImage: `url(${topImage})` }}
              />
            </ContextWrapper>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0A0A0A]/50 to-[#0A0A0A] w-[120%] -left-[10%]"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0A0A0A]/80 to-[#0A0A0A]"></div>
            <div className="absolute inset-0 bg-black/30"></div>
          </div>

          {/* Bottom Background Image (Manicure) */}
          <div className="absolute bottom-0 left-0 w-full h-[500px] z-0 opacity-50 pointer-events-none">
            <ContextWrapper type="avatar">
              <div 
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${bottomImage})` }}
              />
            </ContextWrapper>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A]/40 via-[#0A0A0A] to-[#0A0A0A]"></div>
          </div>

          {/* Main Content Wrapper */}
          <div className="relative z-10 flex-grow flex flex-col w-full px-4 sm:px-6">
            
            {/* Top Section */}
            <header className="pt-16 pb-10 px-6 flex flex-col items-end text-right w-full">
              {/* Monogram / Logo Area */}
              <div className="flex flex-col items-end mb-8">
                {/* Monogram Circle */}
                <div className="w-16 h-16 rounded-full border-[0.5px] border-[#D9BBA0]/60 flex items-center justify-center relative mb-4">
                  <div className="absolute inset-0 border border-[#D9BBA0]/20 rounded-full m-1 pointer-events-none"></div>
                  <span className="font-script text-3xl text-[#D9BBA0] -ml-2">{monogramLetters[0]}</span>
                  <span className="font-script text-3xl text-[#D9BBA0] opacity-80 absolute top-1/2 left-1/2 transform -translate-x-[40%] -translate-y-[40%]">{monogramLetters[1]}</span>
                </div>
                
                <ContextWrapper type="title">
                  <h1 className="font-serif text-[#F2E8E0] text-[1.35rem] tracking-[0.15em] leading-none mb-2 font-normal uppercase">
                    {displayName}
                  </h1>
                </ContextWrapper>
                <h2 className="font-sans text-[#A68A72] text-[0.55rem] uppercase tracking-[0.3em]">
                  Beauty Designer
                </h2>
              </div>

              {/* Tagline */}
              <div className="mt-4 max-w-[250px]">
                <p className="font-sans text-[#EAE1D9] text-sm font-light leading-relaxed tracking-wide">
                  Conecte-se comigo e
                </p>
                <p className="font-sans text-[#EAE1D9] text-sm font-light leading-relaxed tracking-wide">
                  descubra o poder da sua
                </p>
                <p className="font-script text-[#D9BBA0] text-[2.2rem] leading-none mt-1 transform -rotate-2">
                  autoestima.
                </p>
              </div>
            </header>

            {/* Social Icons Divider Section */}
            <div className="w-full flex items-center justify-center px-4 my-6">
              <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[#D9BBA0]/50 relative">
                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#D9BBA0]/60"></div>
              </div>
              
              <div className="flex gap-4 px-6 relative z-20">
                {socialLinks.slice(0, 3).map((link, idx) => {
                  const platformDef = getPlatformDef(link.platform || "other");
                  const Icon = platformDef.icon;
                  return (
                    <a 
                      key={link.id || idx}
                      href={isPreview ? "#" : link.url}
                      target={isPreview ? undefined : "_blank"}
                      rel={isPreview ? undefined : "noopener noreferrer"}
                      className="w-[2.75rem] h-[2.75rem] rounded-[0.8rem] border-[0.5px] border-[#D9BBA0]/40 flex items-center justify-center text-[#EAE1D9] bg-black/40 backdrop-blur-md hover:bg-[#D9BBA0]/20 hover:border-[#D9BBA0] transition-all duration-300 shadow-sm"
                    >
                      <Icon size={20} strokeWidth={1.5} />
                    </a>
                  );
                })}
              </div>

              <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[#D9BBA0]/50 relative">
                 <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 bg-[#D9BBA0]/60"></div>
              </div>
            </div>

            {/* Central Script Divider Text */}
            <div className="text-center px-6 my-10 relative z-20">
              <ContextWrapper type="bio">
                <h2 className="font-script text-[#D9BBA0] text-3xl md:text-4xl leading-tight">
                  {bioParts.map((part, i) => (
                    <React.Fragment key={i}>
                      {part}{i < bioParts.length - 1 ? ',' : ''}<br/>
                    </React.Fragment>
                  ))}
                </h2>
              </ContextWrapper>
            </div>

            {/* Link Cards Section */}
            <div className="pb-12 w-full max-w-[400px] mx-auto flex flex-col gap-1 z-20 relative">
              {links
                .filter((l) => l.enabled && l.id !== profile.hero_link_id)
                .map((link, i) => (
                  <ContextWrapper
                    type="link"
                    {...(link.id ? { linkId: link.id } : {})}
                    key={link.id || i}
                  >
                    <PremiumMediaLinkCard
                      link={link as ProfileLink}
                      layout="media_larissa_luxury"
                      coverHeight={profile.social_cover_height ?? null}
                      coverWidth={profile.social_cover_width ?? null}
                      mainAvatarUrl={profile.avatar_url ?? null}
                      isPreview={isPreview}
                      userId={profile.user_id ?? null}
                      onLinkChange={onLinkChange}
                    />
                  </ContextWrapper>
                ))}
            </div>

            {/* Footer */}
            {profile.footer_enabled && (
              <footer className="w-full text-center py-8 px-6 relative z-20 mt-auto">
                <p className="font-sans text-[#EAE1D9]/50 text-[0.6rem] tracking-wider uppercase">
                  {profile.footer_text || `2026 ${displayName}, Beauty designer. Todos os direitos reservados.`}
                </p>
              </footer>
            )}
          </div>
        </div>
      </ContextWrapper>
    );
  }

  if (profile.theme_layout === "media_barbara_elite") {
    /* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02B */
    return (
      <ContextWrapper type="background">
        <div
          className={containerClasses}
          style={{
            ...backgroundStyle,
            fontFamily: fontFamily,
          }}
        >
          <div className="relative z-10 flex w-full max-w-[520px] flex-1 flex-col items-center pb-12 pt-0 sm:pb-16 px-4 sm:px-0">
            {/* Header Section */}
            <div className="w-full relative bg-[#2D5A60] pt-12 pb-8 px-6 overflow-hidden rounded-[2.5rem] text-center mb-8 border border-white/10 shadow-lg shrink-0">
              {/* Decorative Background Letter */}
              <div className="absolute top-0 left-[-20%] text-[20rem] font-serif text-[#ffffff0b] leading-none select-none pointer-events-none">
                {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'B'}
              </div>
              {/* Decorative Lines */}
              <svg className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                <path d="M0,50 Q25,25 50,50 T100,50" fill="none" stroke="#D4C4A8" strokeWidth="0.5" />
                <path d="M0,80 Q50,60 100,80" fill="none" stroke="#D4C4A8" strokeWidth="0.2" />
              </svg>

              <div className="flex justify-between items-start relative z-10 text-left">
                {/* Profile Image Area */}
                <div className="w-1/2 relative">
                  <ContextWrapper type="avatar">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.display_name || "Avatar"}
                        className="w-full aspect-[3/4] object-cover rounded-t-[4rem] rounded-bl-3xl shadow-lg border-b-4 border-[#D4C4A8] bg-white/10"
                      />
                    ) : (
                      <div className="w-full aspect-[3/4] bg-white/10 rounded-t-[4rem] rounded-bl-3xl shadow-lg border-b-4 border-[#D4C4A8] flex items-center justify-center text-white/50 text-[10px]">
                        [Foto de Perfil]
                      </div>
                    )}
                  </ContextWrapper>
                </div>

                {/* Logo and Info */}
                <div className="w-1/2 flex flex-col items-center pl-4 mt-2 text-center">
                  {/* Logo Circle */}
                  <div className="w-14 h-14 rounded-full border-2 border-[#D4C4A8] flex items-center justify-center mb-2">
                    <span className="text-[#D4C4A8] font-serif text-2xl font-light">
                      {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : 'B'}
                    </span>
                  </div>
                  
                  <h2 className="text-[#D4C4A8] text-[0.6rem] uppercase tracking-[0.2em] mb-1">
                    {profile.display_name ? 'Studio' : ''}
                  </h2>
                  <ContextWrapper type="title">
                    <h1 className="text-[#F4EBE4] font-serif text-lg mb-1 tracking-widest break-words max-w-full font-light uppercase">
                      {profile.display_name || "BARBARA"}
                    </h1>
                  </ContextWrapper>
                  <p className="text-[#D4C4A8] text-[0.6rem] uppercase tracking-[0.1em] mb-4">
                    Estética Avançada
                  </p>

                  {/* Social Icons */}
                  <div className="flex gap-2">
                    {links
                      .filter((l) => l.enabled && ["instagram", "whatsapp", "facebook", "twitter", "tiktok", "youtube", "linkedin", "telegram"].includes((l.platform || "").toLowerCase()))
                      .slice(0, 3)
                      .map((link, idx) => {
                        const platformDef = getPlatformDef(link.platform || "other");
                        const Icon = platformDef.icon;
                        return (
                          <a
                            key={link.id || idx}
                            href={isPreview ? "#" : link.url}
                            target={isPreview ? undefined : "_blank"}
                            rel={isPreview ? undefined : "noopener noreferrer"}
                            className="w-7 h-7 bg-white rounded-md flex items-center justify-center text-[#2D5A60] hover:bg-[#D4C4A8] hover:text-white transition-colors shadow-sm"
                          >
                            <Icon size={14} strokeWidth={2} />
                          </a>
                        );
                      })}
                  </div>
                </div>
              </div>
              
              {/* Bio Text */}
              <div className="mt-6 text-center px-4 relative z-10">
                <ContextWrapper type="bio">
                  <p className="text-[#F4EBE4] text-xs leading-relaxed font-light tracking-wide max-w-xs mx-auto">
                    {profile.bio || "Realçando sua beleza com cuidado, delicadeza e procedimentos pensados para elevar sua autoestima."}
                  </p>
                </ContextWrapper>
              </div>
            </div>

            {/* Links List */}
            <div className={`w-full px-4 sm:px-6 ${linkSpacingClass} flex-1 flex flex-col items-center`}>
              {links
                .filter((l) => l.enabled && l.id !== profile.hero_link_id)
                .map((link, i) => (
                  <ContextWrapper
                    type="link"
                    {...(link.id ? { linkId: link.id } : {})}
                    key={link.id || i}
                  >
                    <PremiumMediaLinkCard
                      link={link as ProfileLink}
                      layout="media_barbara_elite"
                      coverHeight={profile.social_cover_height ?? null}
                      coverWidth={profile.social_cover_width ?? null}
                      mainAvatarUrl={profile.avatar_url ?? null}
                      isPreview={isPreview}
                      userId={profile.user_id ?? null}
                      onLinkChange={onLinkChange}
                    />
                  </ContextWrapper>
                ))}
            </div>

            {/* Footer */}
            {profile.footer_enabled && (
              <div className="mt-8 max-w-[320px] px-4 text-center text-xs font-medium opacity-70" style={{ color: "#2D5A60" }}>
                {profile.footer_text || "2026 Studio Barbara Estética Avançada. Todos os direitos reservados."}
              </div>
            )}
          </div>
        </div>
      </ContextWrapper>
    );
  }

  return (
    <ContextWrapper type="background">
      <div
        className={containerClasses}
        style={{
          ...backgroundStyle,
          fontFamily: fontFamily,
        }}
      >
        <PremiumDecorativeLayer profile={profile} accentColor={buttonColor} />
        <div className="relative z-10 flex w-full max-w-[520px] flex-1 flex-col items-center pb-12 pt-0 sm:pb-16">
          {/* Hero Social Section */}
          {profile.hero_link_id &&
            links.find((l) => l.id === profile.hero_link_id && l.enabled) && (
              <ContextWrapper type="link" linkId={profile.hero_link_id}>
                <div className="w-full shrink-0 relative">
                  <SocialCover
                    link={links.find((l) => l.id === profile.hero_link_id)! as ProfileLink}
                    variant="hero"
                    onClick={(e) => {
                      if (isPreview) e.preventDefault();
                    }}
                  />
                </div>
              </ContextWrapper>
            )}

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

          <div
            className={`w-full flex flex-col items-center px-4 sm:px-6 ${surfaceClass}`}
            style={surfaceStyle}
          >
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
            <div
              className={`w-full px-4 sm:px-6 ${linkSpacingClass} flex-1 flex flex-col items-center`}
            >
              {links
                .filter((l) => l.enabled && l.id !== profile.hero_link_id)
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
                      {buttonStyle.startsWith("premium_") ? (
                        <PremiumCustomLinkCard
                          link={link as ProfileLink}
                          buttonStyle={buttonStyle}
                          profile={profile}
                          isPreview={isPreview}
                        />
                      ) : premiumMediaLayout ? (
                        <PremiumMediaLinkCard
                          link={link as ProfileLink}
                          layout={premiumMediaLayout}
                          coverHeight={profile.social_cover_height ?? null}
                          coverWidth={profile.social_cover_width ?? null}
                          mainAvatarUrl={profile.avatar_url ?? null}
                          isPreview={isPreview}
                          userId={profile.user_id ?? null}
                          onLinkChange={onLinkChange}
                        />
                      ) : profile.social_covers_enabled ? (
                        <SocialCover
                          link={link as ProfileLink}
                          variant="cover"
                          coverStyle={profile.social_cover_style}
                          coverHeight={profile.social_cover_height}
                          // Modified by Codex — SOCIAL-BADGES-IMAGE-MODE
                          avatarUrl={profile.avatar_url}
                          className="w-full mb-3 last:mb-0"
                          onClick={(e) => {
                            if (isPreview) e.preventDefault();
                          }}
                        />
                      ) : (
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
                                    {renderPlatformIcon(link.platform || "other", "w-5 h-5")}
                                  </div>
                                ) : (
                                  renderPlatformIcon(link.platform || "other", "w-5 h-5 shrink-0")
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
                                    {renderPlatformIcon(link.platform || "other", "w-5 h-5")}
                                  </div>
                                ) : (
                                  renderPlatformIcon(link.platform || "other", "w-5 h-5 shrink-0")
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
                      )}
                    </ContextWrapper>
                  );
                })}
            </div>

            {profile.footer_enabled && (
              <div
                className="mt-8 max-w-[320px] px-4 text-center text-xs font-medium opacity-70"
                style={{ color: surfaceIsDark ? "#ffffff" : textColor }}
              >
                {profile.footer_text || "Gracias por visitar mi página"}
              </div>
            )}
          </div>
        </div>
      </div>
    </ContextWrapper>
  );
}
