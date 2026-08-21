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
  imageFit = "cover",
  showPlatformBadge,
  className,
  iconClassName,
  iconStyle,
  style,
}: {
  Icon?: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  token: VisualToken;
  avatarUrl?: string | null;
  imageFit?: "cover" | "contain";
  showPlatformBadge?: boolean;
  className?: string;
  iconClassName?: string;
  iconStyle?: React.CSSProperties | undefined;
  style?: React.CSSProperties | undefined;
}) {
  const hasSecondaryBadge = Boolean(avatarUrl && showPlatformBadge && Icon);

  return (
    <div
      className={cn(className, "relative z-20 grid shrink-0 place-items-center overflow-visible")}
      style={style}
    >
      <div className="relative h-full w-full grid place-items-center overflow-hidden [border-radius:inherit]">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt=""
            className={cn(
              "block h-full w-full",
              imageFit === "contain" ? "object-contain scale-[0.85]" : "object-cover",
            )}
          />
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
      </div>
      {hasSecondaryBadge && Icon && (
        <span
          className="absolute z-30 grid rounded-full border-[3px] border-white shadow-[0_3px_8px_rgba(15,23,42,0.28)]"
          style={{
            width: "40%",
            height: "40%",
            minWidth: 22,
            minHeight: 22,
            background: token.primary,
            bottom: 0,
            right: 0,
          }}
        >
          <Icon className="m-auto h-[50%] w-[50%] text-white" />
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
    // The mark includes both the avatar and the secondary platform seal.
    // Keeping that full composition inside its allocated footprint prevents
    // parent button styles from cutting off the seal.
    const innerMarkSize = Math.max(42, markSize - 8);
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
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
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
                imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
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
                imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
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

    if (style === "solid_subscribe") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[72px] w-full items-center gap-4 overflow-hidden rounded-full px-5 text-white shadow-[0_12px_0_rgba(15,23,42,0.14),0_20px_28px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{ ...coverSizingStyle, background: token.gradient }}
        >
          <span className="absolute inset-x-5 bottom-2 h-1/3 rounded-full bg-white/10" />
          <PlatformMark
            Icon={Icon}
            token={token}
            avatarUrl={badgeImageUrl}
            imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
            showPlatformBadge={showPlatformBadge}
            className="rounded-2xl bg-white/15"
            iconClassName="text-white drop-shadow-sm"
            iconStyle={{ width: iconSize + 4, height: iconSize + 4 }}
            style={{ width: innerMarkSize, height: innerMarkSize }}
          />
          {textBlock}
          <ArrowUpRight className="relative z-10 h-5 w-5 shrink-0 text-white/90" />
        </a>
      );
    }

    if (style === "raised_gloss") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[76px] w-full items-center overflow-hidden rounded-[24px] border-[5px] border-white pr-5 shadow-[0_7px_0_rgba(148,163,184,0.55),0_14px_24px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{ ...coverSizingStyle, background: token.gradient }}
        >
          <span className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.20)_0%,transparent_34%,rgba(255,255,255,0.10)_60%,transparent_61%)]" />
          <div className="relative z-10 grid h-full min-w-[78px] place-items-center border-r border-white/20">
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="rounded-full bg-white/95"
              iconClassName="text-current"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize, color: token.primary }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3 pl-4">{textBlock}</div>
          <ArrowUpRight className="relative z-10 h-5 w-5 shrink-0 text-white/90" />
        </a>
      );
    }

    if (style === "heart_badge") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[78px] w-full items-center overflow-visible rounded-[24px] pl-[96px] pr-5 text-white shadow-[0_14px_28px_rgba(15,23,42,0.18)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{ ...coverSizingStyle, background: token.gradient }}
        >
          <span className="absolute inset-0 rounded-[24px] border border-white/20" />
          <div
            className="absolute -left-3 top-1/2 grid -translate-y-1/2 place-items-center rounded-[28px] shadow-[8px_8px_0_rgba(15,23,42,0.18)]"
            style={{
              width: markSize,
              height: markSize,
              background: `radial-gradient(circle at 35% 28%, rgba(255,255,255,0.30), transparent 34%), ${token.gradient}`,
            }}
          >
            <span className="absolute -top-[18%] left-[18%] h-[48%] w-[48%] rounded-full bg-inherit" />
            <span className="absolute -top-[18%] right-[18%] h-[48%] w-[48%] rounded-full bg-inherit" />
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="z-10 rounded-full"
              iconClassName="text-white drop-shadow-sm"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3">{textBlock}</div>
          <ArrowUpRight className="relative z-10 h-5 w-5 shrink-0 text-white/90" />
        </a>
      );
    }

    if (style === "angled_tab") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[74px] w-full items-center overflow-visible rounded-r-[28px] bg-white pl-[94px] pr-5 shadow-[0_12px_24px_rgba(15,23,42,0.14)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={coverSizingStyle}
        >
          <span
            className="absolute inset-0 rounded-r-[28px] border-2"
            style={{ borderColor: token.primary }}
          />
          <div
            className="absolute -left-2 top-0 grid h-full place-items-center text-white shadow-md"
            style={{
              width: Math.max(74, markSize + 8),
              background: token.gradient,
              clipPath: "polygon(0 0, 84% 0, 100% 100%, 0 100%)",
            }}
          >
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="rounded-full"
              iconClassName="text-white drop-shadow-sm"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3">
            <p
              className="truncate font-extrabold leading-tight"
              style={{ color: token.dark, fontSize: labelFontSize }}
            >
              {label}
            </p>
            <p
              className="mt-1 truncate font-bold uppercase tracking-[0.18em]"
              style={{ color: token.primary, fontSize: ctaFontSize }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight
            className="relative z-10 h-5 w-5 shrink-0"
            style={{ color: token.primary }}
          />
        </a>
      );
    }

    if (style === "leaf_outline") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[74px] w-full items-center overflow-hidden bg-white pl-[88px] pr-5 shadow-[0_12px_22px_rgba(15,23,42,0.12)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{ ...coverSizingStyle, borderRadius: "999px 26px 999px 999px" }}
        >
          <span
            className="absolute inset-[5px] rounded-[999px_22px_999px_999px] border-2"
            style={{ borderColor: token.primary }}
          />
          <div
            className="absolute left-0 top-0 grid h-full place-items-center text-white"
            style={{
              width: Math.max(78, markSize + 10),
              background: token.gradient,
              borderRadius: "999px 0 999px 999px",
              clipPath: "polygon(0 0, 82% 0, 100% 50%, 82% 100%, 0 100%)",
            }}
          >
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="rounded-full"
              iconClassName="text-white"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3">
            <p
              className="truncate font-extrabold leading-tight"
              style={{ color: token.dark, fontSize: labelFontSize }}
            >
              {label}
            </p>
            <p
              className="mt-1 truncate font-semibold uppercase tracking-[0.12em]"
              style={{ color: token.primary, fontSize: ctaFontSize }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight
            className="relative z-10 h-5 w-5 shrink-0"
            style={{ color: token.primary }}
          />
        </a>
      );
    }

    if (style === "metal_coin") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[72px] w-full items-center overflow-visible rounded-r-full pl-[90px] pr-5 text-white shadow-[0_10px_22px_rgba(15,23,42,0.16)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{ ...coverSizingStyle, background: token.gradient }}
        >
          <span className="absolute inset-0 rounded-r-full border border-white/30" />
          <div
            className="absolute -left-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full border border-white/80 shadow-lg"
            style={{
              width: markSize,
              height: markSize,
              background: "conic-gradient(from 25deg, #f8fafc, #94a3b8, #ffffff, #64748b, #f8fafc)",
            }}
          >
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="rounded-full bg-white/80"
              iconClassName="text-current"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize, color: token.primary }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3">{textBlock}</div>
          <ArrowUpRight className="relative z-10 h-5 w-5 shrink-0 text-white/90" />
        </a>
      );
    }

    if (style === "neon_lumen") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[76px] w-full items-center gap-4 overflow-hidden rounded-full px-4 text-white shadow-[0_18px_32px_rgba(2,6,23,0.32)] transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={{
            ...coverSizingStyle,
            background: `linear-gradient(90deg, ${token.dark} 0%, ${token.primary} 58%, ${token.secondary} 100%)`,
          }}
        >
          <span className="absolute inset-0 bg-black/25" />
          <span className="absolute -inset-y-10 left-12 w-32 rotate-12 bg-white/20 blur-2xl" />
          <PlatformMark
            Icon={Icon}
            token={token}
            avatarUrl={badgeImageUrl}
            imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
            showPlatformBadge={showPlatformBadge}
            className="relative z-10 rounded-full bg-white"
            iconClassName="text-current"
            iconStyle={{ width: iconSize, height: iconSize }}
            style={{ width: innerMarkSize, height: innerMarkSize, color: token.primary }}
          />
          <div className="relative z-10 min-w-0 flex-1">{textBlock}</div>
          <ArrowUpRight className="relative z-10 h-5 w-5 shrink-0 text-white/90" />
        </a>
      );
    }

    if (style === "glass_orbit") {
      return (
        <a
          {...baseProps}
          className={cn(
            "group relative flex min-h-[76px] w-full items-center overflow-hidden rounded-[28px] border border-white/60 bg-white/80 pl-[90px] pr-5 shadow-[0_14px_28px_rgba(15,23,42,0.16)] backdrop-blur transition-transform hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transition-none motion-reduce:transform-none",
            className,
          )}
          style={coverSizingStyle}
        >
          <span className="absolute inset-0 opacity-25" style={{ background: token.gradient }} />
          <div
            className="absolute -left-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-full border-[7px] border-white shadow-lg"
            style={{ width: markSize, height: markSize, background: token.gradient }}
          >
            <PlatformMark
              Icon={Icon}
              token={token}
              avatarUrl={badgeImageUrl}
              imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
              showPlatformBadge={showPlatformBadge}
              className="rounded-full bg-white"
              iconClassName="text-current"
              iconStyle={{ width: iconSize, height: iconSize }}
              style={{ width: innerMarkSize, height: innerMarkSize, color: token.primary }}
            />
          </div>
          <div className="relative z-10 min-w-0 flex-1 py-3">
            <p
              className="truncate font-extrabold leading-tight"
              style={{ color: token.dark, fontSize: labelFontSize }}
            >
              {label}
            </p>
            <p
              className="mt-1 truncate font-bold uppercase tracking-[0.18em]"
              style={{ color: token.primary, fontSize: ctaFontSize }}
            >
              {token.cta}
            </p>
          </div>
          <ArrowUpRight
            className="relative z-10 h-5 w-5 shrink-0"
            style={{ color: token.primary }}
          />
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
            imageFit={resolvedImage.mode === "custom_image" ? "contain" : "cover"}
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
