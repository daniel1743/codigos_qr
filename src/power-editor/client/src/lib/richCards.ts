import type { PageBlock, PageConfig } from "./editorCandidateModel";

export type CardImageSide = "left" | "right";
export const RICH_CARD_SUBTARGETS = ["card", "title", "description", "image", "cta"] as const;
export type RichCardSubTarget = (typeof RICH_CARD_SUBTARGETS)[number];
export type RichCardSelection = { cardId: string; target: RichCardSubTarget };

export type CardTextStyle = {
  color?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  italic?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  textStrokeWidth?: number;
  textStrokeColor?: string;
  textAlign?: "left" | "center" | "right" | "justify";
};

export type RichCardItem = {
  id: string;
  title: string;
  description: string;
  cta?: string;
  ctaUrl?: string;
  ctaEnabled?: boolean;
  cardLinkEnabled?: boolean;
  cardUrl?: string;
  imageUrl?: string;
  imageEnabled?: boolean;
  imageSide?: CardImageSide;
  background?: string;
  borderColor?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: number;
  padding?: number;
  titleStyle?: CardTextStyle;
  descriptionStyle?: CardTextStyle;
  ctaStyle?: CardTextStyle;
};

export const CARD_IMAGE_TEXT_RATIO = { text: 75, image: 25 } as const;

const defaultTextStyle: Required<CardTextStyle> = {
  color: "#f1eee8",
  fontFamily: "Manrope",
  fontSize: 10,
  fontWeight: 700,
  italic: false,
  letterSpacing: 0,
  lineHeight: 1.35,
  textStrokeWidth: 0,
  textStrokeColor: "#000000",
  textAlign: "left",
};

export function createRichCard(id: string, title = "Nueva tarjeta"): RichCardItem {
  return {
    id,
    title,
    description: "Describe este contenido",
    cta: "Saber más",
    ctaUrl: "",
    ctaEnabled: true,
    cardLinkEnabled: false,
    cardUrl: "",
    imageUrl: "",
    imageEnabled: false,
    imageSide: "right",
    background: "rgba(255,255,255,.06)",
    borderColor: "#c49a68",
    borderWidth: 0,
    radius: 10,
    shadow: 0,
    padding: 10,
    titleStyle: { ...defaultTextStyle, fontSize: 11, fontWeight: 800 },
    descriptionStyle: { ...defaultTextStyle, color: "#b7bdc5", fontSize: 8, fontWeight: 500 },
    ctaStyle: { ...defaultTextStyle, color: "#e8c38e", fontSize: 8, fontWeight: 800 },
  };
}

export function normalizeRichCard(value: Partial<RichCardItem> & Pick<RichCardItem, "id" | "title" | "description">): RichCardItem {
  const fallback = createRichCard(value.id, value.title);
  const normalizeTextStyle = (style: CardTextStyle | undefined, defaults: CardTextStyle | undefined): CardTextStyle => {
    const textAlign: NonNullable<CardTextStyle["textAlign"]> = style?.textAlign === "center" || style?.textAlign === "right" || style?.textAlign === "justify" ? style.textAlign : "left";
    return { ...(defaults ?? {}), ...(style ?? {}), textAlign };
  };
  return {
    ...fallback,
    ...value,
    ctaEnabled: value.ctaEnabled === undefined ? Boolean(value.cta ?? fallback.cta) : Boolean(value.ctaEnabled),
    cardLinkEnabled: Boolean(value.cardLinkEnabled),
    cardUrl: typeof value.cardUrl === "string" ? value.cardUrl : "",
    imageEnabled: value.imageEnabled === undefined ? Boolean(value.imageUrl) : Boolean(value.imageEnabled),
    imageSide: value.imageSide === "left" ? "left" : "right",
    borderWidth: Math.max(0, Math.min(8, Number(value.borderWidth ?? fallback.borderWidth))),
    radius: Math.max(0, Math.min(32, Number(value.radius ?? fallback.radius))),
    shadow: Math.max(0, Math.min(36, Number(value.shadow ?? fallback.shadow))),
    padding: Math.max(4, Math.min(32, Number(value.padding ?? fallback.padding))),
    titleStyle: normalizeTextStyle(value.titleStyle, fallback.titleStyle),
    descriptionStyle: normalizeTextStyle(value.descriptionStyle, fallback.descriptionStyle),
    ctaStyle: normalizeTextStyle(value.ctaStyle, fallback.ctaStyle),
  };
}

export function patchRichCard(items: RichCardItem[], id: string, patch: Partial<RichCardItem>): RichCardItem[] {
  return items.map(item => item.id === id ? normalizeRichCard({ ...item, ...patch }) : item);
}

export function normalizeRichCardSelection(items: RichCardItem[], selection?: Partial<RichCardSelection>): RichCardSelection | undefined {
  const selected = items.find(item => item.id === selection?.cardId) ?? items[0];
  if (!selected) return undefined;
  const target = RICH_CARD_SUBTARGETS.includes(selection?.target as RichCardSubTarget) ? selection?.target as RichCardSubTarget : "card";
  if (target === "image" && !selected.imageEnabled) return { cardId: selected.id, target: "card" };
  if (target === "cta" && selected.ctaEnabled === false) return { cardId: selected.id, target: "card" };
  return { cardId: selected.id, target };
}

export type CardLibraryImage = { id: string; label: string; url: string };

export function collectCardLibraryImages(page: PageConfig): CardLibraryImage[] {
  const collected: CardLibraryImage[] = [];
  const add = (id: string, label: string, raw: unknown) => { const url = typeof raw === "string" ? raw.trim() : ""; if (url && !collected.some(item => item.url === url)) collected.push({ id, label, url }); };
  page.blocks.forEach(block => {
    if (block.type === "banner") add(`${block.id}-banner`, "Banner actual", block.props["imageUrl"]);
    if (block.type === "profile") { add(`${block.id}-avatar`, "Avatar actual", block.props["avatarUrl"]); add(`${block.id}-logo`, "Logo actual", block.props["logoUrl"]); }
    if (block.type === "image") add(`${block.id}-image`, String(block.props["label"] ?? "Imagen"), block.props["url"]);
    if (block.type === "gallery") ((block.props["items"] as Array<{ id?: string; url?: string }> | undefined) ?? []).forEach((item, index) => add(`${block.id}-gallery-${item.id ?? index}`, `Galería ${index + 1}`, item.url));
    if (block.type === "cards") ((block.props["items"] as Array<{ id?: string; imageUrl?: string; title?: string }> | undefined) ?? []).forEach((item, index) => add(`${block.id}-card-${item.id ?? index}`, item.title || `Tarjeta ${index + 1}`, item.imageUrl));
  });
  return collected;
}

export function isCardsBlock(block: PageBlock): boolean { return block.type === "cards"; }
