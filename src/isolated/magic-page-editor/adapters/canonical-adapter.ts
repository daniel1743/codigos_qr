import type { BioTemplateConfig, ElementContract } from "../../../premium-template-studio/types";
import type { SemanticTarget, TargetKind, SemanticCapabilities } from "../types/semantic-selection";

// Maps a canonical block type to a TargetKind
function mapCanonicalBlockType(type: string): TargetKind {
  switch (type) {
    case "hero":
      return "hero";
    case "collection":
      return "collection";
    case "social":
      return "social";
    case "gallery":
      return "media";
    case "text":
      return "text";
    default:
      return "block";
  }
}

function getContractCapabilities(contract?: ElementContract): SemanticCapabilities {
  if (!contract) return {};
  return {
    canHide: contract.optional,
    canRemove: !contract.protected,
  };
}

export function createCanonicalSemanticTarget(
  config: BioTemplateConfig,
  selectionId: string,
  rawLabel: string
): SemanticTarget {
  const parts = selectionId.split(":");
  const blockId = parts[0];
  const block = config.blocks.find((b) => b.id === blockId);

  let targetKind: TargetKind = "unknown";
  let label = rawLabel;
  let itemId: string | undefined;
  const capabilities: SemanticCapabilities = {
    // Capabilities are reported to the shared Magic-facing controls. Writes stay
    // on the canonical semantic-command boundary; they never become PageDoc writes.
  };

  if (!block && selectionId === "page-background") {
    targetKind = "page";
    label = "Página";
    capabilities.canChangeStyle = true;
  } else if (block) {
    if (parts.length === 1) {
      // It's the block itself
      targetKind = mapCanonicalBlockType(block.type);
      capabilities.canChangeLayout = true;
      capabilities.canMove = true;
      capabilities.canDuplicate = true;
      capabilities.canRemove = true;
      capabilities.canHide = true;
    } else {
      // It's an inner element
      const target = parts[1];
      if (block.type === "hero") {
        if (target === "hero-image") {
          targetKind = "media";
          capabilities.canEditMedia = true;
          capabilities.canCrop = true;
          capabilities.canZoom = true;
          capabilities.canOverlay = true;
          Object.assign(capabilities, getContractCapabilities(block.contracts?.image));
        } else if (target === "hero-background") {
          targetKind = "hero";
          capabilities.canChangeStyle = true;
        } else if (target === "hero-title") {
          targetKind = "hero-title";
          capabilities.canEditText = true;
          Object.assign(capabilities, getContractCapabilities(block.contracts?.title));
        } else if (target === "hero-subtitle") {
          targetKind = "hero-subtitle";
          capabilities.canEditText = true;
          Object.assign(capabilities, getContractCapabilities(block.contracts?.subtitle));
        } else if (target === "hero-description") {
          targetKind = "hero-description";
          capabilities.canEditText = true;
          Object.assign(capabilities, getContractCapabilities(block.contracts?.description));
        } else if (target === "hero-cta") {
          targetKind = "cta-primary";
          capabilities.canEditCTA = true;
          Object.assign(capabilities, getContractCapabilities(block.contracts?.cta));
        }
      } else if (block.type === "collection") {
        itemId = parts[2];
        const field = parts[3];
        if (!field) {
          targetKind = "collection-item";
          capabilities.canMove = true;
          capabilities.canDuplicate = true;
          capabilities.canRemove = true;
          capabilities.canHide = true;
        } else if (field === "title" || field === "description" || field === "price") {
          targetKind = field === "price" ? "price" : "text";
          capabilities.canEditText = true;
          if (field === "price") capabilities.canEditPrice = true;
        } else if (field === "image") {
          targetKind = "media";
          capabilities.canEditMedia = true;
          capabilities.canCrop = true;
        } else if (field === "cta") {
          targetKind = "cta-primary";
          capabilities.canEditCTA = true;
        }
      }
    }
  }

  return {
    documentKind: "canonical",
    targetKind,
    targetId: selectionId,
    parentBlockId: blockId !== selectionId ? blockId : undefined,
    itemId,
    label,
    capabilities,
    readOnly: false,
  };
}
