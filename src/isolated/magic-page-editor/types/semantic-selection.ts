export type DocumentKind = "magic" | "canonical";

export type TargetKind =
  | "page"
  | "hero"
  | "hero-title"
  | "hero-subtitle"
  | "hero-description"
  | "avatar"
  | "cta-primary"
  | "cta-secondary"
  | "text"
  | "media"
  | "block"
  | "collection"
  | "collection-item"
  | "card"
  | "price"
  | "badge"
  | "description"
  | "social"
  | "unknown";

export interface SemanticCapabilities {
  canEditText?: boolean;
  canEditMedia?: boolean;
  canChangeLayout?: boolean;
  canChangeStyle?: boolean;
  canHide?: boolean;
  canRemove?: boolean;
  canDuplicate?: boolean;
  canMove?: boolean;
  canCrop?: boolean;
  canZoom?: boolean;
  canOverlay?: boolean;
  canChangeAvatarShape?: boolean;
  canChangeHeroVariant?: boolean;
  canChangeFusion?: boolean;
  canEditCTA?: boolean;
  canEditPrice?: boolean;
  canEditBadge?: boolean;
}

export interface SemanticTarget {
  documentKind: DocumentKind;
  targetKind: TargetKind;
  targetId: string;
  parentBlockId?: string;
  itemId?: string;
  label: string;
  capabilities: SemanticCapabilities;
  readOnly: boolean;
}
