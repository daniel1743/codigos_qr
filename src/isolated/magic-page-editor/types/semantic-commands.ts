export type SemanticCommand =
  | { type: "SET_TEXT"; payload: { value: string } }
  | { type: "SET_ELEMENT_VISIBILITY"; payload: { hidden: boolean } }
  | { type: "SET_MEDIA_POSITION"; payload: { cropX?: number; cropY?: number } }
  | { type: "SET_MEDIA_ZOOM"; payload: { zoom: number } }
  | { type: "SET_MEDIA_OVERLAY"; payload: { overlay: boolean } }
  | { type: "SET_MEDIA_OVERLAY_COLOR"; payload: { color: string } }
  | { type: "SET_AVATAR_SHAPE"; payload: { shape: "circle" | "square" | "rounded" | "arch" | "none" } }
  | { type: "SET_HERO_VARIANT"; payload: { variant: string } }
  | { type: "SET_HERO_FUSION"; payload: { mode: "none" | "fade" | "halo" | "organic" | "dominant" } }
  | { type: "SET_CTA_LABEL"; payload: { label: string } }
  | { type: "SET_CTA_URL"; payload: { url: string } }
  | { type: "SET_IMAGE_HREF"; payload: { href?: string; newTab?: boolean } }
  | { type: "SET_CTA_STYLE"; payload: { variant: string; size?: string } }
  | { type: "SET_CARD_LAYOUT"; payload: { layout: string } }
  | { type: "SET_CARD_EMPHASIS"; payload: { emphasis: boolean } }
  | { type: "SET_CARD_BADGE_VISIBILITY"; payload: { visible: boolean } }
  | { type: "SET_CARD_PRICE_VISIBILITY"; payload: { visible: boolean } }
  | { type: "SET_CARD_DESCRIPTION_VISIBILITY"; payload: { visible: boolean } }
  | { type: "SET_CARD_CTA_VISIBILITY"; payload: { visible: boolean } }
  | { type: "MOVE_BLOCK"; payload: { dir: -1 | 1 } }
  | { type: "DUPLICATE_BLOCK"; payload: {} }
  | { type: "DELETE_BLOCK"; payload: {} }
  | { type: "SET_IMAGE_SRC"; payload: { src: string } }
  | { type: "SET_BACKGROUND"; payload: { src?: string; color?: string; overlay?: number } };
