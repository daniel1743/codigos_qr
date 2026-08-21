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
  const visualIsImage = visual.type !== "platform";
  const imageFit = visual.type === "custom" ? "contain" : "cover";
  const imagePadding = visual.type === "custom" ? "10px" : "0";
  const imageRadius =
    design.mediaShape === "round" ? "999px" : design.mediaShape === "soft" ? "18px" : "10px";

  const media = (
    <div
      className="relative m-2 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.025]"
      style={{
        borderRadius: imageRadius,
        background: design.mediaBackground,
        border: design.mediaBorder,
      }}
    >
      {visualIsImage && visual.url ? (
        <img
          src={visual.url}
          alt=""
          className="absolute inset-0 h-full w-full"
          style={{ objectFit: imageFit, padding: imagePadding }}
        />
      ) : (
        <PlatformIcon
          className="h-11 w-11"
          style={{ color: design.accentColor }}
          aria-hidden="true"
        />
      )}
      <span
        className="absolute bottom-2 left-2 h-2 w-2 rounded-full"
        style={{ backgroundColor: design.accentColor }}
      />
    </div>
  );

  return (
    <a
      href={isPreview ? "#" : link.url}
      target={isPreview ? undefined : "_blank"}
      rel={isPreview ? undefined : "noopener noreferrer"}
      onClick={(event) => {
        if (isPreview) event.preventDefault();
      }}
      className="group flex min-h-[128px] w-full overflow-hidden text-left transition duration-200 hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      style={{
        background: design.cardBackground,
        border: design.cardBorder,
        borderRadius: "18px",
        boxShadow: design.cardShadow,
        color: design.contentColor,
      }}
    >
      {design.mediaPosition === "left" && media}
      <div className="min-w-0 flex-1 px-3 py-4 sm:px-4">
        <div className="flex items-start justify-between gap-3">
          <span
            className="min-w-0 truncate text-[10px] font-bold uppercase"
            style={{ color: design.mutedColor, letterSpacing: "0.08em" }}
          >
            {platform.label}
          </span>
          <ArrowUpRight
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: design.accentColor }}
            aria-hidden="true"
          />
        </div>
        <div className="mt-3 min-w-0">
          <p
            className="overflow-hidden text-[17px] font-bold leading-tight"
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 2,
            }}
          >
            {link.label}
          </p>
          <span
            className="mt-2 block text-[10px] font-semibold uppercase"
            style={{ color: design.mutedColor, letterSpacing: "0.08em" }}
          >
            Abrir enlace
          </span>
        </div>
      </div>
      {design.mediaPosition === "right" && media}
    </a>
  );
}
