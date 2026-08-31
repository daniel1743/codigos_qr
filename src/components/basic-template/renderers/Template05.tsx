import React from "react";
import type { StandaloneStyle } from "./standaloneStyle";

/* Template05 — Link-in-bio verde salvia: banner tropical + avatar en curva + botones blancos */

export type Template05SocialType =
  | "tiktok"
  | "youtube"
  | "twitter"
  | "facebook"
  | "instagram"
  | "pinterest"
  | "email";

export interface Template05Social {
  type: Template05SocialType;
  url: string;
  label?: string;
}

export interface Template05Link {
  id: string;
  label: string;
  url: string;
}

export interface Template05Props {
  name: string;
  profession: string;
  avatarUrl: string;
  bannerUrl: string;
  socials: Template05Social[];
  links: Template05Link[];
  footerText?: string;
  primaryColor?: string;
  secondaryColor?: string;
  standaloneStyle?: StandaloneStyle;
}

function Icon({
  type,
  color,
}: {
  type: Template05SocialType;
  color: string;
}) {
  const p = { fill: color };
  const size = 30;
  switch (type) {
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
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M22 5.9c-.7.3-1.5.6-2.4.7.9-.5 1.5-1.3 1.8-2.3-.8.5-1.7.8-2.6 1a4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.7a4.1 4.1 0 0 0 1.3 5.5c-.7 0-1.3-.2-1.8-.5a4.1 4.1 0 0 0 3.3 4c-.6.2-1.2.2-1.8.1a4.1 4.1 0 0 0 3.8 2.9A8.3 8.3 0 0 1 2 18.4a11.6 11.6 0 0 0 6.3 1.9c7.5 0 11.7-6.3 11.7-11.7v-.5c.8-.6 1.5-1.3 2-2.2z"
          />
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M13.8 22v-9h3l.5-3.5h-3.5V7.3c0-1 .3-1.7 1.8-1.7h1.9V2.4c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2.6H7.3V13h3v9h3.5z"
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
    case "pinterest":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M11.4 2C7 2 4.4 5.2 4.4 8.4c0 1.6.6 3.3 2 3.9.2.1.4 0 .4-.2l.2-.9c.1-.2 0-.3-.1-.5-.4-.5-.6-1.1-.6-1.9 0-2.4 1.8-4.6 4.8-4.6 2.6 0 4.1 1.6 4.1 3.7 0 2.8-1.2 5.1-3.1 5.1-1 0-1.8-.9-1.6-1.9.3-1.3.9-2.6.9-3.5 0-.8-.4-1.5-1.3-1.5-1.1 0-1.9 1.1-1.9 2.5 0 .9.3 1.5.3 1.5l-1.2 5.2c-.3 1.5-.1 3.4 0 3.7 0 .2.3.2.4.1.1-.2 1.6-2 2.1-3.8l.7-2.7c.4.7 1.4 1.3 2.5 1.3 3.3 0 5.5-3 5.5-7C18.5 4.7 15.8 2 11.4 2z"
          />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M3 5h18c.6 0 1 .4 1 1v12c0 .6-.4 1-1 1H3c-.6 0-1-.4-1-1V6c0-.6.4-1 1-1zm1 2.2V17h16V7.2l-8 5-8-5zM19.6 7H4.4l7.6 4.7L19.6 7z"
          />
        </svg>
      );
  }
}

export default function Template05({
  name,
  profession,
  avatarUrl,
  bannerUrl,
  socials,
  links,
  footerText = "MADE WITH LOVE",
  primaryColor = "#b6c6ab",
  secondaryColor = "#111111",
  standaloneStyle,
}: Template05Props) {
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
        background: standaloneStyle?.background ?? primaryColor,
        fontFamily: standaloneStyle?.globalFont ?? "'Segoe UI', Arial, Helvetica, sans-serif",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          background: standaloneStyle?.background ?? primaryColor,
          boxSizing: "border-box",
          paddingBottom: 28,
        }}
      >
        {/* Banner + curva del color de fondo + avatar */}
        <div style={{ position: "relative" }}>
          <img
            src={bannerUrl}
            alt={`${name} banner`}
            style={{
              width: "100%",
              height: 190,
              objectFit: "cover",
              display: "block",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "-12%",
              right: "-12%",
              bottom: -34,
              height: 100,
              background: standaloneStyle?.background ?? primaryColor,
              borderTopLeftRadius: "50% 100%",
              borderTopRightRadius: "50% 100%",
            }}
          />
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: -12,
              transform: "translateX(-50%)",
              width: 138,
              height: 138,
              borderRadius: "50%",
              border: standaloneStyle?.avatarRing.enabled
                ? `${standaloneStyle.avatarRing.thickness === "thin" ? 2 : standaloneStyle.avatarRing.thickness === "thick" ? 5 : 3}px solid ${standaloneStyle.avatarRing.color || "#ffffff"}`
                : "6px solid #ffffff",
              overflow: "hidden",
              boxSizing: "border-box",
              background: standaloneStyle?.background ?? primaryColor,
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

          <div style={{ textAlign: standaloneStyle?.title.align ?? "center", paddingTop: 84 }}>
          <h1
            style={{
              margin: 0,
              fontFamily: standaloneStyle?.title.fontFamily,
              fontSize: standaloneStyle?.title.size ?? 34,
              fontWeight: standaloneStyle?.title.weight ?? 700,
              color: standaloneStyle?.title.color ?? secondaryColor,
              textAlign: standaloneStyle?.title.align,
            }}
          >
            {name}
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: secondaryColor,
            }}
          >
            {profession}
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: 20,
              padding: "18px 16px 8px",
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
                style={{ lineHeight: 0, textDecoration: "none" }}
              >
                <Icon type={s.type} color={secondaryColor} />
              </a>
            ))}
          </div>
        </div>

        <div style={{ padding: "18px 16px 6px", display: "grid", gap: standaloneStyle?.button.spacing ?? 16 }}>
          {links.map((l) => (
            <a
              key={l.id}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                background: standaloneStyle?.button.background ?? "#ffffff",
                color: standaloneStyle?.button.textColor ?? secondaryColor,
                border: buttonBorder,
                borderRadius: standaloneStyle?.button.radius,
                textAlign: "center",
                fontSize: 20,
                fontWeight: 700,
                padding: "22px 14px",
                textDecoration: "none",
                boxSizing: "border-box",
              }}
            >
              {l.label}
            </a>
          ))}
        </div>

        <p
          style={{
            margin: "22px 0 0",
            textAlign: "center",
            fontSize: 12,
            letterSpacing: 2,
            color: "rgba(17,17,17,.45)",
            textTransform: "uppercase",
          }}
        >
          {footerText}
        </p>
      </div>
    </div>
  );
}

