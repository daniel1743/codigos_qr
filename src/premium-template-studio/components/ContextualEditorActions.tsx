import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  LockKeyhole,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { BlockItem, ElementContract, TemplateBlock } from "../types";
import { useStudio } from "../state/StudioProvider";
import {
  requestInspectorFocus,
  subscribeInspectorFocus,
  type InspectorFocusTarget,
} from "./inspector/inspectorFocus";
import { ContextualEditingToolbar } from "./ContextualEditingToolbar";
import type { SelectedCollectionItem } from "../engine/RenderContext";
import { cloneProductItem } from "./blocks/productGridCollection";
import { setElementVisibility } from "../state/elementVisibility";

type Surface = "desktop" | "mobile";

export interface ContextualEditorActionsProps {
  surface: Surface;
  selectedCollectionItem?: SelectedCollectionItem | null | undefined;
  focusTarget?: InspectorFocusTarget | null | undefined;
  expanded?: boolean | undefined;
  onToggleExpanded?: (() => void) | undefined;
}

type ContextualTarget = {
  kind: "block" | "collection" | "profile";
  id: string;
  label: string;
  block?: TemplateBlock;
  item?: BlockItem;
  focus: InspectorFocusTarget;
  contract?: ElementContract;
  visibilityPath?: string;
  collection?: SelectedCollectionItem;
  canMove: boolean;
  canDuplicate: boolean;
  canRemove: boolean;
  removeLabel: "Ocultar" | "Eliminar";
};

function targetLabel(block: TemplateBlock | null, focus: InspectorFocusTarget | null): string {
  if (focus === "hero-title") return "Título";
  if (focus === "hero-subtitle") return "Subtítulo";
  if (focus === "hero-description") return "Descripción";
  if (focus === "hero-eyebrow") return "Etiqueta";
  if (focus === "hero-cta" || focus === "hero-cta-primary") return "CTA principal";
  if (focus === "hero-cta-secondary") return "CTA secundario";
  if (focus === "hero-image") return "Imagen principal";
  if (focus === "hero-background") return "Fondo del hero";
  if (focus === "profile-avatar") return "Avatar";
  if (focus === "profile-bio") return "Biografía";
  if (focus === "profile-cover") return "Portada";
  if (focus === "page-background") return "Fondo de página";
  return block?.type === "hero" ? "Hero" : (block?.type ?? "Perfil");
}

function focusContract(
  block: TemplateBlock,
  focus: InspectorFocusTarget | null,
): ElementContract | undefined {
  if (focus === "hero-title") return block.content.titleElement;
  if (focus === "hero-subtitle") return block.content.subtitleElement;
  if (focus === "hero-description") return block.content.descriptionElement;
  if (focus === "hero-eyebrow") return block.content.eyebrowElement;
  if (focus === "hero-cta-primary") return block.content.primaryCTA?.element;
  if (focus === "hero-cta-secondary") return block.content.secondaryCTA?.element;
  if (focus === "hero-image") return block.content.media?.element;
  return block.element;
}

function focusVisibilityPath(focus: InspectorFocusTarget | null): string | undefined {
  if (focus === "hero-title") return "content.titleElement";
  if (focus === "hero-subtitle") return "content.subtitleElement";
  if (focus === "hero-description") return "content.descriptionElement";
  if (focus === "hero-eyebrow") return "content.eyebrowElement";
  if (focus === "hero-cta-primary") return "content.primaryCTA.element";
  if (focus === "hero-cta-secondary") return "content.secondaryCTA.element";
  if (focus === "hero-image") return "content.media.element";
  return undefined;
}

function profileContract(
  profile: {
    avatarElement?: ElementContract;
    descriptionElement?: ElementContract;
  },
  focus: InspectorFocusTarget | null,
): ElementContract | undefined {
  if (focus === "profile-avatar") return profile.avatarElement;
  if (focus === "profile-bio") return profile.descriptionElement;
  return undefined;
}

function selectedTarget(
  state: ReturnType<typeof useStudio>["state"],
  selectedCollectionItem: SelectedCollectionItem | null | undefined,
  focusTarget: InspectorFocusTarget | null,
): ContextualTarget | null {
  if (selectedCollectionItem) {
    const block = state.config.blocks.find(
      (candidate) => candidate.id === selectedCollectionItem.blockId,
    );
    if (!block || selectedCollectionItem.collection !== "product-grid") return null;
    const item = (block.content.products ?? []).find(
      (candidate) => candidate.id === selectedCollectionItem.itemId,
    );
    if (!item) return null;
    const contract = item.element;
    return {
      kind: "collection",
      id: item.id,
      label: item.name || "Tarjeta",
      block,
      item,
      focus:
        focusTarget ?? `collection-${encodeURIComponent(block.id)}-${encodeURIComponent(item.id)}`,
      contract,
      visibilityPath: `content.products.${item.id}.element`,
      collection: selectedCollectionItem,
      canMove: true,
      canDuplicate: true,
      canRemove: !contract?.protected,
      removeLabel: "Eliminar",
    };
  }

  if (state.selectedBlockId) {
    const block = state.config.blocks.find((candidate) => candidate.id === state.selectedBlockId);
    if (!block) return null;
    const contract = focusContract(block, focusTarget);
    const isElementTarget = Boolean(
      focusTarget && focusTarget !== "block" && focusTarget !== "hero-background",
    );
    return {
      kind: "block",
      id: block.id,
      label: targetLabel(block, focusTarget),
      block,
      focus: focusTarget ?? "block",
      contract,
      visibilityPath: focusVisibilityPath(focusTarget) ?? "element",
      canMove: !isElementTarget,
      canDuplicate: !isElementTarget,
      canRemove: Boolean(contract?.optional && !contract.protected),
      removeLabel: "Ocultar",
    };
  }

  if (focusTarget === "profile-avatar" || focusTarget === "profile-bio") {
    const contract = profileContract(state.config.profile, focusTarget);
    return {
      kind: "profile",
      id: focusTarget,
      label: targetLabel(null, focusTarget),
      focus: focusTarget,
      contract,
      visibilityPath:
        focusTarget === "profile-avatar" ? "profile.avatarElement" : "profile.descriptionElement",
      canMove: false,
      canDuplicate: false,
      canRemove: Boolean(contract?.optional && !contract.protected),
      removeLabel: "Ocultar",
    };
  }

  return null;
}

function ActionButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-45"
    >
      {children}
      <span className="sr-only sm:not-sr-only">{label}</span>
    </button>
  );
}

export function ContextualEditorActions({
  surface,
  selectedCollectionItem,
  focusTarget: controlledFocusTarget,
  expanded = false,
  onToggleExpanded,
}: ContextualEditorActionsProps) {
  const { state, dispatch } = useStudio();
  const [focusTarget, setFocusTarget] = useState<InspectorFocusTarget | null>(
    controlledFocusTarget ?? null,
  );

  useEffect(() => {
    if (controlledFocusTarget !== undefined) setFocusTarget(controlledFocusTarget);
  }, [controlledFocusTarget]);

  useEffect(() => subscribeInspectorFocus(setFocusTarget), []);

  const target = useMemo(
    () => selectedTarget(state, selectedCollectionItem, focusTarget),
    [state, selectedCollectionItem, focusTarget],
  );

  if (!target) return null;

  const canToggleVisibility = Boolean(target.contract?.optional && !target.contract.protected);
  const isVisible = target.contract?.visible ?? true;

  const focusInspector = () => requestInspectorFocus(target.focus);

  const toggleVisibility = () => {
    if (!target.visibilityPath || !canToggleVisibility) return;
    const next = setElementVisibility(target.contract, !isVisible, true);
    if (!next.allowed) return;
    if (target.kind === "profile") {
      dispatch({
        type: "setConfigElementVisibility",
        path: target.visibilityPath,
        visible: !isVisible,
      });
    } else if (target.kind === "block" && target.block) {
      dispatch({
        type: "setElementVisibility",
        id: target.id,
        path: target.visibilityPath,
        visible: !isVisible,
      });
    } else if (target.kind === "collection" && target.block) {
      dispatch({
        type: "setElementVisibility",
        id: target.block.id,
        path: target.visibilityPath,
        visible: !isVisible,
      });
    }
  };

  const removeTarget = () => {
    if (!target.canRemove) return;
    if (target.kind === "collection" && target.block && target.collection) {
      const products = (target.block.content.products ?? []).filter(
        (candidate) => candidate.id !== target.collection?.itemId,
      );
      dispatch({
        type: "patchBlockField",
        id: target.block.id,
        path: "content.products",
        value: products,
      });
      return;
    }
    toggleVisibility();
  };

  const duplicateTarget = () => {
    if (target.kind === "block") dispatch({ type: "duplicateBlock", id: target.id });
    if (target.kind === "collection" && target.block && target.item) {
      const products = [...(target.block.content.products ?? [])];
      const index = products.findIndex((candidate) => candidate.id === target.item?.id);
      if (index < 0) return;
      products.splice(index + 1, 0, cloneProductItem(target.item));
      dispatch({
        type: "patchBlockField",
        id: target.block.id,
        path: "content.products",
        value: products,
      });
    }
  };

  const moveTarget = (direction: -1 | 1) => {
    if (target.kind === "block") dispatch({ type: "moveBlock", id: target.id, direction });
    if (target.kind === "collection" && target.block && target.item) {
      const products = [...(target.block.content.products ?? [])];
      const index = products.findIndex((candidate) => candidate.id === target.item?.id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= products.length) return;
      [products[index], products[next]] = [products[next]!, products[index]!];
      dispatch({
        type: "patchBlockField",
        id: target.block.id,
        path: "content.products",
        value: products,
      });
    }
  };

  const isFirst =
    target.kind === "block"
      ? state.config.blocks.findIndex((block) => block.id === target.id) === 0
      : target.kind === "collection" && target.block && target.item
        ? (target.block.content.products ?? []).findIndex((item) => item.id === target.item?.id) ===
          0
        : false;
  const isLast =
    target.kind === "block"
      ? state.config.blocks.findIndex((block) => block.id === target.id) ===
        state.config.blocks.length - 1
      : target.kind === "collection" && target.block && target.item
        ? (target.block.content.products ?? []).findIndex((item) => item.id === target.item?.id) ===
          (target.block.content.products ?? []).length - 1
        : false;

  const advancedLabel = expanded ? "Ocultar ajustes avanzados" : "Más ajustes";
  const surfaceClass =
    surface === "desktop"
      ? "hidden lg:flex rounded-xl border border-border/80 bg-card/95 p-1 shadow-lg backdrop-blur"
      : "flex w-full flex-wrap items-center gap-1 border-b border-border bg-card px-3 py-2";

  return (
    <div
      className={surfaceClass}
      data-contextual-surface={surface}
      data-contextual-target={target.id}
    >
      <span
        className="mr-1 max-w-28 truncate px-2 text-xs font-semibold text-foreground"
        title={target.label}
      >
        {target.label}
      </span>
      <ActionButton label="Editar" onClick={focusInspector}>
        <Pencil className="h-4 w-4" />
      </ActionButton>
      {canToggleVisibility ? (
        <ActionButton label={isVisible ? "Ocultar" : "Mostrar"} onClick={toggleVisibility}>
          {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </ActionButton>
      ) : target.contract?.protected ? (
        <span
          className="inline-flex min-h-11 min-w-11 items-center justify-center text-muted-foreground"
          aria-label="Elemento protegido"
          title="Elemento protegido"
        >
          <LockKeyhole className="h-4 w-4" />
        </span>
      ) : null}
      {target.canRemove ? (
        <ActionButton label={target.removeLabel} onClick={removeTarget}>
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {target.canDuplicate ? (
        <ActionButton label="Duplicar" onClick={duplicateTarget}>
          <Copy className="h-4 w-4" />
        </ActionButton>
      ) : null}
      {target.canMove ? (
        <>
          <ActionButton label="Mover arriba" onClick={() => moveTarget(-1)} disabled={isFirst}>
            <ArrowUp className="h-4 w-4" />
          </ActionButton>
          <ActionButton label="Mover abajo" onClick={() => moveTarget(1)} disabled={isLast}>
            <ArrowDown className="h-4 w-4" />
          </ActionButton>
        </>
      ) : null}
      <ActionButton
        label={advancedLabel}
        onClick={() => {
          focusInspector();
          onToggleExpanded?.();
        }}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
      </ActionButton>
    </div>
  );
}

export function ContextualEditorMobileSheet({
  selectedCollectionItem,
  expanded,
  onToggleExpanded,
}: Omit<ContextualEditorActionsProps, "surface"> & {
  expanded: boolean;
  onToggleExpanded: () => void;
}) {
  return (
    <ContextualEditorActions
      surface="mobile"
      selectedCollectionItem={selectedCollectionItem}
      expanded={expanded}
      onToggleExpanded={onToggleExpanded}
    />
  );
}
