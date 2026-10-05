import type { BioTemplateConfig, BlockContent, TemplateBlock, BlockItem } from "../../../premium-template-studio/types";
import type { SemanticTarget } from "../types/semantic-selection";
import type { SemanticCommand } from "../types/semantic-commands";

/**
 * Patch an element in a canonical document immutably.
 */
export function applyCanonicalPatch(
  config: BioTemplateConfig,
  target: SemanticTarget,
  command: SemanticCommand
): BioTemplateConfig {
  if (target.documentKind !== "canonical") {
    throw new Error("applyCanonicalPatch requires a canonical SemanticTarget");
  }

  // Parse ID string. Examples: "block1", "block1:hero-title", "block1:items:item1:title"
  // Bridge 2 tests and older callers used `id`; Bridge 4's adapter emits the
  // canonical contract name `targetId`. Accept both at this boundary while
  // keeping the emitted target shape canonical.
  const targetId = target.targetId ?? (target as SemanticTarget & { id?: string }).id;
  if (!targetId) throw new Error("Canonical target is missing targetId.");
  const parts = targetId.split(":");
  const blockId = parts[0];

  const blockIndex = config.blocks.findIndex((b) => b.id === blockId);

  if (command.type === "MOVE_BLOCK") {
    if (blockIndex === -1) return config;
    const { dir } = command.payload;
    const j = blockIndex + dir;
    if (j < 0 || j >= config.blocks.length) return config;
    const nextBlocks = [...config.blocks];
    [nextBlocks[blockIndex], nextBlocks[j]] = [nextBlocks[j], nextBlocks[blockIndex]];
    return { ...config, blocks: nextBlocks };
  }

  if (command.type === "DELETE_BLOCK") {
    if (blockIndex === -1) return config;
    const nextBlocks = config.blocks.filter((_, i) => i !== blockIndex);
    return { ...config, blocks: nextBlocks };
  }

  if (command.type === "DUPLICATE_BLOCK") {
    if (blockIndex === -1) return config;
    const source = config.blocks[blockIndex];
    const newId = `${source.type}-${Math.random().toString(36).slice(2, 7)}`;
    const nextBlocks = [...config.blocks];
    nextBlocks.splice(blockIndex + 1, 0, { ...source, id: newId });
    return { ...config, blocks: nextBlocks };
  }

  if (blockIndex === -1 && blockId !== "page-background") return config;

  let nextConfig = { ...config };

  // Update block content
  const updateBlockContent = (updater: (content: BlockContent) => BlockContent) => {
    if (blockIndex === -1) return;
    const nextBlocks = [...nextConfig.blocks];
    nextBlocks[blockIndex] = {
      ...nextBlocks[blockIndex],
      content: updater(nextBlocks[blockIndex].content),
    };
    nextConfig = { ...nextConfig, blocks: nextBlocks };
  };

  const updateBlockItem = (itemId: string, updater: (item: BlockItem) => BlockItem) => {
    if (blockIndex === -1) return;
    updateBlockContent((c) => {
      if (!c.items) return c;
      return {
        ...c,
        items: c.items.map((it) => (it.id === itemId ? updater(it) : it)),
      };
    });
  };

  switch (command.type) {
    case "SET_TEXT": {
      if (parts.length === 1 && target.targetKind === "text") {
         // Some specific text block?
         updateBlockContent((c) => ({ ...c, body: command.payload.value }));
      } else if (parts.length === 2) {
        const sub = parts[1];
        if (sub === "hero-title" || sub === "title") updateBlockContent((c) => ({ ...c, title: command.payload.value }));
        if (sub === "hero-subtitle" || sub === "subtitle") updateBlockContent((c) => ({ ...c, subtitle: command.payload.value }));
        if (sub === "hero-body" || sub === "body" || sub === "description") updateBlockContent((c) => ({ ...c, body: command.payload.value }));
      } else if (parts.length >= 3 && parts[1] === "items") {
        const itemId = parts[2];
        const field = parts[3] ?? "title";
        updateBlockItem(itemId, (item) => ({ ...item, [field]: command.payload.value }));
      }
      break;
    }
    case "SET_IMAGE_SRC": {
      if (target.targetKind === "media" || target.targetKind === "image") {
        if (parts.length === 1) {
          updateBlockContent((c) => ({ ...c, imageUrl: command.payload.src }));
        } else if (parts.length === 2) {
          const sub = parts[1];
          if (sub === "hero-image") {
            updateBlockContent((c) => ({
              ...c,
              avatar: { ...c.avatar, url: command.payload.src },
            }));
          } else if (sub === "hero-background") {
             updateBlockContent((c) => ({
              ...c,
              backgroundImage: { ...c.backgroundImage, url: command.payload.src },
            }));
          }
        } else if (parts.length >= 3 && parts[1] === "items") {
          const itemId = parts[2];
          updateBlockItem(itemId, (item) => ({ ...item, imageUrl: command.payload.src }));
        }
      }
      break;
    }
    case "SET_MEDIA_POSITION": {
      if (target.targetKind === "media" || target.targetKind === "image") {
        if (parts.length === 1) {
          updateBlockContent((c) => ({ ...c, media: { ...c.media, cropX: command.payload.cropX ?? c.media?.cropX, cropY: command.payload.cropY ?? c.media?.cropY } }));
        } else if (parts.length === 2 && parts[1] === "hero-background") {
           // Not supported yet for background, handled differently
        } else if (parts.length === 2 && parts[1] === "hero-image") {
          updateBlockContent((c) => ({ ...c, avatar: { ...c.avatar, media: { ...c.avatar?.media, cropX: command.payload.cropX ?? c.avatar?.media?.cropX, cropY: command.payload.cropY ?? c.avatar?.media?.cropY } } }));
        } else if (parts.length >= 3 && parts[1] === "items") {
          updateBlockItem(parts[2], (item) => ({ ...item, media: { ...item.media, cropX: command.payload.cropX ?? item.media?.cropX, cropY: command.payload.cropY ?? item.media?.cropY } }));
        }
      }
      break;
    }
    case "SET_MEDIA_ZOOM": {
      if (target.targetKind === "media" || target.targetKind === "image") {
        if (parts.length === 1) {
          updateBlockContent((c) => ({ ...c, media: { ...c.media, zoom: command.payload.zoom } }));
        } else if (parts.length === 2 && parts[1] === "hero-image") {
          updateBlockContent((c) => ({ ...c, avatar: { ...c.avatar, media: { ...c.avatar?.media, zoom: command.payload.zoom } } }));
        } else if (parts.length >= 3 && parts[1] === "items") {
          updateBlockItem(parts[2], (item) => ({ ...item, media: { ...item.media, zoom: command.payload.zoom } }));
        }
      }
      break;
    }
    case "SET_MEDIA_OVERLAY":
    case "SET_MEDIA_OVERLAY_COLOR": {
      if (target.targetKind === "media" || target.targetKind === "image") {
        const isColor = command.type === "SET_MEDIA_OVERLAY_COLOR";
        const val = command.payload as any;
        if (parts.length === 1) {
          updateBlockContent((c) => ({ ...c, media: { ...c.media, ...(isColor ? { overlayColor: val.color } : { overlay: val.overlay ? "medium" : "none" }) } }));
        } else if (parts.length === 2 && parts[1] === "hero-image") {
          updateBlockContent((c) => ({ ...c, avatar: { ...c.avatar, media: { ...c.avatar?.media, ...(isColor ? { overlayColor: val.color } : { overlay: val.overlay ? "medium" : "none" }) } } }));
        } else if (parts.length >= 3 && parts[1] === "items") {
          updateBlockItem(parts[2], (item) => ({ ...item, media: { ...item.media, ...(isColor ? { overlayColor: val.color } : { overlay: val.overlay ? "medium" : "none" }) } }));
        }
      }
      break;
    }
    case "SET_AVATAR_SHAPE": {
      if (parts.length === 2 && parts[1] === "hero-image") {
        updateBlockContent((c) => ({ ...c, avatar: { ...c.avatar, shape: command.payload.shape } }));
      }
      break;
    }
    case "SET_HERO_FUSION": {
      updateBlockContent((c) => ({ ...c, fusion: command.payload.mode }));
      break;
    }
    case "SET_HERO_VARIANT": {
      if (blockIndex > -1) {
        const nextBlocks = [...nextConfig.blocks];
        nextBlocks[blockIndex] = { ...nextBlocks[blockIndex], variant: command.payload.variant };
        nextConfig = { ...nextConfig, blocks: nextBlocks };
      }
      break;
    }
    case "SET_CARD_LAYOUT": {
      if (parts.length >= 3 && parts[1] === "items") {
         // item layout not supported natively, usually applied to block
      } else {
        updateBlockContent((c) => ({ ...c, cardLayout: command.payload.layout as any }));
      }
      break;
    }
    case "SET_CARD_EMPHASIS": {
      updateBlockContent((c) => ({ ...c, cardEmphasis: command.payload.emphasis }));
      break;
    }
    case "SET_CTA_LABEL": {
      if (parts.length === 2 && (parts[1] === "hero-cta" || parts[1] === "cta-primary")) {
        updateBlockContent((c) => ({
          ...c,
          primaryCTA: { ...(c.primaryCTA || { url: "" }), label: command.payload.label },
        }));
      }
      break;
    }
    case "SET_CTA_URL": {
      if (parts.length === 2 && (parts[1] === "hero-cta" || parts[1] === "cta-primary")) {
        updateBlockContent((c) => ({
          ...c,
          primaryCTA: { ...(c.primaryCTA || { label: "" }), url: command.payload.url },
        }));
      }
      break;
    }
    case "SET_IMAGE_HREF": {
      if (target.targetKind === "media" && parts.length >= 4 && parts[1] === "items") {
        const itemId = parts[2];
        updateBlockItem(itemId, (item) => ({
          ...item,
          ...(command.payload.href === undefined ? {} : { url: command.payload.href }),
          ...(command.payload.newTab === undefined ? {} : { newTab: command.payload.newTab }),
        }));
      }
      break;
    }
    case "SET_CTA_STYLE": {
      if (parts.length === 2 && (parts[1] === "hero-cta" || parts[1] === "cta-primary")) {
        updateBlockContent((c) => ({
          ...c,
          primaryCTA: { ...(c.primaryCTA || { label: "", url: "" }), style: command.payload.variant as any },
        }));
      }
      break;
    }
    case "SET_ELEMENT_VISIBILITY": {
      if (parts.length === 2) {
        const sub = parts[1];
        const { hidden } = command.payload;
        if (sub === "hero-title" || sub === "title") updateBlockContent((c) => ({ ...c, titleElement: { ...c.titleElement, visible: !hidden } }));
        if (sub === "hero-subtitle" || sub === "subtitle") updateBlockContent((c) => ({ ...c, subtitleElement: { ...c.subtitleElement, visible: !hidden } }));
        if (sub === "hero-body" || sub === "body" || sub === "description") updateBlockContent((c) => ({ ...c, descriptionElement: { ...c.descriptionElement, visible: !hidden } }));
        if (sub === "hero-cta") updateBlockContent((c) => ({ ...c, primaryCTA: { ...c.primaryCTA, element: { ...c.primaryCTA?.element, visible: !hidden } } }));
        if (sub === "hero-image") updateBlockContent((c) => ({ ...c, avatar: { ...c.avatar, element: { ...c.avatar?.element, visible: !hidden } } }));
      } else if (parts.length >= 3 && parts[1] === "items") {
        const itemId = parts[2];
        const field = parts[3];
        const { hidden } = command.payload;
        if (field === "badge") updateBlockItem(itemId, (item) => ({ ...item, badgeElement: { ...item.badgeElement, visible: !hidden } }));
        if (field === "price") updateBlockItem(itemId, (item) => ({ ...item, priceElement: { ...item.priceElement, visible: !hidden } }));
        if (field === "desc") updateBlockItem(itemId, (item) => ({ ...item, descriptionElement: { ...item.descriptionElement, visible: !hidden } }));
        if (field === "cta") updateBlockItem(itemId, (item) => ({ ...item, ctaElement: { ...item.ctaElement, visible: !hidden } }));
      }
      break;
    }
    case "SET_CARD_BADGE_VISIBILITY": {
      updateBlockContent((c) => ({ ...c, items: (c.items ?? []).map((it) => ({ ...it, badgeElement: { ...it.badgeElement, visible: command.payload.visible } })) }));
      break;
    }
    case "SET_CARD_PRICE_VISIBILITY": {
      updateBlockContent((c) => ({ ...c, items: (c.items ?? []).map((it) => ({ ...it, priceElement: { ...it.priceElement, visible: command.payload.visible } })) }));
      break;
    }
    case "SET_CARD_DESCRIPTION_VISIBILITY": {
      updateBlockContent((c) => ({ ...c, items: (c.items ?? []).map((it) => ({ ...it, descriptionElement: { ...it.descriptionElement, visible: command.payload.visible } })) }));
      break;
    }
    case "SET_CARD_CTA_VISIBILITY": {
      updateBlockContent((c) => ({ ...c, items: (c.items ?? []).map((it) => ({ ...it, ctaElement: { ...it.ctaElement, visible: command.payload.visible } })) }));
      break;
    }
  }

  return nextConfig;
}
