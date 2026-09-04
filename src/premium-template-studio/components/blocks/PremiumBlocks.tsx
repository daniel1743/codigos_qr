import React, { useState } from "react";
import {
  Star,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  Check,
  Mail,
  Phone,
  MessageCircle,
  Calendar,
  Globe,
  ArrowRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  Clock,
  Sparkles,
  Award,
} from "lucide-react";
import { useRender } from "../../engine/RenderContext";
import { cardStyle, headingStyle } from "../../engine/styleEngine";
import { hexToRgba, safeUrl } from "../../utils";
import type { BlockItem, TemplateBlock } from "../../types";

// Dynamic Icon resolver
function SmartIcon({
  name,
  size = 16,
  className,
  style,
}: {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, "");

  const icons: Record<string, React.ElementType> = {
    mail: Mail,
    email: Mail,
    phone: Phone,
    call: Phone,
    whatsapp: MessageCircle,
    chat: MessageCircle,
    calendar: Calendar,
    book: Calendar,
    booking: Calendar,
    globe: Globe,
    website: Globe,
    arrowright: ArrowRight,
    arrow: ArrowRight,
    externallink: ExternalLink,
    link: ExternalLink,
    badgecheck: BadgeCheck,
    verified: BadgeCheck,
    check: Check,
    bookopen: BookOpen,
    help: HelpCircle,
    faq: HelpCircle,
    clock: Clock,
    time: Clock,
    sparkles: Sparkles,
    premium: Sparkles,
    award: Award,
    star: Star,
  };

  const IconCmp = icons[normalized];
  if (!IconCmp) return <ExternalLink size={size} className={className} style={style} />;
  return React.createElement(IconCmp, { size, className, style });
}

/* ------------------------------------------------------------------ */
/* 1. Stats Block                                                     */
/* ------------------------------------------------------------------ */
export function StatsBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "minimal";

  const getStyleForStatCard = (): React.CSSProperties => {
    if (variant === "cards") {
      return cardStyle(theme, block.style);
    }
    if (variant === "glass") {
      const cards = theme.cards;
      return {
        borderRadius: block.style.radius ?? cards.radius,
        border: "1px solid rgba(255, 255, 255, 0.12)",
        background: "rgba(255, 255, 255, 0.08)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        padding: "16px",
        color: theme.colors.text,
      };
    }
    if (variant === "highlight") {
      return {
        ...cardStyle(theme, block.style),
        borderColor: theme.colors.accent,
        borderWidth: 2,
        boxShadow: `0 8px 30px ${hexToRgba(theme.colors.accent, 0.15)}`,
      };
    }
    return {
      padding: "12px",
      textAlign: "center",
    };
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit, minmax(120px, 1fr))`,
        gap: 12,
        width: "100%",
      }}
    >
      {items.map((item: BlockItem, idx: number) => (
        <div
          key={item.id ?? idx}
          style={{
            ...getStyleForStatCard(),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {item.icon && (
            <div style={{ color: theme.colors.accent, marginBottom: 6 }}>
              <SmartIcon name={item.icon} size={20} />
            </div>
          )}
          <span
            style={{
              fontSize: variant === "highlight" && idx === 0 ? "32px" : "26px",
              fontWeight: 800,
              color: theme.colors.text,
              fontFamily: theme.typography.headingFont,
              lineHeight: 1.1,
            }}
          >
            {item.value}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: theme.colors.mutedText,
              marginTop: 4,
            }}
          >
            {item.label}
          </span>
          {item.helperText && (
            <span
              style={{
                fontSize: "10px",
                color: theme.colors.mutedText,
                opacity: 0.8,
                marginTop: 2,
              }}
            >
              {item.helperText}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Services Block                                                   */
/* ------------------------------------------------------------------ */
export function ServicesBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "cards";

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ display: "grid", gap: 14, width: "100%" }}>
      {items.map((item: BlockItem, idx: number) => {
        const hasImage = variant === "image" && item.imageUrl;
        const isCompact = variant === "compact";

        return (
          <div
            key={item.id ?? idx}
            style={{
              ...cardStyle(
                theme,
                variant === "minimal"
                  ? { background: "transparent", borderWidth: 0, shadow: "none" }
                  : block.style,
              ),
              display: "flex",
              flexDirection: isCompact ? "row" : "column",
              alignItems: isCompact ? "center" : "stretch",
              padding: isCompact ? "12px 16px" : "20px",
              gap: 14,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {hasImage && (
              <div style={{ height: 140, margin: "-20px -20px 14px", overflow: "hidden" }}>
                <img
                  src={item.imageUrl}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
              {item.icon && !hasImage && (
                <div
                  style={{
                    padding: 8,
                    borderRadius: 10,
                    backgroundColor: hexToRgba(theme.colors.accent, 0.12),
                    color: theme.colors.accent,
                    flexShrink: 0,
                  }}
                >
                  <SmartIcon name={item.icon} size={18} />
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "15px" }}>{item.title}</h3>
                  {item.price && (
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: theme.colors.accent,
                        flexShrink: 0,
                      }}
                    >
                      {item.price}
                    </span>
                  )}
                </div>
                {!isCompact && item.description && (
                  <p
                    style={{
                      fontSize: "13px",
                      color: theme.colors.mutedText,
                      marginTop: 6,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </div>

            {item.ctaLabel && item.ctaUrl && (
              <button
                onClick={() => handleCTA(item.ctaUrl)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  padding: isCompact ? "6px 12px" : "8px 16px",
                  borderRadius: theme.buttons.radius,
                  backgroundColor: theme.colors.primary,
                  color: "#ffffff",
                  fontSize: "13px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  marginTop: isCompact ? 0 : 10,
                  alignSelf: isCompact ? "center" : "flex-start",
                }}
              >
                {item.ctaLabel}
                <ArrowRight size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Testimonials Block                                               */
/* ------------------------------------------------------------------ */
export function TestimonialsBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "cards";

  return (
    <div style={{ display: "grid", gap: 14, width: "100%" }}>
      {items.map((item: BlockItem, idx: number) => {
        const isQuote = variant === "quote";
        const isCompact = variant === "compact";
        const rating = item.rating ?? 0;

        return (
          <div
            key={item.id ?? idx}
            style={{
              ...cardStyle(
                theme,
                isQuote
                  ? { background: "transparent", borderWidth: 0, shadow: "none" }
                  : block.style,
              ),
              padding: isCompact ? "12px 16px" : "20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
              borderLeft: isQuote ? `3px solid ${theme.colors.accent}` : undefined,
            }}
          >
            {rating > 0 && (
              <div style={{ display: "flex", gap: 2, color: "#ffb703" }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    fill={i < rating ? "#ffb703" : "none"}
                    stroke={i < rating ? "none" : "#ffb703"}
                  />
                ))}
              </div>
            )}

            <p
              style={{
                fontSize: isQuote ? "15px" : "13.5px",
                fontStyle: isQuote ? "italic" : "normal",
                color: theme.colors.text,
                lineHeight: 1.5,
              }}
            >
              "{item.quote}"
            </p>

            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4 }}>
              {item.avatarUrl ? (
                <img
                  src={item.avatarUrl}
                  alt={item.name}
                  style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    backgroundColor: hexToRgba(theme.colors.accent, 0.15),
                    color: theme.colors.accent,
                    display: "grid",
                    placeItems: "center",
                    fontWeight: 700,
                    fontSize: "12px",
                  }}
                >
                  {item.name?.slice(0, 1) || "R"}
                </div>
              )}
              <div>
                <h4 style={{ fontSize: "13px", fontWeight: 700, color: theme.colors.text }}>
                  {item.name}
                </h4>
                {(item.role || item.source) && (
                  <span style={{ fontSize: "11px", color: theme.colors.mutedText }}>
                    {item.role}
                    {item.source ? ` · ${item.source}` : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Pricing Block                                                    */
/* ------------------------------------------------------------------ */
export function PricingBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "cards";

  const handleCTA = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: items.length > 1 ? `repeat(auto-fit, minmax(220px, 1fr))` : "1fr",
        gap: 16,
        width: "100%",
      }}
    >
      {items.map((item: BlockItem, idx: number) => {
        const isRec = item.recommended;
        const isCompact = variant === "compact";

        return (
          <div
            key={item.id ?? idx}
            style={{
              ...cardStyle(theme, block.style),
              borderColor: isRec ? theme.colors.accent : undefined,
              borderWidth: isRec ? 2 : 1,
              transform: isRec ? "scale(1.02)" : "none",
              boxShadow: isRec ? `0 12px 30px ${hexToRgba(theme.colors.accent, 0.12)}` : undefined,
              padding: isCompact ? "16px" : "24px",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {isRec && (
              <span
                style={{
                  position: "absolute",
                  top: 12,
                  right: 12,
                  fontSize: "9px",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  borderRadius: 999,
                  backgroundColor: theme.colors.accent,
                  color: "#ffffff",
                }}
              >
                Popular
              </span>
            )}

            <h3 style={{ ...headingStyle(theme, 0.8), fontSize: "16px" }}>{item.title}</h3>

            <div style={{ display: "flex", alignItems: "baseline", gap: 4, margin: "14px 0" }}>
              <span style={{ fontSize: "28px", fontWeight: 800, color: theme.colors.text }}>
                {item.price}
              </span>
              {item.period && (
                <span style={{ fontSize: "12px", color: theme.colors.mutedText }}>
                  /{item.period}
                </span>
              )}
            </div>

            {item.description && (
              <p
                style={{
                  fontSize: "12px",
                  color: theme.colors.mutedText,
                  marginBottom: 16,
                  lineHeight: 1.4,
                }}
              >
                {item.description}
              </p>
            )}

            {item.features && item.features.length > 0 && (
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: "0 0 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flex: 1,
                }}
              >
                {item.features.map((feat: string, i: number) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: "12px",
                      color: theme.colors.text,
                    }}
                  >
                    <Check size={14} style={{ color: theme.colors.accent, flexShrink: 0 }} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            )}

            {item.ctaLabel && (
              <button
                onClick={() => handleCTA(item.ctaUrl)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: theme.buttons.radius,
                  backgroundColor: isRec ? theme.colors.accent : theme.colors.primary,
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "13px",
                  border: "none",
                  cursor: "pointer",
                  marginTop: "auto",
                }}
              >
                {item.ctaLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 5. FAQ Block                                                       */
/* ------------------------------------------------------------------ */
export function FAQBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  const behavior = block.content.behavior ?? {};
  const allowMultipleOpen = behavior.allowMultipleOpen ?? false;

  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggleFAQ = (id: string) => {
    if (openIds.includes(id)) {
      setOpenIds(openIds.filter((oId) => oId !== id));
    } else {
      if (allowMultipleOpen) {
        setOpenIds([...openIds, id]);
      } else {
        setOpenIds([id]);
      }
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {items.map((item: BlockItem, idx: number) => {
        const itemId = item.id ?? String(idx);
        const isOpen = openIds.includes(itemId);

        return (
          <div
            key={itemId}
            style={{
              ...cardStyle(theme, block.style),
              padding: "14px 16px",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            <div
              role="button"
              tabIndex={0}
              aria-expanded={isOpen}
              onClick={() => toggleFAQ(itemId)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleFAQ(itemId);
                }
              }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                gap: 12,
                userSelect: "none",
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 600, color: theme.colors.text }}>
                {item.question}
              </span>
              <div style={{ color: theme.colors.mutedText, flexShrink: 0 }}>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>
            </div>
            {isOpen && (
              <div
                style={{
                  marginTop: 10,
                  fontSize: "13px",
                  color: theme.colors.mutedText,
                  lineHeight: 1.5,
                  borderTop: `1px solid ${hexToRgba(theme.colors.border, 0.5)}`,
                  paddingTop: 10,
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6. Timeline Block                                                   */
/* ------------------------------------------------------------------ */
export function TimelineBlock({ block }: { block: TemplateBlock }) {
  const { theme } = useRender();
  const items = block.content.items ?? [];
  const variant = block.variant ?? "minimal";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        paddingLeft: 20,
        width: "100%",
      }}
    >
      {/* Central line */}
      <div
        style={{
          position: "absolute",
          top: 8,
          bottom: 8,
          left: 6,
          width: 2,
          backgroundColor: theme.colors.border,
        }}
      />

      {items.map((item: BlockItem, idx: number) => {
        const isCard = variant === "cards";
        return (
          <div
            key={item.id ?? idx}
            style={{
              position: "relative",
              marginBottom: idx === items.length - 1 ? 0 : 20,
            }}
          >
            {/* Dot */}
            <div
              style={{
                position: "absolute",
                left: -20,
                top: 4,
                width: 14,
                height: 14,
                borderRadius: "50%",
                backgroundColor: theme.colors.background,
                border: `3px solid ${theme.colors.accent}`,
                display: "grid",
                placeItems: "center",
                boxShadow: `0 0 0 4px ${hexToRgba(theme.colors.accent, 0.1)}`,
                zIndex: 2,
              }}
            />

            <div style={isCard ? { ...cardStyle(theme, block.style), padding: "14px" } : undefined}>
              {item.date && (
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    color: theme.colors.accent,
                    textTransform: "uppercase",
                    letterSpacing: "0.03em",
                  }}
                >
                  {item.date}
                </span>
              )}
              <h3 style={{ ...headingStyle(theme, 0.75), fontSize: "14px", marginTop: 2 }}>
                {item.title}
              </h3>
              {item.description && (
                <p
                  style={{
                    fontSize: "12.5px",
                    color: theme.colors.mutedText,
                    marginTop: 6,
                    lineHeight: 1.4,
                  }}
                >
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7. Featured Media Block                                             */
/* ------------------------------------------------------------------ */
export function FeaturedMediaBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const c = block.content;
  const variant = block.variant ?? "card";
  const isVideo = c.mediaType === "video";

  const handleCTA = () => {
    if (!c.ctaUrl || mode === "edit") return;
    window.open(c.ctaUrl, "_blank", "noopener,noreferrer");
  };

  const videoUrl =
    isVideo && c.videoId
      ? c.videoProvider === "youtube"
        ? `https://www.youtube.com/embed/${c.videoId}`
        : `https://player.vimeo.com/video/${c.videoId}`
      : null;

  const mediaElem = (
    <div
      style={{
        position: "relative",
        width: "100%",
        overflow: "hidden",
        borderRadius:
          variant === "card" ? `${theme.cards.radius}px ${theme.cards.radius}px 0 0` : 8,
      }}
    >
      {isVideo && videoUrl ? (
        <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
          <iframe
            src={videoUrl}
            title={c.title || "Featured Video"}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }}
          />
        </div>
      ) : c.imageUrl ? (
        <img
          src={c.imageUrl}
          alt={c.title ?? ""}
          style={{ width: "100%", height: "auto", display: "block", objectFit: "cover" }}
        />
      ) : (
        <div
          style={{
            height: 160,
            backgroundColor: theme.colors.surface,
            display: "grid",
            placeItems: "center",
            color: theme.colors.mutedText,
          }}
        >
          No Media Added
        </div>
      )}
    </div>
  );

  const textElem = (
    <div
      style={{
        padding: variant === "card" ? 18 : 0,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {c.title && <h3 style={headingStyle(theme, 0.85)}>{c.title}</h3>}
      {c.description && (
        <p style={{ fontSize: "13px", color: theme.colors.mutedText, lineHeight: 1.4 }}>
          {c.description}
        </p>
      )}
      {c.ctaLabel && c.ctaUrl && (
        <button
          onClick={handleCTA}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "8px 16px",
            borderRadius: theme.buttons.radius,
            backgroundColor: theme.colors.primary,
            color: "#ffffff",
            fontSize: "13px",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            alignSelf: "flex-start",
            marginTop: 6,
          }}
        >
          {c.ctaLabel}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );

  if (variant === "split") {
    return (
      <div
        style={{
          ...cardStyle(theme, block.style),
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>{mediaElem}</div>
        <div style={{ flex: "1.2 1 240px" }}>{textElem}</div>
      </div>
    );
  }

  return (
    <div
      style={
        variant === "card"
          ? { ...cardStyle(theme, block.style), padding: 0, overflow: "hidden" }
          : undefined
      }
    >
      {mediaElem}
      {textElem}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8. Floating Actions Block                                           */
/* ------------------------------------------------------------------ */
export function FloatingActionsBlock({ block }: { block: TemplateBlock }) {
  const { theme, mode } = useRender();
  const items = block.content.items ?? [];

  const handleAction = (url?: string) => {
    if (!url || mode === "edit") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      {items.map((item: BlockItem, idx: number) => (
        <button
          key={item.id ?? idx}
          onClick={() => handleAction(item.url)}
          title={item.label}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            width: 44,
            height: 44,
            borderRadius: "50%",
            backgroundColor: theme.colors.primary,
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            transition: "transform 0.16s ease, background-color 0.16s ease",
          }}
        >
          <SmartIcon name={item.icon ?? ""} size={18} />
        </button>
      ))}
    </div>
  );
}
