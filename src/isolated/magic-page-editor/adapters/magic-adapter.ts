import type { ElementInfo } from "../types/editor";
import type { SemanticTarget, TargetKind, SemanticCapabilities } from "../types/semantic-selection";

function mapMagicKindToTargetKind(kind: string): TargetKind {
  switch (kind) {
    case "page": return "page";
    case "hero": return "hero";
    case "text": return "text";
    case "image": return "media";
    case "avatar": return "avatar";
    case "familyCard": return "card";
    case "price": return "price";
    case "badge": return "badge";
    case "cta": return "cta-primary";
    case "social": return "social";
    case "gallery": return "media";
    case "section": return "block";
    default: return "unknown";
  }
}

export function createMagicSemanticTarget(
  info: ElementInfo
): SemanticTarget {
  const targetKind = mapMagicKindToTargetKind(info.kind);
  const capabilities: SemanticCapabilities = {
    // Magic documents are natively editable
    canEditText: targetKind === "text" || targetKind === "price" || targetKind === "badge" || targetKind === "hero-title" || targetKind === "hero-subtitle" || targetKind === "hero-description",
    canEditMedia: targetKind === "media" || targetKind === "avatar",
    canChangeLayout: targetKind === "block" || targetKind === "card",
    canChangeStyle: true,
    canHide: true,
    canRemove: targetKind !== "page",
    canDuplicate: targetKind === "block" || targetKind === "card",
    canMove: targetKind === "block" || targetKind === "card",
    canCrop: targetKind === "media" || targetKind === "avatar",
    canZoom: targetKind === "media" || targetKind === "avatar",
    canOverlay: targetKind === "media",
    canChangeAvatarShape: targetKind === "avatar",
    canChangeHeroVariant: targetKind === "hero",
    canChangeFusion: targetKind === "hero",
    canEditCTA: targetKind === "cta-primary" || targetKind === "cta-secondary",
    canEditPrice: targetKind === "price",
    canEditBadge: targetKind === "badge",
  };

  return {
    documentKind: "magic",
    targetKind,
    targetId: info.id,
    parentBlockId: info.blockKey,
    itemId: info.parentId,
    label: info.label,
    capabilities,
    readOnly: false,
  };
}
