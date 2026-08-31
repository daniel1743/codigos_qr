import React from "react";
import type { StandaloneStyle } from "./standaloneStyle";

/* Template08 — Link-in-bio dark purple/neon: avatar con aro degradado, redes y tarjetas con icono de color */

export type Template08LinkType =
  | "website"
  | "blog"
  | "twitter"
  | "instagram"
  | "youtube"
  | "email"
  | "github"
  | "linkedin";

export interface Template08Social {
  type: Template08LinkType;
  url: string;
  label?: string;
}

export interface Template08Card {
  id: string;
  type: Template08LinkType;
  title: string;
  subtitle: string;
  url: string;
  highlight?: boolean;
}

export interface Template08Props {
  name: string;
  profession: string;
  description: string;
  avatarUrl: string;
  verified?: boolean;
  socials: Template08Social[];
  cards: Template08Card[];
  footerText: string;
  primaryColor?: string;
  secondaryColor?: string;
  standaloneStyle?: StandaloneStyle;
}

const BRAND: Record<Template08LinkType, string> = {
  website: "linear-gradient(135deg,#ff4d8d,#a13bff)",
  blog: "#3b2f6e",
  twitter: "#1d9bf0",
  instagram: "linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7)",
  youtube: "#ff0000",
  email: "#1eae5b",
  github: "#24292f",
  linkedin: "#0a66c2",
};

function Icon({ type }: { type: Template08LinkType }) {
  const p = { fill: "#ffffff" };
  const size = 20;
  switch (type) {
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M22 5.9c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.7a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.8-.5a4.1 4.1 0 0 0 3.3 4c-.6.2-1.2.2-1.8.1a4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2z"
          />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M7.5 2h9A5.5 5.5 0 0 1 22 7.5v9A5.5 5.5 0 0 1 16.5 22h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2zm0 2A3.5 3.5 0 0 0 4 7.5v9A3.5 3.5 0 0 0 7.5 20h9a3.5 3.5 0 0 0 3.5-3.5v-9A3.5 3.5 0 0 0 16.5 4h-9zM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z"
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
    case "github":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.8c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.7-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"
          />
        </svg>
      );
    case "linkedin":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M4.5 3.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zM3 9h3v12H3V9zm6 0h2.9v1.7h.1c.4-.8 1.5-1.7 3.1-1.7 3.3 0 3.9 2.1 3.9 4.9V21h-3v-5.4c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9V21H9V9z"
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
    case "blog":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path {...p} d="M6 3h8l4 4v14H6V3zm8 1.5V8h3.5L14 4.5zM8 11h8v1.6H8V11zm0 4h8v1.6H8V15z" />
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

export default function Template08({
  name,
  profession,
  description,
  avatarUrl,
  verified = false,
  socials,
  cards,
  footerText,
  primaryColor = "#a13bff",
  secondaryColor = "#ff4d8d",
  standaloneStyle,
}: Template08Props) {
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
        background: standaloneStyle?.background ?? "#0a0a16",
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
          boxSizing: "border-box",
          background: `radial-gradient(90% 40% at 15% 0%, rgba(161,59,255,.35), transparent 60%),
             radial-gradient(90% 40% at 90% 8%, rgba(255,77,141,.28), transparent 60%),
             linear-gradient(180deg,#140f2b 0%, #0a0a16 45%, #07070f 100%)`,
          padding: "26px 14px 26px",
        }}
      >
        {/* Avatar con aro degradado */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              padding: 4,
              boxSizing: "border-box",
              background: standaloneStyle?.avatarRing.enabled
                ? standaloneStyle.avatarRing.color || `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`
                : `linear-gradient(135deg, ${secondaryColor}, ${primaryColor})`,
            }}
          >
            <img
              src={avatarUrl}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                borderRadius: "50%",
                objectFit: "cover",
                display: "block",
                border: "3px solid #0a0a16",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        <div style={{ textAlign: standaloneStyle?.title.align ?? "center", marginTop: 14 }}>
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
                <circle cx="12" cy="12" r="10" fill="#1d9bf0" />
                <path
                  d="M7.5 12.5l3 3 6-6.5"
                  fill="none"
                  stroke="#fff"
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
              color: "#b98cff",
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {profession}
          </p>
          <p
            style={{
              margin: "10px auto 0",
              maxWidth: 330,
              fontFamily: standaloneStyle?.bio.fontFamily,
              fontSize: standaloneStyle?.bio.size ?? 14.5,
              fontWeight: standaloneStyle?.bio.weight,
              lineHeight: 1.45,
              color: standaloneStyle?.bio.color ?? "#d6d3e6",
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
            flexWrap: "wrap",
            gap: 12,
            marginTop: 16,
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
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(255,255,255,.07)",
                border: "1px solid rgba(255,255,255,.12)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textDecoration: "none",
              }}
            >
              <Icon type={s.type} />
            </a>
          ))}
        </div>

        <div style={{ marginTop: 20, display: "grid", gap: standaloneStyle?.button.spacing ?? 12 }}>
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
                padding: "12px 14px",
                borderRadius: standaloneStyle?.button.radius ?? 14,
                textDecoration: "none",
                color: standaloneStyle?.button.textColor ?? "#fff",
                background: standaloneStyle?.button.background ?? (c.highlight
                  ? `linear-gradient(90deg, ${secondaryColor}, ${primaryColor})`
                  : "rgba(255,255,255,.05)"),
                border: buttonBorder ?? (c.highlight
                  ? "none"
                  : "1px solid rgba(255,255,255,.09)"),
                boxSizing: "border-box",
              }}
            >
              <span
                style={{
                  width: 42,
                  height: 42,
                  flex: "0 0 auto",
                  borderRadius: 12,
                  background: BRAND[c.type],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon type={c.type} />
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
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.subtitle}
                </span>
              </span>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke="#cfc9e6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
          ))}
        </div>

        <p
          style={{
            margin: "22px 0 0",
            textAlign: "center",
            fontSize: 12,
            color: "#8f8aa8",
          }}
        >
          {footerText}
        </p>
      </div>
    </div>
  );
}

