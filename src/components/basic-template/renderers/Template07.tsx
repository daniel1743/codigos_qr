import React from "react";
import type { StandaloneStyle } from "./standaloneStyle";

/* Template07 — Link-in-bio fitness dark green: hero, avatar con aro, tarjetas de menú y CTA newsletter */

export type Template07SocialType =
  | "instagram"
  | "tiktok"
  | "youtube"
  | "email"
  | "whatsapp"
  | "website";

export type Template07CardIcon =
  | "dumbbell"
  | "person"
  | "leaf"
  | "gift"
  | "heart"
  | "star";

export interface Template07Social {
  type: Template07SocialType;
  url: string;
  label?: string;
}

export interface Template07Card {
  id: string;
  icon: Template07CardIcon;
  title: string;
  description: string;
  url: string;
  highlight?: boolean;
}

export interface Template07Props {
  name: string;
  profession: string;
  description: string;
  avatarUrl: string;
  backgroundUrl: string;
  verified?: boolean;
  socials: Template07Social[];
  cards: Template07Card[];
  newsletterTitle: string;
  newsletterSubtitle: string;
  newsletterUrl: string;
  newsletterButtonLabel: string;
  footerText: string;
  primaryColor?: string;
  standaloneStyle?: StandaloneStyle;
}

function SocialIcon({ type }: { type: Template07SocialType }) {
  const p = { fill: "#ffffff" };
  const size = 20;
  switch (type) {
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"
          />
        </svg>
      );
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2-2.5V9.5a5.9 5.9 0 1 0 5 5.8V9a7.3 7.3 0 0 0 4 1.2V7.3a4.4 4.4 0 0 1-4-4.3V2z"
          />
        </svg>
      );
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M22 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.5A2.5 2.5 0 0 0 2.4 7.3C2 8.8 2 12 2 12s0 3.2.4 4.7c.2.9.9 1.6 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.5a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12zM10 15.2V8.8l5.5 3.2-5.5 3.2z"
          />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 2a8 8 0 1 1-4.1 14.9l-.3-.2-2.6.7.7-2.6-.2-.3A8 8 0 0 1 12 4zm-3.3 4c-.2 0-.5.1-.7.4-.3.3-.9.9-.9 2.1s.9 2.4 1 2.6c.1.2 1.8 2.9 4.5 3.9 2.2.9 2.7.7 3.2.7.5-.1 1.5-.6 1.7-1.3.2-.6.2-1.2.1-1.3-.1-.1-.3-.2-.6-.3l-1.6-.8c-.2-.1-.4-.1-.6.1l-.8 1c-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.3-1.6-1.5-1.9-.1-.2 0-.4.1-.5l.5-.6c.1-.2.2-.3.3-.5 0-.2 0-.4-.1-.5l-.7-1.6c-.2-.4-.4-.4-.6-.4h-.6z"
          />
        </svg>
      );
    case "email":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M3 5h18c.6 0 1 .4 1 1v12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1zm1 2.2V17h16V7.2l-8 5-8-5zM19.6 7H4.4l7.6 4.7L19.6 7z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm6.9 9h-3a15 15 0 0 0-1.2-5.3A8 8 0 0 1 18.9 11zM12 4.2c.8 1.1 1.6 3.4 1.8 6.8h-3.6c.2-3.4 1-5.7 1.8-6.8zM9.3 5.7A15 15 0 0 0 8.1 11h-3a8 8 0 0 1 4.2-5.3zM5.1 13h3a15 15 0 0 0 1.2 5.3A8 8 0 0 1 5.1 13zm6.9 6.8c-.8-1.1-1.6-3.4-1.8-6.8h3.6c-.2 3.4-1 5.7-1.8 6.8zm2.7-1.5a15 15 0 0 0 1.2-5.3h3a8 8 0 0 1-4.2 5.3z"
          />
        </svg>
      );
  }
}

function CardIcon({ icon, color }: { icon: Template07CardIcon; color: string }) {
  const s = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (icon) {
    case "dumbbell":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" {...s} />
        </svg>
      );
    case "person":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="5" r="2" {...s} />
          <path d="M5 9h14M12 8v6M12 14l-3 6M12 14l3 6" {...s} />
        </svg>
      );
    case "leaf":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M20 4C9 4 4 9 4 15a5 5 0 0 0 5 5c6 0 11-5 11-16z" {...s} />
          <path d="M4 20L14 10" {...s} />
        </svg>
      );
    case "gift":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <rect x="3" y="9" width="18" height="11" rx="2" {...s} />
          <path d="M3 13h18M12 9v11M12 9S9 3 6.5 5.5 12 9 12 9zm0 0s3-6 5.5-3.5S12 9 12 9z" {...s} />
        </svg>
      );
    case "heart":
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z"
            {...s}
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path d="M12 3l2.6 5.6 6 .8-4.4 4.2 1.1 6-5.3-3-5.3 3 1.1-6L3.4 9.4l6-.8L12 3z" {...s} />
        </svg>
      );
  }
}

export default function Template07({
  name,
  profession,
  description,
  avatarUrl,
  backgroundUrl,
  verified = false,
  socials,
  cards,
  newsletterTitle,
  newsletterSubtitle,
  newsletterUrl,
  newsletterButtonLabel,
  footerText,
  primaryColor = "#8ed14f",
  standaloneStyle,
}: Template07Props) {
  const buttonBorder =
    standaloneStyle?.button.borderWidth && standaloneStyle.button.borderColor
      ? `${standaloneStyle.button.borderWidth} solid ${standaloneStyle.button.borderColor}`
      : undefined;
  return (
    <div
      style={{
        ...standaloneStyle?.vars,
        minHeight: "100%",
        width: "100%",
        background: standaloneStyle?.background ?? "#050c05",
        fontFamily: standaloneStyle?.globalFont ?? "'Segoe UI', Arial, Helvetica, sans-serif",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background:
            "radial-gradient(120% 60% at 50% 0%, rgba(142,209,79,.18), rgba(5,12,5,1) 70%)",
          boxSizing: "border-box",
          paddingBottom: 26,
        }}
      >
        {/* Hero con foto de fondo y avatar */}
        <div
          style={{
            position: "relative",
            paddingTop: 26,
            paddingBottom: 12,
            backgroundImage: `linear-gradient(180deg, rgba(5,12,5,.35), rgba(5,12,5,1)), url(${backgroundUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: "50%",
              border: standaloneStyle?.avatarRing.enabled
                ? `${standaloneStyle.avatarRing.thickness === "thin" ? 2 : standaloneStyle.avatarRing.thickness === "thick" ? 5 : 3}px solid ${standaloneStyle.avatarRing.color || primaryColor}`
                : `3px solid ${primaryColor}`,
                overflow: "hidden",
                boxSizing: "border-box",
              }}
            >
              <img
                src={avatarUrl}
                alt={name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            </div>
          </div>

          <div style={{ textAlign: standaloneStyle?.title.align ?? "center", padding: "14px 20px 0" }}>
            <h1
              style={{
                margin: 0,
                fontFamily: standaloneStyle?.title.fontFamily,
                fontSize: standaloneStyle?.title.size ?? 28,
                fontWeight: standaloneStyle?.title.weight ?? 700,
                color: standaloneStyle?.title.color,
                textAlign: standaloneStyle?.title.align,
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              {name}
              {verified ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-label="verificado">
                  <circle cx="12" cy="12" r="10" fill={primaryColor} />
                  <path
                    d="M7.5 12.5l3 3 6-6.5"
                    fill="none"
                    stroke="#0b1a06"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </h1>
            <p
              style={{
                margin: "4px 0 0",
                color: primaryColor,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {profession}
            </p>
            <p
              style={{
                margin: "10px 0 0",
                fontFamily: standaloneStyle?.bio.fontFamily,
                fontSize: standaloneStyle?.bio.size ?? 14.5,
                fontWeight: standaloneStyle?.bio.weight,
                lineHeight: 1.45,
                color: standaloneStyle?.bio.color ?? "#dbe6d6",
                textAlign: standaloneStyle?.bio.align,
              }}
            >
              {description}
            </p>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 12,
              padding: "16px 16px 0",
              flexWrap: "wrap",
            }}
          >
            {socials.map((s) => (
              <a
                key={s.type + s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label || s.type}
                title={s.label || s.type}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,.07)",
                  border: "1px solid rgba(255,255,255,.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                <SocialIcon type={s.type} />
              </a>
            ))}
          </div>
        </div>

        {/* Tarjetas */}
        <div style={{ padding: "6px 14px 0", display: "grid", gap: standaloneStyle?.button.spacing ?? 12 }}>
          {cards.map((c) => (
            <a
              key={c.id}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 14px",
                borderRadius: standaloneStyle?.button.radius ?? 14,
                textDecoration: "none",
                color: standaloneStyle?.button.textColor ?? (c.highlight ? "#0d1a06" : "#fff"),
                background: standaloneStyle?.button.background ?? (c.highlight
                  ? `linear-gradient(90deg, ${primaryColor}, #5fae2f)`
                  : "rgba(255,255,255,.05)"),
                border: buttonBorder ?? (c.highlight
                  ? "none"
                  : "1px solid rgba(255,255,255,.09)"),
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  flex: "0 0 auto",
                  borderRadius: 12,
                  background: c.highlight
                    ? "rgba(0,0,0,.18)"
                    : "rgba(142,209,79,.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CardIcon
                  icon={c.icon}
                  color={c.highlight ? "#0d1a06" : primaryColor}
                />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 700, fontSize: 16 }}>
                  {c.title}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    marginTop: 2,
                    opacity: 0.75,
                  }}
                >
                  {c.description}
                </span>
              </span>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke={c.highlight ? "#0d1a06" : "#c9d6c2"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>

        {/* Newsletter como CTA */}
        <div style={{ padding: "14px 14px 0" }}>
          <div
            style={{
              borderRadius: 16,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.09)",
              padding: "18px 16px",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <p style={{ margin: 0, fontWeight: 700, fontSize: 17 }}>
              {newsletterTitle}
            </p>
            <p
              style={{
                margin: "4px 0 14px",
                fontSize: 13,
                color: "#c8d6c1",
              }}
            >
              {newsletterSubtitle}
            </p>
            <a
              href={newsletterUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                padding: "12px 26px",
                borderRadius: standaloneStyle?.button.radius ?? 10,
                background: standaloneStyle?.button.background ?? `linear-gradient(90deg, ${primaryColor}, #5fae2f)`,
                color: standaloneStyle?.button.textColor ?? "#0d1a06",
                border: buttonBorder,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              {newsletterButtonLabel}
            </a>
          </div>
        </div>

        <p
          style={{
            margin: "20px 0 0",
            textAlign: "center",
            fontSize: 12,
            color: "#8ba184",
          }}
        >
          {footerText}
        </p>
      </div>
    </div>
  );
}

