import React from "react";
import { BadgeCheck, Mail, ArrowRight, Globe, Calendar, ExternalLink } from "lucide-react";
import { useRender, type HeroTextTarget } from "../../engine/RenderContext";
import {
  blockBackgroundGradientStyle,
  cardStyle,
  headingStyle,
  heroCtaButtonStyle,
  imageFitValue,
  imagePositionValue,
} from "../../engine/styleEngine";
import { hexToRgba } from "../../utils";
import type { BadgeContent, TemplateBlock } from "../../types";
import type { CSSProperties } from "react";

function SmartIcon({ name, size = 14 }: { name?: string; size?: number }) {
  if (!name) return null;
  switch (name.toLowerCase()) {
    case "mail":
    case "email":
    case "contact":
      return <Mail size={size} />;
    case "arrowright":
    case "arrow-right":
    case "portfolio":
      return <ArrowRight size={size} />;
    case "globe":
    case "web":
    case "website":
      return <Globe size={size} />;
    case "calendar":
    case "date":
    case "cal":
      return <Calendar size={size} />;
    case "externallink":
    case "external-link":
    default:
      return <ExternalLink size={size} />;
  }
}

export function HeroBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode, breakpoint, onSelectHeroCta, onSelectHeroText, onSelectHeroImage } =
    useRender();

  const content = block.content;
  const variant = block.variant ?? "centered";
  const align = block.layout.align ?? "center";

  // Responsive content and styles
  const avatar = content.avatar ?? {};
  const bannerImage = content.bannerImage ?? {};
  const backgroundImage = content.backgroundImage ?? {};
  const badgeValue: BadgeContent | undefined = content.badge;
  const badge =
    typeof badgeValue === "string" ? { enabled: true, label: badgeValue } : (badgeValue ?? {});
  const primaryCTA = content.primaryCTA ?? {};
  const secondaryCTA = content.secondaryCTA ?? {};

  const minHeight = block.style.minHeight ?? (variant === "full-image" ? 400 : 300);
  const overlay = block.style.overlay ?? {};

  // Avatar styling
  const avatarSize = avatar.size ?? 112;
  const avatarOverlap = avatar.overlap ?? 48;
  const avatarRadius = avatar.radius === "full" ? 9999 : Number(avatar.radius) || 9999;
  const avatarBorderWidth = avatar.borderWidth ?? 4;
  const avatarShadow =
    avatar.shadow === "soft"
      ? "0 4px 12px rgba(0,0,0,0.15)"
      : avatar.shadow === "hard"
        ? "0 12px 30px -14px rgba(0,0,0,0.55)"
        : "none";

  const isSplit = variant === "split";
  const isFullImage = variant === "full-image";
  const isEditorial = variant === "editorial";

  const alignFlex = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  const textAlign = align;

  const bgStyle: React.CSSProperties = {};
  if (backgroundImage.url) {
    bgStyle.backgroundImage = `url(${backgroundImage.url})`;
    bgStyle.backgroundSize = imageFitValue(backgroundImage.fit);
    bgStyle.backgroundPosition = imagePositionValue(backgroundImage.position);
  }

  // Block-level background gradient (distinct from the overlay gradient).
  const gradientBgStyle = blockBackgroundGradientStyle(block.style.backgroundGradient);

  const handleCTA = (url?: string) => {
    if (!url) return;
    if (mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Edit-mode click on a CTA selects the parent Hero (if needed) and requests
  // a one-shot Inspector focus on the CTA controls. Public/preview navigation
  // is untouched.
  const handleCTAClick = (url?: string) => {
    if (mode === "edit" && onSelectHeroCta) {
      onSelectHeroCta(block.id);
      return;
    }
    handleCTA(url);
  };

  // Edit-mode click on a Hero text sub-target (title/subtitle/description/
  // eyebrow) selects the parent Hero (via the studio handler) and requests a
  // one-shot Inspector focus on that field. Also carries a stable editor-only
  // DOM identity (`data-editor-target`) so the Inspector → Canvas direction can
  // reveal the exact element. Public/preview renders neither, so public output
  // is unchanged.
  const heroTextClickProps = (target: HeroTextTarget) => {
    if (mode !== "edit") return {};
    return {
      // The Inspector requests Canvas reveal with the `hero-` prefix
      // (`requestCanvasFocus("hero-title")`), so the Canvas element must carry
      // the same prefixed identity — otherwise the reveal query finds nothing.
      "data-editor-target": `hero-${target}`,
      ...(onSelectHeroText
        ? {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectHeroText(block.id, target);
            },
          }
        : {}),
    };
  };

  // Edit-mode click on the Hero foreground/media image (bannerImage, i.e. the
  // distinct media `<img>` — NOT the background surface, NOT the avatar) selects
  // the parent Hero (via the studio handler) and requests a one-shot Inspector
  // focus on the exact image controls. Carries `data-editor-target="hero-image"`
  // so the Inspector → Canvas direction can reveal the exact element.
  // Public/preview renders neither, so public output is unchanged.
  const heroImageClickProps = () => {
    if (mode !== "edit") return {};
    return {
      "data-editor-target": "hero-image",
      ...(onSelectHeroImage
        ? {
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              onSelectHeroImage(block.id);
            },
          }
        : {}),
    };
  };

  const badgeElem =
    badge.enabled && badge.label ? (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: 9999,
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.03em",
          textTransform: "uppercase",
          backgroundColor: hexToRgba(theme.colors.accent, 0.15),
          color: theme.colors.accent,
          marginBottom: 12,
        }}
      >
        <BadgeCheck size={12} />
        {badge.label}
      </span>
    ) : null;

  const avatarElem = avatar.url ? (
    <img
      src={avatar.url}
      alt="Avatar"
      style={{
        width: avatarSize,
        height: avatarSize,
        borderRadius: avatarRadius,
        borderWidth: avatarBorderWidth,
        borderStyle: "solid",
        borderColor: theme.colors.background,
        boxShadow: avatarShadow,
        objectFit: "cover",
        display: "block",
      }}
    />
  ) : null;

  const ctaDirection = content.ctaDirection ?? "row";
  const ctaFlexDir = breakpoint === "mobile" && ctaDirection === "column" ? "column" : "row";

  const ctasElem =
    primaryCTA.label || secondaryCTA.label ? (
      <div
        {...(mode === "edit" ? { "data-editor-target": "hero-cta" } : {})}
        style={{
          display: "flex",
          flexDirection: ctaFlexDir,
          gap: 12,
          marginTop: 20,
          width: ctaFlexDir === "column" ? "100%" : "auto",
          justifyContent: alignFlex,
        }}
      >
        {primaryCTA.label && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCTAClick(primaryCTA.url);
            }}
            style={{
              ...heroCtaButtonStyle(theme, {
                cta: primaryCTA,
                kind: "primary",
                fullImage: isFullImage,
              }),
              width: ctaFlexDir === "column" ? "100%" : "auto",
            }}
          >
            <SmartIcon name={primaryCTA.icon ?? ""} size={14} />
            {primaryCTA.label}
          </button>
        )}
        {secondaryCTA.label && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCTAClick(secondaryCTA.url);
            }}
            style={{
              ...heroCtaButtonStyle(theme, {
                cta: secondaryCTA,
                kind: "secondary",
                fullImage: isFullImage,
              }),
              width: ctaFlexDir === "column" ? "100%" : "auto",
            }}
          >
            <SmartIcon name={secondaryCTA.icon ?? ""} size={14} />
            {secondaryCTA.label}
          </button>
        )}
      </div>
    ) : null;

  const overlayElem =
    backgroundImage.url || isFullImage ? (
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          borderRadius: block.style.radius ?? theme.cards.radius,
          opacity: overlay.opacity ?? 0.4,
          background:
            overlay.type === "gradient"
              ? `linear-gradient(${overlay.direction === "to-top" ? "0deg" : "180deg"}, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0) 100%)`
              : "rgba(0,0,0,0.6)",
        }}
      />
    ) : null;

  const contentZIndex = { position: "relative" as const, zIndex: 10 };

  const bannerElem =
    bannerImage.url && !isFullImage && !isSplit ? (
      <div
        style={{
          position: "relative",
          height: 160,
          borderRadius: `${block.style.radius ?? theme.cards.radius}px ${block.style.radius ?? theme.cards.radius}px 0 0`,
          overflow: "hidden",
        }}
      >
        <img
          src={bannerImage.url}
          alt=""
          {...heroImageClickProps()}
          style={{
            width: "100%",
            height: "100%",
            objectFit: imageFitValue(bannerImage.fit),
            objectPosition: imagePositionValue(bannerImage.position),
            filter: bannerImage.blur ? `blur(${bannerImage.blur}px)` : undefined,
          }}
        />
      </div>
    ) : null;

  // Render centered variant
  if (variant === "centered") {
    return (
      <div
        style={{
          ...cardStyle(theme, block.style),
          ...gradientBgStyle,
          ...bgStyle,
          position: "relative",
          minHeight,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {overlayElem}
        {bannerElem}
        <div
          style={{
            ...contentZIndex,
            display: "flex",
            flexDirection: "column",
            alignItems: alignFlex,
            padding: block.style.padding ?? 24,
            marginTop: bannerImage.url ? -avatarOverlap : 0,
            textAlign: textAlign as CSSProperties["textAlign"],
          }}
        >
          {avatarElem && <div style={{ marginBottom: 16 }}>{avatarElem}</div>}
          {badgeElem}
          {content.eyebrow && (
            <span
              {...heroTextClickProps("eyebrow")}
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginBottom: 6,
              }}
            >
              {content.eyebrow}
            </span>
          )}
          {content.title && (
            <h1
              {...heroTextClickProps("title")}
              style={{
                ...headingStyle(theme, 1.2),
                color: isFullImage ? "#ffffff" : theme.colors.text,
              }}
            >
              {content.title}
            </h1>
          )}
          {content.subtitle && (
            <p
              {...heroTextClickProps("subtitle")}
              style={{
                fontSize: 16,
                color: isFullImage ? "rgba(255,255,255,0.85)" : theme.colors.text,
                opacity: 0.9,
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {content.subtitle}
            </p>
          )}
          {content.description && (
            <p
              {...heroTextClickProps("description")}
              style={{
                fontSize: 14,
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginTop: 12,
                maxWidth: 500,
                lineHeight: 1.5,
              }}
            >
              {content.description}
            </p>
          )}
          {ctasElem}
        </div>
      </div>
    );
  }

  // Render editorial variant
  if (isEditorial) {
    return (
      <div
        style={{
          ...cardStyle(theme, block.style),
          ...gradientBgStyle,
          ...bgStyle,
          position: "relative",
          minHeight,
          display: "flex",
          flexDirection: "column",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {overlayElem}
        {bannerElem}
        <div
          style={{
            ...contentZIndex,
            display: "flex",
            flexDirection: "column",
            alignItems: alignFlex,
            padding: block.style.padding ?? 32,
            marginTop: bannerImage.url ? -avatarOverlap : 0,
            textAlign: textAlign as CSSProperties["textAlign"],
            borderLeft: `4px solid ${theme.colors.accent}`,
          }}
        >
          {avatarElem && <div style={{ marginBottom: 16 }}>{avatarElem}</div>}
          {badgeElem}
          {content.eyebrow && (
            <span
              {...heroTextClickProps("eyebrow")}
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginBottom: 6,
              }}
            >
              {content.eyebrow}
            </span>
          )}
          {content.title && (
            <h1
              {...heroTextClickProps("title")}
              style={{
                ...headingStyle(theme, 1.3),
                color: isFullImage ? "#ffffff" : theme.colors.text,
              }}
            >
              {content.title}
            </h1>
          )}
          {content.subtitle && (
            <p
              {...heroTextClickProps("subtitle")}
              style={{
                fontSize: 16,
                color: isFullImage ? "rgba(255,255,255,0.85)" : theme.colors.text,
                opacity: 0.9,
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {content.subtitle}
            </p>
          )}
          {content.description && (
            <p
              {...heroTextClickProps("description")}
              style={{
                fontSize: 14,
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              {content.description}
            </p>
          )}
          {ctasElem}
        </div>
      </div>
    );
  }

  // Render split variant
  if (isSplit) {
    const isMobile = breakpoint === "mobile";
    return (
      <div
        style={{
          ...cardStyle(theme, block.style),
          ...gradientBgStyle,
          ...bgStyle,
          position: "relative",
          minHeight,
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          padding: 0,
          overflow: "hidden",
        }}
      >
        {overlayElem}

        {/* Left Side - Text Content */}
        <div
          style={{
            ...contentZIndex,
            flex: 1.2,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: isMobile ? alignFlex : "flex-start",
            padding: block.style.padding ?? 32,
            textAlign: (isMobile ? textAlign : "left") as CSSProperties["textAlign"],
          }}
        >
          {badgeElem}
          {content.eyebrow && (
            <span
              {...heroTextClickProps("eyebrow")}
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginBottom: 6,
              }}
            >
              {content.eyebrow}
            </span>
          )}
          {content.title && (
            <h1
              {...heroTextClickProps("title")}
              style={{
                ...headingStyle(theme, 1.3),
                color: isFullImage ? "#ffffff" : theme.colors.text,
              }}
            >
              {content.title}
            </h1>
          )}
          {content.subtitle && (
            <p
              {...heroTextClickProps("subtitle")}
              style={{
                fontSize: 16,
                color: isFullImage ? "rgba(255,255,255,0.85)" : theme.colors.text,
                opacity: 0.9,
                marginTop: 6,
                fontWeight: 500,
              }}
            >
              {content.subtitle}
            </p>
          )}
          {content.description && (
            <p
              {...heroTextClickProps("description")}
              style={{
                fontSize: 14,
                color: isFullImage ? "rgba(255,255,255,0.7)" : theme.colors.mutedText,
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              {content.description}
            </p>
          )}
          {ctasElem}
        </div>

        {/* Right Side - Visuals (Banner Image + Overlayed Avatar) */}
        <div
          style={{
            ...contentZIndex,
            flex: 1,
            position: "relative",
            minHeight: isMobile ? 180 : "auto",
            backgroundColor: theme.colors.surface,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {bannerImage.url && (
            <img
              src={bannerImage.url}
              alt=""
              {...heroImageClickProps()}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: imageFitValue(bannerImage.fit),
                objectPosition: imagePositionValue(bannerImage.position),
                filter: bannerImage.blur ? `blur(${bannerImage.blur}px)` : undefined,
              }}
            />
          )}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))",
            }}
          />
          {avatarElem && <div style={{ position: "relative", zIndex: 3 }}>{avatarElem}</div>}
        </div>
      </div>
    );
  }

  // Render full-image variant (default fallback)
  return (
    <div
      style={{
        ...cardStyle(theme, block.style),
        ...gradientBgStyle,
        backgroundImage: `url(${backgroundImage.url || bannerImage.url || "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1200"})`,
        backgroundSize: imageFitValue(backgroundImage.url ? backgroundImage.fit : bannerImage.fit),
        backgroundPosition: imagePositionValue(
          backgroundImage.url ? backgroundImage.position : bannerImage.position,
        ),
        position: "relative",
        minHeight,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        padding: 0,
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          borderRadius: block.style.radius ?? theme.cards.radius,
          background: `linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0.15) 100%)`,
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: alignFlex,
          padding: block.style.padding ?? 32,
          textAlign: textAlign as CSSProperties["textAlign"],
        }}
      >
        {avatarElem && <div style={{ marginBottom: 16 }}>{avatarElem}</div>}
        {badgeElem}
        {content.eyebrow && (
          <span
            {...heroTextClickProps("eyebrow")}
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.75)",
              marginBottom: 6,
            }}
          >
            {content.eyebrow}
          </span>
        )}
        {content.title && (
          <h1
            {...heroTextClickProps("title")}
            style={{ ...headingStyle(theme, 1.4), color: "#ffffff" }}
          >
            {content.title}
          </h1>
        )}
        {content.subtitle && (
          <p
            {...heroTextClickProps("subtitle")}
            style={{ fontSize: 16, color: "rgba(255,255,255,0.9)", marginTop: 6, fontWeight: 500 }}
          >
            {content.subtitle}
          </p>
        )}
        {content.description && (
          <p
            {...heroTextClickProps("description")}
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.75)",
              marginTop: 12,
              maxWidth: 500,
              lineHeight: 1.5,
            }}
          >
            {content.description}
          </p>
        )}
        {ctasElem}
      </div>
    </div>
  );
}
