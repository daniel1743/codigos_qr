import { BadgeCheck, MapPin } from "lucide-react";
import { useRender, type ProfileTarget } from "../../engine/RenderContext";
import { headingStyle } from "../../engine/styleEngine";
import { hexToRgba } from "../../utils";
import type { TemplateLayout, TemplateProfile } from "../../types";
import { InlineText } from "../blocks/primitives";
import { requestInspectorFocus } from "../inspector/inspectorFocus";

/**
 * The profile header is layout-aware: the same data composes very differently
 * depending on `layout.header` — no duplicated template components.
 */
/**
 * The profile cover/banner surface. Rendered either inside the profile header
 * (contained) or as a direct child of the page surface (full-bleed). The
 * `fullBleed` flag only changes horizontal reach + top-corner rounding; the
 * image / blur / focal / overlay / height contract is identical in both modes.
 */
export function ProfileBanner({
  banner,
  fullBleed = false,
}: {
  banner: TemplateProfile["banner"];
  fullBleed?: boolean;
}) {
  const { theme, breakpoint, mode, onSelectProfileCover, onSelectProfileTarget } = useRender();
  const bannerHeight = breakpoint === "mobile" ? banner.mobileHeight : banner.height;

  const blendFade = banner.blendFade;
  const fadeEnabled = blendFade?.enabled === true;
  const fadeDistance = blendFade?.distance ?? 80;
  const fadeStrength = blendFade?.strength ?? 1;
  const fadeAlpha = Math.round((1 - fadeStrength) * 1000) / 1000;

  const selectCover = () => {
    if (onSelectProfileTarget) {
      onSelectProfileTarget("profile-cover");
      return;
    }
    if (onSelectProfileCover) {
      onSelectProfileCover();
      return;
    }
    requestInspectorFocus("profile-cover");
  };

  return (
    <div
      {...(mode === "edit" ? { "data-editor-target": "profile-cover" } : {})}
      onClick={(e) => {
        if (mode !== "edit") return;
        e.stopPropagation();
        selectCover();
      }}
      style={{
        position: "relative",
        zIndex: fullBleed ? 2 : undefined,
        height: bannerHeight,
        borderRadius: fullBleed ? `0 0 ${banner.radius}px ${banner.radius}px` : banner.radius,
        overflow: "hidden",
        backgroundColor: theme.colors.surface,
        cursor: mode === "edit" ? "pointer" : undefined,
        ...(fadeEnabled
          ? {
              WebkitMaskImage: `linear-gradient(180deg, #000 0%, #000 calc(100% - ${fadeDistance}px), rgba(0,0,0,${fadeAlpha}) 100%)`,
              maskImage: `linear-gradient(180deg, #000 0%, #000 calc(100% - ${fadeDistance}px), rgba(0,0,0,${fadeAlpha}) 100%)`,
            }
          : {}),
      }}
    >
      {banner.imageUrl ? (
        <img
          src={banner.imageUrl}
          alt=""
          loading="lazy"
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `${banner.focalX}% ${banner.focalY}%`,
            filter: banner.blur ? `blur(${banner.blur}px)` : undefined,
            transform: banner.blur ? "scale(1.06)" : undefined,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            backgroundImage: `linear-gradient(120deg, ${theme.colors.primary}, ${theme.colors.accent})`,
          }}
        />
      )}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background: banner.gradient
            ? `linear-gradient(180deg, ${hexToRgba(theme.colors.background, 0)} 30%, ${hexToRgba(theme.colors.background, Math.max(banner.overlay, 0.35))} 100%)`
            : hexToRgba(theme.colors.background, banner.overlay),
        }}
      />
    </div>
  );
}

export function ProfileHeader({
  profile,
  layout,
}: {
  profile: TemplateProfile;
  layout: TemplateLayout;
}) {
  const { theme, breakpoint, mode, onSelectProfileCover, onSelectProfileTarget } = useRender();
  const rule = layout.responsive[breakpoint];
  const align = layout.header === "overlap" ? "center" : rule.align;
  const avatarAlign = profile.avatar.align ?? align;
  const banner = profile.banner;
  const fullBleed = banner.enabled && banner.widthMode === "full-bleed";
  const inline = layout.header === "inline";
  const hero = layout.header === "hero";

  // Generalized Profile contextual selection: cover, avatar, bio. Prefers the
  // engine-provided `onSelectProfileTarget` (which performs the Profile context
  // switch before requesting Inspector focus). Falls back to the legacy cover
  // callback / direct Inspector focus request when the engine hook is absent.
  const selectProfileTarget = (target: ProfileTarget) => {
    if (onSelectProfileTarget) {
      onSelectProfileTarget(target);
      return;
    }
    if (target === "profile-cover" && onSelectProfileCover) {
      onSelectProfileCover();
      return;
    }
    requestInspectorFocus(target);
  };

  const avatar = profile.avatarUrl ? (
    <img
      src={profile.avatarUrl}
      alt={`${profile.name} avatar`}
      loading="lazy"
      style={{
        width: profile.avatar.size,
        height: profile.avatar.size,
        borderRadius: profile.avatar.radius,
        objectFit: "cover",
        border: `${profile.avatar.borderWidth}px solid ${theme.colors.background}`,
        boxShadow: profile.avatar.shadow ? "0 12px 30px -14px rgba(0,0,0,.55)" : "none",
        display: "block",
        flexShrink: 0,
      }}
    />
  ) : (
    <div
      aria-hidden
      style={{
        width: profile.avatar.size,
        height: profile.avatar.size,
        borderRadius: profile.avatar.radius,
        background: `linear-gradient(140deg, ${theme.colors.primary}, ${theme.colors.accent})`,
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: profile.avatar.size / 2.6,
        fontFamily: theme.typography.headingFont,
        flexShrink: 0,
      }}
    >
      {profile.name.slice(0, 1)}
    </div>
  );

  const identity = (
    <div style={{ textAlign: inline ? "left" : align, flex: 1, minWidth: 0 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent:
            inline || align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        }}
      >
        <InlineText
          as="h1"
          path="profile.name"
          value={profile.name}
          placeholder="Your name"
          style={headingStyle(theme, hero ? 1 : 0.86)}
        />
        {profile.verified ? (
          <BadgeCheck size={20} aria-label="Verified" style={{ color: theme.colors.accent }} />
        ) : null}
      </div>
      {(profile.role || profile.company) && (
        <div
          style={{
            marginTop: 8,
            fontSize: 14,
            color: theme.colors.mutedText,
            letterSpacing: "0.01em",
          }}
        >
          <InlineText as="span" path="profile.role" value={profile.role ?? ""} placeholder="Role" />
          {profile.company ? ` · ${profile.company}` : ""}
        </div>
      )}
      {profile.description ? (
        <div
          {...(mode === "edit" ? { "data-editor-target": "profile-bio" } : {})}
          onClick={(e) => {
            if (mode !== "edit") return;
            e.stopPropagation();
            selectProfileTarget("profile-bio");
          }}
        >
          <InlineText
            as="p"
            path="profile.description"
            value={profile.description}
            placeholder="Short bio"
            style={{
              margin: "12px auto 0",
              maxWidth: 460,
              marginLeft: inline || align === "left" ? 0 : undefined,
              fontSize: theme.typography.bodySize,
              color: theme.colors.mutedText,
              lineHeight: theme.typography.lineHeight,
              whiteSpace: "pre-wrap",
            }}
          />
        </div>
      ) : null}
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 12,
          fontSize: 12.5,
          color: theme.colors.mutedText,
          justifyContent:
            inline || align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
          flexWrap: "wrap",
        }}
      >
        {profile.username ? <span style={{ opacity: 0.9 }}>@{profile.username}</span> : null}
        {profile.location ? (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <MapPin size={12} aria-hidden /> {profile.location}
          </span>
        ) : null}
      </div>
    </div>
  );

  return (
    <header style={{ position: "relative" }}>
      {banner.enabled && !fullBleed ? <ProfileBanner banner={banner} /> : null}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: inline ? "center" : "stretch",
          flexDirection: inline ? "row" : "column",
          gap: inline ? 16 : 14,
          marginTop: fullBleed
            ? 0
            : banner.enabled && layout.header === "overlap"
              ? -profile.avatar.overlap
              : banner.enabled
                ? 18
                : 0,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              inline || avatarAlign === "left"
                ? "flex-start"
                : avatarAlign === "right"
                  ? "flex-end"
                  : "center",
          }}
        >
          <div
            {...(mode === "edit" ? { "data-editor-target": "profile-avatar" } : {})}
            onClick={(e) => {
              if (mode !== "edit") return;
              e.stopPropagation();
              selectProfileTarget("profile-avatar");
            }}
            style={{ cursor: mode === "edit" ? "pointer" : undefined }}
          >
            {avatar}
          </div>
        </div>
        {identity}
      </div>
    </header>
  );
}
