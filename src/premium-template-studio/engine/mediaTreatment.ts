import type { CSSProperties } from "react";
import {
  DEFAULT_MEDIA_TREATMENT,
  type AvatarShape,
  type HeroFusionMode,
  type MediaTreatment,
} from "../types";

const OVERLAY_OPACITY: Record<NonNullable<MediaTreatment["overlay"]>, number> = {
  none: 0,
  soft: 0.16,
  medium: 0.3,
  intense: 0.5,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function effectiveNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? clamp(value, min, max) : fallback;
}

/**
 * Render-only safety boundary. The document normalizer is authoritative for
 * persistence, but renderers also receive hand-built configs in tests and
 * preview hosts, so invalid values must never expand the canvas.
 */
export function safeMediaTreatment(value?: MediaTreatment): Required<MediaTreatment> {
  const input = value ?? {};
  return {
    cropX: effectiveNumber(input.cropX, DEFAULT_MEDIA_TREATMENT.cropX, 0, 100),
    cropY: effectiveNumber(input.cropY, DEFAULT_MEDIA_TREATMENT.cropY, 0, 100),
    zoom: effectiveNumber(input.zoom, DEFAULT_MEDIA_TREATMENT.zoom, 0.1, 4),
    overlay:
      input.overlay === "soft" || input.overlay === "medium" || input.overlay === "intense"
        ? input.overlay
        : "none",
    overlayColor:
      typeof input.overlayColor === "string"
        ? input.overlayColor
        : DEFAULT_MEDIA_TREATMENT.overlayColor,
  };
}

export function mediaImageStyle(
  media: MediaTreatment | undefined,
  fit: string | undefined,
  position: string | undefined,
  blur?: number,
): CSSProperties {
  if (!media) return {};
  const treatment = safeMediaTreatment(media);
  const style: CSSProperties = {
    objectFit: fit === "contain" ? "contain" : "cover",
    objectPosition: position ?? "center",
    filter: blur ? `blur(${blur}px)` : undefined,
  };

  // Omitted/default values intentionally add no visual transform. This keeps
  // legacy markup and output stable while allowing canonical values to opt in.
  if (treatment.cropX !== 50 || treatment.cropY !== 50) {
    style.objectPosition = `${treatment.cropX}% ${treatment.cropY}%`;
  }
  if (treatment.zoom !== 1) {
    style.transform = `scale(${treatment.zoom})`;
    style.transformOrigin = "center center";
  }
  return style;
}

export function mediaBackgroundStyle(
  url: string | undefined,
  media: MediaTreatment | undefined,
  fit: string | undefined,
  position: string | undefined,
): CSSProperties {
  const treatment = safeMediaTreatment(media);
  const style: CSSProperties = {
    backgroundImage: url ? `url(${url})` : undefined,
    backgroundSize: fit ?? "cover",
    backgroundPosition: position ?? "center",
  };
  if (treatment.cropX !== 50 || treatment.cropY !== 50) {
    style.backgroundPosition = `${treatment.cropX}% ${treatment.cropY}%`;
  }
  if (treatment.zoom !== 1) {
    style.backgroundSize = `${Math.max(10, treatment.zoom * 100)}%`;
  }
  return style;
}

export function mediaOverlayStyle(media: MediaTreatment | undefined): CSSProperties | undefined {
  const treatment = safeMediaTreatment(media);
  if (treatment.overlay === "none") return undefined;
  return {
    position: "absolute",
    inset: 0,
    backgroundColor: treatment.overlayColor,
    opacity: OVERLAY_OPACITY[treatment.overlay],
    pointerEvents: "none",
    zIndex: 2,
  };
}

export function avatarShapeStyle(
  shape: AvatarShape | undefined,
  legacyRadius: number | string,
): CSSProperties {
  if (!shape) return { borderRadius: legacyRadius };
  switch (shape) {
    case "circle":
      return { borderRadius: 9999 };
    case "rounded":
      return { borderRadius: typeof legacyRadius === "number" ? Math.min(24, legacyRadius) : 24 };
    case "square":
    case "none":
      return { borderRadius: 0 };
    case "arch":
      return { borderRadius: "50% 50% 18% 18% / 45% 45% 22% 22%" };
    default:
      return { borderRadius: legacyRadius };
  }
}

export function heroFusionStyle(
  mode: HeroFusionMode | undefined,
  accent: string,
): CSSProperties | undefined {
  switch (mode) {
    case "halo":
      return { boxShadow: `0 0 0 1px ${accent}33, 0 18px 48px -24px ${accent}99` };
    case "organic":
      return { borderRadius: "32px 18px 32px 18px" };
    case "dominant":
      return { boxShadow: `0 20px 50px -30px ${accent}aa` };
    default:
      return undefined;
  }
}

export function heroFusionOverlayStyle(
  mode: HeroFusionMode | undefined,
  accent: string,
): CSSProperties | undefined {
  if (mode === "fade") {
    return {
      position: "absolute",
      inset: 0,
      zIndex: 2,
      pointerEvents: "none",
      background: `linear-gradient(180deg, transparent 35%, ${accent}66 100%)`,
    };
  }
  return undefined;
}
