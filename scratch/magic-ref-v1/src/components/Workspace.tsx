import React, { useEffect, useRef } from "react";
import { useEditor } from "../contexts/EditorContext";
import { useIsMobile } from "../hooks/useIsMobile";
import { TopBar } from "./TopBar";
import { ProductCard } from "./ProductCard";
import { AddProductTile } from "./AddProductTile";
import { DesktopToolbar } from "./toolbar/DesktopToolbar";
import { MobileSheet } from "./MobileSheet";
import { SideInspector } from "./SideInspector";
import { DetailModal } from "./DetailModal";
import { ChangeImageModal } from "./ChangeImageModal";
import { ConfirmDelete } from "./ConfirmDelete";
import { PublishWarningModal } from "./PublishWarningModal";
import { Toaster } from "./Toaster";

export type PrototypeState =
  | "default"
  | "card-selected"
  | "title-editing"
  | "image-selected"
  | "cta-selected"
  | "detail-modal"
  | "publish-warning";

interface WorkspaceProps {
  initialState: PrototypeState;
  showAdvancedPanel: boolean;
}

export function Workspace({ initialState, showAdvancedPanel }: WorkspaceProps) {
  const editor = useEditor();
  const isMobile = useIsMobile();
  const applied = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    if (showAdvancedPanel) editor.setInspectorOpen(true);
    const first = editor.products[0];
    if (!first) return;
    switch (initialState) {
      case "card-selected":
        editor.select(first.id, "card");
        break;
      case "title-editing":
        editor.select(first.id, "title");
        break;
      case "image-selected":
        editor.select(first.id, "image");
        break;
      case "cta-selected":
        editor.select(first.id, "cta");
        break;
      case "detail-modal":
        editor.openDetail(first.id);
        break;
      case "publish-warning":
        editor.setPublishWarning(true);
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the selected target visible when the contextual sheet appears on mobile.
  useEffect(() => {
    if (!isMobile || !editor.selection) return;
    const key = `${editor.selection.cardId}:${editor.selection.kind}`;
    const el = document.querySelector<HTMLElement>(`[data-anchor="${key}"]`);
    if (!el) return;
    const timer = window.setTimeout(() => {
      const rect = el.getBoundingClientRect();
      const limit = window.innerHeight - 240;
      if (rect.bottom > limit || rect.top < 80) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isMobile, editor.selection, editor.sheetSnap]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") editor.clearSelection();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-full w-full flex-col bg-canvas">
      <TopBar />

      <div className="flex min-h-0 flex-1">
        <div
          ref={scrollRef}
          onMouseDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("[data-anchor]") || target.closest('[data-chrome="true"]')) return;
            editor.clearSelection();
          }}
          className="min-w-0 flex-1 px-4 pb-24 pt-8 sm:px-6 lg:px-10 lg:pb-16"
          style={{ paddingBottom: isMobile && editor.selection ? 420 : undefined }}
        >
          <div className="mx-auto w-full max-w-[1240px]">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="font-display text-[30px] leading-[1.12] text-ink sm:text-[38px]">
                  Catálogo de producto
                </h1>
                <p className="mt-2 max-w-[52ch] text-[14px] leading-relaxed text-body">
                  Toca cualquier elemento de la tarjeta para editarlo en el sitio: imagen, título,
                  descripción, precio o botón.
                </p>
              </div>
              <p className="text-[12.5px] text-muted">
                {editor.products.length} productos · Vista escritorio 1440
              </p>
            </div>

            <div className="mt-9 grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
              {editor.products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
              <AddProductTile />
            </div>
          </div>
        </div>

        <SideInspector />
      </div>

      {!isMobile && <DesktopToolbar />}
      {isMobile && <MobileSheet />}

      <DetailModal />
      <ChangeImageModal />
      <ConfirmDelete />
      <PublishWarningModal />
      <Toaster />
    </div>
  );
}
