import React from "react";
import { EditableTarget } from "../EditTarget";
import { EDIT_TARGETS, linkEditTarget, type EditTargetRegistry } from "@/types/basic-templates";
import type { StandaloneStyle } from "./standaloneStyle";

/* Template06 — Link-in-bio plateado: banner floral, avatar con aro azul, botones píldora metálicos */

export type Template06SocialType =
  | "youtube"
  | "facebook"
  | "tiktok"
  | "twitter"
  | "instagram"
  | "email"
  | "website";

export interface Template06Social {
  type: Template06SocialType;
  url: string;
  label?: string;
}

export interface Template06Link {
  id: string;
  label: string;
  url: string;
}

export interface Template06Props {
  name: string;
  profession: string;
  description?: string;
  avatarUrl: string;
  bannerUrl: string;
  socials: Template06Social[];
  links: Template06Link[];
  footerText?: string;
  primaryColor?: string;
  targetRegistry?: EditTargetRegistry | undefined;
  highlightedTarget?: string | null | undefined;
  standaloneStyle?: StandaloneStyle;
}

function Icon({ type }: { type: Template06SocialType }) {
  const p = { fill: "#ffffff" };
  const size = 24;
  switch (type) {
    case "youtube":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M22 12s0-3.2-.4-4.7a2.5 2.5 0 0 0-1.8-1.8C18.3 5 12 5 12 5s-6.3 0-7.8.5A2.5 2.5 0 0 0 2.4 7.3C2 8.8 2 12 2 12s0 3.2.4 4.7c.2.9.9 1.6 1.8 1.8C5.7 19 12 19 12 19s6.3 0 7.8-.5a2.5 2.5 0 0 0 1.8-1.8C22 15.2 22 12 22 12zM10 15.2V8.8l5.5 3.2-5.5 3.2z"
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
    case "tiktok":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M16.5 2h-3v13.2a2.6 2.6 0 1 1-2-2.5V9.5a5.9 5.9 0 1 0 5 5.8V9a7.3 7.3 0 0 0 4 1.2V7.3a4.4 4.4 0 0 1-4-4.3V2z"
          />
        </svg>
      );
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path
            {...p}
            d="M3 3h4.3l4.4 5.9L17 3h3.7l-6.7 7.6L21.5 21H17l-4.7-6.3L6.8 21H3l7.2-8.2L3 3zm3.2 1.6l10.7 14.8h1.9L8.1 4.6H6.2z"
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

export default function Template06({
  name,
  profession,
  description,
  avatarUrl,
  bannerUrl,
  socials,
  links,
  footerText,
  primaryColor = "#1c5fd6",
  targetRegistry,
  highlightedTarget,
  standaloneStyle,
}: Template06Props) {
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
        background: standaloneStyle?.background ??
          "linear-gradient(135deg,#c9ccd4 0%,#eceef2 25%,#b9bec7 50%,#f2f3f6 72%,#c3c7cf 100%)",
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
          boxSizing: "border-box",
          paddingBottom: 30,
        }}
      >
        {/* Banner corto + avatar centrado a caballo */}
        <div style={{ position: "relative" }}>
          <img
            src={bannerUrl}
            alt={`${name} banner`}
            style={{
              width: "100%",
              height: 130,
              objectFit: "cover",
              display: "block",
            }}
          />
          <EditableTarget
            id={EDIT_TARGETS.avatar}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.avatar}
            style={{
              position: "absolute",
              left: "50%",
              top: 34,
              transform: "translateX(-50%)",
              width: 130,
              height: 130,
            }}
          >
            <div
              style={{
                width: 130,
                height: 130,
                borderRadius: "50%",
                border: standaloneStyle?.avatarRing.enabled
                  ? `${standaloneStyle.avatarRing.thickness === "thin" ? 2 : standaloneStyle.avatarRing.thickness === "thick" ? 5 : 3}px solid ${standaloneStyle.avatarRing.color || primaryColor}`
                  : `4px solid ${primaryColor}`,
                boxShadow: "0 0 0 5px #ffffff",
                overflow: "hidden",
                boxSizing: "border-box",
                background: "#fff",
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
          </EditableTarget>
        </div>

        <div style={{ textAlign: standaloneStyle?.title.align ?? "center", paddingTop: 66 }}>
          <EditableTarget
            id={EDIT_TARGETS.name}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.name}
          >
            <h1 style={{ margin: 0, fontFamily: standaloneStyle?.title.fontFamily, fontSize: standaloneStyle?.title.size ?? 26, fontWeight: standaloneStyle?.title.weight ?? 700, color: standaloneStyle?.title.color ?? "#111", textAlign: standaloneStyle?.title.align }}>
              {name}
            </h1>
          </EditableTarget>
          <p style={{ margin: "2px 0 0", fontFamily: standaloneStyle?.bio.fontFamily, fontSize: standaloneStyle?.bio.size ?? 16, fontWeight: standaloneStyle?.bio.weight, color: standaloneStyle?.bio.color ?? "#3a3a3a", textAlign: standaloneStyle?.bio.align }}>
            {profession}
          </p>
          {description ? (
            <EditableTarget
              id={EDIT_TARGETS.bio}
              registry={targetRegistry}
              active={highlightedTarget === EDIT_TARGETS.bio}
            >
              <p
                style={{
                  margin: "10px auto 0",
                  maxWidth: 330,
                  fontFamily: standaloneStyle?.bio.fontFamily,
                  fontSize: standaloneStyle?.bio.size ?? 14,
                  fontWeight: standaloneStyle?.bio.weight,
                  color: standaloneStyle?.bio.color ?? "#4f4f4f",
                  textAlign: standaloneStyle?.bio.align ?? "center",
                  lineHeight: 1.45,
                }}
              >
                {description}
              </p>
            </EditableTarget>
          ) : null}

          <EditableTarget
            id={EDIT_TARGETS.socials}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.socials}
          >
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 12,
              padding: "18px 16px 4px",
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
                  width: 48,
                  height: 48,
                  borderRadius: "50%",
                  background: "linear-gradient(180deg,#3b3b3b,#141414)",
                  border: "2px solid #ffffff",
                  boxShadow: "0 6px 14px rgba(0,0,0,.25)",
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
          </EditableTarget>
        </div>

        <div style={{ padding: "26px 18px 0", display: "grid", gap: standaloneStyle?.button.spacing ?? 16 }}>
          {links.map((l) => (
            <EditableTarget
              key={l.id}
              id={linkEditTarget(l.id)}
              registry={targetRegistry}
              active={highlightedTarget === linkEditTarget(l.id)}
            >
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                display: "block",
                textAlign: "center",
                padding: "18px 16px",
                borderRadius: standaloneStyle?.button.radius ?? 999,
                background: standaloneStyle?.button.background ??
                  "linear-gradient(180deg,#f4f5f8 0%,#d9dbe1 45%,#c2c5cd 100%)",
                border: buttonBorder ?? "1px solid rgba(255,255,255,.85)",
                boxShadow:
                  "0 8px 16px rgba(0,0,0,.16), inset 0 1px 0 rgba(255,255,255,.9)",
                color: standaloneStyle?.button.textColor ?? "#111",
                fontWeight: 700,
                fontSize: 17,
                textDecoration: "none",
                boxSizing: "border-box",
                }}
              >
                {l.label}
              </a>
            </EditableTarget>
          ))}
        </div>

        {footerText ? (
          <EditableTarget
            id={EDIT_TARGETS.footer}
            registry={targetRegistry}
            active={highlightedTarget === EDIT_TARGETS.footer}
          >
            <p
              style={{
                margin: "24px 0 0",
                textAlign: "center",
                fontSize: 12,
                color: "#6c6f76",
              }}
            >
              {footerText}
            </p>
          </EditableTarget>
        ) : null}
      </div>
    </div>
  );
}

