import type { CSSProperties } from "react";
import type { BlockItem, CardLayout, CardVisualPreset, TemplateBlock } from "../types";

/** Legacy-safe card layout resolution. New values are always opt-in. */
export function resolveCardLayout(item: BlockItem, block: TemplateBlock): CardLayout {
  if (item.cardLayout) return item.cardLayout;
  if (block.variant === "minimal" || block.variant === "compact") return "compact";
  if (block.variant === "featured" || block.variant === "catalog-premium-card-v1") {
    return "highlight";
  }
  if (block.variant === "image-first") return "image-top";
  return "balanced";
}

export function resolveCardPreset(item: BlockItem, block: TemplateBlock): CardVisualPreset {
  return item.cardVisualPreset ?? (item.cardEmphasis ? "highlight" : "inherit");
}

export function cardMediaStyle(item: BlockItem): CSSProperties {
  const media = item.media;
  return {
    objectFit: "cover",
    objectPosition: `${media?.cropX ?? 50}% ${media?.cropY ?? 50}%`,
    transform: `scale(${Math.max(1, media?.zoom ?? 1)})`,
  };
}

export function cardLayoutStyle(layout: CardLayout, mobile: boolean): CSSProperties {
  if (mobile) return { display: "flex", flexDirection: "column" };
  if (layout === "image-left" || layout === "image-right") {
    return { display: "grid", gridTemplateColumns: "minmax(96px, 34%) minmax(0, 1fr)" };
  }
  return {
    display: "flex",
    flexDirection: layout === "image-bottom" ? "column-reverse" : "column",
  };
}
