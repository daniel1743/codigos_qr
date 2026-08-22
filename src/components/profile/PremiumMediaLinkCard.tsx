import { useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpRight, Paperclip, Loader2 } from "lucide-react";
import type { ProfileLink } from "../../types/database";
import { getPlatformDef } from "../../constants/platforms";
import {
  getPremiumMediaLayout,
  type PremiumMediaLayoutId,
} from "../../lib/design/premium-media-layouts";
import { getBrowserSupabaseClient } from "../../lib/supabase/client";
import { toast } from "sonner";

interface PremiumMediaLinkCardProps {
  link: ProfileLink;
  layout: PremiumMediaLayoutId;
  mainAvatarUrl?: string | null;
  isPreview?: boolean;
  coverHeight?: number | null;
  coverWidth?: number | null;
  userId?: string | null;
  onLinkChange?: ((linkId: string, updates: Partial<ProfileLink>) => void) | undefined;
}

function getLinkVisual(link: ProfileLink, mainAvatarUrl?: string | null) {
  if (link.social_cover_image_mode === "custom_image" && link.social_cover_image_url) {
    return { type: "custom" as const, url: link.social_cover_image_url };
  }

  if (link.social_cover_image_mode === "main_avatar" && mainAvatarUrl) {
    return { type: "avatar" as const, url: mainAvatarUrl };
  }

  return { type: "platform" as const, url: null };
}

function getLinkDescription(link: ProfileLink) {
  const value = (link.subtitle || "").trim();

  if (!value) {
    return "Conoce los detalles de este enlace.";
  }

  return value.length > 60 ? `${value.slice(0, 57).trim()}...` : value;
}

export function PremiumMediaLinkCard({
  link,
  layout,
  mainAvatarUrl,
  isPreview = false,
  coverHeight,
  coverWidth,
  userId,
  onLinkChange,
}: PremiumMediaLinkCardProps) {
  const [uploading, setUploading] = useState(false);
  const supabase = getBrowserSupabaseClient();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) {
      toast.error("Inicia sesión para subir fotos.");
      return;
    }
    if (!onLinkChange) return;

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `social-cover-${link.platform || "link"}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/social-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      onLinkChange(link.id, {
        social_cover_image_mode: "custom_image",
        social_cover_image_url: data.publicUrl,
      });
      toast.success("Foto de tarjeta actualizada.");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo subir la foto.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };
  const design = getPremiumMediaLayout(layout);
  const platform = getPlatformDef(link.platform || "other");
  const PlatformIcon = platform.icon;
  const visual = getLinkVisual(link, mainAvatarUrl);
  const description = getLinkDescription(link);
  const visualIsImage = visual.type !== "platform";
  const imageRadius =
    design.mediaShape === "square" ? "18px" : design.mediaShape === "soft" ? "22px" : "26px";
  const clampStyle = {
    display: "-webkit-box",
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  } as CSSProperties;
  const ctaIsLight = design.contentColor === "#ffffff";
  const ctaBackground = ctaIsLight ? "rgba(255, 255, 255, 0.92)" : design.accentColor;
  const ctaColor = ctaIsLight ? "#111827" : "#ffffff";
  const mediaBackground = visualIsImage ? "rgba(255, 255, 255, 0.72)" : design.mediaBackground;
  const mediaBorder = visualIsImage
    ? "1px solid rgba(255, 255, 255, 0.72)"
    : design.mediaBorder;
  const normalizedHeight = Math.min(88, Math.max(48, Number(coverHeight || 64)));
  const normalizedWidth = Math.min(116, Math.max(88, Number(coverWidth || 100)));
  const cardMinHeight = Math.max(132, Math.round(normalizedHeight * 2.3));
  const mediaMinHeight = Math.max(112, cardMinHeight - 12);
  const mediaInnerMinHeight = Math.max(104, mediaMinHeight - 10);

  if (layout === "media_larissa_luxury") {
    /* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02B */
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={(event) => {
          if (isPreview) event.preventDefault();
        }}
        className="block relative group mb-5 last:mb-0 ml-8 outline-none focus-visible:ring-2 focus-visible:ring-[#D9BBA0] rounded-[2rem] w-[calc(100%-2rem)] select-none"
      >
        {/* Main Card Body */}
        <div className="bg-gradient-to-r from-[#F9EFEB] via-[#EAE1D9] to-[#D5C2B2] rounded-[2rem] p-5 pl-12 flex items-center justify-between shadow-[0_10px_30px_rgba(0,0,0,0.3)] border border-[#ffffff20] transition-all duration-300 group-hover:translate-y-[-2px] group-hover:shadow-[0_15px_35px_rgba(217,187,160,0.15)] overflow-hidden relative min-h-[96px] text-left">
          {/* Subtle inner highlight to enhance 3D feel */}
          <div className="absolute inset-0 rounded-[2rem] border border-white/40 pointer-events-none"></div>

          <div className="flex-1 pr-4 relative z-10 min-w-0">
            <h3 className="text-[#30261E] font-sans text-[0.85rem] font-semibold tracking-wide uppercase mb-1 truncate">
              {link.label}
            </h3>
            <p className="text-[#5A4E44] font-sans text-[0.65rem] leading-snug opacity-90 pr-2 line-clamp-2">
              {description}
            </p>
          </div>

          {/* Right Arrow Button */}
          <div className="w-8 h-8 rounded-full border border-white/60 flex items-center justify-center text-[#30261E]/70 bg-white/10 group-hover:bg-white/20 transition-colors z-10 shrink-0">
            <ArrowUpRight size={16} strokeWidth={1.5} />
          </div>
        </div>

        {/* Overlapping Left Circle */}
        <div className="absolute -left-8 top-1/2 -translate-y-1/2 w-[4.5rem] h-[4.5rem] bg-gradient-to-br from-[#FDFCFB] to-[#F2E8E0] rounded-full border border-[#D9BBA0]/40 shadow-[0_4px_15px_rgba(0,0,0,0.15)] flex items-center justify-center text-[#A68A72] z-20 transition-transform duration-300 group-hover:scale-105 overflow-hidden">
          {/* Inner subtle ring */}
          <div className="absolute inset-1 rounded-full border border-[#D9BBA0]/20 z-10 pointer-events-none"></div>
          
          {visualIsImage && visual.url ? (
            <img src={visual.url} alt="" className="w-full h-full object-cover" />
          ) : (
            <PlatformIcon size={24} strokeWidth={1.5} />
          )}

          {/* Clip edit overlay in preview mode */}
          {isPreview && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="p-1.5 bg-white text-[#A68A72] rounded-full shadow-md cursor-pointer hover:scale-110 active:scale-95 transition-transform flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#A68A72]" />
                ) : (
                  <Paperclip className="h-3.5 w-3.5" />
                )}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>
      </a>
    );
  }

  if (layout === "media_barbara_elite") {
    /* Modified by ChatGPT Work — ENC-DOC-SECURE-DELIVERY-02B */
    return (
      <a
        href={isPreview ? "#" : link.url}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        onClick={(event) => {
          if (isPreview) event.preventDefault();
        }}
        className="relative group cursor-pointer block w-full mb-6 select-none"
      >
         {/* Icon floating on left */}
         <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow-md flex items-center justify-center text-[#2D5A60] z-20 border border-gray-100/80 transition-transform duration-200 group-hover:scale-105">
           <PlatformIcon size={20} strokeWidth={2} />
         </div>
         
         {/* Main Card Container */}
         <div className="ml-4 bg-[#2D5A60] rounded-[1.5rem] flex overflow-hidden shadow-lg transform transition-all duration-300 group-hover:-translate-y-1 hover:shadow-xl min-h-[140px] text-left">
           <div className="flex-1 p-5 pr-2 flex flex-col justify-center min-w-0">
             <h3 className="text-white font-medium tracking-wide mb-1 text-sm truncate">{link.label}</h3>
             <p className="text-[#F4EBE4] text-xs leading-snug mb-3 opacity-90 line-clamp-3 font-light">
               {description}
             </p>
             <button className="bg-gradient-to-r from-[#f0dfc8] via-[#f7ebd9] to-[#dcc39e] text-[#2D5A60] font-bold text-[0.65rem] uppercase tracking-widest py-1.5 px-4 rounded shadow-sm self-start hover:shadow-md transition-shadow border border-[#dcc39e]/50 cursor-pointer">
               ACESSAR
             </button>
           </div>
           
           {/* Image side */}
            <div className="w-[35%] sm:w-[40%] bg-gray-300 relative overflow-hidden shrink-0">
              {visualIsImage && visual.url ? (
                 <img src={visual.url} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                 <>
                   <div className="absolute inset-0 bg-[#dcc39e] opacity-40"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-[#2D5A60]/60 text-[0.6rem] text-center px-2 font-medium">
                     {platform.label}
                   </div>
                 </>
              )}

              {/* Clip edit overlay in preview mode */}
              {isPreview && (
                <div 
                  className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label className="p-2.5 bg-white text-[#2D5A60] rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-transform flex items-center justify-center">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[#2D5A60]" />
                    ) : (
                      <Paperclip className="h-4 w-4" />
                    )}
                    <input 
                      type="file" 
                      accept="image/png, image/jpeg, image/webp" 
                      className="hidden" 
                      onChange={handleFileChange}
                      disabled={uploading}
                    />
                  </label>
                </div>
              )}
            </div>
         </div>
      </a>
    );
  }

  return (
    <a
      href={isPreview ? "#" : link.url}
      target={isPreview ? undefined : "_blank"}
      rel={isPreview ? undefined : "noopener noreferrer"}
      onClick={(event) => {
        if (isPreview) event.preventDefault();
      }}
      className="group mx-auto grid grid-cols-[minmax(0,1fr)_minmax(112px,38%)] items-stretch gap-1 overflow-visible p-1.5 text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: design.cardBackground,
        border: design.cardBorder,
        borderRadius: "22px",
        boxShadow: design.cardShadow,
        color: design.contentColor,
        width: `${normalizedWidth}%`,
        maxWidth: "calc(100% + 36px)",
        minHeight: `${cardMinHeight}px`,
      }}
    >
      <div className="relative z-10 flex min-w-0 flex-col justify-between py-3 pl-4 pr-2">
        <div className="flex items-start justify-between gap-3">
          <span
            className="max-w-[7.5rem] truncate text-[10px] font-bold uppercase"
            style={{ color: design.mutedColor, letterSpacing: "0.08em" }}
          >
            {platform.label}
          </span>
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ background: "rgba(255, 255, 255, 0.18)", color: design.accentColor }}
          >
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </span>
        </div>
        <div className="min-w-0">
          <p
            className="text-[19px] font-bold leading-tight"
            style={{ ...clampStyle, WebkitLineClamp: 2 }}
          >
            {link.label}
          </p>
          <p
            className="mt-1.5 text-[11px] leading-snug"
            style={{ ...clampStyle, WebkitLineClamp: 2, color: design.mutedColor }}
          >
            {description}
          </p>
          <span
            className="mt-2.5 inline-flex rounded px-3 py-1 text-[10px] font-black uppercase shadow-sm"
            style={{ background: ctaBackground, color: ctaColor, letterSpacing: "0.08em" }}
          >
            Acceder
          </span>
        </div>
      </div>
      <div
        className="relative flex items-stretch overflow-visible py-1.5 pr-1.5"
        style={{ minHeight: `${mediaMinHeight}px` }}
      >
        <div
          className="relative h-full w-full overflow-hidden transition-transform duration-300 group-hover:scale-[1.015]"
          style={{
            borderRadius: imageRadius,
            background: mediaBackground,
            border: mediaBorder,
            boxShadow: visualIsImage ? "inset 0 0 0 1px rgba(15, 23, 42, 0.06)" : undefined,
            minHeight: `${mediaInnerMinHeight}px`,
          }}
        >
          {visualIsImage && visual.url ? (
            <img src={visual.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <PlatformIcon
              className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2"
              style={{ color: design.accentColor }}
              aria-hidden="true"
            />
          )}
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-black/10 via-transparent to-white/10" />
          <span
            className="absolute bottom-3 left-3 h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: design.accentColor }}
          />

          {/* Clip edit overlay in preview mode */}
          {isPreview && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30"
              onClick={(e) => e.stopPropagation()}
            >
              <label className="p-2 bg-white text-[#111827] rounded-full shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-transform flex items-center justify-center">
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
                <input 
                  type="file" 
                  accept="image/png, image/jpeg, image/webp" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={uploading}
                />
              </label>
            </div>
          )}
        </div>
        <span
          className="absolute bottom-5 left-[-13px] z-20 grid h-9 w-9 place-items-center rounded-full border shadow-lg"
          style={{
            background: "rgba(255, 255, 255, 0.96)",
            borderColor: "rgba(255, 255, 255, 0.82)",
            color: design.accentColor,
          }}
        >
          <PlatformIcon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
    </a>
  );
}
