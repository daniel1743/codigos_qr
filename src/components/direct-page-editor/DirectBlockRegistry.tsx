import type { MouseEvent, ReactNode } from "react";
import type {
  DirectAlignment,
  DirectContent,
  DirectItem,
  PageDocumentBlockV1,
} from "../../lib/direct-page-editor/page-document";
import { DirectHeroBlock as hero } from "./blocks/DirectHeroBlock";
import { DirectProfileBlock as profile } from "./blocks/DirectProfileBlock";

export type DirectBreakpoint = "desktop" | "tablet" | "mobile";
export type DirectBlockMode = "edit" | "preview" | "public";

export interface DirectBlockContext {
  mode: DirectBlockMode;
  breakpoint: DirectBreakpoint;
  onInlineEdit?: (path: string, value: unknown) => void;
  onSelectItem?: (blockId: string, itemId: string) => void;
  onSelectCTA?: (blockId: string, itemId?: string, path?: string) => void;
  onTrack?: (event: {
    type: string;
    blockId?: string | undefined;
    itemId?: string | undefined;
    url?: string | undefined;
    label?: string | undefined;
  }) => void;
  selectedItemId?: string | null;
}

export type DirectBlockComponent = (
  block: PageDocumentBlockV1,
  context: DirectBlockContext,
) => ReactNode;

export function text(content: DirectContent, key: string): string {
  return typeof content[key] === "string" ? String(content[key]) : "";
}
export function items(content: DirectContent): DirectItem[] {
  return Array.isArray(content.items) ? content.items : [];
}
export function editable(
  context: DirectBlockContext,
  path: string,
  value: string,
  tag: "h1" | "h2" | "h3" | "p" | "span" | "div" = "p",
) {
  const Tag = tag;
  if (context.mode !== "edit" || !context.onInlineEdit) return <Tag>{value}</Tag>;
  return (
    <Tag
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-direct-inline={path}
      onClick={(event: React.MouseEvent) => event.stopPropagation()}
      onBlur={(event: React.FocusEvent<HTMLElement>) => {
        const next = event.currentTarget.innerText.trim();
        if (next !== value) context.onInlineEdit?.(path, next);
      }}
    >
      {value}
    </Tag>
  );
}
export function cta(
  blockId: string,
  itemId: string | undefined,
  value: { label?: string; url?: string } | undefined,
  context: DirectBlockContext,
) {
  if (!value) return null;
  const label = value.label ?? "Abrir";
  const path = itemId
    ? `blocks.${blockId}.content.items.${itemId}.cta`
    : `blocks.${blockId}.content.primaryCTA`;
  const onClick = (event: MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    if (context.mode === "edit") context.onSelectCTA?.(blockId, itemId, path);
    if (context.mode === "public")
      context.onTrack?.({ type: "cta_click", blockId, itemId, url: value.url, label });
  };
  if (context.mode === "public") {
    return (
      <a className="direct-cta" href={value.url || "#"} onClick={onClick}>
        {label}
      </a>
    );
  }
  return (
    <button
      type="button"
      className="direct-cta"
      onClick={onClick}
      onDoubleClick={() => context.onInlineEdit?.(`${path}.label`, label)}
    >
      {label}
    </button>
  );
}

const textBlock: DirectBlockComponent = (block, context) => (
  <div className="direct-text" style={{ textAlign: block.layout.alignment as DirectAlignment }}>
    {editable(context, `blocks.${block.id}.content.title`, text(block.content, "title"), "h2")}
    {editable(context, `blocks.${block.id}.content.body`, text(block.content, "body"), "p")}
  </div>
);
const image: DirectBlockComponent = (block, context) => (
  <div className="direct-image-block">
    {typeof block.content.image === "string" && block.content.image ? (
      <img src={block.content.image} alt={text(block.content, "alt")} />
    ) : (
      <div className="direct-image-empty">Aadir imagen</div>
    )}
    {editable(context, `blocks.${block.id}.content.title`, text(block.content, "title"), "p")}
  </div>
);
const links: DirectBlockComponent = (block, context) => (
  <div className="direct-section" style={{ textAlign: block.layout.alignment as DirectAlignment }}>
    {editable(context, `blocks.${block.id}.content.title`, text(block.content, "title"), "h2")}
    <div className="direct-link-grid">
      {items(block.content).map((item) => (
        <a
          key={item.id}
          href={context.mode === "public" ? (item.cta?.url ?? item.ctaUrl) : undefined}
          onClick={() =>
            context.mode === "public" &&
            context.onTrack?.({
              type: "link_click",
              blockId: block.id,
              itemId: item.id,
              url: item.cta?.url ?? item.ctaUrl,
              label: item.title,
            })
          }
          onDoubleClick={() => context.onSelectItem?.(block.id, item.id)}
        >
          {editable(
            context,
            `blocks.${block.id}.content.items.${item.id}.title`,
            item.title ?? item.cta?.label ?? "Enlace",
            "span",
          )}
        </a>
      ))}
    </div>
  </div>
);
const social: DirectBlockComponent = (block, context) => links(block, context);
const collection: DirectBlockComponent = (block, context) => (
  <div
    className="direct-section"
    id="servicios"
    style={{ textAlign: block.layout.alignment as DirectAlignment }}
  >
    {editable(context, `blocks.${block.id}.content.title`, text(block.content, "title"), "h2")}
    {editable(
      context,
      `blocks.${block.id}.content.description`,
      text(block.content, "description"),
      "p",
    )}
    <div className="direct-card-grid">
      {items(block.content).map((item) => (
        <article
          key={item.id}
          className={
            context.selectedItemId === item.id ? "direct-card direct-card-selected" : "direct-card"
          }
          onClick={(event) => {
            event.stopPropagation();
            context.onSelectItem?.(block.id, item.id);
          }}
        >
          {item.image || item.imageUrl ? <img src={item.image || item.imageUrl} alt="" /> : null}
          {editable(
            context,
            `blocks.${block.id}.content.items.${item.id}.title`,
            item.title ?? "",
            "h3",
          )}
          {editable(
            context,
            `blocks.${block.id}.content.items.${item.id}.description`,
            item.description ?? "",
            "p",
          )}
          {cta(
            block.id,
            item.id,
            item.cta ??
              (item.ctaLabel || item.ctaUrl
                ? { label: item.ctaLabel, url: item.ctaUrl }
                : undefined),
            context,
          )}
        </article>
      ))}
    </div>
  </div>
);

export const DIRECT_BLOCK_REGISTRY: Record<string, DirectBlockComponent> = {
  hero,
  profile,
  text: textBlock,
  links,
  social,
  image,
  collection,
};
export const DIRECT_BLOCK_REGISTRY_METADATA = {
  hero: { variants: ["image"], capabilities: ["content", "image", "cta", "appearance"] },
  profile: { variants: ["default"], capabilities: ["content", "avatar"] },
  text: { variants: ["default"], capabilities: ["content", "typography"] },
  links: { variants: ["cards"], capabilities: ["items", "url"] },
  social: { variants: ["icons"], capabilities: ["items", "url", "style"] },
  image: { variants: ["card"], capabilities: ["replace", "remove", "framing"] },
  collection: {
    variants: ["services", "cards", "products", "menu", "portfolio", "testimonials"],
    capabilities: ["items", "order", "cta"],
  },
} as const;
export const DIRECT_UNSUPPORTED_BLOCK_TYPES = ["gallery", "video", "location"] as const;
