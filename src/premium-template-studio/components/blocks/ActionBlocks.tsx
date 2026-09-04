import {
  ArrowUpRight,
  Dribbble,
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Mail,
  Music2,
  Twitch,
  Twitter,
  Youtube,
} from "lucide-react";
import type { ComponentType } from "react";
import { useRender } from "../../engine/RenderContext";
import { buttonStyle, cardStyle, headingStyle } from "../../engine/styleEngine";
import { hexToRgba, prettyUrl, readableOn } from "../../utils";
import type { TemplateBlock } from "../../types";
import { BlockTitle, EmptyBlockState, InlineText, SmartLink } from "./primitives";
import type { BlockProps } from "./ContentBlocks";

export const SOCIAL_ICONS: Record<
  string,
  ComponentType<{ size?: number; "aria-hidden"?: boolean }>
> = {
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  x: Twitter,
  github: Github,
  facebook: Facebook,
  twitch: Twitch,
  tiktok: Music2,
  dribbble: Dribbble,
  email: Mail,
  website: Globe,
};

export const SOCIAL_PLATFORMS = Object.keys(SOCIAL_ICONS);

export function LinksBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant;

  if (items.length === 0)
    return <EmptyBlockState label="No links yet. Add your first link from the inspector." />;

  return (
    <div style={{ display: "grid", gap: block.layout.gap ?? theme.spacing.block }}>
      <BlockTitle title={block.content.title} path={`blocks.${block.id}.content.title`} />
      {items.map((item) => {
        const href = item.url ?? "#";
        const label = item.label ?? "Link";
        const presentation = item.presentation ?? (variant === "cards" ? "card" : "button");

        if (presentation === "media-card") {
          const mediaLeft = item.mediaPosition !== "right";
          const hasImage = Boolean(item.imageUrl);
          return (
            <SmartLink
              key={item.id}
              href={href}
              block={block}
              newTab={item.newTab}
              ariaLabel={label}
              style={{ display: "block", minWidth: 0 }}
            >
              <article
                className="pts-hoverable"
                data-media-position={hasImage ? (mediaLeft ? "left" : "right") : "none"}
                style={{
                  ...cardStyle(theme, block.style),
                  padding: 0,
                  overflow: "hidden",
                  display: "grid",
                  gridTemplateColumns: hasImage ? (mediaLeft ? "3fr 1fr" : "1fr 3fr") : "1fr",
                  minWidth: 0,
                }}
              >
                {hasImage ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      width: "100%",
                      height: "100%",
                      minHeight: 96,
                      objectFit: "cover",
                      order: mediaLeft ? 0 : 1,
                    }}
                  />
                ) : null}
                <span
                  style={{
                    minWidth: 0,
                    padding: theme.cards.padding,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    order: mediaLeft ? 1 : 0,
                  }}
                >
                  <span style={{ display: "block", fontWeight: 650, fontSize: 15 }}>
                    {label}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: theme.colors.mutedText }}>
                    {item.description || prettyUrl(href)}
                  </span>
                </span>
              </article>
            </SmartLink>
          );
        }

        if (presentation === "card") {
          return (
            <SmartLink
              key={item.id}
              href={href}
              block={block}
              newTab={item.newTab}
              ariaLabel={label}
            >
              <div
                style={{
                  ...cardStyle(theme, block.style),
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                }}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    style={{
                      width: 46,
                      height: 46,
                      borderRadius: 12,
                      objectFit: "cover",
                      flexShrink: 0,
                    }}
                  />
                ) : null}
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 15 }}>
                    {item.label}
                  </span>
                  <span style={{ display: "block", fontSize: 12.5, color: theme.colors.mutedText }}>
                    {item.description || prettyUrl(href)}
                  </span>
                </span>
                <ArrowUpRight size={16} aria-hidden style={{ color: theme.colors.mutedText }} />
              </div>
            </SmartLink>
          );
        }
        if (variant === "list" && !item.presentation) {
          return (
            <SmartLink
              key={item.id}
              href={href}
              block={block}
              newTab={item.newTab}
              ariaLabel={label}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}
              >
                <span style={{ fontSize: 15 }}>{label}</span>
                <ArrowUpRight size={15} aria-hidden style={{ color: theme.colors.mutedText }} />
              </div>
            </SmartLink>
          );
        }
        const glass = variant === "glass";
        return (
          <SmartLink
            key={item.id}
            href={href}
            block={block}
            newTab={item.newTab}
            ariaLabel={label}
          >
            <div
              className="pts-hoverable"
              style={{
                ...buttonStyle(theme, block.style),
                ...(glass
                  ? {
                      backgroundColor: hexToRgba(theme.colors.text, 0.07),
                      color: theme.colors.text,
                      borderColor: hexToRgba(theme.colors.text, 0.12),
                      backdropFilter: "blur(12px)",
                    }
                  : {}),
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontWeight: theme.buttons.fontWeight, fontSize: 15 }}>
                {label}
              </span>
              <ArrowUpRight size={16} aria-hidden style={{ opacity: 0.65 }} />
            </div>
          </SmartLink>
        );
      })}
    </div>
  );
}

export function FeaturedLinkBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const side = block.variant === "side";
  const banner = block.variant === "banner";

  return (
    <SmartLink href={block.content.url} block={block} ariaLabel={block.content.title}>
      <article
        className="pts-hoverable"
        style={{
          ...cardStyle(theme, block.style),
          padding: 0,
          overflow: "hidden",
          display: side ? "flex" : "block",
          alignItems: "stretch",
        }}
      >
        {block.content.imageUrl ? (
          <img
            src={block.content.imageUrl}
            alt=""
            loading="lazy"
            style={{
              width: side ? 130 : "100%",
              height: side ? "auto" : banner ? 120 : 190,
              objectFit: "cover",
              flexShrink: 0,
              display: "block",
            }}
          />
        ) : null}
        <div style={{ padding: theme.cards.padding, flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: theme.colors.accent,
              fontWeight: 600,
            }}
          >
            {block.content.subtitle}
          </div>
          <InlineText
            as="h3"
            path={`blocks.${block.id}.content.title`}
            value={block.content.title ?? ""}
            placeholder="Featured"
            style={{ ...headingStyle(theme, 0.55), marginTop: 6 }}
          />
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginTop: 12,
              color: theme.colors.mutedText,
              fontSize: 13,
            }}
          >
            {prettyUrl(block.content.url)}
            <ArrowUpRight size={14} aria-hidden />
          </div>
        </div>
      </article>
    </SmartLink>
  );
}

export function ButtonGroupBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  if (items.length === 0) return <EmptyBlockState label="No buttons yet." />;

  if (items.some((item) => item.presentation === "card" || item.presentation === "media-card")) {
    return <LinksBlock block={{ ...block, type: "links", variant: "stacked" }} />;
  }

  const columns = Math.max(1, Math.min(2, Math.round(block.layout.columns ?? 2)));
  return (
    <div
      data-button-columns={columns}
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: 10,
        width: "100%",
        minWidth: 0,
      }}
    >
      {items.map((item, index) => {
        const primary = index === 0;
        const style = buttonStyle(theme, block.style);
        return (
          <SmartLink
            key={item.id}
            href={item.url}
            block={block}
            newTab={item.newTab}
            ariaLabel={item.label}
            style={{ display: "block", minWidth: 0, width: "100%" }}
          >
            <div
              className="pts-hoverable"
              style={{
                ...style,
                minHeight: theme.buttons.height - 4,
                justifyContent: "center",
                ...(primary
                  ? {}
                  : {
                      backgroundColor: "transparent",
                      backgroundImage: "none",
                      color: theme.colors.text,
                      borderColor: theme.colors.border,
                      borderWidth: 1,
                      boxShadow: "none",
                    }),
              }}
            >
              {item.label ?? "Button"}
            </div>
          </SmartLink>
        );
      })}
    </div>
  );
}

export function CTABlock({ block }: BlockProps) {
  const { theme } = useRender();
  const gradient = block.variant === "gradient";
  const inline = block.variant === "inline";
  const surface = gradient
    ? {
        backgroundImage: `linear-gradient(120deg, ${theme.colors.primary}, ${theme.colors.accent})`,
        color: readableOn(theme.colors.primary),
        border: "none",
      }
    : {};
  return (
    <section
      style={{
        ...cardStyle(theme, block.style),
        ...surface,
        display: inline ? "flex" : "block",
        alignItems: "center",
        gap: 16,
        textAlign: inline ? "left" : (block.layout.align ?? "center"),
      }}
    >
      <div style={{ flex: 1 }}>
        <InlineText
          as="h3"
          path={`blocks.${block.id}.content.title`}
          value={block.content.title ?? ""}
          placeholder="Call to action"
          style={{
            ...headingStyle(theme, 0.58),
            color: gradient ? readableOn(theme.colors.primary) : theme.colors.text,
          }}
        />
        {block.content.body ? (
          <InlineText
            as="p"
            path={`blocks.${block.id}.content.body`}
            value={block.content.body}
            style={{
              margin: "8px 0 0",
              fontSize: theme.typography.bodySize,
              color: gradient
                ? hexToRgba(readableOn(theme.colors.primary), 0.85)
                : theme.colors.mutedText,
            }}
          />
        ) : null}
      </div>
      <SmartLink
        href={block.content.url}
        block={block}
        ariaLabel={block.content.label}
        style={{ display: "block", marginTop: inline ? 0 : 16, width: inline ? "auto" : "100%" }}
      >
        <div
          className="pts-hoverable"
          style={{
            ...buttonStyle(theme, block.style),
            justifyContent: "center",
            width: inline ? "auto" : "100%",
            minWidth: inline ? 150 : undefined,
            ...(gradient
              ? {
                  backgroundImage: "none",
                  backgroundColor: readableOn(theme.colors.primary),
                  color: theme.colors.primary,
                }
              : {}),
          }}
        >
          {block.content.label || "Get in touch"}
        </div>
      </SmartLink>
    </section>
  );
}

export function SocialBlock({ block }: BlockProps) {
  const { theme } = useRender();
  const socials = block.content.socials ?? [];
  if (socials.length === 0) return <EmptyBlockState label="No social profiles yet." />;
  const pills = block.variant === "pills";
  const outline = block.variant === "outline";
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        justifyContent: block.layout.align === "left" ? "flex-start" : "center",
      }}
    >
      {socials.map((social) => {
        const Icon = SOCIAL_ICONS[social.platform] ?? Globe;
        return (
          <SmartLink key={social.id} href={social.url} block={block} ariaLabel={social.platform}>
            <span
              className="pts-hoverable"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                height: 44,
                padding: pills ? "0 16px" : 0,
                width: pills ? undefined : 44,
                justifyContent: "center",
                borderRadius: pills ? 999 : theme.cards.radius,
                border:
                  outline || pills ? `1px solid ${theme.colors.border}` : "1px solid transparent",
                background: outline ? "transparent" : hexToRgba(theme.colors.text, 0.06),
                color: theme.colors.text,
              }}
            >
              <Icon size={18} aria-hidden />
              {pills ? (
                <span style={{ fontSize: 13, textTransform: "capitalize" }}>{social.platform}</span>
              ) : null}
            </span>
          </SmartLink>
        );
      })}
    </div>
  );
}
