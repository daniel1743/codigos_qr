import { BadgeCheck, MapPin } from "lucide-react";
import { useRender } from "../../engine/RenderContext";
import { headingStyle } from "../../engine/styleEngine";
import { hexToRgba } from "../../utils";
import type { TemplateLayout, TemplateProfile } from "../../types";
import { InlineText } from "../blocks/primitives";

/**
 * The profile header is layout-aware: the same data composes very differently
 * depending on `layout.header` — no duplicated template components.
 */
export function ProfileHeader({
  profile,
  layout,
}: {
  profile: TemplateProfile;
  layout: TemplateLayout;
}) {
  const { theme, breakpoint } = useRender();
  const rule = layout.responsive[breakpoint];
  const align = layout.header === "overlap" ? "center" : rule.align;
  const avatarAlign = profile.avatar.align ?? align;
  const banner = profile.banner;
  const bannerHeight = breakpoint === "mobile" ? banner.mobileHeight : banner.height;
  const inline = layout.header === "inline";
  const hero = layout.header === "hero";

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
      {banner.enabled ? (
        <div
          style={{
            position: "relative",
            height: bannerHeight,
            borderRadius: banner.radius,
            overflow: "hidden",
            backgroundColor: theme.colors.surface,
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
      ) : null}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          alignItems: inline ? "center" : "stretch",
          flexDirection: inline ? "row" : "column",
          gap: inline ? 16 : 14,
          marginTop:
            banner.enabled && layout.header === "overlap"
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
          {avatar}
        </div>
        {identity}
      </div>
    </header>
  );
}
