import type { CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import type { ProfileLink } from "../../types/database";
import { getPlatformDef } from "../../constants/platforms";
import {
  getPremiumMediaLayout,
  type PremiumMediaLayoutId,
} from "../../lib/design/premium-media-layouts";

interface PremiumMediaLinkCardProps {
  link: ProfileLink;
  layout: PremiumMediaLayoutId;
  mainAvatarUrl?: string | null;
  isPreview?: boolean;
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
}: PremiumMediaLinkCardProps) {
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

  return (
    <a
      href={isPreview ? "#" : link.url}
      target={isPreview ? undefined : "_blank"}
      rel={isPreview ? undefined : "noopener noreferrer"}
      onClick={(event) => {
        if (isPreview) event.preventDefault();
      }}
      className="group grid min-h-[148px] w-full grid-cols-[minmax(0,1fr)_minmax(112px,38%)] items-stretch gap-1 overflow-visible p-1.5 text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: design.cardBackground,
        border: design.cardBorder,
        borderRadius: "22px",
        boxShadow: design.cardShadow,
        color: design.contentColor,
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
      <div className="relative flex min-h-[136px] items-stretch overflow-visible py-1.5 pr-1.5">
        <div
          className="relative h-full min-h-[124px] w-full overflow-hidden transition-transform duration-300 group-hover:scale-[1.015]"
          style={{
            borderRadius: imageRadius,
            background: mediaBackground,
            border: mediaBorder,
            boxShadow: visualIsImage ? "inset 0 0 0 1px rgba(15, 23, 42, 0.06)" : undefined,
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
