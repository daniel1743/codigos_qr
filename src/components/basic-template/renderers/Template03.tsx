import React from "react";
import { EditableTarget } from "../EditTarget";
import { EDIT_TARGETS, linkEditTarget, type EditTargetRegistry } from "@/types/basic-templates";
import type { StandaloneStyle } from "./standaloneStyle";

/* Template03 — Studio beauty nude/gold con hero lateral y tarjetas de menú */

export type Template03IconType =
  | "calendar"
  | "document"
  | "gallery"
  | "location"
  | "whatsapp"
  | "instagram"
  | "website";

export interface Template03Card {
  id: string;
  icon: Template03IconType;
  title: string;
  description: string;
  url: string;
}

export interface Template03Social {
  type: Template03IconType;
  url: string;
  label?: string;
}

export interface Template03Props {
  studioLabel?: string;
  name: string;
  profession: string;
  description: string;
  heroUrl: string;
  monogram: string;
  cards: Template03Card[];
  socials: Template03Social[];
  footerText: string;
  primaryColor?: string;
  secondaryColor?: string;
  targetRegistry?: EditTargetRegistry | undefined;
  highlightedTarget?: string | null | undefined;
  standaloneStyle?: StandaloneStyle;
}

function Icon({
  type,
  color,
  size = 24,
}: {
  type: Template03IconType;
  color: string;
  size?: number;
}) {
  const s = {
    fill: "none",
    stroke: color,
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (type) {
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="3" {...s} />
          <path d="M8 3v4M16 3v4M3 10h18" {...s} />
        </svg>
      );
    case "document":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path d="M6 3h8l4 4v14H6z" {...s} />
          <path d="M14 3v4h4M9 12h6M9 16h6" {...s} />
        </svg>
      );
    case "gallery":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <rect x="4" y="4" width="16" height="16" rx="2" {...s} />
          <path d="M4 16l4-4 4 4 3-3 5 5" {...s} />
          <circle cx="9" cy="9" r="1.6" {...s} />
        </svg>
      );
    case "location":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z" {...s} />
          <circle cx="12" cy="10" r="2.5" {...s} />
        </svg>
      );
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <path d="M20 12a8 8 0 1 1-3.2-6.4" {...s} />
          <path d="M21 3v5h-5" {...s} />
          <path d="M9 9c0 4 2 6 6 6" {...s} />
        </svg>
      );
    case "instagram":
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="5" {...s} />
          <circle cx="12" cy="12" r="4" {...s} />
          <circle cx="17" cy="7" r="1" fill={color} stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
          <circle cx="12" cy="12" r="9" {...s} />
          <path d="M3 12h18M12 3c3 3.5 3 14 0 18M12 3c-3 3.5-3 14 0 18" {...s} />
        </svg>
      );
  }
}

export default function Template03({
  studioLabel = "STUDIO",
  name,
  profession,
  description,
  heroUrl,
  monogram,
  cards,
  socials,
  footerText,
  primaryColor = "#9c7b43",
  secondaryColor = "#f6efe9",
  targetRegistry,
  highlightedTarget,
  standaloneStyle,
}: Template03Props) {
  const gold = primaryColor;
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
        background: standaloneStyle?.background ?? `linear-gradient(180deg, ${secondaryColor}, #efe4dc)`,
        fontFamily: standaloneStyle?.globalFont ?? "'Segoe UI', Arial, Helvetica, sans-serif",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
      }}
    >
      <div style={{ width: "100%", maxWidth: 460, boxSizing: "border-box" }}>
        {/* Hero: foto a la izquierda + monograma a la derecha */}
        <div style={{ display: "flex", minHeight: 320, background: "#fbf6f2" }}>
          <div style={{ width: "45%", position: "relative" }}>
            <img
              src={heroUrl}
              alt={name}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          </div>
          <div
            style={{
              width: "55%",
              padding: "22px 16px",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: 78,
                height: 100,
                margin: "0 auto",
                border: `1.5px solid ${gold}`,
                borderRadius: "50% / 40%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: gold,
                fontSize: 34,
                fontFamily: "Georgia, serif",
              }}
            >
              {monogram}
            </div>
            <p
              style={{
                margin: "14px 0 0",
                letterSpacing: 5,
                fontSize: 11,
                color: gold,
              }}
            >
              {studioLabel}
            </p>
            <EditableTarget
              id={EDIT_TARGETS.name}
              registry={targetRegistry}
              active={highlightedTarget === EDIT_TARGETS.name}
            >
              <h1
                style={{
                  margin: "4px 0 0",
                  fontFamily: standaloneStyle?.title.fontFamily ?? "Georgia, serif",
                  fontWeight: standaloneStyle?.title.weight ?? 400,
                  fontSize: standaloneStyle?.title.size ?? 26,
                  color: standaloneStyle?.title.color ?? gold,
                  textAlign: standaloneStyle?.title.align ?? "center",
                }}
              >
                {name}
              </h1>
            </EditableTarget>
            <p
              style={{
                margin: "4px 0 0",
                letterSpacing: 3,
                fontSize: 10,
                color: gold,
                textTransform: "uppercase",
              }}
            >
              {profession}
            </p>
            <div
              style={{
                margin: "14px auto",
                height: 1,
                width: "80%",
                background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
              }}
            />
            <EditableTarget
              id={EDIT_TARGETS.bio}
              registry={targetRegistry}
              active={highlightedTarget === EDIT_TARGETS.bio}
            >
              <p
                style={{
                  margin: 0,
                  fontFamily: standaloneStyle?.bio.fontFamily,
                  fontSize: standaloneStyle?.bio.size ?? 13,
                  fontWeight: standaloneStyle?.bio.weight,
                  lineHeight: 1.5,
                  color: standaloneStyle?.bio.color ?? "#6b5a4d",
                  textAlign: standaloneStyle?.bio.align,
                }}
              >
                {description}
              </p>
            </EditableTarget>
            <div
              style={{
                marginTop: 14,
                display: "flex",
                justifyContent: "center",
                gap: 10,
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
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: `1px solid ${gold}44`,
                    background: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    textDecoration: "none",
                  }}
                >
                  <Icon type={s.type} color={gold} size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Tarjetas de menú */}
        <div style={{ padding: "16px 14px 6px", display: "grid", gap: standaloneStyle?.button.spacing ?? 14 }}>
          {cards.map((c) => (
            <EditableTarget
              key={c.id}
              id={linkEditTarget(c.id)}
              registry={targetRegistry}
              active={highlightedTarget === linkEditTarget(c.id)}
            >
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "16px 14px",
                borderRadius: standaloneStyle?.button.radius ?? 18,
                background: standaloneStyle?.button.background ?? "#fffaf6",
                border: buttonBorder,
                boxShadow: "0 6px 16px rgba(150,120,95,.18)",
                textDecoration: "none",
                color: standaloneStyle?.button.textColor ?? "inherit",
                boxSizing: "border-box",
                }}
              >
              <span
                style={{
                  flex: "0 0 auto",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#fff",
                  boxShadow: "inset 0 0 0 1px rgba(156,123,63,.25)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon type={c.icon} color={gold} size={24} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    fontFamily: "Georgia, serif",
                    fontSize: 17,
                    letterSpacing: 0.5,
                    color: standaloneStyle?.button.textColor ?? "#6d5636",
                    textTransform: "uppercase",
                  }}
                >
                  {c.title}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: 12.5,
                    lineHeight: 1.4,
                    color: standaloneStyle?.button.textColor ?? "#8a7768",
                    marginTop: 3,
                  }}
                >
                  {c.description}
                </span>
              </span>
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                <circle
                  cx="12"
                  cy="12"
                  r="11"
                  fill="none"
                  stroke={`${gold}55`}
                />
                <path
                  d="M10 7l5 5-5 5"
                  fill="none"
                  stroke={gold}
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              </a>
            </EditableTarget>
          ))}
        </div>

        {/* Footer conecte-se */}
        {footerText ? (
        <EditableTarget
          id={EDIT_TARGETS.footer}
          registry={targetRegistry}
          active={highlightedTarget === EDIT_TARGETS.footer}
        >
        <div style={{ padding: "22px 16px 28px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              letterSpacing: 4,
              fontSize: 13,
              color: "#7d6647",
              fontFamily: "Georgia, serif",
            }}
          >
            CONECTE-SE
          </p>
          <div
            style={{
              margin: "10px auto",
              height: 1,
              width: 180,
              background: `linear-gradient(90deg, transparent, ${gold}, transparent)`,
            }}
          />
          <div style={{ display: "flex", justifyContent: "center", gap: 22 }}>
            {socials.map((s) => (
              <a
                key={"f" + s.type + s.url}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label || s.type}
                title={s.label || s.type}
                style={{ textDecoration: "none" }}
              >
                <Icon type={s.type} color={gold} size={22} />
              </a>
            ))}
          </div>
          <p style={{ margin: "18px 0 0", fontSize: 11.5, color: "#8a7768" }}>
            {footerText}
          </p>
        </div>
        </EditableTarget>
        ) : null}
      </div>
    </div>
  );
}

