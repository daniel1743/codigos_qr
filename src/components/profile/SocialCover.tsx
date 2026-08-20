import React, { forwardRef } from "react";
import { PlatformType, ProfileLink } from "../../types/database";
import { PLATFORMS_CATALOG } from "../../constants/platforms";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";

interface SocialCoverProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "onClick"> {
  link: ProfileLink;
  variant?: "cover" | "hero";
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

type VisualToken = { bg: string; text: string; gradient: string; cta: string };

const SocialVisualTokens: Record<string, VisualToken> = {
  instagram: {
    bg: "bg-fuchsia-600",
    text: "text-white",
    gradient: "bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]",
    cta: "Sígueme en Instagram",
  },
  tiktok: {
    bg: "bg-black",
    text: "text-white",
    gradient: "bg-gradient-to-br from-black via-zinc-900 to-black",
    cta: "Mira mis videos",
  },
  whatsapp: {
    bg: "bg-green-500",
    text: "text-white",
    gradient: "bg-gradient-to-r from-emerald-500 to-green-500",
    cta: "Hablemos",
  },
  youtube: {
    bg: "bg-red-600",
    text: "text-white",
    gradient: "bg-gradient-to-r from-red-600 to-red-700",
    cta: "Mira mis videos",
  },
  twitter: {
    bg: "bg-black",
    text: "text-white",
    gradient: "bg-gradient-to-br from-black to-zinc-800",
    cta: "Sígueme en X",
  },
  linkedin: {
    bg: "bg-blue-600",
    text: "text-white",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-700",
    cta: "Conecta",
  },
  facebook: {
    bg: "bg-blue-600",
    text: "text-white",
    gradient: "bg-gradient-to-r from-blue-600 to-blue-700",
    cta: "Sígueme en Facebook",
  },
  spotify: {
    bg: "bg-green-500",
    text: "text-white",
    gradient: "bg-gradient-to-r from-green-500 to-green-600",
    cta: "Escúchalo en Spotify",
  },
  generic: {
    bg: "bg-zinc-800",
    text: "text-white",
    gradient: "bg-gradient-to-r from-zinc-800 to-zinc-900",
    cta: "Visitar enlace",
  },
};

export const SocialCover = forwardRef<HTMLAnchorElement, SocialCoverProps>(
  ({ link, variant = "cover", className, onClick, ...props }, ref) => {
    const platformStr = link.platform || "generic";
    const platformDef =
      PLATFORMS_CATALOG.find((p) => p.id === platformStr) ||
      PLATFORMS_CATALOG.find((p) => p.id === "other");
    const Icon = platformDef?.icon;

    const genericToken: VisualToken = {
      bg: "bg-zinc-800",
      text: "text-white",
      gradient: "bg-gradient-to-r from-zinc-800 to-zinc-900",
      cta: "Visitar enlace",
    };

    const tokens = SocialVisualTokens[platformStr] || SocialVisualTokens["generic"] || genericToken;

    if (variant === "hero") {
      // Modified by Antigravity — QR-UI-17 / QR-UI-17B
      return (
        <a
          ref={ref}
          {...props}
          href={link.url}
          onClick={onClick}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative flex w-full pt-12 pb-24 px-6 overflow-hidden transition-all motion-reduce:transition-none",
            tokens.gradient,
            tokens.text,
            className,
          )}
          style={{
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
          }}
        >
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity motion-reduce:transition-none" />
          <div className="relative z-10 flex flex-col items-center w-full text-center animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none motion-reduce:transform-none">
            {Icon && (
              <div className="mb-4 p-3.5 rounded-full bg-white/20 backdrop-blur-md shadow-sm">
                <Icon className="w-8 h-8 text-white drop-shadow-sm" />
              </div>
            )}
            <h2 className="text-2xl font-bold tracking-tight mb-1.5 text-white drop-shadow-sm">
              {link.label || platformDef?.label}
            </h2>
            <p className="text-xs font-semibold text-white/90 uppercase tracking-widest flex items-center gap-1.5 drop-shadow-sm">
              {tokens.cta} <ArrowUpRight className="w-3.5 h-3.5" />
            </p>
          </div>
        </a>
      );
    }

    // Cover Variant
    return (
      <a
        ref={ref}
        {...props}
        href={link.url}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group relative flex items-center p-4 rounded-xl overflow-hidden transition-transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm",
          tokens.gradient,
          tokens.text,
          className,
        )}
      >
        <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
        <div className="relative z-10 flex items-center gap-4 w-full">
          {Icon && (
            <div className="p-2.5 rounded-lg bg-white/20 backdrop-blur-md flex-shrink-0 shadow-sm">
              <Icon className="w-6 h-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold truncate text-white leading-tight drop-shadow-sm">
              {link.label || platformDef?.label}
            </p>
            <p className="text-[11px] font-medium text-white/90 uppercase tracking-wider mt-1 truncate drop-shadow-sm">
              {tokens.cta}
            </p>
          </div>
          <ArrowUpRight className="w-5 h-5 text-white/60 group-hover:text-white transition-colors flex-shrink-0" />
        </div>
      </a>
    );
  },
);
SocialCover.displayName = "SocialCover";
