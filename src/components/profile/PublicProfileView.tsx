import React from "react";
import type { Profile, ProfileLink } from "../../types/database";

interface PublicProfileViewProps {
  profile: Partial<Profile>;
  links: Partial<ProfileLink>[];
  isPreview?: boolean;
}

export function PublicProfileView({ profile, links, isPreview = false }: PublicProfileViewProps) {
  // Configuración de fuentes y colores principales
  const rawBgColor = profile.background_color || "#ffffff";
  
  // Font fallback resolver
  const getFontFamily = (font?: string) => {
    if (!font) return "Inter, sans-serif";
    const sans = ["Inter", "Manrope", "DM Sans", "Poppins"];
    const serif = ["Playfair Display", "Lora", "Cormorant Garamond"];
    if (sans.includes(font)) return `"${font}", sans-serif`;
    if (serif.includes(font)) return `"${font}", serif`;
    return `"${font}", system-ui, sans-serif`;
  };
  const fontFamily = getFontFamily(profile.font_family);

  const rawButtonColor = profile.button_color || "#111111";
  const buttonTextColor = profile.button_text_color || "#ffffff";
  
  // Procesar estilos avanzados (Neon y Degradados)
  const isNeon = rawButtonColor.endsWith("_NEON");
  const buttonColor = isNeon ? rawButtonColor.replace("_NEON", "") : rawButtonColor;
  
  const isGradientBg = rawBgColor.includes("gradient");
  const backgroundStyle = isGradientBg ? { background: rawBgColor } : { backgroundColor: rawBgColor };
  
  // Para el avatar
  const avatarShapeClass = profile.avatar_shape === "square" ? "rounded-2xl" : "rounded-full";

  // En el modo "preview" (editor) la altura se recorta al contenedor simulado,
  // mientras que en la vista pública ocupa la pantalla entera (min-h-screen).
  const containerClasses = isPreview
    ? "w-full h-full relative flex flex-col items-center overflow-y-auto"
    : "min-h-screen w-full flex flex-col items-center selection:bg-black/10 transition-colors";

  return (
    <div
      className={containerClasses}
      style={{
        ...backgroundStyle,
        fontFamily: fontFamily,
      }}
    >
      {/* Contenedor principal con limitación de ancho para legibilidad */}
      <div className="relative z-10 flex w-full max-w-[480px] flex-1 flex-col items-center px-4 pb-12 pt-10 sm:px-6 sm:pb-16 sm:pt-16">
        
        {/* Avatar Section */}
        <div className="mb-6 relative group">
          <div className={`absolute -inset-0.5 bg-gradient-to-r from-black/5 to-black/10 blur opacity-75 ${avatarShapeClass}`}></div>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile.display_name || "Avatar"}
              className={`relative w-28 h-28 object-cover shadow-lg border-[3px] border-white/40 backdrop-blur-sm transition-transform duration-500 hover:scale-[1.02] ${avatarShapeClass}`}
            />
          ) : (
            <div className={`relative w-28 h-28 bg-black/5 flex items-center justify-center shadow-inner border-[3px] border-white/40 ${avatarShapeClass}`}>
              <svg className="w-10 h-10 text-black/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          )}
        </div>

        {/* Encabezado: Nombre y Bio */}
        <div className="text-center w-full px-4 mb-10 space-y-3">
          <h1
            className="break-words text-2xl font-extrabold tracking-tight md:text-3xl"
            style={{ color: "#1a1a1a" }}
          >
            {profile.display_name || "Tu Nombre"}
          </h1>
          {profile.bio && (
            <p 
              className="mx-auto max-w-[320px] break-words text-base font-medium leading-relaxed opacity-70 md:text-lg"
              style={{ color: "#1a1a1a" }}
            >
              {profile.bio}
            </p>
          )}
        </div>

        {/* Lista de Enlaces */}
        <div className="w-full space-y-4 flex-1 flex flex-col items-center">
          {links
            .filter((l) => l.enabled)
            .map((link, i) => (
              <a
                key={link.id || i}
                href={isPreview ? undefined : link.url}
                target={isPreview ? undefined : "_blank"}
                rel={isPreview ? undefined : "noopener noreferrer"}
                onClick={(e) => {
                  if (isPreview) e.preventDefault();
                }}
                className="group relative flex w-full items-center justify-center overflow-hidden rounded-2xl p-4 text-center font-semibold shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md active:scale-95"
                style={{
                  backgroundColor: buttonColor,
                  color: buttonTextColor,
                  minHeight: "64px",
                  boxShadow: isNeon ? `0 0 20px ${buttonColor}80, 0 0 40px ${buttonColor}40` : undefined,
                  border: isNeon ? `1px solid ${buttonColor}` : undefined
                }}
              >
                {/* Micro-animación de brillo en hover */}
                <div className="absolute inset-0 w-1/4 h-full bg-white/20 -skew-x-12 -translate-x-full group-hover:animate-[shine_1.5s_ease-out]"></div>
                
                <span className="relative z-10 w-full break-words text-[1.05rem]">
                  {link.label || "Enlace"}
                </span>
              </a>
            ))}
        </div>

        {/* Footer (Branding o aviso) */}
        <div className="mt-20 text-center opacity-40 text-xs font-semibold tracking-widest uppercase">
          <p>Generador de QR</p>
        </div>
      </div>
    </div>
  );
}
