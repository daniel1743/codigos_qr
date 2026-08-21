import React, { forwardRef } from "react";
import { LinkImageMode, ProfileLink } from "../../types/database";
import { PLATFORMS_CATALOG } from "../../constants/platforms";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";
import {
  DEFAULT_SOCIAL_COVER_STYLE,
  SocialCoverStyle,
  normalizeSocialCoverStyle,
} from "../../constants/social-cover-styles";

interface SocialCoverProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "onClick"> {
  link: ProfileLink;
  variant?: "cover" | "hero";
  coverStyle?: SocialCoverStyle | string | null | undefined;
  avatarUrl?: string | null | undefined;
  coverHeight?: number | string | null | undefined;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

type VisualToken = {
  primary: string;
  secondary: string;
  dark: string;
  gradient: string;
  cta: string;
};

const SocialVisualTokens: Record<string, VisualToken> = {
  instagram: {
    primary: "#E4405F",
    secondary: "#F77737",
    dark: "#2a143d",
    gradient: "linear-gradient(135deg, #f9ce34 0%, #ee2a7b 46%, #6228d7 100%)",
    cta: "Sigueme en Instagram",
  },
  tiktok: {
    primary: "#00F2EA",
    secondary: "#FF0050",
    dark: "#050505",
    gradient: "linear-gradient(135deg, #020617 0%, #111111 48%, #321124 100%)",
    cta: "Mira mis videos",
  },
  whatsapp: {
    primary: "#25D366",
    secondary: "#128C7E",
    dark: "#063f36",
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 52%, #047857 100%)",
    cta: "Hablemos",
  },
  youtube: {
    primary: "#FF0000",
    secondary: "#B91C1C",
    dark: "#230b0b",
    gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #991b1b 100%)",
    cta: "Mira mis videos",
  },
  twitter: {
    primary: "#111111",
    secondary: "#2f2f2f",
    dark: "#030712",
    gradient: "linear-gradient(135deg, #030712 0%, #111827 55%, #374151 100%)",
    cta: "Sigueme en X",
  },
  linkedin: {
    primary: "#0A66C2",
    secondary: "#0EA5E9",
    dark: "#0f2747",
    gradient: "linear-gradient(135deg, #0a66c2 0%, #0284c7 54%, #075985 100%)",
    cta: "Conecta",
  },
  facebook: {
    primary: "#1877F2",
    secondary: "#0EA5E9",
    dark: "#0b2a62",
    gradient: "linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%)",
    cta: "Sigueme en Facebook",
  },
  spotify: {
    primary: "#1DB954",
    secondary: "#16a34a",
    dark: "#052e16",
    gradient: "linear-gradient(135deg, #22c55e 0%, #16a34a 48%, #052e16 100%)",
    cta: "Escuchalo en Spotify",
  },
  generic: {
    primary: "#111827",
    secondary: "#334155",
    dark: "#020617",
    gradient: "linear-gradient(135deg, #111827 0%, #334155 100%)",
    cta: "Visitar enlace",
  },
};

function getToken(platform: string): VisualToken {
  return (
    SocialVisualTokens[platform] ||
    SocialVisualTokens["generic"] || {
      primary: "#000000",
      secondary: "#333333",
      dark: "#111111",
      gradient: "linear-gradient(135deg, #333333 0%, #111111 100%)",
      cta: "Enlace",
    }
  );
}

function PlatformMark({
  Icon,
  token,
  avatarUrl,
  showPlatformBadge,
  className,
  iconClassName,
  iconStyle,
  style,
}: {
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  token: VisualToken;
  avatarUrl?: string | null;
  showPlatformBadge?: boolean;
  className?: string;
  iconClassName?: string;
  iconStyle?: React.CSSProperties | undefined;
  style?: React.CSSProperties | undefined;
}) {
  return (
    <div
      className={cn("relative grid shrink-0 place-items-center overflow-hidden", className)}
      style={style}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : Icon ? (
        <Icon
          className={cn("relative z-10", iconClassName)}
          {...(iconStyle ? { style: iconStyle } : {})}
        />
      ) : null}
      {!avatarUrl && (
        <span
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 30% 20%, #ffffff 0%, transparent 34%), ${token.gradient}`,
          }}
        />
      )}
      {avatarUrl && showPlatformBadge && Icon && (
        <span
          className="absolute -bottom-1 -right-1 grid rounded-full border-[3px] border-white shadow-sm"
          style={{
            width: "38%",
            height: "38%",
            minWidth: 24,
            minHeight: 24,
            background: token.gradient,
          }}
        >
          <Icon className="m-auto h-1/2 w-1/2 text-white" />
        </span>
      )}
    </div>
  );
}

// Modified by Codex — SOCIAL-BADGES-IMAGE-MODE
function getResolvedLinkImage(
  link: ProfileLink,
  avatarUrl?: string | null,
): { mode: LinkImageMode; imageUrl: string | null; showPlatformBadge: boolean } {
  const requestedMode = link.social_cover_image_mode || "platform_icon";

  if (requestedMode === "custom_image" && link.social_cover_image_url) {
    return { mode: "custom_image", imageUrl: link.social_cover_image_url, showPlatformBadge: true };
  }

  if (requestedMode === "main_avatar" && avatarUrl) {
    return { mode: "main_avatar", imageUrl: avatarUrl, showPlatformBadge: true };
  }

  return { mode: "platform_icon", imageUrl: null, showPlatformBadge: false };
}

export const SocialCover = forwardRef<HTMLAnchorElement, SocialCoverProps>(
  (
    {
      link,
      variant = "cover",
      coverStyle = DEFAULT_SOCIAL_COVER_STYLE,
      avatarUrl,
      coverHeight,
      className,
      onClick,
      ...props
    },
    ref,
  ) => {
    const platformStr = link.platform || "generic";
    const platformDef =
      PLATFORMS_CATALOG.find((p) => p.id === platformStr) ||
      PLATFORMS_CATALOG.find((p) => p.id === "other");
    const Icon = platformDef?.icon;
    const token = getToken(platformStr);
    const style = normalizeSocialCoverStyle(coverStyle);
    const label = link.label || platformDef?.label || "Enlace";
    const resolvedImage = getResolvedLinkImage(link, avatarUrl);
    const badgeImageUrl = resolvedImage.imageUrl;
    const showPlatformBadge = resolvedImage.showPlatformBadge;
    const rawHeight =
      typeof coverHeight === "string" ? Number.parseInt(coverHeight, 10) : coverHeight;
    const coverH = Number.isFinite(rawHeight) ? Math.min(88, Math.max(48, rawHeight || 64)) : 64;
    const markSize = Math.min(86, Math.max(50, coverH + 8));
    const innerMarkSize = Math.max(38, markSize - 16);
    const iconSize = Math.max(22, Math.round(markSize * 0.42));
    const labelFontSize = Math.max(13, Math.min(16, Math.round(coverH * 0.23)));
    const ctaFontSize = Math.max(8, Math.min(10, Math.round(coverH * 0.14)));
    const coverSizingStyle: React.CSSProperties = { height: coverH, minHeight: coverH };

    if (variant === "hero") {
      return (
        <a
          ref={ref}
          {...props}
          href={link.url}
          onClick={onClick}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "group relative flex w-full overflow-hidden px-6 pb-24 pt-12 text-white transition-all motion-reduce:transition-none",
            className,
          )}
          style={{
            background: token.gradient,
            WebkitMaskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, #000 0%, #000 82%, transparent 100%)",
          }}
        >
          <div className="absolute inset-0 bg-black/5 opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none" />
          <div className="relative z-10 flex w-full animate-in flex-col items-center text-center duration-500 fade-in slide-in-from-bottom-2 motion-reduce:animate-none motion-reduce:transform-none">
            {Icon && (
              <div className="mb-4 rounded-full bg-white/20 p-3.5 shadow-sm backdrop-blur-md">
                <Icon className="h-8 w-8 text-white drop-shadow-sm" />
              </div>
            )}
            <h2 className="mb-1.5 text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              {label}
            </h2>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-white/90 drop-shadow-sm">
              {token.cta} <ArrowUpRight className="h-3.5 w-3.5" />
            </p>
          </div>
        </a>
      );
    }

    const baseProps = {
      ref,
      ...props,
      href: link.url,
      onClick,
      target: "_blank",
      rel: "noopener noreferrer",
    };

    const textBlock = (
      <div className="min-w-0 flex-1">
        <p
          className="truncate font-extrabold leading-tight text-white"
          style={{ fontSize: labelFontSize }}
        >
          {label}
        </p>
        <p
          className="mt-1 truncate font-bold uppercase tracking-[0.18em] text-white/80"
          style={{ fontSize: ctaFontSize }}
        >
          {token.cta}
        </p>
      </div>
    );

    // Modified by Antigravity — QR-UI-17E
    if (style === "split_capsule") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[72px] w-full items-center overflow-hidden rounded-[20px] bg-white pr-4 shadow-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none border border-slate-200",
            className,
          )}
          style={coverSizingStyle}
        >
          <div
            className="grid h-full min-w-[80px] place-items-center overflow-hidden text-white"
            style={{ background: token.gradient }}
          >
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              showPlatformBadge={showPlatformBadge}
              className="h-full w-full text-white"
              iconClassName="text-white drop-shadow-sm"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ color: "#ffffff" }}
            />
          </div>
          <div className="flex-1 min-w-0 pl-4 py-2">
            <p
              className="truncate text-[15px] font-extrabold leading-tight"
              style={{ color: token.dark }}
            >
              {label}
            </p>
            <p
              className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: token.primary }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0" style={{ color: token.primary }} />
        </a>
      );
    }

    if (style === "ribbon_label") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[74px] w-full items-center overflow-visible rounded-l-sm rounded-r-[24px] bg-white pl-[84px] pr-4 shadow-[0_8px_16px_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none border-y border-r border-slate-100",
            className,
          )}
          style={coverSizingStyle}
        >
          <div
            className="absolute -left-2 top-0 h-full text-white rounded-r-3xl shadow-md"
            style={{
              width: Math.max(64, markSize),
              background: token.gradient,
            }}
          >
            <div className="grid h-full place-items-center pr-2">
              <PlatformMark
                Icon={Icon}
                token={token}
                avatarUrl={badgeImageUrl}
                showPlatformBadge={showPlatformBadge}
                className="rounded-full border-2 border-white"
                iconClassName="text-white drop-shadow-sm"
                iconStyle={{ width: iconSize, height: iconSize }}
                style={{
                  width: innerMarkSize,
                  height: innerMarkSize,
                  background: badgeImageUrl ? undefined : token.gradient,
                }}
              />
            </div>
            <svg
              className="absolute -left-0 -bottom-2 h-2 w-2"
              viewBox="0 0 100 100"
              style={{ fill: token.dark }}
            >
              <polygon points="100,0 100,100 0,0" />
            </svg>
          </div>
          <div className="min-w-0 flex-1 py-3">
            <p
              className="truncate text-[15px] font-bold leading-tight"
              style={{ color: token.dark }}
            >
              {label}
            </p>
            <p
              className="mt-0.5 truncate text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: token.primary }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0" style={{ color: token.primary }} />
        </a>
      );
    }

    if (style === "avatar_capsule") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[76px] w-full items-center overflow-visible rounded-full pl-[92px] pr-5 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none border border-slate-100",
            className,
          )}
          style={coverSizingStyle}
        >
          <div
            className="absolute -left-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-full bg-white shadow-md p-1.5"
            style={{ width: markSize, height: markSize }}
          >
            <div className="relative h-full w-full rounded-full overflow-hidden bg-slate-100">
              <PlatformMark
                Icon={Icon}
                token={token}
                avatarUrl={badgeImageUrl}
                showPlatformBadge={showPlatformBadge}
                className="h-full w-full rounded-full"
                iconClassName="text-white"
                iconStyle={{ width: iconSize, height: iconSize }}
                style={{ background: badgeImageUrl ? undefined : token.gradient }}
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 py-3">
            <p
              className="truncate text-[15px] font-extrabold leading-tight"
              style={{ color: token.dark }}
            >
              {label}
            </p>
            <p
              className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em]"
              style={{ color: token.primary }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight className="h-5 w-5 shrink-0" style={{ color: token.primary }} />
        </a>
      );
    }

    // Default: badge_left
    return (
      <a
        {...baseProps}
        className={cn(
          "group relative flex min-h-[76px] w-full items-center overflow-visible rounded-[24px] pl-[94px] pr-5 bg-white shadow-[0_12px_24px_rgba(15,23,42,0.10)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none border border-slate-100",
          className,
        )}
        style={coverSizingStyle}
      >
        <div
          className="absolute -left-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full shadow-lg"
          style={{ background: token.gradient, width: markSize, height: markSize }}
        >
          <PlatformMark
            Icon={Icon}
            token={token}
            avatarUrl={badgeImageUrl}
            showPlatformBadge={showPlatformBadge}
            className="rounded-full border-[5px] border-white"
            iconClassName="text-white drop-shadow-sm"
            iconStyle={{ width: iconSize, height: iconSize }}
            style={{
              width: innerMarkSize,
              height: innerMarkSize,
              background: badgeImageUrl ? undefined : token.gradient,
            }}
          />
        </div>
        <div className="min-w-0 flex-1 py-3">
          <p
            className="truncate text-[15px] font-extrabold leading-tight"
            style={{ color: token.dark }}
          >
            {label}
          </p>
          <p
            className="mt-1 truncate text-[10px] font-bold uppercase tracking-[0.18em]"
            style={{ color: token.primary }}
          >
            {token.cta}
          </p>
        </div>
        <ArrowUpRight className="h-5 w-5 shrink-0" style={{ color: token.primary }} />
      </a>
    );
  },
);
SocialCover.displayName = "SocialCover";
