import type { CSSProperties, ReactNode } from "react";
import type {
  PageDocumentBlockV1,
  PageDocumentV1,
} from "../../lib/direct-page-editor/page-document";
import {
  DIRECT_BLOCK_REGISTRY,
  type DirectBlockContext,
  type DirectBreakpoint,
  type DirectBlockMode,
} from "./DirectBlockRegistry";
import "./direct-page-editor.css";

export interface DirectEditingHandlers extends Partial<DirectBlockContext> {
  selectedBlockId?: string | null;
  selectedItemId?: string | null;
  onSelectBlock?: (id: string) => void;
  onSelectPage?: () => void;
}

export interface DirectPageRendererProps {
  document: PageDocumentV1;
  breakpoint?: DirectBreakpoint;
  mode?: DirectBlockMode;
  editing?: DirectEditingHandlers;
  onTrack?: DirectBlockContext["onTrack"];
}

function BlockFrame({
  block,
  selected,
  children,
  onSelect,
  mode,
}: {
  block: PageDocumentBlockV1;
  selected: boolean;
  children: ReactNode;
  onSelect?: () => void;
  mode: DirectBlockMode;
}) {
  const style = { opacity: block.visible ? 1 : 0.38 };
  if (mode !== "edit")
    return (
      <section data-direct-block-id={block.id} style={style}>
        {children}
      </section>
    );
  return (
    <section
      data-direct-block-id={block.id}
      aria-label={`${block.type} block`}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.();
      }}
      className={selected ? "direct-block direct-block-selected" : "direct-block"}
      style={style}
    >
      {selected ? <div className="direct-block-label">{block.type}</div> : null}
      {children}
    </section>
  );
}

function renderBlock(block: PageDocumentBlockV1, context: DirectBlockContext): ReactNode {
  const component = DIRECT_BLOCK_REGISTRY[block.type];
  return component ? (
    component(block, context)
  ) : (
    <div className="direct-unsupported-block">Bloque no soportado en Direct Page V1</div>
  );
}

export function DirectPageRenderer({
  document,
  breakpoint = "desktop",
  mode = "public",
  editing,
  onTrack,
}: DirectPageRendererProps) {
  const visibleBlocks = document.blocks.filter(
    (block) => mode !== "public" || block.visibility[breakpoint],
  );
  const context: DirectBlockContext = {
    mode,
    breakpoint,
    onInlineEdit: editing?.onInlineEdit,
    onSelectItem: editing?.onSelectItem,
    onSelectCTA: editing?.onSelectCTA,
    onTrack,
    selectedItemId: editing?.selectedItemId,
  };
  return (
    <div
      className="direct-page-renderer"
      data-direct-breakpoint={breakpoint}
      data-direct-mode={mode}
      style={
        {
          "--direct-bg": document.theme.pageBackground,
          "--direct-surface": document.theme.surface,
          "--direct-text": document.theme.primaryText,
          "--direct-muted": document.theme.secondaryText,
          "--direct-accent": document.theme.accent,
          "--direct-border": document.theme.border,
          "--direct-radius": `${document.theme.radius}px`,
          "--direct-font": document.theme.fontFamily,
        } as CSSProperties
      }
      onClick={() => mode === "edit" && editing?.onSelectPage?.()}
    >
      <div className="direct-page-content">
        {visibleBlocks.map((block) => (
          <BlockFrame
            key={block.id}
            block={block}
            selected={editing?.selectedBlockId === block.id}
            onSelect={() => editing?.onSelectBlock?.(block.id)}
            mode={mode}
          >
            {renderBlock(block, context)}
          </BlockFrame>
        ))}
        {document.footer.visible ? (
          <footer className="direct-footer">
            {String(document.footer.content.branding ?? "")}
          </footer>
        ) : null}
      </div>
    </div>
  );
}
